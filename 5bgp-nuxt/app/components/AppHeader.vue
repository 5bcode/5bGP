<template>
  <nav class="h-16 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center justify-between px-4 md:px-8 shrink-0">
    <!-- Left: Logo & Links -->
    <div class="flex items-center gap-8">
      <NuxtLink to="/" class="flex items-center gap-2 text-yellow-500 font-bold text-lg hover:opacity-90 transition-opacity">
        <UIcon name="i-lucide-coins" class="text-xl" />
        <span class="hidden sm:block">Flip to 5B</span>
      </NuxtLink>

      <div class="hidden md:flex items-center gap-1">
        <NuxtLink
          v-for="link in navLinks"
          :key="link.to"
          :to="link.to"
          active-class="text-primary-600 bg-gray-100 dark:text-primary-400 dark:bg-gray-800"
          class="px-4 py-2 rounded-lg text-sm font-medium transition-colors text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-800/50"
        >
          {{ link.label }}
        </NuxtLink>
      </div>
    </div>

    <!-- Right: Search & Actions -->
    <div class="flex items-center gap-4">
      <form @submit.prevent="handleSearch" class="relative hidden sm:block group">
        <UIcon name="i-lucide-search" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-yellow-500 transition-colors text-xs" />
        <input
          v-model="search"
          type="text"
          placeholder="Search items..."
          class="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-full py-1.5 pl-9 pr-4 text-sm w-48 focus:w-64 transition-all focus:outline-none focus:border-yellow-500 placeholder:text-gray-400/50"
        />
      </form>

      <div class="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-2 hidden sm:block"></div>

      <NuxtLink to="/pricing" target="_blank" class="text-sm font-bold text-green-600 hover:text-green-500 transition-colors flex items-center gap-2">
        <span>Upgrade now</span>
      </NuxtLink>

      <button
        @click="cycleTheme"
        class="p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
        :title="`Current theme: ${preferences.theme}`"
      >
        <UIcon name="i-lucide-palette" class="text-sm" />
      </button>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { usePreferencesStore } from '~/stores/preferences'

const router = useRouter()
const preferences = usePreferencesStore()
const search = ref('')

const navLinks = [
  { to: "/", label: "Market highlights" },
  { to: "/screener", label: "Item screener" },
  { to: "/compare", label: "Compare" },
  { to: "/performance", label: "Performance" },
  { to: "/portfolio", label: "Portfolio" },
  { to: "/alerts", label: "Alerts" },
]

const handleSearch = () => {
  if (search.value.trim()) {
    router.push({ path: '/screener', query: { search: search.value } })
  }
}

const cycleTheme = () => {
  const themes = ['molten', 'midnight', 'runelite'] as const
  const currentIndex = themes.indexOf(preferences.theme)
  const nextTheme = themes[(currentIndex + 1) % themes.length]
  preferences.setTheme(nextTheme)
}
</script>
