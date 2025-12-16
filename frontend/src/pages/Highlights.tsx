import { useNavigate } from 'react-router-dom';
import { useMarketData } from '../hooks/useMarketData';
import { Card } from '../components/ui/Card';
import { MiniTable } from '../components/dashboard/MiniTable';
import { formatNumber } from '../utils/analysis';
import { FaFire, FaFlask, FaScroll, FaHammer, FaShieldHalved } from 'react-icons/fa6';
import clsx from 'clsx';

// Curated ID Lists
const INDICES = [
    13190, // Bond
    563,   // Law Rune
    561,   // Nature Rune
    12934, // Zulrah's scales
];

const POTIONS = [
    3024, // Super restore(4)
    2440, // Super strength(4)
    2436, // Super attack(4)
    2442, // Super defence(4)
    6685, // Saradomin brew(4)
    2448, // Superantipoison(4)
    2452, // Antifire potion(4)
    3040, // Magic potion(4)
    12695, // Super combat potion(4)
];

const RUNES = [
    554, // Fire rune
    555, // Water rune
    556, // Air rune
    557, // Earth rune
    558, // Mind rune
    560, // Death rune
    565, // Blood rune
    566, // Soul rune
    562, // Chaos rune
    9075, // Astral rune
];

const MATERIALS = [
    440, // Iron ore
    453, // Coal
    447, // Mithril ore
    449, // Adamantite ore
    451, // Runite ore
    1515, // Yew logs
    1513, // Magic logs
    1511, // Logs
];

const HIGH_TIER_GEAR = [
    4151, // Abyssal whip
    11832, // Bandos chestplate
    11834, // Bandos tassets
    11802, // Armadyl godsword
    12926, // Toxic blowpipe
    12924, // Toxic blowpipe (empty)
    12006, // Abyssal tentacle
    13239, // Primordial boots
    19553, // Amulet of torture
    19547, // Anguish
];

interface GroupSectionProps {
    title: string;
    icon: React.ReactNode;
    ids: number[];
}

export function Highlights() {
    const { items } = useMarketData();
    const navigate = useNavigate();

    const getItems = (ids: number[]) => {
        return ids
            .map(id => items.find(i => i.id === id))
            .filter((i): i is NonNullable<typeof i> => i !== undefined);
    };

    const GroupSection = ({ title, icon, ids }: GroupSectionProps) => {
        const groupItems = getItems(ids);
        return (
            <Card title={title} icon={icon} className="h-[400px]" action={() => { }}>
                <MiniTable
                    items={groupItems}
                    valueLabel="Margin"
                    valueKey="margin"
                    valueFormatter={(val) => `+${formatNumber(val)}`}
                    onItemClick={(id) => navigate(`/item/${id}`)}
                />
            </Card>
        );
    };

    const indices = getItems(INDICES);

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto animate-in fade-in">
            <header>
                <h1 className="text-2xl font-bold mb-2">Market Highlights</h1>
                <p className="text-secondary text-sm">Curated market groups and key economic indicators.</p>
            </header>

            {/* Indices Ticker */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {indices.map(item => (
                    <div
                        key={item.id}
                        onClick={() => navigate(`/item/${item.id}`)}
                        className="bg-card border border-border p-4 rounded-xl cursor-pointer hover:border-gold/50 transition-colors"
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <img
                                src={`https://oldschool.runescape.wiki/images/${item.icon.replace(/ /g, '_')}`}
                                className="w-6 h-6 object-contain"
                                alt=""
                            />
                            <span className="font-bold text-sm text-primary truncate">{item.name}</span>
                        </div>
                        <div className="flex justify-between items-end">
                            <span className="text-xl font-mono text-secondary">{formatNumber(item.sellPrice)}</span>
                            <span className={clsx("text-xs font-mono", item.roi > 0 ? "text-green" : "text-red")}>
                                {item.roi > 0 ? '+' : ''}{item.roi.toFixed(2)}%
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Groups Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                <GroupSection title="High Volume Runes" icon={<FaFire />} ids={RUNES} />
                <GroupSection title="Standard Potions" icon={<FaFlask />} ids={POTIONS} />
                <GroupSection title="Raw Materials" icon={<FaHammer />} ids={MATERIALS} />
                <GroupSection title="High Tier Gear" icon={<FaShieldHalved />} ids={HIGH_TIER_GEAR} />

                {/* Dynamically calculated "New Items" (highest IDs) */}
                <Card title="Newest Items" icon={<FaScroll />} className="h-[400px]">
                    <MiniTable
                        items={[...items].sort((a, b) => b.id - a.id).slice(0, 50)}
                        valueLabel="Price"
                        valueKey="sellPrice"
                        onItemClick={(id) => navigate(`/item/${id}`)}
                    />
                </Card>

                {/* Dynamically calculated "Top Tax Payers" (High price items) */}
                <Card title="Luxury Items" icon={<FaScroll />} className="h-[400px]">
                    <MiniTable
                        items={[...items].sort((a, b) => b.sellPrice - a.sellPrice).slice(0, 50)}
                        valueLabel="Price"
                        valueKey="sellPrice"
                        onItemClick={(id) => navigate(`/item/${id}`)}
                    />
                </Card>
            </div>
        </div>
    );
}
