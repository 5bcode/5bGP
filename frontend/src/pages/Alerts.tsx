import React, { useState, useEffect } from "react";
import { useAlertStore } from "../store/alertStore";
import { useMarketData } from "../hooks/useMarketData";
import { Card } from "../components/ui/Card";
import { CreateAlertRuleModal } from "../components/CreateAlertRuleModal";
import { Bell, BellOff, Settings, Trash2, Eye, AlertTriangle, TrendingUp, TrendingDown, Volume2, Star, Plus } from "lucide-react";
import { formatNumber } from "../utils/formatters";

export default function Alerts() {
    const {
        alerts,
        rules,
        settings,
        stats,
        markAsRead,
        markAllAsRead,
        dismissAlert,
        deleteAlert,
        clearAlerts,
        updateSettings,
        toggleRule,
        deleteRule,
        getAlertsByItem,
        requestNotificationPermission
    } = useAlertStore();

    const { items: marketData } = useMarketData();
    const [activeTab, setActiveTab] = useState<'alerts' | 'rules' | 'settings'>('alerts');
    const [filterType, setFilterType] = useState<string>('all');
    const [showUnreadOnly, setShowUnreadOnly] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Request notification permission on component mount
    useEffect(() => {
        if (settings.browserNotifications) {
            requestNotificationPermission();
        }
    }, []);

    const filteredAlerts = alerts.filter(alert => {
        if (showUnreadOnly && alert.read) return false;
        if (filterType !== 'all' && alert.type !== filterType) return false;
        return !alert.dismissed;
    });

    const alertTypeIcons = {
        price_spike: TrendingUp,
        volume_spike: Volume2,
        margin_improvement: Star,
        high_score: Star,
        pump_detected: TrendingUp,
        dump_detected: TrendingDown
    };

    const alertTypeColors = {
        price_spike: 'text-orange-500',
        volume_spike: 'text-blue-500',
        margin_improvement: 'text-green-500',
        high_score: 'text-purple-500',
        pump_detected: 'text-red-500',
        dump_detected: 'text-red-600'
    };

    const severityColors = {
        info: 'border-blue-500 bg-blue-500/10',
        warning: 'border-yellow-500 bg-yellow-500/10',
        critical: 'border-red-500 bg-red-500/10'
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <Bell className="h-8 w-8 text-yellow-500" />
                        <div>
                            <h1 className="text-3xl font-bold text-white">Alerts Center</h1>
                            <p className="text-slate-400">Monitor your favorite items for price movements</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        <div className="text-right">
                            <div className="text-2xl font-bold text-white">{stats.unreadAlerts}</div>
                            <div className="text-sm text-slate-400">Unread Alerts</div>
                        </div>
                        <div className="text-right">
                            <div className="text-2xl font-bold text-white">{stats.todayAlerts}</div>
                            <div className="text-sm text-slate-400">Today</div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex space-x-1 bg-slate-800 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab('alerts')}
                        className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md transition-colors ${activeTab === 'alerts'
                            ? 'bg-yellow-600 text-white'
                            : 'text-slate-400 hover:text-white hover:bg-slate-700'
                            }`}
                    >
                        <Bell className="h-4 w-4" />
                        <span>Alerts ({alerts.length})</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('rules')}
                        className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md transition-colors ${activeTab === 'rules'
                            ? 'bg-yellow-600 text-white'
                            : 'text-slate-400 hover:text-white hover:bg-slate-700'
                            }`}
                    >
                        <Settings className="h-4 w-4" />
                        <span>Rules ({rules.length})</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md transition-colors ${activeTab === 'settings'
                            ? 'bg-yellow-600 text-white'
                            : 'text-slate-400 hover:text-white hover:bg-slate-700'
                            }`}
                    >
                        <Settings className="h-4 w-4" />
                        <span>Settings</span>
                    </button>
                </div>

                {/* Alerts Tab */}
                {activeTab === 'alerts' && (
                    <div className="space-y-6">
                        {/* Controls */}
                        <Card className="p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                    <select
                                        value={filterType}
                                        onChange={(e) => setFilterType(e.target.value)}
                                        className="bg-slate-700 text-white border border-slate-600 rounded-md px-3 py-1"
                                    >
                                        <option value="all">All Types</option>
                                        <option value="price_spike">Price Spikes</option>
                                        <option value="volume_spike">Volume Spikes</option>
                                        <option value="margin_improvement">Margin Improvements</option>
                                        <option value="high_score">High Scores</option>
                                        <option value="pump_detected">Pumps</option>
                                        <option value="dump_detected">Dumps</option>
                                    </select>
                                    <label className="flex items-center space-x-2 text-sm text-slate-300">
                                        <input
                                            type="checkbox"
                                            checked={showUnreadOnly}
                                            onChange={(e) => setShowUnreadOnly(e.target.checked)}
                                            className="rounded"
                                        />
                                        <span>Unread only</span>
                                    </label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={markAllAsRead}
                                        className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                                    >
                                        Mark All Read
                                    </button>
                                    <button
                                        onClick={clearAlerts}
                                        className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                                    >
                                        Clear All
                                    </button>
                                </div>
                            </div>
                        </Card>

                        {/* Alerts List */}
                        <div className="space-y-3">
                            {filteredAlerts.length === 0 ? (
                                <Card className="p-8 text-center">
                                    <BellOff className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                                    <h3 className="text-lg font-semibold text-white mb-2">No Alerts</h3>
                                    <p className="text-slate-400">
                                        {showUnreadOnly ? 'No unread alerts at the moment.' : 'No alerts match your current filters.'}
                                    </p>
                                </Card>
                            ) : (
                                filteredAlerts.map((alert) => {
                                    const IconComponent = alertTypeIcons[alert.type];
                                    return (
                                        <Card
                                            key={alert.id}
                                            className={`p-4 border-l-4 ${severityColors[alert.severity]} ${!alert.read ? 'ring-2 ring-yellow-500/20' : ''
                                                }`}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-start space-x-3 flex-1">
                                                    <div className={`p-2 rounded-lg bg-slate-700 ${alertTypeColors[alert.type]}`}>
                                                        <IconComponent className="h-5 w-5" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center space-x-2 mb-1">
                                                            <h3 className="font-semibold text-white">{alert.title}</h3>
                                                            {!alert.read && (
                                                                <span className="px-2 py-1 bg-yellow-600 text-white text-xs rounded-full">
                                                                    New
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-slate-300 mb-2">{alert.message}</p>
                                                        <div className="flex items-center space-x-4 text-sm text-slate-400">
                                                            <span>{new Date(alert.timestamp).toLocaleString()}</span>
                                                            <span className="capitalize">{alert.type.replace('_', ' ')}</span>
                                                            <span className="capitalize">{alert.severity}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center space-x-2 ml-4">
                                                    {!alert.read && (
                                                        <button
                                                            onClick={() => markAsRead(alert.id)}
                                                            className="p-1 text-slate-400 hover:text-white"
                                                            title="Mark as read"
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => dismissAlert(alert.id)}
                                                        className="p-1 text-slate-400 hover:text-white"
                                                        title="Dismiss"
                                                    >
                                                        <BellOff className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => deleteAlert(alert.id)}
                                                        className="p-1 text-slate-400 hover:text-red-400"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </Card>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}

                {/* Rules Tab */}
                {activeTab === 'rules' && (
                    <div className="space-y-6">
                        <Card className="p-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-white">Alert Rules</h3>
                                <button
                                    onClick={() => setIsCreateModalOpen(true)}
                                    className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors flex items-center gap-2"
                                >
                                    <Plus className="h-4 w-4" />
                                    Create Rule
                                </button>
                            </div>
                        </Card>

                        <div className="space-y-3">
                            {rules.length === 0 ? (
                                <Card className="p-8 text-center">
                                    <AlertTriangle className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                                    <h3 className="text-lg font-semibold text-white mb-2">No Rules</h3>
                                    <p className="text-slate-400 mb-4">Create alert rules to monitor your favorite items.</p>
                                    <button
                                        onClick={() => setIsCreateModalOpen(true)}
                                        className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors flex items-center gap-2"
                                    >
                                        <Plus className="h-4 w-4" />
                                        Create Your First Rule
                                    </button>
                                </Card>
                            ) : (
                                rules.map((rule) => (
                                    <Card key={rule.id} className="p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-3">
                                                <img
                                                    src={rule.itemIcon}
                                                    alt={rule.itemName}
                                                    className="w-8 h-8 rounded"
                                                />
                                                <div>
                                                    <h3 className="font-semibold text-white">{rule.itemName}</h3>
                                                    <p className="text-sm text-slate-400">
                                                        Price: ±{rule.thresholds.priceChangePercent}% •
                                                        Volume: {rule.thresholds.volumeSpikeMultiplier}x •
                                                        Score: {rule.thresholds.newFlipperScoreMin}+
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <div className="text-right text-sm text-slate-400">
                                                    <div>Triggered: {rule.triggerCount} times</div>
                                                    {rule.lastTriggered && (
                                                        <div>Last: {new Date(rule.lastTriggered).toLocaleDateString()}</div>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => toggleRule(rule.id)}
                                                    className={`p-2 rounded-md ${rule.enabled
                                                        ? 'bg-green-600 text-white hover:bg-green-700'
                                                        : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                                                        }`}
                                                >
                                                    {rule.enabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                                                </button>
                                                <button
                                                    onClick={() => deleteRule(rule.id)}
                                                    className="p-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </Card>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* Settings Tab */}
                {activeTab === 'settings' && (
                    <div className="space-y-6">
                        <Card className="p-6">
                            <h3 className="text-lg font-semibold text-white mb-4">Alert Settings</h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <label className="text-white font-medium">Enable Alerts</label>
                                        <p className="text-sm text-slate-400">Turn alert monitoring on or off</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={settings.enabled}
                                            onChange={(e) => updateSettings({ enabled: e.target.checked })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-600"></div>
                                    </label>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <label className="text-white font-medium">Browser Notifications</label>
                                        <p className="text-sm text-slate-400">Show desktop notifications for alerts</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={settings.browserNotifications}
                                            onChange={(e) => {
                                                updateSettings({ browserNotifications: e.target.checked });
                                                if (e.target.checked) {
                                                    requestNotificationPermission();
                                                }
                                            }}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-600"></div>
                                    </label>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <label className="text-white font-medium">Sound Notifications</label>
                                        <p className="text-sm text-slate-400">Play sound when alerts trigger</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={settings.soundEnabled}
                                            onChange={(e) => updateSettings({ soundEnabled: e.target.checked })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-600"></div>
                                    </label>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-white font-medium block mb-2">Max Alerts</label>
                                        <input
                                            type="number"
                                            value={settings.maxAlerts}
                                            onChange={(e) => updateSettings({ maxAlerts: parseInt(e.target.value) })}
                                            className="w-full bg-slate-700 text-white border border-slate-600 rounded-md px-3 py-2"
                                            min="10"
                                            max="1000"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-white font-medium block mb-2">Cooldown (minutes)</label>
                                        <input
                                            type="number"
                                            value={settings.alertCooldownMinutes}
                                            onChange={(e) => updateSettings({ alertCooldownMinutes: parseInt(e.target.value) })}
                                            className="w-full bg-slate-700 text-white border border-slate-600 rounded-md px-3 py-2"
                                            min="1"
                                            max="60"
                                        />
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>
                )}
            </div>

            {/* Create Alert Rule Modal */}
            <CreateAlertRuleModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
            />
        </div>
    );
}
