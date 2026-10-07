import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-ghost';
type Size = 'xs' | 'sm' | 'md';

const base = 'inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50';
const variants: Record<Variant, string> = {
  primary: 'bg-brand-strong text-white hover:bg-brand-strong shadow-[0_0_0_1px_rgb(255_255_255/0.1)_inset]',
  secondary: 'border border-line-strong bg-white/[0.03] text-text hover:border-brand-soft/40 hover:bg-white/[0.07]',
  ghost: 'text-muted hover:bg-white/[0.06] hover:text-text',
  danger: 'bg-danger/90 text-white hover:bg-danger',
  'danger-ghost': 'text-danger hover:bg-danger/10',
};
const sizes: Record<Size, string> = { xs: 'h-7 px-2 text-xs', sm: 'h-8 px-3 text-[0.8125rem]', md: 'h-9 px-4 text-sm' };

export const btnClass = (variant: Variant = 'secondary', size: Size = 'md', className = '') => `${base} ${variants[variant]} ${sizes[size]} ${className}`;

interface Common { variant?: Variant; size?: Size; className?: string; icon?: ReactNode; children?: ReactNode }

export function AButton({ variant, size, className, icon, children, loading, type = 'button', disabled, ...rest }: Common & { loading?: boolean } & Omit<ComponentProps<'button'>, 'className' | 'children'>) {
  return (
    <button type={type} className={btnClass(variant, size, className)} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading ? <Loader2 aria-hidden="true" size={15} className="animate-spin" /> : icon}
      {children}
    </button>
  );
}

export function ALink({ variant, size, className, icon, children, ...rest }: Common & Omit<ComponentProps<typeof Link>, 'className' | 'children'>) {
  return <Link className={btnClass(variant, size, className)} {...rest}>{icon}{children}</Link>;
}

/** Square icon-only button; `label` becomes the accessible name and tooltip. */
export function IconButton({ label, children, className = '', size = 'md', ...rest }: { label: string; children: ReactNode; className?: string; size?: 'sm' | 'md' } & Omit<ComponentProps<'button'>, 'className' | 'children'>) {
  const dim = size === 'sm' ? 'h-7 w-7' : 'h-9 w-9';
  return (
    <button type="button" aria-label={label} title={label} className={`inline-flex ${dim} shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-white/[0.07] hover:text-text disabled:pointer-events-none disabled:opacity-40 ${className}`} {...rest}>
      {children}
    </button>
  );
}
