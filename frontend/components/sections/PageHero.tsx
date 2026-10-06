import type { ReactNode } from 'react';
import { Container } from '@/components/ui/Container';

/** Hero for inner pages: grid backdrop, soft glow, h1 and lead. */
export function PageHero({ eyebrow, title, lead, children, compact = false }: { eyebrow?: string; title: ReactNode; lead?: ReactNode; children?: ReactNode; compact?: boolean }) {
  return (
    <section className={`relative overflow-hidden ${compact ? 'pb-12 pt-36 sm:pt-40' : 'pb-16 pt-36 sm:pb-24 sm:pt-44'}`}>
      <div aria-hidden="true" className="bg-grid absolute inset-0" />
      <div aria-hidden="true" className="absolute -top-40 left-1/2 h-[520px] w-[min(1100px,140vw)] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(65_112_255/0.22),rgb(139_92_246/0.1)_55%,transparent)]" />
      <Container className="relative">
        <div className="max-w-4xl animate-fade-up">
          {eyebrow && <p className="eyebrow mb-5">{eyebrow}</p>}
          <h1 className="text-display">{title}</h1>
          {lead && <p className="text-lead mt-6 max-w-2xl">{lead}</p>}
          {children && <div className="mt-9 flex flex-wrap gap-3">{children}</div>}
        </div>
      </Container>
    </section>
  );
}
