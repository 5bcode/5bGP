import { defineStore } from 'pinia'
import { useLocalStorage } from '@vueuse/core'

export type Theme = 'molten' | 'runelite' | 'midnight'

export const usePreferencesStore = defineStore('preferences', () => {
    const favorites = useLocalStorage<number[]>('preferences-favorites', [])
    const theme = useLocalStorage<Theme>('preferences-theme', 'molten')

    function toggleFavorite(itemId: number) {
        if (favorites.value.includes(itemId)) {
            favorites.value = favorites.value.filter(id => id !== itemId)
        } else {
            favorites.value.push(itemId)
        }
    }

    function setTheme(newTheme: Theme) {
        theme.value = newTheme
    }

    function resetPreferences() {
        favorites.value = []
        theme.value = 'molten'
    }

    return {
        favorites,
        theme,
        toggleFavorite,
        setTheme,
        resetPreferences
    }
})
