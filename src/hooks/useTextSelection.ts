'use client';

import { useEffect, useState, useCallback } from 'react';

export interface SelectionRange {
  startBlockIndex: number;
  startCharOffset: number;
  endBlockIndex: number;
  endCharOffset: number;
  text: string;
  rect: DOMRect;
}

function getBlockIndex(node: Node): number | null {
  let el: HTMLElement | null = node instanceof HTMLElement ? node : node.parentElement;
  while (el) {
    if (el.dataset.blockIndex !== undefined) {
      return parseInt(el.dataset.blockIndex, 10);
    }
    el = el.parentElement;
  }
  return null;
}

function getCharOffset(container: Node, offset: number, blockElement: HTMLElement): number {
  const walker = document.createTreeWalker(blockElement, NodeFilter.SHOW_TEXT);
  let charCount = 0;
  let node: Node | null;

  while ((node = walker.nextNode())) {
    if (node === container) {
      return charCount + offset;
    }
    charCount += (node.textContent?.length || 0);
  }

  return charCount + offset;
}

export function useTextSelection() {
  const [selectionRange, setSelectionRange] = useState<SelectionRange | null>(null);

  const handleSelectionChange = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.rangeCount) {
      return;
    }

    const range = selection.getRangeAt(0);
    const text = selection.toString().trim();
    if (!text) {
      setSelectionRange(null);
      return;
    }

    const startBlockIndex = getBlockIndex(range.startContainer);
    const endBlockIndex = getBlockIndex(range.endContainer);

    if (startBlockIndex === null || endBlockIndex === null) {
      setSelectionRange(null);
      return;
    }

    const startBlockEl = document.querySelector(`[data-block-index="${startBlockIndex}"]`) as HTMLElement;
    const endBlockEl = document.querySelector(`[data-block-index="${endBlockIndex}"]`) as HTMLElement;

    if (!startBlockEl || !endBlockEl) {
      setSelectionRange(null);
      return;
    }

    const startCharOffset = getCharOffset(range.startContainer, range.startOffset, startBlockEl);
    const endCharOffset = getCharOffset(range.endContainer, range.endOffset, endBlockEl);

    const rect = range.getBoundingClientRect();

    setSelectionRange({
      startBlockIndex,
      startCharOffset,
      endBlockIndex,
      endCharOffset,
      text,
      rect,
    });
  }, []);

  useEffect(() => {
    const onMouseUp = () => {
      setTimeout(handleSelectionChange, 10);
    };

    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('touchend', onMouseUp);

    return () => {
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('touchend', onMouseUp);
    };
  }, [handleSelectionChange]);

  const clearSelection = useCallback(() => {
    setSelectionRange(null);
    window.getSelection()?.removeAllRanges();
  }, []);

  return { selectionRange, clearSelection };
}
