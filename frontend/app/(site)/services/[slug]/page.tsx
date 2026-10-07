import Image from 'next/image';
import { Check, Clock, Wallet } from 'lucide-react';
import type { Metadata } from 'next';
import { CTASection } from '@/components/sections/CTASection';
import { PageHero } from '@/components/sections/PageHero';
import { PortfolioCard } from '@/components/sections/PortfolioCard';
import { ServiceCard } from '@/components/sections/ServiceCard';
import { TrackView } from '@/components/sections/TrackView';
import { Accordion } from '@/components/ui/Accordion';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { Container, Section } from '@/components/ui/Container';
import { Icon } from '@/components/ui/Icon';
import { JsonLd } from '@/components/ui/JsonLd';
import { Magnetic } from '@/components/ui/Magnetic';
import { Reveal } from '@/components/ui/Reveal';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { api } from '@/lib/api';
import { abs, pageMeta } from '@/lib/seo';
import { SITE_URL } from '@/lib/site';
import type { ServiceDetail } from '@/lib/types';

type Params = { params: Promise<{ slug: string }> };

/** Service slug → project type option on the quote form. */
const QUOTE_TYPE: Record<string, string> = {
  'website-development': 'Website',
  '3d-website-development': '3D Website',
  'web-application-development': 'Web Application',
  'custom-software-development': 'Custom Software',
  'mobile-app-development': 'Mobile App',
  'ui-ux-design': 'UI/UX Design',
  'business-automation': 'Business Automation',
  'branding-digital-design': 'Branding',
};

const getService = (slug: string) => api<ServiceDetail>(`/services/${encodeURIComponent(slug)}`);

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const s = await getService(slug);
  return pageMeta({
    title: s.seoTitle || s.name,
    description: s.seoDescription || s.tagline || s.line,
    path: `/services/${s.slug}`,
    image: s.img,
  });
}

