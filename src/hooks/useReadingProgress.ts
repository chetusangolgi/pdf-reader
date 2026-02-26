'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useReaderStore } from '@/stores/readerStore';
import * as db from '@/lib/persistence/database';
import type { ReadingProgress } from '@/types/annotation';

export function useReadingProgress() {
  const documentId = useReaderStore((s) => s.documentId);
  const fileName = useReaderStore((s) => s.fileName);
  const currentPageIndex = useReaderStore((s) => s.currentPageIndex);
  const pdfDoc = useReaderStore((s) => s.document);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const sessionStartRef = useRef<number>(Date.now());
  const hasRestoredRef = useRef<boolean>(false);

  // Save progress (debounced) whenever currentPageIndex changes
  useEffect(() => {
    if (!documentId || !pdfDoc || !fileName) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      const scrollPosition = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const percentComplete = docHeight > 0 ? (scrollPosition / docHeight) * 100 : 0;
      const elapsedMs = Date.now() - sessionStartRef.current;

      const progress: ReadingProgress = {
        documentId,
        fileName,
        lastBlockIndex: currentPageIndex,
        scrollPosition,
        percentComplete: Math.min(100, Math.round(percentComplete * 10) / 10),
        lastReadAt: Date.now(),
        totalReadingTimeMs: elapsedMs,
      };

      db.saveProgress(progress);
    }, 1000);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [currentPageIndex, documentId, fileName, pdfDoc]);

  // Restore scroll position on mount (once)
  const restorePosition = useCallback(async () => {
    if (!documentId || hasRestoredRef.current) return;
    hasRestoredRef.current = true;

    const saved = await db.getProgress(documentId);
    if (saved && saved.scrollPosition > 0) {
      // Wait for content to render, then scroll
      requestAnimationFrame(() => {
        window.scrollTo({ top: saved.scrollPosition, behavior: 'instant' as ScrollBehavior });
      });
    }
  }, [documentId]);

  useEffect(() => {
    restorePosition();
  }, [restorePosition]);
}
