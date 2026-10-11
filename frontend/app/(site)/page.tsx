import Link from 'next/link';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { FeatureCards } from '@/components/interactive/FeatureCards';
import { StatBand } from '@/components/interactive/StatBand';
import { TechExplorer } from '@/components/interactive/TechExplorer';
import { ServiceBento } from '@/components/pages/services/ServiceBento';
import { CTASection } from '@/components/sections/CTASection';
import { PortfolioCard } from '@/components/sections/PortfolioCard';
import { ProcessTimeline } from '@/components/sections/ProcessTimeline';
import { TestimonialCard } from '@/components/sections/TestimonialCard';
import { HeroStage, RotatingWord, type HeroBadge } from '@/components/sections/HeroStage';
import { Accordion } from '@/components/ui/Accordion';
import { ButtonLink } from '@/components/ui/Button';
import { Container, Section } from '@/components/ui/Container';
import { Emphasis } from '@/components/ui/Emphasis';
import { JsonLd } from '@/components/ui/JsonLd';
import { Magnetic } from '@/components/ui/Magnetic';
import { Reveal } from '@/components/ui/Reveal';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { api } from '@/lib/api';
import { pageMeta } from '@/lib/seo';
import { SITE_URL } from '@/lib/site';
import type { HomeData, Site } from '@/lib/types';

export const metadata = pageMeta({
  path: '/',
  description: 'ASPR Global Tech builds premium websites, interactive 3D experiences, web applications, custom software and mobile apps that move businesses forward.',
});

/** What every project gets, regardless of size. Qualitative commitments, not statistics. */
const PRINCIPLES = [
  { icon: 'layout-template', t: 'Custom-built, never templated', d: 'Designed and engineered around your business, your users and your brand.' },
  { icon: 'code', t: 'Modern, maintainable code', d: 'Current frameworks, typed code and documentation your next developer will thank you for.' },
  { icon: 'smartphone', t: 'Responsive by default', d: 'Designed for phones first and tested on real devices before launch.' },
  { icon: 'shield-check', t: 'Secure and fast', d: 'Security headers, validated inputs and performance budgets on every build.' },
  { icon: 'rocket', t: 'Business-focused', d: 'Every feature is tied to a goal: more enquiries, less admin, faster decisions.' },
  { icon: 'headphones', t: 'Support after launch', d: 'A named contact, fixes after go-live and an optional care plan.' },
];

