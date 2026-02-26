'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAudioStore } from '@/stores/audioStore';
import { SoundscapeEngine } from '@/lib/audio/ambient';

export function useAmbientAudio() {
  const engineRef = useRef<SoundscapeEngine | null>(null);
  const { sounds, masterVolume, isInitialized, setInitialized } = useAudioStore();

  const initialize = useCallback(async () => {
    if (engineRef.current) return;
    const engine = new SoundscapeEngine();
    await engine.initialize();
    engineRef.current = engine;
    setInitialized(true);
  }, [setInitialized]);

  // Sync sound state with engine
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !isInitialized) return;

    for (const sound of sounds) {
      if (sound.isActive) {
        engine.startSound(sound.id, sound.volume);
      } else {
        engine.stopSound(sound.id);
      }
    }
  }, [sounds, isInitialized]);

  // Sync master volume
  useEffect(() => {
    engineRef.current?.setMasterVolume(masterVolume);
  }, [masterVolume]);

  // Sync individual volumes
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    for (const sound of sounds) {
      if (sound.isActive) {
        engine.setVolume(sound.id, sound.volume);
      }
    }
  }, [sounds]);

  // Cleanup
  useEffect(() => {
    return () => {
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, []);

  return { initialize, isInitialized };
}
