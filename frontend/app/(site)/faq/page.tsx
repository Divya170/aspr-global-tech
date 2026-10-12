import { CircleHelp, Clock3, Handshake, Layers, LifeBuoy, type LucideIcon } from 'lucide-react';
import { SpyNav } from '@/components/pages/content/SpyNav';
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

/** Decorative icon for a topic, chosen from its title. */
const TOPIC_ICONS: [RegExp, LucideIcon][] = [[/working with|about/i, Handshake], [/cost|price|timeline/i, Clock3], [/deliver|after|support/i, LifeBuoy], [/capab|tech/i, Layers]];
const topicIcon = (t: string) => TOPIC_ICONS.find(([re]) => re.test(t))?.[1] || CircleHelp;

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
        <Container className="lg:grid lg:grid-cols-12 lg:gap-12">
          {groups.length > 1 && (
            <div className="sticky top-[4.5rem] z-30 -mx-4 mb-10 border-b border-line bg-bg/85 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:static lg:col-span-4 lg:m-0 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
              <div className="lg:sticky lg:top-28">
                <SpyNav chips label="FAQ topics" title="Topics" items={groups.map((g) => ({ id: slugify(g.title), label: g.title, count: g.faqs.length }))} />
              </div>
            </div>
          )}
          <div className={`space-y-16 sm:space-y-20 ${groups.length > 1 ? 'lg:col-span-8' : 'lg:col-span-12'}`}>
            {groups.map((g) => {
              const I = topicIcon(g.title);
              return (
                <section key={g.id} aria-labelledby={slugify(g.title)} className="ct-faq-group group/topic">
                  <Reveal>
                    <div className="ct-faq-head">
                      <span aria-hidden="true" className="ct-tile-icon"><I size={22} strokeWidth={1.7} /></span>
                      <h2 id={slugify(g.title)} className="text-heading scroll-mt-28">{g.title}</h2>
                    </div>
                    <div aria-hidden="true" className="ct-faq-rule" />
                    <Accordion className="mt-6" items={g.faqs.map((f) => ({ q: f.question, a: f.answer, id: `faq-${f.slug}` }))} />
                  </Reveal>
                </section>
              );
            })}
          </div>
        </Container>
      </div>

      <CTASection title="Still have a question?" lead="Ask us directly. A real person on the team replies within one working day."
        primary={{ label: 'Contact us', href: '/contact' }} secondary={{ label: 'Start a project', href: '/quote' }} />
    </>
  );
}
