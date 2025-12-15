import { fetchLatestPrices, fetchMapping, fetchItemTimeseries } from './api.js';
import { calculateTax, getNetProfit, getROI, formatNumber, calculateOpportunityScores, isPump, getAlchProfit, getPriceChange1h } from './analysis.js';
import { renderPriceChart } from './charts.js';
import { getRemainingLimit, trackPurchase } from './limitTracker.js';
import { isFavorite, toggleFavorite } from './favorites.js';
import { loadPortfolio, addFlip, completeFlip, deleteFlip, getFlips, getPortfolioSummary, updateFlip } from './portfolio.js';

// ========================================
// Error Handling & Toast Notifications
// ========================================

class AppError extends Error {
    constructor(message, type = 'error', retryAction = null) {
        super(message);
        this.type = type;
        this.retryAction = retryAction;
    }
}

// Toast Notification System
const Toast = {
    container: null,

    init() {
        this.container = document.getElementById('toast-container');
    },

    show(message, type = 'success', duration = 4000) {
        if (!this.container) this.init();

        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle'
        };

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="toast-icon fa-solid ${icons[type]}"></i>
            <span class="toast-message">${message}</span>
            <button class="toast-close"><i class="fa-solid fa-times"></i></button>
        `;

        this.container.appendChild(toast);

        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => this.dismiss(toast));

        if (duration > 0) {
            setTimeout(() => this.dismiss(toast), duration);
        }

        return toast;
    },

    dismiss(toast) {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    },

    success(message) { return this.show(message, 'success'); },
    error(message) { return this.show(message, 'error', 6000); },
    warning(message) { return this.show(message, 'warning'); }
};

// Loading State Management
const Loading = {
    states: {},

    show(targetId, message = 'Loading...') {
        const target = document.getElementById(targetId) || document.querySelector(targetId);
        if (!target) return;

        // Store original position style
        const computedStyle = window.getComputedStyle(target);
        if (computedStyle.position === 'static') {
            target.style.position = 'relative';
            this.states[targetId] = { hadStaticPosition: true };
        }

        // Create and add loading overlay
        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.id = `loading-${targetId}`;
        overlay.innerHTML = `
            <div class="loading-spinner"></div>
            <span class="loading-text">${message}</span>
        `;
        target.appendChild(overlay);
    },

    hide(targetId) {
        const overlay = document.getElementById(`loading-${targetId}`);
        if (overlay) overlay.remove();

        // Restore original position if we changed it
        if (this.states[targetId]?.hadStaticPosition) {
            const target = document.getElementById(targetId) || document.querySelector(targetId);
            if (target) target.style.position = '';
            delete this.states[targetId];
        }
    },

    // Render skeleton loading for tables
    skeleton(tbody, rows = 5, cols = 6) {
        if (!tbody) return;
        tbody.innerHTML = '';

        for (let i = 0; i < rows; i++) {
            const tr = document.createElement('tr');
            tr.innerHTML = Array(cols).fill(0).map((_, j) =>
                `<td><div class="skeleton skeleton-cell ${j === 0 ? 'large' : ''}"></div></td>`
            ).join('');
            tbody.appendChild(tr);
        }
    }
};

// Error UI Rendering
function renderError(container, error, retryFn = null) {
    const target = typeof container === 'string' ? document.getElementById(container) : container;
    if (!target) return;

    target.innerHTML = `
        <div class="error-container">
            <i class="error-icon fa-solid fa-triangle-exclamation"></i>
            <h3 class="error-title">Something went wrong</h3>
            <p class="error-message">${error.message || 'An unexpected error occurred. Please try again.'}</p>
            ${retryFn ? '<button class="retry-btn"><i class="fa-solid fa-rotate-right"></i> Try Again</button>' : ''}
        </div>
    `;

    if (retryFn) {
        target.querySelector('.retry-btn')?.addEventListener('click', retryFn);
    }
}

// Global Error Handler
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    Toast.error('An unexpected error occurred. Please refresh the page.');
});

// Utility: Debounce
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ========================================
// Mobile Menu Management  
// ========================================

const MobileMenu = {
    sidebar: null,
    overlay: null,
    toggle: null,

    init() {
        this.sidebar = document.querySelector('.sidebar');
        this.overlay = document.getElementById('sidebar-overlay');
        this.toggle = document.getElementById('mobile-menu-toggle');

        if (this.toggle) {
            this.toggle.addEventListener('click', () => this.open());
        }

        if (this.overlay) {
            this.overlay.addEventListener('click', () => this.close());
        }

        // Close menu when clicking a nav link on mobile
        document.querySelectorAll('.nav-links li').forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    this.close();
                }
            });
        });
    },

    open() {
        this.sidebar?.classList.add('open');
        this.overlay?.classList.add('active');
        if (this.toggle) {
            this.toggle.innerHTML = '<i class="fa-solid fa-times"></i>';
        }
    },

    close() {
        this.sidebar?.classList.remove('open');
        this.overlay?.classList.remove('active');
        if (this.toggle) {
            this.toggle.innerHTML = '<i class="fa-solid fa-bars"></i>';
        }
    }
};

// State
let itemsMap = {};
let pricesMap = {};
let tableData = [];
let currentSort = { field: 'margin', direction: 'desc' };
let natureRunePrice = 200;
let currentDetailItemId = null;

// DOM Elements
const tableBody = document.getElementById('table-body');
const searchInput = document.getElementById('search-input');
const minMarginInput = document.getElementById('min-margin');
const minVolumeInput = document.getElementById('min-volume');
const presetSelect = document.getElementById('preset-select');
const statusSpan = document.getElementById('connection-status');
const lastUpdatedSpan = document.getElementById('last-updated');

// View Switching
const navLinks = document.querySelectorAll('.nav-links li');
const views = {
    dashboard: document.getElementById('view-dashboard'),
    screener: document.getElementById('view-screener'),
    highlights: document.getElementById('view-highlights'),
    portfolio: document.getElementById('view-portfolio'),
    itemDetail: document.getElementById('view-item-detail')
};
let lastViewId = 'dashboard';

const highlightsTable = document.getElementById('highlights-table');
const highlightsTitle = document.getElementById('highlights-title');
const highlightTabs = document.querySelectorAll('.tab-btn');
let currentHighlightTab = 'high-volume';

// Portfolio Modal Elements
const addFlipModal = document.getElementById('add-flip-modal');
const closeFlipModal = document.getElementById('close-flip-modal');
const addFlipBtn = document.getElementById('add-flip-btn');
const addFlipForm = document.getElementById('add-flip-form');
const flipItemNameInput = document.getElementById('flip-item-name');
const flipItemResults = document.getElementById('flip-item-results');
let selectedFlipItemId = null;

// Icons base URL (OSRS Wiki)
const ICON_BASE = 'https://oldschool.runescape.wiki/images/';

// Error boundary state
let errorTimeout = null;

// Create loading overlay element
function createLoadingOverlay() {
    const existing = document.getElementById('loading-overlay');
    if (existing) return existing;

    const overlay = document.createElement('div');
    overlay.id = 'loading-overlay';
    overlay.className = 'loading-overlay hidden';
    overlay.innerHTML = `
        <div class="loading-spinner"></div>
        <div class="loading-text">Loading data...</div>
    `;
    document.body.appendChild(overlay);
    return overlay;
}

// Create error banner element
function createErrorBanner() {
    const existing = document.getElementById('error-banner');
    if (existing) return existing;

    const banner = document.createElement('div');
    banner.id = 'error-banner';
    banner.className = 'error-banner hidden';
    banner.innerHTML = `
        <i class="fa-solid fa-circle-exclamation"></i>
        <div class="error-content">
            <div class="error-title">Error</div>
            <div class="error-message"></div>
        </div>
        <button class="error-dismiss" aria-label="Dismiss">
            <i class="fa-solid fa-times"></i>
        </button>
    `;
    document.body.appendChild(banner);

    banner.querySelector('.error-dismiss').addEventListener('click', () => hideError());
    return banner;
}

// Show error to user
function showError(title, message, autoDismiss = 5000) {
    const banner = createErrorBanner();
    banner.querySelector('.error-title').textContent = title;
    banner.querySelector('.error-message').textContent = message;
    banner.classList.remove('hidden');

    if (errorTimeout) clearTimeout(errorTimeout);
    if (autoDismiss) {
        errorTimeout = setTimeout(() => hideError(), autoDismiss);
    }
}

// Hide error
function hideError() {
    const banner = document.getElementById('error-banner');
    if (banner) banner.classList.add('hidden');
    if (errorTimeout) {
        clearTimeout(errorTimeout);
        errorTimeout = null;
    }
}

// Show loading overlay
function showLoading(message = 'Loading data...') {
    const overlay = createLoadingOverlay();
    overlay.querySelector('.loading-text').textContent = message;
    overlay.classList.remove('hidden');
}

// Hide loading overlay
function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.classList.add('hidden');
}

// Setup mobile menu toggle
// Setup mobile menu toggle - Removed duplicate function


async function init() {
    try {
        createLoadingOverlay();
        createErrorBanner();
        showLoading('Initializing...');

        loadPortfolio();

        statusSpan.textContent = 'Loading Item Mapping...';
        showLoading('Loading item database...');

        const mapping = await fetchMapping();

        if (!mapping || (Array.isArray(mapping) && mapping.length === 0)) {
            throw new Error('Failed to load item mapping. Please check your connection.');
        }

        if (Array.isArray(mapping)) {
            mapping.forEach(item => {
                itemsMap[item.id] = item;
            });
        } else {
            itemsMap = mapping;
        }

        statusSpan.textContent = 'Fetching Prices...';
        showLoading('Fetching live prices...');
        await updatePrices();

        setupEventListeners();
        setupPortfolioListeners();
        setupTableDelegation();
        setupEventListeners();
        setupPortfolioListeners();
        setupTableDelegation();
        MobileMenu.init();

        setInterval(updatePrices, 60000);

        statusSpan.textContent = 'Live';
        statusSpan.style.color = '#00e676';
        hideLoading();

    } catch (err) {
        console.error('Initialization error:', err);
        statusSpan.textContent = 'Error';
        statusSpan.style.color = '#ff5252';
        hideLoading();
        showError('Initialization Failed', err.message || 'Failed to load data. Please refresh the page.', 0);
    }
}

async function updatePrices() {
    try {
        const prices = await fetchLatestPrices();

        if (!prices || Object.keys(prices).length === 0) {
            throw new Error('Empty price data received');
        }

        pricesMap = prices.data || prices;

        if (pricesMap['561']) {
            natureRunePrice = pricesMap['561'].high;
        }

        processData();
        renderTable();
        renderDashboard();
        if (!views.highlights.classList.contains('hidden')) renderHighlights();
        if (!views.portfolio.classList.contains('hidden')) renderPortfolio();

        // If viewing an item, update its details in real-time
        if (!views.itemDetail.classList.contains('hidden') && currentDetailItemId) {
            renderItemDetail(currentDetailItemId, false); // false = don't refetch chart every tick
        }

        const now = new Date();
        lastUpdatedSpan.textContent = `Last Updated: ${now.toLocaleTimeString()}`;

        // Clear any previous errors on successful update
        hideError();

    } catch (err) {
        console.error('Price update failed:', err);
        showError('Price Update Failed', 'Unable to fetch latest prices. Will retry automatically.', 8000);
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
        const alchProfit = getAlchProfit(itemDef, effectiveBuy, natureRunePrice);
        const change1h = getPriceChange1h(effectiveSell, price.price1h);

        const volume24h = price.volume24h || 0;
        const price24h = price.price24h || 0;
        const dayChange = effectiveSell - price24h;
        const dayChangePercent = price24h ? ((dayChange / price24h) * 100) : 0;
        const potentialProfit = netProfit * (itemDef.limit || 0);

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
            volume24h: volume24h,
            dayChange: dayChange,
            dayChangePercent: dayChangePercent,
            potentialProfit: potentialProfit,
            pump: pump,
            fav: fav,
            limit: itemDef.limit,
            alchProfit: alchProfit,
            change1h: change1h,
            timestamp: Math.max(price.highTime, price.lowTime)
        });
    }

    calculateOpportunityScores(tableData);
}

function renderHighlights() {
    let data = [];
    let headers = '';
    let rowRenderer = null;
    const now = Date.now() / 1000;

    if (currentHighlightTab === 'high-volume') {
        highlightsTitle.textContent = 'Top 100 Profitable High Volume Items';
        data = tableData
            .filter(i => i.volume24h > 100000 && i.margin > 0)
            .sort((a, b) => b.potentialProfit - a.potentialProfit)
            .slice(0, 100);

        headers = `<tr>
            <th>Item</th>
            <th>Price</th>
            <th>Day Change</th>
            <th>Day Change %</th>
            <th>Potential Profit</th>
        </tr>`;

        rowRenderer = (item) => `
            <td>${formatNumber(item.sellPrice)}</td>
            <td class="${item.dayChange >= 0 ? 'text-green' : 'text-red'}">
                ${item.dayChange > 0 ? '+' : ''}${formatNumber(item.dayChange)}
            </td>
            <td class="${item.dayChangePercent >= 0 ? 'text-green' : 'text-red'}">
                ${item.dayChangePercent.toFixed(2)}%
            </td>
            <td class="text-green">${formatNumber(item.potentialProfit)}</td>
        `;
    }
    else if (currentHighlightTab === 'gainers') {
        highlightsTitle.textContent = 'Top 100 Gainers (Last 10m)';
        data = tableData
            .filter(i => (now - i.timestamp) < 600 && i.change1h > 0)
            .sort((a, b) => b.change1h - a.change1h)
            .slice(0, 100);

        headers = `<tr>
            <th>Item</th>
            <th>Price</th>
            <th>Change (1h)</th>
            <th>ROI %</th>
        </tr>`;

        rowRenderer = (item) => `
            <td>${formatNumber(item.sellPrice)}</td>
            <td class="text-green">+${formatNumber(item.change1h)}</td>
            <td class="text-green">${item.roi.toFixed(2)}%</td>
        `;
    }
    else if (currentHighlightTab === 'losers') {
        highlightsTitle.textContent = 'Top 100 Losers (Last 10m)';
        data = tableData
            .filter(i => (now - i.timestamp) < 600 && i.change1h < 0)
            .sort((a, b) => a.change1h - b.change1h)
            .slice(0, 100);

        headers = `<tr>
            <th>Item</th>
            <th>Price</th>
            <th>Change (1h)</th>
            <th>ROI %</th>
        </tr>`;

        rowRenderer = (item) => `
            <td>${formatNumber(item.sellPrice)}</td>
            <td class="text-red">${formatNumber(item.change1h)}</td>
            <td class="text-red">${item.roi.toFixed(2)}%</td>
        `;
    }

    const thead = highlightsTable.querySelector('thead');
    const tbody = highlightsTable.querySelector('tbody');

    thead.innerHTML = headers;
    tbody.innerHTML = '';

    data.forEach(item => {
        const tr = document.createElement('tr');
        const iconUrl = item.icon ? `${ICON_BASE}${item.icon.replace(/ /g, '_')}` : '';
        const starClass = item.fav ? 'star-active fa-solid' : 'star-inactive fa-regular';

        tr.innerHTML = `
            <td>
                <div style="display:flex; align-items:center; cursor:pointer;" class="clickable-item" data-id="${item.id}">
                    <i class="star-btn fa-star ${starClass}" data-id="${item.id}" style="margin-right:8px;"></i>
                    ${iconUrl ? `<img src="${iconUrl}" class="item-icon" style="margin-right:8px;" loading="lazy">` : ''}
                    <span class="hover-underline">${item.name}</span>
                </div>
            </td>
            ${rowRenderer(item)}
        `;
        tbody.appendChild(tr);
    });
}

function renderDashboard() {
    const topMargins = [...tableData].sort((a, b) => b.margin - a.margin).slice(0, 8);
    renderMiniTable('table-margins', topMargins, (item) => `<td class="text-green">+${formatNumber(item.margin)}</td>`);

    const highVol = tableData.filter(i => i.volume > 100).sort((a, b) => b.score - a.score).slice(0, 8);
    renderMiniTable('table-volume', highVol, (item) => `<td class="text-green">+${formatNumber(item.margin)}</td>`);

    const topAlchs = tableData.filter(i => i.alchProfit > 0).sort((a, b) => b.alchProfit - a.alchProfit).slice(0, 8);
    renderMiniTable('table-alchs', topAlchs, (item) => `<td class="text-green">+${formatNumber(item.alchProfit)}</td>`);

    const gainers = tableData.filter(i => i.change1h > 0).sort((a, b) => b.change1h - a.change1h).slice(0, 8);
    renderMiniTable('table-gainers', gainers, (item) => `<td class="text-green">+${formatNumber(item.change1h)}</td>`);
}

function renderMiniTable(tableId, data, extraCellRenderer) {
    const tbody = document.querySelector(`#${tableId} tbody`);
    tbody.innerHTML = '';

    data.forEach(item => {
        const tr = document.createElement('tr');
        const iconUrl = item.icon ? `${ICON_BASE}${item.icon.replace(/ /g, '_')}` : '';

        tr.innerHTML = `
            <td>
                <div style="display:flex; align-items:center; cursor:pointer;" class="clickable-item" data-id="${item.id}">
                    ${iconUrl ? `<img src="${iconUrl}" class="item-icon" loading="lazy">` : ''}
                    <span class="hover-underline" style="margin-left:5px;">${item.name}</span>
                </div>
            </td>
            <td>${formatNumber(item.sellPrice)}</td>
            ${extraCellRenderer(item)}
        `;
        tbody.appendChild(tr);
    });
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
        const iconUrl = item.icon ? `${ICON_BASE}${item.icon.replace(/ /g, '_')}` : '';

        tr.innerHTML = `
            <td>
                <div style="display:flex; align-items:center; cursor:pointer;" class="clickable-item" data-id="${item.id}">
                    <i class="star-btn fa-star ${starClass}" data-id="${item.id}" style="margin-right:8px;"></i>
                    ${iconUrl ? `<img src="${iconUrl}" class="item-icon" style="margin-right:8px;" loading="lazy">` : ''}
                    <span class="hover-underline">${item.name} ${pumpBadge}</span>
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
                <!-- Actions removed from here, click row/name instead -->
            </td>
        `;
        tableBody.appendChild(tr);
    });
}

