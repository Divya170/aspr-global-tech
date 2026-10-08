'use client';

import { useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import {
  AlertCircle, ArrowRight, AtSign, CircleAlert, CloudUpload, Dribbble, Figma, FileText, FolderOpen, Github, Gitlab, Globe, Link2, Linkedin, MessageSquareText,
  Palette, Paperclip, Phone, Play, Smartphone, UserRound, X, Youtube, type LucideIcon,
} from 'lucide-react';
import { SuccessMark } from '@/components/pages/forms/SuccessMark';
import { Button } from '@/components/ui/Button';
import { track } from '@/lib/analytics';
import { ApiError, submitForm } from '@/lib/client';
import { UPLOAD } from '@/lib/site';
import { emailError, fileError, phoneError } from '@/lib/validate';
import '@/components/pages/forms/forms.css';

const MAX_LINKS = 6;
const LINK_RE = /^(https?:\/\/)?[^\s.]+\.[^\s]{2,}$/i;

type Field = 'name' | 'email' | 'phone' | 'links' | 'message' | 'files';
type Errors = Partial<Record<Field, string>>;

const inputCls = (err?: string) =>
  `fm-control block w-full rounded-xl border bg-white/[0.03] px-4 py-3 text-base text-text placeholder:text-subtle shadow-[inset_0_1px_0_rgb(255_255_255/0.03)] focus:outline-none focus-visible:outline-none min-h-12 ${
    err ? 'border-danger' : 'border-line-strong'
  }`;

const splitLinks = (v: string) => v.split(/\s*\n\s*/).map((l) => l.trim()).filter(Boolean);
const mb = (n: number) => `${(n / 1048576).toFixed(n < 1048576 ? 2 : 1)} MB`;

/** Decorative: recognise common profile sites so each typed link gets a fitting icon (idea from the v1 careers form). */
const SITES: [RegExp, LucideIcon][] = [
  [/github\.com/i, Github], [/gitlab\.com/i, Gitlab], [/linkedin\.com/i, Linkedin], [/behance\.net/i, Palette], [/dribbble\.com/i, Dribbble],
  [/(youtube\.com|youtu\.be)/i, Youtube], [/vimeo\.com/i, Play], [/figma\.com/i, Figma], [/(play\.google\.com|apps\.apple\.com)/i, Smartphone],
];
const siteIcon = (l: string) => SITES.find(([re]) => re.test(l))?.[1];
const shortLink = (l: string) => l.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/$/, '');
const lead = (I: LucideIcon) => <span aria-hidden="true" className="fm-lead"><I size={17} strokeWidth={1.8} /></span>;

