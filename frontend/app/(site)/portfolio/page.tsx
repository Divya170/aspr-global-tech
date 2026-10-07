import { Suspense } from 'react';
import Link from 'next/link';
import { ArrowUpRight, FileSearch, MessagesSquare, Video } from 'lucide-react';
import { CTASection } from '@/components/sections/CTASection';
import { PageHero } from '@/components/sections/PageHero';
import { PortfolioCard } from '@/components/sections/PortfolioCard';
import { PortfolioGrid } from '@/components/sections/PortfolioGrid';
import { ButtonLink } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { Icon } from '@/components/ui/Icon';
import { Magnetic } from '@/components/ui/Magnetic';
import { Reveal } from '@/components/ui/Reveal';
import { api } from '@/lib/api';
import { pageMeta } from '@/lib/seo';
import type { ProjectCard, Site } from '@/lib/types';

export const metadata = pageMeta({
  title: 'Portfolio',
  description: 'Selected websites, 3D experiences, web applications, custom software and apps built by ASPR Global Tech: the problem, what we built and the stack behind it.',
  path: '/portfolio',
});

type Projects = { categories: { id: number; slug: string; name: string }[]; items: ProjectCard[] };

/** What a walkthrough call covers while public case studies are being prepared. */
const WALKTHROUGH = [
  { icon: Video, t: 'A screen-shared walkthrough', d: 'We show relevant builds live and talk through how they were made.' },
  { icon: FileSearch, t: 'Matched to your project', d: 'Work chosen for your industry, scope and budget, not a generic reel.' },
  { icon: MessagesSquare, t: 'Straight answers', d: 'Ask about timelines, stack and trade-offs with the people who did the work.' },
];

export default async function PortfolioPage() {
  const [data, site] = await Promise.all([api<Projects>('/projects'), api<Site>('/site')]);
  const empty = data.items.length === 0;

  return (
    <>
      <PageHero
        eyebrow="Portfolio"
        title={<>Work that <span className="text-gradient">ships</span></>}
        lead={empty
          ? 'Websites, 3D experiences, web apps, custom software and mobile apps, built for businesses that want more than a template.'
          : 'A look at recent projects: the problem, what we built and the stack behind it.'}
      />

      {empty ? (
        <section aria-labelledby="empty-title" className="pb-8">
          <Container>
            <div className="panel relative overflow-hidden px-6 py-12 sm:px-12 sm:py-16">
              <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_100%_0%,rgb(139_92_246/0.14),transparent_60%)]" />
              <div className="relative grid gap-12 lg:grid-cols-12">
                <div className="lg:col-span-6">
                  <p className="eyebrow">In progress</p>
                  <h2 id="empty-title" className="text-heading mt-4">Case studies are being prepared</h2>
                  <p className="text-lead mt-5">
                    We only publish projects once each client has approved what we show. While those write-ups are being finalised,
                    we are happy to walk you through work relevant to your project on a short call.
                  </p>
                  <div className="mt-9 flex flex-wrap gap-3">
                    <Magnetic><ButtonLink href="/contact" size="lg" arrow>Book a walkthrough</ButtonLink></Magnetic>
                    <ButtonLink href="/quote" size="lg" variant="secondary">Start Your Project</ButtonLink>
                  </div>
                </div>
                <ul className="space-y-6 lg:col-span-5 lg:col-start-8">
                  {WALKTHROUGH.map(({ icon: I, t, d }) => (
                    <li key={t} className="flex gap-4">
                      <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-line-strong text-brand-soft"><I aria-hidden="true" size={19} strokeWidth={1.7} /></span>
                      <div>
                        <h3 className="font-sans text-base font-semibold tracking-normal text-text">{t}</h3>
                        <p className="mt-1.5 text-sm leading-relaxed text-muted">{d}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {site.services.length > 0 && (
              <div className="mt-20">
                <h2 className="eyebrow">What we build</h2>
                <ul className="mt-6 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
                  {site.services.map((s, i) => (
                    <Reveal as="li" key={s.slug} delay={(i % 4) * 50} className="bg-bg">
                      <Link href={`/services/${s.slug}`} className="group flex h-full items-start gap-4 p-5 transition-colors hover:bg-surface sm:p-6">
                        <span className="text-brand-soft"><Icon name={s.icon} size={20} /></span>
                        <span className="flex-1">
                          <span className="block font-medium text-text">{s.name}</span>
                          <span className="mt-1 block text-sm leading-relaxed text-muted">{s.line}</span>
                        </span>
                        <ArrowUpRight aria-hidden="true" size={16} className="mt-1 shrink-0 text-subtle transition-colors group-hover:text-brand-soft" />
                      </Link>
                    </Reveal>
                  ))}
                </ul>
              </div>
            )}
          </Container>
        </section>
      ) : (
        <section aria-labelledby="projects-title" className="pb-8">
          <Container>
            <h2 id="projects-title" className="sr-only">Projects</h2>
            <Suspense fallback={
              <ul className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {data.items.map((p, i) => <li key={p.slug} className="[&>article]:h-full"><PortfolioCard project={p} priority={i < 2} /></li>)}
              </ul>
            }>
              <PortfolioGrid categories={data.categories} items={data.items} />
            </Suspense>
          </Container>
        </section>
      )}

      <CTASection title="Have a similar project?" />
    </>
  );
}
