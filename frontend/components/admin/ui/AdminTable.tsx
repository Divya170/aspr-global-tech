'use client';

import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import type { KeyboardEvent, MouseEvent, ReactNode } from 'react';

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  /** Sort values this column toggles between; `desc` is applied first. */
  sort?: { desc: string; asc?: string };
  className?: string;
  headerClassName?: string;
}

interface Props<T> {
  caption: string;
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  sort?: string;
  onSort?: (value: string) => void;
  /** Row click (also Enter on a focused row). Interactive elements inside the row keep their own behaviour. */
  onRowClick?: (row: T) => void;
  rowLabel?: (row: T) => string;
  /** Rendered instead of the table below the `md` breakpoint. */
  mobileCard?: (row: T) => ReactNode;
  rowClassName?: (row: T) => string;
}

const interactive = (el: EventTarget | null) => !!(el as Element | null)?.closest?.('a, button, input, select, textarea, label, [role="switch"]');

/** Dense, sortable data table with a card layout for small screens. */
export function AdminTable<T>({ caption, columns, rows, rowKey, sort, onSort, onRowClick, rowLabel, mobileCard, rowClassName }: Props<T>) {
  const click = (row: T) => (e: MouseEvent) => { if (!interactive(e.target)) onRowClick?.(row); };
  const key = (row: T) => (e: KeyboardEvent) => { if (e.key === 'Enter' && e.target === e.currentTarget) onRowClick?.(row); };
  return (
    <>
      <div className={`${mobileCard ? 'hidden md:block' : ''} overflow-x-auto`}>
        <table className="w-full border-collapse text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-line">
              {columns.map((c) => {
                const active = c.sort && (sort === c.sort.desc || sort === c.sort.asc);
                const dir = active ? (sort === c.sort!.asc ? 'ascending' : 'descending') : undefined;
                return (
                  <th key={c.key} scope="col" aria-sort={c.sort ? dir ?? 'none' : undefined}
                    className={`whitespace-nowrap px-4 py-2.5 text-[0.7rem] font-medium uppercase tracking-[0.08em] text-subtle ${c.headerClassName ?? ''}`}>
                    {c.sort && onSort ? (
                      <button type="button" onClick={() => onSort(active && sort === c.sort!.desc && c.sort!.asc ? c.sort!.asc : c.sort!.desc)}
                        className={`-mx-1 inline-flex items-center gap-1 rounded px-1 uppercase tracking-[0.08em] hover:text-text ${active ? 'text-text' : ''}`}>
                        {c.header}
                        {active ? (dir === 'ascending' ? <ArrowUp size={12} aria-hidden="true" /> : <ArrowDown size={12} aria-hidden="true" />) : <ArrowUpDown size={12} aria-hidden="true" className="opacity-50" />}
                      </button>
                    ) : c.header}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={rowKey(row)}
                onClick={onRowClick ? click(row) : undefined}
                onKeyDown={onRowClick ? key(row) : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                aria-label={onRowClick && rowLabel ? rowLabel(row) : undefined}
                className={`border-b border-line/70 last:border-0 transition-colors ${onRowClick ? 'cursor-pointer hover:bg-white/[0.03] focus-visible:bg-white/[0.04]' : ''} ${rowClassName?.(row) ?? ''}`}>
                {columns.map((c) => <td key={c.key} className={`px-4 py-3 align-middle ${c.className ?? ''}`}>{c.cell(row)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {mobileCard && (
        <ul className="divide-y divide-line md:hidden" aria-label={caption}>
          {rows.map((row) => <li key={rowKey(row)}>{mobileCard(row)}</li>)}
        </ul>
      )}
    </>
  );
}
