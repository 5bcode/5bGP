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
    flipperScore?: number;
    volatilityIndex?: number;
    riskLevel?: 'low' | 'medium' | 'high' | 'extreme';
    priceStability?: number;
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
