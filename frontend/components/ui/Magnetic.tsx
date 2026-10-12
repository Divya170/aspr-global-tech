import type { ReactNode } from 'react';

/** Pulls its child a few pixels toward the cursor (driven by PointerEffects; fine pointers only). */
export function Magnetic({ children, strength = 0.25, className = '' }: { children: ReactNode; strength?: number; className?: string }) {
  return (
    <span data-magnetic={strength} className={`inline-flex transition-transform duration-500 ease-[var(--ease-out-expo)] ${className}`}>
      {children}
    </span>
  );
}
