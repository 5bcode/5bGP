import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PreferencesState {
    favorites: number[];
    theme: 'molten' | 'runelite' | 'midnight';

    // Actions
    toggleFavorite: (itemId: number) => void;
    setTheme: (theme: 'molten' | 'runelite' | 'midnight') => void;
    resetPreferences: () => void;
}

export const usePreferencesStore = create<PreferencesState>()(
    persist(
        (set) => ({
            favorites: [],
            theme: 'molten',

            toggleFavorite: (itemId) => set((state) => {
                const isFav = state.favorites.includes(itemId);
                return {
                    favorites: isFav
                        ? state.favorites.filter(id => id !== itemId)
                        : [...state.favorites, itemId]
                };
            }),

            setTheme: (theme) => set({ theme }),

            resetPreferences: () => set({ favorites: [], theme: 'molten' }),
        }),
        {
            name: 'flip-to-5b-preferences',
        }
    )
);
