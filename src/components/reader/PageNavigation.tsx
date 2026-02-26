'use client';

import { useEffect, useState, useRef } from 'react';
import { useReaderStore } from '@/stores/readerStore';

export function PageNavigation() {
  const document = useReaderStore((s) => s.document);
  const setCurrentPage = useReaderStore((s) => s.setCurrentPage);
  const currentPageIndex = useReaderStore((s) => s.currentPageIndex);
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Track which page is visible via IntersectionObserver
  useEffect(() => {
    const markers = window.document.querySelectorAll('[data-page-index]');
    if (markers.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const pageIdx = parseInt(
              (entry.target as HTMLElement).dataset.pageIndex || '0',
              10
            );
            setCurrentPage(pageIdx);
          }
        }
      },
      { rootMargin: '-20% 0px -70% 0px' }
    );

    markers.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [setCurrentPage]);

  // Auto-hide after 3 seconds of no scroll
  useEffect(() => {
    const handleScroll = () => {
      setVisible(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setVisible(false), 3000);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!document) return null;

  return (
    <div
      className={`fixed right-4 bottom-4 z-40 rounded-lg px-3 py-1.5 text-xs font-medium transition-opacity duration-300 ${
        visible ? 'opacity-70' : 'opacity-0'
      }`}
      style={{
        background: 'var(--reader-surface)',
        color: 'var(--reader-text)',
      }}
      aria-live="polite"
      aria-label={`Page ${currentPageIndex + 1} of ${document.pageCount}`}
    >
      Page {currentPageIndex + 1} of {document.pageCount}
    </div>
  );
}
