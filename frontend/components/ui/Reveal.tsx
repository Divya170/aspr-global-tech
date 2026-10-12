import type { CSSProperties, ElementType, ReactNode } from 'react';

/**
 * Fades its content up as it scrolls into view, using CSS scroll-driven animations (see
 * .reveal in globals.css). No JavaScript: content is never hidden waiting for hydration, and
 * browsers without support (or with reduced motion) simply show it.
 * `delay` (ms) staggers siblings by starting their animation slightly later in the scroll.
 */
export function Reveal({ children, className = '', delay = 0, as: As = 'div' }: { children: ReactNode; className?: string; delay?: number; as?: ElementType }) {
  return (
    <As className={`reveal ${className}`} style={delay ? ({ '--reveal-shift': `${Math.min(delay / 25, 14)}%` } as CSSProperties) : undefined}>
      {children}
    </As>
  );
}
