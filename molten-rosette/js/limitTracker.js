// limitTracker.js

const STORAGE_KEY = 'flip5b_limits';
const LIMIT_RESET_TIME = 4 * 60 * 60 * 1000; // 4 hours in ms

export function getLimitData() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
}

export function saveLimitData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function trackPurchase(itemId, quantity) {
    const data = getLimitData();
    const now = Date.now();
    
    if (!data[itemId]) {
        data[itemId] = { bought: 0, firstPurchaseTs: now };
    }
    
    // Check if limit reset
    if (now - data[itemId].firstPurchaseTs > LIMIT_RESET_TIME) {
        data[itemId].bought = 0;
        data[itemId].firstPurchaseTs = now;
    }
    
    data[itemId].bought += parseInt(quantity);
    saveLimitData(data);
    return data[itemId];
}

export function getRemainingLimit(itemId, geLimit) {
    if (!geLimit) return Infinity;
    const data = getLimitData();
    
    // Check for stale data and auto-reset
    if (data[itemId]) {
        const now = Date.now();
        if (now - data[itemId].firstPurchaseTs > LIMIT_RESET_TIME) {
            return geLimit; // Reset effectively
        }
        return Math.max(0, geLimit - data[itemId].bought);
    }
    
    return geLimit;
}
