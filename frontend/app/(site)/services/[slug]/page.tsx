import Image from 'next/image';
import { Clock, Wallet } from 'lucide-react';
import type { Metadata } from 'next';
import { DeliverableTiles } from '@/components/interactive/DeliverableTiles';
import { stepIcon } from '@/components/pages/services/icons';
import { IdealRows } from '@/components/pages/services/IdealRows';
import { ProductBento } from '@/components/pages/services/ProductBento';
import { StepFlow } from '@/components/pages/services/StepFlow';
import { TechCloud } from '@/components/pages/services/TechCloud';
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
            {/* Near the top of the page and usually the LCP element, so it is not scroll-revealed. */}
            <div className={s.img ? 'lg:col-span-6' : 'max-w-3xl'}>
              <h2 id="overview-title" className="eyebrow">Overview</h2>
              {s.intro && <p className="mt-5 text-xl leading-relaxed text-text sm:text-2xl sm:leading-relaxed">{s.intro}</p>}
            </div>
            {s.img && (
              <Reveal delay={80} className="svx-shot lg:col-span-6">
                <div className="panel relative aspect-[4/3] overflow-hidden border-line-strong bg-surface-2">
                  <Image src={s.img} alt={s.alt || s.name} fill priority sizes="(min-width: 1024px) 40vw, 100vw"
                    className="object-cover" style={{ objectPosition: s.pos || 'center' }} />
                  <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-bg/50 via-transparent to-transparent" />
                </div>
                <span aria-hidden="true" className="svx-shot-badge"><Icon name={s.icon} size={26} /></span>
              </Reveal>
            )}
          </div>
          {s.outcomes.length > 0 && (
            <dl className="svx-outcomes mt-14" style={{ '--n': s.outcomes.length } as React.CSSProperties}>
              <i aria-hidden="true" /><i aria-hidden="true" />
              {s.outcomes.map(([v, k], i) => (
                <Reveal key={k} delay={i * 70} className="svx-outcome flex flex-col-reverse">
                  <dt className="mt-3 text-sm text-muted">{k}</dt>
                  <dd className="svx-outcome-v">{v}</dd>
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
            <div className="mt-14"><DeliverableTiles items={s.deliverables} /></div>
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
                <div className="mt-10"><IdealRows items={s.idealFor} /></div>
              )}
            </div>
            {hasPlan && (
              <Reveal delay={80} className="lg:col-span-5 lg:pt-10">
                <div className="svx-glass p-4 sm:p-5 lg:sticky lg:top-28">
                  <h3 className="eyebrow px-3.5 pt-3 text-subtle!">Typical timeline &amp; budget</h3>
                  <dl className="mt-4 space-y-1">
                    {s.timeline && (
                      <div className="svx-plan-row">
                        <dt className="text-sm text-muted"><span aria-hidden="true" className="svx-plan-ico"><Clock size={20} /></span>Timeline</dt>
                        <dd className="mt-1 font-display text-2xl font-semibold tracking-tight text-text">{s.timeline}</dd>
                      </div>
                    )}
                    {s.budget && (
                      <div className="svx-plan-row">
                        <dt className="text-sm text-muted"><span aria-hidden="true" className="svx-plan-ico"><Wallet size={20} /></span>Budget</dt>
                        <dd className="mt-1 text-lg font-medium leading-snug text-text">{s.budget}</dd>
                      </div>
                    )}
                  </dl>
                  <p className="mx-3.5 mb-2 mt-4 border-t border-line pt-5 text-sm leading-relaxed text-subtle">Guide figures only. You get a fixed, written quote after the discovery call.</p>
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
            <div className="mt-14">
              <StepFlow items={s.process.map(([t, d], i) => ({ icon: stepIcon(t, i), label: `Step ${String(i + 1).padStart(2, '0')}`, t, d }))} />
            </div>
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
            <div className="lg:col-span-7 lg:pt-12">
              <div className="panel svx-stack p-5 sm:p-7"><TechCloud items={s.technologies} /></div>
              <ButtonLink href="/technologies" variant="link" arrow className="mt-8">See our full stack</ButtonLink>
            </div>
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
            <div className="mt-14"><ProductBento products={s.products} /></div>
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
