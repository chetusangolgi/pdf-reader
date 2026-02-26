'use client';

import { useAnnotationStore } from '@/stores/annotationStore';
import { useReaderStore } from '@/stores/readerStore';
import { Bookmark as BookmarkIcon, Trash2 } from 'lucide-react';

export function BookmarkList() {
  const { bookmarks, addBookmark, removeBookmark } = useAnnotationStore();
  const { currentPageIndex, fileName } = useReaderStore();

  const handleAddBookmark = () => {
    const docId = fileName || 'unknown';
    const id = `bm-${Date.now()}`;
    addBookmark({
      id,
      documentId: docId,
      blockIndex: currentPageIndex,
      label: `Page ${currentPageIndex + 1}`,
      createdAt: Date.now(),
    });
  };

  const handleNavigate = (blockIndex: number) => {
    const el = document.querySelector(`[data-page-index="${blockIndex}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Bookmarks</h3>
        <button
          onClick={handleAddBookmark}
          className="rounded bg-[var(--reader-accent)] px-2 py-1 text-xs text-white hover:opacity-90 transition-opacity"
          aria-label="Add bookmark at current position"
        >
          <BookmarkIcon className="inline h-3 w-3 mr-1" />
          Add
        </button>
      </div>

      {bookmarks.length === 0 ? (
        <p className="text-xs opacity-40">No bookmarks yet</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {bookmarks
            .sort((a, b) => a.blockIndex - b.blockIndex)
            .map((bm) => (
              <li
                key={bm.id}
                className="flex items-center justify-between rounded px-2 py-1.5 hover:bg-white/5 transition-colors"
              >
                <button
                  onClick={() => handleNavigate(bm.blockIndex)}
                  className="flex-1 text-left text-xs"
                  aria-label={`Go to ${bm.label}`}
                >
                  <BookmarkIcon className="inline h-3 w-3 mr-1.5 opacity-50" />
                  {bm.label}
                </button>
                <button
                  onClick={() => removeBookmark(bm.id)}
                  className="rounded p-1 opacity-30 hover:opacity-100 transition-opacity"
                  aria-label={`Remove bookmark: ${bm.label}`}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
