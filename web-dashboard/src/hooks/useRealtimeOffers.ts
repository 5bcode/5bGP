import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ActiveOffer {
    id: string;
    slot: number;
    item_id: number;
    item_name: string;
    price: number;
    quantity: number;
    quantity_filled: number;
    offer_type: "buy" | "sell" | "empty";
    status: string;
    timestamp: number;
}

const userId = "b5f828e9-4fe5-4918-beea-ae829487e319"; // Hardcoded for demo

export function useRealtimeOffers() {
    const [offers, setOffers] = useState<ActiveOffer[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchOffers = async () => {
        try {
            const { data, error } = await supabase
                .from("active_offers")
                .select("*")
                .eq("user_id", userId);

            if (error) throw error;

            // Debug Auth
            const { data: { session } } = await supabase.auth.getSession();
            console.log("Current Session Role:", session?.user?.role || "anon");
            console.log("Request User ID Filter:", userId);

            setOffers((data as ActiveOffer[]) || []);
            setError(null);

            // Append debug info to error if empty for visibility
            if ((!data || data.length === 0) && !error) {
                setError(`No data found. Role: ${session?.user?.role || 'anon'}. Filter: ${userId}`);
            }
        } catch (err: any) {
            console.error("Error fetching offers:", err);
            setError(err.message || "Unknown error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Initial fetch
        fetchOffers();

        // Subscribe to changes
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
                    // Optimistic update or refetch
                    // For simplicity and accuracy, we refetch to get the full state
                    // In a high-load app we might merge payload.new
                    console.log("Realtime update received", payload);
                    fetchOffers();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const getSlotData = (index: number) => {
        const found = offers.find(o => o.slot === index);
        if (found) return found;

        // Return empty placeholder
        return {
            id: `empty-${index}`,
            slot: index,
            item_id: 0,
            item_name: "",
            price: 0,
            quantity: 0,
            quantity_filled: 0,
            offer_type: "empty",
            status: "EMPTY",
            timestamp: Date.now()
        } as ActiveOffer;
    };

    return { offers, loading, error, getSlotData };
}
