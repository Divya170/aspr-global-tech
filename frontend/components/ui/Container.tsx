import type { ElementType, ReactNode } from 'react';

export function Container({ children, className = '', as: As = 'div', size = 'xl' }: { children: ReactNode; className?: string; as?: ElementType; size?: 'md' | 'lg' | 'xl' }) {
  const max = { md: 'max-w-3xl', lg: 'max-w-5xl', xl: 'max-w-7xl' }[size];
  return <As className={`mx-auto w-full ${max} px-4 sm:px-6 lg:px-8 ${className}`}>{children}</As>;
}

export function Section({ children, className = '', id, labelledBy }: { children: ReactNode; className?: string; id?: string; labelledBy?: string }) {
  return <section id={id} aria-labelledby={labelledBy} className={`relative py-20 sm:py-28 ${className}`}>{children}</section>;
}
