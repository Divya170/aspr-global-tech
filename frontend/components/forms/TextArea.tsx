'use client';

import type { ComponentProps, CSSProperties, ReactNode } from 'react';
import { controlClass, describedBy, Field } from './Field';

type Props = Omit<ComponentProps<'textarea'>, 'id' | 'onChange' | 'value'> & {
  id: string; label: ReactNode; value: string; onChange: (value: string) => void;
  hint?: ReactNode; error?: string; optional?: boolean; className?: string;
  /** Minimum length, shown in the counter until it is reached. */
  min?: number;
  maxLength?: number;
};

/**
 * Multi-line input with a live character count (and a gentle "n more" until the minimum is met).
 * A small decorative ring fills toward the minimum and turns into a tick once it is reached.
 */
export function TextArea({ id, label, value, onChange, hint, error, optional, className, min, maxLength = 5000, rows = 6, ...rest }: Props) {
  const len = value.trim().length;
  const short = min && len < min ? min - len : 0;
  const countId = `${id}-count`;
  return (
    <Field
      id={id} label={label} hint={hint} error={error} optional={optional} className={className}
      aside={
        <span className="flex shrink-0 items-center gap-2">
          {min ? (
            <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" className={`fm-meter ${short ? '' : 'is-met'}`} style={{ '--m': Math.min(1, len / min) } as CSSProperties}>
              <circle className="fm-meter-track" cx="8" cy="8" r="6.5" strokeWidth="1.6" />
              <circle className="fm-meter-fill" cx="8" cy="8" r="6.5" strokeWidth="1.6" strokeLinecap="round" pathLength={1} transform="rotate(-90 8 8)" />
              <path className="fm-meter-tick" d="M5.3 8.2l1.8 1.8 3.6-3.9" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" pathLength={1} />
            </svg>
          ) : null}
          <span id={countId} className={`font-mono text-xs tabular-nums ${short ? 'text-subtle' : 'text-muted'}`}>
            {short ? `${short} more character${short === 1 ? '' : 's'}` : `${value.length.toLocaleString()} / ${maxLength.toLocaleString()}`}
          </span>
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
