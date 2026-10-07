'use client';

import { ChevronDown } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { controlClass, describedBy, Field } from './Field';

type Props = Omit<ComponentProps<'select'>, 'id' | 'onChange' | 'value'> & {
  id: string; label: ReactNode; value: string; onChange: (value: string) => void; options: string[];
  placeholder?: string; hint?: ReactNode; error?: string; optional?: boolean; className?: string;
};

/** Native select (best keyboard and mobile behaviour), styled to match the other controls. */
export function Select({ id, label, value, onChange, options, placeholder = 'Choose one', hint, error, optional, className, ...rest }: Props) {
  return (
    <Field id={id} label={label} hint={hint} error={error} optional={optional} className={className}>
      <div className="relative">
        <select
          id={id} name={id} value={value} onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, hint, error)} aria-required={optional ? undefined : true}
          className={controlClass(!!error, `h-12 cursor-pointer appearance-none pr-11 [&>option]:bg-surface [&>option]:text-text ${value ? '' : 'text-subtle!'}`)} {...rest}
        >
          <option value="">{placeholder}</option>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <ChevronDown aria-hidden="true" size={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-subtle" />
      </div>
    </Field>
  );
}
