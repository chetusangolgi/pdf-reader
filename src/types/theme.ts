export interface ThemeColors {
  background: string;
  text: string;
  accent: string;
  highlight: string;
  surface: string;
}

export interface Theme {
  id: string;
  name: string;
  colors: ThemeColors;
  isBuiltIn: boolean;
}

export const BUILT_IN_THEMES: Theme[] = [
  {
    id: 'light',
    name: 'Clean Light',
    colors: {
      background: '#FFFFFF',
      text: '#1A1A1A',
      accent: '#2563EB',
      highlight: '#FBBF24',
      surface: '#F3F4F6',
    },
    isBuiltIn: true,
  },
  {
    id: 'ultra-dark',
    name: 'Ultra-Dark Charcoal',
    colors: {
      background: '#1A1A1A',
      text: '#F4F4F4',
      accent: '#6BA3F7',
      highlight: '#FBBF24',
      surface: '#2A2A2A',
    },
    isBuiltIn: true,
  },
  {
    id: 'warm-sepia',
    name: 'Classic Warm Sepia',
    colors: {
      background: '#E5C287',
      text: '#222222',
      accent: '#8B4513',
      highlight: '#D4A047',
      surface: '#D9B577',
    },
    isBuiltIn: true,
  },
  {
    id: 'dyslexia-peach',
    name: 'Dyslexia Peach',
    colors: {
      background: '#EDD1B0',
      text: '#000000',
      accent: '#A0522D',
      highlight: '#DCA068',
      surface: '#E0C29E',
    },
    isBuiltIn: true,
  },
  {
    id: 'dyslexia-yellow',
    name: 'Dyslexia Yellow',
    colors: {
      background: '#F8FD89',
      text: '#000000',
      accent: '#8B8000',
      highlight: '#E0E070',
      surface: '#ECF07A',
    },
    isBuiltIn: true,
  },
  {
    id: 'dyslexia-green',
    name: 'Dyslexia Green',
    colors: {
      background: '#A8F29A',
      text: '#000000',
      accent: '#2E7D32',
      highlight: '#80C878',
      surface: '#96E088',
    },
    isBuiltIn: true,
  },
];
