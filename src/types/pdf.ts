export interface PdfTextItem {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontName: string;
  fontSize: number;
  isBold: boolean;
  isItalic: boolean;
  pageIndex: number;
}

export interface PdfStructuredBlock {
  id: string;
  type: 'heading' | 'paragraph' | 'list-item' | 'table' | 'image-placeholder';
  level?: number; // For headings: 1-6
  content: string;
  isBold: boolean;
  isItalic: boolean;
  fontSize: number;
  pageIndex: number;
}

export interface PdfPage {
  pageIndex: number;
  width: number;
  height: number;
  blocks: PdfStructuredBlock[];
}

export interface PdfDocument {
  title: string;
  author: string;
  pageCount: number;
  pages: PdfPage[];
  outline: PdfOutlineItem[];
}

export interface PdfOutlineItem {
  title: string;
  pageIndex: number;
  children: PdfOutlineItem[];
}
