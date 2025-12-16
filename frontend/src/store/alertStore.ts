import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Alert, AlertRule, AlertSettings, AlertThresholds, AlertStats } from '../types';

interface AlertState {
    // Data
    alerts: Alert[];
    rules: AlertRule[];
    settings: AlertSettings;
    stats: AlertStats;

    // Market data cache for comparison
    previousData: Record<number, {
        buyPrice: number;
        sellPrice: number;
        margin: number;
        volume: number;
        flipperScore: number;
        timestamp: number;
    }>;

    // Actions - Rules Management
    createRule: (rule: Omit<AlertRule, 'id' | 'createdAt' | 'triggerCount'>) => string;
    updateRule: (id: string, updates: Partial<AlertRule>) => void;
    deleteRule: (id: string) => void;
    toggleRule: (id: string) => void;

    // Actions - Alert Management
    addAlert: (alert: Omit<Alert, 'id' | 'timestamp' | 'read' | 'dismissed'>) => void;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    dismissAlert: (id: string) => void;
    clearAlerts: () => void;
    deleteAlert: (id: string) => void;

    // Actions - Settings
    updateSettings: (settings: Partial<AlertSettings>) => void;
    resetToDefaults: () => void;

    // Actions - Monitoring
    checkForAlerts: (marketData: Record<number, any>) => void;
    requestNotificationPermission: () => Promise<boolean>;
    showBrowserNotification: (alert: Alert) => void;

    // Actions - Utility
    getAlertsByItem: (itemId: number) => Alert[];
    getRulesByItem: (itemId: number) => AlertRule[];
    refreshStats: () => void;
}

const DEFAULT_SETTINGS: AlertSettings = {
    enabled: true,
    browserNotifications: false,
    soundEnabled: true,
    maxAlerts: 100,
    alertCooldownMinutes: 15,
    defaultThresholds: {
        priceChangePercent: 5,
        volumeSpikeMultiplier: 3,
        marginIncreasePercent: 10,
        newFlipperScoreMin: 80
    }
};

const DEFAULT_STATS: AlertStats = {
    totalAlerts: 0,
    unreadAlerts: 0,
    todayAlerts: 0,
    alertsByType: {},
    topTriggeredItems: []
};

