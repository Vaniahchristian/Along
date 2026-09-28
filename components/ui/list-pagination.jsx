'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

export function ListPagination({ page, pageSize, total, onPageChange, className = '' }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;
  const current = Math.min(Math.max(page, 1), totalPages);
  const start = (current - 1) * pageSize + 1;
  const end = Math.min(current * pageSize, total);

  return <nav aria-label="List pages" className={`flex flex-wrap items-center justify-between gap-3 py-5 ${className}`}>
    <p className="text-xs font-semibold text-muted-foreground">Showing {start}–{end} of {total}</p>
    <div className="flex items-center gap-2">
      <button type="button" disabled={current === 1} onClick={() => onPageChange(current - 1)} aria-label="Previous page" className="grid size-10 place-items-center rounded-xl border border-border bg-card text-forest hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft className="size-4" /></button>
      <span className="min-w-20 text-center text-xs font-bold text-forest">Page {current} of {totalPages}</span>
      <button type="button" disabled={current === totalPages} onClick={() => onPageChange(current + 1)} aria-label="Next page" className="grid size-10 place-items-center rounded-xl border border-border bg-card text-forest hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"><ChevronRight className="size-4" /></button>
    </div>
  </nav>;
}
