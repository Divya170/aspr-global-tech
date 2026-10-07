'use client';

import { CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { track } from '@/lib/analytics';
import { ApiError, submitForm } from '@/lib/client';
import { emailError, MIN_MESSAGE, phoneError } from '@/lib/validate';
import { CopyButton } from './CopyButton';
import { ErrorSummary, type FormError } from './ErrorSummary';
import { FileDrop } from './FileDrop';
import { Honeypot } from './Honeypot';
import { Select } from './Select';
import { SubmitButton } from './SubmitButton';
import { TextArea } from './TextArea';
import { TextInput } from './TextInput';

export interface ContactOptions { projectTypes: string[]; budgets: string[]; timelines: string[]; heardFrom: string[] }

type Key = 'name' | 'email' | 'phone' | 'company' | 'projectType' | 'budget' | 'message' | 'timeline' | 'files' | 'heardFrom';
type Values = Record<Exclude<Key, 'files'>, string>;
type Errors = Partial<Record<Key, string>>;

/** Order of fields on the page, so the error summary reads top to bottom. */
const ORDER: Key[] = ['name', 'email', 'phone', 'company', 'projectType', 'budget', 'message', 'timeline', 'files', 'heardFrom'];
const domId = (k: Key) => `contact-${k}`;
const EMPTY: Values = { name: '', email: '', phone: '', company: '', projectType: '', budget: '', message: '', timeline: '', heardFrom: '' };

export function ContactForm({ options }: { options: ContactOptions }) {
  const [v, setV] = useState<Values>(EMPTY);
  const [files, setFiles] = useState<File[]>([]);
  const [website, setWebsite] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [summaryKey, setSummaryKey] = useState(0);
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [refNo, setRefNo] = useState<string | null>(null);
  const done = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!refNo || !done.current) return;
    done.current.focus({ preventScroll: true });
    done.current.closest('section')?.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }, [refNo]);

  const set = (k: keyof Values) => (val: string) => {
    setV((x) => ({ ...x, [k]: val }));
    if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }));
  };

  function validate(): Errors {
    const e: Errors = {};
    if (!v.name.trim()) e.name = 'Enter your name so we know who to reply to.';
    const em = emailError(v.email); if (em) e.email = em;
    const ph = phoneError(v.phone); if (ph) e.phone = ph;
    if (!options.projectTypes.includes(v.projectType)) e.projectType = 'Choose the service you need.';
    if (v.message.trim().length < MIN_MESSAGE) e.message = `Tell us a little more: at least ${MIN_MESSAGE} characters.`;
    return e;
  }

  function fail(e: Errors) {
    setErrors(e);
    setSummaryKey((n) => n + 1);
  }

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    if (busy) return;
    const e = validate();
    if (Object.keys(e).length) return fail(e);
    setBusy(true); setFormError(''); setErrors({});
    try {
      const res = await submitForm<{ refNo: string }>('/api/contact', {
        projectType: v.projectType, budget: v.budget, timeline: v.timeline, message: v.message.trim(), name: v.name.trim(), email: v.email.trim(),
        phone: v.phone.trim(), company: v.company.trim(), heardFrom: v.heardFrom, website,
      }, files);
      track('Contact Submitted');
      setRefNo(res.refNo);
    } catch (err) {
      const fe = err instanceof ApiError ? err.fieldErrors : null;
      if (fe && Object.keys(fe).length) {
        const known = Object.fromEntries(Object.entries(fe).filter(([k]) => ORDER.includes(k as Key))) as Errors;
        const rest = Object.entries(fe).filter(([k]) => !ORDER.includes(k as Key)).map(([, m]) => m);
        if (rest.length) setFormError(rest.join(' '));
        if (Object.keys(known).length) fail(known);
      } else {
        setFormError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  }

  if (refNo) {
    return (
      <section aria-labelledby="contact-done-title" className="py-4 text-center sm:py-10">
        <span aria-hidden="true" className="mx-auto grid size-14 place-items-center rounded-2xl border border-success/30 bg-success/10 text-success">
          <CheckCircle2 size={28} strokeWidth={1.7} />
        </span>
        <h2 id="contact-done-title" ref={done} tabIndex={-1} className="mt-6 font-display text-2xl font-semibold tracking-tight text-text focus:outline-none sm:text-3xl">
          Thanks, {v.name.trim().split(/\s+/)[0]}. Message received.
        </h2>
        <p className="mx-auto mt-3 max-w-md text-muted">We reply to every inquiry within one working day. A confirmation is on its way to {v.email.trim()}.</p>
        <div className="mx-auto mt-8 inline-flex flex-col items-center gap-4 rounded-2xl border border-line-strong bg-white/[0.03] px-6 py-5 sm:flex-row sm:gap-6">
          <div className="text-center sm:text-left">
            <p className="eyebrow">Inquiry ID</p>
            <p className="mt-1.5 break-all font-mono text-xl font-semibold text-text">#{refNo}</p>
          </div>
          <CopyButton value={refNo} />
        </div>
        <p className="mt-8 text-sm text-subtle">
          Meanwhile, <Link href="/portfolio" className="text-brand-soft underline-offset-4 hover:underline">browse our work</Link> or read <Link href="/process" className="text-brand-soft underline-offset-4 hover:underline">how we work</Link>.
        </p>
      </section>
    );
  }

  const summary: FormError[] = ORDER.filter((k) => errors[k]).map((k) => ({ id: domId(k), message: errors[k]! }));

  return (
    <form onSubmit={onSubmit} noValidate aria-label="Contact form" className="relative space-y-7">
      {summary.length > 0 && <ErrorSummary errors={summary} focusKey={summaryKey} />}

      <div className="grid gap-6 sm:grid-cols-2">
        <TextInput id={domId('name')} label="Your name" value={v.name} onChange={set('name')} error={errors.name} autoComplete="name" />
        <TextInput id={domId('email')} label="Email" type="email" inputMode="email" value={v.email} onChange={set('email')} error={errors.email} autoComplete="email" placeholder="you@company.com" />
        <TextInput id={domId('phone')} label="Phone or WhatsApp" type="tel" inputMode="tel" value={v.phone} onChange={set('phone')} error={errors.phone} autoComplete="tel" optional placeholder="+1 555 010 2030" />
        <TextInput id={domId('company')} label="Company" value={v.company} onChange={set('company')} error={errors.company} autoComplete="organization" optional />
        <Select id={domId('projectType')} label="Service required" options={options.projectTypes} value={v.projectType} onChange={set('projectType')} error={errors.projectType} placeholder="Choose a service" />
        <Select id={domId('budget')} label="Budget range" options={options.budgets} value={v.budget} onChange={set('budget')} error={errors.budget} optional placeholder="Choose a range" />
      </div>

      <TextArea
        id={domId('message')} label="Project description" value={v.message} onChange={set('message')} error={errors.message} min={MIN_MESSAGE} rows={6}
        placeholder="What are you building, who is it for, and what would make it a success?"
      />

      <div className="grid gap-6 sm:grid-cols-2">
        <Select id={domId('timeline')} label="Desired timeline" options={options.timelines} value={v.timeline} onChange={set('timeline')} error={errors.timeline} optional placeholder="Choose a timeline" />
        <Select id={domId('heardFrom')} label="How did you hear about us?" options={options.heardFrom} value={v.heardFrom} onChange={set('heardFrom')} error={errors.heardFrom} optional placeholder="Choose one" />
      </div>

      <FileDrop id={domId('files')} files={files} onChange={(f) => { setFiles(f); if (errors.files) setErrors((x) => ({ ...x, files: undefined })); }} error={errors.files} />
      <Honeypot value={website} onChange={setWebsite} />

      {formError && <p role="alert" className="rounded-xl border border-danger/50 bg-danger/[0.07] px-4 py-3 text-sm text-text">{formError}</p>}

      <div className="flex flex-col gap-4 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="order-2 text-xs leading-relaxed text-subtle sm:order-1 sm:max-w-xs">
          By sending this you agree to our <Link href="/privacy-policy" className="text-muted underline underline-offset-4 hover:text-text">Privacy Policy</Link>. We reply within one working day.
        </p>
        <div className="order-1 sm:order-2"><SubmitButton busy={busy} className="w-full sm:w-auto">Send message</SubmitButton></div>
      </div>
    </form>
  );
}
