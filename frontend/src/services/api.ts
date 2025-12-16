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

export async function fetchItemTimeseries(id: number, timestep: string = '5m'): Promise<TimeseriesResponse> {
    const response = await fetch(`https://prices.runescape.wiki/api/v1/osrs/timeseries?id=${id}&timestep=${timestep}`, { headers: HEADERS });
    if (!response.ok) throw new Error('Failed to fetch timeseries');
    return response.json();
}
