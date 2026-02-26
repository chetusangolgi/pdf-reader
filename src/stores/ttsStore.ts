import { create } from 'zustand';

interface TTSState {
  isPlaying: boolean;
  isPaused: boolean;
  currentBlockIndex: number;
  currentWordIndex: number;
  voice: SpeechSynthesisVoice | null;
  availableVoices: SpeechSynthesisVoice[];
  rate: number;
  pitch: number;
  volume: number;

  setPlaying: (playing: boolean) => void;
  setPaused: (paused: boolean) => void;
  setCurrentBlock: (index: number) => void;
  setCurrentWord: (index: number) => void;
  setVoice: (voice: SpeechSynthesisVoice | null) => void;
  setAvailableVoices: (voices: SpeechSynthesisVoice[]) => void;
  setRate: (rate: number) => void;
  setPitch: (pitch: number) => void;
  setVolume: (volume: number) => void;
  stop: () => void;
}

export const useTTSStore = create<TTSState>((set) => ({
  isPlaying: false,
  isPaused: false,
  currentBlockIndex: -1,
  currentWordIndex: -1,
  voice: null,
  availableVoices: [],
  rate: 1,
  pitch: 1,
  volume: 1,

  setPlaying: (isPlaying) => set({ isPlaying }),
  setPaused: (isPaused) => set({ isPaused }),
  setCurrentBlock: (currentBlockIndex) => set({ currentBlockIndex }),
  setCurrentWord: (currentWordIndex) => set({ currentWordIndex }),
  setVoice: (voice) => set({ voice }),
  setAvailableVoices: (availableVoices) => set({ availableVoices }),
  setRate: (rate) => set({ rate }),
  setPitch: (pitch) => set({ pitch }),
  setVolume: (volume) => set({ volume }),
  stop: () => set({ isPlaying: false, isPaused: false, currentBlockIndex: -1, currentWordIndex: -1 }),
}));