export default async function ServicePage({ params }: Params) {
  const { slug } = await params;
  const s = await getService(slug);
  const type = QUOTE_TYPE[s.slug];
  const quoteHref = type ? `/quote?type=${encodeURIComponent(type)}` : '/quote';
  const url = `${SITE_URL}/services/${s.slug}`;
  const hasPlan = Boolean(s.timeline || s.budget);

  return (
    <>
      <TrackView event="Service View" props={{ service: s.slug }} />
      <JsonLd data={{
        '@context': 'https://schema.org', '@type': 'Service', '@id': `${url}#service`, url,
        name: s.name, description: s.intro || s.tagline, serviceType: s.name, areaServed: 'Worldwide',
        provider: { '@id': `${SITE_URL}/#organization` },
        ...(s.img && { image: abs(s.img) }),
        ...(s.deliverables.length > 0 && {
          hasOfferCatalog: {
            '@type': 'OfferCatalog', name: `${s.name} deliverables`,
            itemListElement: s.deliverables.map((d) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name: d } })),
          },
        }),
      }} />
      {s.faqs.length > 0 && (
        <JsonLd data={{
          '@context': 'https://schema.org', '@type': 'FAQPage', url,
          mainEntity: s.faqs.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
        }} />
      )}

      <PageHero eyebrow={`${s.pillar} · Service ${s.num}`} title={s.name} lead={s.tagline}>
        <Magnetic><ButtonLink href={quoteHref} size="lg" arrow>Start a Project</ButtonLink></Magnetic>
        <ButtonLink href={quoteHref} size="lg" variant="secondary">Get a quote</ButtonLink>
      </PageHero>

      {/* ─────────── Overview: intro, image, outcomes ─────────── */}
      <Section labelledBy="overview-title" className="pt-0 sm:pt-4">
        <Container>
          <div className={`grid items-center gap-10 ${s.img ? 'lg:grid-cols-12 lg:gap-14' : ''}`}>
            <Reveal className={s.img ? 'lg:col-span-6' : 'max-w-3xl'}>
              <h2 id="overview-title" className="eyebrow">Overview</h2>
              {s.intro && <p className="mt-5 text-xl leading-relaxed text-text sm:text-2xl sm:leading-relaxed">{s.intro}</p>}
            </Reveal>
            {s.img && (
              <Reveal delay={80} className="lg:col-span-6">
                <div className="panel relative aspect-[4/3] overflow-hidden bg-surface-2">
                  <Image src={s.img} alt={s.alt || s.name} fill priority sizes="(min-width: 1024px) 40vw, 100vw"
                    className="object-cover" style={{ objectPosition: s.pos || 'center' }} />
                </div>
              </Reveal>
            )}
          </div>
          {s.outcomes.length > 0 && (
            <dl className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-3">
              {s.outcomes.map(([v, k], i) => (
                <Reveal key={k} delay={i * 70} className="flex flex-col-reverse bg-bg-2 px-6 py-8">
                  <dt className="mt-2 text-sm text-muted">{k}</dt>
                  <dd className="font-display text-4xl font-semibold tracking-tight text-text sm:text-5xl">{v}</dd>
                </Reveal>
              ))}
            </dl>
          )}
        </Container>
      </Section>

      {/* ─────────── What we build ─────────── */}
      {s.deliverables.length > 0 && (
        <Section labelledBy="build-title" className="border-t border-line">
          <Container>
            <SectionHeading id="build-title" eyebrow="What we build" title="What's included" lead="Every project is scoped to you, but these are the pieces we typically design and deliver." />
            <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {s.deliverables.map((d, i) => (
                <Reveal as="li" key={d} delay={(i % 4) * 60} className="panel flex gap-3 p-5">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full border border-brand/30 bg-brand/10 text-brand-soft"><Check aria-hidden="true" size={14} strokeWidth={2.2} /></span>
                  <span className="pt-0.5 text-[0.95rem] leading-snug text-text">{d}</span>
                </Reveal>
              ))}
            </ul>
            {s.addOns.length > 0 && (
              <Reveal className="mt-10 flex flex-wrap items-center gap-2">
                <span className="mr-2 text-sm text-subtle">Optional add-ons:</span>
                {s.addOns.map((a) => <Badge key={a}>{a}</Badge>)}
              </Reveal>
            )}
          </Container>
        </Section>
      )}

      {/* ─────────── Ideal for + timeline & budget ─────────── */}
      {(s.idealFor.length > 0 || hasPlan) && (
        <Section labelledBy="ideal-title" className="border-t border-line bg-bg-2/60">
          <Container className={`grid gap-12 ${hasPlan ? 'lg:grid-cols-12' : ''}`}>
            <div className={hasPlan ? 'lg:col-span-7' : ''}>
              <SectionHeading id="ideal-title" eyebrow="Ideal for" title="Who this is for" />
              {s.idealFor.length > 0 && (
                <ul className="mt-10 divide-y divide-line border-y border-line">
                  {s.idealFor.map((x, i) => (
                    <Reveal as="li" key={x} delay={i * 50} className="flex gap-4 py-5">
                      <span className="pt-0.5 font-mono text-xs text-subtle">0{i + 1}</span>
                      <span className="text-lg leading-snug text-text">{x}</span>
                    </Reveal>
                  ))}
                </ul>
              )}
            </div>
            {hasPlan && (
              <Reveal delay={80} className="lg:col-span-5 lg:pt-10">
                <div className="panel p-7 sm:p-8">
                  <h3 className="eyebrow text-subtle!">Typical timeline &amp; budget</h3>
                  <dl className="mt-6 space-y-6">
                    {s.timeline && (
                      <div className="flex gap-4">
                        <Clock aria-hidden="true" size={20} className="mt-0.5 shrink-0 text-brand-soft" />
                        <div><dt className="text-sm text-muted">Timeline</dt><dd className="mt-1 text-lg font-medium text-text">{s.timeline}</dd></div>
                      </div>
                    )}
                    {s.budget && (
                      <div className="flex gap-4">
                        <Wallet aria-hidden="true" size={20} className="mt-0.5 shrink-0 text-brand-soft" />
                        <div><dt className="text-sm text-muted">Budget</dt><dd className="mt-1 text-lg font-medium leading-snug text-text">{s.budget}</dd></div>
                      </div>
                    )}
                  </dl>
                  <p className="mt-7 border-t border-line pt-5 text-sm leading-relaxed text-subtle">Guide figures only. You get a fixed, written quote after the discovery call.</p>
                </div>
              </Reveal>
            )}
          </Container>
        </Section>
      )}

      {/* ─────────── Process ─────────── */}
      {s.process.length > 0 && (
        <Section labelledBy="svc-process-title" className="border-t border-line">
          <Container>
            <SectionHeading id="svc-process-title" eyebrow="Development process" title="How we deliver it"
              action={<ButtonLink href="/process" variant="secondary" arrow>Our full process</ButtonLink>} />
            <ol className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {s.process.map(([t, d], i) => (
                <Reveal as="li" key={t} delay={i * 70} className="relative border-t border-line-strong pt-6">
                  <span aria-hidden="true" className="absolute -top-px left-0 h-px w-12 bg-gradient-to-r from-brand to-accent" />
                  <span className="font-mono text-xs text-brand-soft">Step {String(i + 1).padStart(2, '0')}</span>
                  <h3 className="mt-3 text-xl font-semibold text-text">{t}</h3>
                  <p className="mt-2 leading-relaxed text-muted">{d}</p>
                </Reveal>
              ))}
            </ol>
          </Container>
        </Section>
      )}

      {/* ─────────── Technologies ─────────── */}
      {s.technologies.length > 0 && (
        <Section labelledBy="svc-tech-title" className="border-t border-line">
          <Container className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <SectionHeading id="svc-tech-title" eyebrow="Technologies" title="Tools we use" lead="Chosen for the project, not the trend." />
            </div>
            <Reveal className="lg:col-span-7 lg:pt-12">
              <ul className="flex flex-wrap gap-2.5">
                {s.technologies.map((t) => (
                  <li key={t.id} className="rounded-lg border border-line bg-white/[0.02] px-3.5 py-2 text-sm text-text">{t.name}</li>
                ))}
              </ul>
              <ButtonLink href="/technologies" variant="link" arrow className="mt-8">See our full stack</ButtonLink>
            </Reveal>
          </Container>
        </Section>
      )}

      {/* ─────────── Example projects ─────────── */}
      {s.projects.length > 0 && (
        <Section labelledBy="svc-work-title" className="border-t border-line">
          <Container>
            <SectionHeading id="svc-work-title" eyebrow="Example projects" title="Recent work"
              action={<ButtonLink href="/portfolio" variant="secondary" arrow>View all work</ButtonLink>} />
            <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {s.projects.map((p, i) => <Reveal key={p.slug} delay={(i % 3) * 80}><PortfolioCard project={p} /></Reveal>)}
            </div>
          </Container>
        </Section>
      )}

      {/* ─────────── Ready-made products ─────────── */}
      {s.products.length > 0 && (
        <Section labelledBy="products-title" className="border-t border-line">
          <Container>
            <SectionHeading id="products-title" eyebrow="Ready-made products" title="Start from a proven base"
              lead="Ready-made systems we adapt to how your business works. Faster to launch than a build from scratch, and still yours to extend." />
            <div className="mt-14 grid gap-4 md:grid-cols-2">
              {s.products.map((p, i) => (
                <Reveal key={p.name} delay={(i % 2) * 70} className="panel flex h-full flex-col p-7">
                  <div className="flex items-center gap-4">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-line-strong bg-gradient-to-br from-brand/20 to-accent/10 text-brand-soft"><Icon name={p.icon} size={20} /></span>
                    <div>
                      <h3 className="text-lg font-semibold text-text">{p.name}</h3>
                      {p.tag && <p className="text-sm text-muted">{p.tag}</p>}
                    </div>
                  </div>
                  {p.features && p.features.length > 0 && (
                    <ul className="mt-6 flex-1 space-y-2.5 text-[0.95rem] text-muted">
                      {p.features.map((f) => <li key={f} className="flex gap-2.5"><Check aria-hidden="true" size={16} className="mt-1 shrink-0 text-success" />{f}</li>)}
                    </ul>
                  )}
                  {p.bestFor && <p className="mt-6 border-t border-line pt-4 text-sm text-subtle"><span className="text-muted">Best for:</span> {p.bestFor}</p>}
                </Reveal>
              ))}
            </div>
          </Container>
        </Section>
      )}

      {/* ─────────── FAQ ─────────── */}
      {s.faqs.length > 0 && (
        <Section labelledBy="svc-faq-title" className="border-t border-line">
          <Container className="grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <SectionHeading id="svc-faq-title" eyebrow="FAQ" title="Common questions" />
              <Reveal className="mt-6"><ButtonLink href="/faq" variant="link" arrow>All questions</ButtonLink></Reveal>
            </div>
            <Reveal className="lg:col-span-8"><Accordion items={s.faqs.map(([q, a], i) => ({ q, a, id: `faq-${i + 1}` }))} /></Reveal>
          </Container>
        </Section>
      )}

      {/* ─────────── Related ─────────── */}
      {s.related.length > 0 && (
        <Section labelledBy="related-title" className="border-t border-line">
          <Container>
            <SectionHeading id="related-title" eyebrow="Related services" title="Often paired with"
              action={<ButtonLink href="/services" variant="secondary" arrow>All services</ButtonLink>} />
            <div className="mt-14 grid gap-4 md:grid-cols-3">
              {s.related.map((r, i) => <Reveal key={r.slug} delay={i * 70}><ServiceCard service={r} /></Reveal>)}
            </div>
          </Container>
        </Section>
      )}

      <CTASection
        title="Tell us about your project"
        lead={`Share what you have in mind for your ${s.name} project. We reply within one working day with questions, ideas or a time to talk.`}
        primary={{ label: 'Start a Project', href: quoteHref }}
      />
    </>
  );
}
