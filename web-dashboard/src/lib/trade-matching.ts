import { Trade } from '@/components/TradeLogDialog';
import { calculateTax } from '@/lib/osrs-math';

export interface MatchedFlip {
    id: string; // composite id
    itemId: number;
    itemName: string;
    quantity: number;
    buyPrice: number; // avg buy price
    sellPrice: number; // avg sell price
    profit: number;
    timestamp: number; // timestamp of the sell (completion)
    buyTransactions: string[]; // ids of buy trades
    sellTransactions: string[]; // ids of sell trades
}

export function matchTrades(trades: Trade[]): MatchedFlip[] {
    // Sort by time ascending to process chronologically
    const sorted = [...trades].sort((a, b) => a.timestamp - b.timestamp);
    
    const inventory: Record<number, { quantity: number, cost: number, tradeIds: string[] }[]> = {};
    const flips: MatchedFlip[] = [];

    for (const trade of sorted) {
        // If the trade record already has both Buy & Sell prices and profit != 0, 
        // it's likely a manual entry representing a full flip. Treat it as such.
        if (trade.buyPrice > 0 && trade.sellPrice > 0 && trade.profit !== 0) {
            flips.push({
                id: trade.id,
                itemId: trade.itemId,
                itemName: trade.itemName,
                quantity: trade.quantity,
                buyPrice: trade.buyPrice,
                sellPrice: trade.sellPrice,
                profit: trade.profit,
                timestamp: trade.timestamp,
                buyTransactions: [trade.id],
                sellTransactions: [trade.id]
            });
            continue;
        }

        const isBuy = trade.buyPrice > 0 && trade.sellPrice === 0;
        const isSell = trade.sellPrice > 0 && trade.buyPrice === 0;

        if (isBuy) {
            if (!inventory[trade.itemId]) inventory[trade.itemId] = [];
            inventory[trade.itemId].push({
                quantity: trade.quantity,
                cost: trade.buyPrice,
                tradeIds: [trade.id]
            });
        } else if (isSell) {
            // Sell logic - match FIFO (First In First Out)
            let remainingSellQty = trade.quantity;
            let totalCost = 0;
            const matchedBuyIds: string[] = [];
            
            const itemInv = inventory[trade.itemId] || [];
            
            // While we have inventory and need to fill sell order
            while (remainingSellQty > 0 && itemInv.length > 0) {
                const batch = itemInv[0];
                
                if (batch.quantity <= remainingSellQty) {
                    // Consume entire batch
                    totalCost += batch.quantity * batch.cost;
                    remainingSellQty -= batch.quantity;
                    matchedBuyIds.push(...batch.tradeIds);
                    itemInv.shift(); // Remove batch from inventory
                } else {
                    // Partial consume
                    totalCost += remainingSellQty * batch.cost;
                    batch.quantity -= remainingSellQty;
                    matchedBuyIds.push(batch.tradeIds[0]); 
                    remainingSellQty = 0;
                }
            }
            
            // Only create a flip for the portion we could match
            const matchedQty = trade.quantity - remainingSellQty;
            
            if (matchedQty > 0) {
                const avgBuyPrice = totalCost / matchedQty;
                // Tax is calculated on the revenue
                const totalRevenue = matchedQty * trade.sellPrice;
                const totalTax = calculateTax(trade.sellPrice) * matchedQty; 
                const netProfit = totalRevenue - totalCost - totalTax;
                
                flips.push({
                    id: `${trade.id}-flip`,
                    itemId: trade.itemId,
                    itemName: trade.itemName,
                    quantity: matchedQty,
                    buyPrice: avgBuyPrice,
                    sellPrice: trade.sellPrice,
                    profit: netProfit,
                    timestamp: trade.timestamp,
                    buyTransactions: matchedBuyIds,
                    sellTransactions: [trade.id]
                });
            }
            // If remainingSellQty > 0, we sold something we didn't track buying. 
            // We ignore it for profit calc as cost basis is unknown (or 0, which skews data).
        }
    }
    
    // Sort descending by timestamp (newest flips first)
    return flips.sort((a, b) => b.timestamp - a.timestamp);
}