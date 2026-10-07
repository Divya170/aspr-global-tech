import type { Metadata } from 'next';
import Link from 'next/link';
import { Blocks, dbDate, formatDate } from '@/components/sections/Blocks';
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
  return (
    <>
      <PageHero compact eyebrow="Legal" title={page.title} lead={page.summary || undefined}>
        {updated && <p className="font-mono text-xs uppercase tracking-[0.14em] text-subtle">Last updated <time dateTime={updated.toISOString()}>{formatDate(updated)}</time></p>}
      </PageHero>
      <Container size="md" className="pb-24 sm:pb-32">
        <article aria-label={page.title}>
          <Blocks blocks={page.blocks} />
        </article>
        <aside className="mt-16 border-t border-line pt-8 text-sm leading-relaxed text-muted">
          Questions about these terms? Email <a className="text-brand-soft underline underline-offset-4 hover:text-text" href={`mailto:${email}`}>{email}</a> or use our <Link className="text-brand-soft underline underline-offset-4 hover:text-text" href="/contact">contact page</Link>.
        </aside>
      </Container>
    </>
  );
}
