'use client';

import { ExternalLink, ImageIcon, Pencil, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { adminApi, ApiError, errorMessage } from '@/lib/admin/api';
import { timeAgo } from '@/lib/admin/format';
import { loadSchema, useResource, useUrlSearch, useUrlState } from '@/lib/admin/hooks';
import type { CollectionSchema, ContentItem, ContentList as ListResponse, FieldSchema } from '@/lib/admin/types';
import { AdminTable, type Column } from '../ui/AdminTable';
import { ALink, IconButton } from '../ui/Button';
import { inputClass, SearchInput, Select, Switch } from '../ui/Field';
import { ConfirmDialog } from '../ui/Modal';
import { Card, FilterBar, PageHeader } from '../ui/Layout';
import { Pagination } from '../ui/Pagination';
import { EmptyState, ErrorState, SkeletonRows } from '../ui/States';
import { useToast } from '../ui/Toast';
import { publicUrl } from './ContentEditor';
import { IMAGE_KEYS, invalidateRefItems, loadRefItems } from './schema';

const PAGE = 50;
const ALL_FILTER_KEYS = ['pillar', 'categoryId', 'featured', 'caseStudy', 'grp', 'stage', 'category', 'groupId'];

/** Options for one list filter, derived from the field type. */
function useFilterOptions(field: FieldSchema | undefined) {
  const [refItems, setRefItems] = useState<ContentItem[] | null>(null);
  useEffect(() => {
    if (field?.type === 'ref' && field.ref) loadRefItems(field.ref.collection).then(setRefItems, () => setRefItems([]));
  }, [field]);
  if (!field) return [];
  if (field.type === 'select') return (field.options ?? []).map((o) => ({ value: String(o), label: String(o) }));
  if (field.type === 'boolean') return [{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }];
  if (field.type === 'number') return [{ value: 'true', label: 'On the home page' }, { value: '0', label: 'Not on the home page' }];
  if (field.type === 'ref') return (refItems ?? []).map((i) => ({ value: String(i.id), label: String(i[field.ref!.labelKey] ?? `#${i.id}`) }));
  return [];
}

function FilterControl({ field, value, onChange }: { field: FieldSchema; value: string; onChange: (v: string) => void }) {
  const options = useFilterOptions(field);
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[0.7rem] font-medium uppercase tracking-[0.08em] text-subtle">{field.label}</span>
      <Select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Any</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </Select>
    </label>
  );
}

export function ContentListPage({ collection }: { collection: string }) {
  const schemaRes = useResource(async () => {
    const all = await loadSchema();
    const s = all.find((c) => c.name === collection);
    if (!s) throw new ApiError(`Unknown content type “${collection}”.`, 404);
    return s;
  }, [collection]);
  if (schemaRes.error) return <><PageHeader title="Content" /><Card><ErrorState error={schemaRes.error} onRetry={schemaRes.reload} /></Card></>;
  if (!schemaRes.data) return <><PageHeader title="Content" /><Card><SkeletonRows rows={8} /></Card></>;
  return <ListView key={collection} schema={schemaRes.data} />;
}

