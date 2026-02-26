'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useTTSStore } from '@/stores/ttsStore';
import type { ReflowedBlock } from '@/lib/pdf/reflow';

export function useTTS(blocks: ReflowedBlock[]) {
  const store = useTTSStore();
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const blocksRef = useRef(blocks);
  blocksRef.current = blocks;

  // Load available voices
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const loadVoices = () => {
      const voices = speechSynthesis.getVoices();
      store.setAvailableVoices(voices);
      if (!store.voice && voices.length > 0) {
        // Prefer an English voice
        const english = voices.find((v) => v.lang.startsWith('en'));
        store.setVoice(english || voices[0]);
      }
    };

    loadVoices();
    speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => speechSynthesis.removeEventListener('voiceschanged', loadVoices);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const speakBlock = useCallback(
    (blockIndex: number) => {
      const currentBlocks = blocksRef.current;
      if (blockIndex < 0 || blockIndex >= currentBlocks.length) {
        store.stop();
        speechSynthesis.cancel();
        return;
      }

      const block = currentBlocks[blockIndex];
      // Skip non-text blocks
      if (block.type === 'page-break') {
        speakBlock(blockIndex + 1);
        return;
      }

      const text = block.content;
      if (!text.trim()) {
        speakBlock(blockIndex + 1);
        return;
      }

      store.setCurrentBlock(blockIndex);
      store.setCurrentWord(-1);

      const utterance = new SpeechSynthesisUtterance(text);
      utteranceRef.current = utterance;

      const state = useTTSStore.getState();
      if (state.voice) utterance.voice = state.voice;
      utterance.rate = state.rate;
      utterance.pitch = state.pitch;
      utterance.volume = state.volume;

      // Word boundary tracking
      utterance.onboundary = (event) => {
        if (event.name === 'word') {
          // Count which word this is
          const textBefore = text.substring(0, event.charIndex);
          const wordIndex = textBefore.split(/\s+/).filter(Boolean).length;
          store.setCurrentWord(wordIndex);

          // Auto-scroll to keep the active block visible
          const el = document.querySelector(`[data-block-index="${blockIndex}"]`);
          if (el) {
            const rect = el.getBoundingClientRect();
            if (rect.bottom > window.innerHeight * 0.8 || rect.top < 0) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }
        }
      };

      utterance.onend = () => {
        // Move to next block
        const currentState = useTTSStore.getState();
        if (currentState.isPlaying) {
          speakBlock(blockIndex + 1);
        }
      };

      utterance.onerror = (event) => {
        if (event.error !== 'canceled') {
          console.error('TTS error:', event.error);
        }
      };

      speechSynthesis.speak(utterance);
    },
    [store]
  );

  const play = useCallback(
    (fromBlock?: number) => {
      speechSynthesis.cancel();
      store.setPlaying(true);
      store.setPaused(false);

      const startBlock = fromBlock ?? Math.max(store.currentBlockIndex, 0);
      speakBlock(startBlock);
    },
    [store, speakBlock]
  );

  const pause = useCallback(() => {
    speechSynthesis.pause();
    store.setPaused(true);
  }, [store]);

  const resume = useCallback(() => {
    speechSynthesis.resume();
    store.setPaused(false);
  }, [store]);

  const stop = useCallback(() => {
    speechSynthesis.cancel();
    store.stop();
  }, [store]);

  const skipForward = useCallback(() => {
    speechSynthesis.cancel();
    const next = store.currentBlockIndex + 1;
    if (next < blocksRef.current.length) {
      speakBlock(next);
    }
  }, [store, speakBlock]);

  const skipBackward = useCallback(() => {
    speechSynthesis.cancel();
    const prev = Math.max(store.currentBlockIndex - 1, 0);
    speakBlock(prev);
  }, [store, speakBlock]);

  return {
    play,
    pause,
    resume,
    stop,
    skipForward,
    skipBackward,
    isPlaying: store.isPlaying,
    isPaused: store.isPaused,
    currentBlockIndex: store.currentBlockIndex,
    currentWordIndex: store.currentWordIndex,
  };
}
