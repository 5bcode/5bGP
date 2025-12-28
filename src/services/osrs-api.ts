const BASE_URL = 'https://prices.runescape.wiki/api/v1/osrs';
// Browsers forbid setting the User-Agent header directly.
// We use X-User-Agent to identify ourselves to the API from the client side.
const CLIENT_UA = 'FlipTo5B-Client/1.0';

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

export type TimeStep = '5m' | '1h' | '6h' | '24h';

export const osrsApi = {
  async getMapping(): Promise<Item[]> {
    const response = await fetch(`${BASE_URL}/mapping`, {
      headers: {
          'X-User-Agent': CLIENT_UA
      }
    });
    if (!response.ok) throw new Error('Failed to fetch mapping');
    return response.json();
  },

  async getLatestPrices(): Promise<Record<string, PriceData>> {
    const response = await fetch(`${BASE_URL}/latest`, {
        headers: {
          'X-User-Agent': CLIENT_UA
      }
    });
    if (!response.ok) throw new Error('Failed to fetch prices');
    const json = await response.json();
    return json.data;
  },

  async get24hStats(): Promise<Record<string, Stats24h>> {
    const response = await fetch(`${BASE_URL}/24h`, {
        headers: {
          'X-User-Agent': CLIENT_UA
      }
    });
    if (!response.ok) throw new Error('Failed to fetch stats');
    const json = await response.json();
    return json.data;
  },

  async getTimeseries(id: number, timestep: TimeStep = '5m'): Promise<TimeSeriesPoint[]> {
    const response = await fetch(`${BASE_URL}/timeseries?timestep=${timestep}&id=${id}`, {
        headers: {
          'X-User-Agent': CLIENT_UA
      }
    });
    if (!response.ok) throw new Error('Failed to fetch timeseries');
    const json = await response.json();
    return json.data;
  }
};