import { FeatureCards } from '@/components/interactive/FeatureCards';
import { JourneyTimeline } from '@/components/interactive/JourneyTimeline';
import { RolePills } from '@/components/interactive/RolePills';
import { StatBand } from '@/components/interactive/StatBand';
import { StepCards } from '@/components/interactive/StepCards';
import { ValueRows } from '@/components/interactive/ValueRows';
import { IndustryGrid } from '@/components/pages/about/IndustryGrid';
import { CTASection } from '@/components/sections/CTASection';
import { PageHero } from '@/components/sections/PageHero';
import { TestimonialCard } from '@/components/sections/TestimonialCard';
import { ButtonLink } from '@/components/ui/Button';
import { Container, Section } from '@/components/ui/Container';
import { Reveal } from '@/components/ui/Reveal';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { api } from '@/lib/api';
import { pageMeta } from '@/lib/seo';
import { TEAM_RECORD_NOTE } from '@/lib/site';
import type { Industry, Site, Step, Testimonial } from '@/lib/types';

export const metadata = pageMeta({
  title: 'About',
  description: 'ASPR Global Tech is a software studio in Mettupalayam, Tamil Nadu, India, building websites, 3D experiences, web apps, custom software and mobile apps for clients worldwide.',
  path: '/about',
});

/** "ESTABLISHED" → "Established" for the facts list. */
const label = (k: string) => k.charAt(0) + k.slice(1).toLowerCase();
/** Facts with a number become count-up tiles; the rest are shown as pills. */
const STAT_ICON: Record<string, string> = { PROJECTS: 'folder-kanban', CLIENTS: 'handshake', TEAM: 'users', SERVICES: 'layers' };
const VALUE_ICONS = ['sparkles', 'shield-check', 'rocket', 'layers', 'zap', 'code'];

