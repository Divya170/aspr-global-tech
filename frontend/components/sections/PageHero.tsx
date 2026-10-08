import type { ReactNode } from 'react';
import { Container } from '@/components/ui/Container';

/**
 * Hero for inner pages: drifting aurora light, the engineering grid with a cursor spotlight
 * (driven by PointerEffects through data-spotlight), h1 and lead.
 */
export function PageHero({ eyebrow, title, lead, children, compact = false }: { eyebrow?: string; title: ReactNode; lead?: ReactNode; children?: ReactNode; compact?: boolean }) {
  return (
    <section data-spotlight="" className={`relative isolate overflow-hidden ${compact ? 'pb-12 pt-36 sm:pt-40' : 'pb-16 pt-36 sm:pb-24 sm:pt-44'}`}>
      <div aria-hidden="true" className="fx-aurora -z-10 opacity-70"><i /><i /><i /></div>
      <div aria-hidden="true" className="bg-grid absolute inset-0 -z-10" />
      <div aria-hidden="true" className="fx-grid-spot -z-10" />
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 -z-10 h-64 bg-gradient-to-t from-bg via-bg/80 to-transparent" />
      <Container className="relative">
        <div className="max-w-4xl animate-fade-up">
          {eyebrow && <p className="eyebrow eyebrow-line mb-5">{eyebrow}</p>}
          <h1 className="text-display">{title}</h1>
          {lead && <p className="text-lead mt-6 max-w-2xl">{lead}</p>}
          {children && <div className="mt-9 flex flex-wrap gap-3">{children}</div>}
        </div>
      </Container>
    </section>
  );
}
