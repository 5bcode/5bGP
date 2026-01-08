import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Settings, MessageSquare, Maximize2, Minimize2, Bell } from 'lucide-react';
import { toast } from 'sonner';
import { useSettings } from '@/context/SettingsContext';

const SettingsDialog = () => {
  const { settings, updateSettings } = useSettings();
  const [open, setOpen] = useState(false);

  // Local state for editing
  const [threshold, setThreshold] = useState(settings.alertThreshold.toString());
  const [interval, setInterval] = useState(settings.refreshInterval.toString());
  const [discordUrl, setDiscordUrl] = useState(settings.discordWebhookUrl);

  // Sync when settings change externally or on open
  useEffect(() => {
    if (open) {
      setThreshold(settings.alertThreshold.toString());
      setInterval(settings.refreshInterval.toString());
      setDiscordUrl(settings.discordWebhookUrl);
    }
  }, [open, settings]);

  const handleSave = () => {
    const newThreshold = parseFloat(threshold);
    const newInterval = parseInt(interval);

    if (isNaN(newThreshold) || newThreshold <= 0 || newThreshold > 100) {
      toast.error("Invalid threshold.");
      return;
    }

    if (isNaN(newInterval) || newInterval < 10) {
      toast.error("Interval must be at least 10s.");
      return;
    }

    // Security check for Discord Webhook URL to prevent SSRF
    if (discordUrl && !discordUrl.startsWith('https://discord.com/api/webhooks/') && !discordUrl.startsWith('https://discordapp.com/api/webhooks/')) {
      toast.error("Invalid Discord Webhook URL. Must start with 'https://discord.com/api/webhooks/'");
      return;
    }

    updateSettings({
      alertThreshold: newThreshold,
      refreshInterval: newInterval,
      discordWebhookUrl: discordUrl
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
      <DialogContent className="bg-slate-950 border-slate-800 text-slate-100 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Terminal Settings</DialogTitle>
          <DialogDescription className="text-slate-400">
            Configure alerts, integrations, and display preferences.
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
                className="bg-slate-900 border-slate-800"
              />
            </div>
            <p className="text-[10px] text-slate-500">Drop from 24h avg to trigger alert.</p>
          </div>

          <div className="space-y-2">
            <Label>Refresh Rate</Label>
            <div className="flex gap-2">
              {[15, 30, 60].map((sec) => (
                <button
                  key={sec}
                  onClick={() => updateSettings({ refreshInterval: sec })}
                  className={`px-3 py-1.5 rounded text-sm font-mono transition-colors ${settings.refreshInterval === sec
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                >
                  {sec}s
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-500">Faster = more API calls. OSRS Wiki updates every 60s.</p>
          </div>

          <div className="space-y-2 pt-4 border-t border-slate-800">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="h-4 w-4 text-[#5865F2]" />
              <Label>Discord Integration</Label>
            </div>
            <Input
              type="password"
              value={discordUrl}
              onChange={(e) => setDiscordUrl(e.target.value)}
              placeholder="https://discord.com/api/webhooks/..."
              className="bg-slate-900 border-slate-800 font-mono text-xs"
            />
            <p className="text-[10px] text-slate-500">
              Paste a webhook URL to receive "Panic Wick" alerts in your Discord server.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-800 grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="sound-mode" className="text-sm">Audio Alerts</Label>
              <Switch
                id="sound-mode"
                checked={settings.soundEnabled}
                onCheckedChange={(c) => updateSettings({ soundEnabled: c })}
              />
            </div>

            <div className="flex items-center justify-between space-x-2">
              <div className="flex items-center gap-2">
                <Bell size={14} />
                <Label htmlFor="desktop-mode" className="text-sm">Desktop Alerts</Label>
              </div>
              <Switch
                id="desktop-mode"
                checked={settings.desktopNotificationsEnabled}
                onCheckedChange={(c) => {
                  if (c) {
                    Notification.requestPermission().then(permission => {
                      if (permission === 'granted') {
                        updateSettings({ desktopNotificationsEnabled: true });
                        new Notification("Notifications Enabled", { body: "You will now receive desktop alerts." });
                      } else {
                        toast.error("Permission denied for desktop notifications.");
                        updateSettings({ desktopNotificationsEnabled: false });
                      }
                    });
                  } else {
                    updateSettings({ desktopNotificationsEnabled: false });
                  }
                }}
              />
            </div>

            <div className="flex items-center justify-between space-x-2">
              <div className="flex items-center gap-2">
                {settings.compactMode ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                <Label htmlFor="compact-mode" className="text-sm">Compact Mode</Label>
              </div>
              <Switch
                id="compact-mode"
                checked={settings.compactMode}
                onCheckedChange={(c) => updateSettings({ compactMode: c })}
              />
            </div>
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