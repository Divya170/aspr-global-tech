import type { ReactNode } from 'react';
import { Container } from '@/components/ui/Container';

/** Full-height message screen for 404 and error states. */
export function StatusScreen({ code, title, lead, children }: { code: string; title: string; lead: string; children?: ReactNode }) {
  return (
    <section className="relative flex min-h-[78svh] items-center overflow-hidden pb-20 pt-36">
      <div aria-hidden="true" className="bg-grid absolute inset-0" />
      <div aria-hidden="true" className="absolute left-1/2 top-1/3 h-[420px] w-[min(900px,120vw)] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(65_112_255/0.18),transparent)]" />
      <Container className="relative text-center">
        <p className="font-mono text-sm tracking-[0.3em] text-brand-soft">{code}</p>
        <h1 className="text-display mt-5">{title}</h1>
        <p className="text-lead mx-auto mt-5 max-w-lg">{lead}</p>
        {children && <div className="mt-10 flex flex-wrap justify-center gap-3">{children}</div>}
      </Container>
    </section>
  );
}
