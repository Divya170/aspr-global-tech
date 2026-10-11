'use client';

import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { adminApi, ApiError, errorMessage } from '@/lib/admin/api';
import { formatDateTime, humanize } from '@/lib/admin/format';
import { useResource, useUnsavedChanges, useUrlState } from '@/lib/admin/hooks';
import type { EmailStatus } from '@/lib/admin/types';
import { AButton } from '../ui/Button';
import { inputClass, Select, TextArea, TextField } from '../ui/Field';
import { Card, CardHeader, PageHeader } from '../ui/Layout';
import { EmptyState, ErrorState, SkeletonRows } from '../ui/States';
import { StatusPill } from '../ui/StatusPill';
import { TabPanel, Tabs } from '../ui/Tabs';
import { useToast } from '../ui/Toast';

type Settings = Record<string, unknown>;
const LIST_KEYS: { key: string; label: string; help: string }[] = [
  { key: 'projectTypes', label: 'Project types', help: 'The “What do you need?” options on the quote and contact forms.' },
  { key: 'budgets', label: 'Budget ranges', help: 'Shown on the quote form.' },
  { key: 'timelines', label: 'Timelines', help: 'Shown on the quote form.' },
  { key: 'heardFrom', label: '“How did you hear about us?”', help: 'Optional question on the forms.' },
];
const FRIENDLY = new Set(['company', 'hero', 'stats', ...LIST_KEYS.map((l) => l.key)]);
const TABS = [
  { id: 'company', label: 'Company' },
  { id: 'hero', label: 'Home hero' },
  { id: 'stats', label: 'Stats' },
  { id: 'forms', label: 'Form options' },
  { id: 'advanced', label: 'Other settings' },
  { id: 'email', label: 'Email delivery' },
];

/** Saves one setting key; returns true on success. */
function useSaveSetting(onSaved: (key: string, value: unknown) => void) {
  const toast = useToast();
  const [saving, setSaving] = useState<string | null>(null);
  const save = async (key: string, value: unknown, label: string) => {
    setSaving(key);
    try {
      await adminApi.put(`/settings/${encodeURIComponent(key)}`, { value });
      onSaved(key, value);
      toast.success(`${label} saved. The website updates within a few seconds.`);
      return true;
    } catch (e) {
      toast.error(e instanceof ApiError && e.fieldErrors ? Object.values(e.fieldErrors)[0] : errorMessage(e));
      return false;
    } finally { setSaving(null); }
  };
  return { save, saving };
}

function SaveBar({ dirty, busy, onReset }: { dirty: boolean; busy: boolean; onReset: () => void }) {
  return (
    <div className="flex items-center justify-end gap-2 border-t border-line px-4 py-3">
      {dirty && <span className="mr-auto text-xs text-warning">Unsaved changes</span>}
      <AButton onClick={onReset} disabled={!dirty || busy} variant="ghost" size="sm">Discard</AButton>
      <AButton type="submit" variant="primary" size="sm" loading={busy} disabled={!dirty}>Save</AButton>
    </div>
  );
}

function Note({ tone = 'info', children }: { tone?: 'info' | 'warning'; children: ReactNode }) {
  const I = tone === 'info' ? Info : AlertTriangle;
  return (
    <p className={`flex gap-2 rounded-lg border px-3 py-2 text-xs leading-relaxed text-text ${tone === 'info' ? 'border-brand/25 bg-brand/[0.06]' : 'border-warning/30 bg-warning/[0.07]'}`}>
      <I size={14} aria-hidden="true" className={`mt-px shrink-0 ${tone === 'info' ? 'text-brand' : 'text-warning'}`} />{children}
    </p>
  );
}

