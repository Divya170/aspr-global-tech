'use client';

import { AlertTriangle, ArrowDown, ArrowUp, Film, ImageIcon, Library, Plus, Trash2, Upload, X } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { errorMessage, uploadFile } from '@/lib/admin/api';
import type { Block, ContentItem, FieldSchema, GalleryItem, MediaItem } from '@/lib/admin/types';
import { checkFile, isVideoSrc, MediaPicker } from '../media/MediaLibrary';
import { AButton, IconButton } from '../ui/Button';
import { FieldShell, inputClass, Select, SelectField, Switch, TextArea, TextField } from '../ui/Field';
import { useToast } from '../ui/Toast';
import { loadRefItems, type FormValue } from './schema';

export const fieldId = (key: string) => `field-${key}`;

interface WidgetProps<V> { field: FieldSchema; value: V; onChange: (v: V) => void; error?: string }

/** Moves item `i` by `d` (−1 up, +1 down). */
function move<T>(arr: T[], i: number, d: number): T[] {
  const j = i + d;
  if (j < 0 || j >= arr.length) return arr;
  const next = [...arr];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

function RowControls({ index, count, onMove, onRemove, noun }: { index: number; count: number; onMove: (d: number) => void; onRemove: () => void; noun: string }) {
  return (
    <div className="flex shrink-0 items-center">
      <IconButton size="sm" label={`Move ${noun} ${index + 1} up`} disabled={index === 0} onClick={() => onMove(-1)}><ArrowUp size={14} aria-hidden="true" /></IconButton>
      <IconButton size="sm" label={`Move ${noun} ${index + 1} down`} disabled={index === count - 1} onClick={() => onMove(1)}><ArrowDown size={14} aria-hidden="true" /></IconButton>
      <IconButton size="sm" label={`Remove ${noun} ${index + 1}`} onClick={onRemove} className="hover:!text-danger"><Trash2 size={14} aria-hidden="true" /></IconButton>
    </div>
  );
}

/** Wraps composite widgets: a group with a visible legend, hint and error. */
function Group({ field, error, children, actions }: { field: FieldSchema; error?: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <fieldset id={fieldId(field.key)} tabIndex={-1} className="min-w-0 outline-none" aria-describedby={error ? `${fieldId(field.key)}-error` : field.help ? `${fieldId(field.key)}-hint` : undefined} data-field-error={error ? 'true' : undefined}>
      <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
        <legend className="float-left text-[0.8125rem] font-medium text-text">{field.label}{field.required && <span className="text-danger" aria-hidden="true"> *</span>}</legend>
        {actions}
      </div>
      <div className="clear-both">{children}</div>
      {field.help && !error && <p id={`${fieldId(field.key)}-hint`} className="mt-1.5 text-xs text-subtle">{field.help}</p>}
      {error && <p id={`${fieldId(field.key)}-error`} className={`mt-1.5 text-xs font-medium text-danger`}>{error}</p>}
    </fieldset>
  );
}

// ─────────── blocks ───────────
const BLOCK_TYPES: { value: string; label: string; hint: string }[] = [
  { value: 'standfirst', label: 'Standfirst', hint: 'The opening summary, shown larger' },
  { value: 'p', label: 'Paragraph', hint: '' },
  { value: 'h2', label: 'Subheading', hint: '' },
  { value: 'quote', label: 'Pull quote', hint: '' },
  { value: 'takeaways', label: 'Key takeaways', hint: 'One per line' },
  { value: 'list', label: 'Bulleted list', hint: 'One item per line' },
  { value: 'checklist', label: 'Checklist', hint: 'One item per line' },
  { value: 'callout', label: 'Callout', hint: 'A highlighted tip box' },
];

function BlocksEditor({ field, value, onChange, error }: WidgetProps<Block[]>) {
  const [adding, setAdding] = useState('p');
  const lastRef = useRef<HTMLTextAreaElement | null>(null);
  const [focusLast, setFocusLast] = useState(false);
  useEffect(() => { if (focusLast) { lastRef.current?.focus(); setFocusLast(false); } }, [focusLast]);
  const set = (i: number, b: Partial<Block>) => onChange(value.map((x, j) => (j === i ? { ...x, ...b } : x)));
  return (
    <Group field={field} error={error}>
      {value.length === 0 && <p className="rounded-lg border border-dashed border-line-strong px-3 py-4 text-center text-sm text-subtle">No blocks yet. Start with a standfirst, then add paragraphs and subheadings.</p>}
      <ol className="space-y-2">
        {value.map((b, i) => {
          const t = BLOCK_TYPES.find((x) => x.value === b.type);
          return (
            <li key={i} className="rounded-lg border border-line bg-bg-2/50 p-2.5">
              <div className="mb-2 flex items-center gap-2">
                <span className="w-6 text-center font-mono text-xs text-subtle" aria-hidden="true">{i + 1}</span>
                <Select aria-label={`Block ${i + 1} type`} value={b.type} onChange={(e) => set(i, { type: e.target.value })} className="h-8 !w-44 text-xs">
                  {BLOCK_TYPES.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
                </Select>
                {t?.hint && <span className="hidden text-xs text-subtle sm:inline">{t.hint}</span>}
                <div className="ml-auto"><RowControls index={i} count={value.length} noun="block" onMove={(d) => onChange(move(value, i, d))} onRemove={() => onChange(value.filter((_, j) => j !== i))} /></div>
              </div>
              <textarea ref={i === value.length - 1 ? lastRef : undefined} aria-label={`Block ${i + 1} text (${t?.label ?? b.type})`} value={b.text}
                onChange={(e) => set(i, { text: e.target.value })} rows={b.type === 'h2' ? 1 : Math.min(12, Math.max(b.type === 'p' ? 4 : 3, b.text.split('\n').length + 1, Math.ceil(b.text.length / 95)))}
                className={`${inputClass} resize-y py-2 leading-relaxed ${b.type === 'h2' ? 'font-display text-base font-semibold' : b.type === 'standfirst' ? 'text-[0.95rem]' : b.type === 'quote' ? 'italic' : ''}`} />
            </li>
          );
        })}
      </ol>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Select aria-label="Type of block to add" value={adding} onChange={(e) => setAdding(e.target.value)} className="h-8 !w-44 text-xs">
          {BLOCK_TYPES.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
        </Select>
        <AButton size="sm" icon={<Plus size={14} aria-hidden="true" />} onClick={() => { onChange([...value, { type: adding, text: '' }]); setFocusLast(true); }}>Add block</AButton>
      </div>
    </Group>
  );
}

// ─────────── pairs ───────────
function PairsEditor({ field, value, onChange, error }: WidgetProps<string[][]>) {
  const [a, b] = field.pairLabels ?? ['Label', 'Text'];
  const firstRef = useRef<HTMLInputElement | null>(null);
  const [focusNew, setFocusNew] = useState(false);
  useEffect(() => { if (focusNew) { firstRef.current?.focus(); setFocusNew(false); } }, [focusNew]);
  const set = (i: number, k: 0 | 1, v: string) => onChange(value.map((p, j) => (j === i ? (k === 0 ? [v, p[1]] : [p[0], v]) : p)));
  const longSecond = /answer|description|what happened|label/i.test(b) && !/^label$/i.test(b);
  return (
    <Group field={field} error={error}>
      {value.length === 0 && <p className="rounded-lg border border-dashed border-line-strong px-3 py-3 text-center text-sm text-subtle">No rows yet.</p>}
      <ol className="space-y-2">
        {value.map((p, i) => (
          <li key={i} className="flex gap-2 rounded-lg border border-line bg-bg-2/50 p-2.5">
            <span className="mt-2 w-5 shrink-0 text-center font-mono text-xs text-subtle" aria-hidden="true">{i + 1}</span>
            <div className={`grid min-w-0 flex-1 gap-2 ${longSecond ? '' : 'sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]'}`}>
              <label className="min-w-0">
                <span className="mb-1 block text-[0.7rem] text-subtle">{a}</span>
                <input ref={i === value.length - 1 ? firstRef : undefined} value={p[0]} onChange={(e) => set(i, 0, e.target.value)} className={`${inputClass} h-8`} maxLength={300} aria-label={`${a}, row ${i + 1}`} />
              </label>
              <label className="min-w-0">
                <span className="mb-1 block text-[0.7rem] text-subtle">{b}</span>
                {longSecond
                  ? <textarea value={p[1]} onChange={(e) => set(i, 1, e.target.value)} rows={2} className={`${inputClass} resize-y py-1.5`} maxLength={2000} aria-label={`${b}, row ${i + 1}`} />
                  : <input value={p[1]} onChange={(e) => set(i, 1, e.target.value)} className={`${inputClass} h-8`} maxLength={2000} aria-label={`${b}, row ${i + 1}`} />}
              </label>
            </div>
            <RowControls index={i} count={value.length} noun="row" onMove={(d) => onChange(move(value, i, d))} onRemove={() => onChange(value.filter((_, j) => j !== i))} />
          </li>
        ))}
      </ol>
      <AButton size="sm" className="mt-2" icon={<Plus size={14} aria-hidden="true" />} onClick={() => { onChange([...value, ['', '']]); setFocusNew(true); }}>Add {a.toLowerCase()}</AButton>
    </Group>
  );
}

// ─────────── image ───────────
function MediaPreview({ src, alt = '', className = '' }: { src: string; alt?: string; className?: string }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [src]);
  if (!src) return <div className={`flex items-center justify-center bg-white/[0.03] text-subtle ${className}`}><ImageIcon size={22} aria-hidden="true" /></div>;
  if (broken) return <div className={`flex items-center justify-center bg-danger/10 px-2 text-center text-xs text-danger ${className}`}>Can&apos;t load this file</div>;
  if (isVideoSrc(src)) return <video src={src} muted controls preload="metadata" className={`bg-black object-contain ${className}`} onError={() => setBroken(true)} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={`object-cover ${className}`} onError={() => setBroken(true)} />;
}

/** Upload one file straight from a field, with progress. */
function useDirectUpload(onDone: (m: MediaItem) => void, kind?: 'image' | 'video') {
  const toast = useToast();
  const [progress, setProgress] = useState<number | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const start = async (file: File) => {
    const problem = checkFile(file, kind);
    if (problem) { toast.error(problem); return; }
    setProgress(0);
    try {
      const m = await uploadFile<MediaItem>('/media', file, setProgress).promise;
      onDone(m);
      toast.success(`${m.name} uploaded.`);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setProgress(null);
    }
  };
  const inputEl = (
    <input ref={input} type="file" className="sr-only" tabIndex={-1} aria-hidden="true" accept={kind === 'image' ? '.png,.jpg,.jpeg,.webp,.avif,.gif' : '.png,.jpg,.jpeg,.webp,.avif,.gif,.mp4,.m4v,.webm'}
      onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void start(f); }} />
  );
  return { progress, open: () => input.current?.click(), inputEl };
}

