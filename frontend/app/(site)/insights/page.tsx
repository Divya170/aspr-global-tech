import { FeaturedStory, StoryCard } from '@/components/pages/content/StoryCard';
import { CTASection } from '@/components/sections/CTASection';
import { PageHero } from '@/components/sections/PageHero';
import { ButtonLink } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { Reveal } from '@/components/ui/Reveal';
import { api } from '@/lib/api';
import { pageMeta } from '@/lib/seo';
import type { ArticleCard } from '@/lib/types';

export const metadata = pageMeta({
  title: 'Insights',
  description: 'Practical notes from the ASPR Global Tech team on building websites, software and brands: speed, design, SEO, scoping and technology choices.',
  path: '/insights',
});

export default async function InsightsPage() {
  const articles = await api<ArticleCard[]>('/articles');
  return (
    <>
      <PageHero
        compact eyebrow="Insights"
        title={<>Notes from the <span className="text-gradient">build</span></>}
        lead="Practical writing on websites, software, design and growth: what we have learned shipping real projects, in plain language."
      />
      <Container className="pb-8">
        {articles.length > 0 ? (
          <>
            <Reveal><FeaturedStory a={articles[0]} /></Reveal>
            {articles.length > 1 && (
              <ul className="mt-5 grid gap-5 [grid-auto-flow:dense] md:grid-cols-2 lg:grid-cols-3">
                {articles.slice(1).map((a, i, rest) => {
                  // Bento: just enough two-column cards (the first, then the last) to fill every row of three.
                  const w = (3 - (rest.length % 3)) % 3;
                  const wide = (w >= 1 && i === 0) || (w === 2 && i === rest.length - 1);
                  return (
                    <Reveal as="li" key={a.slug} delay={(i % 3) * 70} className={wide ? 'md:col-span-2' : ''}>
                      <StoryCard a={a} wide={wide} />
                    </Reveal>
                  );
                })}
              </ul>
            )}
          </>
        ) : (
          <div className="ct-glass relative overflow-hidden px-6 py-14 text-center sm:px-12">
            <div aria-hidden="true" className="fx-aurora opacity-50"><i /><i /><i /></div>
            <h2 className="text-heading relative">New articles are on the way</h2>
            <p className="text-lead relative mx-auto mt-4 max-w-xl">We publish when we have something useful to say. In the meantime, explore what we build or ask us a question directly.</p>
            <div className="relative mt-8 flex flex-wrap justify-center gap-3">
              <ButtonLink href="/services" variant="secondary" arrow>Explore services</ButtonLink>
              <ButtonLink href="/contact" variant="ghost">Contact us</ButtonLink>
            </div>
          </div>
        )}
      </Container>
      <CTASection />
    </>
  );
}
