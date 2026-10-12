import { stageIcon } from '@/components/pages/services/icons';
import { StageFlow } from '@/components/pages/services/StageFlow';
import { StageOutputs } from '@/components/pages/services/StageOutputs';
import { CTASection } from '@/components/sections/CTASection';
import { PageHero } from '@/components/sections/PageHero';
import { ProcessTimeline } from '@/components/sections/ProcessTimeline';
import { Container, Section } from '@/components/ui/Container';
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
            <StageFlow stages={groups.map((g, i) => ({
              key: g.stage, icon: stageIcon(i), label: g.stageLabel || `Stage ${g.stage}`, verb: g.verb, sum: g.sum,
              steps: stepsIn(g.stage).map(({ id, num, title }) => ({ id, num, title })),
            }))} />
          </Container>
        </Section>
      )}

      <Section labelledBy="steps-title" className="border-t border-line">
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-96 bg-[radial-gradient(ellipse_50%_100%_at_50%_0%,color-mix(in_srgb,var(--color-brand)_7%,transparent),transparent)]" />
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
            <div className="mt-14">
              <StageOutputs stages={groups.map((g) => ({ key: g.stage, label: g.label || `Stage ${g.stage}`, items: stepsIn(g.stage).flatMap((s) => s.outputs || []) }))} />
            </div>
          </Container>
        </Section>
      )}

      <CTASection title="Start with a free discovery call" lead="Tell us what you want to build. We reply within one working day, and the scope, price and timeline follow in writing." />
    </>
  );
}
