import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { CTASection } from '@/components/sections/CTASection';
import { PageHero } from '@/components/sections/PageHero';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { Reveal } from '@/components/ui/Reveal';
import { SpotlightCard } from '@/components/ui/SpotlightCard';
import { api } from '@/lib/api';
import { pageMeta } from '@/lib/seo';
import type { ArticleCard } from '@/lib/types';

export const metadata = pageMeta({
  title: 'Insights',
  description: 'Practical notes from the ASPR Global Tech team on building websites, software and brands: speed, design, SEO, scoping and technology choices.',
  path: '/insights',
});

function Card({ a, large = false }: { a: ArticleCard; large?: boolean }) {
  return (
    <SpotlightCard as="article" className="group panel h-full overflow-hidden">
      <Link href={`/insights/${a.slug}`} className={`flex h-full flex-col ${large ? 'md:grid md:grid-cols-2' : ''}`}>
        <div className={`relative overflow-hidden bg-surface-2 ${large ? 'aspect-[16/10] md:aspect-auto md:min-h-[22rem]' : 'aspect-[16/10]'}`}>
          {a.img ? (
            <Image
              src={a.img} alt={a.alt || ''} fill priority={large}
              sizes={large ? '(min-width: 768px) 50vw, 100vw' : '(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw'}
              className="object-cover transition-transform duration-[1200ms] ease-[var(--ease-out-expo)] group-hover:scale-[1.04]"
              style={{ objectPosition: a.pos || 'center' }}
            />
          ) : (
            <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_80%_70%_at_20%_110%,rgb(65_112_255/0.32),transparent_60%),radial-gradient(ellipse_60%_60%_at_95%_0%,rgb(139_92_246/0.22),transparent_60%)]">
              <div className="bg-grid absolute inset-0" />
              <span className="absolute bottom-5 left-5 font-display text-5xl font-semibold tracking-tight text-white/[0.07] sm:text-6xl">{a.category}</span>
            </div>
          )}
          {a.category && <Badge tone="brand" className="absolute left-4 top-4 backdrop-blur-md">{a.category}</Badge>}
        </div>
        <div className={`flex flex-1 flex-col p-6 ${large ? 'sm:p-8 md:justify-center' : ''}`}>
          <h2 className={`font-semibold leading-snug text-text ${large ? 'text-2xl sm:text-3xl' : 'text-xl'}`}>{a.title}</h2>
          {a.standfirst && <p className={`mt-3 leading-relaxed text-muted ${large ? 'line-clamp-4' : 'line-clamp-3 text-[0.95rem]'}`}>{a.standfirst}</p>}
          <div className="mt-auto flex items-center justify-between gap-4 pt-6">
            <p className="font-mono text-xs text-subtle">
              {a.publishedAt}{a.readTime && <><span aria-hidden="true"> · </span>{a.readTime}</>}
            </p>
            <span className="grid size-9 shrink-0 place-items-center rounded-full border border-line text-muted transition-all duration-300 group-hover:border-brand/50 group-hover:bg-brand group-hover:text-white">
              <ArrowUpRight aria-hidden="true" size={16} />
            </span>
          </div>
        </div>
      </Link>
    </SpotlightCard>
  );
}

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
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {articles.map((a, i) => (
              <Reveal key={a.slug} delay={i === 0 ? 0 : ((i - 1) % 3) * 70} className={i === 0 ? 'md:col-span-2 lg:col-span-3' : ''}>
                <Card a={a} large={i === 0} />
              </Reveal>
            ))}
          </div>
        ) : (
          <div className="panel px-6 py-14 text-center sm:px-12">
            <h2 className="text-heading">New articles are on the way</h2>
            <p className="text-lead mx-auto mt-4 max-w-xl">We publish when we have something useful to say. In the meantime, explore what we build or ask us a question directly.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
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
