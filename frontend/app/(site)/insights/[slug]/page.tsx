import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { Blocks } from '@/components/sections/Blocks';
import { CTASection } from '@/components/sections/CTASection';
import { Badge } from '@/components/ui/Badge';
import { Container } from '@/components/ui/Container';
import { JsonLd } from '@/components/ui/JsonLd';
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

      <article>
        <header className="relative overflow-hidden pb-12 pt-32 sm:pt-40">
          <div aria-hidden="true" className="bg-grid absolute inset-0" />
          <div aria-hidden="true" className="absolute -top-40 left-1/2 h-[520px] w-[min(1100px,140vw)] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(65_112_255/0.2),rgb(139_92_246/0.08)_55%,transparent)]" />
          <Container size="md" className="relative animate-fade-up">
            <Link href="/insights" className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted transition-colors hover:text-text">
              <ArrowLeft aria-hidden="true" size={15} />All insights
            </Link>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              {a.category && <Badge tone="brand">{a.category}</Badge>}
              {a.readTime && <span className="font-mono text-xs text-subtle">{a.readTime}</span>}
            </div>
            <h1 className="text-display mt-5">{a.title}</h1>
            {standfirst && <p className="text-lead mt-6">{standfirst}</p>}
            <p className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line pt-6 text-sm text-muted">
              <span className="text-text">{a.author || SITE_NAME}</span>
              {a.publishedAt && <><span aria-hidden="true" className="text-subtle">·</span><time dateTime={date}>{a.publishedAt}</time></>}
            </p>
          </Container>
        </header>

        {a.img && (
          <Container size="lg" className="mb-14">
            <div className="relative aspect-[16/9] overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface-2">
              <Image src={a.img} alt={a.alt || ''} fill priority sizes="(min-width: 1024px) 1024px, 100vw" className="object-cover" style={{ objectPosition: a.pos || 'center' }} />
            </div>
          </Container>
        )}

        <Container size="md" className="pb-8">
          <Blocks blocks={body} />
        </Container>
      </article>

      {a.more.length > 0 && (
        <section aria-labelledby="more-title" className="mt-16 border-t border-line pt-16 sm:mt-20">
          <Container size="md">
            <h2 id="more-title" className="eyebrow">More insights</h2>
            <ul className="mt-6 divide-y divide-line border-y border-line">
              {a.more.map((m) => (
                <li key={m.slug}>
                  <Link href={`/insights/${m.slug}`} className="group flex items-start justify-between gap-6 py-6">
                    <span>
                      <span className="block font-display text-lg font-semibold leading-snug text-text transition-colors group-hover:text-brand-soft sm:text-xl">{m.title}</span>
                      <span className="mt-2 block font-mono text-xs text-subtle">{[m.category, m.publishedAt, m.readTime].filter(Boolean).join(' · ')}</span>
                    </span>
                    <ArrowUpRight aria-hidden="true" size={18} className="mt-1 shrink-0 text-subtle transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-soft" />
                  </Link>
                </li>
              ))}
            </ul>
          </Container>
        </section>
      )}

      <CTASection />
    </>
  );
}
