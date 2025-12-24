const BASE_URL = 'https://prices.runescape.wiki/api/v1/osrs';

export interface Item {
  id: number;
  name: string;
  examine: string;
  icon: string;
  limit?: number;
  value?: number; // High alch / store value
  members: boolean;
  lowalch?: number;
  highalch?: number;
}

export interface PriceData {
  high: number;
  highTime: number;
  low: number;
  lowTime: number;
}

export interface Stats24h {
  avgHighPrice: number;
  highPriceVolume: number;
  avgLowPrice: number;
  lowPriceVolume: number;
}

export interface TimeSeriesPoint {
  timestamp: number;
  avgHighPrice: number | null;
  avgLowPrice: number | null;
  highPriceVolume: number;
  lowPriceVolume: number;
}

// Simple in-memory cache
let mappingCache: Item[] | null = null;
let pricesCache: Record<string, PriceData> | null = null;
let statsCache: Record<string, Stats24h> | null = null;
let lastPriceFetch = 0;
let lastStatsFetch = 0;

export type TimeStep = '5m' | '1h' | '6h' | '24h';

export const osrsApi = {
  async getMapping(): Promise<Item[]> {
    if (mappingCache) return mappingCache;
    
    try {
      const response = await fetch(`${BASE_URL}/mapping`, {
        headers: {
            'User-Agent': 'FlipTo5B-Client/1.0'
        }
      });
      const data = await response.json();
      mappingCache = data;
      return data;
    } catch (error) {
      console.error('Failed to fetch mapping:', error);
      return [];
    }
  },

  async getLatestPrices(): Promise<Record<string, PriceData>> {
    const now = Date.now();
    // Cache for 60 seconds
    if (pricesCache && (now - lastPriceFetch < 60000)) {
      return pricesCache;
    }

    try {
      const response = await fetch(`${BASE_URL}/latest`, {
         headers: {
            'User-Agent': 'FlipTo5B-Client/1.0'
        }
      });
      const json = await response.json();
      pricesCache = json.data;
      lastPriceFetch = now;
      return json.data;
    } catch (error) {
      console.error('Failed to fetch prices:', error);
      return {};
    }
  },

  async get24hStats(): Promise<Record<string, Stats24h>> {
    const now = Date.now();
    // Cache for 5 minutes
    if (statsCache && (now - lastStatsFetch < 300000)) {
      return statsCache;
    }

    try {
      const response = await fetch(`${BASE_URL}/24h`, {
         headers: {
            'User-Agent': 'FlipTo5B-Client/1.0'
        }
      });
      const json = await response.json();
      statsCache = json.data;
      lastStatsFetch = now;
      return json.data;
    } catch (error) {
      console.error('Failed to fetch 24h stats:', error);
      return {};
    }
  },

  async getTimeseries(id: number, timestep: TimeStep = '5m'): Promise<TimeSeriesPoint[]> {
    try {
      const response = await fetch(`${BASE_URL}/timeseries?timestep=${timestep}&id=${id}`, {
         headers: {
            'User-Agent': 'FlipTo5B-Client/1.0'
        }
      });
      const json = await response.json();
      return json.data;
    } catch (error) {
      console.error('Failed to fetch timeseries:', error);
      return [];
    }
  }
};