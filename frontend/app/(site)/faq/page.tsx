import { CTASection } from '@/components/sections/CTASection';
import { PageHero } from '@/components/sections/PageHero';
import { Accordion } from '@/components/ui/Accordion';
import { Container } from '@/components/ui/Container';
import { JsonLd } from '@/components/ui/JsonLd';
import { Reveal } from '@/components/ui/Reveal';
import { api } from '@/lib/api';
import { pageMeta } from '@/lib/seo';
import { SITE_URL } from '@/lib/site';
import type { FaqGroup } from '@/lib/types';

export const metadata = pageMeta({
  title: 'FAQ',
  description: 'Answers to common questions about working with ASPR Global Tech: getting started, cost and timelines, delivery, ownership and support after launch.',
  path: '/faq',
});

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export default async function FaqPage() {
  const groups = (await api<FaqGroup[]>('/faqs')).filter((g) => g.faqs.length > 0);
  const all = groups.flatMap((g) => g.faqs);

  return (
    <>
      {all.length > 0 && (
        <JsonLd data={{
          '@context': 'https://schema.org', '@type': 'FAQPage', url: `${SITE_URL}/faq`,
          mainEntity: all.map((f) => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })),
        }} />
      )}

      <PageHero eyebrow="FAQ" title="Questions, answered plainly"
        lead="What it costs, how long it takes, who you will talk to and what happens after launch." />

      <div className="relative pb-20 sm:pb-28">
        <Container className="grid gap-12 lg:grid-cols-12">
          {groups.length > 1 && (
            <nav aria-label="FAQ topics" className="lg:col-span-4">
              <div className="lg:sticky lg:top-28">
                <p className="eyebrow text-subtle!">Topics</p>
                <ul className="mt-5 flex flex-wrap gap-2 lg:flex-col lg:gap-1">
                  {groups.map((g) => (
                    <li key={g.id}>
                      <a href={`#${slugify(g.title)}`} className="inline-flex items-center gap-3 rounded-full border border-line px-4 py-2 text-sm text-muted transition-colors hover:border-brand/40 hover:text-text lg:rounded-lg lg:border-transparent lg:px-3 lg:hover:bg-white/[0.04]">
                        {g.title}<span className="font-mono text-xs text-subtle">{g.faqs.length}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </nav>
          )}
          <div className={`space-y-16 ${groups.length > 1 ? 'lg:col-span-8' : 'lg:col-span-12'}`}>
            {groups.map((g) => (
              <section key={g.id} aria-labelledby={slugify(g.title)}>
                <Reveal>
                  <h2 id={slugify(g.title)} className="text-heading scroll-mt-28">{g.title}</h2>
                  <Accordion className="mt-6" items={g.faqs.map((f) => ({ q: f.question, a: f.answer, id: `faq-${f.slug}` }))} />
                </Reveal>
              </section>
            ))}
          </div>
        </Container>
      </div>

      <CTASection title="Still have a question?" lead="Ask us directly. A real person on the team replies within one working day."
        primary={{ label: 'Contact us', href: '/contact' }} secondary={{ label: 'Start a project', href: '/quote' }} />
    </>
  );
}
