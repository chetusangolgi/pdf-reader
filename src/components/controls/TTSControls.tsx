'use client';

import { useTTSStore } from '@/stores/ttsStore';
import { Slider } from '@/components/ui/Slider';
import { Play, Pause, Square, SkipBack, SkipForward } from 'lucide-react';

interface TTSControlsProps {
  onPlay: (fromBlock?: number) => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onSkipForward: () => void;
  onSkipBackward: () => void;
}

export function TTSControls({
  onPlay,
  onPause,
  onResume,
  onStop,
  onSkipForward,
  onSkipBackward,
}: TTSControlsProps) {
  const { isPlaying, isPaused, rate, pitch, volume, voice, availableVoices, setRate, setPitch, setVolume, setVoice } =
    useTTSStore();

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-semibold">Text-to-Speech</h3>

      {/* Playback Controls */}
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={onSkipBackward}
          className="rounded-full p-2 hover:bg-white/10 transition-colors"
          aria-label="Previous paragraph"
          disabled={!isPlaying}
        >
          <SkipBack className="h-4 w-4" />
        </button>

        {!isPlaying ? (
          <button
            onClick={() => onPlay()}
            className="rounded-full bg-[var(--reader-accent)] p-3 text-white hover:opacity-90 transition-opacity"
            aria-label="Play"
          >
            <Play className="h-5 w-5" />
          </button>
        ) : isPaused ? (
          <button
            onClick={onResume}
            className="rounded-full bg-[var(--reader-accent)] p-3 text-white hover:opacity-90 transition-opacity"
            aria-label="Resume"
          >
            <Play className="h-5 w-5" />
          </button>
        ) : (
          <button
            onClick={onPause}
            className="rounded-full bg-[var(--reader-accent)] p-3 text-white hover:opacity-90 transition-opacity"
            aria-label="Pause"
          >
            <Pause className="h-5 w-5" />
          </button>
        )}

        <button
          onClick={onStop}
          className="rounded-full p-2 hover:bg-white/10 transition-colors"
          aria-label="Stop"
          disabled={!isPlaying}
        >
          <Square className="h-4 w-4" />
        </button>

        <button
          onClick={onSkipForward}
          className="rounded-full p-2 hover:bg-white/10 transition-colors"
          aria-label="Next paragraph"
          disabled={!isPlaying}
        >
          <SkipForward className="h-4 w-4" />
        </button>
      </div>

      {/* Voice Selection */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium opacity-70">Voice</label>
        <select
          value={voice?.name || ''}
          onChange={(e) => {
            const v = availableVoices.find((av) => av.name === e.target.value);
            if (v) setVoice(v);
          }}
          className="rounded bg-white/10 px-2 py-1.5 text-xs"
          aria-label="Select voice"
        >
          {availableVoices.map((v) => (
            <option key={v.name} value={v.name}>
              {v.name} ({v.lang})
            </option>
          ))}
        </select>
      </div>

      <Slider label="Speed" value={rate} min={0.5} max={3} step={0.1} unit="x" onChange={setRate} />
      <Slider label="Pitch" value={pitch} min={0.5} max={2} step={0.1} onChange={setPitch} />
      <Slider label="Volume" value={volume} min={0} max={1} step={0.05} onChange={setVolume} />
    </div>
  );
}
