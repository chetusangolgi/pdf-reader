import type { PdfDocument, PdfStructuredBlock } from '@/types/pdf';

export interface ReflowedBlock {
  id: string;
  type: 'heading' | 'paragraph' | 'list-item' | 'table' | 'image-placeholder' | 'page-break';
  level?: number;
  content: string;
  isBold: boolean;
  isItalic: boolean;
  pageIndex: number;
}

export function reflowDocument(doc: PdfDocument): ReflowedBlock[] {
  const blocks: ReflowedBlock[] = [];

  for (let pageIdx = 0; pageIdx < doc.pages.length; pageIdx++) {
    const page = doc.pages[pageIdx];

    // Add page break marker between pages (not before first)
    if (pageIdx > 0) {
      blocks.push({
        id: `page-break-${pageIdx}`,
        type: 'page-break',
        content: `Page ${pageIdx + 1}`,
        isBold: false,
        isItalic: false,
        pageIndex: pageIdx,
      });
    }

    for (const block of page.blocks) {
      blocks.push(structuredBlockToReflowed(block));
    }
  }

  // Post-process: merge adjacent paragraphs that were split by page breaks mid-sentence
  return mergeFragmentedParagraphs(blocks);
}

function structuredBlockToReflowed(block: PdfStructuredBlock): ReflowedBlock {
  return {
    id: block.id,
    type: block.type,
    level: block.level,
    content: cleanText(block.content),
    isBold: block.isBold,
    isItalic: block.isItalic,
    pageIndex: block.pageIndex,
  };
}

function cleanText(text: string): string {
  return text
    // Fix common PDF extraction artifacts
    .replace(/\s+/g, ' ')
    // Fix broken hyphenation at line ends
    .replace(/(\w)- (\w)/g, '$1$2')
    // Normalize quotes
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .trim();
}

function mergeFragmentedParagraphs(blocks: ReflowedBlock[]): ReflowedBlock[] {
  const result: ReflowedBlock[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];

    // Skip page breaks (they're kept as markers)
    if (block.type === 'page-break') {
      result.push(block);
      continue;
    }

    // Check if this paragraph should merge with the previous one
    // A paragraph that starts with a lowercase letter and the previous one
    // doesn't end with a period is likely a continuation
    if (
      block.type === 'paragraph' &&
      result.length > 0 &&
      result[result.length - 1].type === 'paragraph'
    ) {
      const prev = result[result.length - 1];
      const prevEndsAbruptly = prev.content.length > 0 &&
        !/[.!?:;]$/.test(prev.content) &&
        !/[.!?:;]["')]$/.test(prev.content);
      const currStartsLower = /^[a-z]/.test(block.content);

      if (prevEndsAbruptly && currStartsLower) {
        prev.content = prev.content + ' ' + block.content;
        continue;
      }
    }

    result.push({ ...block });
  }

  return result;
}
