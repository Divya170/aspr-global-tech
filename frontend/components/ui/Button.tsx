import Link from 'next/link';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'link';
type Size = 'sm' | 'md' | 'lg';

const base = 'group/btn relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-[background,color,border-color,box-shadow,transform] duration-300 ease-[var(--ease-out-expo)] disabled:pointer-events-none disabled:opacity-60 active:scale-[0.98]';
const variants: Record<Variant, string> = {
  primary: 'bg-brand-strong text-white shadow-[0_0_0_1px_rgb(255_255_255/0.12)_inset,0_10px_30px_-10px_rgb(65_112_255/0.8)] hover:bg-[#2449c9] hover:shadow-[0_0_0_1px_rgb(255_255_255/0.18)_inset,0_14px_40px_-10px_rgb(139_92_246/0.8)]',
  secondary: 'border border-line-strong bg-white/[0.03] text-text hover:border-brand-soft/50 hover:bg-white/[0.06]',
  ghost: 'text-muted hover:bg-white/[0.05] hover:text-text',
  link: 'text-brand-soft hover:text-text px-0! h-auto!',
};
const sizes: Record<Size, string> = { sm: 'h-9 px-4 text-sm', md: 'h-11 px-5 text-[0.95rem]', lg: 'h-13 px-7 text-base' };

interface Common { variant?: Variant; size?: Size; arrow?: boolean | 'external'; className?: string; children: ReactNode }

export function buttonClass({ variant = 'primary', size = 'md', className = '' }: Pick<Common, 'variant' | 'size' | 'className'> = {}) {
  return `${base} ${variants[variant]} ${sizes[size]} ${className}`;
}

function Arrow({ kind }: { kind: Common['arrow'] }) {
  if (!kind) return null;
  const C = kind === 'external' ? ArrowUpRight : ArrowRight;
  return <C aria-hidden="true" size={17} className="transition-transform duration-300 group-hover/btn:translate-x-0.5" />;
}

/** Link styled as a button. External links open in a new tab. */
export function ButtonLink({ href, variant, size, arrow, className, children, ...rest }: Common & Omit<ComponentProps<typeof Link>, 'className' | 'children'>) {
  const external = typeof href === 'string' && /^(https?:|mailto:|tel:)/.test(href);
  const cls = buttonClass({ variant, size, className });
  if (external) {
    return (
      <a href={href as string} className={cls} {...(href.toString().startsWith('http') && { target: '_blank', rel: 'noopener noreferrer' })} {...(rest as ComponentProps<'a'>)}>
        {children}<Arrow kind={arrow} />
      </a>
    );
  }
  return <Link href={href} className={cls} {...rest}>{children}<Arrow kind={arrow} /></Link>;
}

export function Button({ variant, size, arrow, className, children, type = 'button', ...rest }: Common & Omit<ComponentProps<'button'>, 'className' | 'children'>) {
  return <button type={type} className={buttonClass({ variant, size, className })} {...rest}>{children}<Arrow kind={arrow} /></button>;
}
