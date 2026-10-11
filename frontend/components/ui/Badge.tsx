import type { ReactNode } from 'react';

export function Badge({ children, tone = 'default', className = '' }: { children: ReactNode; tone?: 'default' | 'brand' | 'accent'; className?: string }) {
  const tones = {
    default: 'fx-chip border-line-strong bg-surface text-muted',
    brand: 'border-brand/30 bg-brand/10 text-brand',
    accent: 'border-accent/30 bg-accent/10 text-success',
  };
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 font-mono text-[0.7rem] tracking-wide ${tones[tone]} ${className}`}>{children}</span>;
}