export const useAlertStore = create<AlertState>()(
    persist(
        (set, get) => ({
            // Initial State
            alerts: [],
            rules: [],
            settings: DEFAULT_SETTINGS,
            stats: DEFAULT_STATS,
            previousData: {},

            // Rules Management
            createRule: (ruleData) => {
                const id = `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                const rule: AlertRule = {
                    ...ruleData,
                    id,
                    createdAt: Date.now(),
                    triggerCount: 0
                };

                set((state) => ({
                    rules: [...state.rules, rule]
                }));

                return id;
            },

            updateRule: (id, updates) => {
                set((state) => ({
                    rules: state.rules.map(rule =>
                        rule.id === id ? { ...rule, ...updates } : rule
                    )
                }));
            },

            deleteRule: (id) => {
                set((state) => ({
                    rules: state.rules.filter(rule => rule.id !== id),
                    alerts: state.alerts.filter(alert => alert.ruleId !== id)
                }));
            },

            toggleRule: (id) => {
                set((state) => ({
                    rules: state.rules.map(rule =>
                        rule.id === id ? { ...rule, enabled: !rule.enabled } : rule
                    )
                }));
            },

            // Alert Management
            addAlert: (alertData) => {
                const id = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                const alert: Alert = {
                    ...alertData,
                    id,
                    timestamp: Date.now(),
                    read: false,
                    dismissed: false
                };

                set((state) => {
                    const newAlerts = [alert, ...state.alerts];
                    // Keep only maxAlerts
                    const trimmedAlerts = newAlerts.slice(0, state.settings.maxAlerts);

                    return {
                        alerts: trimmedAlerts
                    };
                });

                // Show browser notification if enabled
                if (get().settings.browserNotifications && get().settings.enabled) {
                    get().showBrowserNotification(alert);
                }

                // Play sound if enabled
                if (get().settings.soundEnabled) {
                    // Could implement sound notification here
                }

                // Update stats
                get().refreshStats();
            },

            markAsRead: (id) => {
                set((state) => ({
                    alerts: state.alerts.map(alert =>
                        alert.id === id ? { ...alert, read: true } : alert
                    )
                }));
                get().refreshStats();
            },

            markAllAsRead: () => {
                set((state) => ({
                    alerts: state.alerts.map(alert => ({ ...alert, read: true }))
                }));
                get().refreshStats();
            },

            dismissAlert: (id) => {
                set((state) => ({
                    alerts: state.alerts.map(alert =>
                        alert.id === id ? { ...alert, dismissed: true } : alert
                    )
                }));
            },

            clearAlerts: () => {
                set({ alerts: [] });
                get().refreshStats();
            },

            deleteAlert: (id) => {
                set((state) => ({
                    alerts: state.alerts.filter(alert => alert.id !== id)
                }));
                get().refreshStats();
            },

            // Settings Management
            updateSettings: (updates) => {
                set((state) => ({
                    settings: { ...state.settings, ...updates }
                }));
            },

            resetToDefaults: () => {
                set({ settings: DEFAULT_SETTINGS });
            },

            // Core Monitoring Logic
            checkForAlerts: (marketData) => {
                const state = get();
                if (!state.settings.enabled) return;

                const currentTime = Date.now();
                const rules = state.rules.filter(rule => rule.enabled);

                rules.forEach(rule => {
                    const itemData = marketData[rule.itemId];
                    if (!itemData) return;

                    const previousData = state.previousData[rule.itemId];
                    const cooldownMs = rule.thresholds ? rule.itemId * 60 * 1000 : state.settings.alertCooldownMinutes * 60 * 1000;

                    // Check cooldown
                    if (rule.lastTriggered && (currentTime - rule.lastTriggered) < cooldownMs) {
                        return;
                    }

                    let triggeredAlert: Omit<Alert, 'id' | 'timestamp' | 'read' | 'dismissed'> | null = null;

                    // Price Change Detection
                    if (previousData && rule.thresholds) {
                        const priceChange = Math.abs(itemData.buyPrice - previousData.buyPrice) / previousData.buyPrice * 100;
                        if (priceChange >= rule.thresholds.priceChangePercent) {
                            triggeredAlert = {
                                ruleId: rule.id,
                                itemId: rule.itemId,
                                itemName: rule.itemName,
                                itemIcon: rule.itemIcon,
                                type: 'price_spike',
                                severity: priceChange >= 15 ? 'critical' : 'warning',
                                title: `${rule.itemName} Price Alert`,
                                message: `Price changed by ${priceChange.toFixed(1)}% (${previousData.buyPrice.toLocaleString()} → ${itemData.buyPrice.toLocaleString()})`,
                                data: {
                                    currentValue: itemData.buyPrice,
                                    previousValue: previousData.buyPrice,
                                    threshold: rule.thresholds.priceChangePercent,
                                    changePercent: priceChange
                                }
                            };
                        }

                        // Volume Spike Detection
                        const volumeSpike = itemData.volume / Math.max(previousData.volume, 1);
                        if (volumeSpike >= rule.thresholds.volumeSpikeMultiplier) {
                            triggeredAlert = {
                                ruleId: rule.id,
                                itemId: rule.itemId,
                                itemName: rule.itemName,
                                itemIcon: rule.itemIcon,
                                type: 'volume_spike',
                                severity: volumeSpike >= 5 ? 'critical' : 'warning',
                                title: `${rule.itemName} Volume Alert`,
                                message: `Volume spike detected: ${volumeSpike.toFixed(1)}x normal (${previousData.volume.toLocaleString()} → ${itemData.volume.toLocaleString()})`,
                                data: {
                                    currentValue: itemData.volume,
                                    previousValue: previousData.volume,
                                    threshold: rule.thresholds.volumeSpikeMultiplier,
                                    changePercent: (volumeSpike - 1) * 100
                                }
                            };
                        }

                        // Margin Improvement Detection
                        const marginChange = (itemData.margin - previousData.margin) / Math.max(previousData.margin, 1) * 100;
                        if (marginChange >= rule.thresholds.marginIncreasePercent) {
                            triggeredAlert = {
                                ruleId: rule.id,
                                itemId: rule.itemId,
                                itemName: rule.itemName,
                                itemIcon: rule.itemIcon,
                                type: 'margin_improvement',
                                severity: 'info',
                                title: `${rule.itemName} Margin Improvement`,
                                message: `Margin improved by ${marginChange.toFixed(1)}% (${previousData.margin.toLocaleString()} → ${itemData.margin.toLocaleString()})`,
                                data: {
                                    currentValue: itemData.margin,
                                    previousValue: previousData.margin,
                                    threshold: rule.thresholds.marginIncreasePercent,
                                    changePercent: marginChange
                                }
                            };
                        }
                    }

                    // High Flipper Score Detection
                    if (itemData.flipperScore >= rule.thresholds.newFlipperScoreMin) {
                        triggeredAlert = {
                            ruleId: rule.id,
                            itemId: rule.itemId,
                            itemName: rule.itemName,
                            itemIcon: rule.itemIcon,
                            type: 'high_score',
                            severity: itemData.flipperScore >= 95 ? 'critical' : 'warning',
                            title: `${rule.itemName} High Score Alert`,
                            message: `Flipper Score reached ${itemData.flipperScore.toFixed(1)}!`,
                            data: {
                                currentValue: itemData.flipperScore,
                                previousValue: previousData?.flipperScore || 0,
                                threshold: rule.thresholds.newFlipperScoreMin,
                                changePercent: itemData.flipperScore - (previousData?.flipperScore || 0)
                            }
                        };
                    }

                    // Pump/Dump Detection
                    if (itemData.pump) {
                        triggeredAlert = {
                            ruleId: rule.id,
                            itemId: rule.itemId,
                            itemName: rule.itemName,
                            itemIcon: rule.itemIcon,
                            type: 'pump_detected',
                            severity: 'warning',
                            title: `${rule.itemName} Pump Detected`,
                            message: 'Unusual buying activity detected - potential price manipulation',
                            data: {
                                currentValue: itemData.buyPrice,
                                previousValue: previousData?.buyPrice || itemData.buyPrice,
                                threshold: 0,
                                changePercent: 0
                            }
                        };
                    }

                    if (triggeredAlert) {
                        get().addAlert(triggeredAlert);
                        // Update rule trigger count and last triggered
                        get().updateRule(rule.id, {
                            triggerCount: rule.triggerCount + 1,
                            lastTriggered: currentTime
                        });
                    }
                });

                // Update previous data cache
                set((state) => {
                    const updatedPreviousData = { ...state.previousData };
                    Object.entries(marketData).forEach(([itemId, data]) => {
                        updatedPreviousData[parseInt(itemId)] = {
                            buyPrice: data.buyPrice,
                            sellPrice: data.sellPrice,
                            margin: data.margin,
                            volume: data.volume,
                            flipperScore: data.flipperScore,
                            timestamp: currentTime
                        };
                    });
                    return { previousData: updatedPreviousData };
                });
            },

            // Browser Notifications
            requestNotificationPermission: async () => {
                if (!('Notification' in window)) {
                    return false;
                }

                if (Notification.permission === 'granted') {
                    return true;
                }

                if (Notification.permission !== 'denied') {
                    const permission = await Notification.requestPermission();
                    return permission === 'granted';
                }

                return false;
            },

            showBrowserNotification: (alert) => {
                if (Notification.permission === 'granted') {
                    const notification = new Notification(alert.title, {
                        body: alert.message,
                        icon: alert.itemIcon,
                        tag: alert.id,
                        requireInteraction: alert.severity === 'critical'
                    });

                    // Auto close after 10 seconds for non-critical alerts
                    if (alert.severity !== 'critical') {
                        setTimeout(() => notification.close(), 10000);
                    }

                    // Click handler
                    notification.onclick = () => {
                        window.focus();
                        get().markAsRead(alert.id);
                        notification.close();
                    };
                }
            },

            // Utility Functions
            getAlertsByItem: (itemId) => {
                return get().alerts.filter(alert => alert.itemId === itemId);
            },

            getRulesByItem: (itemId) => {
                return get().rules.filter(rule => rule.itemId === itemId);
            },

            refreshStats: () => {
                const state = get();
                const now = Date.now();
                const todayStart = new Date().setHours(0, 0, 0, 0);

                const todayAlerts = state.alerts.filter(alert => alert.timestamp >= todayStart);
                const alertsByType = state.alerts.reduce((acc, alert) => {
                    acc[alert.type] = (acc[alert.type] || 0) + 1;
                    return acc;
                }, {} as Record<string, number>);

                const itemTriggerCounts = state.alerts.reduce((acc, alert) => {
                    acc[alert.itemId] = (acc[alert.itemId] || 0) + 1;
                    return acc;
                }, {} as Record<number, number>);

                const topTriggeredItems = Object.entries(itemTriggerCounts)
                    .map(([itemId, count]) => {
                        const alert = state.alerts.find(a => a.itemId === parseInt(itemId));
                        return {
                            itemId: parseInt(itemId),
                            itemName: alert?.itemName || 'Unknown',
                            count
                        };
                    })
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 5);

                set({
                    stats: {
                        totalAlerts: state.alerts.length,
                        unreadAlerts: state.alerts.filter(alert => !alert.read).length,
                        todayAlerts: todayAlerts.length,
                        alertsByType,
                        topTriggeredItems
                    }
                });
            }
        }),
        {
            name: 'flip-to-5b-alerts',
            // Only persist settings and rules, not alerts (too large)
            partialize: (state) => ({
                settings: state.settings,
                rules: state.rules
            })
        }
    )
);

// Initialize notification permission if settings allow
if (typeof window !== 'undefined') {
    const { settings, requestNotificationPermission } = useAlertStore.getState();
    if (settings.browserNotifications) {
        requestNotificationPermission();
    }
}
