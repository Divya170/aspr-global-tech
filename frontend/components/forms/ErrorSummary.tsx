'use client';

import { AlertCircle } from 'lucide-react';
import { useEffect, useRef } from 'react';

export interface FormError { id: string; message: string }

/** Moves focus to an element by id and scrolls it into view, e.g. from an error link. */
export function focusField(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.focus({ preventScroll: true });
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
}

/**
 * List of problems shown after a failed submit. Takes focus whenever `focusKey` changes, so a
 * screen reader reads it straight away; each item links to its field.
 */
export function ErrorSummary({ errors, focusKey, title }: { errors: FormError[]; focusKey: number; title?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!focusKey || !ref.current) return;
    ref.current.focus({ preventScroll: true });
    ref.current.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }, [focusKey]);
  if (!errors.length) return null;
  const heading = title || (errors.length === 1 ? 'There is one thing to fix' : `There are ${errors.length} things to fix`);
  return (
    <div ref={ref} tabIndex={-1} role="alert" aria-labelledby="error-summary-title"
      className="rounded-xl border border-danger/50 bg-danger/[0.07] p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-danger/60 sm:p-5">
      <p id="error-summary-title" className="flex items-center gap-2 text-sm font-semibold text-text">
        <AlertCircle aria-hidden="true" size={17} className="text-danger" />{heading}
      </p>
      <ul className="mt-2.5 space-y-1.5 pl-6.5">
        {errors.map((e) => (
          <li key={e.id + e.message} className="text-sm">
            <a href={`#${e.id}`} onClick={(ev) => { ev.preventDefault(); focusField(e.id); }}
              className="text-danger underline decoration-danger/40 underline-offset-4 hover:decoration-danger">
              {e.message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
