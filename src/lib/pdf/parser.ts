import type { PdfDocument, PdfPage, PdfStructuredBlock, PdfTextItem, PdfOutlineItem } from '@/types/pdf';

// pdfjs-dist is loaded dynamically to avoid SSR issues (DOMMatrix not available in Node)
async function getPdfjs() {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();
  return pdfjsLib;
}

// --- Unicode superscript / subscript mapping ---

const SUPERSCRIPT_MAP: Record<string, string> = {
  '0': '\u2070', '1': '\u00B9', '2': '\u00B2', '3': '\u00B3', '4': '\u2074',
  '5': '\u2075', '6': '\u2076', '7': '\u2077', '8': '\u2078', '9': '\u2079',
  '+': '\u207A', '-': '\u207B', '=': '\u207C', '(': '\u207D', ')': '\u207E',
  'n': '\u207F', 'i': '\u2071',
  'a': '\u1D43', 'b': '\u1D47', 'c': '\u1D9C', 'd': '\u1D48', 'e': '\u1D49',
  'f': '\u1DA0', 'g': '\u1D4D', 'h': '\u02B0', 'j': '\u02B2', 'k': '\u1D4F',
  'l': '\u02E1', 'm': '\u1D50', 'o': '\u1D52', 'p': '\u1D56', 'r': '\u02B3',
  's': '\u02E2', 't': '\u1D57', 'u': '\u1D58', 'v': '\u1D5B', 'w': '\u02B7',
  'x': '\u02E3', 'y': '\u02B8', 'z': '\u1DBB',
  'A': '\u1D2C', 'B': '\u1D2E', 'D': '\u1D30', 'E': '\u1D31', 'G': '\u1D33',
  'H': '\u1D34', 'I': '\u1D35', 'J': '\u1D36', 'K': '\u1D37', 'L': '\u1D38',
  'M': '\u1D39', 'N': '\u1D3A', 'O': '\u1D3C', 'P': '\u1D3E', 'R': '\u1D3F',
  'T': '\u1D40', 'U': '\u1D41', 'V': '\u2C7D', 'W': '\u1D42',
};

const SUBSCRIPT_MAP: Record<string, string> = {
  '0': '\u2080', '1': '\u2081', '2': '\u2082', '3': '\u2083', '4': '\u2084',
  '5': '\u2085', '6': '\u2086', '7': '\u2087', '8': '\u2088', '9': '\u2089',
  '+': '\u208A', '-': '\u208B', '=': '\u208C', '(': '\u208D', ')': '\u208E',
  'a': '\u2090', 'e': '\u2091', 'h': '\u2095', 'i': '\u1D62', 'j': '\u2C7C',
  'k': '\u2096', 'l': '\u2097', 'm': '\u2098', 'n': '\u2099', 'o': '\u2092',
  'p': '\u209A', 'r': '\u1D63', 's': '\u209B', 't': '\u209C', 'u': '\u1D64',
  'v': '\u1D65', 'x': '\u2093',
};

function toUnicodeSuperscript(text: string): string {
  let result = '';
  for (const ch of text) {
    result += SUPERSCRIPT_MAP[ch] ?? ch;
  }
  return result;
}

function toUnicodeSubscript(text: string): string {
  let result = '';
  for (const ch of text) {
    result += SUBSCRIPT_MAP[ch] ?? ch;
  }
  return result;
}

// --- Image extraction ---

interface BlockWithY {
  block: PdfStructuredBlock;
  y: number; // PDF Y coordinate for ordering (higher = higher on page)
}

// Numeric OPS codes for every image-paint operator in pdf.js v5.
const IMAGE_OPS = new Set([
  83, // paintImageMaskXObject
  84, // paintImageMaskXObjectGroup
  85, // paintImageXObject
  86, // paintInlineImageXObject
  87, // paintInlineImageXObjectGroup
  88, // paintImageXObjectRepeat
  89, // paintImageMaskXObjectRepeat
  90, // paintSolidColorImageMask
]);

