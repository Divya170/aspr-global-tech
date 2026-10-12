'use client';

import { Search } from 'lucide-react';
import { useId, type ComponentProps, type ReactNode } from 'react';

export const inputClass =
  'block w-full rounded-lg border border-line-strong bg-bg-2 px-3 text-sm text-text placeholder:text-subtle transition-colors hover:border-brand-soft/30 focus:border-brand-soft focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-brand/25 disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-danger/70';

interface ShellProps {
  label: ReactNode;
  id: string;
  hint?: ReactNode;
  error?: string | null;
  required?: boolean;
  counter?: { value: number; max: number };
  children: ReactNode;
  className?: string;
  hideLabel?: boolean;
}

/** Label, hint, error and optional character counter around any control. */
export function FieldShell({ label, id, hint, error, required, counter, children, className = '', hideLabel }: ShellProps) {
  return (
    <div className={className} data-field-error={error ? 'true' : undefined}>
      <div className={`mb-1.5 flex items-baseline justify-between gap-3 ${hideLabel ? 'sr-only' : ''}`}>
        <label htmlFor={id} className="text-[0.8125rem] font-medium text-text">
          {label}{required && <span className="text-danger" aria-hidden="true"> *</span>}{required && <span className="sr-only"> (required)</span>}
        </label>
        {counter && (
          <span className={`font-mono text-[0.7rem] tabular-nums ${counter.value > counter.max ? 'text-danger' : counter.value > counter.max * 0.9 ? 'text-warning' : 'text-subtle'}`} aria-live="polite">
            {counter.value}/{counter.max}
          </span>
        )}
      </div>
      {children}
      {hint && !error && <p id={`${id}-hint`} className="mt-1.5 text-xs leading-relaxed text-subtle">{hint}</p>}
      {error && <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-danger">{error}</p>}
    </div>
  );
}

const describedBy = (id: string, hint?: ReactNode, error?: string | null) => (error ? `${id}-error` : hint ? `${id}-hint` : undefined);

type Base = { label: ReactNode; hint?: ReactNode; error?: string | null; className?: string; hideLabel?: boolean; showCount?: boolean };

export function TextField({ label, hint, error, className, hideLabel, showCount, id, maxLength, value, required, ...rest }: Base & Omit<ComponentProps<'input'>, 'className'>) {
  const auto = useId();
  const fid = id || auto;
  const len = typeof value === 'string' ? value.length : 0;
  return (
    <FieldShell label={label} id={fid} hint={hint} error={error} required={required} className={className} hideLabel={hideLabel}
      counter={showCount && maxLength ? { value: len, max: maxLength } : undefined}>
      <input id={fid} value={value} maxLength={maxLength} required={required} aria-invalid={error ? true : undefined} aria-describedby={describedBy(fid, hint, error)} className={`${inputClass} h-9`} {...rest} />
    </FieldShell>
  );
}

export function TextArea({ label, hint, error, className, hideLabel, showCount, id, maxLength, value, required, rows = 4, ...rest }: Base & Omit<ComponentProps<'textarea'>, 'className'>) {
  const auto = useId();
  const fid = id || auto;
  const len = typeof value === 'string' ? value.length : 0;
  return (
    <FieldShell label={label} id={fid} hint={hint} error={error} required={required} className={className} hideLabel={hideLabel}
      counter={showCount && maxLength ? { value: len, max: maxLength } : undefined}>
      <textarea id={fid} rows={rows} value={value} maxLength={maxLength} required={required} aria-invalid={error ? true : undefined} aria-describedby={describedBy(fid, hint, error)} className={`${inputClass} resize-y py-2 leading-relaxed`} {...rest} />
    </FieldShell>
  );
}

export function SelectField({ label, hint, error, className, hideLabel, id, required, children, ...rest }: Base & Omit<ComponentProps<'select'>, 'className'>) {
  const auto = useId();
  const fid = id || auto;
  return (
    <FieldShell label={label} id={fid} hint={hint} error={error} required={required} className={className} hideLabel={hideLabel}>
      <Select id={fid} required={required} aria-invalid={error ? true : undefined} aria-describedby={describedBy(fid, hint, error)} {...rest}>{children}</Select>
    </FieldShell>
  );
}

/** Bare select with the admin look (for filter bars). */
export function Select({ className = '', children, ...rest }: ComponentProps<'select'>) {
  return (
    <select className={`${inputClass} h-9 cursor-pointer appearance-none bg-[length:16px] bg-[right_0.6rem_center] bg-no-repeat pr-8 ${className}`}
      style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%237d86a0' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }}
      {...rest}>
      {children}
    </select>
  );
}

/** On/off switch (role="switch"). */
export function Switch({ checked, onChange, label, hint, error, disabled, id, hideLabel, className = '' }: {
  checked: boolean; onChange: (v: boolean) => void; label: ReactNode; hint?: ReactNode; error?: string | null; disabled?: boolean; id?: string; hideLabel?: boolean; className?: string;
}) {
  const auto = useId();
  const fid = id || auto;
  return (
    <div className={className} data-field-error={error ? 'true' : undefined}>
      <div className="flex items-start gap-3">
        <button
          id={fid}
          type="button"
          role="switch"
          aria-checked={checked}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(fid, hint, error)}
          aria-label={hideLabel && typeof label === 'string' ? label : undefined}
          disabled={disabled}
          onClick={() => onChange(!checked)}
          className={`relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors disabled:opacity-50 ${checked ? 'border-brand bg-brand' : 'border-line-strong bg-surface-3'} ${error ? 'ring-2 ring-danger/50' : ''}`}
        >
          <span aria-hidden="true" className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-[1.1rem]' : 'translate-x-0.5'}`} />
        </button>
        {!hideLabel && <label htmlFor={fid} className="cursor-pointer select-none text-[0.8125rem] font-medium text-text">{label}</label>}
      </div>
      {hint && !error && <p id={`${fid}-hint`} className={`mt-1 text-xs leading-relaxed text-subtle ${hideLabel ? '' : 'pl-12'}`}>{hint}</p>}
      {error && <p id={`${fid}-error`} className={`mt-1 text-xs font-medium text-danger ${hideLabel ? '' : 'pl-12'}`}>{error}</p>}
    </div>
  );
}

export function Checkbox({ label, className = '', ...rest }: { label: ReactNode; className?: string } & Omit<ComponentProps<'input'>, 'type' | 'className'>) {
  return (
    <label className={`inline-flex cursor-pointer items-center gap-2 text-sm text-text ${className}`}>
      <input type="checkbox" className="h-4 w-4 cursor-pointer rounded border-line-strong accent-[var(--color-brand)]" {...rest} />
      <span>{label}</span>
    </label>
  );
}

/** Search box for list pages. */
export function SearchInput({ label = 'Search', className = '', ...rest }: { label?: string; className?: string } & Omit<ComponentProps<'input'>, 'className' | 'type'>) {
  return (
    <div className={`relative ${className}`}>
      <Search aria-hidden="true" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
      <input type="search" aria-label={label} className={`${inputClass} h-9 pl-9`} {...rest} />
    </div>
  );
}
