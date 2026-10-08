import { Suspense } from 'react';
import { FileSearch, MessagesSquare, Video } from 'lucide-react';
import { CycleTiles } from '@/components/pages/content/CycleTiles';
import { ServiceBento } from '@/components/pages/content/ServiceBento';
import { CTASection } from '@/components/sections/CTASection';
import { PageHero } from '@/components/sections/PageHero';
import { PortfolioCard } from '@/components/sections/PortfolioCard';
import { PortfolioGrid } from '@/components/sections/PortfolioGrid';
import { ButtonLink } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
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
            <div className="grid gap-4 lg:grid-cols-12">
              <Reveal className="ct-prep lg:col-span-7">
                <div aria-hidden="true" className="fx-aurora opacity-70"><i /><i /><i /></div>
                <div aria-hidden="true" className="bg-grid absolute inset-0 opacity-80" />
                <div className="relative px-6 pb-40 pt-10 sm:px-10 sm:pb-52 sm:pt-12">
                  <p className="eyebrow inline-flex items-center gap-3"><span aria-hidden="true" className="ct-live-dot" />In progress</p>
                  <h2 id="empty-title" className="text-heading mt-4 sm:text-[2.6rem] sm:leading-[1.08]">Case studies are being prepared</h2>
                  <p className="text-lead mt-5 max-w-xl">
                    We only publish projects once each client has approved what we show. While those write-ups are being finalised,
                    we are happy to walk you through work relevant to your project on a short call.
                  </p>
                  <div className="mt-9 flex flex-wrap gap-3">
                    <Magnetic><ButtonLink href="/contact" size="lg" arrow>Book a walkthrough</ButtonLink></Magnetic>
                    <ButtonLink href="/quote" size="lg" variant="secondary">Start Your Project</ButtonLink>
                  </div>
                </div>
                {/* Case-study cards "in the works": skeletons peeking up from the bottom edge. */}
                <div aria-hidden="true" className="ct-skel">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="ct-skel-card" style={{ '--i': i, '--y': `${[18, 0, 30][i]}px` } as React.CSSProperties}><i /><i /><i /></div>
                  ))}
                  <span className="ct-skel-bar"><span /></span>
                </div>
              </Reveal>
              <CycleTiles className="lg:col-span-5 lg:grid-rows-3" items={WALKTHROUGH.map(({ icon: I, t, d }) => ({ icon: <I size={20} strokeWidth={1.7} />, t, d }))} />
            </div>

            {site.services.length > 0 && (
              <div className="mt-20">
                <h2 className="eyebrow eyebrow-line">What we build</h2>
                <div className="mt-6"><ServiceBento services={site.services} /></div>
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