function ListView({ schema }: { schema: CollectionSchema }) {
  const router = useRouter();
  const toast = useToast();
  const [f, setF] = useUrlState(['q', 'published', 'page', ...ALL_FILTER_KEYS] as const);
  const [q, setQ] = useUrlSearch(f.q, (v) => setF({ q: v }));
  const serverFilters: Record<string, string> = {};
  for (const k of schema.filters) if (f[k as keyof typeof f]) serverFilters[k] = f[k as keyof typeof f];
  const list = useResource(() => adminApi.get<ListResponse>(`/content/${schema.name}`, { q: f.q, ...serverFilters, pageSize: 500 }), [schema.name, f.q, JSON.stringify(serverFilters)]);
  const [busy, setBusy] = useState<number | null>(null);
  const [toDelete, setToDelete] = useState<ContentItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [sortDrafts, setSortDrafts] = useState<Record<number, string>>({});

  const fields = useMemo(() => new Map(schema.fields.map((x) => [x.key, x])), [schema]);
  const imageKey = IMAGE_KEYS.find((k) => fields.get(k)?.type === 'image');
  const subKey = ['client', 'company', 'line', 'tag', 'slug'].find((k) => fields.has(k) && k !== schema.titleKey);
  const filterFields = schema.filters.map((k) => fields.get(k)).filter((x): x is FieldSchema => !!x);

  const all = list.data?.items ?? [];
  const visible = all.filter((i) => (f.published === 'yes' ? i.active : f.published === 'no' ? !i.active : true));
  const page = Math.max(1, Number(f.page) || 1);
  const pages = Math.max(1, Math.ceil(visible.length / PAGE));
  const rows = visible.slice((page - 1) * PAGE, page * PAGE);
  const filtered = !!(f.q || f.published || Object.keys(serverFilters).length);
  const singular = schema.label.replace(/ies$/, 'y').replace(/s$/, '').toLowerCase();

  const patchItem = async (item: ContentItem, body: Record<string, unknown>, okMsg: string) => {
    setBusy(item.id);
    list.setData((d) => d && { ...d, items: d.items.map((x) => (x.id === item.id ? { ...x, ...body } : x)) });
    try {
      const updated = await adminApi.patch<ContentItem>(`/content/${schema.name}/${item.id}`, body);
      list.setData((d) => d && { ...d, items: d.items.map((x) => (x.id === item.id ? updated : x)) });
      invalidateRefItems(schema.name);
      toast.success(okMsg);
      return true;
    } catch (e) {
      list.setData((d) => d && { ...d, items: d.items.map((x) => (x.id === item.id ? item : x)) });
      const fe = e instanceof ApiError && e.fieldErrors ? Object.values(e.fieldErrors)[0] : null;
      toast.error(fe || errorMessage(e));
      return false;
    } finally {
      setBusy(null);
    }
  };

  const commitSort = async (item: ContentItem) => {
    const raw = sortDrafts[item.id];
    if (raw === undefined) return;
    setSortDrafts(({ [item.id]: _, ...rest }) => rest);
    if (raw === String(item.sort ?? '') || raw === '' || !Number.isFinite(Number(raw))) return;
    const ok = await patchItem(item, { sort: Number(raw) }, 'Order updated.');
    if (ok) list.reload();
  };

  const remove = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await adminApi.del(`/content/${schema.name}/${toDelete.id}`);
      list.setData((d) => d && { ...d, items: d.items.filter((x) => x.id !== toDelete.id), total: d.total - 1 });
      invalidateRefItems(schema.name);
      toast.success('Deleted.');
      setToDelete(null);
    } catch (e) { toast.error(errorMessage(e)); }
    finally { setDeleting(false); }
  };

  const title = (i: ContentItem) => String(i[schema.titleKey] ?? '') || `#${i.id}`;
  const valueLabel = (fd: FieldSchema, i: ContentItem) => {
    const v = i[fd.key];
    if (fd.type === 'boolean') return v ? fd.label : null;
    if (fd.type === 'number' && fd.key === 'featured') return Number(v) > 0 ? `Home #${v}` : null;
    if (fd.type === 'ref') return null;
    return v === null || v === undefined || v === '' ? null : String(v);
  };

  const columns: Column<ContentItem>[] = [
    ...(imageKey ? [{ key: 'img', header: <span className="sr-only">Image</span>, className: 'w-16', cell: (i: ContentItem) => (
      <div className="h-10 w-14 overflow-hidden rounded-md border border-line bg-white/[0.03]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {i[imageKey] ? <img src={String(i[imageKey])} alt="" loading="lazy" className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center text-subtle"><ImageIcon size={14} aria-hidden="true" /></span>}
      </div>
    ) }] : []),
    { key: 'title', header: fields.get(schema.titleKey)?.label ?? 'Title', cell: (i) => (
      <div className="min-w-0 max-w-md">
        <Link href={`/admin/content/${schema.name}/${i.id}`} className="font-medium text-text hover:text-brand-soft">{title(i)}</Link>
        {subKey && i[subKey] ? <p className="truncate text-xs text-subtle">{String(i[subKey])}</p> : null}
        <p className="mt-0.5 flex flex-wrap gap-1">
          {filterFields.map((fd) => { const l = valueLabel(fd, i); return l ? <span key={fd.key} className="rounded border border-line px-1.5 text-[0.7rem] text-muted">{l}</span> : null; })}
        </p>
      </div>
    ) },
    { key: 'active', header: 'Published', cell: (i) => (
      <Switch hideLabel label={`Published: ${title(i)}`} checked={!!i.active} disabled={busy === i.id}
        onChange={(v) => patchItem(i, { active: v }, v ? `“${title(i)}” published.` : `“${title(i)}” unpublished.`)} />
    ) },
    { key: 'sort', header: 'Order', cell: (i) => (
      <input type="number" aria-label={`Sort order for ${title(i)}`} value={sortDrafts[i.id] ?? String(i.sort ?? '')}
        onChange={(e) => setSortDrafts((d) => ({ ...d, [i.id]: e.target.value }))} onBlur={() => commitSort(i)}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
        className={`${inputClass} h-8 !w-16 px-2 text-center tabular-nums`} />
    ) },
    { key: 'updated', header: 'Updated', headerClassName: 'hidden lg:table-cell', className: 'hidden lg:table-cell whitespace-nowrap text-muted', cell: (i) => timeAgo(i.updatedAt) },
    { key: 'actions', header: <span className="sr-only">Actions</span>, className: 'text-right', cell: (i) => {
      const url = i.active ? publicUrl(schema, i) : null;
      return (
        <div className="flex items-center justify-end gap-0.5">
          {url && <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`View “${title(i)}” on the website`} title="View on site" className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:bg-white/[0.07] hover:text-text"><ExternalLink size={14} aria-hidden="true" /></a>}
          <Link href={`/admin/content/${schema.name}/${i.id}`} aria-label={`Edit “${title(i)}”`} title="Edit" className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:bg-white/[0.07] hover:text-text"><Pencil size={14} aria-hidden="true" /></Link>
          <IconButton size="sm" label={`Delete “${title(i)}”`} onClick={() => setToDelete(i)} className="hover:!text-danger"><Trash2 size={14} aria-hidden="true" /></IconButton>
        </div>
      );
    } },
  ];

  const publishedCount = all.filter((i) => i.active).length;
  return (
    <>
      <PageHeader title={schema.label}
        description={list.data ? `${all.length} item${all.length === 1 ? '' : 's'} · ${publishedCount} published · ${all.length - publishedCount} draft${all.length - publishedCount === 1 ? '' : 's'}` : 'Website content'}
        actions={<ALink href={`/admin/content/${schema.name}/new`} variant="primary" icon={<Plus size={15} aria-hidden="true" />}>New {singular}</ALink>} />
      <Card>
        <FilterBar>
          <SearchInput label={`Search ${schema.label.toLowerCase()}`} placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} className="w-full sm:w-64" />
          <label className="flex flex-col gap-1">
            <span className="text-[0.7rem] font-medium uppercase tracking-[0.08em] text-subtle">Status</span>
            <Select value={f.published} onChange={(e) => setF({ published: e.target.value })}>
              <option value="">Published & drafts</option>
              <option value="yes">Published</option>
              <option value="no">Drafts</option>
            </Select>
          </label>
          {filterFields.map((fd) => (
            <FilterControl key={fd.key} field={fd} value={f[fd.key as keyof typeof f] ?? ''} onChange={(v) => setF({ [fd.key]: v } as Record<string, string>)} />
          ))}
        </FilterBar>
        {list.error ? <ErrorState error={list.error} onRetry={list.reload} />
          : !list.data ? <SkeletonRows rows={8} />
          : !rows.length ? (
            <EmptyState title={filtered ? 'Nothing matches' : `No ${schema.label.toLowerCase()} yet`}
              action={!filtered && <ALink href={`/admin/content/${schema.name}/new`} variant="primary" size="sm" icon={<Plus size={14} aria-hidden="true" />}>New {singular}</ALink>}>
              {filtered ? 'Try another search or clear the filters.' : 'Create the first one.'}
            </EmptyState>
          ) : (
            <div className={list.loading ? 'opacity-60' : ''}>
              <AdminTable caption={schema.label} columns={columns} rows={rows} rowKey={(i) => i.id}
                rowClassName={(i) => (i.active ? '' : '[&_td:not(:last-child)]:opacity-75')}
                onRowClick={(i) => router.push(`/admin/content/${schema.name}/${i.id}`)} rowLabel={(i) => `Edit ${title(i)}`}
                mobileCard={(i) => (
                  <div className="flex items-center gap-3 px-4 py-3">
                    {imageKey && (
                      <div className="h-12 w-16 shrink-0 overflow-hidden rounded-md border border-line bg-white/[0.03]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {i[imageKey] ? <img src={String(i[imageKey])} alt="" loading="lazy" className="h-full w-full object-cover" /> : null}
                      </div>
                    )}
                    <Link href={`/admin/content/${schema.name}/${i.id}`} className="min-w-0 flex-1">
                      <p className="truncate font-medium text-text">{title(i)}</p>
                      <p className="truncate text-xs text-subtle">{i.active ? 'Published' : 'Draft'} · order {String(i.sort ?? '—')}</p>
                    </Link>
                    <Switch hideLabel label={`Published: ${title(i)}`} checked={!!i.active} disabled={busy === i.id}
                      onChange={(v) => patchItem(i, { active: v }, v ? 'Published.' : 'Unpublished.')} />
                  </div>
                )} />
              <Pagination page={page} pages={pages} total={visible.length} pageSize={PAGE} noun="items" onPage={(p) => setF({ page: p > 1 ? String(p) : '' })} />
            </div>
          )}
      </Card>
      <ConfirmDialog open={!!toDelete} title={`Delete “${toDelete ? title(toDelete) : ''}”?`} busy={deleting} onCancel={() => setToDelete(null)} onConfirm={remove}
        description="It is removed from the website and the admin for good. To hide it but keep it, unpublish it instead." />
    </>
  );
}