// Replaces attachCommonListeners with event delegation
function setupTableDelegation() {
    const handleTableClick = (e) => {
        const clickableItem = e.target.closest('.clickable-item');
        if (clickableItem) {
            // If clicking star inside clickable-item
            if (e.target.classList.contains('star-btn')) {
                e.stopPropagation();
                const id = e.target.dataset.id;
                toggleFavorite(id);
                const item = tableData.find(i => i.id == id);
                if (item) item.fav = !item.fav;
                if (!views.screener.classList.contains('hidden')) renderTable();
                if (!views.highlights.classList.contains('hidden')) renderHighlights();
                return;
            }
            const id = clickableItem.dataset.id;
            navigateToItem(id);
            return;
        }

        // Just star button outside clickable item (if any)
        if (e.target.classList.contains('star-btn')) {
            const id = e.target.dataset.id;
            toggleFavorite(id);
            const item = tableData.find(i => i.id == id);
            if (item) item.fav = !item.fav;
            if (!views.screener.classList.contains('hidden')) renderTable();
            if (!views.highlights.classList.contains('hidden')) renderHighlights();
            return;
        }

        // Portfolio Actions
        const completeBtn = e.target.closest('.complete-flip-btn');
        if (completeBtn) {
            const id = completeBtn.dataset.id;
            const flips = getFlips();
            const flip = flips.find(f => f.id === id);
            if (flip) {
                const currentSell = pricesMap[flip.itemId]?.high || flip.targetSellPrice;
                const priceStr = prompt(`Enter sell price for ${flip.name}:`, currentSell);
                if (priceStr) {
                    const price = parseInt(priceStr);
                    completeFlip(id, price, flip.qty);
                    renderPortfolio();
                }
            }
            return;
        }

        const deleteBtn = e.target.closest('.delete-flip-btn');
        if (deleteBtn) {
            const id = deleteBtn.dataset.id;
            if (confirm('Are you sure you want to delete this flip?')) {
                deleteFlip(id);
                renderPortfolio();
            }
            return;
        }
    };

    // Attach to all main table containers
    const containers = [
        document.getElementById('table-body'), // Screener
        document.getElementById('highlights-table'), // Highlights
        document.querySelector('#portfolio-active-table tbody'), // Portfolio Active
        document.querySelector('#portfolio-history-table tbody'), // Portfolio History
        document.querySelector('#table-margins tbody'), // Dashboard tables...
        document.querySelector('#table-volume tbody'),
        document.querySelector('#table-alchs tbody'),
        document.querySelector('#table-gainers tbody')
    ];

    containers.forEach(container => {
        if (container) container.addEventListener('click', handleTableClick);
    });
}

