'use client';

import { Check, Copy, Film, Trash2, UploadCloud, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react';
import { adminApi, errorMessage, uploadFile } from '@/lib/admin/api';
import { formatBytes, formatDate } from '@/lib/admin/format';
import { useDebounced, useResource } from '@/lib/admin/hooks';
import type { MediaItem, Paged } from '@/lib/admin/types';
import { AButton, IconButton } from '../ui/Button';
import { SearchInput, Select } from '../ui/Field';
import { ConfirmDialog, Modal } from '../ui/Modal';
import { Pagination } from '../ui/Pagination';
import { EmptyState, ErrorState, Skeleton } from '../ui/States';
import { useToast } from '../ui/Toast';

const IMAGE_EXT = ['png', 'jpg', 'jpeg', 'webp', 'avif', 'gif'];
const VIDEO_EXT = ['mp4', 'm4v', 'webm'];
const MAX_IMAGE = 8 * 1024 * 1024;
const MAX_VIDEO = 60 * 1024 * 1024;
export const ACCEPT = '.png,.jpg,.jpeg,.webp,.avif,.gif,.mp4,.m4v,.webm';

/** Same limits the API enforces, checked before uploading so nobody waits for a doomed upload. */
export function checkFile(file: File, kind?: 'image' | 'video'): string | null {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  const isImage = IMAGE_EXT.includes(ext), isVideo = VIDEO_EXT.includes(ext);
  if (!isImage && !isVideo) return `${file.name}: upload an image (PNG, JPG, WebP, AVIF, GIF) or a video (MP4, WebM).`;
  if (kind === 'image' && !isImage) return `${file.name}: choose an image file here.`;
  if (isImage && file.size > MAX_IMAGE) return `${file.name} is ${formatBytes(file.size)}. Images must be 8 MB or smaller — export as WebP to shrink it.`;
  if (isVideo && file.size > MAX_VIDEO) return `${file.name} is ${formatBytes(file.size)}. Videos must be 60 MB or smaller.`;
  return null;
}

export const isVideoSrc = (src: string) => /\.(mp4|m4v|webm)$/i.test(src);

interface UploadRow { key: number; name: string; progress: number; error?: string; abort?: () => void; done?: boolean }

/** Uploads several files one after another, reporting progress per file. */
export function useUploader(onUploaded: (m: MediaItem) => void, kind?: 'image' | 'video') {
  const [rows, setRows] = useState<UploadRow[]>([]);
  const seq = useRef(0);
  const patch = (key: number, p: Partial<UploadRow>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));
  const upload = useCallback(async (files: File[]) => {
    for (const file of files) {
      const key = ++seq.current;
      const problem = checkFile(file, kind);
      setRows((rs) => [...rs, { key, name: file.name, progress: 0, error: problem || undefined }]);
      if (problem) continue;
      const h = uploadFile<MediaItem>('/media', file, (p) => patch(key, { progress: p }));
      patch(key, { abort: h.abort });
      try {
        const m = await h.promise;
        patch(key, { progress: 1, done: true, abort: undefined });
        onUploaded(m);
        setTimeout(() => setRows((rs) => rs.filter((r) => r.key !== key)), 2500);
      } catch (e) {
        patch(key, { error: errorMessage(e), abort: undefined });
      }
    }
  }, [kind, onUploaded]);
  const dismiss = (key: number) => setRows((rs) => rs.filter((r) => r.key !== key));
  return { rows, upload, dismiss };
}

