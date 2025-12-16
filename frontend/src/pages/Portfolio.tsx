import { useState } from 'react';
import { usePortfolioStore } from '../store/portfolioStore';
import { useMarketData } from '../hooks/useMarketData';
import { formatNumber } from '../utils/analysis';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { FaWallet, FaPlus, FaCoins, FaArrowTrendUp } from 'react-icons/fa6';
import clsx from 'clsx';

export function Portfolio() {
    const { cash, holdings, addTransaction, resetPortfolio } = usePortfolioStore();
    const { items: marketItems } = useMarketData();

    // Modal State
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [txType, setTxType] = useState<'buy' | 'sell'>('buy');
    const [selectedItemId, setSelectedItemId] = useState<number>(0);
    const [quantity, setQuantity] = useState<string>('');
    const [price, setPrice] = useState<string>('');

    // Derived Data
    const holdingsList = Object.values(holdings).map(h => {
        const marketItem = marketItems.find(i => i.id === h.itemId);
        const currentPrice = marketItem ? marketItem.sellPrice : 0; // Conservative valuation (sell price)
        const value = h.quantity * currentPrice;
        const costBasis = h.quantity * h.avgBuyPrice;
        const profit = value - costBasis;
        const profitPercent = costBasis > 0 ? (profit / costBasis) * 100 : 0;

        return {
            ...h,
            name: marketItem?.name || `Item ${h.itemId}`,
            icon: marketItem?.icon,
            currentPrice,
            value,
            profit,
            profitPercent
        };
    });

    const totalInventoryValue = holdingsList.reduce((acc, curr) => acc + curr.value, 0);
    const netWorth = cash + totalInventoryValue;

    const handleTransaction = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedItemId || !quantity || !price) return;

        addTransaction({
            itemId: Number(selectedItemId),
            type: txType,
            quantity: Number(quantity),
            price: Number(price)
        });

        setIsAddOpen(false);
        // Reset form
        setQuantity('');
        setPrice('');
    };

    // Filter items for select dropdown
    // Only show top 100 or previously typed? For now just a simple select with minimal items to avoid lag
    // Ideally this is a Combobox. For MVP, we will use a raw select and assume user knows ID or we map top items.
    // Actually, let's just Map ALL items. It might be laggy.
    // Optimization: Just show items the user HAS for Sell, and maybe top 100 for Buy.

    return (
        <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-3">
                        <FaWallet className="text-gold" /> Portfolio
                    </h1>
                    <p className="text-secondary text-sm">Track your flips and net worth.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={resetPortfolio}
                        className="px-4 py-2 text-xs font-medium text-red-400 hover:text-red-300 border border-red-500/30 rounded-lg hover:bg-red-500/10 transition-colors"
                    >
                        Reset
                    </button>
                    <button
                        onClick={() => { setTxType('buy'); setIsAddOpen(true); }}
                        className="flex items-center gap-2 bg-gold hover:bg-yellow-400 text-black font-bold px-5 py-2 rounded-lg transition-colors"
                    >
                        <FaPlus /> New Trade
                    </button>
                </div>
            </header>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-between">
                    <div>
                        <p className="text-muted text-xs uppercase font-bold tracking-wider">Net Worth</p>
                        <p className="text-2xl font-mono font-bold text-primary">{formatNumber(netWorth)}</p>
                    </div>
                    <div className="text-gold opacity-20 text-4xl"><FaCoins /></div>
                </div>
                <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-between">
                    <div>
                        <p className="text-muted text-xs uppercase font-bold tracking-wider">Cash Stack</p>
                        <p className="text-2xl font-mono text-secondary">{formatNumber(cash)}</p>
                    </div>
                    <div className="text-green opacity-20 text-4xl"><FaWallet /></div>
                </div>
                <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-between">
                    <div>
                        <p className="text-muted text-xs uppercase font-bold tracking-wider">Active Flips</p>
                        <p className="text-2xl font-mono text-blue-400">{holdingsList.length}</p>
                    </div>
                    <div className="text-blue-400 opacity-20 text-4xl"><FaArrowTrendUp /></div>
                </div>
            </div>

            {/* Holdings Table */}
            <Card title="Current Holdings" className="min-h-[400px]">
                {holdingsList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-muted">
                        <p>No active holdings.</p>
                        <button
                            onClick={() => { setTxType('buy'); setIsAddOpen(true); }}
                            className="mt-2 text-gold hover:underline text-sm"
                        >
                            Record your first flip
                        </button>
                    </div>
                ) : (
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-muted uppercase bg-zinc-900/50 sticky top-0">
                            <tr>
                                <th className="px-6 py-3 font-medium">Item</th>
                                <th className="px-6 py-3 font-medium text-right">Qty</th>
                                <th className="px-6 py-3 font-medium text-right">Avg Cost</th>
                                <th className="px-6 py-3 font-medium text-right">Current Price</th>
                                <th className="px-6 py-3 font-medium text-right">Value</th>
                                <th className="px-6 py-3 font-medium text-right">P/L</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                            {holdingsList.map((item) => (
                                <tr key={item.itemId} className="hover:bg-hover transition-colors">
                                    <td className="px-6 py-4 font-medium text-primary">{item.name}</td>
                                    <td className="px-6 py-4 text-secondary text-right font-mono">{formatNumber(item.quantity)}</td>
                                    <td className="px-6 py-4 text-secondary text-right font-mono">{formatNumber(item.avgBuyPrice)}</td>
                                    <td className="px-6 py-4 text-secondary text-right font-mono">{formatNumber(item.currentPrice)}</td>
                                    <td className="px-6 py-4 text-primary text-right font-mono font-bold">{formatNumber(item.value)}</td>
                                    <td className={clsx("px-6 py-4 text-right font-mono", item.profit >= 0 ? "text-green" : "text-red")}>
                                        {item.profit >= 0 ? '+' : ''}{formatNumber(item.profit)}
                                        <span className="text-xs opacity-70 ml-1">({item.profitPercent.toFixed(1)}%)</span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => {
                                                setTxType('sell');
                                                setSelectedItemId(item.itemId);
                                                // Default to all
                                                setQuantity(item.quantity.toString());
                                                // Default to current sell price
                                                setPrice(item.currentPrice.toString());
                                                setIsAddOpen(true);
                                            }}
                                            className="text-xs text-blue-400 hover:text-blue-300 mr-3"
                                        >
                                            Sell
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </Card>

            {/* Add Transaction Modal */}
            <Modal
                isOpen={isAddOpen}
                onClose={() => setIsAddOpen(false)}
                title={txType === 'buy' ? 'Add Buy Transaction' : 'Record Sale'}
            >
                <form onSubmit={handleTransaction} className="space-y-4">
                    {/* Item Select */}
                    <div>
                        <label className="block text-sm font-medium text-muted mb-1">Item ID</label>
                        {txType === 'buy' ? (
                            <input
                                type="number"
                                required
                                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-primary focus:outline-none focus:border-gold"
                                placeholder="Enter Item ID (e.g. 4151)"
                                value={selectedItemId || ''}
                                onChange={(e) => setSelectedItemId(Number(e.target.value))}
                            />
                        ) : (
                            // Currently simplified: Fixed ID when selling from list
                            <input
                                type="text"
                                disabled
                                className="w-full bg-zinc-900 border border-border rounded-lg px-3 py-2 text-muted cursor-not-allowed"
                                value={holdingsList.find(i => i.itemId === selectedItemId)?.name || selectedItemId}
                            />
                        )}
                        {txType === 'buy' && (
                            <p className="text-xs text-muted mt-1">
                                Use the Wiki/Dashboard to find IDs. (e.g. Abyssal Whip = 4151)
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-muted mb-1">Quantity</label>
                            <input
                                type="number"
                                required
                                min="1"
                                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-primary focus:outline-none focus:border-gold"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-muted mb-1">
                                {txType === 'buy' ? 'Buy Price' : 'Sell Price'}
                            </label>
                            <input
                                type="number"
                                required
                                min="1"
                                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-primary focus:outline-none focus:border-gold"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            className="w-full bg-gold hover:bg-yellow-400 text-black font-bold py-2 rounded-lg transition-colors"
                        >
                            Confirm {txType === 'buy' ? 'Purchase' : 'Sale'}
                        </button>
                    </div>
                </form>
            </Modal>

        </div>
    );
}
