import { FileSignature, MessagesSquare, MonitorSmartphone } from 'lucide-react';
import { ServiceBento } from '@/components/pages/services/ServiceBento';
import { StepFlow } from '@/components/pages/services/StepFlow';
import { CTASection } from '@/components/sections/CTASection';
import { PageHero } from '@/components/sections/PageHero';
import { ProcessTimeline } from '@/components/sections/ProcessTimeline';
import { ButtonLink } from '@/components/ui/Button';
import { Container, Section } from '@/components/ui/Container';
import { Magnetic } from '@/components/ui/Magnetic';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { api } from '@/lib/api';
import { pageMeta } from '@/lib/seo';
import type { ServiceCard as Service, ServiceDetail, Step } from '@/lib/types';

export const metadata = pageMeta({
  title: 'Services',
  description: 'Websites, 3D websites, web applications, custom software, mobile apps, UI/UX design, business automation and branding, designed and engineered by one team.',
  path: '/services',
});

const ENGAGEMENT = [
  { icon: MessagesSquare, t: 'Discover call', d: 'A free call about your goals, your users and what exists today. You do not need a finished spec, just the problem you want solved.' },
  { icon: FileSignature, t: 'Written scope and fixed quote', d: 'Scope, price and timeline are written down and agreed before any build starts, so you know exactly what you are paying for.' },
  { icon: MonitorSmartphone, t: 'Build on a live staging link', d: 'Work happens in the open. From the first week you can open a staging link and see real progress on any device.' },
];

export default async function ServicesPage() {
  const [services, process] = await Promise.all([api<Service[]>('/services'), api<{ steps: Step[] }>('/pages/process')]);
  // Each card lists a few deliverables; details are cached, so this is cheap after the first request.
  const details = await Promise.all(services.map((s) => api<ServiceDetail>(`/services/${s.slug}`, { allow404: true }).catch(() => null)));
  const features = new Map(details.filter(Boolean).map((d) => [d!.slug, d!.deliverables]));

  return (
    <>
      <PageHero
        eyebrow="Services"
        title={<>Everything you need to build, launch and <span className="text-gradient">grow online</span></>}
        lead={`${services.length} disciplines under one roof. The same team designs and engineers your website, software and brand, so nothing gets lost between agencies.`}
      >
        <Magnetic><ButtonLink href="/quote" size="lg" arrow>Start a Project</ButtonLink></Magnetic>
        <ButtonLink href="/contact" size="lg" variant="secondary">Talk to us</ButtonLink>
      </PageHero>

      <Section labelledBy="all-services-title" className="pt-0 sm:pt-4">
        <Container>
          <h2 id="all-services-title" className="sr-only">All services</h2>
          <ServiceBento services={services} features={features} />
        </Container>
      </Section>

      <Section labelledBy="engage-title" className="border-t border-line bg-bg-2/60">
        <Container>
          <SectionHeading id="engage-title" eyebrow="How engagements work" title="Agreed in writing, built in the open"
            lead="Every project, large or small, starts the same way." />
          <div className="mt-14">
            <StepFlow cycle={3200} items={ENGAGEMENT.map(({ icon: I, t, d }) => ({ icon: <I size={20} strokeWidth={1.7} />, t, d }))} />
          </div>
        </Container>
      </Section>

      {process.steps.length > 0 && (
        <Section labelledBy="process-title" className="border-t border-line">
          <div aria-hidden="true" className="absolute inset-x-0 top-0 h-96 bg-[radial-gradient(ellipse_50%_100%_at_50%_0%,rgb(65_112_255/0.12),transparent)]" />
          <Container className="relative">
            <SectionHeading id="process-title" eyebrow="Process" align="center"
              title="The same clear process for every service"
              lead="From the first call to support after launch, you always know what happens next." />
            <div className="mt-16"><ProcessTimeline steps={process.steps} /></div>
            <div className="mt-14 text-center"><ButtonLink href="/process" variant="secondary" arrow>See the full process</ButtonLink></div>
          </Container>
        </Section>
      )}

      <CTASection title="Not sure which service you need?" lead="Tell us what you want to achieve. We will suggest the simplest way to get there, with a written scope and a fixed quote." />
    </>
  );
}
