import { Mail } from 'lucide-react';
import { RolePills } from '@/components/interactive/RolePills';
import { StepCards } from '@/components/interactive/StepCards';
import { RoleCard } from '@/components/pages/content/RoleCard';
import { CTASection } from '@/components/sections/CTASection';
import { PageHero } from '@/components/sections/PageHero';
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
        <section aria-labelledby="team-title" className="ct-band fx-divider border-b border-line bg-bg-2/60 py-10 sm:py-12">
          <Container className="flex flex-col gap-5 md:flex-row md:items-center md:gap-10">
            <h2 id="team-title" className="eyebrow eyebrow-line shrink-0">Who we work with</h2>
            <RolePills roles={teamRoles} />
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
              {roles.map((role, i) => <Reveal key={role.id} delay={Math.min(i, 4) * 40}><RoleCard role={role} /></Reveal>)}
              <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-line-strong px-5 py-4 text-sm text-muted sm:flex-row sm:items-center sm:gap-4">
                <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-brand/15 text-brand-soft"><Mail size={16} /></span>
                <p>
                  Don&apos;t see your role? Send your work to <a href={`mailto:${careersEmail}`} className="text-brand-soft underline underline-offset-4 hover:text-text">{careersEmail}</a>.
                </p>
              </div>
            </div>
          ) : (
            <div className="ct-glass mt-12 flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
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
            <div className="mt-12"><StepCards items={hiring.map((h, i) => ({ n: h.n || String(i + 1).padStart(2, '0'), t: h.t, d: h.d }))} label="How we hire" /></div>
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
