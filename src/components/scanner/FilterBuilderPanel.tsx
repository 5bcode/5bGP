import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Plus, X, Filter } from 'lucide-react';
import { FilterCondition, FilterOperator, OPERATOR_LABELS } from '@/hooks/use-scanner-filters';
import { ALL_COLUMNS, ColumnDef } from '@/hooks/use-scanner-columns';

interface FilterBuilderPanelProps {
    conditions: FilterCondition[];
    onAddCondition: (column: string, operator?: FilterOperator, value?: number | string) => void;
    onUpdateCondition: (id: string, updates: Partial<Omit<FilterCondition, 'id'>>) => void;
    onRemoveCondition: (id: string) => void;
    onClearConditions: () => void;
}

// Columns that support filtering (numeric and text)
const FILTERABLE_COLUMNS = ALL_COLUMNS.filter(col =>
    col.id !== 'item' && !col.id.startsWith('sparkline')
);

const FilterBuilderPanel = ({
    conditions,
    onAddCondition,
    onUpdateCondition,
    onRemoveCondition,
    onClearConditions,
}: FilterBuilderPanelProps) => {
    const [open, setOpen] = React.useState(false);

    const getColumnLabel = (columnId: string): string => {
        return ALL_COLUMNS.find(c => c.id === columnId)?.label || columnId;
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className={`gap-2 bg-slate-900 border-slate-700 hover:bg-slate-800 text-slate-300 ${conditions.length > 0 ? 'border-emerald-600/50 text-emerald-400' : ''
                        }`}
                >
                    <Plus size={14} />
                    Add filter
                    {conditions.length > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-emerald-600/20 text-emerald-400 rounded">
                            {conditions.length}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent
                align="start"
                className="w-[400px] bg-slate-900 border-slate-700 text-slate-100 p-4"
            >
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-slate-200">Active Filters</h4>
                        {conditions.length > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onClearConditions}
                                className="h-7 text-xs text-slate-500 hover:text-rose-400"
                            >
                                Clear all
                            </Button>
                        )}
                    </div>

                    {/* Active Conditions */}
                    <div className="space-y-2 max-h-[250px] overflow-y-auto">
                        {conditions.map((condition) => (
                            <div
                                key={condition.id}
                                className="flex items-center gap-2 p-2 bg-slate-800/50 rounded-lg border border-slate-700/50"
                            >
                                {/* Column */}
                                <Select
                                    value={condition.column}
                                    onValueChange={(value) => onUpdateCondition(condition.id, { column: value })}
                                >
                                    <SelectTrigger className="w-[140px] h-8 text-xs bg-slate-800 border-slate-600">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-700 max-h-[200px]">
                                        {FILTERABLE_COLUMNS.map((col) => (
                                            <SelectItem key={col.id} value={col.id} className="text-xs">
                                                {col.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {/* Operator */}
                                <Select
                                    value={condition.operator}
                                    onValueChange={(value) => onUpdateCondition(condition.id, { operator: value as FilterOperator })}
                                >
                                    <SelectTrigger className="w-[70px] h-8 text-xs bg-slate-800 border-slate-600">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-700">
                                        {(Object.keys(OPERATOR_LABELS) as FilterOperator[]).map((op) => (
                                            <SelectItem key={op} value={op} className="text-xs">
                                                {OPERATOR_LABELS[op]}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {/* Value */}
                                <Input
                                    type={typeof condition.value === 'number' ? 'number' : 'text'}
                                    value={condition.value}
                                    onChange={(e) => {
                                        const val = e.target.type === 'number'
                                            ? parseFloat(e.target.value) || 0
                                            : e.target.value;
                                        onUpdateCondition(condition.id, { value: val });
                                    }}
                                    className="flex-1 h-8 text-xs bg-slate-800 border-slate-600"
                                />

                                {/* Remove */}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => onRemoveCondition(condition.id)}
                                    className="h-8 w-8 text-slate-500 hover:text-rose-400"
                                >
                                    <X size={14} />
                                </Button>
                            </div>
                        ))}

                        {conditions.length === 0 && (
                            <div className="text-center text-slate-500 py-4 text-sm">
                                No filters applied. All items shown.
                            </div>
                        )}
                    </div>

                    {/* Add New Filter */}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onAddCondition('margin', 'gte', 0)}
                        className="w-full gap-2 bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300"
                    >
                        <Plus size={14} />
                        Add condition
                    </Button>

                    {conditions.length > 0 && (
                        <p className="text-[10px] text-slate-500 text-center">
                            Showing items that match <span className="text-slate-400">ALL</span> conditions
                        </p>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
};

export default FilterBuilderPanel;
