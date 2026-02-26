import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Theme } from '@/types/theme';
import { BUILT_IN_THEMES } from '@/types/theme';

interface ThemeState {
  activeThemeId: string;
  customThemes: Theme[];

  // Computed
  activeTheme: Theme;

  // Actions
  setActiveTheme: (id: string) => void;
  addCustomTheme: (theme: Theme) => void;
  removeCustomTheme: (id: string) => void;
}

function findTheme(id: string, customThemes: Theme[]): Theme {
  const all = [...BUILT_IN_THEMES, ...customThemes];
  return all.find((t) => t.id === id) || BUILT_IN_THEMES[0];
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      activeThemeId: 'light',
      customThemes: [],
      activeTheme: BUILT_IN_THEMES[0],

      setActiveTheme: (id) =>
        set({
          activeThemeId: id,
          activeTheme: findTheme(id, get().customThemes),
        }),

      addCustomTheme: (theme) =>
        set((state) => ({
          customThemes: [...state.customThemes, theme],
        })),

      removeCustomTheme: (id) =>
        set((state) => {
          const customThemes = state.customThemes.filter((t) => t.id !== id);
          const activeThemeId = state.activeThemeId === id ? 'light' : state.activeThemeId;
          return {
            customThemes,
            activeThemeId,
            activeTheme: findTheme(activeThemeId, customThemes),
          };
        }),
    }),
    {
      name: 'rick-peruse-theme',
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.activeTheme = findTheme(state.activeThemeId, state.customThemes);
        }
      },
    }
  )
);
