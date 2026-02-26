'use client';

import { X } from 'lucide-react';

const HIGHLIGHT_COLORS = [
  { name: 'Yellow', value: '#fbbf24' },
  { name: 'Green', value: '#34d399' },
  { name: 'Blue', value: '#60a5fa' },
  { name: 'Pink', value: '#f472b6' },
  { name: 'Orange', value: '#fb923c' },
];

interface HighlightToolbarProps {
  position: { x: number; y: number };
  onSelectColor: (color: string) => void;
  onDismiss: () => void;
}

export function HighlightToolbar({ position, onSelectColor, onDismiss }: HighlightToolbarProps) {
  return (
    <div
      className="fixed z-50 flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 shadow-xl"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -100%) translateY(-8px)',
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {HIGHLIGHT_COLORS.map((color) => (
        <button
          key={color.value}
          onClick={() => onSelectColor(color.value)}
          className="h-6 w-6 rounded-full border-2 border-transparent hover:border-white/50 transition-colors"
          style={{ background: color.value }}
          aria-label={`Highlight ${color.name}`}
          title={color.name}
        />
      ))}
      <button
        onClick={onDismiss}
        className="ml-1 rounded p-1 text-zinc-400 hover:text-white transition-colors"
        aria-label="Cancel"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
