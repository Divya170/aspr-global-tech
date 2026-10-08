'use client';

import { ChevronDown } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { controlClass, describedBy, Field } from './Field';

type Props = Omit<ComponentProps<'select'>, 'id' | 'onChange' | 'value'> & {
  id: string; label: ReactNode; value: string; onChange: (value: string) => void; options: string[];
  placeholder?: string; hint?: ReactNode; error?: string; optional?: boolean; className?: string;
  /** Decorative icon shown inside the control, before the value. */
  icon?: ReactNode;
};

/** Native select (best keyboard and mobile behaviour), styled to match the other controls. */
export function Select({ id, label, value, onChange, options, placeholder = 'Choose one', hint, error, optional, className, icon, ...rest }: Props) {
  return (
    <Field id={id} label={label} hint={hint} error={error} optional={optional} className={className}>
      <div className="relative">
        {icon && <span aria-hidden="true" className="fm-lead">{icon}</span>}
        <select
          id={id} name={id} value={value} onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, hint, error)} aria-required={optional ? undefined : true}
          className={controlClass(!!error, `h-12 cursor-pointer appearance-none pr-11 ${icon ? 'pl-11' : ''} [&>option]:bg-surface [&>option]:text-text ${value ? '' : 'text-subtle!'}`)} {...rest}
        >
          <option value="">{placeholder}</option>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <span aria-hidden="true" className="fm-chev pointer-events-none absolute right-3 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-lg bg-white/[0.04] text-subtle">
          <ChevronDown size={16} />
        </span>
      </div>
    </Field>
  );
}
