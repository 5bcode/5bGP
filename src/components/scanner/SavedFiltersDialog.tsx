import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bookmark, Save, Trash2 } from 'lucide-react';
import { FilterPreset } from '@/hooks/use-scanner-filters';
import { cn } from '@/lib/utils';

interface SavedFiltersDialogProps {
    presets: FilterPreset[];
    hasActiveFilters: boolean;
    onLoadPreset: (preset: FilterPreset) => void;
    onSavePreset: (name: string, description?: string) => void;
    onDeletePreset: (presetId: string) => void;
}

const SavedFiltersDialog = ({
    presets,
    hasActiveFilters,
    onLoadPreset,
    onSavePreset,
    onDeletePreset,
}: SavedFiltersDialogProps) => {
    const [open, setOpen] = useState(false);
    const [showSaveForm, setShowSaveForm] = useState(false);
    const [newName, setNewName] = useState('');
    const [newDescription, setNewDescription] = useState('');

    const handleSave = () => {
        if (!newName.trim()) return;
        onSavePreset(newName.trim(), newDescription.trim() || undefined);
        setNewName('');
        setNewDescription('');
        setShowSaveForm(false);
    };

    const handleLoad = (preset: FilterPreset) => {
        onLoadPreset(preset);
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 bg-slate-900 border-slate-700 hover:bg-slate-800 text-slate-300"
                >
                    <Bookmark size={14} />
                    Saved Filters
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-700 text-slate-100 max-w-lg">
                <DialogHeader>
                    <DialogTitle className="text-lg font-semibold">Saved Filters</DialogTitle>
                    <p className="text-sm text-slate-400 mt-1">
                        Load a saved filter or save your current filter configuration.
                    </p>
                </DialogHeader>

                {/* Preset List */}
                <div className="mt-4 space-y-2">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Load Saved Filter
                    </h4>

                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                        {presets.map((preset) => {
                            const isDefault = preset.id.startsWith('preset_');
                            return (
                                <button
                                    key={preset.id}
                                    onClick={() => handleLoad(preset)}
                                    className={cn(
                                        "w-full text-left p-3 rounded-lg border transition-all",
                                        "bg-slate-800/50 border-slate-700/50",
                                        "hover:bg-slate-800 hover:border-slate-600",
                                        "focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                    )}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-slate-200 truncate">
                                                {preset.name}
                                            </p>
                                            {preset.description && (
                                                <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                                                    {preset.description}
                                                </p>
                                            )}
                                        </div>
                                        {!isDefault && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onDeletePreset(preset.id);
                                                }}
                                                className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                                                title="Delete preset"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                </button>
                            );
                        })}

                        {presets.length === 0 && (
                            <div className="text-center text-slate-500 py-6">
                                No saved filters yet.
                            </div>
                        )}
                    </div>
                </div>

                {/* Save Current Filters */}
                <div className="pt-4 border-t border-slate-800 space-y-3">
                    {showSaveForm ? (
                        <div className="space-y-3">
                            <Input
                                placeholder="Filter name"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                className="bg-slate-800 border-slate-700 text-slate-200"
                            />
                            <Input
                                placeholder="Description (optional)"
                                value={newDescription}
                                onChange={(e) => setNewDescription(e.target.value)}
                                className="bg-slate-800 border-slate-700 text-slate-200"
                            />
                            <div className="flex gap-2">
                                <Button
                                    onClick={handleSave}
                                    disabled={!newName.trim()}
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                                >
                                    Save
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => setShowSaveForm(false)}
                                    className="border-slate-700 hover:bg-slate-800"
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <Button
                            variant="outline"
                            onClick={() => setShowSaveForm(true)}
                            disabled={!hasActiveFilters}
                            className="w-full gap-2 bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300 disabled:opacity-50"
                        >
                            <Save size={14} />
                            Save Current Filters
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default SavedFiltersDialog;
