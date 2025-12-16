export interface Item {
    id: number;
    name: string;
    icon: string;
    members: boolean;
    limit?: number;
    value?: number;
    highalch?: number;
    lowalch?: number;
    examine?: string;
}

export interface PriceData {
    high: number;
    highTime: number;
    low: number;
    lowTime: number;
}

export interface MarketItem extends Item {
    buyPrice: number;
    sellPrice: number;
    margin: number;
    tax: number;
    roi: number;
    volume: number;
    potentialProfit: number;
    timestamp: number;
    fav: boolean;
    score?: number;
    pump?: boolean;
    alchProfit?: number;
    // Advanced Analytics
    flipperScore: number;
    volatilityIndex: number;
    riskLevel: 'low' | 'medium' | 'high' | 'extreme';
    priceStability: number;
}

export interface AnalyticsData {
    sma7: number[];
    sma14: number[];
    ema7: number[];
    ema14: number[];
    totalVolume: number;
    avgVolume: number;
    volatility: number;
    priceRange: { min: number; max: number };
}

export interface TimeseriesPoint {
    timestamp: number;
    avgHighPrice: number | null;
    avgLowPrice: number | null;
    highPriceVolume: number;
    lowPriceVolume: number;
}

export interface TimeseriesResponse {
    data: TimeseriesPoint[];
}

export interface FlipPerformance {
    id: string;
    itemId: number;
    itemName: string;
    itemIcon: string;
    buyTransactionId: string;
    sellTransactionId: string;
    buyPrice: number;
    sellPrice: number;
    quantity: number;
    buyTimestamp: number;
    sellTimestamp: number;
    profit: number;
    roi: number;
    holdingTime: number; // in milliseconds
    taxPaid: number;
    realized: boolean;
}

export interface HistoricalPerformance {
    totalFlips: number;
    totalProfit: number;
    totalROI: number;
    averageProfit: number;
    averageROI: number;
    averageHoldingTime: number;
    winRate: number; // percentage of profitable flips
    bestFlip: FlipPerformance | null;
    worstFlip: FlipPerformance | null;
    flipsByPeriod: {
        daily: FlipPerformance[];
        weekly: FlipPerformance[];
        monthly: FlipPerformance[];
    };
    profitByPeriod: {
        daily: number[];
        weekly: number[];
        monthly: number[];
    };
}
