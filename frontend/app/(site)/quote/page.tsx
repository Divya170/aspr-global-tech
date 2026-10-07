import { DirectContact } from '@/components/forms/DirectContact';
import { QuoteForm } from '@/components/forms/QuoteForm';
import { PageHero } from '@/components/sections/PageHero';
import { Container } from '@/components/ui/Container';
import { api } from '@/lib/api';
import { pageMeta } from '@/lib/seo';
import type { Site } from '@/lib/types';

export const metadata = pageMeta({
  title: 'Request a Quote',
  description: 'Tell us about your website, web app, software or mobile project. Four short steps, a reply within one working day and a written, fixed quote.',
  path: '/quote',
});

const NEXT_STEPS = [
  { t: 'We review your request', d: 'A senior member of the team reads every brief. No bots, no call centre.' },
  { t: 'We reply within one working day', d: 'With questions, first ideas or a suggested time for a short call.' },
  { t: 'Written scope and fixed quote', d: 'Features, timeline and price agreed in writing before any work starts.' },
];

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export default async function QuotePage({ searchParams }: { searchParams: Promise<{ type?: string | string[] }> }) {
  const [site, sp] = await Promise.all([api<Site>('/site'), searchParams]);
  const s = site.settings;
  const wanted = typeof sp.type === 'string' ? slug(sp.type) : '';
  const initialType = (wanted && s.projectTypes.find((t) => slug(t) === wanted)) || '';

  return (
    <>
      <PageHero compact eyebrow="Start a project" title="Request a Quote"
        lead="Tell us about the project in four short steps. We reply within one working day with questions, ideas or a time to talk." />

      <Container className="pb-24 sm:pb-32">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-14">
          <div className="panel p-5 sm:p-8 lg:p-10">
            <QuoteForm options={{ projectTypes: s.projectTypes, budgets: s.budgets, timelines: s.timelines, heardFrom: s.heardFrom }} initialType={initialType} />
          </div>

          <aside aria-labelledby="quote-next-title" className="lg:sticky lg:top-28 lg:self-start">
            <h2 id="quote-next-title" className="font-sans text-base font-semibold tracking-normal text-text">What happens next</h2>
            <ol className="mt-5 space-y-5">
              {NEXT_STEPS.map((x, i) => (
                <li key={x.t} className="flex gap-4">
                  <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full border border-line-strong font-mono text-xs text-brand-soft">{i + 1}</span>
                  <div>
                    <p className="text-sm font-medium text-text">{x.t}</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted">{x.d}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-8 border-t border-line pt-7">
              <h2 className="font-sans text-base font-semibold tracking-normal text-text">Rather talk directly?</h2>
              <p className="mt-1.5 text-sm text-muted">Reach the team the way you prefer.</p>
              <DirectContact company={s.company} className="mt-4" />
            </div>
          </aside>
        </div>
      </Container>
    </>
  );
}
