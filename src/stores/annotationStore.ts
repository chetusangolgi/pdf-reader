import { create } from 'zustand';
import type { Bookmark, Highlight } from '@/types/annotation';
import * as db from '@/lib/persistence/database';

interface AnnotationState {
  bookmarks: Bookmark[];
  highlights: Highlight[];
  documentId: string | null;

  loadAnnotations: (documentId: string) => Promise<void>;
  addBookmark: (bookmark: Bookmark) => Promise<void>;
  removeBookmark: (id: string) => Promise<void>;
  addHighlight: (highlight: Highlight) => Promise<void>;
  removeHighlight: (id: string) => Promise<void>;
  updateHighlightNote: (id: string, note: string) => Promise<void>;
}

export const useAnnotationStore = create<AnnotationState>((set, get) => ({
  bookmarks: [],
  highlights: [],
  documentId: null,

  loadAnnotations: async (documentId) => {
    const bookmarks = await db.getBookmarksByDocument(documentId);
    const highlights = await db.getHighlightsByDocument(documentId);
    set({ bookmarks, highlights, documentId });
  },

  addBookmark: async (bookmark) => {
    await db.saveBookmark(bookmark);
    set((state) => ({ bookmarks: [...state.bookmarks, bookmark] }));
  },

  removeBookmark: async (id) => {
    await db.deleteBookmark(id);
    set((state) => ({ bookmarks: state.bookmarks.filter((b) => b.id !== id) }));
  },

  addHighlight: async (highlight) => {
    await db.saveHighlight(highlight);
    set((state) => ({ highlights: [...state.highlights, highlight] }));
  },

  removeHighlight: async (id) => {
    await db.deleteHighlight(id);
    set((state) => ({ highlights: state.highlights.filter((h) => h.id !== id) }));
  },

  updateHighlightNote: async (id, note) => {
    const highlight = get().highlights.find((h) => h.id === id);
    if (highlight) {
      const updated = { ...highlight, note };
      await db.saveHighlight(updated);
      set((state) => ({
        highlights: state.highlights.map((h) => (h.id === id ? updated : h)),
      }));
    }
  },
}));
