<template>
  <div class="p-6 bg-gray-100 dark:bg-gray-800 rounded-lg">
    <h3 class="text-lg font-bold mb-4">{{ title }}</h3>
    <Line :data="chartData" :options="chartOptions" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js'
import type { EnhancedMarketItem } from '../../composables/useMarketData'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

const props = defineProps<{
  title: string
  items: EnhancedMarketItem[]
  dataKey: keyof EnhancedMarketItem
  label: string
}>()

const chartData = computed(() => ({
  labels: props.items.map(item => item.name),
  datasets: [
    {
      label: props.label,
      backgroundColor: '#f87979',
      data: props.items.map(item => item[props.dataKey]),
    },
  ],
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
}
</script>