function ImageField({ field, value, onChange, error, large }: WidgetProps<string> & { large?: boolean }) {
  const [picker, setPicker] = useState(false);
  const up = useDirectUpload((m) => onChange(m.url), 'image');
  const id = fieldId(field.key);
  return (
    <FieldShell label={field.label} id={id} hint={field.help || 'An uploaded file (/api/media/…) or a site path (/assets/…).'} error={error} required={field.required}>
      <div className={`flex gap-3 ${large ? 'flex-col' : 'flex-col sm:flex-row'}`}>
        <MediaPreview src={value} className={`shrink-0 overflow-hidden rounded-lg border border-line ${large ? 'aspect-[16/9] w-full max-w-2xl' : 'aspect-[4/3] w-full sm:w-40'}`} />
        <div className="min-w-0 flex-1 space-y-2">
          <input id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder="/api/media/… or /assets/…" spellCheck={false}
            aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : `${id}-hint`} className={`${inputClass} h-9 font-mono text-xs`} />
          <div className="flex flex-wrap gap-2">
            <AButton size="sm" icon={<Library size={14} aria-hidden="true" />} onClick={() => setPicker(true)}>Choose from library</AButton>
            <AButton size="sm" icon={<Upload size={14} aria-hidden="true" />} onClick={up.open} loading={up.progress !== null}>
              {up.progress !== null ? `Uploading ${Math.round(up.progress * 100)}%` : 'Upload'}
            </AButton>
            {value && <AButton size="sm" variant="ghost" icon={<X size={14} aria-hidden="true" />} onClick={() => onChange('')}>Remove</AButton>}
          </div>
          {up.inputEl}
        </div>
      </div>
      <MediaPicker open={picker} kind="image" onClose={() => setPicker(false)} onPick={(m) => onChange(m.url)} />
    </FieldShell>
  );
}

