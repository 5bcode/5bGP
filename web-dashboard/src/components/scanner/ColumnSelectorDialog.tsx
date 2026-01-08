import React, { useState, useMemo } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Columns3, RotateCcw, Search } from 'lucide-react';
import {
    ALL_COLUMNS,
    CATEGORY_LABELS,
    ColumnCategory,
    ColumnDef
} from '@/hooks/use-scanner-columns';

interface ColumnSelectorDialogProps {
    visibleColumns: string[];
    columnsByCategory: Record<ColumnCategory, ColumnDef[]>;
    onToggleColumn: (columnId: string) => void;
    onReset: () => void;
    isColumnVisible: (columnId: string) => boolean;
}

const ColumnSelectorDialog = ({
    visibleColumns,
    columnsByCategory,
    onToggleColumn,
    onReset,
    isColumnVisible,
}: ColumnSelectorDialogProps) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');

    // Filter columns by search
    const filteredCategories = useMemo(() => {
        if (!search.trim()) return columnsByCategory;

        const filtered: Record<ColumnCategory, ColumnDef[]> = {
            core: [],
            limit: [],
            alchemy: [],
            timestamps: [],
            volume: [],
            trends: [],
            volTrends: [],
            ratios: [],
            sparklines: [],
        };

        Object.entries(columnsByCategory).forEach(([cat, cols]) => {
            const matching = cols.filter(col =>
                col.label.toLowerCase().includes(search.toLowerCase())
            );
            if (matching.length > 0) {
                filtered[cat as ColumnCategory] = matching;
            }
        });

        return filtered;
    }, [columnsByCategory, search]);

    // Categories to render (those with columns)
    const categoriesToRender = useMemo(() => {
        return (Object.entries(filteredCategories) as [ColumnCategory, ColumnDef[]][])
            .filter(([_, cols]) => cols.length > 0);
    }, [filteredCategories]);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 bg-slate-900 border-slate-700 hover:bg-slate-800 text-slate-300"
                >
                    <Columns3 size={14} />
                    Columns
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-700 text-slate-100 max-w-md max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader className="pb-0">
                    <DialogTitle className="text-lg font-semibold">Columns</DialogTitle>
                </DialogHeader>

                {/* Search */}
                <div className="relative mt-2">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <Input
                        placeholder="Search columns..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-500"
                    />
                </div>

                {/* Column List */}
                <div className="flex-1 overflow-y-auto mt-4 space-y-4 pr-2">
                    {categoriesToRender.map(([category, columns]) => (
                        <div key={category}>
                            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                                {CATEGORY_LABELS[category]}
                            </h4>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                                {columns.map((col) => (
                                    <label
                                        key={col.id}
                                        className="flex items-center gap-2 cursor-pointer text-sm text-slate-300 hover:text-slate-100 transition-colors py-1"
                                    >
                                        <Checkbox
                                            checked={isColumnVisible(col.id)}
                                            onCheckedChange={() => onToggleColumn(col.id)}
                                            className="border-slate-600 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                                        />
                                        <span>{col.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    ))}

                    {categoriesToRender.length === 0 && (
                        <div className="text-center text-slate-500 py-8">
                            No columns match your search.
                        </div>
                    )}
                </div>

                {/* Reset Button */}
                <div className="pt-4 border-t border-slate-800">
                    <Button
                        variant="outline"
                        onClick={onReset}
                        className="w-full gap-2 bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300"
                    >
                        <RotateCcw size={14} />
                        Reset to Default
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ColumnSelectorDialog;
