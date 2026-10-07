import { CTASection } from '@/components/sections/CTASection';
import { PageHero } from '@/components/sections/PageHero';
import { TestimonialCard } from '@/components/sections/TestimonialCard';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { Container, Section } from '@/components/ui/Container';
import { Reveal } from '@/components/ui/Reveal';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { api } from '@/lib/api';
import { pageMeta } from '@/lib/seo';
import type { Industry, Site, Step, Testimonial } from '@/lib/types';

export const metadata = pageMeta({
  title: 'About',
  description: 'ASPR Global Tech is a software studio in Mettupalayam, Tamil Nadu, India, building websites, 3D experiences, web apps, custom software and mobile apps for clients worldwide.',
  path: '/about',
});

/** "ESTABLISHED" → "Established" for the facts list. */
const label = (k: string) => k.charAt(0) + k.slice(1).toLowerCase();

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
            {roles.length > 0 && (
              <ul aria-label="Disciplines on the team" className="mt-8 flex flex-wrap gap-2">
                {roles.map((r) => <li key={r}><Badge>{r}</Badge></li>)}
              </ul>
            )}
          </Reveal>
          {facts.length > 0 && (
            <Reveal delay={80} className="lg:col-span-5">
              <div className="panel p-7 sm:p-8">
                <h3 className="eyebrow text-subtle!">Facts</h3>
                <dl className="mt-4 divide-y divide-line">
                  {facts.map((f) => (
                    <div key={f.k} className="flex items-baseline justify-between gap-6 py-3.5">
                      <dt className="text-sm text-muted">{label(f.k)}</dt>
                      <dd className="text-right font-medium text-text">{f.v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </Reveal>
          )}
        </Container>
      </Section>

      {/* ─────────── Mission ─────────── */}
      <section aria-labelledby="mission-title" className="relative border-y border-line bg-bg-2/60 py-20 sm:py-28">
        <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_50%_80%_at_50%_0%,rgb(65_112_255/0.1),transparent)]" />
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
            <ol className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {why.map((w, i) => (
                <Reveal as="li" key={w.t} delay={i * 70} className="panel flex flex-col p-7">
                  <span className="font-mono text-xs text-brand-soft">{w.n}</span>
                  <h3 className="mt-6 text-lg font-semibold text-text">{w.t}</h3>
                  <p className="mt-2 text-[0.95rem] leading-relaxed text-muted">{w.d}</p>
                </Reveal>
              ))}
            </ol>
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
            <ol className="divide-y divide-line border-y border-line lg:col-span-7">
              {about.steps.map((st, i) => (
                <Reveal as="li" key={st.id} delay={i * 40} className="grid grid-cols-[2.5rem_1fr] gap-4 py-5 sm:grid-cols-[3rem_9rem_1fr]">
                  <span className="pt-0.5 font-mono text-xs text-subtle">{st.num}</span>
                  <h3 className="font-semibold text-text">{st.title}</h3>
                  <p className="col-start-2 text-[0.95rem] leading-relaxed text-muted sm:col-start-3">{st.description}</p>
                </Reveal>
              ))}
            </ol>
          </Container>
        </Section>
      )}

      {/* ─────────── Philosophy / values ─────────── */}
      {values.length > 0 && (
        <Section labelledBy="values-title" className="border-t border-line">
          <Container>
            <SectionHeading id="values-title" eyebrow="Development philosophy" title="What we hold ourselves to" />
            <ul className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
              {values.map((v, i) => (
                <Reveal as="li" key={v.t} delay={(i % 3) * 60} className="bg-bg p-7 sm:p-8">
                  <h3 className="text-lg font-semibold text-text">{v.t}</h3>
                  <p className="mt-2 text-[0.95rem] leading-relaxed text-muted">{v.d}</p>
                </Reveal>
              ))}
              {values.length % 3 !== 0 && <li aria-hidden="true" className="hidden bg-bg lg:block" style={{ gridColumn: `span ${3 - (values.length % 3)}` }} />}
            </ul>
          </Container>
        </Section>
      )}

      {/* ─────────── Industries ─────────── */}
      {about.industries.length > 0 && (
        <Section labelledBy="industries-title" className="border-t border-line bg-bg-2/60">
          <Container>
            <SectionHeading id="industries-title" eyebrow="Industries" title="Problems we know well"
              lead="The details differ by industry. The underlying problem is usually information living in too many places." />
            <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {about.industries.map((ind, i) => (
                <Reveal as="li" key={ind.id} delay={(i % 4) * 60} className="panel flex flex-col p-6">
                  <h3 className="text-lg font-semibold text-text">{ind.name}</h3>
                  <p className="mt-2 flex-1 text-[0.95rem] leading-relaxed text-muted">{ind.problem}</p>
                  {ind.builds.length > 0 && (
                    <div className="mt-5 flex flex-wrap gap-1.5">
                      {ind.builds.map((b) => <Badge key={b}>{b}</Badge>)}
                    </div>
                  )}
                </Reveal>
              ))}
            </ul>
          </Container>
        </Section>
      )}

      {/* ─────────── Story ─────────── */}
      {timeline.length > 0 && (
        <Section labelledBy="story-title" className="border-t border-line">
          <Container>
            <SectionHeading id="story-title" eyebrow="Our story" title="Where we are going" />
            <ol className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
              {timeline.map((t, i) => (
                <Reveal as="li" key={t.k} delay={i * 60} className="bg-bg p-7">
                  <p className="font-mono text-xs uppercase tracking-[0.14em] text-brand-soft">{t.k}</p>
                  <p className="mt-4 text-lg leading-snug text-text">{t.t}</p>
                </Reveal>
              ))}
            </ol>
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
