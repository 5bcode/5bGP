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

// Alerts System Types
export interface AlertThresholds {
    priceChangePercent: number; // e.g., 5 = 5% price change
    volumeSpikeMultiplier: number; // e.g., 3 = 3x volume spike
    marginIncreasePercent: number; // e.g., 10 = 10% margin improvement
    newFlipperScoreMin: number; // minimum flipper score for alert
}

export interface AlertRule {
    id: string;
    name: string;
    itemId: number;
    itemName: string;
    itemIcon: string;
    thresholds: AlertThresholds;
    enabled: boolean;
    createdAt: number;
    lastTriggered?: number;
    triggerCount: number;
}

export interface Alert {
    id: string;
    ruleId: string;
    itemId: number;
    itemName: string;
    itemIcon: string;
    type: 'price_spike' | 'volume_spike' | 'margin_improvement' | 'high_score' | 'pump_detected' | 'dump_detected';
    severity: 'info' | 'warning' | 'critical';
    title: string;
    message: string;
    data: {
        currentValue: number;
        previousValue: number;
        threshold: number;
        changePercent: number;
    };
    timestamp: number;
    read: boolean;
    dismissed: boolean;
}

export interface AlertSettings {
    enabled: boolean;
    browserNotifications: boolean;
    soundEnabled: boolean;
    maxAlerts: number; // maximum alerts to keep in history
    alertCooldownMinutes: number; // minimum time between alerts for same item
    defaultThresholds: AlertThresholds;
}

export interface AlertStats {
    totalAlerts: number;
    unreadAlerts: number;
    todayAlerts: number;
    alertsByType: Record<string, number>;
    topTriggeredItems: Array<{ itemId: number; itemName: string; count: number }>;
}
