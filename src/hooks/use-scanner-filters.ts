import { useState, useEffect, useCallback, useMemo } from 'react';

const STORAGE_KEY_FILTERS = 'flipto5b-scanner-filters';
const STORAGE_KEY_PRESETS = 'flipto5b-scanner-presets';

export type FilterOperator = 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq' | 'contains';

export interface FilterCondition {
    id: string;
    column: string;
    operator: FilterOperator;
    value: number | string;
}

export interface FilterPreset {
    id: string;
    name: string;
    description?: string;
    conditions: FilterCondition[];
    sortColumn?: string;
    sortDirection?: 'asc' | 'desc';
}

// Operator labels for display
export const OPERATOR_LABELS: Record<FilterOperator, string> = {
    gt: '>',
    gte: '>=',
    lt: '<',
    lte: '<=',
    eq: '=',
    neq: '≠',
    contains: 'contains',
};

// Default preset samples
const DEFAULT_PRESETS: FilterPreset[] = [
    {
        id: 'preset_basic_flip',
        name: 'Basic flip (< 10 min)',
        description: 'Price × Volume 24h: >= 500,000,000, Last Buy: <= 600s, Last Sell: <= 600s, Limit Profit: >= 200,000',
        conditions: [
            { id: 'c1', column: 'priceVolume24h', operator: 'gte', value: 500_000_000 },
            { id: 'c2', column: 'limitProfit', operator: 'gte', value: 200_000 },
        ],
        sortColumn: 'roi',
        sortDirection: 'desc',
    },
    {
        id: 'preset_dump_recovery',
        name: 'Dump & Recovery',
        description: 'Margin (with tax): >= 10,000, Volume 24h: >= 100',
        conditions: [
            { id: 'c1', column: 'margin', operator: 'gte', value: 10_000 },
            { id: 'c2', column: 'volume24h', operator: 'gte', value: 100 },
        ],
        sortColumn: 'margin',
        sortDirection: 'desc',
    },
    {
        id: 'preset_high_velocity',
        name: 'High-Velocity / Competitive Flips (Sort Limit)',
        description: 'High volume items sorted by limit',
        conditions: [
            { id: 'c1', column: 'volume24h', operator: 'gte', value: 1000 },
        ],
        sortColumn: 'limit',
        sortDirection: 'asc',
    },
];

// Generate unique ID
const generateId = () => `filter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export function useScannerFilters() {
    // Active filter conditions
    const [conditions, setConditions] = useState<FilterCondition[]>(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY_FILTERS);
            if (stored) return JSON.parse(stored);
        } catch (e) {
            console.warn('Failed to parse scanner filters:', e);
        }
        return [];
    });

    // Saved presets
    const [presets, setPresets] = useState<FilterPreset[]>(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY_PRESETS);
            if (stored) {
                const parsed = JSON.parse(stored);
                // Merge with defaults (defaults always available)
                const customPresets = parsed.filter((p: FilterPreset) => !p.id.startsWith('preset_'));
                return [...DEFAULT_PRESETS, ...customPresets];
            }
        } catch (e) {
            console.warn('Failed to parse scanner presets:', e);
        }
        return DEFAULT_PRESETS;
    });

    // Persist filters
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY_FILTERS, JSON.stringify(conditions));
        } catch (e) {
            console.warn('Failed to save scanner filters:', e);
        }
    }, [conditions]);

    // Persist presets (only custom ones)
    useEffect(() => {
        try {
            const customPresets = presets.filter(p => !p.id.startsWith('preset_'));
            localStorage.setItem(STORAGE_KEY_PRESETS, JSON.stringify(customPresets));
        } catch (e) {
            console.warn('Failed to save scanner presets:', e);
        }
    }, [presets]);

    // Add a new condition
    const addCondition = useCallback((column: string, operator: FilterOperator = 'gte', value: number | string = 0) => {
        const newCondition: FilterCondition = {
            id: generateId(),
            column,
            operator,
            value,
        };
        setConditions(prev => [...prev, newCondition]);
    }, []);

    // Update a condition
    const updateCondition = useCallback((id: string, updates: Partial<Omit<FilterCondition, 'id'>>) => {
        setConditions(prev => prev.map(c =>
            c.id === id ? { ...c, ...updates } : c
        ));
    }, []);

    // Remove a condition
    const removeCondition = useCallback((id: string) => {
        setConditions(prev => prev.filter(c => c.id !== id));
    }, []);

    // Clear all conditions
    const clearConditions = useCallback(() => {
        setConditions([]);
    }, []);

    // Load a preset
    const loadPreset = useCallback((preset: FilterPreset) => {
        setConditions(preset.conditions.map(c => ({ ...c, id: generateId() })));
    }, []);

    // Save current conditions as preset
    const saveAsPreset = useCallback((name: string, description?: string) => {
        const newPreset: FilterPreset = {
            id: `custom_${generateId()}`,
            name,
            description,
            conditions: conditions.map(c => ({ ...c })),
        };
        setPresets(prev => [...prev, newPreset]);
        return newPreset;
    }, [conditions]);

    // Delete a preset
    const deletePreset = useCallback((presetId: string) => {
        // Don't allow deleting default presets
        if (presetId.startsWith('preset_')) return;
        setPresets(prev => prev.filter(p => p.id !== presetId));
    }, []);

    // Check if a row passes all conditions
    const filterRow = useCallback((getValue: (column: string) => number | string | null) => {
        return conditions.every(condition => {
            const value = getValue(condition.column);
            if (value === null) return false;

            const conditionValue = condition.value;

            switch (condition.operator) {
                case 'gt':
                    return typeof value === 'number' && value > (conditionValue as number);
                case 'gte':
                    return typeof value === 'number' && value >= (conditionValue as number);
                case 'lt':
                    return typeof value === 'number' && value < (conditionValue as number);
                case 'lte':
                    return typeof value === 'number' && value <= (conditionValue as number);
                case 'eq':
                    return value === conditionValue;
                case 'neq':
                    return value !== conditionValue;
                case 'contains':
                    return String(value).toLowerCase().includes(String(conditionValue).toLowerCase());
                default:
                    return true;
            }
        });
    }, [conditions]);

    // Active filter count
    const activeFilterCount = useMemo(() => conditions.length, [conditions]);

    return {
        conditions,
        presets,
        addCondition,
        updateCondition,
        removeCondition,
        clearConditions,
        loadPreset,
        saveAsPreset,
        deletePreset,
        filterRow,
        activeFilterCount,
    };
}
