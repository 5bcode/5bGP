<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Market Overview</h1>
      <client-only>
        <span class="text-sm text-gray-500" v-if="!isLoading">Last updated: {{ lastUpdated }}</span>
        <span class="text-sm text-gray-500" v-else>Loading...</span>
      </client-only>
    </div>

    <div v-if="isLoading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div v-for="i in 4" :key="i" class="p-6 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse h-32"></div>
    </div>

    <div v-else-if="error" class="text-red-500">
      Error loading market data: {{ error.message }}
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div v-for="item in topItems.slice(0, 4)" :key="item.id" class="p-6 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <h3 class="font-bold">{{ item.name }}</h3>
        <p>Score: {{ item.flipperScore.toFixed(2) }}</p>
        <p>Profit: {{ item.margin.toLocaleString() }}</p>
        <p>ROI: {{ (item.roi * 100).toFixed(2) }}%</p>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <MarketChart title="Top 10 Flipper Score" :items="topItems" dataKey="flipperScore" label="Flipper Score" />
      <MarketChart title="Top 10 Potential Profit" :items="topItems" dataKey="potentialProfit" label="Potential Profit" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useMarketData } from '../../composables/useMarketData'
import type { EnhancedMarketItem } from '../../composables/useMarketData'
import MarketChart from '~/components/MarketChart.vue'

useHead({
  title: 'Dashboard - Flip to 5B',
  meta: [
    { name: 'description', content: 'Real-time Grand Exchange trading dashboard' }
  ]
})

const { items, isLoading, error, refresh } = useMarketData()
const lastUpdated = ref(new Date().toLocaleTimeString())

const topItems = computed(() => {
  return items.value
    .slice()
    .sort((a, b) => b.flipperScore - a.flipperScore)
    .slice(0, 10)
})

onMounted(() => {
  const interval = setInterval(() => {
    refresh()
    lastUpdated.value = new Date().toLocaleTimeString()
  }, 60000)

  onUnmounted(() => {
    clearInterval(interval)
  })
})
</script>
