import { ClipboardList } from 'lucide-react';
import { ContactForm } from '@/components/forms/ContactForm';
import { DirectContact } from '@/components/forms/DirectContact';
import { PageHero } from '@/components/sections/PageHero';
import { ButtonLink } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { JsonLd } from '@/components/ui/JsonLd';
import { SpotlightCard } from '@/components/ui/SpotlightCard';
import { api } from '@/lib/api';
import { pageMeta } from '@/lib/seo';
import { SITE_URL } from '@/lib/site';
import type { Site } from '@/lib/types';
import '@/components/pages/forms/forms.css';

export const metadata = pageMeta({
  title: 'Contact',
  description: 'Tell us what you are building. Email, call or WhatsApp ASPR Global Tech, or send a message and we will reply within one working day.',
  path: '/contact',
});

/** Contact: the form in a glowing glass panel, with a sticky aside of direct-contact cards and a quote shortcut. */
export default async function ContactPage() {
  const site = await api<Site>('/site');
  const s = site.settings;
  return (
    <>
      <JsonLd data={{
        '@context': 'https://schema.org', '@type': 'ContactPage', url: `${SITE_URL}/contact`, name: 'Contact ASPR Global Tech',
        about: { '@id': `${SITE_URL}/#organization` },
      }} />
      <PageHero compact eyebrow="Contact" title={<>Tell us what you&rsquo;re <span className="text-gradient">building</span>.</>}
        lead="A few lines is enough to start. We reply to every message within one working day, with questions, ideas or a time to talk." />

      <Container className="pb-24 sm:pb-32">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-14">
          <div className="relative isolate self-start">
            <div aria-hidden="true" className="fm-halo" />
            <div className="panel fx-border-live fm-live relative bg-surface/70 p-5 shadow-[0_40px_100px_-50px_color-mix(in_srgb,var(--color-brand)_33%,transparent)] sm:p-8 lg:p-10">
              <h2 className="sr-only">Send us a message</h2>
              <ContactForm options={{ projectTypes: s.projectTypes, budgets: s.budgets, timelines: s.timelines, heardFrom: s.heardFrom }} />
            </div>
          </div>

          <aside aria-labelledby="contact-direct-title" className="space-y-8 lg:sticky lg:top-28 lg:self-start">
            <div>
              <h2 id="contact-direct-title" className="font-sans text-base font-semibold tracking-normal text-text">Reach us directly</h2>
              <p className="mt-1.5 text-sm text-muted">Whichever is easiest for you.</p>
              <DirectContact company={s.company} full className="mt-5" />
            </div>
            <SpotlightCard className="fx-border group overflow-hidden rounded-2xl border border-accent/25 bg-[linear-gradient(150deg,color-mix(in_srgb,var(--color-accent)_8%,transparent),color-mix(in_srgb,var(--color-brand)_4%,transparent)_55%,color-mix(in_srgb,var(--color-surface)_2%,transparent))] p-6">
              <div aria-hidden="true" className="pointer-events-none absolute -right-14 -top-16 size-44 rounded-full bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--color-accent)_21%,transparent),transparent)] blur-2xl" />
              <div className="relative flex items-center justify-between gap-4">
                <span aria-hidden="true" className="fx-icon grid size-11 place-items-center rounded-xl border border-accent/30 bg-accent/12 text-success">
                  <ClipboardList size={20} strokeWidth={1.7} />
                </span>
                {/* Decorative echo of the four-step wizard */}
                <span aria-hidden="true" className="flex items-center">
                  {[0, 1, 2, 3].map((i) => (
                    <span key={i} className="flex items-center">
                      {i > 0 && <span className="h-px w-4 bg-gradient-to-r from-brand-soft/50 to-accent/50" />}
                      <span className={`grid size-5 place-items-center rounded-full border font-mono text-[0.6rem] ${i === 0 ? 'border-transparent bg-brand-strong text-white shadow-[0_0_14px_color-mix(in_srgb,var(--color-brand)_48%,transparent)]' : 'border-line-strong bg-bg/60 text-subtle'}`}>{i + 1}</span>
                    </span>
                  ))}
                </span>
              </div>
              <h2 className="relative mt-5 font-sans text-base font-semibold tracking-normal text-text">Prefer a structured quote?</h2>
              <p className="relative mt-1.5 text-sm leading-relaxed text-muted">Four short steps covering project type, budget and timeline. Ideal if you already know what you need.</p>
              <ButtonLink href="/quote" variant="link" arrow className="relative mt-4">Request a Quote</ButtonLink>
            </SpotlightCard>
          </aside>
        </div>
      </Container>
    </>
  );
}