/**
 * Detect whether a page has image operators.
 * Does NOT render — rendering happens lazily in the component to avoid
 * pdf.js internal state conflicts when rendering multiple pages during parse.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function extractPageImages(page: any, _pdfjsLib: any, pageIndex: number): Promise<BlockWithY[]> {
  let ops;
  try {
    ops = await page.getOperatorList();
  } catch {
    return [];
  }

  for (let i = 0; i < ops.fnArray.length; i++) {
    if (IMAGE_OPS.has(ops.fnArray[i])) {
      // Page has images — return a placeholder block.
      // The actual render is deferred to the <PageImage> component.
      return [{
        y: Infinity,
        block: {
          id: generateId(),
          type: 'image',
          content: '',
          imageDataUrl: `__render_page__`,
          isBold: false,
          isItalic: false,
          fontSize: 0,
          pageIndex,
        },
      }];
    }
  }

  return [];
}

// --- Text extraction with superscript/subscript detection ---

interface ParseProgress {
  currentPage: number;
  totalPages: number;
  phase: 'loading' | 'parsing' | 'complete';
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

function extractTextItems(textContent: { items: unknown[] }, pageIndex: number): PdfTextItem[] {
  const items: PdfTextItem[] = [];

  for (const item of textContent.items) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ti = item as any;
    if (!ti.str || ti.str.trim() === '') continue;

    // transform: [scaleX, skewY, skewX, scaleY, translateX, translateY]
    const fontSize = Math.abs(ti.transform[0]) || Math.abs(ti.transform[3]) || 12;
    const x = ti.transform[4];
    const y = ti.transform[5];
    const fontName = ti.fontName || '';

    items.push({
      text: ti.str,
      x,
      y,
      width: ti.width,
      height: ti.height || fontSize,
      fontName,
      fontSize,
      isBold: /bold/i.test(fontName),
      isItalic: /italic|oblique/i.test(fontName),
      pageIndex,
    });
  }

  return items;
}

function groupIntoLines(items: PdfTextItem[]): PdfTextItem[][] {
  if (items.length === 0) return [];

  // Sort by Y descending (PDF coords: bottom=0), then X ascending
  const sorted = [...items].sort((a, b) => {
    const yDiff = b.y - a.y;
    if (Math.abs(yDiff) > 2) return yDiff;
    return a.x - b.x;
  });

  const lines: PdfTextItem[][] = [];
  let currentLine: PdfTextItem[] = [sorted[0]];
  let currentY = sorted[0].y;

  for (let i = 1; i < sorted.length; i++) {
    const item = sorted[i];
    // Items within ~3px of same Y are on the same line
    if (Math.abs(item.y - currentY) < 3) {
      currentLine.push(item);
    } else {
      // Sort current line by X before pushing
      currentLine.sort((a, b) => a.x - b.x);
      lines.push(currentLine);
      currentLine = [item];
      currentY = item.y;
    }
  }
  // Don't forget last line
  currentLine.sort((a, b) => a.x - b.x);
  lines.push(currentLine);

  return lines;
}

/**
 * Merge isolated super/subscript lines into their adjacent baseline lines.
 * A line is a super/subscript candidate if it has fewer items, a smaller average
 * font size, overlaps in X range, and is close in Y to an adjacent line.
 */
function mergeSupSubLines(lines: PdfTextItem[][]): PdfTextItem[][] {
  if (lines.length <= 1) return lines;

  const result: PdfTextItem[][] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const prevLine = result.length > 0 ? result[result.length - 1] : null;

    if (prevLine && isSupSubCandidate(line, prevLine)) {
      // Merge this line into the previous one
      prevLine.push(...line);
      prevLine.sort((a, b) => a.x - b.x);
      continue;
    }

    if (prevLine && isSupSubCandidate(prevLine, line)) {
      // Previous line was a sup/sub of this one — merge
      line.push(...prevLine);
      line.sort((a, b) => a.x - b.x);
      result[result.length - 1] = line;
      continue;
    }

    result.push(line);
  }

  return result;
}

function isSupSubCandidate(candidate: PdfTextItem[], baseline: PdfTextItem[]): boolean {
  if (candidate.length > baseline.length * 0.6) return false;

  const candAvg = candidate.reduce((s, t) => s + t.fontSize, 0) / candidate.length;
  const baseAvg = baseline.reduce((s, t) => s + t.fontSize, 0) / baseline.length;

  // Super/subscripts have a noticeably smaller font
  if (candAvg > baseAvg * 0.9) return false;

  // Y distance must be within ~60% of the baseline font size
  const candY = candidate[0].y;
  const baseY = baseline[0].y;
  if (Math.abs(candY - baseY) > baseAvg * 0.6) return false;

  // X ranges must overlap
  const candMinX = Math.min(...candidate.map(t => t.x));
  const candMaxX = Math.max(...candidate.map(t => t.x + t.width));
  const baseMinX = Math.min(...baseline.map(t => t.x));
  const baseMaxX = Math.max(...baseline.map(t => t.x + t.width));

  return candMaxX > baseMinX && candMinX < baseMaxX;
}

/**
 * Convert a line of text items to a string, detecting superscripts and subscripts
 * based on font size and Y-position relative to the line's dominant baseline,
 * and converting them to Unicode superscript/subscript characters.
 */
