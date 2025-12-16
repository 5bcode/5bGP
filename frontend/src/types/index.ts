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
