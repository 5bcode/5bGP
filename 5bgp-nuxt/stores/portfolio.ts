// Pinia store for portfolio management
// Migrated from Zustand to Pinia for Vue 3 reactivity

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Holding, Transaction, TransactionInput } from '~/types'

export const usePortfolioStore = defineStore('portfolio', () => {
    const cash = ref(10000000) // Default 10M start
    const holdings = ref<Record<number, Holding>>({})
    const transactions = ref<Transaction[]>([])

    // Computed properties
    const totalValue = computed(() => {
        // Calculate total portfolio value based on current market prices
        // This would be injected from market data
        return cash.value
    })

    const portfolioItems = computed(() => Object.values(holdings.value))

    // Actions
    const addTransaction = async (tx: TransactionInput) => {
        const { itemId, type, quantity, price } = tx
        const timestamp = Date.now()
        const id = crypto.randomUUID()
        const newTx: Transaction = { ...tx, id, timestamp }

        const currentHoldings = { ...holdings.value }
        const previousHolding = currentHoldings[itemId] || { itemId, quantity: 0, avgBuyPrice: 0 }

        if (type === 'buy') {
            // Buying: Decrease cash, increase quantity, update avg buy price
            cash.value -= quantity * price

            const totalCost = previousHolding.quantity * previousHolding.avgBuyPrice + quantity * price
            const newQuantity = previousHolding.quantity + quantity
            const newAvg = totalCost / newQuantity

            currentHoldings[itemId] = {
                itemId,
                quantity: newQuantity,
                avgBuyPrice: newAvg
            }
        } else {
            // Selling: Increase cash, decrease quantity
            cash.value += quantity * price

            const newQuantity = previousHolding.quantity - quantity

            if (newQuantity <= 0) {
                delete currentHoldings[itemId]
            } else {
                currentHoldings[itemId] = {
                    ...previousHolding,
                    quantity: newQuantity
                }
            }
        }

        holdings.value = currentHoldings
        transactions.value = [newTx, ...transactions.value]

        // Persist to localStorage
        localStorage.setItem('portfolio-store', JSON.stringify({
            cash: cash.value,
            holdings: currentHoldings,
            transactions: transactions.value
        }))
    }

    const setCash = (amount: number) => {
        cash.value = amount
        localStorage.setItem('portfolio-store', JSON.stringify({
            cash: cash.value,
            holdings: holdings.value,
            transactions: transactions.value
        }))
    }

    const resetPortfolio = () => {
        cash.value = 10000000
        holdings.value = {}
        transactions.value = []
        localStorage.removeItem('portfolio-store')
    }

    const loadFromStorage = () => {
        const saved = localStorage.getItem('portfolio-store')
        if (saved) {
            try {
                const parsed = JSON.parse(saved)
                cash.value = parsed.cash || 10000000
                holdings.value = parsed.holdings || {}
                transactions.value = parsed.transactions || []
            } catch (e) {
                console.error('Failed to load portfolio from storage:', e)
            }
        }
    }

    // Load initial state
    loadFromStorage()

    return {
        // State
        cash,
        holdings,
        transactions,

        // Computed
        totalValue,
        portfolioItems,

        // Actions
        addTransaction,
        setCash,
        resetPortfolio,
        loadFromStorage
    }
})