function lineItemsToRichText(lineItems: PdfTextItem[]): string {
  if (lineItems.length === 0) return '';
  if (lineItems.length === 1) return lineItems[0].text;

  // Find dominant font size (most common size, with tolerance)
  const sizeGroups: { size: number; count: number }[] = [];
  for (const item of lineItems) {
    const existing = sizeGroups.find(g => Math.abs(g.size - item.fontSize) < 1);
    if (existing) {
      existing.count++;
    } else {
      sizeGroups.push({ size: item.fontSize, count: 1 });
    }
  }
  sizeGroups.sort((a, b) => b.count - a.count);
  const dominantSize = sizeGroups[0].size;

  // Find baseline Y from items at the dominant size
  const baselineItems = lineItems.filter(i => Math.abs(i.fontSize - dominantSize) < 1.5);
  if (baselineItems.length === 0) {
    return lineItems.map(i => i.text).join('');
  }

  const baselineY = baselineItems.reduce((s, i) => s + i.y, 0) / baselineItems.length;

  let result = '';
  for (const item of lineItems) {
    const isSmallerFont = item.fontSize < dominantSize * 0.85;
    const yOffset = item.y - baselineY; // positive = higher on page (PDF Y goes up)

    if (isSmallerFont && yOffset > dominantSize * 0.12) {
      // Higher Y + smaller font = superscript
      result += toUnicodeSuperscript(item.text);
    } else if (isSmallerFont && yOffset < -dominantSize * 0.12) {
      // Lower Y + smaller font = subscript
      result += toUnicodeSubscript(item.text);
    } else {
      result += item.text;
    }
  }

  return result;
}

function detectColumns(lines: PdfTextItem[][], pageWidth: number): { left: PdfTextItem[][]; right: PdfTextItem[][] } | null {
  if (lines.length < 4) return null;

  const midX = pageWidth / 2;
  const startXPositions = lines.map(line => line[0].x);

  // Count lines starting in left half vs right half
  let leftStarts = 0;
  let rightStarts = 0;
  const threshold = midX * 0.4; // 40% of half-width as gap

  for (const x of startXPositions) {
    if (x < midX - threshold) leftStarts++;
    else if (x > midX + threshold) rightStarts++;
  }

  // Need at least 30% of lines in each column for multi-column detection
  const minLines = lines.length * 0.3;
  if (leftStarts < minLines || rightStarts < minLines) return null;

  const left: PdfTextItem[][] = [];
  const right: PdfTextItem[][] = [];

  for (const line of lines) {
    const lineStartX = line[0].x;
    if (lineStartX < midX) {
      left.push(line);
    } else {
      right.push(line);
    }
  }

  return { left, right };
}

function groupIntoBlocks(lines: PdfTextItem[][], pageIndex: number, medianFontSize: number): BlockWithY[] {
  if (lines.length === 0) return [];

  // Merge isolated superscript/subscript lines with their neighbours
  const merged = mergeSupSubLines(lines);

  const blocks: BlockWithY[] = [];
  let currentBlockLines: PdfTextItem[][] = [merged[0]];

  for (let i = 1; i < merged.length; i++) {
    const prevLine = merged[i - 1];
    const currLine = merged[i];

    const prevY = prevLine[0].y;
    const currY = currLine[0].y;
    const prevFontSize = prevLine[0].fontSize;

    // Gap between lines (remember Y is descending)
    const gap = prevY - currY;
    const normalLineGap = prevFontSize * 1.4;

    // Check if there's a paragraph break (gap significantly larger than normal line height)
    const isParagraphBreak = gap > normalLineGap * 1.5;

    // Check if font size changed significantly (heading transition)
    const currFontSize = currLine[0].fontSize;
    const fontSizeChanged = Math.abs(currFontSize - prevFontSize) > 2;

    if (isParagraphBreak || fontSizeChanged) {
      // Finalize current block
      blocks.push(createBlock(currentBlockLines, pageIndex, medianFontSize));
      currentBlockLines = [currLine];
    } else {
      currentBlockLines.push(currLine);
    }
  }

  // Don't forget last block
  if (currentBlockLines.length > 0) {
    blocks.push(createBlock(currentBlockLines, pageIndex, medianFontSize));
  }

  return blocks;
}

