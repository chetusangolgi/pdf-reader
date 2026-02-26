'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useReaderStore } from '@/stores/readerStore';
import { useThemeStore } from '@/stores/themeStore';
import { useAnnotationStore } from '@/stores/annotationStore';
import { ReflowedContent } from '@/components/reader/ReflowedContent';
import { ReadingProgress } from '@/components/reader/ReadingProgress';
import { PageNavigation } from '@/components/reader/PageNavigation';
import { TypographyPanel } from '@/components/controls/TypographyPanel';
import { ThemePanel } from '@/components/controls/ThemePanel';
import { TTSControls } from '@/components/controls/TTSControls';
import { AmbientAudioPanel } from '@/components/controls/AmbientAudioPanel';
import { BookmarkList } from '@/components/annotations/BookmarkList';
import { HighlightToolbar } from '@/components/annotations/HighlightToolbar';
import { useTTS } from '@/hooks/useTTS';
import { useReadingProgress } from '@/hooks/useReadingProgress';
import { useTextSelection } from '@/hooks/useTextSelection';
import type { Highlight } from '@/types/annotation';
import {
  X,
  Type,
  Palette,
  Volume2,
  Headphones,
  BookmarkPlus,
  Maximize,
  Minimize,
  ArrowLeft,
} from 'lucide-react';

type PanelId = 'typography' | 'theme' | 'tts' | 'ambient' | 'bookmarks' | null;

