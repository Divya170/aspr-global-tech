import { Check } from 'lucide-react';
import { CTASection } from '@/components/sections/CTASection';
import { PageHero } from '@/components/sections/PageHero';
import { ProcessTimeline } from '@/components/sections/ProcessTimeline';
import { Container, Section } from '@/components/ui/Container';
import { Reveal } from '@/components/ui/Reveal';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { api } from '@/lib/api';
import { pageMeta } from '@/lib/seo';
import type { Site, Step } from '@/lib/types';

export const metadata = pageMeta({
  title: 'Our Process',
  description: 'How ASPR Global Tech runs a project: discovery, a written scope and fixed quote, design and development on a live staging link, testing, launch and support.',
  path: '/process',
});

export default async function ProcessPage() {
  const [site, { steps }] = await Promise.all([api<Site>('/site'), api<{ steps: Step[] }>('/pages/process')]);
  const groups = [...(site.settings.processGroups || [])].sort((a, b) => a.stage - b.stage);
  const stepsIn = (stage: number) => steps.filter((s) => s.stage === stage);

  return (
    <>
      <PageHero
        eyebrow="Process"
        title={<>A clear process, from first call to <span className="text-gradient">long after launch</span></>}
        lead={`${steps.length} steps in ${groups.length || 'three'} stages. Scope, price and timeline are agreed in writing before any build starts, and you can follow the work on a live staging link.`}
      />

      {groups.length > 0 && (
        <Section labelledBy="stages-title" className="pt-0 sm:pt-4">
          <Container>
            <h2 id="stages-title" className="sr-only">The three stages</h2>
            <ol className="grid gap-4 md:grid-cols-3">
              {groups.map((g, i) => (
                <Reveal as="li" key={g.stage} delay={i * 80} className="panel flex flex-col p-7 sm:p-8">
                  <p className="font-mono text-xs uppercase tracking-[0.14em] text-subtle">{g.stageLabel || `Stage ${g.stage}`}</p>
                  <h3 className="mt-5 font-display text-3xl font-semibold text-text">{g.verb}</h3>
                  <p className="mt-3 flex-1 leading-relaxed text-muted">{g.sum}</p>
                  {stepsIn(g.stage).length > 0 && (
                    <ul className="mt-6 flex flex-wrap gap-2 border-t border-line pt-5">
                      {stepsIn(g.stage).map((s) => (
                        <li key={s.id} className="rounded-full border border-line-strong px-3 py-1 text-xs text-muted"><span className="font-mono text-subtle">{s.num}</span> {s.title}</li>
                      ))}
                    </ul>
                  )}
                </Reveal>
              ))}
            </ol>
          </Container>
        </Section>
      )}

      <Section labelledBy="steps-title" className="border-t border-line">
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-96 bg-[radial-gradient(ellipse_50%_100%_at_50%_0%,rgb(65_112_255/0.12),transparent)]" />
        <Container className="relative">
          <SectionHeading id="steps-title" eyebrow="Step by step" align="center" title="What happens, in order"
            lead="Each step ends with something you can see and sign off before the next one begins." />
          <div className="mt-16"><ProcessTimeline steps={steps} detailed /></div>
        </Container>
      </Section>

      {groups.length > 0 && steps.some((s) => s.outputs?.length) && (
        <Section labelledBy="outputs-title" className="border-t border-line bg-bg-2/60">
          <Container>
            <SectionHeading id="outputs-title" eyebrow="Deliverables" title="What you get at every stage"
              lead="Concrete outputs, not status meetings." />
            <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-3">
              {groups.map((g, i) => (
                <Reveal key={g.stage} delay={i * 70} className="bg-bg-2 p-7 sm:p-8">
                  <h3 className="eyebrow text-subtle!">{g.label || `Stage ${g.stage}`}</h3>
                  <ul className="mt-6 space-y-3">
                    {stepsIn(g.stage).flatMap((s) => s.outputs || []).map((o) => (
                      <li key={o} className="flex gap-3 text-[0.95rem] leading-snug text-text">
                        <Check aria-hidden="true" size={16} className="mt-0.5 shrink-0 text-success" />{o}
                      </li>
                    ))}
                  </ul>
                </Reveal>
              ))}
            </div>
          </Container>
        </Section>
      )}

      <CTASection title="Start with a free discovery call" lead="Tell us what you want to build. We reply within one working day, and the scope, price and timeline follow in writing." />
    </>
  );
}
