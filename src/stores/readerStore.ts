import { create } from 'zustand';
import type { PdfDocument } from '@/types/pdf';
import type { ReflowedBlock } from '@/lib/pdf/reflow';

function generateDocumentId(fileName: string, pageCount: number): string {
  return `${fileName}::${pageCount}`;
}

interface ReaderState {
  // PDF file
  file: ArrayBuffer | null;
  fileName: string | null;

  // Parsed document
  document: PdfDocument | null;
  reflowedBlocks: ReflowedBlock[];
  documentId: string | null;

  // Parse progress
  isLoading: boolean;
  parseProgress: { currentPage: number; totalPages: number } | null;
  error: string | null;

  // Reading state
  currentPageIndex: number;

  // Actions
  setFile: (file: ArrayBuffer, fileName: string) => void;
  setDocument: (doc: PdfDocument, blocks: ReflowedBlock[]) => void;
  setLoading: (loading: boolean) => void;
  setParseProgress: (progress: { currentPage: number; totalPages: number } | null) => void;
  setError: (error: string | null) => void;
  setCurrentPage: (pageIndex: number) => void;
  reset: () => void;
}

export const useReaderStore = create<ReaderState>((set) => ({
  file: null,
  fileName: null,
  document: null,
  reflowedBlocks: [],
  documentId: null,
  isLoading: false,
  parseProgress: null,
  error: null,
  currentPageIndex: 0,

  setFile: (file, fileName) => set({ file, fileName, error: null }),
  setDocument: (doc, blocks) => set((state) => ({
    document: doc,
    reflowedBlocks: blocks,
    isLoading: false,
    documentId: generateDocumentId(state.fileName || doc.title, doc.pageCount),
  })),
  setLoading: (isLoading) => set({ isLoading }),
  setParseProgress: (parseProgress) => set({ parseProgress }),
  setError: (error) => set({ error, isLoading: false }),
  setCurrentPage: (currentPageIndex) => set({ currentPageIndex }),
  reset: () => set({
    file: null,
    fileName: null,
    document: null,
    reflowedBlocks: [],
    documentId: null,
    isLoading: false,
    parseProgress: null,
    error: null,
    currentPageIndex: 0,
  }),
}));