// --- ITEM DETAIL VIEW ---

async function navigateToItem(itemId) {
    try {
        // Save current view to go back to
        const currentActive = document.querySelector('.nav-links li.active');
        if (currentActive) {
            lastViewId = currentActive.dataset.view;
        }

        // Hide all views
        Object.values(views).forEach(v => v.classList.add('hidden'));

        // Show Detail View
        views.itemDetail.classList.remove('hidden');

        // Deactivate nav links
        navLinks.forEach(l => l.classList.remove('active'));

        currentDetailItemId = itemId;
        await renderItemDetail(itemId, true);
    } catch (err) {
        console.error('Navigation error:', err);
        showError('Navigation Error', 'Failed to load item details. Please try again.');
    }
}

async function renderItemDetail(itemId, updateChart = true) {
    const item = itemsMap[itemId];
    const prices = pricesMap[itemId] || {};

    if (!item) return;

    // Header
    document.getElementById('detail-name').textContent = item.name;
    const iconUrl = item.icon ? `${ICON_BASE}${item.icon.replace(/ /g, '_')}` : '';
    document.getElementById('detail-icon').src = iconUrl;

    const favBtn = document.getElementById('detail-fav-btn');
    const isFav = isFavorite(itemId);
    favBtn.className = isFav ? 'fa-solid fa-star star-btn action-icon star-active' : 'fa-regular fa-star star-btn action-icon';
    // Remove old listeners using clone replacement
    const newFavBtn = favBtn.cloneNode(true);
    favBtn.parentNode.replaceChild(newFavBtn, favBtn);
    newFavBtn.addEventListener('click', () => {
        toggleFavorite(itemId);
        renderItemDetail(itemId, false);
    });

    // Prices
    const sellPrice = prices.high || 0;
    const buyPrice = prices.low || 0;
    document.getElementById('detail-current-price').textContent = formatNumber(sellPrice);

    // Price Change
    const price24h = prices.price24h || sellPrice;
    const change = sellPrice - price24h;
    const changePct = price24h ? ((change / price24h) * 100) : 0;
    const changeSpan = document.getElementById('detail-price-change');
    changeSpan.textContent = `${change > 0 ? '+' : ''}${changePct.toFixed(2)}% (24h)`;
    changeSpan.classList.remove('text-green', 'text-red');
    changeSpan.classList.add(change >= 0 ? 'text-green' : 'text-red');

    const lastTime = Math.max(prices.highTime || 0, prices.lowTime || 0);
    const timeAgo = lastTime ? formatDuration(Date.now() - (lastTime * 1000)) : 'Unknown';
    document.getElementById('detail-last-updated').textContent = `Last traded ${timeAgo} ago`;

    // Key Info
    const margin = getNetProfit(buyPrice, sellPrice);
    const tax = calculateTax(sellPrice);
    const roi = getROI(margin, buyPrice);
    const limit = item.limit || 0;
    const potential = margin * limit;
    const volume = (prices.highPriceVolume || 0) + (prices.lowPriceVolume || 0);
    const vol24 = prices.volume24h || 0;

    document.getElementById('detail-buy').textContent = formatNumber(buyPrice);
    document.getElementById('detail-sell').textContent = formatNumber(sellPrice);

    const marginEl = document.getElementById('detail-margin');
    marginEl.textContent = formatNumber(margin);
    marginEl.classList.remove('text-green', 'text-red');
    marginEl.classList.add(margin > 0 ? 'text-green' : 'text-red');

    document.getElementById('detail-tax').textContent = formatNumber(tax);
    document.getElementById('detail-roi').textContent = `${roi.toFixed(2)}%`;
    document.getElementById('detail-potential').textContent = formatNumber(potential);
    document.getElementById('detail-limit').textContent = formatNumber(limit);
    document.getElementById('detail-volume').textContent = formatNumber(vol24);

    // High Alch
    const alchVal = item.highalch || 0;
    const alchProfit = getAlchProfit(item, buyPrice, natureRunePrice);
    const alchCost = buyPrice + natureRunePrice;
    const alchRoi = getROI(alchProfit, alchCost);
    const alchPotential = alchProfit * limit;

    document.getElementById('detail-alch-value').textContent = formatNumber(alchVal);
    document.getElementById('detail-nature-cost').textContent = formatNumber(natureRunePrice); // Added formatNumber

    const alchProfitEl = document.getElementById('detail-alch-profit');
    alchProfitEl.textContent = formatNumber(alchProfit);
    alchProfitEl.classList.remove('text-green', 'text-red');
    alchProfitEl.classList.add(alchProfit > 0 ? 'text-green' : 'text-red');

    document.getElementById('detail-alch-roi').textContent = `${alchRoi.toFixed(2)}%`;

    const alchPotEl = document.getElementById('detail-alch-potential');
    alchPotEl.textContent = formatNumber(alchPotential);
    alchPotEl.classList.remove('text-green', 'text-red');
    alchPotEl.classList.add(alchPotential > 0 ? 'text-green' : 'text-red');

    // Links
    const wikiName = item.name.replace(/ /g, '_');
    document.getElementById('link-wiki').href = `https://oldschool.runescape.wiki/w/${wikiName}`;
    document.getElementById('link-ge').href = `https://secure.runescape.com/m=itemdb_oldschool/viewitem?obj=${itemId}`;

    // Add to Portfolio
    const addBtn = document.getElementById('detail-add-portfolio');
    const newAddBtn = addBtn.cloneNode(true);
    addBtn.parentNode.replaceChild(newAddBtn, addBtn);
    newAddBtn.addEventListener('click', () => {
        addFlipForm.reset();
        addFlipModal.classList.remove('hidden');

        flipItemNameInput.value = item.name;
        selectedFlipItemId = itemId;
        flipItemResults.classList.add('hidden');

        document.getElementById('flip-buy-price').value = buyPrice;
        document.getElementById('flip-sell-target').value = sellPrice;
        document.getElementById('flip-qty').focus();
    });

    // Chart
    if (updateChart) {
        const loader = document.getElementById('chart-loading');
        const chartContainer = document.getElementById('detail-chart')?.parentElement;

        if (loader) loader.classList.remove('hidden');

        try {
            const timeseries = await fetchItemTimeseries(itemId);
            if (timeseries && timeseries.data) {
                const ctx = document.getElementById('detail-chart').getContext('2d');
                renderPriceChart(ctx, timeseries.data);
            } else {
                throw new Error('No chart data available');
            }
        } catch (chartErr) {
            console.error('Chart loading error:', chartErr);
            // Show inline error in chart area instead of global error
            if (chartContainer) {
                const existingErr = chartContainer.querySelector('.chart-error');
                if (!existingErr) {
                    const errDiv = document.createElement('div');
                    errDiv.className = 'chart-error';
                    errDiv.style.cssText = 'color: var(--text-muted); text-align: center; padding: 20px;';
                    errDiv.innerHTML = '<i class="fa-solid fa-chart-line"></i> Unable to load chart data';
                    chartContainer.appendChild(errDiv);
                }
            }
        } finally {
            if (loader) loader.classList.add('hidden');
        }
    }
}

