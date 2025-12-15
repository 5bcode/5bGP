// api.js

const API_BASE = 'http://localhost:8080'; // Local dev default

export async function fetchLatestPrices() {
    try {
        const response = await fetch(`${API_BASE}/prices/latest`);
        if (!response.ok) throw new Error('Network response was not ok');
        return await response.json();
    } catch (error) {
        console.error('Failed to fetch prices:', error);
        // Fallback for demo purposes if backend isn't running?
        // For now, let's just return empty object or throw
        return {}; 
    }
}

export async function fetchItemTimeseries(itemId, timestep = '5m') {
    // Direct wiki fetch as fallback or per plan
    const response = await fetch(`https://prices.runescape.wiki/api/v1/osrs/timeseries?id=${itemId}&timestep=${timestep}`, {
        headers: { 'User-Agent': 'FlipTo5B-Dev/1.0' }
    });
    return await response.json();
}

export async function fetchMapping() {
    try {
        const response = await fetch(`${API_BASE}/mapping`);
         if (!response.ok) throw new Error('Network response was not ok');
        return await response.json();
    } catch (error) {
        console.error('Failed to fetch mapping:', error);
        return [];
    }
}
