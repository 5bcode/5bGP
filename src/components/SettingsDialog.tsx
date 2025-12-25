import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Settings } from 'lucide-react';
import { toast } from 'sonner';

export interface AppSettings {
  alertThreshold: number; // Percentage, e.g. 10 for 10%
  refreshInterval: number; // Seconds
  soundEnabled: boolean;
}

interface SettingsDialogProps {
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
}

const SettingsDialog = ({ settings, onSave }: SettingsDialogProps) => {
  const [open, setOpen] = React.useState(false);
  const [threshold, setThreshold] = React.useState(settings.alertThreshold.toString());
  const [interval, setInterval] = React.useState(settings.refreshInterval.toString());
  const [sound, setSound] = React.useState(settings.soundEnabled ?? true);

  const handleSave = () => {
    const newThreshold = parseFloat(threshold);
    const newInterval = parseInt(interval);

    if (isNaN(newThreshold) || newThreshold <= 0 || newThreshold > 100) {
      toast.error("Invalid threshold. Must be between 0 and 100.");
      return;
    }

    if (isNaN(newInterval) || newInterval < 10) {
      toast.error("Interval must be at least 10 seconds.");
      return;
    }

    onSave({
      alertThreshold: newThreshold,
      refreshInterval: newInterval,
      soundEnabled: sound
    });
    setOpen(false);
    toast.success("Settings saved");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-100">
          <Settings className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-slate-900 border-slate-800 text-slate-100">
        <DialogHeader>
          <DialogTitle>Terminal Settings</DialogTitle>
          <DialogDescription className="text-slate-400">
            Configure the market scanner parameters.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label>Panic Wick Threshold (%)</Label>
            <div className="flex items-center gap-4">
                <Input 
                    type="number" 
                    value={threshold} 
                    onChange={(e) => setThreshold(e.target.value)}
                    className="bg-slate-950 border-slate-800"
                />
                <span className="text-xs text-slate-500 w-32">
                    Drop from 24h avg to trigger alert.
                </span>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Refresh Rate (Seconds)</Label>
             <div className="flex items-center gap-4">
                <Input 
                    type="number" 
                    value={interval} 
                    onChange={(e) => setInterval(e.target.value)}
                    className="bg-slate-950 border-slate-800"
                />
                <span className="text-xs text-slate-500 w-32">
                    How often to fetch new prices.
                </span>
            </div>
          </div>

          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-1">
                <Label htmlFor="sound-mode">Audio Alerts</Label>
                <p className="text-xs text-slate-500">Play a sound when a panic wick is detected.</p>
            </div>
            <Switch id="sound-mode" checked={sound} onCheckedChange={setSound} />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700">
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;