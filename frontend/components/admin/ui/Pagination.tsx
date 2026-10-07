'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatNumber } from '@/lib/admin/format';

/** "21–40 of 132" with previous/next and a page jump. */
export function Pagination({ page, pages, total, pageSize, onPage, noun = 'items' }: {
  page: number; pages: number; total: number; pageSize: number; onPage: (p: number) => void; noun?: string;
}) {
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm text-muted">
      <p aria-live="polite"><span className="tabular-nums text-text">{formatNumber(from)}–{formatNumber(to)}</span> of <span className="tabular-nums text-text">{formatNumber(total)}</span> {noun}</p>
      {pages > 1 && (
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="Previous page"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line-strong text-muted hover:text-text disabled:opacity-40">
            <ChevronLeft size={16} aria-hidden="true" />
          </button>
          <label className="flex items-center gap-1.5">
            <span className="sr-only">Page</span>
            <select value={page} onChange={(e) => onPage(Number(e.target.value))}
              className="h-8 rounded-lg border border-line-strong bg-bg-2 px-2 text-sm tabular-nums text-text">
              {Array.from({ length: pages }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
            </select>
            <span className="whitespace-nowrap">of {pages}</span>
          </label>
          <button type="button" onClick={() => onPage(page + 1)} disabled={page >= pages} aria-label="Next page"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line-strong text-muted hover:text-text disabled:opacity-40">
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </div>
      )}
    </nav>
  );
}