// ─────────── gallery ───────────
function GalleryEditor({ field, value, onChange, error }: WidgetProps<GalleryItem[]>) {
  const [picker, setPicker] = useState(false);
  const up = useDirectUpload((m) => onChange([...value, { src: m.url, alt: '' }]));
  const set = (i: number, g: Partial<GalleryItem>) => onChange(value.map((x, j) => (j === i ? { ...x, ...g } : x)));
  return (
    <Group field={field} error={error} actions={<span className="text-xs text-subtle">{value.length}/30</span>}>
      {value.length === 0 && <p className="rounded-lg border border-dashed border-line-strong px-3 py-4 text-center text-sm text-subtle">No gallery items yet.</p>}
      <ol className="space-y-2">
        {value.map((g, i) => (
          <li key={i} className="flex flex-col gap-3 rounded-lg border border-line bg-bg-2/50 p-2.5 sm:flex-row sm:items-start">
            <MediaPreview src={g.src} alt={g.alt} className="aspect-[4/3] w-full shrink-0 overflow-hidden rounded-md border border-line sm:w-32" />
            <div className="min-w-0 flex-1 space-y-2">
              <label className="block">
                <span className="mb-1 block text-[0.7rem] text-subtle">File</span>
                <input value={g.src} onChange={(e) => set(i, { src: e.target.value })} className={`${inputClass} h-8 font-mono text-xs`} spellCheck={false} aria-label={`Gallery item ${i + 1} file path`} />
              </label>
              <label className="block">
                <span className="mb-1 block text-[0.7rem] text-subtle">Alt text {isVideoSrc(g.src) && '(describe the video)'}</span>
                <input value={g.alt} maxLength={200} onChange={(e) => set(i, { alt: e.target.value })} className={`${inputClass} h-8`} aria-label={`Gallery item ${i + 1} alt text`} placeholder="What does it show?" />
              </label>
            </div>
            <RowControls index={i} count={value.length} noun="gallery item" onMove={(d) => onChange(move(value, i, d))} onRemove={() => onChange(value.filter((_, j) => j !== i))} />
          </li>
        ))}
      </ol>
      <div className="mt-2 flex flex-wrap gap-2">
        <AButton size="sm" icon={<Library size={14} aria-hidden="true" />} onClick={() => setPicker(true)} disabled={value.length >= 30}>Add from library</AButton>
        <AButton size="sm" icon={up.progress !== null ? undefined : <Film size={14} aria-hidden="true" />} onClick={up.open} loading={up.progress !== null} disabled={value.length >= 30}>
          {up.progress !== null ? `Uploading ${Math.round(up.progress * 100)}%` : 'Upload image or video'}
        </AButton>
        {up.inputEl}
      </div>
      <MediaPicker open={picker} onClose={() => setPicker(false)} onPick={(m) => onChange([...value, { src: m.url, alt: '' }])} />
    </Group>
  );
}

