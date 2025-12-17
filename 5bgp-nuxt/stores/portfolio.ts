import { defineStore } from 'pinia'
import { useLocalStorage } from '@vueuse/core'

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

export const usePortfolioStore = defineStore('portfolio', () => {
    // State
    const cash = useLocalStorage('portfolio-cash', 10000000)
    const holdings = useLocalStorage<Record<number, Holding>>('portfolio-holdings', {})
    const transactions = useLocalStorage<Transaction[]>('portfolio-transactions', [])

    // Actions
    function setCash(amount: number) {
        cash.value = amount
    }

    function resetPortfolio() {
        cash.value = 10000000
        holdings.value = {}
        transactions.value = []
    }

    function addTransaction(tx: Omit<Transaction, 'id' | 'timestamp'>) {
        const { itemId, type, quantity, price } = tx;
        const timestamp = Date.now();
        const id = crypto.randomUUID();
        const newTx = { ...tx, id, timestamp };

        const currentHoldings = { ...holdings.value };
        const previousHolding = currentHoldings[itemId] || { itemId, quantity: 0, avgBuyPrice: 0 };

        let newCash = cash.value;

        if (type === 'buy') {
            // Buying
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
            // Selling
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

        cash.value = newCash
        holdings.value = currentHoldings
        transactions.value = [newTx, ...transactions.value]
    }

    return {
        cash,
        holdings,
        transactions,
        setCash,
        resetPortfolio,
        addTransaction
    }
})