export function UploadProgress({ rows, onDismiss }: { rows: UploadRow[]; onDismiss: (k: number) => void }) {
  if (!rows.length) return null;
  return (
    <ul className="space-y-1.5" aria-label="Uploads">
      {rows.map((r) => (
        <li key={r.key} className={`rounded-lg border px-3 py-2 text-sm ${r.error ? 'border-danger/35 bg-danger/[0.06]' : 'border-line bg-bg-2/60'}`}>
          <div className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-text">{r.name}</span>
            <span className="shrink-0 text-xs tabular-nums text-muted">{r.error ? 'Failed' : r.done ? 'Uploaded' : `${Math.round(r.progress * 100)}%`}</span>
            {r.abort && <IconButton size="sm" label={`Cancel upload of ${r.name}`} onClick={r.abort}><X size={14} aria-hidden="true" /></IconButton>}
            {(r.error || r.done) && <IconButton size="sm" label="Dismiss" onClick={() => onDismiss(r.key)}><X size={14} aria-hidden="true" /></IconButton>}
          </div>
          {r.error ? <p role="alert" className="mt-1 text-xs text-danger">{r.error}</p> : (
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.06]" role="progressbar" aria-label={`Uploading ${r.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(r.progress * 100)}>
              <div className={`h-1 rounded-full transition-[width] ${r.done ? 'bg-success' : 'bg-brand'}`} style={{ width: `${Math.max(3, r.progress * 100)}%` }} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

function Dropzone({ onFiles, accept = ACCEPT, hint }: { onFiles: (f: File[]) => void; accept?: string; hint: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const drop = (e: DragEvent) => { e.preventDefault(); setOver(false); const fs = [...e.dataTransfer.files]; if (fs.length) onFiles(fs); };
  return (
    <div onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={drop}
      className={`flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-6 text-center transition-colors ${over ? 'border-brand-soft bg-brand/10' : 'border-line-strong bg-white/[0.015]'}`}>
      <UploadCloud size={22} aria-hidden="true" className="text-brand-soft" />
      <p className="text-sm text-text">Drag files here, or <button type="button" onClick={() => input.current?.click()} className="font-medium text-brand-soft underline-offset-2 hover:underline">browse</button></p>
      <p className="text-xs text-subtle">{hint}</p>
      <input ref={input} type="file" multiple accept={accept} className="sr-only" tabIndex={-1} aria-hidden="true"
        onChange={(e) => { const fs = [...(e.target.files || [])]; e.target.value = ''; if (fs.length) onFiles(fs); }} />
    </div>
  );
}

function Thumb({ m }: { m: MediaItem }) {
  return m.kind === 'video' ? (
    <div className="relative h-full w-full bg-black">
      <video src={m.url} muted preload="metadata" className="h-full w-full object-cover" />
      <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded bg-black/70 px-1.5 py-0.5 text-[0.65rem] text-white"><Film size={11} aria-hidden="true" />Video</span>
    </div>
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={m.url} alt="" loading="lazy" className="h-full w-full object-cover" />
  );
}

interface LibraryProps {
  mode: 'page' | 'picker';
  /** Picker only: restrict to images or videos. */
  kind?: 'image' | 'video';
  onPick?: (m: MediaItem) => void;
}

/** Grid of uploaded media with search, filter, upload, copy URL and delete. Also used as the picker. */
export function MediaLibrary({ mode, kind, onPick }: LibraryProps) {
  const toast = useToast();
  const [q, setQ] = useState('');
  const debounced = useDebounced(q, 300);
  const [kindFilter, setKindFilter] = useState<string>(kind ?? '');
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [debounced, kindFilter]);
  const list = useResource(() => adminApi.get<Paged<MediaItem>>('/media', { q: debounced, kind: kindFilter, page, pageSize: mode === 'picker' ? 24 : 48 }), [debounced, kindFilter, page]);
  const [copied, setCopied] = useState<number | null>(null);
  const [toDelete, setToDelete] = useState<MediaItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const onUploaded = useCallback((m: MediaItem) => {
    list.setData((d) => d && (page === 1 && (!kindFilter || kindFilter === m.kind) ? { ...d, items: [m, ...d.items], total: d.total + 1 } : d));
    toast.success(`${m.name} uploaded.`);
  }, [list, page, kindFilter, toast]);
  const uploader = useUploader(onUploaded, kind);

  const copy = async (m: MediaItem) => {
    try {
      await navigator.clipboard.writeText(m.url);
      setCopied(m.id);
      setTimeout(() => setCopied((c) => (c === m.id ? null : c)), 1800);
    } catch { toast.error(`Couldn't copy. The URL is ${m.url}`); }
  };
  const remove = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await adminApi.del(`/media/${toDelete.id}`);
      list.setData((d) => d && { ...d, items: d.items.filter((x) => x.id !== toDelete.id), total: d.total - 1 });
      toast.success(`${toDelete.name} deleted.`);
      setToDelete(null);
    } catch (e) { toast.error(errorMessage(e)); }
    finally { setDeleting(false); }
  };

  return (
    <div className="space-y-4">
      <Dropzone onFiles={uploader.upload} accept={kind === 'image' ? '.png,.jpg,.jpeg,.webp,.avif,.gif' : ACCEPT}
        hint={kind === 'image' ? 'PNG, JPG, WebP, AVIF or GIF · up to 8 MB' : 'Images up to 8 MB (PNG, JPG, WebP, AVIF, GIF) · videos up to 60 MB (MP4, WebM)'} />
      <UploadProgress rows={uploader.rows} onDismiss={uploader.dismiss} />
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput label="Search media" placeholder="Search by file name…" value={q} onChange={(e) => setQ(e.target.value)} className="w-full sm:w-64" />
        {!kind && (
          <Select aria-label="Type" value={kindFilter} onChange={(e) => setKindFilter(e.target.value)} className="!w-auto">
            <option value="">Images & videos</option>
            <option value="image">Images</option>
            <option value="video">Videos</option>
          </Select>
        )}
        {list.data && <p className="ml-auto text-xs text-subtle">{list.data.total} file{list.data.total === 1 ? '' : 's'}</p>}
      </div>
      {list.error ? <ErrorState error={list.error} onRetry={list.reload} />
        : !list.data ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{Array.from({ length: 10 }, (_, i) => <Skeleton key={i} className="aspect-[4/3] rounded-lg" />)}</div>
        ) : !list.data.items.length ? (
          <EmptyState title={q || kindFilter ? 'Nothing matches' : 'No uploads yet'}>{q || kindFilter ? 'Try another search.' : 'Upload images and videos above, then use them in content.'}</EmptyState>
        ) : (
          <>
            <ul className={`grid grid-cols-2 gap-3 sm:grid-cols-3 ${mode === 'page' ? 'lg:grid-cols-4 xl:grid-cols-6' : 'md:grid-cols-4'}`}>
              {list.data.items.map((m) => (
                <li key={m.id} className="group overflow-hidden rounded-lg border border-line bg-surface-2">
                  {mode === 'picker' ? (
                    <button type="button" onClick={() => onPick?.(m)} className="block aspect-[4/3] w-full overflow-hidden" aria-label={`Use ${m.name}`}><Thumb m={m} /></button>
                  ) : (
                    <a href={m.url} target="_blank" rel="noopener noreferrer" className="block aspect-[4/3] overflow-hidden" aria-label={`Open ${m.name} in a new tab`}><Thumb m={m} /></a>
                  )}
                  <div className="px-2.5 py-2">
                    <p className="truncate text-xs text-text" title={m.name}>{m.name}</p>
                    <p className="text-[0.7rem] text-subtle">{formatBytes(m.size)} · {formatDate(m.createdAt)}</p>
                    <div className="mt-1.5 flex items-center gap-1">
                      {mode === 'picker' ? (
                        <AButton size="xs" variant="primary" onClick={() => onPick?.(m)}>Use this</AButton>
                      ) : (
                        <>
                          <AButton size="xs" variant="ghost" onClick={() => copy(m)} icon={copied === m.id ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />} aria-label={`Copy URL of ${m.name}`}>
                            {copied === m.id ? 'Copied' : 'Copy URL'}
                          </AButton>
                          <IconButton size="sm" label={`Delete ${m.name}`} onClick={() => setToDelete(m)} className="ml-auto hover:!text-danger"><Trash2 size={14} aria-hidden="true" /></IconButton>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="-mx-4 sm:-mx-0">
              <Pagination page={list.data.page} pages={list.data.pages} total={list.data.total} pageSize={list.data.pageSize} noun="files" onPage={setPage} />
            </div>
          </>
        )}
      <ConfirmDialog open={!!toDelete} title={`Delete ${toDelete?.name ?? 'file'}?`} busy={deleting} onCancel={() => setToDelete(null)} onConfirm={remove}
        description="If a page still uses this file, the image will break there. Check before deleting." />
    </div>
  );
}

/** Media library in a dialog; resolves with the chosen item. */
export function MediaPicker({ open, onClose, onPick, kind }: { open: boolean; onClose: () => void; onPick: (m: MediaItem) => void; kind?: 'image' | 'video' }) {
  return (
    <Modal open={open} onClose={onClose} title={kind === 'image' ? 'Choose an image' : 'Choose from the media library'} description="Pick an uploaded file, or upload a new one." size="xl">
      {open && <MediaLibrary mode="picker" kind={kind} onPick={(m) => { onPick(m); onClose(); }} />}
    </Modal>
  );
}
