'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import type { ReflowedBlock } from '@/lib/pdf/reflow';
import type { Highlight } from '@/types/annotation';
import { useTypographyStore } from '@/stores/typographyStore';
import { useThemeStore } from '@/stores/themeStore';
import { useAnnotationStore } from '@/stores/annotationStore';
import { useReaderStore } from '@/stores/readerStore';

interface ReflowedContentProps {
  blocks: ReflowedBlock[];
}

export function ReflowedContent({ blocks }: ReflowedContentProps) {
  const typography = useTypographyStore();
  const theme = useThemeStore((s) => s.activeTheme);
  const highlights = useAnnotationStore((s) => s.highlights);

  const containerStyle = useMemo(
    () => ({
      fontFamily: typography.fontFamily,
      fontSize: `${typography.fontSize}px`,
      lineHeight: `${typography.lineHeight}em`,
      letterSpacing: `${typography.letterSpacing}em`,
      wordSpacing: `${typography.wordSpacing}em`,
      textAlign: typography.textAlign as 'left' | 'justify',
      maxWidth: `${typography.maxWidth}px`,
      paddingTop: `${typography.marginTop}px`,
      paddingBottom: `${typography.marginBottom}px`,
      paddingLeft: `${typography.marginLeft}px`,
      paddingRight: `${typography.marginRight}px`,
      hyphens: typography.hyphenation ? ('auto' as const) : ('none' as const),
      '--reader-bg': theme.colors.background,
      '--reader-text': theme.colors.text,
      '--reader-accent': theme.colors.accent,
      '--reader-highlight': theme.colors.highlight,
      '--reader-surface': theme.colors.surface,
      background: theme.colors.background,
      color: theme.colors.text,
    }),
    [typography, theme]
  );

  const paragraphGap = useMemo(
    () => `${typography.paragraphSpacing}em`,
    [typography.paragraphSpacing]
  );

  return (
    <main
      className="reader-content mx-auto w-full transition-colors duration-300"
      style={containerStyle as React.CSSProperties}
      role="document"
      aria-label="Document content"
    >
      {blocks.map((block, index) => (
        <BlockRenderer
          key={block.id}
          block={block}
          index={index}
          paragraphGap={paragraphGap}
          highlights={highlights}
        />
      ))}
    </main>
  );
}

interface BlockRendererProps {
  block: ReflowedBlock;
  index: number;
  paragraphGap: string;
  highlights: Highlight[];
}

function renderHighlightedText(text: string, blockIndex: number, highlights: Highlight[]): React.ReactNode {
  const relevant = highlights.filter(
    (h) => blockIndex >= h.startBlockIndex && blockIndex <= h.endBlockIndex
  );

  if (relevant.length === 0) return text;

  const segments: { start: number; end: number; color: string; highlightId: string }[] = [];
  for (const h of relevant) {
    const start = blockIndex === h.startBlockIndex ? h.startCharOffset : 0;
    const end = blockIndex === h.endBlockIndex ? h.endCharOffset : text.length;
    segments.push({ start, end, color: h.color, highlightId: h.id });
  }

  segments.sort((a, b) => a.start - b.start);

  const nodes: React.ReactNode[] = [];
  let cursor = 0;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (cursor < seg.start) {
      nodes.push(text.slice(cursor, seg.start));
    }
    nodes.push(
      <mark
        key={seg.highlightId}
        style={{
          backgroundColor: seg.color + '40',
          borderBottom: `2px solid ${seg.color}`,
          borderRadius: '2px',
          padding: '0 1px',
        }}
        data-highlight-id={seg.highlightId}
      >
        {text.slice(seg.start, seg.end)}
      </mark>
    );
    cursor = seg.end;
  }

  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }

  return nodes;
}

// ---------------------------------------------------------------------------
// Lazy page-image renderer.
// Each instance opens its OWN pdf.js document so there is zero shared state
// and zero chance of render conflicts between pages.
// ---------------------------------------------------------------------------

