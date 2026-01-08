/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// OSRS Wiki API endpoint
const PRICES_API = "https://prices.runescape.wiki/api/v1/osrs/latest";
const MAPPING_API = "https://prices.runescape.wiki/api/v1/osrs/mapping";

interface PriceData {
    high: number;
    highTime: number;
    low: number;
    lowTime: number;
}

interface ItemMapping {
    id: number;
    name: string;
    limit: number;
    members: boolean;
}

interface FlipRecommendation {
    itemId: number;
    itemName: string;
    buyPrice: number;
    sellPrice: number;
    margin: number;
    roi: number;
    volume24h: number;
}

// Calculate tax (1% capped at 5M)
function calculateTax(sellPrice: number): number {
    return Math.min(Math.floor(sellPrice * 0.01), 5000000);
}

Deno.serve(async (req: Request) => {
    // CORS headers
    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    };

    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        // Parse query params
        const url = new URL(req.url);
        const limit = parseInt(url.searchParams.get("limit") || "5");
        const minMargin = parseInt(url.searchParams.get("minMargin") || "100");
        const minVolume = parseInt(url.searchParams.get("minVolume") || "100");

        // Fetch prices and mapping
        const [pricesRes, mappingRes] = await Promise.all([
            fetch(PRICES_API, { headers: { "User-Agent": "FlipTo5B/1.0" } }),
            fetch(MAPPING_API, { headers: { "User-Agent": "FlipTo5B/1.0" } }),
        ]);

        const pricesData = await pricesRes.json();
        const mappingData: ItemMapping[] = await mappingRes.json();

        // Create lookup maps
        const itemMap = new Map<number, ItemMapping>();
        mappingData.forEach((item) => itemMap.set(item.id, item));

        // Calculate recommendations
        const recommendations: FlipRecommendation[] = [];

        for (const [idStr, price] of Object.entries(pricesData.data)) {
            const id = parseInt(idStr);
            const item = itemMap.get(id);
            const p = price as PriceData;

            if (!item || !p.high || !p.low) continue;

            const buyPrice = p.low;
            const sellPrice = p.high;
            const tax = calculateTax(sellPrice);
            const margin = sellPrice - buyPrice - tax;
            const roi = buyPrice > 0 ? (margin / buyPrice) * 100 : 0;

            // Filter by criteria
            if (margin < minMargin) continue;
            if (roi < 1 || roi > 50) continue; // Reasonable ROI range

            recommendations.push({
                itemId: id,
                itemName: item.name,
                buyPrice,
                sellPrice,
                margin,
                roi,
                volume24h: item.limit * 4, // Rough estimate
            });
        }

        // Sort by margin and limit results
        recommendations.sort((a, b) => b.margin - a.margin);
        const topRecommendations = recommendations.slice(0, limit);

        return new Response(JSON.stringify(topRecommendations), {
            headers: {
                ...corsHeaders,
                "Content-Type": "application/json",
            },
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return new Response(JSON.stringify({ error: message }), {
            status: 500,
            headers: {
                ...corsHeaders,
                "Content-Type": "application/json",
            },
        });
    }
});
