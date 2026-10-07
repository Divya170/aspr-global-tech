import { Gauge, Puzzle, Users, Wrench } from 'lucide-react';
import { CTASection } from '@/components/sections/CTASection';
import { PageHero } from '@/components/sections/PageHero';
import { TechGrid } from '@/components/sections/TechGrid';
import { Container, Section } from '@/components/ui/Container';
import { Reveal } from '@/components/ui/Reveal';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { api } from '@/lib/api';
import { pageMeta } from '@/lib/seo';
import type { Technology } from '@/lib/types';

export const metadata = pageMeta({
  title: 'Technologies',
  description: 'The frameworks, databases, 3D, mobile and infrastructure tools ASPR Global Tech uses, and how we choose the right stack for each project.',
  path: '/technologies',
});

const PRINCIPLES = [
  { icon: Puzzle, t: 'Fit for the project', d: 'A marketing site, a 3D product viewer and an internal dashboard need different tools. We start from what you are building, not from a favourite framework.' },
  { icon: Wrench, t: 'Maintainable for years', d: 'Mature, well-documented technology with a healthy community, so updates are routine and the code still makes sense in three years.' },
  { icon: Gauge, t: 'Fast where it counts', d: 'We pick tools that keep pages quick on mid-range phones and slow networks, and we measure it before launch.' },
  { icon: Users, t: 'Yours to own', d: 'Widely used stacks mean your own team, or any good developer you hire later, can take over without starting again.' },
];

export default async function TechnologiesPage() {
  const technologies = await api<Technology[]>('/technologies');

  return (
    <>
      <PageHero
        eyebrow="Technologies"
        title={<>Proven tools, <span className="text-gradient">chosen for the job</span></>}
        lead="We build on mature, widely used technology. It is easier to hire for, easier to maintain and far less likely to leave you stranded when a trend moves on."
      />

      <Section labelledBy="stack-title" className="pt-0 sm:pt-4">
        <Container>
          <SectionHeading id="stack-title" eyebrow="Our stack" title="What we work with"
            lead="Grouped by where it sits in a project. Not every project uses all of it, and we only add a tool when it earns its place." />
          <div className="mt-14"><TechGrid technologies={technologies} /></div>
        </Container>
      </Section>

      <Section labelledBy="choose-title" className="border-t border-line bg-bg-2/60">
        <Container>
          <SectionHeading id="choose-title" eyebrow="Principles" title="How we choose a stack" />
          <ul className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2">
            {PRINCIPLES.map(({ icon: I, t, d }, i) => (
              <Reveal as="li" key={t} delay={(i % 2) * 70} className="flex gap-5 bg-bg-2 p-7 sm:p-8">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-line-strong text-brand-soft"><I aria-hidden="true" size={20} strokeWidth={1.7} /></span>
                <div>
                  <h3 className="text-lg font-semibold text-text">{t}</h3>
                  <p className="mt-2 text-[0.95rem] leading-relaxed text-muted">{d}</p>
                </div>
              </Reveal>
            ))}
          </ul>
        </Container>
      </Section>

      <CTASection title="Have a stack in mind already?" lead="Tell us what you use today. We are happy to work with your existing tools, or recommend a stack with the reasons written down." />
    </>
  );
}
