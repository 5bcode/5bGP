import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useMarketData } from '../hooks/useMarketData';
import { formatNumber } from '../utils/analysis';
import { FaSort, FaSortUp, FaSortDown, FaMagnifyingGlass } from 'react-icons/fa6';
import clsx from 'clsx';
// Removed unused MarketItem import

const ITEMS_PER_PAGE = 50;

type SortField = 'name' | 'buyPrice' | 'sellPrice' | 'margin' | 'roi' | 'volume' | 'score' | 'potentialProfit';
type SortDirection = 'asc' | 'desc';

export function Screener() {
    const { items, isLoading } = useMarketData();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Filters State
    const [search, setSearch] = useState('');
    const [minMargin, setMinMargin] = useState<string>('');
    const [minROI, setMinROI] = useState<string>('');
    const [minVolume] = useState<string>(''); // Currently read-only unused setter removed
    const [onlyF2P, setOnlyF2P] = useState(false);


    // Sorting State
    const [sortField, setSortField] = useState<SortField>('margin');
    const [sortDir, setSortDir] = useState<SortDirection>('desc');

    // Pagination
    const [page, setPage] = useState(1);

    // Sync URL params to state on mount
    useEffect(() => {
        const sortParam = searchParams.get('sort') as SortField;
        if (sortParam) {
            setSortField(sortParam);
            setSortDir('desc');
        }

        const preset = searchParams.get('preset');
        if (preset === 'alch') {
            // Preset logic could go here, for now just sort by potential or margin
            // Realistically we need an "Alch Mode" toggle or similar.
        }
    }, [searchParams]);

    // Computed Data
    const filteredAndSortedItems = useMemo(() => {
        let result = items;

        // 1. Filter
        if (search) {
            const q = search.toLowerCase();
            result = result.filter(i => i.name.toLowerCase().includes(q));
        }
        if (minMargin) {
            result = result.filter(i => i.margin >= Number(minMargin));
        }
        if (minROI) {
            result = result.filter(i => i.roi >= Number(minROI));
        }
        if (minVolume) {
            // Volume is currently 0 in our mock/latest data, so this might hide everything if used > 0
            // result = result.filter(i => i.volume >= Number(minVolume));
        }
        if (onlyF2P) {
            result = result.filter(i => !i.members);
        }

        // 2. Sort
        result = [...result].sort((a, b) => {
            const valA = a[sortField] || 0;
            const valB = b[sortField] || 0;

            if (valA < valB) return sortDir === 'asc' ? -1 : 1;
            if (valA > valB) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });

        return result;
    }, [items, search, minMargin, minROI, minVolume, onlyF2P, sortField, sortDir]);

    // Pagination Logic
    const totalPages = Math.ceil(filteredAndSortedItems.length / ITEMS_PER_PAGE);
    const paginatedItems = filteredAndSortedItems.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDir('desc');
        }
    };

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) return <FaSort className="opacity-20" />;
        return sortDir === 'asc' ? <FaSortUp className="text-gold" /> : <FaSortDown className="text-gold" />;
    };

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto animate-in fade-in">
            <header>
                <h1 className="text-2xl font-bold mb-2">Market Screener</h1>
                <p className="text-secondary text-sm">Filter and sort the entire OSRS market to find the best flips.</p>
            </header>

            {/* Filters Bar */}
            <div className="bg-card border border-border rounded-xl p-4 flex flex-col xl:flex-row gap-4 xl:items-end">
                <div className="flex-1 space-y-1">
                    <label className="text-xs font-bold text-muted uppercase tracking-wider">Search</label>
                    <div className="relative">
                        <FaMagnifyingGlass className="absolute left-3 top-3 text-muted" />
                        <input
                            type="text"
                            className="w-full bg-background border border-border rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-gold transition-colors"
                            placeholder="Search items..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        />
                    </div>
                </div>

                <div className="w-32 space-y-1">
                    <label className="text-xs font-bold text-muted uppercase tracking-wider">Min Margin</label>
                    <input
                        type="number"
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold transition-colors"
                        placeholder="0"
                        value={minMargin}
                        onChange={(e) => setMinMargin(e.target.value)}
                    />
                </div>

                <div className="w-32 space-y-1">
                    <label className="text-xs font-bold text-muted uppercase tracking-wider">Min ROI %</label>
                    <input
                        type="number"
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold transition-colors"
                        placeholder="0"
                        value={minROI}
                        onChange={(e) => setMinROI(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-2 pb-2">
                    <input
                        type="checkbox"
                        id="f2p"
                        className="w-4 h-4 rounded border-border bg-background text-gold focus:ring-gold"
                        checked={onlyF2P}
                        onChange={(e) => setOnlyF2P(e.target.checked)}
                    />
                    <label htmlFor="f2p" className="text-sm font-medium cursor-pointer select-none">F2P Only</label>
                </div>

                <div className="xl:ml-auto pb-0.5 text-sm text-muted">
                    Showing <span className="text-primary font-bold">{filteredAndSortedItems.length}</span> items
                </div>
            </div>

            {/* Table */}
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left whitespace-nowrap">
                        <thead className="bg-zinc-900/50 text-xs text-muted uppercase border-b border-border">
                            <tr>
                                <th className="px-6 py-4 font-medium cursor-pointer hover:text-primary" onClick={() => handleSort('name')}>
                                    <div className="flex items-center gap-1">Item <SortIcon field="name" /></div>
                                </th>
                                <th className="px-6 py-4 font-medium text-right cursor-pointer hover:text-primary" onClick={() => handleSort('buyPrice')}>
                                    <div className="flex items-center justify-end gap-1">Buy Price <SortIcon field="buyPrice" /></div>
                                </th>
                                <th className="px-6 py-4 font-medium text-right cursor-pointer hover:text-primary" onClick={() => handleSort('sellPrice')}>
                                    <div className="flex items-center justify-end gap-1">Sell Price <SortIcon field="sellPrice" /></div>
                                </th>
                                <th className="px-6 py-4 font-medium text-right cursor-pointer hover:text-primary" onClick={() => handleSort('margin')}>
                                    <div className="flex items-center justify-end gap-1">Margin <SortIcon field="margin" /></div>
                                </th>
                                <th className="px-6 py-4 font-medium text-right cursor-pointer hover:text-primary" onClick={() => handleSort('roi')}>
                                    <div className="flex items-center justify-end gap-1">ROI <SortIcon field="roi" /></div>
                                </th>
                                <th className="px-6 py-4 font-medium text-right cursor-pointer hover:text-primary" onClick={() => handleSort('potentialProfit')}>
                                    <div className="flex items-center justify-end gap-1">Potential <SortIcon field="potentialProfit" /></div>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                            {isLoading ? (
                                <tr><td colSpan={6} className="p-8 text-center text-muted">Loading market data...</td></tr>
                            ) : paginatedItems.length === 0 ? (
                                <tr><td colSpan={6} className="p-8 text-center text-muted">No items match your filters.</td></tr>
                            ) : (
                                paginatedItems.map((item) => (
                                    <tr
                                        key={item.id}
                                        onClick={() => navigate(`/item/${item.id}`)}
                                        className="hover:bg-hover transition-colors cursor-pointer"
                                    >
                                        <td className="px-6 py-3 font-medium text-primary flex items-center gap-3">
                                            {item.icon && (
                                                <img
                                                    src={`https://oldschool.runescape.wiki/images/${item.icon.replace(/ /g, '_')}`}
                                                    className="w-6 h-6 object-contain"
                                                    alt=""
                                                />
                                            )}
                                            {item.name}
                                            {item.members && <span className="text-[10px] bg-[#3B3012] text-[#FFD700] px-1.5 py-0.5 rounded ml-2 border border-[#FFD700]/20">MEM</span>}
                                        </td>
                                        <td className="px-6 py-3 text-secondary text-right font-mono">{formatNumber(item.buyPrice)}</td>
                                        <td className="px-6 py-3 text-secondary text-right font-mono">{formatNumber(item.sellPrice)}</td>
                                        <td className={clsx("px-6 py-3 text-right font-mono font-bold", item.margin > 0 ? "text-green" : "text-red")}>
                                            {formatNumber(item.margin)}
                                        </td>
                                        <td className={clsx("px-6 py-3 text-right font-mono", item.roi > 5 ? "text-green" : "text-secondary")}>
                                            {item.roi.toFixed(2)}%
                                        </td>
                                        <td className="px-6 py-3 text-secondary text-right font-mono">{formatNumber(item.potentialProfit)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-zinc-900/50">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="text-sm font-medium text-muted hover:text-primary disabled:opacity-50 transition-colors"
                    >
                        Previous
                    </button>
                    <span className="text-xs text-muted">Page {page} of {totalPages}</span>
                    <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="text-sm font-medium text-muted hover:text-primary disabled:opacity-50 transition-colors"
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
}
