import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { usePreferencesStore } from '../stores/preferences';
import type { MarketItem, PriceData } from '../types';
import {
    getNetProfit,
    getROI,
    calculateOpportunityScores,
    calculateTax,
    getTrendSignal,
    calculateVolatility,
    getRiskLevel,
    calculatePriceStability,
    calculateFlipperScore
} from '../utils/analysis';
import type { TrendSignal } from '../utils/analysis';

// Define the interface locally as it extends the base MarketItem
export interface EnhancedMarketItem extends MarketItem {
    vol5m: number;
    vol1h: number;
    price5mAvg: number;
    price1hAvg: number;
    priceChange: number;
    trendSignal: TrendSignal;
    // New fields for advanced filtering
    lastBuyTime: number;      // Unix timestamp of last buy
    lastSellTime: number;     // Unix timestamp of last sell
    lastBuyAgo: number;       // Seconds since last buy
    lastSellAgo: number;      // Seconds since last sell
    priceVolume24h: number;   // Price x Volume estimate (24h)
    limitProfit: number;      // Profit from buying full limit
}

// API Helper Functions (Moved from services/api.ts for self-containment in migration)
const HEADERS = {
    'User-Agent': 'FlipTo5B-Client/1.0'
};

interface VolumeDataPoint {
    avgHighPrice: number | null;
    avgLowPrice: number | null;
    highPriceVolume: number;
    lowPriceVolume: number;
}

interface VolumeResponse {
    timestamp: number;
    data: Record<string, VolumeDataPoint>;
}

async function fetchMapping(): Promise<any[]> {
    const response = await $fetch<any[]>('https://prices.runescape.wiki/api/v1/osrs/mapping', { headers: HEADERS });
    return response;
}

async function fetchLatestPrices(): Promise<{ data: Record<string, PriceData> }> {
    const response = await $fetch<{ data: Record<string, PriceData> }>('https://prices.runescape.wiki/api/v1/osrs/latest', { headers: HEADERS });
    return response;
}

async function fetch5mVolume(): Promise<VolumeResponse> {
    const response = await $fetch<VolumeResponse>('https://prices.runescape.wiki/api/v1/osrs/5m', { headers: HEADERS });
    return response;
}

async function fetch1hVolume(): Promise<VolumeResponse> {
    const response = await $fetch<VolumeResponse>('https://prices.runescape.wiki/api/v1/osrs/1h', { headers: HEADERS });
    return response;
}

