import { Plus } from 'lucide-react';
import { ApplicationForm } from '@/components/sections/ApplicationForm';
import { CTASection } from '@/components/sections/CTASection';
import { PageHero } from '@/components/sections/PageHero';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { Container, Section } from '@/components/ui/Container';
import { Reveal } from '@/components/ui/Reveal';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { api } from '@/lib/api';
import { pageMeta } from '@/lib/seo';
import type { Role, Site } from '@/lib/types';

export const metadata = pageMeta({
  title: 'Careers',
  description: 'Join ASPR Global Tech: open roles for developers, designers and video editors. We hire for what you can build, not the certificate on the wall.',
  path: '/careers',
});

/** Role description: paragraphs split on blank lines; a short "Label:" lead-in is emphasised. */
function Description({ text }: { text: string }) {
  return (
    <div className="prose-aspr max-w-3xl text-base!">
      {text.split(/\n\s*\n/).map((t) => t.trim()).filter(Boolean).map((para, i) => {
        const m = para.match(/^([^:.\n]{3,32}):\s+([\s\S]*)$/);
        return <p key={i}>{m ? <><strong>{m[1]}:</strong> {m[2]}</> : para}</p>;
      })}
    </div>
  );
}

export default async function CareersPage() {
  const [{ roles }, site] = await Promise.all([api<{ roles: Role[] }>('/pages/careers'), api<Site>('/site')]);
  const s = site.settings;
  const careersEmail = s.company.careersEmail || s.company.email;
  const hiring = s.hiring || [];
  const teamRoles = s.teamRoles || [];

  return (
    <>
      <PageHero
        eyebrow="Careers"
        title={<>Build work you are <span className="text-gradient">proud to show</span></>}
        lead="We are a small team building websites, software, apps and brands for clients around the world. We hire for what people can build, not the certificate on the wall."
      >
        {roles.length > 0 && <ButtonLink href="#open-roles" size="lg" arrow>See open roles</ButtonLink>}
        <ButtonLink href={`mailto:${careersEmail}`} size="lg" variant="secondary">{careersEmail}</ButtonLink>
      </PageHero>

      {teamRoles.length > 0 && (
        <section aria-labelledby="team-title" className="border-y border-line bg-bg-2/60 py-10">
          <Container className="flex flex-col gap-5 md:flex-row md:items-center md:gap-10">
            <h2 id="team-title" className="eyebrow shrink-0">Who we work with</h2>
            <ul className="flex flex-wrap gap-2">
              {teamRoles.map((r) => <li key={r}><Badge>{r}</Badge></li>)}
            </ul>
          </Container>
        </section>
      )}

      <Section labelledBy="open-roles-title" id="open-roles" className="scroll-mt-20">
        <Container>
          <SectionHeading
            id="open-roles-title" eyebrow="Open roles"
            title={roles.length > 0 ? 'Where you could fit' : 'No open roles right now'}
            lead={roles.length > 0
              ? 'Open a role to read the details and apply. Send work, not a template CV: links and files matter more than titles.'
              : 'We are not actively hiring for a specific role at the moment, but we always want to see good work.'}
          />

          {roles.length > 0 ? (
            <div className="mt-12 space-y-4">
              {roles.map((role) => (
                <details key={role.id} id={`role-${role.id}`} className="panel group scroll-mt-28 overflow-hidden [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex min-h-11 cursor-pointer list-none items-start justify-between gap-6 p-5 transition-colors hover:bg-white/[0.02] sm:p-7">
                    <div>
                      <h3 className="text-xl font-semibold text-text transition-colors group-hover:text-brand-soft sm:text-2xl">{role.title}</h3>
                      {role.meta.length > 0 && (
                        <ul className="mt-3 flex flex-wrap gap-2" aria-label="Role details">
                          {role.meta.map((m) => <li key={m}><Badge>{m}</Badge></li>)}
                        </ul>
                      )}
                    </div>
                    <span className="mt-1 flex shrink-0 items-center gap-2 text-sm text-muted">
                      <span className="hidden sm:inline group-open:hidden">Details & apply</span>
                      <span className="hidden sm:group-open:inline">Close</span>
                      <span className="grid size-9 place-items-center rounded-full border border-line-strong transition-colors group-open:border-brand/50 group-open:bg-brand group-open:text-white">
                        <Plus aria-hidden="true" size={17} className="transition-transform duration-300 group-open:rotate-45" />
                      </span>
                    </span>
                  </summary>
                  <div className="border-t border-line px-5 pb-8 pt-7 sm:px-7">
                    {role.description && <Description text={role.description} />}
                    <div className="mt-10 rounded-2xl border border-line bg-bg/60 p-5 sm:p-8">
                      <h4 className="font-display text-lg font-semibold text-text">Apply for {role.title}</h4>
                      <p className="mt-1.5 text-sm text-muted">Fields marked * are required.</p>
                      <div className="mt-6"><ApplicationForm roleId={role.id} roleTitle={role.title} /></div>
                    </div>
                  </div>
                </details>
              ))}
              <p className="pt-4 text-sm text-muted">
                Don&apos;t see your role? Send your work to <a href={`mailto:${careersEmail}`} className="text-brand-soft underline underline-offset-4 hover:text-text">{careersEmail}</a>.
              </p>
            </div>
          ) : (
            <div className="panel mt-12 flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
              <p className="max-w-xl leading-relaxed text-muted">
                Send a short note and links to what you have built to <a href={`mailto:${careersEmail}`} className="text-brand-soft underline underline-offset-4 hover:text-text">{careersEmail}</a>. We will be in touch if a role opens that fits.
              </p>
              <ButtonLink href={`mailto:${careersEmail}`} variant="secondary" arrow className="self-start sm:self-auto">Email us your work</ButtonLink>
            </div>
          )}
        </Container>
      </Section>

      {hiring.length > 0 && (
        <Section labelledBy="hiring-title" className="border-t border-line">
          <Container>
            <SectionHeading id="hiring-title" eyebrow="How we hire" title="A clear process, no surprises" />
            <ol className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
              {hiring.map((h, i) => (
                <Reveal as="li" key={h.n || i} delay={i * 60} className="bg-bg p-6 sm:p-7">
                  <span className="font-mono text-xs text-brand-soft">{h.n || String(i + 1).padStart(2, '0')}</span>
                  <h3 className="mt-6 font-sans text-lg font-semibold tracking-normal text-text">{h.t}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{h.d}</p>
                </Reveal>
              ))}
            </ol>
          </Container>
        </Section>
      )}

      <CTASection
        title="Looking to hire us instead?"
        lead="If you came here with a project rather than a CV, tell us what you are building and we will reply within one working day."
      />
    </>
  );
}
