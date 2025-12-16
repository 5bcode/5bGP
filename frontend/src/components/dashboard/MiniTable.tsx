import type { MarketItem } from '../../types';
import { formatNumber } from '../../utils/analysis';

// Base URL for OSRS Wiki Images
const ICON_BASE = 'https://oldschool.runescape.wiki/images/';

interface MiniTableProps {
  items: MarketItem[];
  valueLabel: string; // The header for the value column (e.g. "Margin", "Profit")
  valueKey: keyof MarketItem; // The key to display (e.g. 'margin', 'volume')
  valueFormatter?: (val: number) => string; // Optional custom formatter
  onItemClick?: (id: number) => void;
}

export function MiniTable({ items, valueLabel, valueKey, valueFormatter = formatNumber, onItemClick }: MiniTableProps) {
  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-muted italic text-sm">
        No data available
      </div>
    );
  }

  return (
    <table className="w-full text-sm">
      <thead className="sticky top-0 bg-card z-10 text-xs uppercase text-muted font-medium tracking-wider">
        <tr>
          <th className="px-5 py-3 text-left border-b border-border">Item</th>
          <th className="px-5 py-3 text-right border-b border-border">Price</th>
          <th className="px-5 py-3 text-right border-b border-border">{valueLabel}</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border/30">
        {items.map((item) => {
          // Icon Handling: replace spaces with underscores for wiki url
          const iconUrl = item.icon ? `${ICON_BASE}${item.icon.replace(/ /g, '_')}` : '';

          return (
            <tr
              key={item.id}
              className="group hover:bg-hover transition-colors cursor-pointer"
              onClick={() => onItemClick?.(item.id)}
            >
              <td className="px-5 py-3">
                <div className="flex items-center gap-3">
                  {iconUrl && (
                    <img
                      src={iconUrl}
                      alt={item.name}
                      className="w-6 h-6 object-contain"
                      loading="lazy"
                    />
                  )}
                  <span className="font-medium text-secondary group-hover:text-primary transition-colors truncate max-w-[140px]">
                    {item.name}
                  </span>
                </div>
              </td>
              <td className="px-5 py-3 text-right text-secondary tabular-nums">
                {formatNumber(item.sellPrice)}
              </td>
              <td className="px-5 py-3 text-right tabular-nums font-medium text-green">
                {typeof item[valueKey] === 'number'
                  ? valueFormatter(item[valueKey] as number)
                  : item[valueKey]}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
