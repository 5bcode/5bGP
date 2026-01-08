/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * Suggestion Engine - Flipping Co-pilot Style
 * 
 * Accepts: Player's inventory, active offers, and GP
 * Returns: Personalized buy/sell/wait suggestion
 * 
 * Based on Beagle Flipper's suggestionEngine.js
 */

const PRICES_API = "https://prices.runescape.wiki/api/v1/osrs/latest";
const MAPPING_API = "https://prices.runescape.wiki/api/v1/osrs/mapping";
const TAX_RATE = 0.01; // 1% GE tax

interface PriceData {
    high: number;
    highTime: number;
    low: number;
    lowTime: number;
    highPriceVolume?: number;
    lowPriceVolume?: number;
}

interface ItemMapping {
    id: number;
    name: string;
    limit: number;
    members: boolean;
    tradeable?: boolean;
}

interface InventoryItem {
    id: number;
    amount: number;
}

interface ActiveOffer {
    slot: number;
    itemId: number;
    status: string;
    type: string;
}

interface SuggestionRequest {
    inventory: InventoryItem[];
    offers: ActiveOffer[];
    gp: number;
}

interface Suggestion {
    type: "buy" | "sell" | "wait";
    message: string;
    item_id?: number;
    name?: string;
    price?: number;
    quantity?: number;
    score?: number;
}

// Cache for market data (30 second TTL)
let marketDataCache: {
    latest: Record<string, PriceData> | null;
    mapping: ItemMapping[] | null;
    timestamp: number;
} = { latest: null, mapping: null, timestamp: 0 };

const CACHE_TTL_MS = 30000;

async function ensureMarketData() {
    const now = Date.now();
    if (marketDataCache.timestamp && now - marketDataCache.timestamp < CACHE_TTL_MS) {
        return;
    }

    console.log("[Suggestion] Fetching fresh market data...");
    const [pricesRes, mappingRes] = await Promise.all([
        fetch(PRICES_API, { headers: { "User-Agent": "FlipTo5B-Suggestion/1.0" } }),
        fetch(MAPPING_API, { headers: { "User-Agent": "FlipTo5B-Suggestion/1.0" } }),
    ]);

    if (pricesRes.ok && mappingRes.ok) {
        const pricesData = await pricesRes.json();
        const mappingData = await mappingRes.json();
        marketDataCache = {
            latest: pricesData.data,
            mapping: mappingData,
            timestamp: now,
        };
        console.log(`[Suggestion] Market data cached: ${Object.keys(pricesData.data).length} items`);
    }
}

function getMarketData() {
    return marketDataCache;
}

async function getSuggestion(reqBody: SuggestionRequest): Promise<Suggestion> {
    const { inventory = [], offers = [], gp = 0 } = reqBody;

    await ensureMarketData();
    const { latest, mapping } = getMarketData();

    if (!latest || !mapping) {
        return { type: "wait", message: "Market data not available." };
    }

    // Build lookup map
    const mappingMap = new Map<number, ItemMapping>();
    mapping.forEach((m) => mappingMap.set(m.id, m));

    // Track active flips
    const activeFlipItemIds = new Set(
        offers.filter((o) => o.status !== "empty").map((o) => o.itemId)
    );
    const emptySlots = 8 - activeFlipItemIds.size;

    // --- PRIORITY 1: SELL ITEMS IN INVENTORY ---
    const itemToSell = inventory.find(
        (item) => item.id !== 995 && item.amount > 0 && !activeFlipItemIds.has(item.id)
    );
    if (itemToSell) {
        const itemData = latest[itemToSell.id.toString()];
        if (itemData && itemData.high > 0) {
            const itemInfo = mappingMap.get(itemToSell.id);
            const itemName = itemInfo?.name || "item";
            return {
                type: "sell",
                message: `Sell your ${itemName}`,
                item_id: itemToSell.id,
                name: itemName,
                quantity: itemToSell.amount,
                price: itemData.high,
            };
        }
    }

    // --- PRIORITY 2: BUY NEW ITEMS ---
    if (emptySlots === 0) {
        return { type: "wait", message: "All GE slots are full." };
    }

    const cashPerSlot = Math.floor(gp / emptySlots);
    if (cashPerSlot < 50000) {
        return { type: "wait", message: "Not enough cash to flip effectively." };
    }

    const potentialFlips: {
        itemId: number;
        score: number;
        quantityToBuy: number;
        name: string;
        buyPrice: number;
    }[] = [];

    for (const itemIdStr of Object.keys(latest)) {
        const itemId = parseInt(itemIdStr, 10);
        if (activeFlipItemIds.has(itemId)) continue;

        const itemData = latest[itemIdStr];
        const mappingInfo = mappingMap.get(itemId);

        if (!itemData || !mappingInfo || !mappingInfo.members) continue;
        if (itemData.low <= 0 || itemData.high <= 0) continue;

        const margin = itemData.high - itemData.low;
        const tax = Math.floor(itemData.high * TAX_RATE);
        const profitPerItem = margin - tax;

        // Skip items with no profit or too low margin
        if (profitPerItem < 10) continue;

        // Calculate score: profit * log10(buy_limit * 4) for volume estimate
        const volumeEstimate = (mappingInfo.limit || 1) * 4;
        const score = profitPerItem * Math.log10(volumeEstimate + 1);

        const quantityToBuy = Math.min(
            Math.floor(cashPerSlot / itemData.low),
            mappingInfo.limit || 10000
        );

        if (quantityToBuy > 0) {
            potentialFlips.push({
                itemId,
                score,
                quantityToBuy,
                name: mappingInfo.name,
                buyPrice: itemData.low,
            });
        }
    }

    if (potentialFlips.length === 0) {
        return { type: "wait", message: "No profitable opportunities found right now." };
    }

    // Find the best flip by score
    potentialFlips.sort((a, b) => b.score - a.score);
    const bestFlip = potentialFlips[0];

    return {
        type: "buy",
        message: `Buy ${bestFlip.name}`,
        item_id: bestFlip.itemId,
        price: bestFlip.buyPrice,
        quantity: bestFlip.quantityToBuy,
        name: bestFlip.name,
        score: Math.round(bestFlip.score * 100) / 100,
    };
}

Deno.serve(async (req: Request) => {
    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    };

    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        let reqBody: SuggestionRequest = { inventory: [], offers: [], gp: 0 };

        if (req.method === "POST") {
            reqBody = await req.json();
        } else {
            // GET request - use query params for testing
            const url = new URL(req.url);
            reqBody.gp = parseInt(url.searchParams.get("gp") || "10000000");
        }

        const suggestion = await getSuggestion(reqBody);

        console.log(`[Suggestion] Result: ${suggestion.type} - ${suggestion.message}`);

        return new Response(JSON.stringify(suggestion), {
            headers: {
                ...corsHeaders,
                "Content-Type": "application/json",
            },
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error("[Suggestion] Error:", message);
        return new Response(JSON.stringify({ type: "wait", message, error: true }), {
            status: 500,
            headers: {
                ...corsHeaders,
                "Content-Type": "application/json",
            },
        });
    }
});