/** Editor for a flat object of strings (company) or numbers (stats). */
function ObjectForm({ settingKey, label, value, numeric, intro, onSave, busy, onDirty }: {
  settingKey: string; label: string; value: Record<string, unknown>; numeric?: boolean; intro?: ReactNode; busy: boolean;
  onSave: (v: Record<string, unknown>) => Promise<boolean>; onDirty: (key: string, d: boolean) => void;
}) {
  const initial = useMemo(() => Object.fromEntries(Object.entries(value || {}).map(([k, v]) => [k, v === null || v === undefined ? '' : String(v)])), [value]);
  const [form, setForm] = useState<Record<string, string>>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  useEffect(() => setForm(initial), [initial]);
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  useEffect(() => onDirty(settingKey, dirty), [dirty, settingKey, onDirty]);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const out: Record<string, unknown> = {};
    const errs: Record<string, string> = {};
    for (const [k, v] of Object.entries(form)) {
      if (numeric) {
        const n = Number(v);
        if (v.trim() === '' || !Number.isFinite(n) || n < 0) errs[k] = 'Enter a number (0 or more).'; else out[k] = n;
      } else out[k] = v.trim();
    }
    setErrors(errs);
    if (Object.keys(errs).length) return;
    await onSave(out);
  };
  const long = (k: string) => /address|hours|description/i.test(k);
  return (
    <form onSubmit={submit} noValidate>
      <div className="space-y-4 p-4">
        {intro}
        <div className="grid gap-4 sm:grid-cols-2">
          {Object.keys(form).map((k) => long(k) ? (
            <TextArea key={k} className="sm:col-span-2" label={humanize(k.replace(/([A-Z])/g, ' $1').toLowerCase())} rows={2} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} error={errors[k]} />
          ) : (
            <TextField key={k} label={humanize(k.replace(/([A-Z])/g, ' $1').toLowerCase())} type={numeric ? 'number' : 'text'} inputMode={numeric ? 'numeric' : undefined} min={numeric ? 0 : undefined}
              value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} error={errors[k]} spellCheck={/url|href|email|website/i.test(k) ? false : undefined} />
          ))}
        </div>
      </div>
      <SaveBar dirty={dirty} busy={busy} onReset={() => { setForm(initial); setErrors({}); }} />
      <span className="sr-only">{label}</span>
    </form>
  );
}

/** Renders "*phrase*" as highlighted, like the website hero. */
function HeroPreview({ headline }: { headline: string }) {
  const parts = headline.split(/(\*[^*]+\*)/g);
  return (
    <p className="font-display text-xl font-semibold leading-snug text-text">
      {parts.map((p, i) => p.startsWith('*') && p.endsWith('*') && p.length > 2 ? <span key={i} className="text-gradient">{p.slice(1, -1)}</span> : <span key={i}>{p}</span>)}
    </p>
  );
}

function HeroForm({ value, onSave, busy, onDirty }: { value: Record<string, unknown>; onSave: (v: Record<string, unknown>) => Promise<boolean>; busy: boolean; onDirty: (key: string, d: boolean) => void }) {
  const initial = useMemo(() => ({ eyebrow: '', headline: '', sub: '', ...Object.fromEntries(Object.entries(value || {}).map(([k, v]) => [k, String(v ?? '')])) }), [value]);
  const [form, setForm] = useState<Record<string, string>>(initial);
  useEffect(() => setForm(initial), [initial]);
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  useEffect(() => onDirty('hero', dirty), [dirty, onDirty]);
  const stars = (form.headline.match(/\*/g) || []).length;
  return (
    <form onSubmit={async (e) => { e.preventDefault(); if (stars % 2) return; await onSave(Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim()]))); }} noValidate>
      <div className="space-y-4 p-4">
        <TextField label="Eyebrow" value={form.eyebrow} onChange={(e) => setForm({ ...form, eyebrow: e.target.value })} hint="The small line above the headline." maxLength={120} showCount />
        <TextArea label="Headline" rows={2} value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} maxLength={160} showCount
          hint={<>Wrap a phrase in *asterisks* to highlight it, e.g. <code className="font-mono">We build *3D experiences* &amp; software</code>.</>}
          error={stars % 2 ? 'Asterisks come in pairs: one before and one after the highlighted phrase.' : undefined} />
        <TextArea label="Supporting text" rows={3} value={form.sub} onChange={(e) => setForm({ ...form, sub: e.target.value })} maxLength={400} showCount />
        {Object.keys(form).filter((k) => !['eyebrow', 'headline', 'sub'].includes(k)).map((k) => (
          <TextField key={k} label={humanize(k)} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
        ))}
        <div className="rounded-lg border border-line bg-bg-2/60 p-4">
          <p className="mb-2 text-[0.7rem] uppercase tracking-[0.12em] text-subtle">Preview</p>
          <p className="eyebrow mb-2">{form.eyebrow}</p>
          <HeroPreview headline={form.headline} />
          <p className="mt-2 text-sm text-muted">{form.sub}</p>
        </div>
      </div>
      <SaveBar dirty={dirty} busy={busy} onReset={() => setForm(initial)} />
    </form>
  );
}

function ListForm({ k, label, help, value, onSave, busy, onDirty }: { k: string; label: string; help: string; value: unknown; onSave: (v: string[]) => Promise<boolean>; busy: boolean; onDirty: (key: string, d: boolean) => void }) {
  const initial = useMemo(() => (Array.isArray(value) ? value.map(String).join('\n') : ''), [value]);
  const [text, setText] = useState(initial);
  useEffect(() => setText(initial), [initial]);
  const items = text.split('\n').map((s) => s.trim()).filter(Boolean);
  const dirty = text !== initial;
  useEffect(() => onDirty(k, dirty), [dirty, k, onDirty]);
  const dupes = items.filter((x, i) => items.indexOf(x) !== i);
  return (
    <Card aria-labelledby={`list-${k}`}>
      <CardHeader id={`list-${k}`} title={label} description={help} />
      <form onSubmit={async (e) => { e.preventDefault(); if (!dupes.length && items.length) await onSave(items); }} noValidate>
        <div className="p-4">
          <TextArea label={`${label} (one per line)`} hideLabel rows={Math.min(10, Math.max(4, items.length + 1))} value={text} onChange={(e) => setText(e.target.value)}
            error={!items.length ? 'Add at least one option.' : dupes.length ? `Remove the duplicate: ${dupes[0]}` : undefined} hint={`${items.length} option${items.length === 1 ? '' : 's'} · one per line`} />
        </div>
        <SaveBar dirty={dirty} busy={busy} onReset={() => setText(initial)} />
      </form>
    </Card>
  );
}

