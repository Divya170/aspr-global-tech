'use client';

import { ArrowLeft, ArrowRight, Box, Check, Code2, Globe, LayoutDashboard, Palette, PenTool, Smartphone, Sparkles, Workflow, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';
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
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between gap-4">
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-brand-soft">Step {step + 1} of {STEPS.length}</p>
          <p className="text-xs text-subtle">{s.short}</p>
        </div>
        <div aria-hidden="true" className="mt-3 h-1 overflow-hidden rounded-full bg-white/[0.06]">
          <div className="h-full rounded-full bg-gradient-to-r from-brand to-accent transition-[width] duration-500 ease-[var(--ease-out-expo)]" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>
        <ol aria-label="Quote steps" className="mt-4 grid grid-cols-4 gap-2">
          {STEPS.map((x, i) => {
            const done = i < step, current = i === step;
            const inner = (
              <>
                <span aria-hidden="true" className={`grid size-6 shrink-0 place-items-center rounded-full border font-mono text-[0.7rem] ${current ? 'border-brand-soft bg-brand text-white' : done ? 'border-brand-soft/50 text-brand-soft' : 'border-line-strong text-subtle'}`}>
                  {done ? <Check size={12} strokeWidth={3} /> : i + 1}
                </span>
                <span className={`hidden truncate text-xs sm:block ${current ? 'text-text' : 'text-subtle'}`}>{x.short}</span>
                <span className="sr-only">{`Step ${i + 1}: ${x.short}${done ? ' (done)' : current ? ' (current)' : ''}`}</span>
              </>
            );
            return (
              <li key={x.short} aria-current={current ? 'step' : undefined}>
                {done ? (
                  <button type="button" onClick={() => goTo(i)} className="flex min-h-11 w-full items-center gap-2 rounded-lg text-left transition-opacity hover:opacity-80">{inner}</button>
                ) : (
                  <span className="flex min-h-11 items-center gap-2">{inner}</span>
                )}
              </li>
            );
          })}
        </ol>
      </div>

      <div key={step} className="motion-safe:animate-[page-in_0.45s_var(--ease-out-expo)_both]">
        <h2 id="quote-step-title" ref={heading} tabIndex={-1} className="font-display text-2xl font-semibold tracking-tight text-text focus:outline-none sm:text-[1.75rem]">
          {s.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted sm:text-[0.95rem]">{s.lead}</p>

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
                <TextInput id={domId('name')} label="Your name" value={v.name} onChange={set('name')} error={errors.name} autoComplete="name" />
                <TextInput id={domId('email')} label="Email" type="email" inputMode="email" value={v.email} onChange={set('email')} error={errors.email} autoComplete="email" placeholder="you@company.com" />
                <TextInput id={domId('phone')} label="Phone or WhatsApp" type="tel" inputMode="tel" value={v.phone} onChange={set('phone')} error={errors.phone} autoComplete="tel" optional placeholder="+1 555 010 2030" hint="Include your country code." />
                <TextInput id={domId('company')} label="Company" value={v.company} onChange={set('company')} error={errors.company} autoComplete="organization" optional />
              </div>
              <Select id={domId('heardFrom')} label="How did you hear about us?" options={options.heardFrom} value={v.heardFrom} onChange={set('heardFrom')} error={errors.heardFrom} optional placeholder="Choose one" />
              <Honeypot value={website} onChange={setWebsite} />

              <section aria-labelledby="quote-review-title" className="rounded-xl border border-line bg-white/[0.02] p-5">
                <h3 id="quote-review-title" className="font-sans text-sm font-semibold tracking-normal text-text">Your request</h3>
                <dl className="mt-3 divide-y divide-line text-sm">
                  {([
                    ['Project', v.projectType, 0], ['Budget', v.budget, 1], ['Timeline', v.timeline, 1],
                    ['Details', v.message.trim() ? `${v.message.trim().slice(0, 140)}${v.message.trim().length > 140 ? '…' : ''}` : '', 2],
                    ['Files', files.length ? files.map((f) => `${f.name} (${formatBytes(f.size)})`).join(', ') : 'None', 2],
                  ] as [string, string, number][]).map(([k, val, at]) => (
                    <div key={k} className="flex items-start gap-3 py-2.5">
                      <dt className="w-20 shrink-0 text-subtle">{k}</dt>
                      <dd className="min-w-0 flex-1 break-words text-muted">{val || '—'}</dd>
                      <dd className="shrink-0">
                        <button type="button" onClick={() => goTo(at)} className="-my-2 inline-flex min-h-11 items-center rounded-md px-2 text-xs font-medium text-brand-soft hover:text-text">
                          Edit<span className="sr-only"> {k.toLowerCase()}</span>
                        </button>
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            </>
          )}
        </div>
      </div>

      {formError && <p role="alert" className="mt-6 rounded-xl border border-danger/50 bg-danger/[0.07] px-4 py-3 text-sm text-text">{formError}</p>}

      <div className="mt-9 flex flex-col-reverse gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
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

