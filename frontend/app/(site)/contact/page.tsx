import { ClipboardList } from 'lucide-react';
import { ContactForm } from '@/components/forms/ContactForm';
import { DirectContact } from '@/components/forms/DirectContact';
import { PageHero } from '@/components/sections/PageHero';
import { ButtonLink } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { JsonLd } from '@/components/ui/JsonLd';
import { api } from '@/lib/api';
import { pageMeta } from '@/lib/seo';
import { SITE_URL } from '@/lib/site';
import type { Site } from '@/lib/types';

export const metadata = pageMeta({
  title: 'Contact',
  description: 'Tell us what you are building. Email, call or WhatsApp ASPR Global Tech, or send a message and we will reply within one working day.',
  path: '/contact',
});

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
          <div className="panel self-start p-5 sm:p-8 lg:p-10">
            <h2 className="sr-only">Send us a message</h2>
            <ContactForm options={{ projectTypes: s.projectTypes, budgets: s.budgets, timelines: s.timelines, heardFrom: s.heardFrom }} />
          </div>

          <aside aria-labelledby="contact-direct-title" className="space-y-6 lg:sticky lg:top-28 lg:self-start">
            <div>
              <h2 id="contact-direct-title" className="font-sans text-base font-semibold tracking-normal text-text">Reach us directly</h2>
              <p className="mt-1.5 text-sm text-muted">Whichever is easiest for you.</p>
              <DirectContact company={s.company} full className="mt-4" />
            </div>
            <div className="rounded-xl border border-line-strong bg-white/[0.02] p-5">
              <ClipboardList aria-hidden="true" size={20} strokeWidth={1.7} className="text-accent-soft" />
              <h2 className="mt-3 font-sans text-base font-semibold tracking-normal text-text">Prefer a structured quote?</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">Four short steps covering project type, budget and timeline. Ideal if you already know what you need.</p>
              <ButtonLink href="/quote" variant="link" arrow className="mt-3">Request a Quote</ButtonLink>
            </div>
          </aside>
        </div>
      </Container>
    </>
  );
}
