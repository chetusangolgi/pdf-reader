'use client';

import { useCallback, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Upload, BookOpen, Clock } from 'lucide-react';
import { usePdfParser } from '@/hooks/usePdfParser';
import * as db from '@/lib/persistence/database';
import type { ReadingProgress } from '@/types/annotation';

export default function Home() {
  const router = useRouter();
  const { loadFile, isLoading, parseProgress, error } = usePdfParser();
  const [isDragging, setIsDragging] = useState(false);
  const [recentProgress, setRecentProgress] = useState<ReadingProgress | null>(null);

  useEffect(() => {
    db.getAllProgress().then((allProgress) => {
      if (allProgress.length > 0) {
        allProgress.sort((a, b) => b.lastReadAt - a.lastReadAt);
        setRecentProgress(allProgress[0]);
      }
    });
  }, []);

  const handleFile = useCallback(
    async (file: File) => {
      if (file.type !== 'application/pdf') {
        alert('Please select a PDF file.');
        return;
      }
      await loadFile(file);
      router.push('/reader');
    },
    [loadFile, router]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0f0f0f] px-4">
      {/* Branding */}
      <div className="mb-12 text-center">
        <div className="mb-4 flex items-center justify-center gap-3">
          <BookOpen className="h-10 w-10 text-blue-500" />
          <h1 className="text-4xl font-bold tracking-tight text-white">
            Rick Peruse
          </h1>
        </div>
        <p className="max-w-md text-lg text-zinc-400">
          The perfect PDF reader. Reflow, customize, listen, and immerse.
        </p>
      </div>

      {/* Resume Reading */}
      {recentProgress && (
        <button
          onClick={() => document.getElementById('file-input')?.click()}
          className="mb-8 flex w-full max-w-lg items-center gap-4 rounded-xl border border-zinc-700 bg-zinc-900/50 px-5 py-4 text-left transition-colors hover:border-blue-500/50 hover:bg-zinc-900"
        >
          <Clock className="h-6 w-6 text-blue-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-zinc-200 truncate">
              Resume: {recentProgress.fileName}
            </p>
            <p className="text-xs text-zinc-500">
              {Math.round(recentProgress.percentComplete)}% complete
            </p>
          </div>
        </button>
      )}

      {/* Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`
          flex w-full max-w-lg flex-col items-center justify-center
          rounded-2xl border-2 border-dashed p-16
          transition-all duration-200
          ${
            isDragging
              ? 'border-blue-500 bg-blue-500/10'
              : 'border-zinc-700 bg-zinc-900/50 hover:border-zinc-500 hover:bg-zinc-900'
          }
          ${isLoading ? 'pointer-events-none opacity-60' : 'cursor-pointer'}
        `}
        onClick={() => {
          if (!isLoading) document.getElementById('file-input')?.click();
        }}
        role="button"
        tabIndex={0}
        aria-label="Upload PDF file"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            document.getElementById('file-input')?.click();
          }
        }}
      >
        {isLoading ? (
          <div className="flex flex-col items-center gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-600 border-t-blue-500" />
            <p className="text-sm text-zinc-400">
              {parseProgress
                ? `Parsing page ${parseProgress.currentPage} of ${parseProgress.totalPages}...`
                : 'Loading PDF...'}
            </p>
            {parseProgress && (
              <div className="h-1.5 w-48 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all duration-300"
                  style={{
                    width: `${(parseProgress.currentPage / parseProgress.totalPages) * 100}%`,
                  }}
                />
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="mb-4 rounded-full bg-zinc-800 p-4">
              {isDragging ? (
                <FileText className="h-8 w-8 text-blue-400" />
              ) : (
                <Upload className="h-8 w-8 text-zinc-400" />
              )}
            </div>
            <p className="mb-1 text-base font-medium text-zinc-200">
              {isDragging ? 'Drop your PDF here' : 'Drop a PDF here or click to browse'}
            </p>
            <p className="text-sm text-zinc-500">Supports any PDF document</p>
          </>
        )}

        <input
          id="file-input"
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={handleFileInput}
        />
      </div>

      {error && (
        <div className="mt-4 rounded-lg bg-red-900/30 px-4 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Feature highlights */}
      <div className="mt-16 grid max-w-2xl grid-cols-2 gap-6 text-center sm:grid-cols-4">
        {[
          { label: 'Text Reflow', desc: 'Adapts to any screen' },
          { label: 'Custom Fonts', desc: 'Full typography control' },
          { label: 'Eye Care', desc: 'Science-backed themes' },
          { label: 'Listen', desc: 'Built-in text-to-speech' },
        ].map((f) => (
          <div key={f.label} className="flex flex-col items-center gap-1">
            <p className="text-sm font-medium text-zinc-300">{f.label}</p>
            <p className="text-xs text-zinc-500">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
