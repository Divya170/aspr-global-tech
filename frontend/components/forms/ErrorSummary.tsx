'use client';

import { AlertCircle, ArrowRight } from 'lucide-react';
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
 * screen reader reads it straight away; each item links to its field. Danger-tinted glass that
 * gives a short shake each time it is shown again (not for reduced motion).
 */
export function ErrorSummary({ errors, focusKey, title }: { errors: FormError[]; focusKey: number; title?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!focusKey || !ref.current) return;
    ref.current.focus({ preventScroll: true });
    ref.current.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) ref.current.animate?.({ translate: ['0 0', '-6px 0', '5px 0', '-3px 0', '2px 0', '0 0'] }, { duration: 420, easing: 'ease-out' });
  }, [focusKey]);
  if (!errors.length) return null;
  const heading = title || (errors.length === 1 ? 'There is one thing to fix' : `There are ${errors.length} things to fix`);
  return (
    <div ref={ref} tabIndex={-1} role="alert" aria-labelledby="error-summary-title"
      className="fm-sum flex items-start gap-3.5 p-4 pl-5 focus:outline-none sm:p-5 sm:pl-6">
      <span aria-hidden="true" className="fm-sum-icon"><AlertCircle size={17} /></span>
      <div className="min-w-0 flex-1 pt-1">
        <p id="error-summary-title" className="text-sm font-semibold text-text">{heading}</p>
        <ul className="mt-2.5 space-y-1.5">
          {errors.map((e) => (
            <li key={e.id + e.message} className="text-sm">
              <a href={`#${e.id}`} onClick={(ev) => { ev.preventDefault(); focusField(e.id); }}
                className="fm-sum-link inline-flex items-start gap-2 text-danger underline decoration-danger/40 underline-offset-4 hover:decoration-danger">
                <ArrowRight aria-hidden="true" size={14} className="fm-sum-arrow mt-[0.2rem] shrink-0" />
                {e.message}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
