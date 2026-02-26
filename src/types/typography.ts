export interface TypographySettings {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  wordSpacing: number;
  paragraphSpacing: number;
  maxCharsPerLine: number;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  textAlign: 'left' | 'justify';
  hyphenation: boolean;
}

export interface FontOption {
  name: string;
  value: string;
}

export const FONT_OPTIONS: FontOption[] = [
  { name: 'System Sans', value: 'system-ui, -apple-system, sans-serif' },
  { name: 'System Serif', value: 'Georgia, "Times New Roman", serif' },
  { name: 'Inter', value: 'var(--font-inter), sans-serif' },
  { name: 'IBM Plex Sans', value: 'var(--font-ibm-plex-sans), sans-serif' },
  { name: 'IBM Plex Serif', value: 'var(--font-ibm-plex-serif), serif' },
  { name: 'Literata', value: 'var(--font-literata), serif' },
  { name: 'OpenDyslexic', value: '"OpenDyslexic", sans-serif' },
];

export const DEFAULT_TYPOGRAPHY: TypographySettings = {
  fontFamily: 'system-ui, -apple-system, sans-serif',
  fontSize: 18,
  lineHeight: 1.6,
  letterSpacing: 0.02,
  wordSpacing: 0.05,
  paragraphSpacing: 1.5,
  maxCharsPerLine: 66,
  marginTop: 24,
  marginBottom: 24,
  marginLeft: 24,
  marginRight: 24,
  textAlign: 'left',
  hyphenation: false,
};
