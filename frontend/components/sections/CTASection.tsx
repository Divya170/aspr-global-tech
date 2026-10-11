import { ButtonLink } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { Magnetic } from '@/components/ui/Magnetic';
import { Reveal } from '@/components/ui/Reveal';

/** Closing call to action used at the bottom of most pages. */
export function CTASection({
  title = 'Have a project in mind?', lead = "Tell us what you're building. We reply to every inquiry within one working day with questions, ideas or a time to talk.",
  primary = { label: 'Start Your Project', href: '/quote' }, secondary = { label: 'Contact us', href: '/contact' },
}: { title?: string; lead?: string; primary?: { label: string; href: string }; secondary?: { label: string; href: string } | null }) {
  return (
    <section aria-labelledby="cta-title" className="relative py-20 sm:py-28">
      <Container>
        <Reveal className="fx-border-live relative isolate overflow-hidden rounded-[2rem] border border-line-strong bg-surface px-6 py-16 text-center sm:px-12 sm:py-20">
          <div aria-hidden="true" className="fx-aurora"><i /><i /><i /></div>
          <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_70%_90%_at_50%_120%,color-mix(in_srgb,var(--color-brand)_21%,transparent),transparent_60%),radial-gradient(ellipse_50%_60%_at_85%_-10%,color-mix(in_srgb,var(--color-accent)_15%,transparent),transparent_60%)]" />
          <div aria-hidden="true" className="bg-grid absolute inset-0 opacity-60" />
          <div className="relative mx-auto max-w-2xl">
            <h2 id="cta-title" className="text-display">{title}</h2>
            <p className="text-lead mx-auto mt-5 max-w-xl">{lead}</p>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <Magnetic><ButtonLink href={primary.href} size="lg" arrow>{primary.label}</ButtonLink></Magnetic>
              {secondary && <ButtonLink href={secondary.href} size="lg" variant="secondary">{secondary.label}</ButtonLink>}
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