// ─────────── ref / refs ───────────
function useRefItems(collection?: string) {
  const [items, setItems] = useState<ContentItem[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!collection) return;
    let live = true;
    loadRefItems(collection).then((x) => { if (live) setItems(x); }, () => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [collection]);
  return { items, failed };
}

const refLabel = (item: ContentItem, key: string) => String(item[key] ?? `#${item.id}`) + (item.active === false ? ' (draft)' : '');

function RefSelect({ field, value, onChange, error }: WidgetProps<string>) {
  const { items, failed } = useRefItems(field.ref?.collection);
  return (
    <SelectField id={fieldId(field.key)} label={field.label} value={value} onChange={(e) => onChange(e.target.value)} error={error}
      hint={failed ? 'Could not load the options.' : field.help} required={field.required} disabled={!items}>
      <option value="">{items ? (field.required ? 'Choose…' : 'None') : 'Loading…'}</option>
      {items?.map((i) => <option key={i.id} value={String(i.id)}>{refLabel(i, field.ref!.labelKey)}</option>)}
    </SelectField>
  );
}

function RefsPicker({ field, value, onChange, error }: WidgetProps<number[]>) {
  const { items, failed } = useRefItems(field.ref?.collection);
  const [filter, setFilter] = useState('');
  const key = field.ref!.labelKey;
  const shown = (items ?? []).filter((i) => !filter || refLabel(i, key).toLowerCase().includes(filter.toLowerCase()));
  const selected = (items ?? []).filter((i) => value.includes(i.id));
  const toggle = (id: number) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  return (
    <Group field={field} error={error} actions={<span className="text-xs text-subtle">{value.length} selected</span>}>
      {failed ? <p className="text-sm text-danger">Could not load the options.</p> : !items ? <p className="text-sm text-subtle">Loading…</p> : (
        <div className="rounded-lg border border-line bg-bg-2/50">
          {selected.length > 0 && (
            <ul className="flex flex-wrap gap-1.5 border-b border-line p-2" aria-label={`Selected ${field.label.toLowerCase()}`}>
              {selected.map((i) => (
                <li key={i.id}>
                  <button type="button" onClick={() => toggle(i.id)} aria-label={`Remove ${refLabel(i, key)}`}
                    className="inline-flex items-center gap-1 rounded-full border border-brand/35 bg-brand/12 px-2 py-0.5 text-xs text-brand-soft hover:border-danger/40 hover:text-danger">
                    {refLabel(i, key)} <X size={11} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {items.length > 10 && (
            <div className="border-b border-line p-2">
              <input type="search" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={`Filter ${field.label.toLowerCase()}…`} aria-label={`Filter ${field.label.toLowerCase()}`} className={`${inputClass} h-8`} />
            </div>
          )}
          <div className="grid max-h-56 grid-cols-1 gap-x-4 gap-y-1 overflow-y-auto p-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((i) => (
              <label key={i.id} className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm text-text hover:bg-white/[0.04]">
                <input type="checkbox" checked={value.includes(i.id)} onChange={() => toggle(i.id)} className="h-4 w-4 accent-[var(--color-brand)]" />
                <span className="truncate">{refLabel(i, key)}</span>
              </label>
            ))}
            {!shown.length && <p className="text-sm text-subtle">Nothing matches.</p>}
          </div>
        </div>
      )}
    </Group>
  );
}

// ─────────── dispatcher ───────────
export const WIDE_TYPES = new Set(['textarea', 'list', 'blocks', 'pairs', 'gallery', 'refs', 'image']);

export function FieldEditor({ field, value, onChange, error, large }: { field: FieldSchema; value: FormValue; onChange: (v: FormValue) => void; error?: string; large?: boolean }) {
  const id = fieldId(field.key);
  const autoId = useId();
  switch (field.type) {
    case 'boolean':
      return <Switch id={id} label={field.label} checked={value as boolean} onChange={onChange} hint={field.help} error={error} />;
    case 'number':
      return <TextField id={id} label={field.label} type="number" inputMode="numeric" value={value as string} onChange={(e) => onChange(e.target.value)}
        min={field.min} max={field.max} hint={field.help} error={error} required={field.required} className="max-w-[14rem]" />;
    case 'select':
      return (
        <SelectField id={id} label={field.label} value={value as string} onChange={(e) => onChange(e.target.value)} hint={field.help} error={error} required={field.required}>
          {!field.required && <option value="">None</option>}
          {field.options?.map((o) => <option key={String(o)} value={String(o)}>{String(o)}</option>)}
        </SelectField>
      );
    case 'textarea':
      return <TextArea id={id} label={field.label} value={value as string} onChange={(e) => onChange(e.target.value)} hint={field.help} error={error} required={field.required}
        maxLength={field.max} showCount={!!field.max} rows={field.max && field.max <= 300 ? 3 : 6} />;
    case 'list': {
      const lines = String(value).split('\n').filter((l) => l.trim()).length;
      return (
        <TextArea id={id} label={<>{field.label} <span className="font-normal text-subtle">· one per line · {lines} item{lines === 1 ? '' : 's'}</span></>} value={value as string}
          onChange={(e) => onChange(e.target.value)} error={error}
          hint={field.help && /real/i.test(field.help) ? <span className="inline-flex items-start gap-1.5 text-warning"><AlertTriangle size={13} aria-hidden="true" className="mt-px shrink-0" />{field.help}</span> : field.help && field.help !== 'One per line' ? field.help : undefined} required={field.required} rows={Math.min(10, Math.max(3, lines + 1))} />
      );
    }
    case 'blocks': return <BlocksEditor field={field} value={value as Block[]} onChange={onChange} error={error} />;
    case 'pairs': return <PairsEditor field={field} value={value as string[][]} onChange={onChange} error={error} />;
    case 'gallery': return <GalleryEditor field={field} value={value as GalleryItem[]} onChange={onChange} error={error} />;
    case 'image': return <ImageField field={field} value={value as string} onChange={onChange} error={error} large={large} />;
    case 'ref': return <RefSelect field={field} value={value as string} onChange={onChange} error={error} />;
    case 'refs': return <RefsPicker field={field} value={value as number[]} onChange={onChange} error={error} />;
    default: {
      const isUrl = /url/i.test(field.key) || field.key === 'slug' || field.key === 'pos' || field.key.endsWith('Pos');
      return <TextField id={id || autoId} label={field.label} value={value as string} onChange={(e) => onChange(e.target.value)} hint={field.help || (field.patternHint ? `Use ${field.patternHint}.` : undefined)}
        error={error} required={field.required} maxLength={field.max} showCount={!!field.max && field.max > 40} spellCheck={isUrl ? false : undefined} className={isUrl ? '[&_input]:font-mono [&_input]:text-xs' : ''} />;
    }
  }
}
