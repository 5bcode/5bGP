
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Coins, ArrowUpRight, ArrowDownLeft, Ban } from "lucide-react";

interface ActiveOffer {
    id: string;
    slot: number;
    item_id: number;
    item_name: string;
    price: number;
    quantity: number;
    quantity_filled: number;
    offer_type: "buy" | "sell" | "empty";
    status: string;
    updated_at: string;
}

const userId = "b5f828e9-4fe5-4918-beea-ae829487e319"; // Hardcoded for demo

export default function LiveSlots() {
    const [offers, setOffers] = useState<ActiveOffer[]>([]);
    const [loading, setLoading] = useState(true);

    // Initialize 8 empty slots
    const emptySlots = Array(8).fill(null).map((_, i) => ({
        slot: i,
        offer_type: "empty",
        status: "EMPTY"
    }));

    useEffect(() => {
        fetchOffers();

        // Subscribe to realtime changes
        const channel = supabase
            .channel('schema-db-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'active_offers',
                    filter: `user_id=eq.${userId}`
                },
                (payload) => {
                    console.log('Realtime update:', payload);
                    fetchOffers(); // Refresh all on any change for simplicity
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchOffers = async () => {
        try {
            const { data, error } = await supabase
                .from("active_offers")
                .select("*")
                .eq("user_id", userId);

            if (error) throw error;
            setOffers(data as ActiveOffer[]);
        } catch (error) {
            console.error("Error fetching offers:", error);
        } finally {
            setLoading(false);
        }
    };

    const getSlotData = (index: number) => {
        return offers.find(o => o.slot === index) || { ...emptySlots[index], slot: index } as any;
    };

    const formatNumber = (num: number) => {
        return new Intl.NumberFormat("en-US").format(num);
    };

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-500 bg-clip-text text-transparent">
                        Live GE Slots
                    </h1>
                    <p className="text-slate-400">Real-time synchronization from RuneLite</p>
                </div>
                <div className="flex gap-2">
                    <Badge variant="outline" className="animate-pulse border-emerald-500/50 text-emerald-500">
                        ● Live Connected
                    </Badge>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
                    const offer = getSlotData(i);
                    const isEmpty = offer.status === "EMPTY" || !offer.item_name;
                    const isBuy = offer.offer_type === "buy";

                    return (
                        <Card key={i} className={`border-slate-800 bg-slate-900/50 backdrop-blur ${!isEmpty ? (isBuy ? 'border-emerald-500/20' : 'border-amber-500/20') : ''}`}>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-slate-400 flex justify-between">
                                    <span>Slot {i + 1}</span>
                                    {!isEmpty && (
                                        <Badge variant={isBuy ? "default" : "secondary"} className={isBuy ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}>
                                            {isBuy ? "BUY" : "SELL"}
                                        </Badge>
                                    )}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {isEmpty ? (
                                    <div className="h-24 flex flex-col items-center justify-center text-slate-600">
                                        <Ban className="w-8 h-8 mb-2 opacity-50" />
                                        <span className="text-xs uppercase tracking-wider">Empty</span>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h3 className="font-bold text-lg text-slate-100 line-clamp-1">{offer.item_name}</h3>
                                                <div className="flex items-center text-xs text-slate-400 mt-1">
                                                    <Coins className="w-3 h-3 mr-1" />
                                                    {formatNumber(offer.price)} gp
                                                </div>
                                            </div>
                                            {offer.item_id > 0 && (
                                                <img
                                                    src={`https://static.runelite.net/cache/item/icon/${offer.item_id}.png`}
                                                    alt={offer.item_name}
                                                    className="w-10 h-10 object-contain"
                                                />
                                            )}
                                        </div>

                                        <div className="space-y-1">
                                            <div className="flex justify-between text-xs text-slate-400">
                                                <span>Progress</span>
                                                <span>{formatNumber(offer.quantity_filled || 0)} / {formatNumber(offer.quantity)}</span>
                                            </div>
                                            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full transition-all duration-500 ${isBuy ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                                    style={{ width: `${Math.min(100, ((offer.quantity_filled || 0) / offer.quantity) * 100)}%` }}
                                                />
                                            </div>
                                        </div>

                                        <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
                                            <span className={`text-xs font-medium px-2 py-0.5 rounded ${offer.status === "ACTIVE" ? "bg-blue-500/10 text-blue-400" :
                                                offer.status === "BOUGHT" ? "bg-emerald-500/10 text-emerald-400" :
                                                    offer.status === "SOLD" ? "bg-amber-500/10 text-amber-400" :
                                                        "bg-slate-800 text-slate-400"
                                                }`}>
                                                {offer.status}
                                            </span>
                                            <span className="text-[10px] text-slate-500">
                                                {new Date(offer.updated_at).toLocaleTimeString()}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