function setupEventListeners() {
    // Navigation Switching
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            Object.values(views).forEach(v => v.classList.add('hidden'));

            const viewId = link.dataset.view;
            if (views[viewId]) {
                views[viewId].classList.remove('hidden');

                if (viewId === 'highlights') renderHighlights();
                if (viewId === 'portfolio') renderPortfolio();
            }
        });
    });

    // Back Button
    document.getElementById('back-btn').addEventListener('click', () => {
        // Hide detail
        views.itemDetail.classList.add('hidden');

        // Show last view
        if (views[lastViewId]) {
            views[lastViewId].classList.remove('hidden');

            // Restore active nav
            const nav = document.querySelector(`.nav-links li[data-view="${lastViewId}"]`);
            if (nav) nav.classList.add('active');
        } else {
            // Default to dashboard
            views.dashboard.classList.remove('hidden');
            navLinks[0].classList.add('active');
        }
    });

    // Highlights Tab Switching
    highlightTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            highlightTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentHighlightTab = tab.dataset.tab;
            renderHighlights();
        });
    });

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



    searchInput.addEventListener('input', debounce(renderTable, 300));
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
        } else if (e.target.value === 'alch') {
            currentSort = { field: 'alchProfit', direction: 'desc' };
        }
        renderTable();
    });

    window.addEventListener('click', (e) => {
        if (e.target === addFlipModal) addFlipModal.classList.add('hidden');
    });
}

