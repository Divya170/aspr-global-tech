import type { ReactNode } from 'react';
import type { Tone } from '@/lib/admin/constants';

const tones: Record<Tone, string> = {
  neutral: 'border-line-strong bg-white/[0.04] text-muted',
  brand: 'border-brand/35 bg-brand/12 text-brand-soft',
  accent: 'border-accent/35 bg-accent/12 text-accent-soft',
  signal: 'border-signal/30 bg-signal/10 text-signal',
  success: 'border-success/30 bg-success/10 text-success',
  warning: 'border-warning/30 bg-warning/10 text-warning',
  danger: 'border-danger/35 bg-danger/10 text-danger',
};
const dots: Record<Tone, string> = {
  neutral: 'bg-subtle', brand: 'bg-brand-soft', accent: 'bg-accent-soft', signal: 'bg-signal', success: 'bg-success', warning: 'bg-warning', danger: 'bg-danger',
};

/** Coloured status label. Always shows text, so meaning never depends on colour alone. */
export function StatusPill({ tone = 'neutral', children, className = '' }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium ${tones[tone]} ${className}`}>
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${dots[tone]}`} />
      {children}
    </span>
  );
}
