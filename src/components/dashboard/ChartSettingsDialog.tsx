import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Settings2, X, RotateCcw } from 'lucide-react';
import { ChartSettings } from '@/hooks/use-chart-settings';

interface ChartSettingsDialogProps {
    settings: ChartSettings;
    onUpdateSettings: (updates: Partial<ChartSettings>) => void;
    onResetSettings: () => void;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const SettingRow = ({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) => (
    <div className="flex items-center justify-between py-3 border-b border-slate-800/50 last:border-b-0">
        <span className="text-sm text-slate-300">{label}</span>
        {children}
    </div>
);

const ChartSettingsDialog = ({
    settings,
    onUpdateSettings,
    onResetSettings,
    open,
    onOpenChange,
}: ChartSettingsDialogProps) => {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-slate-400 hover:text-white hover:bg-slate-800"
                    title="Chart Settings"
                >
                    <Settings2 size={14} />
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-md">
                <DialogHeader className="flex flex-row items-center justify-between pb-4 border-b border-slate-800">
                    <DialogTitle className="text-lg font-semibold text-slate-100">
                        Chart settings
                    </DialogTitle>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onOpenChange(false)}
                        className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full"
                    >
                        <X size={16} />
                    </Button>
                </DialogHeader>

                <div className="space-y-1 py-2">
                    <SettingRow label="Show chart lines">
                        <Switch
                            checked={settings.showChartLines}
                            onCheckedChange={(checked) =>
                                onUpdateSettings({ showChartLines: checked })
                            }
                            className="data-[state=checked]:bg-emerald-500"
                        />
                    </SettingRow>

                    <SettingRow label="Show point markers">
                        <Switch
                            checked={settings.showPointMarkers}
                            onCheckedChange={(checked) =>
                                onUpdateSettings({ showPointMarkers: checked })
                            }
                            className="data-[state=checked]:bg-emerald-500"
                        />
                    </SettingRow>

                    <SettingRow label="Scroll">
                        <Switch
                            checked={settings.scrollEnabled}
                            onCheckedChange={(checked) =>
                                onUpdateSettings({ scrollEnabled: checked })
                            }
                            className="data-[state=checked]:bg-emerald-500"
                        />
                    </SettingRow>

                    <SettingRow label="Scale">
                        <Switch
                            checked={settings.scaleEnabled}
                            onCheckedChange={(checked) =>
                                onUpdateSettings({ scaleEnabled: checked })
                            }
                            className="data-[state=checked]:bg-emerald-500"
                        />
                    </SettingRow>

                    <SettingRow label="Price rounding">
                        <Switch
                            checked={settings.priceRounding}
                            onCheckedChange={(checked) =>
                                onUpdateSettings({ priceRounding: checked })
                            }
                            className="data-[state=checked]:bg-emerald-500"
                        />
                    </SettingRow>

                    <SettingRow label="Recent price line">
                        <Switch
                            checked={settings.showRecentPriceLine}
                            onCheckedChange={(checked) =>
                                onUpdateSettings({ showRecentPriceLine: checked })
                            }
                            className="data-[state=checked]:bg-emerald-500"
                        />
                    </SettingRow>

                    <SettingRow label="Pulse recent price">
                        <Switch
                            checked={settings.pulseRecentPrice}
                            onCheckedChange={(checked) =>
                                onUpdateSettings({ pulseRecentPrice: checked })
                            }
                            className="data-[state=checked]:bg-emerald-500"
                        />
                    </SettingRow>

                    <SettingRow label="Line type">
                        <Select
                            value={settings.lineType}
                            onValueChange={(value: 'default' | 'stepped' | 'curved') =>
                                onUpdateSettings({ lineType: value })
                            }
                        >
                            <SelectTrigger className="w-[120px] h-8 bg-slate-800 border-slate-700 text-slate-200 text-sm">
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-700">
                                <SelectItem value="default" className="text-slate-200 focus:bg-slate-700 focus:text-white">
                                    Default
                                </SelectItem>
                                <SelectItem value="stepped" className="text-slate-200 focus:bg-slate-700 focus:text-white">
                                    Stepped
                                </SelectItem>
                                <SelectItem value="curved" className="text-slate-200 focus:bg-slate-700 focus:text-white">
                                    Curved
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </SettingRow>
                </div>

                <Button
                    variant="outline"
                    onClick={onResetSettings}
                    className="w-full mt-4 bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
                >
                    <RotateCcw size={14} className="mr-2" />
                    Reset settings
                </Button>
            </DialogContent>
        </Dialog>
    );
};

export default ChartSettingsDialog;