function JsonEditor({ settings, onSave, busy, onDirty }: { settings: Settings; onSave: (k: string, v: unknown) => Promise<boolean>; busy: string | null; onDirty: (key: string, d: boolean) => void }) {
  const keys = Object.keys(settings).filter((k) => !FRIENDLY.has(k)).sort();
  const [key, setKey] = useState(keys[0] ?? '');
  const initial = useMemo(() => (key ? JSON.stringify(settings[key], null, 2) : ''), [key, settings]);
  const [text, setText] = useState(initial);
  useEffect(() => setText(initial), [initial]);
  const parsed = useMemo(() => { try { return { ok: true as const, value: JSON.parse(text) as unknown }; } catch (e) { return { ok: false as const, error: (e as Error).message }; } }, [text]);
  const dirty = text !== initial;
  useEffect(() => onDirty('json', dirty), [dirty, onDirty]);
  if (!keys.length) return <EmptyState title="No other settings" />;
  return (
    <form onSubmit={async (e) => { e.preventDefault(); if (parsed.ok) await onSave(key, parsed.value); }} noValidate>
      <div className="space-y-4 p-4">
        <Note tone="warning">These power sections of the website (About page, careers, product details…). Keep the same structure: change the text, not the keys, or the section may stop showing.</Note>
        <label className="flex max-w-xs flex-col gap-1">
          <span className="text-[0.8125rem] font-medium text-text">Setting</span>
          <Select value={key} onChange={(e) => { if (!dirty || window.confirm('Discard unsaved changes to this setting?')) setKey(e.target.value); }}>
            {keys.map((k) => <option key={k} value={k}>{k}</option>)}
          </Select>
        </label>
        <div>
          <label htmlFor="json-editor" className="mb-1.5 block text-[0.8125rem] font-medium text-text">Value (JSON)</label>
          <textarea id="json-editor" value={text} onChange={(e) => setText(e.target.value)} rows={18} spellCheck={false}
            aria-invalid={!parsed.ok || undefined} aria-describedby="json-status"
            className={`${inputClass} resize-y py-2 font-mono text-xs leading-relaxed`} />
          <p id="json-status" className={`mt-1.5 flex items-center gap-1.5 text-xs ${parsed.ok ? 'text-success' : 'text-danger'}`}>
            {parsed.ok ? <><CheckCircle2 size={13} aria-hidden="true" />Valid JSON</> : <><AlertTriangle size={13} aria-hidden="true" />Invalid JSON: {parsed.error}</>}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-line px-4 py-3">
        {dirty && <span className="mr-auto text-xs text-warning">Unsaved changes</span>}
        <AButton variant="ghost" size="sm" onClick={() => setText(initial)} disabled={!dirty}>Discard</AButton>
        <AButton variant="ghost" size="sm" onClick={() => parsed.ok && setText(JSON.stringify(parsed.value, null, 2))} disabled={!parsed.ok}>Format</AButton>
        <AButton type="submit" variant="primary" size="sm" loading={busy === key} disabled={!dirty || !parsed.ok}>Save</AButton>
      </div>
    </form>
  );
}

