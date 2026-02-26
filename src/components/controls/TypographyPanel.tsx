'use client';

import { useTypographyStore } from '@/stores/typographyStore';
import { FONT_OPTIONS } from '@/types/typography';
import { Slider } from '@/components/ui/Slider';
import { RotateCcw } from 'lucide-react';

export function TypographyPanel() {
  const store = useTypographyStore();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Typography</h3>
        <button
          onClick={store.resetToDefaults}
          className="rounded p-1 opacity-50 hover:opacity-100 transition-opacity"
          aria-label="Reset typography to defaults"
          title="Reset to defaults"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Font Family */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium opacity-70">Font Family</label>
        <select
          value={store.fontFamily}
          onChange={(e) => store.setFontFamily(e.target.value)}
          className="rounded bg-white/10 px-2 py-1.5 text-xs"
          aria-label="Font family"
        >
          {FONT_OPTIONS.map((f) => (
            <option key={f.name} value={f.value} style={{ fontFamily: f.value }}>
              {f.name}
            </option>
          ))}
        </select>
      </div>

      <Slider label="Font Size" value={store.fontSize} min={12} max={32} step={1} unit="px" onChange={store.setFontSize} />
      <Slider label="Line Height" value={store.lineHeight} min={1.2} max={3} step={0.1} unit="em" onChange={store.setLineHeight} />
      <Slider label="Letter Spacing" value={store.letterSpacing} min={0} max={0.3} step={0.01} unit="em" onChange={store.setLetterSpacing} />
      <Slider label="Word Spacing" value={store.wordSpacing} min={0} max={0.5} step={0.01} unit="em" onChange={store.setWordSpacing} />
      <Slider label="Paragraph Spacing" value={store.paragraphSpacing} min={0.5} max={4} step={0.1} unit="em" onChange={store.setParagraphSpacing} />
      <Slider label="Chars per Line" value={store.maxCharsPerLine} min={40} max={90} step={1} onChange={store.setMaxCharsPerLine} />

      {/* Text Align */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium opacity-70">Text Alignment</label>
        <div className="flex gap-1">
          {(['left', 'justify'] as const).map((align) => (
            <button
              key={align}
              onClick={() => store.setTextAlign(align)}
              className={`flex-1 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                store.textAlign === align
                  ? 'bg-[var(--reader-accent)] text-white'
                  : 'bg-white/10 hover:bg-white/20'
              }`}
              aria-pressed={store.textAlign === align}
            >
              {align === 'left' ? 'Left' : 'Justify'}
            </button>
          ))}
        </div>
      </div>

      {/* Hyphenation */}
      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={store.hyphenation}
          onChange={(e) => store.setHyphenation(e.target.checked)}
          className="rounded accent-[var(--reader-accent)]"
        />
        Enable hyphenation
      </label>

      {/* Margins */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium opacity-70">Margins (px)</span>
        <div className="grid grid-cols-2 gap-2">
          <Slider label="Top" value={store.marginTop} min={0} max={80} step={4} onChange={(v) => store.setMargins({ top: v })} />
          <Slider label="Bottom" value={store.marginBottom} min={0} max={80} step={4} onChange={(v) => store.setMargins({ bottom: v })} />
          <Slider label="Left" value={store.marginLeft} min={0} max={80} step={4} onChange={(v) => store.setMargins({ left: v })} />
          <Slider label="Right" value={store.marginRight} min={0} max={80} step={4} onChange={(v) => store.setMargins({ right: v })} />
        </div>
      </div>
    </div>
  );
}
