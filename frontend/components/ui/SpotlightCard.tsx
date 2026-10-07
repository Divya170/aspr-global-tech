import type { ElementType, ReactNode } from 'react';

/**
 * Card with a soft highlight that follows the cursor and an optional subtle 3D tilt.
 * Plain markup: the single PointerEffects listener (site layout) drives every card through
 * CSS variables, so cards cost nothing to hydrate.
 */
export function SpotlightCard({ children, className = '', tilt = false, as: As = 'div' }: { children: ReactNode; className?: string; tilt?: boolean; as?: ElementType }) {
  return (
    <As data-spotlight={tilt ? 'tilt' : ''} className={`spotlight transition-transform duration-500 ease-[var(--ease-out-expo)] ${className}`}>
      {children}
    </As>
  );
}
