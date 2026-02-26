'use client';

import { useMemo } from 'react';
import type { ReflowedBlock } from '@/lib/pdf/reflow';
import type { Highlight } from '@/types/annotation';
import { useTypographyStore } from '@/stores/typographyStore';
import { useThemeStore } from '@/stores/themeStore';
import { useAnnotationStore } from '@/stores/annotationStore';

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