export default async function HomePage() {
  const [site, home] = await Promise.all([api<Site>('/site'), api<HomeData>('/pages/home')]);
  const s = site.settings;
  const hero = s.hero || { eyebrow: '', headline: 'We build digital experiences that move businesses forward.', sub: '' };
  const stats = [
    s.stats?.projects && { value: `${s.stats.projects}+`, label: 'Projects delivered', icon: 'folder-kanban' },
    s.stats?.clients && { value: `${s.stats.clients}+`, label: 'Clients served', icon: 'handshake' },
    s.stats?.specialistsMin && { value: `${s.stats.specialistsMin}–${s.stats.specialistsMax}`, label: 'Specialists in-house', icon: 'users' },
    { value: String(home.services.length), label: 'Core services', icon: 'layers' },
  ].filter(Boolean) as { value: string; label: string; icon: string }[];
  // Hero proof badges only repeat what the site already states (admin stats, company hours); unset values are left out.
  const badges = [
    s.stats?.projects && { icon: 'rocket', strong: `${s.stats.projects}+`, small: 'projects delivered' },
    s.stats?.clients && { icon: 'handshake', strong: `${s.stats.clients}+`, small: 'clients served' },
    /US-hour calls on request/i.test(s.company.hours || '') && { icon: 'globe', strong: 'US-hour calls', small: 'on request' },
  ].filter(Boolean) as HeroBadge[];

  return (
    <>
      {home.faqs.length > 0 && (
        <JsonLd data={{
          '@context': 'https://schema.org', '@type': 'FAQPage', url: SITE_URL,
          mainEntity: home.faqs.map((f) => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })),
        }} />
      )}

      {/* ─────────── Hero ─────────── */}
      <section aria-labelledby="hero-title" className="relative isolate flex items-center overflow-hidden pb-16 pt-28 lg:min-h-[100svh]">
        <div aria-hidden="true" className="bg-grid absolute inset-0 -z-20" />
        <div aria-hidden="true" className="absolute inset-0 -z-20 bg-[radial-gradient(ellipse_60%_50%_at_70%_45%,color-mix(in_srgb,var(--color-brand)_11%,transparent),transparent_70%),radial-gradient(ellipse_40%_40%_at_20%_80%,color-mix(in_srgb,var(--color-accent)_7%,transparent),transparent_70%)]" />

        <Container className="grid items-center gap-x-10 gap-y-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <div className="max-w-[46rem]">
            {hero.eyebrow && (
              <p className="eyebrow mb-6 inline-flex max-w-full animate-fade-up items-center gap-2 rounded-full border border-line-strong bg-surface px-3 py-1.5 text-[0.68rem] tracking-[0.1em] backdrop-blur sm:text-xs sm:tracking-[0.16em]">
                <span aria-hidden="true" className="size-1.5 rounded-full bg-signal shadow-[0_0_10px_var(--color-signal)]" />{hero.eyebrow}
              </p>
            )}
            <h1 id="hero-title" className="text-display-xl lg:text-[clamp(2.6rem,4.3vw,4.1rem)]"><Emphasis text={hero.headline} /></h1>
            <RotatingWord services={site.services} />
            {hero.sub && <p className="text-lead mt-6 max-w-xl">{hero.sub}</p>}
            <div className="mt-10 flex animate-fade-up flex-wrap gap-3 [animation-delay:240ms]">
              <Magnetic><ButtonLink href="/quote" size="lg" arrow>Start a Project</ButtonLink></Magnetic>
              <ButtonLink href={site.hasProjects ? '/portfolio' : '/services'} size="lg" variant="secondary">{site.hasProjects ? 'View Our Work' : 'Explore Services'}</ButtonLink>
            </div>
            <ul className="mt-14 flex animate-fade-up flex-wrap gap-x-6 gap-y-2 font-mono text-xs uppercase tracking-[0.14em] text-subtle [animation-delay:320ms]">
              {['Websites', '3D & WebGL', 'Web Apps', 'Custom Software', 'Mobile Apps'].map((x) => <li key={x}>{x}</li>)}
            </ul>
          </div>
          <div className="hidden md:block"><HeroStage badges={badges} services={site.services} /></div>
        </Container>
      </section>

      {/* ─────────── Credibility ─────────── */}
      <section aria-labelledby="trust-title" className="relative border-y border-line bg-bg-2/60 py-16 sm:py-20">
        <Container>
          <h2 id="trust-title" className="sr-only">Why businesses work with ASPR</h2>
          {stats.length > 0 && <StatBand stats={stats} />}
          <FeatureCards items={PRINCIPLES} className="mt-10" />
        </Container>
      </section>

      {/* ─────────── Services ─────────── */}
      <Section labelledBy="services-title">
        <Container>
          <SectionHeading
            id="services-title" eyebrow="What we build"
            title={<>From first website to <span className="text-gradient">full platform</span></>}
            lead="Eight disciplines under one roof, so your website, software and brand are designed and engineered by the same team."
            action={<ButtonLink href="/services" variant="secondary" arrow>All services</ButtonLink>}
          />
          <div className="mt-14"><ServiceBento services={home.services} features={new Map()} /></div>
        </Container>
      </Section>

      {/* ─────────── Work ─────────── */}
      {home.projects.length > 0 && (
        <Section labelledBy="work-title" className="border-t border-line">
          <Container>
            <SectionHeading id="work-title" eyebrow="Selected work" title="Built for real businesses"
              lead="A look at recent projects: the problem, what we built and the stack behind it."
              action={<ButtonLink href="/portfolio" variant="secondary" arrow>View all work</ButtonLink>} />
            <div className="mt-14 grid gap-5 md:grid-cols-2">
              {home.projects.map((p, i) => <Reveal key={p.slug} delay={(i % 2) * 90}><PortfolioCard project={p} large={i === 0} /></Reveal>)}
            </div>
          </Container>
        </Section>
      )}

      {/* ─────────── Process ─────────── */}
      <Section labelledBy="process-title" className="border-t border-line">
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-96 bg-[radial-gradient(ellipse_50%_100%_at_50%_0%,color-mix(in_srgb,var(--color-brand)_7%,transparent),transparent)]" />
        <Container className="relative">
          <SectionHeading id="process-title" eyebrow="How we work" align="center"
            title="A clear process, from first call to long after launch"
            lead="Scope, price and timeline are agreed in writing before any build starts. Then you can watch the work happen on a live staging link." />
          <div className="mt-16"><ProcessTimeline steps={home.steps} /></div>
          <div className="mt-14 text-center"><ButtonLink href="/process" variant="secondary" arrow>See the full process</ButtonLink></div>
        </Container>
      </Section>

      {/* ─────────── Technology ─────────── */}
      <Section labelledBy="tech-title" className="border-t border-line">
        <Container>
          <SectionHeading id="tech-title" eyebrow="Technology"
            title="Modern tools, chosen for the job"
            lead="We pick proven technology that fits the project, the budget and the team who will maintain it."
            action={<ButtonLink href="/technologies" variant="secondary" arrow>Our stack</ButtonLink>} />
          <div className="mt-14"><TechExplorer technologies={home.technologies} groups={['frontend', 'backend', 'database', '3d', 'mobile', 'infrastructure']} /></div>
        </Container>
      </Section>

      {/* ─────────── Testimonials (only genuine, approved ones) ─────────── */}
      {home.testimonials.length > 0 && (
        <Section labelledBy="testimonials-title" className="border-t border-line">
          <Container>
            <SectionHeading id="testimonials-title" eyebrow="Clients" title="In our clients' words" />
            <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {home.testimonials.map((t, i) => <Reveal key={t.id} delay={i * 80}><TestimonialCard t={t} /></Reveal>)}
            </div>
          </Container>
        </Section>
      )}

      {/* ─────────── FAQ ─────────── */}
      {home.faqs.length > 0 && (
        <Section labelledBy="faq-title" className="border-t border-line">
          <Container className="grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <SectionHeading id="faq-title" eyebrow="FAQ" title="Questions we hear most" />
              <Reveal className="mt-8 space-y-3 text-sm text-muted">
                <p className="flex gap-2"><CheckCircle2 aria-hidden="true" size={18} className="shrink-0 text-success" />Free discovery call</p>
                <p className="flex gap-2"><CheckCircle2 aria-hidden="true" size={18} className="shrink-0 text-success" />Fixed, written quote</p>
                <p className="flex gap-2"><CheckCircle2 aria-hidden="true" size={18} className="shrink-0 text-success" />You own the code and accounts</p>
                <Link href="/faq" className="mt-6 inline-flex items-center gap-1.5 font-medium text-brand hover:text-text">All questions <ArrowRight aria-hidden="true" size={15} /></Link>
              </Reveal>
            </div>
            <Reveal className="lg:col-span-8"><Accordion items={home.faqs.map((f) => ({ q: f.question, a: f.answer, id: `faq-${f.slug}` }))} /></Reveal>
          </Container>
        </Section>
      )}

      <CTASection />
    </>
  );
}
