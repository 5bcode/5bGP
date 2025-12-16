import type { Item, PriceData, TimeseriesResponse } from "../types";

// Using a user-agent header is polite for Wiki API
const HEADERS = {
    'User-Agent': 'FlipTo5B-Client/1.0'
};

export async function fetchMapping(): Promise<Item[]> {
    const response = await fetch('https://prices.runescape.wiki/api/v1/osrs/mapping', { headers: HEADERS });
    if (!response.ok) throw new Error('Failed to fetch mapping');
    return response.json();
}

export async function fetchLatestPrices(): Promise<{ data: Record<string, PriceData> }> {
    const response = await fetch('https://prices.runescape.wiki/api/v1/osrs/latest', { headers: HEADERS });
    if (!response.ok) throw new Error('Failed to fetch prices');
    return response.json();
}

export interface VolumeDataPoint {
    avgHighPrice: number | null;
    avgLowPrice: number | null;
    highPriceVolume: number;
    lowPriceVolume: number;
}

export interface VolumeResponse {
    timestamp: number;
    data: Record<string, VolumeDataPoint>;
}

/**
 * Fetch 5-minute volume data for ALL items.
 * This includes: avgHighPrice, avgLowPrice, highPriceVolume, lowPriceVolume
 */
export async function fetch5mVolume(): Promise<VolumeResponse> {
    const response = await fetch('https://prices.runescape.wiki/api/v1/osrs/5m', { headers: HEADERS });
    if (!response.ok) throw new Error('Failed to fetch 5m volume');
    return response.json();
}

/**
 * Fetch 1-hour volume data for ALL items.
 * Good for comparing against 5m data to detect pumps/dumps.
 */
export async function fetch1hVolume(): Promise<VolumeResponse> {
    const response = await fetch('https://prices.runescape.wiki/api/v1/osrs/1h', { headers: HEADERS });
    if (!response.ok) throw new Error('Failed to fetch 1h volume');
    return response.json();
}

export async function fetchItemTimeseries(id: number, timestep: string = '5m'): Promise<TimeseriesResponse> {
    const response = await fetch(`https://prices.runescape.wiki/api/v1/osrs/timeseries?id=${id}&timestep=${timestep}`, { headers: HEADERS });
    if (!response.ok) throw new Error('Failed to fetch timeseries');
    return response.json();
}
