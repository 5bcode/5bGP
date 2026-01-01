import React from 'react';
import { PriceData, Stats24h, Item } from '@/services/osrs-api';
import { formatGP } from '@/lib/osrs-math';
import { ExternalLink, Crown, Clock } from 'lucide-react';

interface MoreInfoPanelProps {
    price: PriceData;
    stats?: Stats24h;
    item?: Item;
}

// Format relative time (e.g., "4 minutes ago")
const formatTimeAgo = (timestamp: number): string => {
    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;

    if (diff < 60) return `${diff} seconds ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return `${Math.floor(diff / 86400)} days ago`;
};

interface InfoRowProps {
    label: string;
    value: React.ReactNode;
    color?: 'default' | 'green' | 'blue' | 'amber';
}

const InfoRow = ({ label, value, color = 'default' }: InfoRowProps) => {
    const colorClasses = {
        default: 'text-slate-100',
        green: 'text-emerald-400',
        blue: 'text-blue-400',
        amber: 'text-amber-400',
    };

    return (
        <div className="flex justify-between items-center py-2">
            <span className="text-[11px] text-slate-500 uppercase tracking-wider font-medium">
                {label}
            </span>
            <span className={`text-sm font-mono font-medium ${colorClasses[color]}`}>
                {value}
            </span>
        </div>
    );
};

const MoreInfoPanel = ({ price, stats, item }: MoreInfoPanelProps) => {
    const limit = item?.limit || 1;
    const costPerLimit = price.low * limit;
    const volume = stats ? stats.highPriceVolume + stats.lowPriceVolume : 0;
    const volumePerLimit = volume / limit;

    // Generate wiki URL from item name
    const wikiUrl = item
        ? `https://oldschool.runescape.wiki/w/${encodeURIComponent(item.name.replace(/ /g, '_'))}`
        : null;

    return (
        <div className="bg-slate-950/50 rounded-xl p-5 border border-slate-800/50">
            <h3 className="text-lg font-semibold text-slate-100 mb-3">More info</h3>

            <div className="grid grid-cols-2 gap-x-8 divide-x divide-slate-800/50">
                {/* Left Column */}
                <div className="space-y-1 pr-4">
                    <InfoRow
                        label="Cost per limit"
                        value={formatGP(costPerLimit)}
                    />
                    <InfoRow
                        label="Volume/Limit"
                        value={volumePerLimit.toFixed(1)}
                    />
                    <InfoRow
                        label="Members item"
                        value={
                            item?.members ? (
                                <span className="flex items-center gap-1 text-amber-400">
                                    <Crown size={12} /> Yes
                                </span>
                            ) : (
                                'No'
                            )
                        }
                        color={item?.members ? 'amber' : 'default'}
                    />
                </div>

                {/* Right Column */}
                <div className="space-y-1 pl-4">
                    <InfoRow
                        label="Last traded buy"
                        value={
                            <span className="flex items-center gap-1 text-emerald-400">
                                <Clock size={10} />
                                {formatTimeAgo(price.lowTime)}
                            </span>
                        }
                        color="green"
                    />
                    <InfoRow
                        label="Last traded sell"
                        value={
                            <span className="flex items-center gap-1 text-blue-400">
                                <Clock size={10} />
                                {formatTimeAgo(price.highTime)}
                            </span>
                        }
                        color="blue"
                    />
                    {wikiUrl && (
                        <InfoRow
                            label="OSRS wiki"
                            value={
                                <a
                                    href={wikiUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
                                >
                                    {item?.name} <ExternalLink size={10} />
                                </a>
                            }
                            color="blue"
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default MoreInfoPanel;