function createBlock(lines: PdfTextItem[][], pageIndex: number, medianFontSize: number): BlockWithY {
  // Use rich text conversion (with superscript/subscript detection) for each line
  const text = lines.map(lineItemsToRichText).join(' ').replace(/\s+/g, ' ').trim();
  const fontSize = lines[0][0].fontSize;
  const isBold = lines[0][0].isBold;
  const isItalic = lines[0][0].isItalic;
  const y = lines[0][0].y; // PDF Y of first line (for ordering)

  // Detect headings: significantly larger font than median, or bold + larger
  const isHeading = fontSize > medianFontSize * 1.2;

  if (isHeading) {
    const ratio = fontSize / medianFontSize;
    let level = 3;
    if (ratio > 2.0) level = 1;
    else if (ratio > 1.5) level = 2;
    else if (ratio > 1.2) level = 3;

    return { y, block: { id: generateId(), type: 'heading', level, content: text, isBold: true, isItalic, fontSize, pageIndex } };
  }

  if (/^[\u2022\u2023\u25E6\u2043\u2219•●○◦-]\s/.test(text) || /^\d+[.)]\s/.test(text)) {
    return { y, block: { id: generateId(), type: 'list-item', content: text, isBold, isItalic, fontSize, pageIndex } };
  }

  return { y, block: { id: generateId(), type: 'paragraph', content: text, isBold, isItalic, fontSize, pageIndex } };
}

function calculateMedianFontSize(items: PdfTextItem[]): number {
  if (items.length === 0) return 12;
  const sizes = items.map(i => i.fontSize).sort((a, b) => a - b);
  const mid = Math.floor(sizes.length / 2);
  return sizes.length % 2 ? sizes[mid] : (sizes[mid - 1] + sizes[mid]) / 2;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function parseOutline(pdf: any): Promise<PdfOutlineItem[]> {
  try {
    const outline = await pdf.getOutline();
    if (!outline) return [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const processItems = async (items: any[]): Promise<PdfOutlineItem[]> => {
      const result: PdfOutlineItem[] = [];
      for (const item of items) {
        let pageIndex = 0;
        if (item.dest) {
          try {
            const dest = typeof item.dest === 'string'
              ? await pdf.getDestination(item.dest)
              : item.dest;
            if (dest) {
              const ref = dest[0];
              pageIndex = await pdf.getPageIndex(ref);
            }
          } catch {
            // Skip items with unresolvable destinations
          }
        }

        result.push({
          title: item.title,
          pageIndex,
          children: item.items ? await processItems(item.items) : [],
        });
      }
      return result;
    };

    return processItems(outline);
  } catch {
    return [];
  }
}

export async function parsePdf(
  source: ArrayBuffer,
  onProgress?: (progress: ParseProgress) => void
): Promise<PdfDocument> {
  onProgress?.({ currentPage: 0, totalPages: 0, phase: 'loading' });

  const pdfjsLib = await getPdfjs();
  const pdf = await pdfjsLib.getDocument({ data: source }).promise;
  const totalPages = pdf.numPages;

  // Get metadata
  const metadata = await pdf.getMetadata().catch(() => null);
  const info = metadata?.info as Record<string, string> | undefined;
  const title = info?.Title || 'Untitled Document';
  const author = info?.Author || '';

  // Parse outline
  const outline = await parseOutline(pdf);

  const pages: PdfPage[] = [];

  for (let i = 1; i <= totalPages; i++) {
    onProgress?.({ currentPage: i, totalPages, phase: 'parsing' });

    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1 });
    const textContent = await page.getTextContent();

    const pageIndex = i - 1;
    const textItems = extractTextItems(textContent, pageIndex);
    const medianFontSize = calculateMedianFontSize(textItems);

    const lines = groupIntoLines(textItems);

    // Check for multi-column layout
    const columns = detectColumns(lines, viewport.width);

    let textBlocksWithY: BlockWithY[];
    if (columns) {
      const leftBlocks = groupIntoBlocks(columns.left, pageIndex, medianFontSize);
      const rightBlocks = groupIntoBlocks(columns.right, pageIndex, medianFontSize);
      textBlocksWithY = [...leftBlocks, ...rightBlocks];
    } else {
      textBlocksWithY = groupIntoBlocks(lines, pageIndex, medianFontSize);
    }

    // Extract individual images and their positions
    const imageBlocksWithY = await extractPageImages(page, pdfjsLib, pageIndex);

    // Merge text + images, sort by Y descending (top of page first)
    const allBlocks = [...textBlocksWithY, ...imageBlocksWithY];
    allBlocks.sort((a, b) => b.y - a.y);

    pages.push({
      pageIndex,
      width: viewport.width,
      height: viewport.height,
      blocks: allBlocks.map((item) => item.block),
    });
  }

  onProgress?.({ currentPage: totalPages, totalPages, phase: 'complete' });

  return {
    title,
    author,
    pageCount: totalPages,
    pages,
    outline,
  };
}
