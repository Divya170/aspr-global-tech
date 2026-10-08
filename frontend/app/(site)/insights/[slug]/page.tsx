import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Clock } from 'lucide-react';
import { catStyle, CategoryChip, CategoryOrbit } from '@/components/pages/content/categories';
import { SpyNav } from '@/components/pages/content/SpyNav';
import { Blocks, headings } from '@/components/sections/Blocks';
import { CTASection } from '@/components/sections/CTASection';
import { Container } from '@/components/ui/Container';
import { JsonLd } from '@/components/ui/JsonLd';
import { Reveal } from '@/components/ui/Reveal';
import { api } from '@/lib/api';
import { abs, pageMeta } from '@/lib/seo';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import type { Article } from '@/lib/types';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const a = await api<Article>(`/articles/${encodeURIComponent(slug)}`);
  const description = a.standfirst || a.blocks.find((b) => b.type === 'standfirst')?.text || undefined;
  const meta = pageMeta({ title: a.title, description, path: `/insights/${a.slug}`, image: a.img });
  return { ...meta, openGraph: { ...meta.openGraph, type: 'article' } };
}

/** "14 April 2026" → ISO date, if parseable. */
function iso(s: string): string | undefined {
  const d = new Date(`${s} UTC`);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const a = await api<Article>(`/articles/${encodeURIComponent(slug)}`);
  const date = iso(a.publishedAt);
  // The detail payload carries the standfirst as the first block; show it in the header instead.
  const lead = a.blocks.find((b) => b.type === 'standfirst');
  const standfirst = (a.standfirst || lead?.text || '').trim();
  const body = lead ? a.blocks.filter((b) => b !== lead) : a.blocks;
  const toc = headings(body);
  const author = a.author || SITE_NAME;
  const initials = author.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <>
      <JsonLd data={{
        '@context': 'https://schema.org', '@type': 'Article',
        headline: a.title, description: standfirst || undefined, url: `${SITE_URL}/insights/${a.slug}`,
        mainEntityOfPage: `${SITE_URL}/insights/${a.slug}`,
        ...(date && { datePublished: date }),
        ...(a.img && { image: abs(a.img) }),
        ...(a.category && { articleSection: a.category }),
        author: { '@type': 'Organization', name: a.author || SITE_NAME, url: SITE_URL },
        publisher: { '@type': 'Organization', '@id': `${SITE_URL}/#organization`, name: SITE_NAME, logo: { '@type': 'ImageObject', url: `${SITE_URL}/assets/aspr-logo.png` } },
      }} />

      <div aria-hidden="true" className="fx-progress" />
      <article>
        <header data-spotlight="" className="relative isolate overflow-hidden pb-14 pt-32 sm:pt-40" style={catStyle(a.category)}>
          <div aria-hidden="true" className="fx-aurora -z-10 opacity-60"><i /><i /><i /></div>
          <div aria-hidden="true" className="bg-grid absolute inset-0 -z-10" />
          <div aria-hidden="true" className="fx-grid-spot -z-10" />
          <div aria-hidden="true" className="absolute inset-x-0 bottom-0 -z-10 h-56 bg-gradient-to-t from-bg via-bg/70 to-transparent" />
          <Container className="relative lg:grid lg:grid-cols-[14rem_minmax(0,46rem)] lg:gap-16 xl:gap-20">
            <div className="hidden items-end lg:flex"><CategoryOrbit name={a.category} className="w-full! animate-fade-up" /></div>
            <div className="animate-fade-up">
              <Link href="/insights" className="group/back inline-flex min-h-11 items-center gap-1.5 text-sm text-muted transition-colors hover:text-text">
                <ArrowLeft aria-hidden="true" size={15} className="transition-transform duration-300 group-hover/back:-translate-x-1" />All insights
              </Link>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                {a.category && <CategoryChip name={a.category} />}
                {a.readTime && <span className="inline-flex items-center gap-1.5 font-mono text-xs text-subtle"><Clock aria-hidden="true" size={13} />{a.readTime}</span>}
              </div>
              <h1 className="text-display mt-5">{a.title}</h1>
              {standfirst && <p className="text-lead mt-6">{standfirst}</p>}
              <p className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line pt-6 text-sm text-muted">
                <span aria-hidden="true" className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-brand-strong to-accent font-mono text-[0.68rem] text-white shadow-[0_8px_20px_-8px_rgb(65_112_255/0.9)]">{initials}</span>
                <span className="text-text">{author}</span>
                {a.publishedAt && <><span aria-hidden="true" className="text-subtle">·</span><time dateTime={date}>{a.publishedAt}</time></>}
              </p>
            </div>
          </Container>
        </header>

        <Container className="pb-8 lg:grid lg:grid-cols-[14rem_minmax(0,46rem)] lg:gap-16 xl:gap-20">
          <div className="hidden lg:block">
            {toc.length > 1 && <div className="sticky top-28"><SpyNav items={toc} label="On this page" title="On this page" numbered /></div>}
          </div>
          <div className="min-w-0">
            {a.img && (
              <div className="relative mb-14 aspect-[16/9] overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface-2">
                <Image src={a.img} alt={a.alt || ''} fill priority sizes="(min-width: 1024px) 736px, 100vw" className="object-cover" style={{ objectPosition: a.pos || 'center' }} />
              </div>
            )}
            <Blocks blocks={body} numbered />
          </div>
        </Container>
      </article>

      {a.more.length > 0 && (
        <section aria-labelledby="more-title" className="fx-divider mt-16 pt-16 sm:mt-20">
          <Container>
            <h2 id="more-title" className="eyebrow eyebrow-line">More insights</h2>
            <ul className="mt-8 grid gap-4 md:grid-cols-3">
              {a.more.map((m, i) => (
                <Reveal as="li" key={m.slug} delay={i * 60}>
                  <Link href={`/insights/${m.slug}`} className="ct-story group flex flex-col p-6" style={catStyle(m.category)}>
                    <span className="flex items-center justify-between gap-4">
                      {m.category ? <CategoryChip name={m.category} /> : <span />}
                      <span className="ct-go size-9!"><ArrowRight aria-hidden="true" size={16} /></span>
                    </span>
                    <span className="mt-5 block font-display text-lg font-semibold leading-snug text-text transition-colors group-hover:text-white sm:text-xl">{m.title}</span>
                    <span className="mt-auto block pt-4 font-mono text-xs text-subtle">{[m.publishedAt, m.readTime].filter(Boolean).join(' · ')}</span>
                  </Link>
                </Reveal>
              ))}
            </ul>
          </Container>
        </section>
      )}

      <CTASection />
    </>
  );
}
