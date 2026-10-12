import type { CSSProperties, ReactNode } from 'react';
import { Container } from '@/components/ui/Container';
import '@/components/pages/content/content.css';

/**
 * Full-height message screen for 404 and error states: the code as a giant outlined numeral with a
 * light sweep, over main's dotted background with soft brand/mint blobs and a grid that lights up
 * around the cursor. `full` fills
 * the viewport (used outside the site layout, where there is no header or footer).
 */
export function StatusScreen({ code, title, lead, children, full = false }: { code: string; title: string; lead: string; children?: ReactNode; full?: boolean }) {
  return (
    <section data-spotlight="" className={`ph-hero relative isolate flex items-center overflow-hidden pb-20 pt-32 sm:pt-36 ${full ? 'min-h-svh' : 'min-h-[78svh]'}`}>
      <div aria-hidden="true" className="ph-blob ph-blob-1 -z-10" />
      <div aria-hidden="true" className="ph-blob ph-blob-2 -z-10" />
      <div aria-hidden="true" className="fx-grid-spot -z-10" />
      <Container className="relative text-center">
        <span aria-hidden="true" className="ct-code" style={{ '--len': code.length } as CSSProperties}>{code}</span>
        <p className="ct-code-pill font-mono text-sm tracking-[0.3em] text-brand"><span aria-hidden="true" className="ct-live-dot" />{code}</p>
        <h1 className="text-display mt-6">{title}</h1>
        <p className="text-lead mx-auto mt-5 max-w-lg">{lead}</p>
        {children && <div className="mt-10 flex flex-wrap justify-center gap-3">{children}</div>}
      </Container>
    </section>
  );
}
