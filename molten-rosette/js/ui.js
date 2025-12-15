import { fetchLatestPrices, fetchMapping, fetchItemTimeseries } from './api.js';
import { calculateTax, getNetProfit, getROI, formatNumber, calculateOpportunityScores, isPump } from './analysis.js';
import { renderPriceChart } from './charts.js';
import { getRemainingLimit, trackPurchase } from './limitTracker.js';
import { isFavorite, toggleFavorite } from './favorites.js';

// State
let itemsMap = {}; // id -> { name, limit, icon, value }
let pricesMap = {}; // id -> { high, low, highTime, lowTime }
let tableData = []; // Array of merged objects for the table
let currentSort = { field: 'margin', direction: 'desc' };

// DOM Elements
const tableBody = document.getElementById('table-body');
const searchInput = document.getElementById('search-input');
const minMarginInput = document.getElementById('min-margin');
const minVolumeInput = document.getElementById('min-volume');
const presetSelect = document.getElementById('preset-select');
const statusSpan = document.getElementById('connection-status');
const lastUpdatedSpan = document.getElementById('last-updated');

// Modal Elements
const modal = document.getElementById('item-modal');
const closeModal = document.querySelector('.close-modal');
const modalItemName = document.getElementById('modal-item-name');
const chartCanvas = document.getElementById('price-chart');

// Icons base URL (OSRS Wiki)
const ICON_BASE = 'https://oldschool.runescape.wiki/images/'; 

async function init() {
    try {
        statusSpan.textContent = 'Loading Item Mapping...';
        const mapping = await fetchMapping();
        
        if (Array.isArray(mapping)) {
            mapping.forEach(item => {
                itemsMap[item.id] = item;
            });
        } else {
            itemsMap = mapping;
        }

        statusSpan.textContent = 'Fetching Prices...';
        await updatePrices();

        setupEventListeners();

        setInterval(updatePrices, 60000);
        
        statusSpan.textContent = 'Live';
        statusSpan.style.color = '#00e676';

    } catch (err) {
        console.error(err);
        statusSpan.textContent = 'Error';
        statusSpan.style.color = '#ff5252';
    }
}

async function updatePrices() {
    try {
        const prices = await fetchLatestPrices();
        pricesMap = prices.data || prices; 
        
        processData();
        renderTable();
        
        const now = new Date();
        lastUpdatedSpan.textContent = `Last Updated: ${now.toLocaleTimeString()}`;
    } catch (err) {
        console.error('Price update failed', err);
    }
}

function processData() {
    tableData = [];
    
    for (const [id, price] of Object.entries(pricesMap)) {
        const itemDef = itemsMap[id];
        if (!itemDef) continue;

        const effectiveBuy = price.low;
        const effectiveSell = price.high;
        
        if (!effectiveBuy || !effectiveSell) continue;

        const netProfit = getNetProfit(effectiveBuy, effectiveSell);
        const roi = getROI(netProfit, effectiveBuy);
        
        const volume = (price.highPriceVolume || 0) + (price.lowPriceVolume || 0);
        const volume1h = price.volume1h || 0;
        const pump = isPump(volume, volume1h);
        const fav = isFavorite(id);

        tableData.push({
            id: id,
            name: itemDef.name,
            icon: itemDef.icon,
            buyPrice: effectiveBuy,
            sellPrice: effectiveSell,
            margin: netProfit,
            roi: roi,
            volume: volume,
            volume1h: volume1h,
            pump: pump,
            fav: fav,
            limit: itemDef.limit,
            timestamp: Math.max(price.highTime, price.lowTime)
        });
    }

    calculateOpportunityScores(tableData);
}

