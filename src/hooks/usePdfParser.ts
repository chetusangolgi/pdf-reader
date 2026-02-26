'use client';

import { useCallback } from 'react';
import { useReaderStore } from '@/stores/readerStore';
import { parsePdf } from '@/lib/pdf/parser';
import { reflowDocument } from '@/lib/pdf/reflow';

export function usePdfParser() {
  const {
    setFile,
    setDocument,
    setLoading,
    setParseProgress,
    setError,
    isLoading,
    parseProgress,
    error,
  } = useReaderStore();

  const loadFile = useCallback(
    async (file: File) => {
      try {
        setLoading(true);
        setError(null);

        const arrayBuffer = await file.arrayBuffer();
        setFile(arrayBuffer, file.name);

        const doc = await parsePdf(arrayBuffer, (progress) => {
          setParseProgress({
            currentPage: progress.currentPage,
            totalPages: progress.totalPages,
          });
        });

        const reflowed = reflowDocument(doc);
        setDocument(doc, reflowed);
        setParseProgress(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to parse PDF';
        setError(message);
        console.error('PDF parse error:', err);
      }
    },
    [setFile, setDocument, setLoading, setParseProgress, setError]
  );

  return { loadFile, isLoading, parseProgress, error };
}