export const useMarketData = () => {
    const preferencesStore = usePreferencesStore();
    const { favorites } = storeToRefs(preferencesStore);
    
    // State
    const mapping = ref<any[] | null>(null);
    const pricesData = ref<{ data: Record<string, PriceData> } | null>(null);
    const vol5mData = ref<VolumeResponse | null>(null);
    const vol1hData = ref<VolumeResponse | null>(null);
    
    const loadingMapping = ref(false);
    const loadingPrices = ref(false);
    const loading5m = ref(false);
    const loading1h = ref(false);
    
    const mappingError = ref<any>(null);
    const pricesError = ref<any>(null);
    const error5m = ref<any>(null);
    const error1h = ref<any>(null);

    // Timers
    let pricesTimer: NodeJS.Timeout | null = null;
    let vol5mTimer: NodeJS.Timeout | null = null;
    let vol1hTimer: NodeJS.Timeout | null = null;

    // Fetch functions
    const loadMapping = async () => {
        if (mapping.value) return; // Simple cache check
        loadingMapping.value = true;
        try {
            mapping.value = await fetchMapping();
        } catch (e) {
            mappingError.value = e;
        } finally {
            loadingMapping.value = false;
        }
    };

    const loadPrices = async () => {
        loadingPrices.value = true;
        try {
            pricesData.value = await fetchLatestPrices();
        } catch (e) {
            pricesError.value = e;
        } finally {
            loadingPrices.value = false;
        }
    };

    const load5mVolume = async () => {
        loading5m.value = true;
        try {
            vol5mData.value = await fetch5mVolume();
        } catch (e) {
            error5m.value = e;
        } finally {
            loading5m.value = false;
        }
    };

    const load1hVolume = async () => {
        loading1h.value = true;
        try {
            vol1hData.value = await fetch1hVolume();
        } catch (e) {
            error1h.value = e;
        } finally {
            loading1h.value = false;
        }
    };

    // Computed Logic
    const marketItems = computed<EnhancedMarketItem[]>(() => {
        if (!mapping.value || !pricesData.value?.data) return [];

        const prices = pricesData.value.data;
        const vol5m = vol5mData.value?.data || {};
        const vol1h = vol1hData.value?.data || {};
        const now = Math.floor(Date.now() / 1000);

        // Fetch Nature Rune Price (ID: 561) for Alch Calculations
        const natureRunePrice = prices['561']?.low ?? 200;

        const items = mapping.value.map((item) => {
            const price = prices[item.id];
            if (!price) return null;

            const buyPrice = price.low ?? 0;
            const sellPrice = price.high ?? 0;

            if (!buyPrice || !sellPrice) return null;

            const margin = getNetProfit(buyPrice, sellPrice);
            const roi = getROI(margin, buyPrice);
            const tax = calculateTax(sellPrice);
            const alchProfit = (item.highalch || 0) - (buyPrice + natureRunePrice);

            // Get volume data
            const itemVol5m = vol5m[item.id];
            const itemVol1h = vol1h[item.id];

            const vol5mTotal = itemVol5m ? (itemVol5m.highPriceVolume || 0) + (itemVol5m.lowPriceVolume || 0) : 0;
            const vol1hTotal = itemVol1h ? (itemVol1h.highPriceVolume || 0) + (itemVol1h.lowPriceVolume || 0) : 0;

            // Get 5m and 1h average prices
            const price5mAvg = itemVol5m
                ? ((itemVol5m.avgHighPrice || 0) + (itemVol5m.avgLowPrice || 0)) / 2 || buyPrice
                : buyPrice;
            const price1hAvg = itemVol1h
                ? ((itemVol1h.avgHighPrice || 0) + (itemVol1h.avgLowPrice || 0)) / 2 || buyPrice
                : buyPrice;

            // Calculate price change
            const priceChange = price1hAvg > 0
                ? ((price5mAvg - price1hAvg) / price1hAvg) * 100
                : 0;

            // Get trend signal
            const trendSignal = getTrendSignal(vol5mTotal, vol1hTotal, price5mAvg, price1hAvg);

            // Last buy/sell times
            const lastBuyTime = price.lowTime ?? 0;
            const lastSellTime = price.highTime ?? 0;
            const lastBuyAgo = lastBuyTime > 0 ? now - lastBuyTime : Infinity;
            const lastSellAgo = lastSellTime > 0 ? now - lastSellTime : Infinity;

            // Price x Volume 24h estimate
            const avgPrice = (buyPrice + sellPrice) / 2;
            const priceVolume24h = vol1hTotal * 24 * avgPrice;

            // Limit profit
            const limitProfit = margin * (item.limit ?? 0);

            // Advanced analytics
            const volatilityIndex = calculateVolatility([buyPrice, sellPrice, price5mAvg, price1hAvg].filter(p => p > 0));
            const riskLevel = getRiskLevel(volatilityIndex);
            const priceStability = calculatePriceStability(volatilityIndex);
            const flipperScore = calculateFlipperScore(roi, margin, vol5mTotal, priceStability, item.limit ?? 0);

            return {
                ...item,
                buyPrice,
                sellPrice,
                margin,
                tax,
                roi,
                volume: vol5mTotal,
                potentialProfit: limitProfit,
                timestamp: Math.max(price.highTime ?? 0, price.lowTime ?? 0),
                fav: favorites.value.includes(item.id),
                score: 0,
                alchProfit,
                flipperScore,
                volatilityIndex,
                riskLevel,
                priceStability,
                // Enhanced fields
                vol5m: vol5mTotal,
                vol1h: vol1hTotal,
                price5mAvg,
                price1hAvg,
                priceChange,
                trendSignal,
                pump: trendSignal === 'pump',
                lastBuyTime,
                lastSellTime,
                lastBuyAgo,
                lastSellAgo,
                priceVolume24h,
                limitProfit,
            } as EnhancedMarketItem;
        }).filter((i): i is EnhancedMarketItem => i !== null);

        calculateOpportunityScores(items);

        return items;
    });

    // Alert check logic would go here
    // TODO: Implement alert checking when AlertStore is available
    // watch(marketItems, (newItems) => {
    //     if (newItems.length > 0) {
    //          checkForAlerts(...)
    //     }
    // });

    // Lifecycle
    onMounted(() => {
        loadMapping();
        loadPrices();
        load5mVolume();
        load1hVolume();

        // Set up intervals
        pricesTimer = setInterval(loadPrices, 60000); // 60s
        vol5mTimer = setInterval(load5mVolume, 5 * 60 * 1000); // 5m
        vol1hTimer = setInterval(load1hVolume, 30 * 60 * 1000); // 30m
    });

    onUnmounted(() => {
        if (pricesTimer) clearInterval(pricesTimer);
        if (vol5mTimer) clearInterval(vol5mTimer);
        if (vol1hTimer) clearInterval(vol1hTimer);
    });

    return {
        items: marketItems,
        isLoading: computed(() => loadingMapping.value || loadingPrices.value || loading5m.value || loading1h.value),
        error: computed(() => mappingError.value || pricesError.value || error5m.value || error1h.value),
        hasVolumeData: computed(() => !!vol5mData.value && !!vol1hData.value),
        refresh: () => {
            loadPrices();
            load5mVolume();
            load1hVolume();
        }
    };
}
