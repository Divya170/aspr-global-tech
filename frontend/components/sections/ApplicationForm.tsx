'use client';

import { useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Paperclip, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { track } from '@/lib/analytics';
import { ApiError, submitForm } from '@/lib/client';
import { UPLOAD } from '@/lib/site';
import { emailError, fileError, phoneError } from '@/lib/validate';

const MAX_LINKS = 6;
const LINK_RE = /^(https?:\/\/)?[^\s.]+\.[^\s]{2,}$/i;

type Field = 'name' | 'email' | 'phone' | 'links' | 'message' | 'files';
type Errors = Partial<Record<Field, string>>;

const inputCls = (err?: string) =>
  `block w-full rounded-xl border bg-white/[0.03] px-4 py-3 text-base text-text placeholder:text-subtle transition-colors focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-brand-soft/60 min-h-12 ${
    err ? 'border-danger' : 'border-line-strong hover:border-brand-soft/40 focus:border-brand-soft'
  }`;

const splitLinks = (v: string) => v.split(/\s*\n\s*/).map((l) => l.trim()).filter(Boolean);
const mb = (n: number) => `${(n / 1048576).toFixed(n < 1048576 ? 2 : 1)} MB`;

/** Application form for one open role. Client checks mirror the API's; the API is authoritative. */
export function ApplicationForm({ roleId, roleTitle }: { roleId: number; roleTitle: string }) {
  const uid = useId();
  const id = (f: string) => `${uid}-${f}`;
  const [v, setV] = useState({ name: '', email: '', phone: '', links: '', message: '' });
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Errors>({});
  const [general, setGeneral] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<{ refNo: string; message?: string } | null>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const validate = (vals = v, fs = files): Errors => {
    const e: Errors = {};
    if (!vals.name.trim()) e.name = 'Enter your name.';
    const em = emailError(vals.email); if (em) e.email = em;
    const ph = phoneError(vals.phone, true); if (ph) e.phone = ph;
    const links = splitLinks(vals.links);
    if (!links.length && !fs.length) e.links = 'Send work, not a template CV: add a portfolio link or attach files.';
    else if (links.length > MAX_LINKS) e.links = `Add up to ${MAX_LINKS} links.`;
    else if (links.some((l) => !LINK_RE.test(l))) e.links = "One of the links doesn't look right. Paste the full URL.";
    if (fs.length > UPLOAD.maxFiles) e.files = `Attach up to ${UPLOAD.maxFiles} files.`;
    else { const fe = fs.map((f) => fileError(f, UPLOAD.ext, UPLOAD.maxBytes)).find(Boolean); if (fe) e.files = fe; }
    return e;
  };

  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const next = { ...v, [k]: e.target.value };
    setV(next);
    // Clear an error as soon as the field becomes valid; don't add new ones while typing.
    if (errors[k as Field] && !validate(next)[k as Field]) setErrors((x) => ({ ...x, [k]: undefined }));
  };
  // Validate a field when the visitor leaves it, but only once they have typed something.
  const blur = (k: keyof typeof v) => () => {
    if (v[k].trim() || errors[k]) setErrors((x) => ({ ...x, [k]: validate()[k] }));
  };

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const next = [...files, ...Array.from(list)].filter((f, i, a) => a.findIndex((g) => g.name === f.name && g.size === f.size) === i);
    setFiles(next);
    const e = validate(v, next);
    setErrors((x) => ({ ...x, files: e.files, links: x.links ? e.links : undefined }));
    if (fileInput.current) fileInput.current.value = '';
  };
  const removeFile = (i: number) => {
    const next = files.filter((_, j) => j !== i);
    setFiles(next);
    setErrors((x) => ({ ...x, files: validate(v, next).files }));
  };

  const focusSummary = () => requestAnimationFrame(() => summaryRef.current?.focus());

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (sending) return;
    setGeneral('');
    const errs = validate();
    setErrors(errs);
    if (Object.values(errs).some(Boolean)) { focusSummary(); return; }
    setSending(true);
    try {
      const res = await submitForm<{ refNo: string; message?: string }>(`/api/roles/${roleId}/applications`, {
        name: v.name.trim(), email: v.email.trim(), phone: v.phone.trim(), links: splitLinks(v.links), message: v.message.trim(),
      }, files);
      track('Application Submitted');
      setDone({ refNo: res.refNo, message: res.message });
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) {
        const fe = err.fieldErrors;
        setErrors({ name: fe.name, email: fe.email, phone: fe.phone, links: fe.portfolio || fe.links, message: fe.message, files: fe.files });
        setGeneral(Object.keys(fe).length ? 'Please check the highlighted fields.' : err.message);
      } else {
        setGeneral(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      }
      focusSummary();
    } finally {
      setSending(false);
    }
  };

  if (done) {
    return (
      <div role="status" className="rounded-2xl border border-success/30 bg-success/[0.06] p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <CheckCircle2 aria-hidden="true" size={24} className="mt-0.5 shrink-0 text-success" />
          <div>
            <h4 className="font-display text-xl font-semibold text-text">Application received</h4>
            <p className="mt-2 leading-relaxed text-muted">{(done.message || '').replace(/^Application received\.\s*/i, '') || 'We look at the work first and reply within one working day.'}</p>
            <p className="mt-5 text-sm text-muted">Your reference number</p>
            <p className="mt-1 font-mono text-lg tracking-wide text-text">{done.refNo}</p>
            <p className="mt-4 text-sm text-subtle">Quote this reference if you write to us about your application.</p>
          </div>
        </div>
      </div>
    );
  }

  const errList = (Object.entries(errors) as [Field, string | undefined][]).filter(([, m]) => m);
  const desc = (f: Field, hint?: boolean) => [hint && id(`${f}-hint`), errors[f] && id(`${f}-error`)].filter(Boolean).join(' ') || undefined;

  return (
    <form onSubmit={submit} noValidate aria-label={`Apply for ${roleTitle}`} className="space-y-6">
      <div ref={summaryRef} tabIndex={-1} className="focus:outline-none">
        {(general || errList.length > 0) && (
          <div role="alert" className="rounded-xl border border-danger/40 bg-danger/[0.07] p-4 text-sm">
            <p className="flex items-center gap-2 font-medium text-text"><AlertCircle aria-hidden="true" size={17} className="text-danger" />{general || 'Please check the highlighted fields.'}</p>
            {errList.length > 0 && (
              <ul className="mt-2 list-disc space-y-1 pl-10 text-muted">
                {errList.map(([f, m]) => <li key={f}><a href={`#${id(f)}`} className="underline underline-offset-2 hover:text-text">{m}</a></li>)}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Row label="Full name" htmlFor={id('name')} error={errors.name} errorId={id('name-error')} required>
          <input id={id('name')} name="name" autoComplete="name" value={v.name} onChange={set('name')} onBlur={blur('name')}
            aria-invalid={!!errors.name} aria-describedby={desc('name')} aria-required className={inputCls(errors.name)} />
        </Row>
        <Row label="Email" htmlFor={id('email')} error={errors.email} errorId={id('email-error')} required>
          <input id={id('email')} name="email" type="email" autoComplete="email" inputMode="email" value={v.email} onChange={set('email')} onBlur={blur('email')}
            aria-invalid={!!errors.email} aria-describedby={desc('email')} aria-required className={inputCls(errors.email)} />
        </Row>
      </div>

      <Row label="Phone" htmlFor={id('phone')} error={errors.phone} errorId={id('phone-error')} required hint="Include your country code, e.g. +91." hintId={id('phone-hint')}>
        <input id={id('phone')} name="phone" type="tel" autoComplete="tel" inputMode="tel" value={v.phone} onChange={set('phone')} onBlur={blur('phone')}
          aria-invalid={!!errors.phone} aria-describedby={desc('phone', true)} aria-required className={`${inputCls(errors.phone)} sm:max-w-sm`} />
      </Row>

      <Row label="Links to your work" htmlFor={id('links')} error={errors.links} errorId={id('links-error')}
        hint={`Portfolio, GitHub, LinkedIn, Behance, a live site or a reel. One per line, up to ${MAX_LINKS}. Add links, files or both.`} hintId={id('links-hint')}>
        <textarea id={id('links')} name="links" rows={3} value={v.links} onChange={set('links')} onBlur={blur('links')} spellCheck={false} autoCapitalize="none"
          placeholder={'https://yourportfolio.com\nhttps://github.com/you'}
          aria-invalid={!!errors.links} aria-describedby={desc('links', true)} className={`${inputCls(errors.links)} resize-y font-mono text-sm`} />
      </Row>

      <Row label="Message" optional htmlFor={id('message')} error={errors.message} errorId={id('message-error')}>
        <textarea id={id('message')} name="message" rows={4} value={v.message} onChange={set('message')}
          aria-invalid={!!errors.message} aria-describedby={desc('message')} className={`${inputCls(errors.message)} resize-y`} />
      </Row>

      <div>
        <span id={id('files-label')} className="mb-2 block text-sm font-medium text-text">Attachments <span className="font-normal text-subtle">(optional)</span></span>
        <input ref={fileInput} id={id('files')} type="file" multiple accept={UPLOAD.accept} className="sr-only"
          aria-labelledby={id('files-label')} aria-describedby={[id('files-hint'), errors.files && id('files-error')].filter(Boolean).join(' ')}
          onChange={(e) => addFiles(e.target.files)} disabled={files.length >= UPLOAD.maxFiles} />
        <label htmlFor={id('files')}
          className={`flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-3 text-sm transition-colors ${
            files.length >= UPLOAD.maxFiles ? 'cursor-not-allowed border-line text-subtle' : errors.files ? 'border-danger text-text' : 'border-line-strong text-muted hover:border-brand-soft/50 hover:text-text'
          } [input:focus-visible+&]:ring-2 [input:focus-visible+&]:ring-brand-soft/60`}>
          <Paperclip aria-hidden="true" size={16} />{files.length >= UPLOAD.maxFiles ? 'File limit reached' : 'Choose files'}
        </label>
        <p id={id('files-hint')} className="mt-2 text-xs text-subtle">Up to {UPLOAD.maxFiles} files, {UPLOAD.maxBytes / 1048576} MB each. PDF, Office documents, images or ZIP.</p>
        {errors.files && <p id={id('files-error')} className="mt-2 text-sm text-danger">{errors.files}</p>}
        {files.length > 0 && (
          <ul className="mt-3 space-y-2" aria-label="Attached files">
            {files.map((f, i) => (
              <li key={`${f.name}-${f.size}`} className="flex items-center gap-3 rounded-lg border border-line bg-white/[0.02] py-1 pl-3 pr-1 text-sm">
                <Paperclip aria-hidden="true" size={14} className="shrink-0 text-subtle" />
                <span className="min-w-0 flex-1 truncate text-text">{f.name}</span>
                <span className="shrink-0 font-mono text-xs text-subtle">{mb(f.size)}</span>
                <button type="button" onClick={() => removeFile(i)} className="grid size-10 shrink-0 place-items-center rounded-md text-muted hover:bg-white/[0.05] hover:text-text" aria-label={`Remove ${f.name}`}>
                  <X aria-hidden="true" size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-4 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-relaxed text-subtle">
          We use these details only to consider your application. See our <a href="/privacy-policy" className="underline underline-offset-2 hover:text-text">privacy policy</a>.
        </p>
        <Button type="submit" size="lg" arrow={!sending} disabled={sending} aria-disabled={sending} className="shrink-0">
          {sending ? 'Sending…' : 'Send application'}
        </Button>
      </div>
    </form>
  );
}

function Row({ label, htmlFor, error, errorId, hint, hintId, required, optional, children }: {
  label: string; htmlFor: string; error?: string; errorId: string; hint?: string; hintId?: string; required?: boolean; optional?: boolean; children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-2 block text-sm font-medium text-text">
        {label}{required && <span aria-hidden="true" className="text-brand-soft"> *</span>}
        {optional && <span className="font-normal text-subtle"> (optional)</span>}
      </label>
      {children}
      {hint && <p id={hintId} className="mt-2 text-xs text-subtle">{hint}</p>}
      {error && <p id={errorId} className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
