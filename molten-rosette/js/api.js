// api.js

// Use relative path for production (same origin), fallback to localhost for separate dev servers
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? '' // Use relative path since we are serving from the backend
    : ''; // Relative path for production (served from same origin)

export async function fetchLatestPrices() {
    try {
        const response = await fetch(`${API_BASE}/prices/latest`);
        if (!response.ok) throw new Error('Network response was not ok');
        return await response.json();
    } catch (error) {
        console.error('Failed to fetch prices:', error);
        // Fallback for demo purposes if backend isn't running?
        // For now, let's just return empty object or throw
    }
}

export async function fetchItemTimeseries(itemId, timestep = '5m') {
    try {
        // Direct wiki fetch as fallback or per plan
        const response = await fetch(`https://prices.runescape.wiki/api/v1/osrs/timeseries?id=${itemId}&timestep=${timestep}`, {
            headers: { 'User-Agent': 'FlipTo5B-Dev/1.0' }
        });
        if (!response.ok) throw new Error(`Wiki API error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Failed to fetch timeseries:', error);
        return { data: [] }; // Return empty structure to prevent UI crashes
    }
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
