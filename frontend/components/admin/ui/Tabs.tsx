'use client';

import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react';

export interface TabItem { id: string; label: ReactNode; badge?: ReactNode }

/** WAI-ARIA tabs with arrow-key navigation. Render the active panel with <TabPanel>. */
export function Tabs({ tabs, value, onChange, label, className = '' }: { tabs: TabItem[]; value: string; onChange: (id: string) => void; label: string; className?: string }) {
  const base = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: KeyboardEvent, i: number) => {
    const n = tabs.length;
    const to = e.key === 'ArrowRight' ? (i + 1) % n : e.key === 'ArrowLeft' ? (i - 1 + n) % n : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : -1;
    if (to < 0) return;
    e.preventDefault();
    onChange(tabs[to].id);
    refs.current[to]?.focus();
  };
  return (
    <div role="tablist" aria-label={label} className={`flex gap-1 overflow-x-auto border-b border-line ${className}`}>
      {tabs.map((t, i) => {
        const selected = t.id === value;
        return (
          <button key={t.id} ref={(el) => { refs.current[i] = el; }} type="button" role="tab" id={`${base}-${t.id}`} aria-selected={selected}
            aria-controls={`tabpanel-${t.id}`} tabIndex={selected ? 0 : -1} onClick={() => onChange(t.id)} onKeyDown={(e) => onKey(e, i)}
            className={`-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${selected ? 'border-brand-soft text-text' : 'border-transparent text-muted hover:text-text'}`}>
            {t.label}{t.badge}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({ id, children, className = '' }: { id: string; children: ReactNode; className?: string }) {
  return <div role="tabpanel" id={`tabpanel-${id}`} tabIndex={0} className={`focus-visible:outline-none ${className}`}>{children}</div>;
}
