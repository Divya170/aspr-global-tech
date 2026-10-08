import type { CSSProperties } from 'react';
import './forms.css';

const COLORS = ['var(--color-success)', 'var(--color-brand-soft)', 'var(--color-signal)', 'var(--color-accent-soft)'];

/** Decorative success mark: a ring and tick that draw in, with a small one-off burst. CSS only. */
export function SuccessMark({ size = '4.5rem', className = '' }: { size?: string; className?: string }) {
  return (
    <span aria-hidden="true" className={`fm-success ${className}`} style={{ '--s': size } as CSSProperties}>
      <span className="fm-burst">
        {Array.from({ length: 8 }, (_, k) => <i key={k} style={{ '--k': k, '--c': COLORS[k % COLORS.length] } as CSSProperties} />)}
      </span>
      <svg viewBox="0 0 72 72" fill="none">
        <circle className="fm-disc" cx="36" cy="36" r="30" fill="rgb(52 211 153 / 0.1)" />
        <circle className="fm-ring" cx="36" cy="36" r="33" stroke="var(--color-success)" strokeOpacity="0.55" strokeWidth="1.5" pathLength={1} transform="rotate(-90 36 36)" />
        <path className="fm-tick" d="M24 37.5l8 8L48.5 28" stroke="var(--color-success)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" pathLength={1} />
      </svg>
    </span>
  );
}
