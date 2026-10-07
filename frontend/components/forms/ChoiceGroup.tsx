'use client';

import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import { describedBy, errorId, FieldMessages } from './Field';

export interface Choice { value: string; label?: ReactNode; description?: ReactNode; icon?: ReactNode }

/**
 * Single choice from a short list, rendered as cards or chips. Real radio inputs underneath, so
 * arrow keys move between options, Tab enters and leaves the group, and screen readers announce
 * "radio button, 2 of 6". The focusable target for error links is `#<id>` (the checked option,
 * or the first one).
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
      className={`min-w-0 ${className}`} aria-describedby={describedBy(id, hint, error)}
      aria-invalid={error ? true : undefined} aria-required={optional ? undefined : true}
    >
      <legend className={`mb-3 text-sm font-medium text-text ${legendClass}`}>
        {legend}{optional && <span className="ml-1.5 font-normal text-subtle">(optional)</span>}
      </legend>
      <div className={chip ? 'flex flex-wrap gap-2' : `grid gap-2.5 ${columns}`}>
        {list.map((o, i) => {
          const checked = o.value === value;
          return (
            <label
              key={o.value}
              className={[
                'group relative flex cursor-pointer select-none items-center border transition-[border-color,background-color,box-shadow] duration-200',
                'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-soft/60 has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-bg',
                chip ? 'min-h-11 gap-2 rounded-full px-4 text-sm' : 'min-h-14 gap-3 rounded-xl px-4 py-3',
                checked
                  ? 'border-brand-soft/70 bg-brand/12 text-text shadow-[0_0_0_1px_rgb(138_166_255/0.25)_inset]'
                  : `${error ? 'border-danger/45' : 'border-line-strong'} bg-white/[0.03] text-muted hover:border-brand-soft/40 hover:bg-white/[0.05] hover:text-text`,
              ].join(' ')}
            >
              <input
                type="radio" name={id} value={o.value} checked={checked} onChange={() => onChange(o.value)}
                id={i === focusIndex ? id : `${id}-${i}`}
                aria-describedby={error && i === focusIndex ? errorId(id) : undefined}
                className="sr-only"
              />
              {!chip && (
                <span aria-hidden="true" className={`grid size-5 shrink-0 place-items-center rounded-full border transition-colors ${checked ? 'border-brand-soft bg-brand text-white' : 'border-line-strong'}`}>
                  {checked && <Check size={12} strokeWidth={3} />}
                </span>
              )}
              {o.icon && <span aria-hidden="true" className={checked ? 'text-brand-soft' : 'text-subtle group-hover:text-brand-soft'}>{o.icon}</span>}
              <span className="min-w-0">
                <span className={`block ${chip ? '' : 'text-[0.95rem] font-medium'} ${checked ? 'text-text' : ''}`}>{o.label ?? o.value}</span>
                {o.description && <span className="mt-0.5 block text-xs leading-relaxed text-subtle">{o.description}</span>}
              </span>
              {chip && checked && <Check aria-hidden="true" size={14} strokeWidth={2.5} className="-mr-1 text-brand-soft" />}
            </label>
          );
        })}
      </div>
      <FieldMessages id={id} hint={hint} error={error} />
    </fieldset>
  );
}
