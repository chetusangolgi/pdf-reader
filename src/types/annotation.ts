export interface Bookmark {
  id: string;
  documentId: string;
  blockIndex: number;
  label: string;
  createdAt: number;
}

export interface Highlight {
  id: string;
  documentId: string;
  startBlockIndex: number;
  startCharOffset: number;
  endBlockIndex: number;
  endCharOffset: number;
  color: string;
  note?: string;
  createdAt: number;
}

export interface ReadingProgress {
  documentId: string;
  fileName: string;
  lastBlockIndex: number;
  scrollPosition: number;
  percentComplete: number;
  lastReadAt: number;
  totalReadingTimeMs: number;
}
