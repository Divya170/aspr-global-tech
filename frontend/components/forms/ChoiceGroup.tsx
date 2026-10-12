'use client';

import { Check } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { describedBy, errorId, FieldMessages } from './Field';

export interface Choice { value: string; label?: ReactNode; description?: ReactNode; icon?: ReactNode }

/**
 * Single choice from a short list, rendered as cards or chips. Real radio inputs underneath, so
 * arrow keys move between options, Tab enters and leaves the group, and screen readers announce
 * "radio button, 2 of 6". The focusable target for error links is `#<id>` (the checked option,
 * or the first one). Cards are tactile: cursor glow (via PointerEffects' data-spotlight), a
 * gradient border and a popping tick when chosen (.fm-choice in forms.css).
 */
export function ChoiceGroup({ id, legend, options, value, onChange, hint, error, optional, variant = 'card', columns = 'sm:grid-cols-2 lg:grid-cols-3', className = '', legendClass = '' }: {
  id: string; legend: ReactNode; options: (string | Choice)[]; value: string; onChange: (value: string) => void;
  hint?: ReactNode; error?: string; optional?: boolean; variant?: 'card' | 'chip'; columns?: string; className?: string; legendClass?: string;
}) {
  const list: Choice[] = options.map((o) => (typeof o === 'string' ? { value: o } : o));
  const focusIndex = Math.max(0, list.findIndex((o) => o.value === value));
  const chip = variant === 'chip';

  return (
    <fieldset
      // radiogroup role: lets the group carry aria-required / aria-invalid, which plain fieldsets can't.
      role="radiogroup" className={`min-w-0 ${className}`} aria-describedby={describedBy(id, hint, error)}
      aria-invalid={error ? true : undefined} aria-required={optional ? undefined : true}
    >
      <legend className={`mb-3 text-sm font-medium text-text ${legendClass}`}>
        {legend}{optional && <span className="ml-1.5 font-normal text-subtle">(optional)</span>}
      </legend>
      <div className={chip ? 'flex flex-wrap gap-2.5' : `grid gap-3 ${columns}`}>
        {list.map((o, i) => {
          const checked = o.value === value;
          const radio = (
            <span aria-hidden="true" className={`fm-radio grid shrink-0 place-items-center rounded-full border ${chip ? 'size-4.5' : 'size-5.5'} ${checked ? 'border-transparent bg-brand-strong text-white' : 'border-line-strong bg-surface'}`}>
              {checked && <Check size={chip ? 11 : 12} strokeWidth={3.2} className="fm-pop" />}
            </span>
          );
          return (
            <label
              key={o.value} data-spotlight=""
              style={{ '--i': i } as CSSProperties}
              className={[
                'fm-choice fm-rise group relative flex cursor-pointer select-none border',
                chip ? 'fm-chip min-h-12 items-center gap-2.5 rounded-full py-2 pl-3 pr-5 text-sm' : `min-h-16 rounded-2xl p-4 ${o.icon ? 'items-start gap-3.5 sm:min-h-36 sm:flex-col sm:gap-4 sm:p-5' : 'items-center gap-3'}`,
                checked ? 'is-checked' : '',
                checked ? 'bg-brand/12 text-text' : `${error ? 'border-danger/45' : 'border-line-strong'} bg-surface text-muted hover:border-brand-soft/40 hover:bg-surface-3 hover:text-text`,
              ].join(' ')}
            >
              <input
                type="radio" name={id} value={o.value} checked={checked} onChange={() => onChange(o.value)}
                id={i === focusIndex ? id : `${id}-${i}`}
                aria-describedby={error && i === focusIndex ? errorId(id) : undefined}
                className="sr-only"
              />
              {(chip || !o.icon) && radio}
              {o.icon && <span aria-hidden="true" className="fm-choice-icon">{o.icon}</span>}
              <span className={`min-w-0 ${o.icon ? 'flex-1 pr-7 sm:pr-0' : ''}`}>
                <span className={`block ${chip ? 'font-medium' : 'text-[0.95rem] font-semibold tracking-[-0.01em]'} ${checked ? 'text-text' : ''}`}>{o.label ?? o.value}</span>
                {o.description && <span className="mt-1 block text-xs leading-relaxed text-subtle">{o.description}</span>}
              </span>
              {!chip && o.icon && <span className="absolute right-4 top-4 sm:right-5 sm:top-5">{radio}</span>}
            </label>
          );
        })}
      </div>
      <FieldMessages id={id} hint={hint} error={error} />
    </fieldset>
  );
}
