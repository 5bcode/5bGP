
// Flip to 5B - Portfolio Management Module

// Constants
const STORAGE_KEY = '5bgp_portfolio';
const TAX_RATE = 0.01; // 1% tax (updated May 2025: Ge Tax is 1% not 2%? Actually code says 2% in analysis, let's stick to user code convention or global config.
// Analysis.js uses 2% (0.02) tax in existing code (based on my read earlier), but I should verify analysis.js tax rate.
// I will check analysis.js content first to be sure about tax rate before finalizing this file.
// For now, I will assume consistent tax rate with analysis.js.

let portfolioData = {
    flips: [] 
};

// Data Structure for a Flip:
// {
//   id: string (uuid),
//   itemId: string,
//   name: string,
//   qty: number,
//   buyPrice: number,
//   buyTime: number (timestamp),
//   targetSellPrice: number,
//   status: 'active' | 'completed' | 'cancelled',
//   sellPrice: number (if completed),
//   sellTime: number (if completed),
//   notes: string
// }

// Load from LocalStorage
export function loadPortfolio() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        try {
            portfolioData = JSON.parse(stored);
        } catch (e) {
            console.error('Failed to parse portfolio data', e);
            portfolioData = { flips: [] };
        }
    }
    return portfolioData;
}

// Save to LocalStorage
function savePortfolio() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(portfolioData));
}

// Add a new flip
export function addFlip(flipData) {
    const newFlip = {
        id: crypto.randomUUID(),
        status: 'active',
        buyTime: Date.now(),
        ...flipData
    };
    portfolioData.flips.push(newFlip);
    savePortfolio();
    return newFlip;
}

// Update an existing flip
export function updateFlip(id, updates) {
    const index = portfolioData.flips.findIndex(f => f.id === id);
    if (index !== -1) {
        portfolioData.flips[index] = { ...portfolioData.flips[index], ...updates };
        savePortfolio();
        return true;
    }
    return false;
}

// Complete a flip (sell it)
export function completeFlip(id, sellPrice, quantitySold) {
    const flip = portfolioData.flips.find(f => f.id === id);
    if (!flip) return false;

    // Handle partial sales? For MVP, assume full sale or simple split
    // Let's keep it simple: Mark as completed
    flip.status = 'completed';
    flip.sellPrice = sellPrice;
    flip.sellTime = Date.now();
    savePortfolio();
    return true;
}

// Delete a flip
export function deleteFlip(id) {
    portfolioData.flips = portfolioData.flips.filter(f => f.id !== id);
    savePortfolio();
}

// Get all flips
export function getFlips() {
    return portfolioData.flips;
}

// Calculate Portfolio Metrics
// taxRate is passed in to ensure consistency with analysis.js
export function getPortfolioSummary(currentPricesMap, taxCalculator) {
    let totalInvested = 0;
    let currentValue = 0;
    let totalRealizedProfit = 0;
    let activeFlipsCount = 0;
    let dayRealizedProfit = 0;

    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    portfolioData.flips.forEach(flip => {
        if (flip.status === 'active') {
            activeFlipsCount++;
            totalInvested += flip.qty * flip.buyPrice;
            
            // Calculate current value based on market price
            const currentPrice = currentPricesMap[flip.itemId] ? currentPricesMap[flip.itemId].high : flip.buyPrice; // Optimistic: sell at high
            // Value is revenue after tax
            const revenue = flip.qty * currentPrice;
            const tax = taxCalculator(currentPrice) * flip.qty;
            currentValue += (revenue - tax);

        } else if (flip.status === 'completed') {
            const revenue = flip.qty * flip.sellPrice;
            const cost = flip.qty * flip.buyPrice;
            const tax = taxCalculator(flip.sellPrice) * flip.qty;
            const profit = revenue - cost - tax;
            
            totalRealizedProfit += profit;

            if (now - flip.sellTime < oneDayMs) {
                dayRealizedProfit += profit;
            }
        }
    });

    return {
        activeCount: activeFlipsCount,
        invested: totalInvested,
        currentValue: currentValue,
        unrealizedProfit: currentValue - totalInvested,
        totalProfit: totalRealizedProfit,
        dayProfit: dayRealizedProfit
    };
}
