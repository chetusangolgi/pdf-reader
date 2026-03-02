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

// --- Image extraction helpers ---

const MAX_IMAGE_DIM = 1200;

function concatMatrix(a: number[], b: number[]): number[] {
  return [
    a[0] * b[0] + a[1] * b[2],
    a[0] * b[1] + a[1] * b[3],
    a[2] * b[0] + a[3] * b[2],
    a[2] * b[1] + a[3] * b[3],
    a[4] * b[0] + a[5] * b[2] + b[4],
    a[4] * b[1] + a[5] * b[3] + b[5],
  ];
}

function getPageImage(page: { objs: { get(name: string, cb: (data: unknown) => void): void } }, name: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timeout')), 5000);
    try {
      page.objs.get(name, (data: unknown) => {
        clearTimeout(timer);
        resolve(data);
      });
    } catch (e) {
      clearTimeout(timer);
      reject(e);
    }
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderImageToDataUrl(imgData: any): string | null {
  if (!imgData) return null;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Handle ImageBitmap
  if (typeof ImageBitmap !== 'undefined' && imgData instanceof ImageBitmap) {
    let w = imgData.width;
    let h = imgData.height;
    if (w > MAX_IMAGE_DIM || h > MAX_IMAGE_DIM) {
      const scale = MAX_IMAGE_DIM / Math.max(w, h);
      w = Math.round(w * scale);
      h = Math.round(h * scale);
    }
    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(imgData, 0, 0, w, h);
    return canvas.toDataURL('image/png');
  }

  // Handle raw pixel data { width, height, data, kind }
  if (imgData.width && imgData.height && imgData.data) {
    let w = imgData.width as number;
    let h = imgData.height as number;
    const kind = imgData.kind as number;

    // kind 1 = GRAYSCALE_1BPP (usually masks), skip
    if (kind === 1) return null;

    canvas.width = w;
    canvas.height = h;
    const imageData = ctx.createImageData(w, h);
    const src = imgData.data as Uint8ClampedArray;
    const dst = imageData.data;

    if (kind === 3) {
      // RGBA_32BPP
      dst.set(src);
    } else if (kind === 2) {
      // RGB_24BPP — add alpha channel
      let s = 0, d = 0;
      const pixelCount = w * h;
      for (let p = 0; p < pixelCount; p++) {
        dst[d++] = src[s++];
        dst[d++] = src[s++];
        dst[d++] = src[s++];
        dst[d++] = 255;
      }
    } else {
      return null;
    }

    ctx.putImageData(imageData, 0, 0);

    // Downscale if too large
    if (w > MAX_IMAGE_DIM || h > MAX_IMAGE_DIM) {
      const scale = MAX_IMAGE_DIM / Math.max(w, h);
      w = Math.round(w * scale);
      h = Math.round(h * scale);
      const scaled = document.createElement('canvas');
      scaled.width = w;
      scaled.height = h;
      const sctx = scaled.getContext('2d')!;
      sctx.drawImage(canvas, 0, 0, w, h);
      return scaled.toDataURL('image/png');
    }

    return canvas.toDataURL('image/png');
  }

  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function extractPageImages(page: any, pdfjsLib: any, pageIndex: number): Promise<PdfStructuredBlock[]> {
  const ops = await page.getOperatorList();
  const OPS = pdfjsLib.OPS;
  const images: PdfStructuredBlock[] = [];
  const seenNames = new Set<string>();

  const ctmStack: number[][] = [];
  let ctm = [1, 0, 0, 1, 0, 0];

  for (let i = 0; i < ops.fnArray.length; i++) {
    const fn = ops.fnArray[i];
    const args = ops.argsArray[i];

    if (fn === OPS.save) {
      ctmStack.push([...ctm]);
    } else if (fn === OPS.restore) {
      ctm = ctmStack.pop() || [1, 0, 0, 1, 0, 0];
    } else if (fn === OPS.transform) {
      ctm = concatMatrix(ctm, args);
    } else if (fn === OPS.paintImageXObject) {
      const name = args[0] as string;
      // Skip duplicate images (same image used multiple times)
      if (seenNames.has(name)) continue;
      seenNames.add(name);

      const imgW = Math.abs(ctm[0]);
      const imgH = Math.abs(ctm[3]);
      // Skip tiny images (icons, bullets, decorative dots)
      if (imgW < 50 && imgH < 50) continue;

      try {
        const imgData = await getPageImage(page, name);
        const dataUrl = renderImageToDataUrl(imgData);
        if (dataUrl) {
          images.push({
            id: generateId(),
            type: 'image',
            content: '',
            imageDataUrl: dataUrl,
            isBold: false,
            isItalic: false,
            fontSize: 0,
            pageIndex,
          });
        }
      } catch {
        // Skip images that can't be extracted
      }
    } else if (fn === OPS.paintInlineImageXObject) {
      const imgW = Math.abs(ctm[0]);
      const imgH = Math.abs(ctm[3]);
      if (imgW < 50 && imgH < 50) continue;

      try {
        const dataUrl = renderImageToDataUrl(args[0]);
        if (dataUrl) {
          images.push({
            id: generateId(),
            type: 'image',
            content: '',
            imageDataUrl: dataUrl,
            isBold: false,
            isItalic: false,
            fontSize: 0,
            pageIndex,
          });
        }
      } catch {
        // Skip
      }
    }
  }

  return images;
}

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

function linesToText(line: PdfTextItem[]): string {
  return line.map(item => item.text).join('');
}

function groupIntoBlocks(lines: PdfTextItem[][], pageIndex: number, medianFontSize: number): PdfStructuredBlock[] {
  if (lines.length === 0) return [];

  const blocks: PdfStructuredBlock[] = [];
  let currentBlockLines: PdfTextItem[][] = [lines[0]];

  for (let i = 1; i < lines.length; i++) {
    const prevLine = lines[i - 1];
    const currLine = lines[i];

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

function createBlock(lines: PdfTextItem[][], pageIndex: number, medianFontSize: number): PdfStructuredBlock {
  const text = lines.map(linesToText).join(' ').replace(/\s+/g, ' ').trim();
  const fontSize = lines[0][0].fontSize;
  const isBold = lines[0][0].isBold;
  const isItalic = lines[0][0].isItalic;

  // Detect headings: significantly larger font than median, or bold + larger
  const isHeading = fontSize > medianFontSize * 1.2;

  if (isHeading) {
    // Map font size ratio to heading level
    const ratio = fontSize / medianFontSize;
    let level = 3;
    if (ratio > 2.0) level = 1;
    else if (ratio > 1.5) level = 2;
    else if (ratio > 1.2) level = 3;

    return {
      id: generateId(),
      type: 'heading',
      level,
      content: text,
      isBold: true,
      isItalic,
      fontSize,
      pageIndex,
    };
  }

  // Check if it looks like a list item
  if (/^[\u2022\u2023\u25E6\u2043\u2219•●○◦-]\s/.test(text) || /^\d+[.)]\s/.test(text)) {
    return {
      id: generateId(),
      type: 'list-item',
      content: text,
      isBold,
      isItalic,
      fontSize,
      pageIndex,
    };
  }

  return {
    id: generateId(),
    type: 'paragraph',
    content: text,
    isBold,
    isItalic,
    fontSize,
    pageIndex,
  };
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

    let textBlocks: PdfStructuredBlock[];
    if (columns) {
      // Process left column first, then right
      const leftBlocks = groupIntoBlocks(columns.left, pageIndex, medianFontSize);
      const rightBlocks = groupIntoBlocks(columns.right, pageIndex, medianFontSize);
      textBlocks = [...leftBlocks, ...rightBlocks];
    } else {
      textBlocks = groupIntoBlocks(lines, pageIndex, medianFontSize);
    }

    // Extract images from the page
    const imageBlocks = await extractPageImages(page, pdfjsLib, pageIndex);

    pages.push({
      pageIndex,
      width: viewport.width,
      height: viewport.height,
      blocks: [...textBlocks, ...imageBlocks],
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
