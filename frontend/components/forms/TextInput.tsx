'use client';

import type { ComponentProps, ReactNode } from 'react';
import { controlClass, describedBy, Field } from './Field';

type Props = Omit<ComponentProps<'input'>, 'id' | 'onChange' | 'value'> & {
  id: string; label: ReactNode; value: string; onChange: (value: string) => void;
  hint?: ReactNode; error?: string; optional?: boolean; className?: string;
};

export function TextInput({ id, label, value, onChange, hint, error, optional, className, type = 'text', ...rest }: Props) {
  return (
    <Field id={id} label={label} hint={hint} error={error} optional={optional} className={className}>
      <input
        id={id} name={id} type={type} value={value} onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, hint, error)} aria-required={optional ? undefined : true}
        className={controlClass(!!error, 'h-12')} {...rest}
      />
    </Field>
  );
}
