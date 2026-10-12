import type { ReactNode } from 'react';
import { Container } from '@/components/ui/Container';

/**
 * Hero for inner pages in main's style: dotted page background with two soft brand/mint blobs, a
 * white pill eyebrow, a heavy headline and lead. The cursor spotlight on the grid (PointerEffects,
 * via data-spotlight) stays.
 */
export function PageHero({ eyebrow, title, lead, children, compact = false }: { eyebrow?: string; title: ReactNode; lead?: ReactNode; children?: ReactNode; compact?: boolean }) {
  return (
    <section data-spotlight="" className={`ph-hero relative isolate overflow-hidden border-b border-line ${compact ? 'pb-12 pt-36 sm:pt-40' : 'pb-16 pt-36 sm:pb-24 sm:pt-44'}`}>
      <div aria-hidden="true" className="ph-blob ph-blob-1 -z-10" />
      <div aria-hidden="true" className="ph-blob ph-blob-2 -z-10" />
      <div aria-hidden="true" className="fx-grid-spot -z-10" />
      <Container className="relative">
        <div className="max-w-4xl animate-fade-up">
          {eyebrow && <p className="ph-badge mb-6">{eyebrow}</p>}
          <h1 className="text-display font-extrabold tracking-[-0.045em]">{title}</h1>
          {lead && <p className="text-lead mt-6 max-w-2xl">{lead}</p>}
          {children && <div className="mt-9 flex flex-wrap gap-3">{children}</div>}
        </div>
      </Container>
    </section>
  );
}
