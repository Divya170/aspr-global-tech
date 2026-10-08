import { CopyButton } from '@/components/forms/CopyButton';
import { NextStepper } from '@/components/pages/forms/NextStepper';
import { SuccessMark } from '@/components/pages/forms/SuccessMark';
import { ButtonLink } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { pageMeta } from '@/lib/seo';
import '@/components/pages/forms/forms.css';

export const metadata = pageMeta({
  title: 'Request received',
  description: 'Thanks for your request. We reply to every inquiry within one working day.',
  path: '/quote/success',
  noindex: true,
});

const REF_RE = /^ASPR-\d{4}-[A-Z0-9]{4,8}$/;

const NEXT = [
  { t: 'Confirmation email', d: 'A copy of your request is on its way to your inbox. Check spam if it has not arrived in a few minutes.' },
  { t: 'We review it', d: 'Someone from the team reads your brief and any files you attached.' },
  { t: 'Reply within one working day', d: 'With questions, first ideas or a suggested time for a short call.' },
  { t: 'Written scope and fixed quote', d: 'Features, timeline and price, agreed in writing before any work starts.' },
];

/** Thank-you page: drawn success mark with a small burst, the inquiry ID as a glowing chip, and a lit "what happens next" rail. */
export default async function QuoteSuccessPage({ searchParams }: { searchParams: Promise<{ ref?: string | string[] }> }) {
  const { ref } = await searchParams;
  const refNo = typeof ref === 'string' && REF_RE.test(ref) ? ref : null;

  return (
    <section aria-labelledby="success-title" className="relative overflow-hidden pb-24 pt-36 sm:pb-32 sm:pt-44">
      <div aria-hidden="true" className="fx-aurora opacity-40"><i /><i /><i /></div>
      <div aria-hidden="true" className="bg-grid absolute inset-0" />
      <div aria-hidden="true" className="absolute -top-40 left-1/2 h-[520px] w-[min(1100px,140vw)] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(52_211_153/0.16),rgb(65_112_255/0.12)_55%,transparent)]" />
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-bg to-transparent" />
      <Container size="md" className="relative">
        <div className="animate-fade-up">
          <SuccessMark size="5rem" />
          <h1 id="success-title" className="text-display mt-8">Thank you. Your request is with us.</h1>
          <p className="text-lead mt-5 max-w-2xl">We reply to every inquiry within one working day, usually much sooner.</p>

          {refNo && (
            <div className="panel fx-border-live fm-live relative mt-10 flex flex-col gap-6 overflow-hidden bg-surface/70 p-6 shadow-[0_40px_90px_-50px_rgb(65_112_255/0.7)] sm:flex-row sm:items-center sm:justify-between sm:p-8">
              <div aria-hidden="true" className="pointer-events-none absolute -left-20 -top-24 size-64 rounded-full bg-[radial-gradient(closest-side,rgb(65_112_255/0.22),transparent)] blur-2xl" />
              <div className="relative min-w-0">
                <p className="eyebrow eyebrow-line">Your inquiry ID</p>
                <p className="fm-id mt-3 inline-block max-w-full break-all px-4 py-2.5 font-mono text-2xl font-semibold tracking-tight text-text sm:text-3xl">
                  <span className="sr-only">Inquiry </span>#{refNo}
                </p>
                <p className="mt-3 text-sm text-muted">Quote it if you write or call us about this project.</p>
              </div>
              <div className="relative shrink-0"><CopyButton value={refNo} /></div>
            </div>
          )}

          <h2 className="mt-14 font-sans text-base font-semibold tracking-normal text-text">What happens next</h2>
          <NextStepper items={NEXT} cards className="mt-6" />

          <p className="mt-14 text-sm text-muted">While you wait</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <ButtonLink href="/portfolio" variant="secondary" arrow>See our work</ButtonLink>
            <ButtonLink href="/process" variant="secondary">How we work</ButtonLink>
            <ButtonLink href="/" variant="ghost">Back to home</ButtonLink>
          </div>
        </div>
      </Container>
    </section>
  );
}