function setupPortfolioListeners() {
    addFlipBtn.addEventListener('click', () => {
        addFlipForm.reset();
        selectedFlipItemId = null;
        flipItemResults.classList.add('hidden');
        addFlipModal.classList.remove('hidden');
        flipItemNameInput.focus();
    });

    closeFlipModal.addEventListener('click', () => addFlipModal.classList.add('hidden'));

    flipItemNameInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        if (query.length < 2) {
            flipItemResults.classList.add('hidden');
            return;
        }

        const matches = Object.values(itemsMap)
            .filter(item => item.name.toLowerCase().includes(query))
            .slice(0, 8);

        if (matches.length > 0) {
            flipItemResults.innerHTML = '';
            matches.forEach(item => {
                const div = document.createElement('div');
                div.className = 'autocomplete-item';
                div.textContent = item.name;
                div.addEventListener('click', () => {
                    flipItemNameInput.value = item.name;
                    selectedFlipItemId = item.id;
                    flipItemResults.classList.add('hidden');

                    if (pricesMap[item.id]) {
                        document.getElementById('flip-buy-price').value = pricesMap[item.id].low || '';
                        document.getElementById('flip-sell-target').value = pricesMap[item.id].high || '';
                    }
                });
                flipItemResults.appendChild(div);
            });
            flipItemResults.classList.remove('hidden');
        } else {
            flipItemResults.classList.add('hidden');
        }
    });

    addFlipForm.addEventListener('submit', (e) => {
        e.preventDefault();

        if (!selectedFlipItemId) {
            const name = flipItemNameInput.value.toLowerCase();
            const found = Object.values(itemsMap).find(i => i.name.toLowerCase() === name);
            if (found) {
                selectedFlipItemId = found.id;
            } else {
                alert('Please select a valid item from the list.');
                return;
            }
        }

        const qty = parseInt(document.getElementById('flip-qty').value);
        const buyPrice = parseInt(document.getElementById('flip-buy-price').value);
        const targetSell = document.getElementById('flip-sell-target').value;
        const targetSellPrice = targetSell ? parseInt(targetSell) : (pricesMap[selectedFlipItemId]?.high || 0);

        const newFlip = {
            itemId: selectedFlipItemId,
            name: itemsMap[selectedFlipItemId].name,
            qty: qty,
            buyPrice: buyPrice,
            targetSellPrice: targetSellPrice
        };

        addFlip(newFlip);
        trackPurchase(selectedFlipItemId, qty);

        addFlipModal.classList.add('hidden');
        renderPortfolio();
        renderTable();
    });

    document.getElementById('clear-history-btn').addEventListener('click', () => {
        if (confirm('Clear all completed flips history?')) {
            const flips = getFlips();
            flips.filter(f => f.status === 'completed').forEach(f => deleteFlip(f.id));
            renderPortfolio();
        }
    });
}

