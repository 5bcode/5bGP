import { useRealtimeOffers } from "@/hooks/useRealtimeOffers";
import PageHeader from "@/components/PageHeader";
import { formatGP } from "@/lib/osrs-math";
import { cn } from "@/lib/utils";
import { Activity, Ban, Coins, Clock, Zap, ArrowUpRight, ArrowDownRight } from "lucide-react";

export default function LiveSlots() {
    const { getSlotData, loading, offers, error } = useRealtimeOffers();

    return (
        <div className="space-y-8 animate-page-enter">
            {/* Header Section */}
            <PageHeader
                title={
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                            <Activity size={32} className="text-emerald-500" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-2xl font-black text-white tracking-tight">Live Signal Grid</span>
                            <span className="text-sm font-medium text-slate-500 font-mono uppercase tracking-widest">
                                Realtime • Low Latency
                            </span>
                        </div>
                    </div>
                }
                subtitle="Direct synchronized link to your RuneLite trading terminal."
                action={
                    <div className="flex items-center gap-4 px-6 py-3 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl backdrop-blur-sm">
                        <div className="relative">
                            <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.8)]" />
                            <div className="absolute top-0 left-0 w-3 h-3 bg-emerald-500 rounded-full animate-ping opacity-50" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black tracking-[0.2em] text-emerald-400 uppercase">System Online</span>
                            <span className="text-[10px] font-mono text-emerald-500/60">latency: &lt;50ms</span>
                        </div>
                    </div>
                }
            />

            {/* Grid Layout */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {Array(8).fill(null).map((_, i) => (
                        <div key={i} className="h-[280px] rounded-3xl bg-slate-900/50 animate-pulse border border-white/5" />
                    ))}
                </div>
            ) : (
                <>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
                            const offer = getSlotData(i);
                            const isEmpty = offer.status === "EMPTY" || !offer.item_name;
                            const isBuy = offer.offer_type === "buy";
                            const progress = !isEmpty && offer.quantity > 0 ? (offer.quantity_filled / offer.quantity) * 100 : 0;
                            const isComplete = progress >= 100;

                            return (
                                <div key={i} className={cn(
                                    "group relative overflow-hidden rounded-3xl border transition-all duration-500",
                                    isEmpty
                                        ? "bg-slate-950/30 border-white/5 hover:border-white/10 hover:bg-slate-950/50"
                                        : isBuy
                                            ? "bg-emerald-500/[0.02] border-emerald-500/20 hover:border-emerald-500/40 hover:shadow-[0_0_30px_rgba(16,185,129,0.05)]"
                                            : "bg-amber-500/[0.02] border-amber-500/20 hover:border-amber-500/40 hover:shadow-[0_0_30px_rgba(245,158,11,0.05)]"
                                )}>

                                    {/* Status Stripe */}
                                    {!isEmpty && (
                                        <div className={cn(
                                            "absolute top-0 left-0 w-full h-[2px]",
                                            isBuy ? "bg-gradient-to-r from-emerald-500 to-transparent" : "bg-gradient-to-r from-amber-500 to-transparent"
                                        )} />
                                    )}

                                    <div className="p-6 h-full flex flex-col justify-between relative z-10">

                                        {/* Slot Header */}
                                        <div className="flex items-center justify-between mb-6">
                                            <span className={cn(
                                                "text-[10px] font-black uppercase tracking-[0.2em]",
                                                isEmpty ? "text-slate-700" : "text-slate-500"
                                            )}>
                                                Slot 0{i + 1}
                                            </span>
                                            {!isEmpty && (
                                                <div className={cn(
                                                    "px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1",
                                                    isBuy ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                                )}>
                                                    {isBuy ? <ArrowDownRight size={10} /> : <ArrowUpRight size={10} />}
                                                    {isBuy ? "ACCUMULATING" : "LIQUIDATING"}
                                                </div>
                                            )}
                                        </div>

                                        {/* Content */}
                                        {isEmpty ? (
                                            <div className="flex-1 flex flex-col items-center justify-center gap-4 opacity-50 group-hover:opacity-80 transition-opacity">
                                                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center border border-dashed border-white/10 group-hover:border-white/20 transition-colors">
                                                    <Ban size={24} className="text-slate-600" />
                                                </div>
                                                <span className="text-xs font-mono text-slate-600 uppercase tracking-widest">Available</span>
                                            </div>
                                        ) : (
                                            <div className="space-y-6">
                                                {/* Item Info */}
                                                <div className="flex items-start gap-4">
                                                    <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-center shrink-0 shadow-lg group-hover:scale-105 transition-transform duration-500">
                                                        <img
                                                            src={`https://static.runelite.net/cache/item/icon/${offer.item_id}.png`}
                                                            alt={offer.item_name}
                                                            className="w-8 h-8 object-contain"
                                                        />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h3 className="font-bold text-white text-lg tracking-tight truncate leading-tight mb-1">
                                                            {offer.item_name}
                                                        </h3>
                                                        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                                                            <Coins size={12} className={isBuy ? "text-emerald-500" : "text-amber-500"} />
                                                            <span className="text-white font-medium">{formatGP(offer.price)}</span>
                                                            <span className="opacity-50">ea</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Progress Bar */}
                                                <div className="space-y-2">
                                                    <div className="flex justify-between items-end text-[10px] font-mono font-bold uppercase tracking-wider">
                                                        <span className={isComplete ? (isBuy ? "text-emerald-400" : "text-amber-400") : "text-slate-500"}>
                                                            {isComplete ? "Order Filled" : "In Progress"}
                                                        </span>
                                                        <span className="text-white">
                                                            {offer.quantity_filled.toLocaleString()} <span className="text-slate-600">/ {offer.quantity.toLocaleString()}</span>
                                                        </span>
                                                    </div>
                                                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                                        <div
                                                            className={cn(
                                                                "h-full transition-all duration-1000 ease-out rounded-full shadow-lg relative",
                                                                isBuy ? "bg-emerald-500" : "bg-amber-500"
                                                            )}
                                                            style={{ width: `${Math.min(100, progress)}%` }}
                                                        >
                                                            {/* Shine effect */}
                                                            <div className="absolute top-0 right-0 bottom-0 w-[10px] bg-white/20 blur-[2px]" />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Meta Data */}
                                                <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                                                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                                        <Zap size={12} className={isBuy ? "text-emerald-500" : "text-amber-500"} />
                                                        {offer.status}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-600">
                                                        <Clock size={10} />
                                                        <span>
                                                            {new Date(offer.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}
