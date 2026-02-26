import { create } from 'zustand';

export interface AmbientSound {
  id: string;
  name: string;
  icon: string;
  category: 'nature' | 'indoor' | 'urban' | 'abstract';
  isActive: boolean;
  volume: number;
}

const DEFAULT_SOUNDS: AmbientSound[] = [
  { id: 'rain', name: 'Rain', icon: 'CloudRain', category: 'nature', isActive: false, volume: 0.5 },
  { id: 'ocean', name: 'Ocean', icon: 'Waves', category: 'nature', isActive: false, volume: 0.5 },
  { id: 'forest', name: 'Forest', icon: 'TreePine', category: 'nature', isActive: false, volume: 0.5 },
  { id: 'cafe', name: 'Cafe', icon: 'Coffee', category: 'indoor', isActive: false, volume: 0.5 },
  { id: 'fireplace', name: 'Fireplace', icon: 'Flame', category: 'indoor', isActive: false, volume: 0.5 },
  { id: 'library', name: 'Library', icon: 'BookOpen', category: 'indoor', isActive: false, volume: 0.5 },
];

interface AudioState {
  masterVolume: number;
  sounds: AmbientSound[];
  isInitialized: boolean;

  setMasterVolume: (volume: number) => void;
  toggleSound: (id: string) => void;
  setSoundVolume: (id: string, volume: number) => void;
  setInitialized: (initialized: boolean) => void;
}

export const useAudioStore = create<AudioState>((set) => ({
  masterVolume: 0.5,
  sounds: DEFAULT_SOUNDS,
  isInitialized: false,

  setMasterVolume: (masterVolume) => set({ masterVolume }),
  toggleSound: (id) =>
    set((state) => ({
      sounds: state.sounds.map((s) =>
        s.id === id ? { ...s, isActive: !s.isActive } : s
      ),
    })),
  setSoundVolume: (id, volume) =>
    set((state) => ({
      sounds: state.sounds.map((s) =>
        s.id === id ? { ...s, volume } : s
      ),
    })),
  setInitialized: (isInitialized) => set({ isInitialized }),
}));
