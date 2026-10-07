'use client';

import type { ComponentProps, ReactNode } from 'react';
import { controlClass, describedBy, Field } from './Field';

type Props = Omit<ComponentProps<'textarea'>, 'id' | 'onChange' | 'value'> & {
  id: string; label: ReactNode; value: string; onChange: (value: string) => void;
  hint?: ReactNode; error?: string; optional?: boolean; className?: string;
  /** Minimum length, shown in the counter until it is reached. */
  min?: number;
  maxLength?: number;
};

/** Multi-line input with a live character count (and a gentle "n more" until the minimum is met). */
export function TextArea({ id, label, value, onChange, hint, error, optional, className, min, maxLength = 5000, rows = 6, ...rest }: Props) {
  const len = value.trim().length;
  const short = min && len < min ? min - len : 0;
  const countId = `${id}-count`;
  return (
    <Field
      id={id} label={label} hint={hint} error={error} optional={optional} className={className}
      aside={
        <span id={countId} className={`shrink-0 font-mono text-xs tabular-nums ${short ? 'text-subtle' : 'text-muted'}`}>
          {short ? `${short} more character${short === 1 ? '' : 's'}` : `${value.length.toLocaleString()} / ${maxLength.toLocaleString()}`}
        </span>
      }
    >
      <textarea
        id={id} name={id} value={value} onChange={(e) => onChange(e.target.value)} rows={rows} maxLength={maxLength}
        aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, hint, error, countId)} aria-required={optional ? undefined : true}
        className={controlClass(!!error, 'resize-y py-3 leading-relaxed')} {...rest}
      />
    </Field>
  );
}