function PageImage({ pageIndex, paragraphGap }: { pageIndex: number; paragraphGap: string }) {
  const file = useReaderStore((s) => s.file);
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (!file) return;

    let cancelled = false;

    (async () => {
      try {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.min.mjs',
          import.meta.url
        ).toString();

        // Use a COPY of the buffer — pdf.js detaches it
        const pdf = await pdfjsLib.getDocument({ data: file.slice(0) }).promise;
        const page = await pdf.getPage(pageIndex + 1);
        const scale = 2;
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d')!;

        await page.render({ canvasContext: ctx, canvas, viewport }).promise;

        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

        // Release canvas GPU memory immediately
        canvas.width = 0;
        canvas.height = 0;
        page.cleanup();
        await pdf.destroy();

        if (!cancelled && mounted.current) {
          setSrc(dataUrl);
        }
      } catch (e) {
        console.warn(`[pdf-reader] Failed to render page ${pageIndex} image:`, e);
        if (!cancelled && mounted.current) setFailed(true);
      }
    })();

    return () => { cancelled = true; };
  }, [file, pageIndex]);

  if (failed) return null;

  if (!src) {
    return (
      <div
        style={{
          marginBottom: paragraphGap,
          textAlign: 'center',
          padding: '3rem 1rem',
          opacity: 0.4,
          fontSize: '0.85rem',
        }}
      >
        Rendering page {pageIndex + 1}…
      </div>
    );
  }

  return (
    <figure style={{ marginBottom: paragraphGap, textAlign: 'center' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={`Page ${pageIndex + 1}`}
        style={{ width: '100%', height: 'auto', borderRadius: '4px' }}
      />
    </figure>
  );
}

// ---------------------------------------------------------------------------

function BlockRenderer({ block, index, paragraphGap, highlights }: BlockRendererProps) {
  const style: React.CSSProperties = {
    marginBottom: block.type === 'paragraph' || block.type === 'list-item' ? paragraphGap : undefined,
    fontWeight: block.isBold ? 700 : undefined,
    fontStyle: block.isItalic ? 'italic' : undefined,
  };

  switch (block.type) {
    case 'heading': {
      const Tag = `h${Math.min(block.level || 3, 6)}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
      return (
        <Tag
          data-block-index={index}
          data-page-index={block.pageIndex}
          style={style}
        >
          {renderHighlightedText(block.content, index, highlights)}
        </Tag>
      );
    }

    case 'paragraph':
      return (
        <p
          data-block-index={index}
          data-page-index={block.pageIndex}
          style={style}
        >
          {renderHighlightedText(block.content, index, highlights)}
        </p>
      );

    case 'list-item':
      return (
        <li
          data-block-index={index}
          data-page-index={block.pageIndex}
          style={style}
        >
          {renderHighlightedText(block.content, index, highlights)}
        </li>
      );

    case 'image':
      // Deferred page render — the parser only detected images, didn't render
      if (block.imageDataUrl === '__render_page__') {
        return <PageImage pageIndex={block.pageIndex} paragraphGap={paragraphGap} />;
      }
      // Pre-rendered data URL (legacy path)
      return block.imageDataUrl ? (
        <figure
          data-block-index={index}
          data-page-index={block.pageIndex}
          style={{ marginBottom: paragraphGap, textAlign: 'center' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={block.imageDataUrl}
            alt=""
            style={{ width: '100%', height: 'auto', borderRadius: '4px' }}
          />
        </figure>
      ) : null;

    case 'page-break':
      return (
        <div
          className="page-break-marker"
          data-page-index={block.pageIndex}
          aria-hidden="true"
        >
          <span>{block.content}</span>
        </div>
      );

    default:
      return (
        <p
          data-block-index={index}
          data-page-index={block.pageIndex}
          style={style}
        >
          {renderHighlightedText(block.content, index, highlights)}
        </p>
      );
  }
}
