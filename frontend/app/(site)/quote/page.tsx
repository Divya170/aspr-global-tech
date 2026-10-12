import { DirectContact } from '@/components/forms/DirectContact';
import { QuoteForm } from '@/components/forms/QuoteForm';
import { NextStepper } from '@/components/pages/forms/NextStepper';
import { PageHero } from '@/components/sections/PageHero';
import { Container } from '@/components/ui/Container';
import { api } from '@/lib/api';
import { pageMeta } from '@/lib/seo';
import type { Site } from '@/lib/types';
import '@/components/pages/forms/forms.css';

export const metadata = pageMeta({
  title: 'Request a Quote',
  description: 'Tell us about your website, web app, software or mobile project. Four short steps, a reply within one working day and a written, fixed quote.',
  path: '/quote',
});

const NEXT_STEPS = [
  { t: 'We review your request', d: 'A person on the team reads every request, including any files you attach.' },
  { t: 'We reply within one working day', d: 'With questions, first ideas or a suggested time for a short call.' },
  { t: 'Written scope and fixed quote', d: 'Features, timeline and price agreed in writing before any work starts.' },
];

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Request a quote: the wizard in a glowing glass panel, with a sticky aside (lit "what happens next" rail, direct contact). */
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
          <div className="relative isolate">
            <div aria-hidden="true" className="fm-halo" />
            <div className="panel fx-border-live fm-live relative bg-surface/70 p-5 shadow-[0_40px_100px_-50px_color-mix(in_srgb,var(--color-brand)_33%,transparent)] sm:p-8 lg:p-10">
              <QuoteForm options={{ projectTypes: s.projectTypes, budgets: s.budgets, timelines: s.timelines, heardFrom: s.heardFrom }} initialType={initialType} />
            </div>
          </div>

          <aside aria-labelledby="quote-next-title" className="lg:sticky lg:top-28 lg:self-start">
            <h2 id="quote-next-title" className="font-sans text-base font-semibold tracking-normal text-text">What happens next</h2>
            <NextStepper items={NEXT_STEPS} className="mt-5" />

            <div className="fx-divider mt-9 pt-8">
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