/**
 * Application form for one open role. Client checks mirror the API's; the API is authoritative.
 * Fields sit in three groups on an icon rail that lights up with focus; typed work links are
 * echoed as recognised chips (decorative).
 */
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
      <div role="status" className="relative overflow-hidden rounded-2xl border border-success/30 bg-[linear-gradient(150deg,rgb(52_211_153/0.1),rgb(65_112_255/0.05)_60%,transparent)] p-6 sm:p-8">
        <div className="flex flex-col items-start gap-5 sm:flex-row">
          <SuccessMark size="3.5rem" className="shrink-0" />
          <div>
            <h4 className="font-display text-xl font-semibold text-text">Application received</h4>
            <p className="mt-2 leading-relaxed text-muted">{(done.message || '').replace(/^Application received\.\s*/i, '') || 'We look at the work first and reply within one working day.'}</p>
            <p className="mt-5 text-sm text-muted">Your reference number</p>
            <p className="fm-id mt-2 inline-block px-3.5 py-1.5 font-mono text-lg tracking-wide text-text">{done.refNo}</p>
            <p className="mt-4 text-sm text-subtle">Quote this reference if you write to us about your application.</p>
          </div>
        </div>
      </div>
    );
  }

  const errList = (Object.entries(errors) as [Field, string | undefined][]).filter(([, m]) => m);
  const desc = (f: Field, hint?: boolean) => [hint && id(`${f}-hint`), errors[f] && id(`${f}-error`)].filter(Boolean).join(' ') || undefined;
  const typedLinks = splitLinks(v.links).slice(0, MAX_LINKS);
  const atLimit = files.length >= UPLOAD.maxFiles;

  return (
    <form onSubmit={submit} noValidate aria-label={`Apply for ${roleTitle}`} className="space-y-6">
      <div ref={summaryRef} tabIndex={-1} className="focus:outline-none">
        {(general || errList.length > 0) && (
          <div role="alert" className="fm-sum fm-shake flex items-start gap-3.5 p-4 pl-5 text-sm">
            <span aria-hidden="true" className="fm-sum-icon"><AlertCircle size={17} /></span>
            <div className="min-w-0 flex-1 pt-1">
              <p className="font-medium text-text">{general || 'Please check the highlighted fields.'}</p>
              {errList.length > 0 && (
                <ul className="mt-2 space-y-1 text-muted">
                  {errList.map(([f, m]) => (
                    <li key={f}>
                      <a href={`#${id(f)}`} className="fm-sum-link inline-flex items-start gap-2 underline underline-offset-2 hover:text-text">
                        <ArrowRight aria-hidden="true" size={14} className="fm-sum-arrow mt-[0.2rem] shrink-0 text-danger" />{m}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="fm-groups">
        {/* About you */}
        <div className={`fm-group ${errors.name || errors.email || errors.phone ? 'has-error' : ''}`}>
          <span aria-hidden="true" className="fm-group-node"><UserRound size={17} strokeWidth={1.8} /></span>
          <div className="min-w-0 space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <Row label="Full name" htmlFor={id('name')} error={errors.name} errorId={id('name-error')} required>
                {lead(UserRound)}
                <input id={id('name')} name="name" autoComplete="name" value={v.name} onChange={set('name')} onBlur={blur('name')}
                  aria-invalid={!!errors.name} aria-describedby={desc('name')} aria-required className={`${inputCls(errors.name)} pl-11`} />
              </Row>
              <Row label="Email" htmlFor={id('email')} error={errors.email} errorId={id('email-error')} required>
                {lead(AtSign)}
                <input id={id('email')} name="email" type="email" autoComplete="email" inputMode="email" value={v.email} onChange={set('email')} onBlur={blur('email')}
                  aria-invalid={!!errors.email} aria-describedby={desc('email')} aria-required className={`${inputCls(errors.email)} pl-11`} />
              </Row>
            </div>

            <Row label="Phone" htmlFor={id('phone')} error={errors.phone} errorId={id('phone-error')} required hint="Include your country code, e.g. +91." hintId={id('phone-hint')} wrapClass="sm:max-w-sm">
              {lead(Phone)}
              <input id={id('phone')} name="phone" type="tel" autoComplete="tel" inputMode="tel" value={v.phone} onChange={set('phone')} onBlur={blur('phone')}
                aria-invalid={!!errors.phone} aria-describedby={desc('phone', true)} aria-required className={`${inputCls(errors.phone)} pl-11`} />
            </Row>
          </div>
        </div>

        {/* Your work */}
        <div className={`fm-group ${errors.links || errors.files ? 'has-error' : ''}`}>
          <span aria-hidden="true" className="fm-group-node"><FolderOpen size={17} strokeWidth={1.8} /></span>
          <div className="min-w-0 space-y-6">
            <Row label="Links to your work" htmlFor={id('links')} error={errors.links} errorId={id('links-error')}
              hint={`Portfolio, GitHub, LinkedIn, Behance, a live site or a reel. One per line, up to ${MAX_LINKS}. Add links, files or both.`} hintId={id('links-hint')}
              after={typedLinks.length > 0 && (
                <ul aria-hidden="true" className="mt-3 flex flex-wrap gap-2">
                  {typedLinks.map((l, i) => {
                    const I = siteIcon(l);
                    const Shown = I || (LINK_RE.test(l) ? Globe : Link2);
                    return <li key={`${i}-${l}`} className={`fm-lchip ${I ? 'is-known' : ''}`}><b><Shown size={12} strokeWidth={2} /></b><span className="min-w-0 max-w-[15rem] truncate font-mono">{shortLink(l)}</span></li>;
                  })}
                </ul>
              )}>
              <textarea id={id('links')} name="links" rows={3} value={v.links} onChange={set('links')} onBlur={blur('links')} spellCheck={false} autoCapitalize="none"
                placeholder={'https://yourportfolio.com\nhttps://github.com/you'}
                aria-invalid={!!errors.links} aria-describedby={desc('links', true)} className={`${inputCls(errors.links)} resize-y font-mono text-sm`} />
            </Row>

            <div>
              <span id={id('files-label')} className="mb-2 block text-sm font-medium text-text">Attachments <span className="font-normal text-subtle">(optional)</span></span>
              <input ref={fileInput} id={id('files')} type="file" multiple accept={UPLOAD.accept} className="sr-only"
                aria-labelledby={id('files-label')} aria-describedby={[id('files-hint'), errors.files && id('files-error')].filter(Boolean).join(' ')}
                onChange={(e) => addFiles(e.target.files)} disabled={files.length >= UPLOAD.maxFiles} />
              <label htmlFor={id('files')}
                className={`group flex min-h-12 items-center justify-center gap-3 rounded-2xl border border-dashed px-4 py-4 text-sm transition-colors ${
                  atLimit ? 'cursor-not-allowed border-line text-subtle' : `fm-drop ${errors.files ? 'border-danger text-text' : 'border-line-strong text-muted hover:border-brand-soft/50 hover:text-text'}`
                } [input:focus-visible+&]:ring-2 [input:focus-visible+&]:ring-brand-soft/60`}>
                <span aria-hidden="true" className="fm-drop-icon grid size-10 shrink-0 place-items-center rounded-xl border border-line-strong bg-white/[0.04] text-brand-soft">
                  {atLimit ? <Paperclip size={16} /> : <CloudUpload size={18} strokeWidth={1.8} />}
                </span>
                {files.length >= UPLOAD.maxFiles ? 'File limit reached' : 'Choose files'}
              </label>
              <p id={id('files-hint')} className="mt-2 text-xs text-subtle">Up to {UPLOAD.maxFiles} files, {UPLOAD.maxBytes / 1048576} MB each. PDF, Office documents, images or ZIP.</p>
              {errors.files && <p id={id('files-error')} className="fm-err mt-2 flex items-start gap-1.5 text-sm text-danger"><CircleAlert aria-hidden="true" size={15} className="mt-[0.2rem] shrink-0" />{errors.files}</p>}
              {files.length > 0 && (
                <ul className="mt-3 space-y-2" aria-label="Attached files">
                  {files.map((f, i) => (
                    <li key={`${f.name}-${f.size}`} className="fm-file fm-err flex items-center gap-3 rounded-xl border border-line bg-white/[0.02] py-1 pl-1.5 pr-1 text-sm">
                      <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand/12 text-brand-soft"><FileText size={15} /></span>
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
          </div>
        </div>

        {/* Anything else */}
        <div className={`fm-group ${errors.message ? 'has-error' : ''}`}>
          <span aria-hidden="true" className="fm-group-node"><MessageSquareText size={17} strokeWidth={1.8} /></span>
          <div className="min-w-0">
            <Row label="Message" optional htmlFor={id('message')} error={errors.message} errorId={id('message-error')}>
              <textarea id={id('message')} name="message" rows={4} value={v.message} onChange={set('message')}
                aria-invalid={!!errors.message} aria-describedby={desc('message')} className={`${inputCls(errors.message)} resize-y`} />
            </Row>
          </div>
        </div>
      </div>

      <div className="fx-divider flex flex-col gap-4 pt-7 sm:flex-row sm:items-center sm:justify-between">
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

/** Label + control (with focus glow line) + optional decorative extra + hint + error. */
function Row({ label, htmlFor, error, errorId, hint, hintId, required, optional, wrapClass = '', after, children }: {
  label: string; htmlFor: string; error?: string; errorId: string; hint?: string; hintId?: string; required?: boolean; optional?: boolean;
  wrapClass?: string; after?: ReactNode; children: ReactNode;
}) {
  return (
    <div className="fm-field">
      <label htmlFor={htmlFor} className="fm-label mb-2 block text-sm font-medium text-text">
        {label}{required && <span aria-hidden="true" className="text-brand-soft"> *</span>}
        {optional && <span className="font-normal text-subtle"> (optional)</span>}
      </label>
      <div className={`fm-wrap ${wrapClass}`}>
        {children}
        <span aria-hidden="true" className="fm-line" />
      </div>
      {after}
      {hint && <p id={hintId} className="mt-2 text-xs text-subtle">{hint}</p>}
      {error && <p id={errorId} className="fm-err mt-2 flex items-start gap-1.5 text-sm text-danger"><CircleAlert aria-hidden="true" size={15} className="mt-[0.2rem] shrink-0" />{error}</p>}
    </div>
  );
}
