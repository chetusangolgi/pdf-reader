'use client';

import { useAudioStore } from '@/stores/audioStore';
import { useAmbientAudio } from '@/hooks/useAmbientAudio';
import { Slider } from '@/components/ui/Slider';
import {
  CloudRain,
  Waves,
  TreePine,
  Coffee,
  Flame,
  BookOpen,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ElementType> = {
  CloudRain,
  Waves,
  TreePine,
  Coffee,
  Flame,
  BookOpen,
};

export function AmbientAudioPanel() {
  const { sounds, masterVolume, setMasterVolume, toggleSound, setSoundVolume } =
    useAudioStore();
  const { initialize, isInitialized } = useAmbientAudio();

  const handleToggle = async (id: string) => {
    if (!isInitialized) await initialize();
    toggleSound(id);
  };

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-semibold">Ambient Audio</h3>

      <Slider
        label="Master Volume"
        value={masterVolume}
        min={0}
        max={1}
        step={0.05}
        onChange={setMasterVolume}
      />

      <div className="grid grid-cols-3 gap-2">
        {sounds.map((sound) => {
          const Icon = ICON_MAP[sound.icon] || BookOpen;
          return (
            <div key={sound.id} className="flex flex-col items-center gap-1">
              <button
                onClick={() => handleToggle(sound.id)}
                className={`flex h-14 w-full flex-col items-center justify-center gap-1 rounded-lg transition-all ${
                  sound.isActive
                    ? 'bg-[var(--reader-accent)]/20 ring-1 ring-[var(--reader-accent)]'
                    : 'bg-white/5 hover:bg-white/10'
                }`}
                aria-pressed={sound.isActive}
                aria-label={`${sound.name} ambient sound`}
              >
                <Icon className="h-4 w-4" />
                <span className="text-[10px]">{sound.name}</span>
              </button>
              {sound.isActive && (
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={sound.volume}
                  onChange={(e) => setSoundVolume(sound.id, parseFloat(e.target.value))}
                  className="h-1 w-full cursor-pointer appearance-none rounded-full bg-current/20 accent-[var(--reader-accent)]"
                  aria-label={`${sound.name} volume`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
