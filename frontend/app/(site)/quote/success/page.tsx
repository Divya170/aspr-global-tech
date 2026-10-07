import { CheckCircle2 } from 'lucide-react';
import { CopyButton } from '@/components/forms/CopyButton';
import { ButtonLink } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { pageMeta } from '@/lib/seo';

export const metadata = pageMeta({
  title: 'Request received',
  description: 'Thanks for your request. We reply to every inquiry within one working day.',
  path: '/quote/success',
  noindex: true,
});

const REF_RE = /^ASPR-\d{4}-[A-Z0-9]{4,8}$/;

const NEXT = [
  { t: 'Confirmation email', d: 'A copy of your request is on its way to your inbox. Check spam if it has not arrived in a few minutes.' },
  { t: 'We review it', d: 'A senior member of the team reads your brief and any files you attached.' },
  { t: 'Reply within one working day', d: 'With questions, first ideas or a suggested time for a short call.' },
  { t: 'Written scope and fixed quote', d: 'Features, timeline and price, agreed in writing before any work starts.' },
];

export default async function QuoteSuccessPage({ searchParams }: { searchParams: Promise<{ ref?: string | string[] }> }) {
  const { ref } = await searchParams;
  const refNo = typeof ref === 'string' && REF_RE.test(ref) ? ref : null;

  return (
    <section aria-labelledby="success-title" className="relative overflow-hidden pb-24 pt-36 sm:pb-32 sm:pt-44">
      <div aria-hidden="true" className="bg-grid absolute inset-0" />
      <div aria-hidden="true" className="absolute -top-40 left-1/2 h-[520px] w-[min(1100px,140vw)] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(52_211_153/0.12),rgb(65_112_255/0.12)_55%,transparent)]" />
      <Container size="md" className="relative">
        <div className="animate-fade-up">
          <span aria-hidden="true" className="grid size-14 place-items-center rounded-2xl border border-success/30 bg-success/10 text-success">
            <CheckCircle2 size={28} strokeWidth={1.7} />
          </span>
          <h1 id="success-title" className="text-display mt-8">Thank you. Your request is with us.</h1>
          <p className="text-lead mt-5 max-w-2xl">We reply to every inquiry within one working day, usually much sooner.</p>

          {refNo && (
            <div className="panel mt-10 flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
              <div className="min-w-0">
                <p className="eyebrow">Your inquiry ID</p>
                <p className="mt-2 break-all font-mono text-2xl font-semibold tracking-tight text-text sm:text-3xl">
                  <span className="sr-only">Inquiry </span>#{refNo}
                </p>
                <p className="mt-2 text-sm text-muted">Quote it if you write or call us about this project.</p>
              </div>
              <div className="shrink-0"><CopyButton value={refNo} /></div>
            </div>
          )}

          <h2 className="mt-14 font-sans text-base font-semibold tracking-normal text-text">What happens next</h2>
          <ol className="mt-5 grid gap-4 sm:grid-cols-2">
            {NEXT.map((x, i) => (
              <li key={x.t} className="flex gap-4 rounded-xl border border-line bg-white/[0.02] p-5">
                <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full border border-line-strong font-mono text-xs text-brand-soft">{i + 1}</span>
                <div>
                  <p className="text-sm font-medium text-text">{x.t}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{x.d}</p>
                </div>
              </li>
            ))}
          </ol>

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