export default function ReaderPage() {
  const router = useRouter();
  const { document: pdfDoc, reflowedBlocks, fileName } = useReaderStore();
  const theme = useThemeStore((s) => s.activeTheme);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<PanelId>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const tts = useTTS(reflowedBlocks);
  const documentId = useReaderStore((s) => s.documentId);
  const { addHighlight, loadAnnotations } = useAnnotationStore();
  const { selectionRange, clearSelection } = useTextSelection();

  // Reading progress persistence
  useReadingProgress();

  // Load annotations when document opens
  useEffect(() => {
    if (documentId) {
      loadAnnotations(documentId);
    }
  }, [documentId, loadAnnotations]);

  const handleReadFromHere = useCallback(() => {
    if (!selectionRange) return;
    tts.play(selectionRange.startBlockIndex);
    clearSelection();
  }, [selectionRange, tts, clearSelection]);

  const handleHighlightColor = useCallback(
    (color: string) => {
      if (!selectionRange || !documentId) return;

      const highlight: Highlight = {
        id: `hl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        documentId,
        startBlockIndex: selectionRange.startBlockIndex,
        startCharOffset: selectionRange.startCharOffset,
        endBlockIndex: selectionRange.endBlockIndex,
        endCharOffset: selectionRange.endCharOffset,
        color,
        createdAt: Date.now(),
      };

      addHighlight(highlight);
      clearSelection();
    },
    [selectionRange, documentId, addHighlight, clearSelection]
  );

  // Redirect if no document loaded
  useEffect(() => {
    if (!pdfDoc && reflowedBlocks.length === 0) {
      router.push('/');
    }
  }, [pdfDoc, reflowedBlocks, router]);

  // Auto-hide controls
  useEffect(() => {
    if (focusMode) {
      setControlsVisible(false);
      return;
    }

    const resetTimer = () => {
      setControlsVisible(true);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => setControlsVisible(false), 4000);
    };

    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('touchstart', resetTimer);
    window.addEventListener('keydown', resetTimer);
    resetTimer();

    return () => {
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('touchstart', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [focusMode]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;

      switch (e.key) {
        case 'Escape':
          if (focusMode) setFocusMode(false);
          else if (sidebarOpen) setSidebarOpen(false);
          break;
        case 'f':
          if (!e.ctrlKey && !e.metaKey) setFocusMode((m) => !m);
          break;
        case ' ':
          e.preventDefault();
          if (tts.isPlaying) {
            tts.isPaused ? tts.resume() : tts.pause();
          } else {
            tts.play();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusMode, sidebarOpen, tts]);

  const togglePanel = useCallback(
    (panel: PanelId) => {
      if (activePanel === panel) {
        setActivePanel(null);
      } else {
        setActivePanel(panel);
        setSidebarOpen(true);
      }
    },
    [activePanel]
  );

  if (!pdfDoc || reflowedBlocks.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: theme.colors.background, color: theme.colors.text }}>
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-600 border-t-blue-500" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen overflow-x-hidden"
      style={{
        background: theme.colors.background,
        color: theme.colors.text,
        '--reader-bg': theme.colors.background,
        '--reader-text': theme.colors.text,
        '--reader-accent': theme.colors.accent,
        '--reader-highlight': theme.colors.highlight,
        '--reader-surface': theme.colors.surface,
      } as React.CSSProperties}
    >
      <ReadingProgress />

      {/* Top Bar — back button + filename only */}
      <div
        className={`fixed top-0 left-0 right-0 z-40 flex items-center px-4 py-2 transition-opacity duration-300 ${
          controlsVisible && !focusMode ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        style={{ background: `${theme.colors.surface}ee` }}
      >
        <button
          onClick={() => router.push('/')}
          className="rounded p-2 hover:bg-white/10 transition-colors shrink-0"
          aria-label="Back to home"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium truncate opacity-70 ml-1">
          {fileName || pdfDoc.title}
        </span>
      </div>

      {/* Bottom Toolbar — control buttons */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around px-2 py-2 transition-opacity duration-300 ${
          controlsVisible && !focusMode ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        style={{ background: `${theme.colors.surface}ee` }}
      >
        <button
          onClick={() => togglePanel('typography')}
          className={`rounded p-2.5 transition-colors ${activePanel === 'typography' ? 'bg-[var(--reader-accent)]/20' : 'hover:bg-white/10'}`}
          aria-label="Typography settings"
        >
          <Type className="h-5 w-5" />
        </button>
        <button
          onClick={() => togglePanel('theme')}
          className={`rounded p-2.5 transition-colors ${activePanel === 'theme' ? 'bg-[var(--reader-accent)]/20' : 'hover:bg-white/10'}`}
          aria-label="Theme settings"
        >
          <Palette className="h-5 w-5" />
        </button>
        <button
          onClick={() => togglePanel('tts')}
          className={`rounded p-2.5 transition-colors ${activePanel === 'tts' ? 'bg-[var(--reader-accent)]/20' : 'hover:bg-white/10'}`}
          aria-label="Text-to-Speech"
        >
          <Volume2 className="h-5 w-5" />
        </button>
        <button
          onClick={() => togglePanel('ambient')}
          className={`rounded p-2.5 transition-colors ${activePanel === 'ambient' ? 'bg-[var(--reader-accent)]/20' : 'hover:bg-white/10'}`}
          aria-label="Ambient audio"
        >
          <Headphones className="h-5 w-5" />
        </button>
        <button
          onClick={() => togglePanel('bookmarks')}
          className={`rounded p-2.5 transition-colors ${activePanel === 'bookmarks' ? 'bg-[var(--reader-accent)]/20' : 'hover:bg-white/10'}`}
          aria-label="Bookmarks"
        >
          <BookmarkPlus className="h-5 w-5" />
        </button>
        <button
          onClick={() => setFocusMode((m) => !m)}
          className="rounded p-2.5 hover:bg-white/10 transition-colors"
          aria-label={focusMode ? 'Exit focus mode' : 'Enter focus mode'}
        >
          {focusMode ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
        </button>
      </div>

      {/* Sidebar */}
      {sidebarOpen && !focusMode && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={() => setSidebarOpen(false)}
          />

          {/* Panel */}
          <aside
            className="fixed top-0 right-0 z-50 flex h-full w-72 max-w-[85vw] flex-col overflow-y-auto border-l border-white/10 p-4 pt-14"
            style={{ background: `${theme.colors.surface}f0` }}
            role="complementary"
            aria-label="Settings panel"
          >
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-3 right-3 rounded p-1 hover:bg-white/10 transition-colors"
              aria-label="Close panel"
            >
              <X className="h-4 w-4" />
            </button>

            {activePanel === 'typography' && <TypographyPanel />}
            {activePanel === 'theme' && <ThemePanel />}
            {activePanel === 'tts' && (
              <TTSControls
                onPlay={tts.play}
                onPause={tts.pause}
                onResume={tts.resume}
                onStop={tts.stop}
                onSkipForward={tts.skipForward}
                onSkipBackward={tts.skipBackward}
              />
            )}
            {activePanel === 'ambient' && <AmbientAudioPanel />}
            {activePanel === 'bookmarks' && <BookmarkList />}
          </aside>
        </>
      )}

      {/* Focus Mode Exit Hint */}
      {focusMode && controlsVisible && (
        <button
          onClick={() => setFocusMode(false)}
          className="fixed top-2 right-2 z-50 rounded-full bg-black/50 px-3 py-1 text-xs text-white/60 hover:text-white transition-colors"
        >
          Exit Focus (Esc)
        </button>
      )}

      {/* Main Content */}
      <div className={`pt-12 pb-20 ${sidebarOpen && !focusMode ? 'sm:pr-72' : ''} transition-[padding] duration-200`}>
        <ReflowedContent blocks={reflowedBlocks} />
      </div>

      <PageNavigation />

      {selectionRange && (
        <HighlightToolbar
          position={{
            x: selectionRange.rect.left + selectionRange.rect.width / 2,
            y: selectionRange.rect.top,
          }}
          onSelectColor={handleHighlightColor}
          onReadFromHere={handleReadFromHere}
          onDismiss={clearSelection}
        />
      )}
    </div>
  );
}