function renderTable() {
    const query = searchInput.value.toLowerCase();
    const minMargin = parseFloat(minMarginInput.value) || 0;
    const minVol = parseFloat(minVolumeInput.value) || 0;

    let filtered = tableData.filter(item => {
        if (query && !item.name.toLowerCase().includes(query)) return false;
        if (item.margin < minMargin) return false;
        if (item.volume < minVol) return false;
        return true;
    });

    filtered.sort((a, b) => {
        // Favorites always on top
        if (a.fav && !b.fav) return -1;
        if (!a.fav && b.fav) return 1;

        const valA = a[currentSort.field];
        const valB = b[currentSort.field];
        
        if (currentSort.direction === 'asc') return valA - valB;
        return valB - valA;
    });

    const displaySet = filtered.slice(0, 100);

    tableBody.innerHTML = '';
    
    displaySet.forEach(item => {
        const tr = document.createElement('tr');
        if (item.fav) tr.classList.add('favorite-row');
        
        const remainingLimit = getRemainingLimit(item.id, item.limit);
        const marginClass = item.margin > 0 ? 'profit-positive' : 'profit-negative';
        
        const starClass = item.fav ? 'star-active fa-solid' : 'star-inactive fa-regular';
        const pumpBadge = item.pump ? '<span class="pump-badge" title="High Volume Spike"><i class="fa-solid fa-triangle-exclamation"></i></span>' : '';

        tr.innerHTML = `
            <td>
                <div style="display:flex; align-items:center;">
                    <i class="star-btn fa-star ${starClass}" data-id="${item.id}"></i>
                    <span>${item.name} ${pumpBadge}</span>
                </div>
            </td>
            <td>${formatNumber(item.buyPrice)}</td>
            <td>${formatNumber(item.sellPrice)}</td>
            <td class="${marginClass}">${formatNumber(item.margin)}</td>
            <td class="${marginClass}">${item.roi > 1000 ? formatNumber(item.roi) : item.roi.toFixed(2)}%</td>
            <td>${item.score ? item.score.toFixed(1) : '0.0'}</td>
            <td>${formatNumber(item.volume)}</td>
            <td>${item.limit ? `${formatNumber(remainingLimit)} / ${formatNumber(item.limit)}` : '-'}</td>
            <td>
                <button class="action-btn chart-btn" data-id="${item.id}" title="View Chart">
                    <i class="fa-solid fa-chart-line"></i>
                </button>
            </td>
        `;
        
        tableBody.appendChild(tr);
    });

    document.querySelectorAll('.chart-btn').forEach(btn => {
        btn.addEventListener('click', (e) => openModal(e.target.dataset.id));
    });

    document.querySelectorAll('.star-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            toggleFavorite(id);
            // Update local state without full re-render for speed
            const item = tableData.find(i => i.id == id);
            if (item) item.fav = !item.fav;
            renderTable(); // Re-render to sort
        });
    });
}

function setupEventListeners() {
    document.querySelectorAll('th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
            const field = th.dataset.sort;
            if (currentSort.field === field) {
                currentSort.direction = currentSort.direction === 'desc' ? 'asc' : 'desc';
            } else {
                currentSort.field = field;
                currentSort.direction = 'desc';
            }
            renderTable();
        });
    });

    searchInput.addEventListener('input', renderTable);
    minMarginInput.addEventListener('input', renderTable);
    minVolumeInput.addEventListener('input', renderTable);
    
    presetSelect.addEventListener('change', (e) => {
        if (e.target.value === 'sniper') {
            minMarginInput.value = 50000;
            minVolumeInput.value = 0;
            currentSort = { field: 'margin', direction: 'desc' };
        } else if (e.target.value === 'default') {
            minMarginInput.value = 10000;
            minVolumeInput.value = 10;
            currentSort = { field: 'roi', direction: 'desc' };
        }
        renderTable();
    });

    closeModal.addEventListener('click', () => modal.classList.add('hidden'));
    window.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.add('hidden');
    });
}

async function openModal(itemId) {
    const item = itemsMap[itemId];
    if (!item) return;

    modalItemName.textContent = item.name;
    modal.classList.remove('hidden');

    const timeseries = await fetchItemTimeseries(itemId);
    if (timeseries && timeseries.data) {
        const ctx = chartCanvas.getContext('2d');
        renderPriceChart(ctx, timeseries.data);
    }
}

init();