export default async function AboutPage() {
  const [site, about] = await Promise.all([
    api<Site>('/site'),
    api<{ industries: Industry[]; steps: Step[]; testimonials: Testimonial[] }>('/pages/about'),
  ]);
  const s = site.settings;
  const why = s.why || [];
  const values = s.values || [];
  const timeline = s.timeline || [];
  const roles = s.teamRoles || [];
  // The services count always comes from the live service list, so it can never disagree with /services.
  const facts = (s.facts || []).map((f) => (f.k.toUpperCase() === 'SERVICES' ? { ...f, v: String(site.services.length) } : f));
  const team = s.stats?.specialistsMin ? `${s.stats.specialistsMin}–${s.stats.specialistsMax}` : '';

  return (
    <>
      <PageHero
        eyebrow="About ASPR"
        title={<>One team for the whole build, <span className="text-gradient">start to finish</span></>}
        lead="ASPR Global Tech is a software studio that designs and engineers websites, 3D experiences, web applications, custom software and mobile apps for businesses around the world."
      />

      {/* ─────────── Who we are + facts ─────────── */}
      <Section labelledBy="who-title" className="pt-0 sm:pt-4">
        <Container className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <Reveal className="lg:col-span-7">
            <h2 id="who-title" className="text-heading">Who we are</h2>
            <div className="prose-aspr mt-6 max-w-2xl">
              <p>
                We are based in Mettupalayam, Tamil Nadu, India, and work with clients worldwide. Before ASPR, the people on this team were
                already building websites, apps, games and brands on their own. In March 2026 we registered as a partnership firm so that
                clients could hire all of those skills as one team, with one point of contact and one written agreement.
              </p>
              <p>
                {team ? `Today we are a team of ${team} specialists.` : 'Today we are a small team of specialists.'} The people who
                design and build your project are the people you talk to, with no account managers in between.
              </p>
            </div>
            {roles.length > 0 && <div className="mt-8"><RolePills roles={roles} label="Disciplines on the team" /></div>}
          </Reveal>
          {facts.length > 0 && (
            <Reveal delay={80} className="lg:col-span-5">
              <h3 className="eyebrow mb-4 text-subtle!">Facts</h3>
              <StatBand
                stats={facts.filter((f) => STAT_ICON[f.k.toUpperCase()]).map((f) => ({ value: f.v, label: label(f.k), icon: STAT_ICON[f.k.toUpperCase()] }))}
                pills={facts.filter((f) => !STAT_ICON[f.k.toUpperCase()]).map((f) => ({ k: label(f.k), v: f.v }))}
                note={facts.some((f) => ['CLIENTS', 'PROJECTS'].includes(f.k.toUpperCase())) ? TEAM_RECORD_NOTE : undefined}
              />
            </Reveal>
          )}
        </Container>
      </Section>

      {/* ─────────── Mission ─────────── */}
      <section aria-labelledby="mission-title" className="relative border-y border-line bg-bg-2/60 py-20 sm:py-28">
        <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_50%_80%_at_50%_0%,color-mix(in_srgb,var(--color-brand)_6%,transparent),transparent)]" />
        <Container size="lg" className="relative">
          <Reveal className="text-center">
            <h2 id="mission-title" className="eyebrow">Our mission</h2>
            <p className="mx-auto mt-8 max-w-4xl font-display text-2xl font-semibold leading-snug tracking-tight text-text sm:text-4xl sm:leading-tight">
              Give every business we work with software it understands, owns and can <span className="text-gradient">grow with</span>: built properly, explained plainly and looked after once it is live.
            </p>
          </Reveal>
        </Container>
      </section>

      {/* ─────────── Why clients choose us ─────────── */}
      {why.length > 0 && (
        <Section labelledBy="why-title">
          <Container>
            <SectionHeading id="why-title" eyebrow="Why clients choose us" title="What working with us is like" />
            <div className="mt-14"><StepCards items={why} label="Why clients choose us" /></div>
          </Container>
        </Section>
      )}

      {/* ─────────── Approach ─────────── */}
      {about.steps.length > 0 && (
        <Section labelledBy="approach-title" className="border-t border-line">
          <Container className="grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <SectionHeading id="approach-title" eyebrow="Our approach" title="Agree first, then build in the open"
                lead="Every project follows the same steps. Scope, price and timeline are written down before work starts, and you can check progress on a staging link any day." />
              <Reveal className="mt-8"><ButtonLink href="/process" variant="secondary" arrow>See the full process</ButtonLink></Reveal>
            </div>
            <div className="lg:col-span-7"><ValueRows items={about.steps.map((st) => ({ n: st.num, t: st.title, d: st.description }))} label="Our approach" /></div>
          </Container>
        </Section>
      )}

      {/* ─────────── Philosophy / values ─────────── */}
      {values.length > 0 && (
        <Section labelledBy="values-title" className="border-t border-line">
          <Container>
            <SectionHeading id="values-title" eyebrow="Development philosophy" title="What we hold ourselves to" />
            <FeatureCards className="mt-14" items={values.map((v, i) => ({ icon: VALUE_ICONS[i % VALUE_ICONS.length], t: v.t, d: v.d }))} />
          </Container>
        </Section>
      )}

      {/* ─────────── Industries ─────────── */}
      {about.industries.length > 0 && (
        <Section labelledBy="industries-title" className="border-t border-line bg-bg-2/60">
          <Container>
            <SectionHeading id="industries-title" eyebrow="Industries" title="Problems we know well"
              lead="The details differ by industry. The underlying problem is usually information living in too many places." />
            <div className="mt-14"><IndustryGrid items={about.industries} /></div>
          </Container>
        </Section>
      )}

      {/* ─────────── Story ─────────── */}
      {timeline.length > 0 && (
        <Section labelledBy="story-title" className="border-t border-line">
          <Container>
            <SectionHeading id="story-title" eyebrow="Our story" title="Where we are going" />
            <div className="mt-14"><JourneyTimeline items={timeline} /></div>
          </Container>
        </Section>
      )}

      {/* ─────────── Testimonials (only genuine, approved ones) ─────────── */}
      {about.testimonials.length > 0 && (
        <Section labelledBy="testimonials-title" className="border-t border-line">
          <Container>
            <SectionHeading id="testimonials-title" eyebrow="Clients" title="In our clients' words" />
            <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {about.testimonials.map((t, i) => <Reveal key={t.id} delay={i * 80}><TestimonialCard t={t} /></Reveal>)}
            </div>
          </Container>
        </Section>
      )}

      <CTASection title="Let's build something that lasts" />
    </>
  );
}
