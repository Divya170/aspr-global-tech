'use client';

import {
  ArrowLeft, ArrowRight, AtSign, Box, Building2, CalendarClock, ClipboardList, Code2, FileText, Globe, Layers, LayoutDashboard, Megaphone, Palette, Paperclip,
  PenLine, PenTool, Phone, Smartphone, Sparkles, UserRound, Wallet, Workflow, type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { buttonClass } from '@/components/ui/Button';
import { track } from '@/lib/analytics';
import { ApiError, submitForm } from '@/lib/client';
import { emailError, MIN_MESSAGE, phoneError } from '@/lib/validate';
import { ChoiceGroup } from './ChoiceGroup';
import { ErrorSummary, focusField, type FormError } from './ErrorSummary';
import { FileDrop, formatBytes } from './FileDrop';
import { Honeypot } from './Honeypot';
import { Select } from './Select';
import { SubmitButton } from './SubmitButton';
import { TextArea } from './TextArea';
import { TextInput } from './TextInput';

export interface QuoteOptions { projectTypes: string[]; budgets: string[]; timelines: string[]; heardFrom: string[] }

type Key = 'projectType' | 'budget' | 'timeline' | 'message' | 'files' | 'name' | 'email' | 'phone' | 'company' | 'heardFrom';
type Values = Record<Exclude<Key, 'files'>, string>;
type Errors = Partial<Record<Key, string>>;

const STEPS: { title: string; short: string; lead: string; keys: Key[] }[] = [
  { title: 'What are we building?', short: 'Project', lead: 'Pick the closest match. You can explain the details in a moment.', keys: ['projectType'] },
  { title: 'Budget and timeline', short: 'Budget', lead: 'A rough range is enough. It helps us suggest the right scope, not a bigger one.', keys: ['budget', 'timeline'] },
  { title: 'Tell us about the project', short: 'Details', lead: 'Goals, features, examples you like, anything already in place. Attach a brief or sketches if you have them.', keys: ['message', 'files'] },
  { title: 'Where should we reply?', short: 'Contact', lead: 'We reply within one working day. No mailing lists, no sales calls you did not ask for.', keys: ['name', 'email', 'phone', 'company', 'heardFrom'] },
];

/** DOM id of the focusable control for each field (used by error links). */
const domId = (k: Key) => `quote-${k}`;

const TYPE_HINTS: Record<string, { icon: LucideIcon; d: string }> = {
  'Website': { icon: Globe, d: 'Company site, landing pages, CMS' },
  '3D Website': { icon: Box, d: 'WebGL, interactive product stories' },
  'Web Application': { icon: LayoutDashboard, d: 'Portals, dashboards, SaaS' },
  'Custom Software': { icon: Code2, d: 'Internal tools, ERP, integrations' },
  'Mobile App': { icon: Smartphone, d: 'iOS and Android' },
  'UI/UX Design': { icon: PenTool, d: 'Research, flows, design systems' },
  'Business Automation': { icon: Workflow, d: 'Workflows, AI assistants, ops' },
  'Branding': { icon: Palette, d: 'Identity, logo, guidelines' },
  'Other': { icon: Sparkles, d: 'Something else, or not sure yet' },
};

/** Decorative icons for the review rows and the contact-step controls. */
const REVIEW_ICON: Record<string, LucideIcon> = { Project: Layers, Budget: Wallet, Timeline: CalendarClock, Details: FileText, Files: Paperclip };
const ic = (I: LucideIcon) => <I size={17} strokeWidth={1.8} />;

function validate(v: Values, keys: Key[], o: QuoteOptions): Errors {
  const e: Errors = {};
  for (const k of keys) {
    if (k === 'projectType' && !o.projectTypes.includes(v.projectType)) e.projectType = 'Choose the type of project.';
    if (k === 'budget' && !o.budgets.includes(v.budget)) e.budget = 'Choose a budget range.';
    if (k === 'timeline' && !o.timelines.includes(v.timeline)) e.timeline = 'Choose a timeline.';
    if (k === 'message' && v.message.trim().length < MIN_MESSAGE) e.message = `Tell us a little more: at least ${MIN_MESSAGE} characters.`;
    if (k === 'name' && !v.name.trim()) e.name = 'Enter your name so we know who to reply to.';
    if (k === 'email') { const m = emailError(v.email); if (m) e.email = m; }
    if (k === 'phone') { const m = phoneError(v.phone); if (m) e.phone = m; }
  }
  return e;
}

/**
 * Four-step quote wizard: a connected progress rail, steps that slide in from the direction of
 * travel, tactile choice cards and a review card before sending. Errors focus the first problem.
 */
export function QuoteForm({ options, initialType = '' }: { options: QuoteOptions; initialType?: string }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [v, setV] = useState<Values>({ projectType: initialType, budget: '', timeline: '', message: '', name: '', email: '', phone: '', company: '', heardFrom: '' });
  const [files, setFiles] = useState<File[]>([]);
  const [website, setWebsite] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [summary, setSummary] = useState<FormError[]>([]);
  const [summaryKey, setSummaryKey] = useState(0);
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  /** What to focus after the next step change: the step heading, the error summary, or a field. */
  const pendingFocus = useRef<'heading' | 'summary' | Key | null>(null);
  // Direction of the last step change, for the decorative slide-in. Empty until the step first
  // changes, so the server-rendered step is never hidden by an entrance animation.
  const [shownStep, setShownStep] = useState(step);
  const [dir, setDir] = useState<'' | 'fwd' | 'back'>('');
  if (shownStep !== step) { setShownStep(step); setDir(step > shownStep ? 'fwd' : 'back'); }

  const set = (k: keyof Values) => (val: string) => {
    setV((x) => ({ ...x, [k]: val }));
    if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }));
  };

  useEffect(() => {
    const f = pendingFocus.current;
    pendingFocus.current = null;
    if (!f) return;
    if (f === 'heading') {
      heading.current?.focus({ preventScroll: true });
      heading.current?.closest('form')?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    } else if (f === 'summary') setSummaryKey((n) => n + 1);
    else focusField(domId(f));
  }, [step]);

  function goTo(n: number) {
    pendingFocus.current = 'heading';
    setSummary([]);
    setFormError('');
    setStep(n);
  }

  function next() {
    const e = validate(v, STEPS[step].keys, options);
    setErrors((x) => ({ ...x, ...e }));
    const first = STEPS[step].keys.find((k) => e[k]);
    if (first) { focusField(domId(first)); return; }
    goTo(step + 1);
  }

  async function submit() {
    if (busy) return;
    // Re-check every step: the first one with a problem is where we send the visitor.
    const all = validate(v, STEPS.flatMap((s) => s.keys), options);
    if (Object.keys(all).length) return showErrors(all);
    setBusy(true); setFormError(''); setSummary([]);
    try {
      const res = await submitForm<{ refNo: string }>('/api/quote', {
        projectType: v.projectType, budget: v.budget, timeline: v.timeline, message: v.message.trim(), name: v.name.trim(), email: v.email.trim(),
        phone: v.phone.trim(), company: v.company.trim(), heardFrom: v.heardFrom, website,
      }, files);
      track('Quote Submitted', { type: v.projectType });
      router.push('/quote/success?ref=' + encodeURIComponent(res.refNo));
    } catch (err) {
      setBusy(false);
      const fe = err instanceof ApiError ? err.fieldErrors : null;
      if (fe && Object.keys(fe).length) return showErrors(fe as Errors);
      setFormError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
      setSummary([]);
    }
  }

  function showErrors(e: Errors) {
    setErrors(e);
    const target = STEPS.findIndex((s) => s.keys.some((k) => e[k]));
    const at = target === -1 ? step : target;
    const list = STEPS[at].keys.filter((k) => e[k]).map((k) => ({ id: domId(k), message: e[k]! }));
    const unknown = Object.entries(e).filter(([k]) => !STEPS.some((s) => s.keys.includes(k as Key)));
    setSummary(list);
    if (unknown.length) setFormError(unknown.map(([, m]) => m).join(' '));
    if (at === step) setSummaryKey((n) => n + 1);
    else { pendingFocus.current = 'summary'; setStep(at); }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (step < STEPS.length - 1) next(); else submit();
  }

  const s = STEPS[step];
  const last = step === STEPS.length - 1;
  const typeChoices = options.projectTypes.map((t) => {
    const h = TYPE_HINTS[t];
    return { value: t, description: h?.d, icon: h ? <h.icon size={19} strokeWidth={1.7} /> : undefined };
  });

  return (
    <form onSubmit={onSubmit} noValidate aria-labelledby="quote-step-title" className="relative scroll-mt-28">
      {/* Progress: connected rail; finished steps are buttons back to that step */}
      <div className="mb-9">
        <div className="flex items-center justify-between gap-4">
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-brand">Step {step + 1} of {STEPS.length}</p>
          <p className="fm-stepchip text-xs text-muted">{s.short}</p>
        </div>
        <div className="relative mt-5" style={{ '--n': STEPS.length, '--p': step / (STEPS.length - 1) } as CSSProperties}>
          <div aria-hidden="true" className="fm-steps-track"><span /></div>
          <ol aria-label="Quote steps" className="fm-steps">
            {STEPS.map((x, i) => {
              const done = i < step, current = i === step;
              const inner = (
                <>
                  <span aria-hidden="true" className="fm-dot">
                    {done ? (
                      <svg viewBox="0 0 12 12" fill="none" className="fm-check fm-draw size-3">
                        <path d="M2.4 6.3l2.3 2.3 4.9-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" pathLength={1} />
                      </svg>
                    ) : i + 1}
                  </span>
                  <span className={`fm-node-label hidden max-w-full truncate text-xs sm:block ${current ? 'font-medium text-text' : done ? 'text-muted' : 'text-subtle'}`}>{x.short}</span>
                  <span className="sr-only">{`Step ${i + 1}: ${x.short}${done ? ' (done)' : current ? ' (current)' : ''}`}</span>
                </>
              );
              return (
                <li key={x.short} aria-current={current ? 'step' : undefined} className="min-w-0">
                  {done ? (
                    <button type="button" onClick={() => goTo(i)} className="fm-node is-done">{inner}</button>
                  ) : (
                    <span className={`fm-node ${current ? 'is-current' : ''}`}>{inner}</span>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      <div key={step} className={dir ? `fm-pane-${dir}` : ''}>
        <div className="flex items-start gap-4 sm:gap-5">
          <span aria-hidden="true" className="fm-bignum shrink-0 pt-0.5">{String(step + 1).padStart(2, '0')}</span>
          <div className="min-w-0">
            <h2 id="quote-step-title" ref={heading} tabIndex={-1} className="font-display text-2xl font-semibold tracking-tight text-text focus:outline-none sm:text-[1.75rem]">
              {s.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted sm:text-[0.95rem]">{s.lead}</p>
          </div>
        </div>

        {summary.length > 0 && <div className="mt-6"><ErrorSummary errors={summary} focusKey={summaryKey} /></div>}

        <div className="mt-7 space-y-7">
          {step === 0 && (
            <ChoiceGroup id={domId('projectType')} legend="Project type" legendClass="sr-only" options={typeChoices} value={v.projectType} onChange={set('projectType')} error={errors.projectType} />
          )}

          {step === 1 && (
            <>
              <ChoiceGroup id={domId('budget')} legend="Budget range (USD)" options={options.budgets} value={v.budget} onChange={set('budget')} error={errors.budget} variant="chip" />
              <ChoiceGroup id={domId('timeline')} legend="When would you like to launch?" options={options.timelines} value={v.timeline} onChange={set('timeline')} error={errors.timeline} variant="chip" />
            </>
          )}

          {step === 2 && (
            <>
              <TextArea
                id={domId('message')} label="Project description" value={v.message} onChange={set('message')} error={errors.message} min={MIN_MESSAGE} rows={7}
                placeholder="What should it do, who is it for, and what does success look like? Links to sites you like are helpful too."
              />
              <FileDrop id={domId('files')} files={files} onChange={(f) => { setFiles(f); if (errors.files) setErrors((x) => ({ ...x, files: undefined })); }} error={errors.files} />
            </>
          )}

          {step === 3 && (
            <>
              <div className="grid gap-6 sm:grid-cols-2">
                <TextInput id={domId('name')} label="Your name" value={v.name} onChange={set('name')} error={errors.name} autoComplete="name" icon={ic(UserRound)} />
                <TextInput id={domId('email')} label="Email" type="email" inputMode="email" value={v.email} onChange={set('email')} error={errors.email} autoComplete="email" placeholder="you@company.com" icon={ic(AtSign)} />
                <TextInput id={domId('phone')} label="Phone or WhatsApp" type="tel" inputMode="tel" value={v.phone} onChange={set('phone')} error={errors.phone} autoComplete="tel" optional placeholder="+1 555 010 2030" hint="Include your country code." icon={ic(Phone)} />
                <TextInput id={domId('company')} label="Company" value={v.company} onChange={set('company')} error={errors.company} autoComplete="organization" optional icon={ic(Building2)} />
              </div>
              <Select id={domId('heardFrom')} label="How did you hear about us?" options={options.heardFrom} value={v.heardFrom} onChange={set('heardFrom')} error={errors.heardFrom} optional placeholder="Choose one" icon={ic(Megaphone)} />
              <Honeypot value={website} onChange={setWebsite} />

              <section aria-labelledby="quote-review-title" className="fm-review relative overflow-hidden rounded-2xl border border-brand-soft/25 p-4 shadow-[0_24px_60px_-40px_color-mix(in_srgb,var(--color-brand)_54%,transparent)] sm:p-6">
                <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--color-accent)_13%,transparent),transparent)] blur-xl" />
                <div className="relative flex items-center gap-3">
                  <span aria-hidden="true" className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-brand-strong to-brand text-white shadow-[0_10px_24px_-10px_color-mix(in_srgb,var(--color-brand)_57%,transparent)]">
                    <ClipboardList size={17} strokeWidth={1.8} />
                  </span>
                  <h3 id="quote-review-title" className="font-sans text-sm font-semibold tracking-normal text-text">Your request</h3>
                </div>
                <dl className="relative mt-4 divide-y divide-line text-sm">
                  {([
                    ['Project', v.projectType, 0], ['Budget', v.budget, 1], ['Timeline', v.timeline, 1],
                    ['Details', v.message.trim() ? `${v.message.trim().slice(0, 140)}${v.message.trim().length > 140 ? '…' : ''}` : '', 2],
                    ['Files', files.length ? files.map((f) => `${f.name} (${formatBytes(f.size)})`).join(', ') : 'None', 2],
                  ] as [string, string, number][]).map(([k, val, at], i) => {
                    const I = REVIEW_ICON[k];
                    return (
                      <div key={k} className="fm-review-row fm-rise flex items-start gap-3 px-1.5 py-2.5 sm:px-2" style={{ '--i': i + 4 } as CSSProperties}>
                        <dt className="flex w-[5.25rem] shrink-0 items-center gap-2 text-subtle sm:w-28">{I && <I aria-hidden="true" size={15} strokeWidth={1.8} className="hidden shrink-0 text-brand/80 sm:block" />}{k}</dt>
                        <dd className="min-w-0 flex-1 break-words text-text/85">{val || '—'}</dd>
                        <dd className="shrink-0">
                          <button type="button" onClick={() => goTo(at)} className="-my-2 inline-flex min-h-11 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium text-brand transition-colors hover:bg-brand/12 hover:text-text">
                            <PenLine aria-hidden="true" size={13} />Edit<span className="sr-only"> {k.toLowerCase()}</span>
                          </button>
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </section>
            </>
          )}
        </div>
      </div>

      {formError && <p role="alert" className="fm-sum fm-shake mt-6 px-5 py-3 text-sm text-text">{formError}</p>}

      <div className="fx-divider mt-10 flex flex-col-reverse gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
        {step > 0 ? (
          <button type="button" onClick={() => goTo(step - 1)} className={buttonClass({ variant: 'ghost', size: 'lg', className: 'sm:-ml-4' })}>
            <ArrowLeft aria-hidden="true" size={17} />Back
          </button>
        ) : <span className="hidden sm:block" />}
        {last ? (
          <SubmitButton busy={busy} className="w-full sm:w-auto">Send request</SubmitButton>
        ) : (
          <button type="submit" className={buttonClass({ size: 'lg', className: 'w-full sm:w-auto' })}>
            Continue<ArrowRight aria-hidden="true" size={17} className="transition-transform duration-300 group-hover/btn:translate-x-0.5" />
          </button>
        )}
      </div>
      {last && (
        <p className="mt-4 text-xs leading-relaxed text-subtle sm:text-right">
          By sending this you agree to our <Link href="/privacy-policy" className="text-muted underline underline-offset-4 hover:text-text">Privacy Policy</Link>. We reply within one working day.
        </p>
      )}
    </form>
  );
}

