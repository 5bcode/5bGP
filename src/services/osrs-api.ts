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

// Simple in-memory cache
let mappingCache: Item[] | null = null;
let pricesCache: Record<string, PriceData> | null = null;
let lastPriceFetch = 0;

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
    // Cache for 60 seconds as per spec recommendation
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
  }
};