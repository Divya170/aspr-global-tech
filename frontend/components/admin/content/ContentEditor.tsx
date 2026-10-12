'use client';

import { AlertTriangle, ArrowLeft, ExternalLink, Info, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { adminApi, ApiError, errorMessage } from '@/lib/admin/api';
import { formatDateTime } from '@/lib/admin/format';
import { loadSchema, useResource, useUnsavedChanges } from '@/lib/admin/hooks';
import type { CollectionSchema, ContentItem } from '@/lib/admin/types';
import { AButton, ALink } from '../ui/Button';
import { ConfirmDialog } from '../ui/Modal';
import { Card } from '../ui/Layout';
import { ErrorState, Skeleton } from '../ui/States';
import { StatusPill } from '../ui/StatusPill';
import { useToast } from '../ui/Toast';
import { FieldEditor, fieldId, WIDE_TYPES } from './fields';
import { emptyItem, invalidateRefItems, itemToForm, SECTION_HELP, sectionsOf, slugify, toPayload, validate, type FormValue, type FormValues } from './schema';

export const publicUrl = (schema: CollectionSchema, item: Record<string, unknown>) =>
  schema.publicPath && item.slug ? schema.publicPath.replace(':slug', String(item.slug)) : null;

const singular = (label: string) => label.replace(/ies$/, 'y').replace(/s$/, '');

export function ContentEditor({ collection, id }: { collection: string; id: number | null }) {
  const schemaRes = useResource(async () => {
    const all = await loadSchema();
    const s = all.find((c) => c.name === collection);
    if (!s) throw new ApiError(`Unknown content type “${collection}”.`, 404);
    return s;
  }, [collection]);
  const itemRes = useResource(() => (id ? adminApi.get<ContentItem>(`/content/${collection}/${id}`) : Promise.resolve(null)), [collection, id]);

  const error = schemaRes.error || itemRes.error;
  if (error) {
    return (
      <>
        <ALink href={`/admin/content/${collection}`} variant="ghost" size="sm" className="-ml-3 mb-3" icon={<ArrowLeft size={15} aria-hidden="true" />}>Back</ALink>
        <Card>
          {error instanceof ApiError && error.status === 404
            ? <p className="px-6 py-14 text-center text-muted">{error.message.includes('Unknown') ? error.message : 'This item doesn’t exist or was deleted.'}</p>
            : <ErrorState error={error} onRetry={() => { schemaRes.reload(); itemRes.reload(); }} />}
        </Card>
      </>
    );
  }
  if (!schemaRes.data || itemRes.loading) {
    return (
      <div role="status" aria-label="Loading editor">
        <Skeleton className="mb-3 h-6 w-28" />
        <Skeleton className="mb-6 h-8 w-80" />
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]"><Skeleton className="h-[30rem] rounded-xl" /><Skeleton className="h-64 rounded-xl" /></div>
      </div>
    );
  }
  return <EditorForm key={`${collection}-${id ?? 'new'}`} schema={schemaRes.data} item={itemRes.data ?? null} />;
}

