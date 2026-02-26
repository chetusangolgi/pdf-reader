import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Bookmark, Highlight, ReadingProgress } from '@/types/annotation';

interface ReaderDB extends DBSchema {
  bookmarks: {
    key: string;
    value: Bookmark;
    indexes: { 'by-document': string };
  };
  highlights: {
    key: string;
    value: Highlight;
    indexes: { 'by-document': string };
  };
  progress: {
    key: string;
    value: ReadingProgress;
  };
}

let dbPromise: Promise<IDBPDatabase<ReaderDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<ReaderDB>('rick-peruse-db', 1, {
      upgrade(db) {
        const bookmarkStore = db.createObjectStore('bookmarks', { keyPath: 'id' });
        bookmarkStore.createIndex('by-document', 'documentId');

        const highlightStore = db.createObjectStore('highlights', { keyPath: 'id' });
        highlightStore.createIndex('by-document', 'documentId');

        db.createObjectStore('progress', { keyPath: 'documentId' });
      },
    });
  }
  return dbPromise;
}

// Bookmarks
export async function saveBookmark(bookmark: Bookmark): Promise<void> {
  const db = await getDB();
  await db.put('bookmarks', bookmark);
}

export async function deleteBookmark(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('bookmarks', id);
}

export async function getBookmarksByDocument(documentId: string): Promise<Bookmark[]> {
  const db = await getDB();
  return db.getAllFromIndex('bookmarks', 'by-document', documentId);
}

// Highlights
export async function saveHighlight(highlight: Highlight): Promise<void> {
  const db = await getDB();
  await db.put('highlights', highlight);
}

export async function deleteHighlight(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('highlights', id);
}

export async function getHighlightsByDocument(documentId: string): Promise<Highlight[]> {
  const db = await getDB();
  return db.getAllFromIndex('highlights', 'by-document', documentId);
}

// Reading Progress
export async function saveProgress(progress: ReadingProgress): Promise<void> {
  const db = await getDB();
  await db.put('progress', progress);
}

export async function getProgress(documentId: string): Promise<ReadingProgress | undefined> {
  const db = await getDB();
  return db.get('progress', documentId);
}

export async function getAllProgress(): Promise<ReadingProgress[]> {
  const db = await getDB();
  return db.getAll('progress');
}
