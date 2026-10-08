import type { Metadata } from 'next';
import Link from 'next/link';
import { Mail } from 'lucide-react';
import { SpyNav } from '@/components/pages/content/SpyNav';
import { Blocks, dbDate, formatDate, headings } from '@/components/sections/Blocks';
import { PageHero } from '@/components/sections/PageHero';
import { Container } from '@/components/ui/Container';
import { api } from '@/lib/api';
import { pageMeta } from '@/lib/seo';
import type { Page, Site } from '@/lib/types';

const PATH = '/terms';

export async function generateMetadata(): Promise<Metadata> {
  const page = await api<Page>('/pages/terms');
  return pageMeta({ title: page.title, description: page.summary || undefined, path: PATH });
}

export default async function TermsPage() {
  const [page, site] = await Promise.all([api<Page>('/pages/terms'), api<Site>('/site')]);
  const updated = dbDate(page.updatedAt);
  const email = site.settings.company.email;
  const toc = headings(page.blocks);
  return (
    <>
      <div aria-hidden="true" className="fx-progress" />
      <PageHero compact eyebrow="Legal" title={page.title} lead={page.summary || undefined}>
        {updated && <p className="font-mono text-xs uppercase tracking-[0.14em] text-subtle">Last updated <time dateTime={updated.toISOString()}>{formatDate(updated)}</time></p>}
      </PageHero>
      <Container className="pb-24 pt-10 sm:pb-32 sm:pt-14 lg:grid lg:grid-cols-[14rem_minmax(0,46rem)] lg:gap-16 xl:gap-20">
        <div className="hidden lg:block">
          {toc.length > 1 && <div className="sticky top-28"><SpyNav items={toc} label="On this page" title="On this page" numbered /></div>}
        </div>
        <div className="min-w-0">
          <article aria-label={page.title}>
            <Blocks blocks={page.blocks} numbered />
          </article>
          <aside className="ct-glass mt-16 flex flex-col gap-4 p-6 text-sm leading-relaxed text-muted sm:flex-row sm:items-center sm:gap-5 sm:p-7">
            <span aria-hidden="true" className="ct-tile-icon"><Mail size={20} /></span>
            <p>
              Questions about these terms? Email <a className="text-brand-soft underline underline-offset-4 hover:text-text" href={`mailto:${email}`}>{email}</a> or use our <Link className="text-brand-soft underline underline-offset-4 hover:text-text" href="/contact">contact page</Link>.
            </p>
          </aside>
        </div>
      </Container>
    </>
  );
}