function renderPortfolio() {
    const flips = getFlips();
    const activeTableBody = document.querySelector('#portfolio-active-table tbody');
    const historyTableBody = document.querySelector('#portfolio-history-table tbody');

    activeTableBody.innerHTML = '';
    historyTableBody.innerHTML = '';

    const summary = getPortfolioSummary(pricesMap, calculateTax);

    document.getElementById('stat-invested').textContent = formatNumber(summary.invested);
    document.getElementById('stat-day-pnl').textContent = formatNumber(summary.dayProfit);
    document.getElementById('stat-day-pnl').className = `stat-value ${summary.dayProfit >= 0 ? 'text-green' : 'text-red'}`;

    document.getElementById('stat-total-pnl').textContent = formatNumber(summary.totalProfit);
    document.getElementById('stat-total-pnl').className = `stat-value ${summary.totalProfit >= 0 ? 'text-green' : 'text-red'}`;

    document.getElementById('stat-unrealized-pnl').textContent = formatNumber(summary.unrealizedProfit);
    document.getElementById('stat-unrealized-pnl').className = `stat-value ${summary.unrealizedProfit >= 0 ? 'text-green' : 'text-red'}`;

    flips.slice().reverse().forEach(flip => {
        if (flip.status === 'active') {
            const currentPrice = pricesMap[flip.itemId] ? pricesMap[flip.itemId].high : flip.buyPrice;
            const revenue = flip.qty * currentPrice;
            const tax = calculateTax(currentPrice) * flip.qty;
            const unrealizedPnl = revenue - (flip.qty * flip.buyPrice) - tax;
            const timeHeld = formatDuration(Date.now() - flip.buyTime);

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div style="display:flex; align-items:center; cursor:pointer;" class="clickable-item" data-id="${flip.itemId}">
                         ${getIconHtml(flip.itemId)}
                         <span class="hover-underline">${flip.name}</span>
                    </div>
                </td>
                <td>${formatNumber(flip.qty)}</td>
                <td>${formatNumber(flip.buyPrice)}</td>
                <td>${formatNumber(currentPrice)}</td>
                <td>${formatNumber(flip.targetSellPrice)}</td>
                <td class="${unrealizedPnl >= 0 ? 'text-green' : 'text-red'}">${unrealizedPnl > 0 ? '+' : ''}${formatNumber(unrealizedPnl)}</td>
                <td>${timeHeld}</td>
                <td>
                    <button class="action-btn btn-success complete-flip-btn" data-id="${flip.id}" title="Sold">
                        <i class="fa-solid fa-check"></i>
                    </button>
                    <button class="action-btn btn-danger delete-flip-btn" data-id="${flip.id}" title="Delete">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            `;
            activeTableBody.appendChild(tr);

        } else if (flip.status === 'completed') {
            const revenue = flip.qty * flip.sellPrice;
            const cost = flip.qty * flip.buyPrice;
            const tax = calculateTax(flip.sellPrice) * flip.qty;
            const profit = revenue - cost - tax;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                 <td>
                    <div style="display:flex; align-items:center; cursor:pointer;" class="clickable-item" data-id="${flip.itemId}">
                         ${getIconHtml(flip.itemId)}
                         <span class="hover-underline">${flip.name}</span>
                    </div>
                </td>
                <td>${formatNumber(flip.qty)}</td>
                <td>${formatNumber(flip.buyPrice)}</td>
                <td>${formatNumber(flip.sellPrice)}</td>
                <td class="${profit >= 0 ? 'text-green' : 'text-red'}">${profit > 0 ? '+' : ''}${formatNumber(profit)}</td>
                <td>${new Date(flip.sellTime).toLocaleDateString()}</td>
            `;
            historyTableBody.appendChild(tr);
        }
    });



});
}

function getIconHtml(itemId) {
    const item = itemsMap[itemId];
    if (!item || !item.icon) return '';
    const iconUrl = `${ICON_BASE}${item.icon.replace(/ /g, '_')}`;
    return `<img src="${iconUrl}" class="item-icon" style="margin-right:8px;" loading="lazy">`;
}

function formatDuration(ms) {
    const min = Math.floor(ms / 60000);
    const h = Math.floor(min / 60);
    if (h > 0) return `${h}h ${min % 60}m`;
    return `${min}m`;
}

init();