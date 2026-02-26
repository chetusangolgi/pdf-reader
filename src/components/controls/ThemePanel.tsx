'use client';

import { useState } from 'react';
import { useThemeStore } from '@/stores/themeStore';
import { BUILT_IN_THEMES } from '@/types/theme';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { checkContrast } from '@/lib/theme/colorScience';

export function ThemePanel() {
  const { activeThemeId, setActiveTheme, addCustomTheme, customThemes } = useThemeStore();
  const [customBg, setCustomBg] = useState('#1e1e2e');
  const [customText, setCustomText] = useState('#cdd6f4');

  const allThemes = [...BUILT_IN_THEMES, ...customThemes];
  const contrast = checkContrast(customBg, customText);

  const handleCreateCustom = () => {
    const id = `custom-${Date.now()}`;
    addCustomTheme({
      id,
      name: 'Custom Theme',
      colors: {
        background: customBg,
        text: customText,
        accent: '#6ba3f7',
        highlight: '#fbbf24',
        surface: customBg === '#1e1e2e' ? '#313244' : '#e0e0e0',
      },
      isBuiltIn: false,
    });
    setActiveTheme(id);
  };

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-semibold">Theme</h3>

      {/* Theme Swatches */}
      <div className="grid grid-cols-3 gap-2">
        {allThemes.map((theme) => (
          <button
            key={theme.id}
            onClick={() => setActiveTheme(theme.id)}
            className={`flex flex-col items-center gap-1 rounded-lg p-2 transition-all ${
              activeThemeId === theme.id
                ? 'ring-2 ring-[var(--reader-accent)]'
                : 'hover:ring-1 hover:ring-white/20'
            }`}
            aria-pressed={activeThemeId === theme.id}
            aria-label={`${theme.name} theme`}
          >
            <div
              className="h-8 w-full rounded"
              style={{
                background: theme.colors.background,
                border: '1px solid rgba(128,128,128,0.3)',
              }}
            >
              <span
                className="flex h-full items-center justify-center text-[10px] font-medium"
                style={{ color: theme.colors.text }}
              >
                Aa
              </span>
            </div>
            <span className="text-[10px] leading-tight opacity-60">
              {theme.name.length > 12 ? theme.name.slice(0, 12) + '...' : theme.name}
            </span>
          </button>
        ))}
      </div>

      {/* Custom Theme Creator */}
      <div className="flex flex-col gap-3 rounded-lg bg-white/5 p-3">
        <span className="text-xs font-semibold opacity-70">Custom Theme</span>
        <ColorPicker label="Background" value={customBg} onChange={setCustomBg} />
        <ColorPicker label="Text" value={customText} onChange={setCustomText} />

        {/* Contrast Ratio */}
        <div className="flex items-center gap-2 text-xs">
          <span className="opacity-50">Contrast:</span>
          <span
            className={`font-mono font-bold ${
              contrast.aa ? 'text-green-400' : 'text-red-400'
            }`}
          >
            {contrast.ratio}:1
          </span>
          {contrast.aaa && (
            <span className="rounded bg-green-800/50 px-1.5 py-0.5 text-[10px] text-green-300">
              AAA
            </span>
          )}
          {contrast.aa && !contrast.aaa && (
            <span className="rounded bg-yellow-800/50 px-1.5 py-0.5 text-[10px] text-yellow-300">
              AA
            </span>
          )}
          {!contrast.aa && (
            <span className="rounded bg-red-800/50 px-1.5 py-0.5 text-[10px] text-red-300">
              Fail
            </span>
          )}
        </div>

        <button
          onClick={handleCreateCustom}
          disabled={!contrast.aa}
          className="rounded bg-[var(--reader-accent)] px-3 py-1.5 text-xs font-medium text-white transition-opacity disabled:opacity-30"
        >
          Apply Custom Theme
        </button>
      </div>
    </div>
  );
}
