import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Holding {
    itemId: number;
    quantity: number;
    avgBuyPrice: number;
}

export interface Transaction {
    id: string;
    itemId: number;
    type: 'buy' | 'sell';
    quantity: number;
    price: number;
    timestamp: number;
}

interface PortfolioState {
    cash: number;
    holdings: Record<number, Holding>; // Keyed by itemId for O(1) access
    transactions: Transaction[];

    // Actions
    addTransaction: (tx: Omit<Transaction, 'id' | 'timestamp'>) => void;
    setCash: (amount: number) => void;
    resetPortfolio: () => void;
}

export const usePortfolioStore = create<PortfolioState>()(
    persist(
        (set) => ({
            cash: 10000000, // Default 10M start
            holdings: {},
            transactions: [],

            setCash: (amount) => set({ cash: amount }),

            addTransaction: (tx) => {
                const { itemId, type, quantity, price } = tx;
                const timestamp = Date.now();
                const id = crypto.randomUUID();
                const newTx = { ...tx, id, timestamp };

                set((state) => {
                    const currentHoldings = { ...state.holdings };
                    const previousHolding = currentHoldings[itemId] || { itemId, quantity: 0, avgBuyPrice: 0 };

                    let newCash = state.cash;

                    if (type === 'buy') {
                        // Buying: Decrease cash, increase quantity, update avg buy price
                        newCash -= (quantity * price);

                        const totalCost = (previousHolding.quantity * previousHolding.avgBuyPrice) + (quantity * price);
                        const newQuantity = previousHolding.quantity + quantity;
                        const newAvg = totalCost / newQuantity;

                        currentHoldings[itemId] = {
                            itemId,
                            quantity: newQuantity,
                            avgBuyPrice: newAvg
                        };

                    } else {
                        // Selling: Increase cash, decrease quantity
                        // Realized profit calculation would go here for history analysis
                        newCash += (quantity * price);

                        const newQuantity = previousHolding.quantity - quantity;

                        if (newQuantity <= 0) {
                            delete currentHoldings[itemId];
                        } else {
                            currentHoldings[itemId] = {
                                ...previousHolding,
                                quantity: newQuantity
                            };
                        }
                    }

                    return {
                        cash: newCash,
                        holdings: currentHoldings,
                        transactions: [newTx, ...state.transactions]
                    };
                });
            },

            resetPortfolio: () => set({ cash: 10000000, holdings: {}, transactions: [] }),
        }),
        {
            name: 'flip-to-5b-storage', // unique name
        }
    )
);
