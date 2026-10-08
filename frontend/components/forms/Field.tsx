import { CircleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import '@/components/pages/forms/forms.css';

/**
 * Shared control styling: dark glass, 44px+ tap targets, glowing brand focus (.fm-control in
 * forms.css), danger border on error.
 */
export function controlClass(invalid?: boolean, extra = '') {
  return [
    'fm-control block w-full min-h-11 rounded-xl border bg-white/[0.03] px-4 text-base text-text placeholder:text-subtle sm:text-[0.95rem]',
    'shadow-[inset_0_1px_0_rgb(255_255_255/0.03)] focus:outline-none focus-visible:outline-none',
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

/**
 * Label + control + hint + error. The control itself sets `aria-describedby={describedBy(…)}` and
 * `aria-invalid`. The label lights up and a gradient line draws under the control while focused.
 */
export function Field({ id, label, hint, error, optional, className = '', aside, children }: FieldProps) {
  return (
    <div className={`fm-field ${className}`}>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="fm-label text-sm font-medium text-text">
          {label}
          {optional && <span className="ml-1.5 font-normal text-subtle">(optional)</span>}
        </label>
        {aside}
      </div>
      <div className="fm-wrap">
        {children}
        <span aria-hidden="true" className="fm-line" />
      </div>
      <FieldMessages id={id} hint={hint} error={error} />
    </div>
  );
}

export function FieldMessages({ id, hint, error }: { id: string; hint?: ReactNode; error?: string }) {
  return (
    <>
      {hint && <p id={hintId(id)} className="mt-2 text-xs leading-relaxed text-subtle">{hint}</p>}
      {error && (
        <p id={errorId(id)} className="fm-err mt-2 flex items-start gap-1.5 text-sm text-danger">
          <CircleAlert aria-hidden="true" size={15} strokeWidth={2} className="mt-[0.2rem] shrink-0" />
          {error}
        </p>
      )}
    </>
  );
}
