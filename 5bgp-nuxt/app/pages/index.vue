<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Market Overview</h1>
      <client-only>
        <span class="text-sm text-gray-500">Last updated: {{ new Date().toLocaleTimeString() }}</span>
      </client-only>
    </div>

    <!-- Stats Grid Placeholder -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div v-for="i in 4" :key="i" class="p-6 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse h-32"></div>
    </div>

    <!-- Charts Placeholder -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="p-6 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse h-96"></div>
      <div class="p-6 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse h-96"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
useHead({
  title: 'Dashboard - Flip to 5B',
  meta: [
    { name: 'description', content: 'Real-time Grand Exchange trading dashboard' }
  ]
})
</script>