function EmailDelivery() {
  const res = useResource(() => adminApi.get<EmailStatus>('/stats/email'), []);
  if (res.error) return <ErrorState error={res.error} onRetry={res.reload} />;
  if (!res.data) return <SkeletonRows />;
  const d = res.data;
  const tone = (s: string) => (s === 'sent' ? 'success' : s === 'failed' ? 'danger' : s === 'skipped' ? 'neutral' : 'warning');
  return (
    <div className="space-y-4 p-4">
      {d.enabled
        ? <Note>Email sending is on. Lead notifications and client confirmations are sent through your SMTP server.</Note>
        : <Note tone="warning"><span><strong>Email sending is off — set SMTP_HOST</strong> (and SMTP_USER, SMTP_PASS) in the server’s .env, then restart. Until then emails are recorded below as “skipped” and nobody is notified about new leads.</span></Note>}
      <dl className="flex flex-wrap gap-3">
        {['sent', 'queued', 'failed', 'skipped'].map((s) => (
          <div key={s} className="min-w-28 rounded-lg border border-line px-3 py-2">
            <dt className="text-xs text-subtle">{humanize(s)}</dt>
            <dd className="font-display text-lg font-semibold tabular-nums text-text">{d.counts[s] ?? 0}</dd>
          </div>
        ))}
      </dl>
      <h3 className="text-sm font-semibold text-text">Last 20 emails</h3>
      {!d.recent.length ? <p className="text-sm text-muted">No emails yet.</p> : (
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Recent emails</caption>
            <thead><tr className="border-b border-line text-[0.7rem] uppercase tracking-[0.08em] text-subtle">
              <th scope="col" className="px-3 py-2 font-medium">To</th><th scope="col" className="px-3 py-2 font-medium">Subject</th>
              <th scope="col" className="px-3 py-2 font-medium">Status</th><th scope="col" className="px-3 py-2 font-medium">When</th>
            </tr></thead>
            <tbody>
              {d.recent.map((m) => (
                <tr key={m.id} className="border-b border-line/60 last:border-0 align-top">
                  <td className="px-3 py-2 text-muted">{m.to}</td>
                  <td className="px-3 py-2 text-text">{m.subject}<span className="block text-xs text-subtle">{m.template}</span>{m.lastError && <span className="block text-xs text-danger">{m.lastError}</span>}</td>
                  <td className="px-3 py-2"><StatusPill tone={tone(m.status)}>{humanize(m.status)}</StatusPill></td>
                  <td className="whitespace-nowrap px-3 py-2 text-muted">{formatDateTime(m.sentAt || m.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function SettingsPage() {
  const [f, setF] = useUrlState(['tab'] as const);
  const tab = TABS.some((t) => t.id === f.tab) ? f.tab : 'company';
  const res = useResource(() => adminApi.get<Settings>('/settings'), []);
  const { save, saving } = useSaveSetting((key, value) => res.setData((s) => s && { ...s, [key]: value }));
  const [dirtyMap, setDirtyMap] = useState<Record<string, boolean>>({});
  const onDirty = useMemo(() => (key: string, d: boolean) => setDirtyMap((m) => (m[key] === d ? m : { ...m, [key]: d })), []);
  const anyDirty = Object.values(dirtyMap).some(Boolean);
  useUnsavedChanges(anyDirty);
  const s = res.data;

  const switchTab = (id: string) => {
    if (anyDirty && !window.confirm('You have unsaved changes. Switch tabs and lose them?')) return;
    setDirtyMap({});
    setF({ tab: id === 'company' ? '' : id });
  };

  return (
    <>
      <PageHeader title="Settings" description="Company details, home page text and the options on the website forms." />
      <Card>
        <Tabs label="Settings sections" tabs={TABS} value={tab} onChange={switchTab} className="px-2" />
        <TabPanel id={tab}>
          {tab === 'email' ? <EmailDelivery />
            : res.error ? <ErrorState error={res.error} onRetry={res.reload} />
            : !s ? <SkeletonRows rows={6} />
            : tab === 'company' ? (
              <ObjectForm settingKey="company" label="Company" value={(s.company as Record<string, unknown>) ?? {}} busy={saving === 'company'} onDirty={onDirty}
                intro={<Note>Shown in the footer, contact page, emails and structured data for search engines.</Note>}
                onSave={(v) => save('company', v, 'Company details')} />
            ) : tab === 'hero' ? (
              <HeroForm value={(s.hero as Record<string, unknown>) ?? {}} busy={saving === 'hero'} onDirty={onDirty} onSave={(v) => save('hero', v, 'Home hero')} />
            ) : tab === 'stats' ? (
              <ObjectForm settingKey="stats" label="Stats" numeric value={(s.stats as Record<string, unknown>) ?? {}} busy={saving === 'stats'} onDirty={onDirty}
                intro={<Note tone="warning">Only real figures you can back up. These numbers appear on the website as facts about the company.</Note>}
                onSave={(v) => save('stats', v, 'Stats')} />
            ) : tab === 'forms' ? (
              <div className="grid gap-4 p-4 lg:grid-cols-2">
                <div className="lg:col-span-2"><Note tone="warning">The forms only accept these exact options. Renaming one doesn’t change existing leads — they keep the old wording.</Note></div>
                {LIST_KEYS.map((l) => (
                  <ListForm key={l.key} k={l.key} label={l.label} help={l.help} value={s[l.key]} busy={saving === l.key} onDirty={onDirty} onSave={(v) => save(l.key, v, l.label)} />
                ))}
              </div>
            ) : (
              <JsonEditor settings={s} busy={saving} onDirty={onDirty} onSave={(k, v) => save(k, v, `“${k}”`)} />
            )}
        </TabPanel>
      </Card>
    </>
  );
}