function EditorForm({ schema, item }: { schema: CollectionSchema; item: ContentItem | null }) {
  const router = useRouter();
  const toast = useToast();
  const initial = useMemo(() => (item ? itemToForm(schema, item) : emptyItem(schema)), [schema, item]);
  const [saved, setSaved] = useState<FormValues>(initial);
  const [form, setForm] = useState<FormValues>(initial);
  const [current, setCurrent] = useState<ContentItem | null>(item);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<'save' | 'publish' | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [slugTouched, setSlugTouched] = useState(!!item);
  const summaryRef = useRef<HTMLDivElement>(null);

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(saved), [form, saved]);
  useUnsavedChanges(dirty && !deleting);

  const fieldsByKey = useMemo(() => new Map(schema.fields.map((f) => [f.key, f])), [schema]);
  const sections = useMemo(() => sectionsOf(schema), [schema]);
  const main = sections.filter((s) => s.name !== 'Publishing');
  const publishing = sections.find((s) => s.name === 'Publishing');
  const titleField = schema.titleKey;
  const hasSlug = fieldsByKey.has('slug');
  const isNew = !current;
  const title = String(form[titleField] || '') || (isNew ? `New ${singular(schema.label).toLowerCase()}` : `#${current?.id}`);
  const url = current?.active ? publicUrl(schema, current) : null;
  const help = SECTION_HELP[schema.name] ?? {};

  const set = (key: string, v: FormValue) => {
    setForm((f) => {
      const next = { ...f, [key]: v };
      if (key === titleField && hasSlug && !slugTouched && typeof v === 'string') next.slug = slugify(v);
      return next;
    });
    if (key === 'slug') setSlugTouched(true);
    if (errors[key]) setErrors((e) => { const { [key]: _, ...rest } = e; return rest; });
  };

  const showErrors = (e: Record<string, string>) => {
    setErrors(e);
    setTimeout(() => summaryRef.current?.focus(), 0);
  };

  const save = async (publish: boolean) => {
    const values = publish ? { ...form, active: true } : form;
    const clientErrors = validate(schema, values);
    if (Object.keys(clientErrors).length) { showErrors(clientErrors); return; }
    const payload: Record<string, unknown> = {};
    for (const f of schema.fields) payload[f.key] = toPayload(f, values[f.key]);
    setSaving(publish ? 'publish' : 'save');
    try {
      const result = isNew
        ? await adminApi.post<ContentItem>(`/content/${schema.name}`, payload)
        : await adminApi.patch<ContentItem>(`/content/${schema.name}/${current!.id}`, payload);
      const next = itemToForm(schema, result);
      setSaved(next);
      setForm(next);
      setCurrent(result);
      setErrors({});
      invalidateRefItems(schema.name);
      toast.success(publish ? 'Saved and published.' : result.active ? 'Saved. The website updates within a few seconds.' : 'Draft saved.');
      if (isNew) router.replace(`/admin/content/${schema.name}/${result.id}`);
    } catch (e) {
      if (e instanceof ApiError && e.fieldErrors && Object.keys(e.fieldErrors).length) {
        showErrors(e.fieldErrors);
        toast.error(e.message || 'Please check the highlighted fields.');
      } else toast.error(errorMessage(e));
    } finally {
      setSaving(null);
    }
  };

  const remove = async () => {
    if (!current) return;
    setDeleting(true);
    try {
      await adminApi.del(`/content/${schema.name}/${current.id}`);
      invalidateRefItems(schema.name);
      toast.success(`“${title}” deleted.`);
      router.push(`/admin/content/${schema.name}`);
    } catch (e) {
      toast.error(errorMessage(e));
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const errorList = Object.entries(errors);
  const consentProblem = schema.name === 'testimonials' && !form.consent;
  const caseStudyProblem = schema.name === 'projects' && form.caseStudy && !(String(form.overview || '').trim() && String(form.solution || '').trim());

  const renderField = (key: string) => {
    const f = fieldsByKey.get(key)!;
    return <FieldEditor field={f} value={form[f.key]} onChange={(v) => set(f.key, v)} error={errors[f.key]} large={f.key === 'coverImage'} />;
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); void save(false); }} noValidate>
      <ALink href={`/admin/content/${schema.name}`} variant="ghost" size="sm" className="-ml-3 mb-3" icon={<ArrowLeft size={15} aria-hidden="true" />}>{schema.label}</ALink>
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-subtle">{isNew ? `New ${singular(schema.label).toLowerCase()}` : `${singular(schema.label)} #${current!.id}`}</p>
          <h1 className="mt-0.5 flex flex-wrap items-center gap-3 text-xl font-semibold text-text sm:text-2xl">
            <span className="min-w-0 break-words">{title}</span>
            {!isNew && <StatusPill tone={current!.active ? 'success' : 'neutral'}>{current!.active ? 'Published' : 'Draft'}</StatusPill>}
            {dirty && <span className="text-xs font-normal text-warning">Unsaved changes</span>}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {url && <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong px-3 text-sm text-text hover:bg-surface-3">View on site <ExternalLink size={14} aria-hidden="true" /></a>}
          {!isNew && <AButton variant="danger-ghost" onClick={() => setConfirmDelete(true)} icon={<Trash2 size={15} aria-hidden="true" />}>Delete</AButton>}
        </div>
      </header>

      <div ref={summaryRef} tabIndex={-1} className="outline-none">
        {errorList.length > 0 && (
          <div role="alert" className="mb-4 rounded-xl border border-danger/35 bg-danger/[0.07] px-4 py-3 text-sm">
            <p className="flex items-center gap-2 font-medium text-text"><AlertTriangle size={16} aria-hidden="true" className="text-danger" />Fix {errorList.length === 1 ? 'this' : `these ${errorList.length}`} before saving:</p>
            <ul className="mt-1.5 list-disc space-y-0.5 pl-9 text-muted">
              {errorList.map(([k, msg]) => (
                <li key={k}>
                  <a href={`#${fieldId(k)}`} className="hover:text-text hover:underline" onClick={(e) => { e.preventDefault(); const el = document.getElementById(fieldId(k)); el?.scrollIntoView({ block: 'center' }); el?.focus(); }} data-skip-unsaved>
                    {fieldsByKey.get(k)?.label ?? k}: {msg}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {main.length > 2 && (
        <nav aria-label="Form sections" className="mb-4 flex flex-wrap gap-1.5">
          {main.map((s) => (
            <a key={s.name} href={`#section-${slugify(s.name)}`} data-skip-unsaved className="rounded-full border border-line-strong px-3 py-1 text-xs text-muted hover:border-brand-soft/40 hover:text-text"
              onClick={(e) => { e.preventDefault(); document.getElementById(`section-${slugify(s.name)}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>
              {s.name}{s.fields.some((f) => errors[f.key]) && <span className="ml-1 text-danger" aria-label="has errors">•</span>}
            </a>
          ))}
        </nav>
      )}

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-4">
          {main.map((s) => (
            <Card key={s.name} aria-labelledby={`section-${slugify(s.name)}`} className="scroll-mt-20">
              <div className="border-b border-line px-4 py-3">
                <h2 id={`section-${slugify(s.name)}`} className="scroll-mt-20 text-sm font-semibold text-text">{s.name}</h2>
                {help[s.name] && <p className="mt-1 flex gap-1.5 text-xs leading-relaxed text-muted"><Info size={13} aria-hidden="true" className="mt-0.5 shrink-0 text-brand" />{help[s.name]}</p>}
              </div>
              <div className="grid gap-x-4 gap-y-5 p-4 sm:grid-cols-2">
                {s.fields.map((f) => (
                  <div key={f.key} className={WIDE_TYPES.has(f.type) || (f.type === 'text' && (!f.max || f.max > 120) && f.key !== 'slug') ? 'sm:col-span-2' : ''}>
                    {renderField(f.key)}
                  </div>
                ))}
                {s.name === 'Case study' && caseStudyProblem && (
                  <p role="status" className="flex gap-2 rounded-lg border border-warning/30 bg-warning/[0.07] px-3 py-2 text-xs text-text sm:col-span-2">
                    <AlertTriangle size={14} aria-hidden="true" className="mt-px shrink-0 text-warning" />Write at least the overview and solution before turning on the case study page.
                  </p>
                )}
              </div>
            </Card>
          ))}
        </div>

        <aside className="space-y-4 xl:sticky xl:top-20" aria-label="Publishing">
          <Card>
            <div className="border-b border-line px-4 py-3">
              <h2 className="text-sm font-semibold text-text">Publishing</h2>
              {help.Publishing && <p className="mt-1 text-xs text-muted">{help.Publishing}</p>}
            </div>
            <div className="space-y-4 p-4">
              {publishing?.fields.map((f) => <div key={f.key}>{renderField(f.key)}</div>)}
              {consentProblem && (
                <p role="status" className="flex gap-2 rounded-lg border border-warning/30 bg-warning/[0.07] px-3 py-2 text-xs text-text">
                  <AlertTriangle size={14} aria-hidden="true" className="mt-px shrink-0 text-warning" />
                  The website won&apos;t publish this testimonial until “Client approved publishing” is on. You can still save it as a draft.
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2 border-t border-line p-4">
              <AButton type="submit" variant={form.active ? 'primary' : 'secondary'} loading={saving === 'save'} disabled={saving !== null || (!dirty && !isNew)}>
                {isNew ? (form.active ? 'Create & publish' : 'Save draft') : 'Save changes'}
              </AButton>
              {!form.active && (
                <AButton variant="primary" onClick={() => save(true)} loading={saving === 'publish'} disabled={saving !== null || consentProblem}>Save &amp; publish</AButton>
              )}
              {current?.updatedAt && <p className="text-center text-xs text-subtle">Last saved {formatDateTime(current.updatedAt)}</p>}
            </div>
          </Card>
        </aside>
      </div>

      <ConfirmDialog open={confirmDelete} title={`Delete “${title}”?`} busy={deleting} onCancel={() => setConfirmDelete(false)} onConfirm={remove}
        description={<>This removes it from the website and the admin for good. To hide it but keep it, turn off <strong>Published</strong> instead.</>} />
    </form>
  );
}
