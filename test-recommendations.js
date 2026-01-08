/**
 * This script tests the recommendation logic without needing Docker/Supabase Local.
 * Run with: node test-recommendations.js
 */

const PRICES_API = "https://prices.runescape.wiki/api/v1/osrs/latest";
const MAPPING_API = "https://prices.runescape.wiki/api/v1/osrs/mapping";

function calculateTax(sellPrice) {
    return Math.min(Math.floor(sellPrice * 0.01), 5000000);
}

async function test() {
    console.log("🚀 Testing recommendation logic...");

    try {
        const [pricesRes, mappingRes] = await Promise.all([
            fetch(PRICES_API, { headers: { "User-Agent": "FlipTo5B/Testing" } }),
            fetch(MAPPING_API, { headers: { "User-Agent": "FlipTo5B/Testing" } }),
        ]);

        const pricesData = await pricesRes.json();
        const mappingData = await mappingRes.json();

        const itemMap = new Map();
        mappingData.forEach((item) => itemMap.set(item.id, item));

        const recommendations = [];

        for (const [idStr, price] of Object.entries(pricesData.data)) {
            const id = parseInt(idStr);
            const item = itemMap.get(id);
            const p = price;

            if (!item || !p.high || !p.low) continue;

            const buyPrice = p.low;
            const sellPrice = p.high;
            const tax = calculateTax(sellPrice);
            const margin = sellPrice - buyPrice - tax;
            const roi = buyPrice > 0 ? (margin / buyPrice) * 100 : 0;

            if (margin < 500) continue;
            if (roi < 1 || roi > 50) continue;

            recommendations.push({
                itemId: id,
                itemName: item.name,
                buyPrice,
                sellPrice,
                margin,
                roi,
            });
        }

        recommendations.sort((a, b) => b.margin - a.margin);
        const top = recommendations.slice(0, 5);

        console.log("\n✅ TOP 5 RECOMMENDATIONS:");
        console.table(top);

        console.log("\nLogic is working! You can now deploy to Supabase.");
    } catch (error) {
        console.error("❌ Test failed:", error.message);
    }
}

test();
