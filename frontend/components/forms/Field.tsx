import type { ReactNode } from 'react';

/** Shared control styling: calm, dark, 44px+ tap targets, brand focus ring, danger border on error. */
export function controlClass(invalid?: boolean, extra = '') {
  return [
    'block w-full min-h-11 rounded-xl border bg-white/[0.03] px-4 text-base text-text placeholder:text-subtle sm:text-[0.95rem]',
    'transition-[border-color,background-color,box-shadow] duration-200',
    'hover:border-brand-soft/40 focus:outline-none focus-visible:outline-none focus:border-brand-soft focus:bg-white/[0.05] focus:ring-2 focus:ring-brand-soft/30',
    'disabled:cursor-not-allowed disabled:opacity-60',
    invalid ? 'border-danger' : 'border-line-strong',
    extra,
  ].join(' ');
}

export const hintId = (id: string) => `${id}-hint`;
export const errorId = (id: string) => `${id}-error`;

/** The aria-describedby value for a control: its hint and its error, when present. */
export function describedBy(id: string, hint?: ReactNode, error?: string, extra?: string) {
  return [hint ? hintId(id) : '', error ? errorId(id) : '', extra || ''].filter(Boolean).join(' ') || undefined;
}

export interface FieldProps {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  /** Shows "(optional)" after the label. Fields are required unless marked optional. */
  optional?: boolean;
  className?: string;
  /** Extra content beside the label (e.g. a character count). */
  aside?: ReactNode;
  children: ReactNode;
}

/** Label + control + hint + error. The control itself sets `aria-describedby={describedBy(…)}` and `aria-invalid`. */
export function Field({ id, label, hint, error, optional, className = '', aside, children }: FieldProps) {
  return (
    <div className={className}>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-text">
          {label}
          {optional && <span className="ml-1.5 font-normal text-subtle">(optional)</span>}
        </label>
        {aside}
      </div>
      {children}
      <FieldMessages id={id} hint={hint} error={error} />
    </div>
  );
}

export function FieldMessages({ id, hint, error }: { id: string; hint?: ReactNode; error?: string }) {
  return (
    <>
      {hint && <p id={hintId(id)} className="mt-2 text-xs leading-relaxed text-subtle">{hint}</p>}
      {error && (
        <p id={errorId(id)} className="mt-2 flex items-start gap-1.5 text-sm text-danger">
          <span aria-hidden="true" className="mt-[0.45rem] size-1.5 shrink-0 rounded-full bg-danger" />
          {error}
        </p>
      )}
    </>
  );
}
