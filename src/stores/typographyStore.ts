import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TypographySettings } from '@/types/typography';
import { DEFAULT_TYPOGRAPHY } from '@/types/typography';

interface TypographyState extends TypographySettings {
  // Computed
  maxWidth: number;

  // Actions
  setFontFamily: (fontFamily: string) => void;
  setFontSize: (fontSize: number) => void;
  setLineHeight: (lineHeight: number) => void;
  setLetterSpacing: (letterSpacing: number) => void;
  setWordSpacing: (wordSpacing: number) => void;
  setParagraphSpacing: (paragraphSpacing: number) => void;
  setMaxCharsPerLine: (maxCharsPerLine: number) => void;
  setMargins: (margins: { top?: number; bottom?: number; left?: number; right?: number }) => void;
  setTextAlign: (textAlign: 'left' | 'justify') => void;
  setHyphenation: (hyphenation: boolean) => void;
  resetToDefaults: () => void;
}

function computeMaxWidth(fontSize: number, maxCharsPerLine: number): number {
  // Approximate: 1 character ≈ 0.55em for proportional fonts
  return Math.round(fontSize * 0.55 * maxCharsPerLine);
}

export const useTypographyStore = create<TypographyState>()(
  persist(
    (set) => ({
      ...DEFAULT_TYPOGRAPHY,
      maxWidth: computeMaxWidth(DEFAULT_TYPOGRAPHY.fontSize, DEFAULT_TYPOGRAPHY.maxCharsPerLine),

      setFontFamily: (fontFamily) => set({ fontFamily }),
      setFontSize: (fontSize) =>
        set((state) => ({
          fontSize,
          maxWidth: computeMaxWidth(fontSize, state.maxCharsPerLine),
        })),
      setLineHeight: (lineHeight) => set({ lineHeight }),
      setLetterSpacing: (letterSpacing) => set({ letterSpacing }),
      setWordSpacing: (wordSpacing) => set({ wordSpacing }),
      setParagraphSpacing: (paragraphSpacing) => set({ paragraphSpacing }),
      setMaxCharsPerLine: (maxCharsPerLine) =>
        set((state) => ({
          maxCharsPerLine,
          maxWidth: computeMaxWidth(state.fontSize, maxCharsPerLine),
        })),
      setMargins: (margins) =>
        set((state) => ({
          marginTop: margins.top ?? state.marginTop,
          marginBottom: margins.bottom ?? state.marginBottom,
          marginLeft: margins.left ?? state.marginLeft,
          marginRight: margins.right ?? state.marginRight,
        })),
      setTextAlign: (textAlign) => set({ textAlign }),
      setHyphenation: (hyphenation) => set({ hyphenation }),
      resetToDefaults: () =>
        set({
          ...DEFAULT_TYPOGRAPHY,
          maxWidth: computeMaxWidth(DEFAULT_TYPOGRAPHY.fontSize, DEFAULT_TYPOGRAPHY.maxCharsPerLine),
        }),
    }),
    {
      name: 'rick-peruse-typography',
    }
  )
);
