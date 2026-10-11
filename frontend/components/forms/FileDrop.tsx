'use client';

import { FileText, Paperclip, UploadCloud, X } from 'lucide-react';
import { useId, useRef, useState, type DragEvent } from 'react';
import { UPLOAD } from '@/lib/site';
import { fileError } from '@/lib/validate';
import { describedBy, FieldMessages } from './Field';

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1048576).toFixed(n < 10485760 ? 1 : 0)} MB`;
}

/**
 * Drag & drop or click to attach files. Files are checked against the same limits as the API
 * (count, size, type); rejected files are named in an announced message and never added.
 * `id` is the focus target for error links (the "Choose files" button). The zone glows, breathes
 * and lifts its icon while files are dragged over it (.fm-drop in forms.css).
 */
export function FileDrop({ id, label = 'Attachments', files, onChange, error, optional = true, hint }: {
  id: string; label?: string; files: File[]; onChange: (files: File[]) => void; error?: string; optional?: boolean; hint?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [rejected, setRejected] = useState('');
  const [status, setStatus] = useState('');
  const labelId = useId();
  const shownError = rejected || error;
  const hintText = hint ?? `Up to ${UPLOAD.maxFiles} files, ${Math.round(UPLOAD.maxBytes / 1048576)} MB each. PDF, Word, Excel, PowerPoint, images or ZIP.`;

  function add(list: FileList | File[] | null) {
    if (!list) return;
    const incoming = Array.from(list);
    const problems: string[] = [];
    const next = [...files];
    for (const f of incoming) {
      const err = fileError(f, UPLOAD.ext, UPLOAD.maxBytes);
      if (err) { problems.push(err); continue; }
      if (next.some((x) => x.name === f.name && x.size === f.size)) continue;
      if (next.length >= UPLOAD.maxFiles) { problems.push(`You can attach up to ${UPLOAD.maxFiles} files.`); break; }
      next.push(f);
    }
    const added = next.length - files.length;
    setRejected(problems.join(' '));
    setStatus(added ? `${added} file${added === 1 ? '' : 's'} added. ${next.length} attached.` : '');
    if (added) onChange(next);
    if (input.current) input.current.value = '';
  }

  function remove(i: number) {
    const f = files[i];
    onChange(files.filter((_, j) => j !== i));
    setRejected('');
    setStatus(`${f.name} removed.`);
  }

  const onDrop = (e: DragEvent) => { e.preventDefault(); setOver(false); add(e.dataTransfer.files); };

  return (
    <div role="group" aria-labelledby={labelId}>
      <p id={labelId} className="mb-2 text-sm font-medium text-text">
        {label}{optional && <span className="ml-1.5 font-normal text-subtle">(optional)</span>}
      </p>
      <div
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        onClick={(e) => { if (e.target === e.currentTarget) input.current?.click(); }}
        className={[
          'fm-drop flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-4 py-8 text-center sm:flex-row sm:gap-5 sm:px-6 sm:text-left',
          over ? 'is-over border-brand-soft bg-brand/10' : shownError ? 'border-danger/70 bg-surface' : 'border-line-strong bg-surface hover:border-brand-soft/50',
        ].join(' ')}
      >
        <span aria-hidden="true" className="fm-drop-ring" />
        <span aria-hidden="true" className="fm-drop-icon pointer-events-none grid size-12 shrink-0 place-items-center rounded-2xl border border-line-strong bg-surface text-brand shadow-[inset_0_1px_0_color-mix(in_srgb,var(--color-surface)_6%,transparent)]">
          <UploadCloud size={21} strokeWidth={1.7} />
        </span>
        <div className="min-w-0 flex-1 text-sm text-muted">
          <span className="hidden sm:inline">Drag files here, or </span>
          <button
            id={id} type="button" onClick={() => input.current?.click()}
            aria-describedby={describedBy(id, hintText, shownError)}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-1 font-medium text-brand underline-offset-4 hover:text-text hover:underline sm:min-h-0"
          >
            <Paperclip aria-hidden="true" size={15} />choose files<span className="sr-only"> to attach</span>
          </button>
        </div>
        <input
          ref={input} type="file" multiple accept={UPLOAD.accept} tabIndex={-1} aria-hidden="true" className="sr-only"
          onChange={(e) => add(e.target.files)}
        />
      </div>

      {files.length > 0 && (
        <ul className="mt-3 space-y-2" aria-label="Attached files">
          {files.map((f, i) => (
            <li key={`${f.name}-${f.size}`} className="fm-file fm-err flex items-center gap-3 rounded-xl border border-line bg-surface py-1.5 pl-1.5 pr-1.5">
              <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand/12 text-brand"><FileText size={16} /></span>
              <span className="min-w-0 flex-1 truncate text-sm text-text">{f.name}</span>
              <span className="shrink-0 font-mono text-xs text-subtle">{formatBytes(f.size)}</span>
              <button
                type="button" onClick={() => remove(i)} aria-label={`Remove ${f.name}`}
                className="grid size-11 shrink-0 place-items-center rounded-lg text-subtle transition-colors hover:bg-surface-3 hover:text-text"
              >
                <X aria-hidden="true" size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <FieldMessages id={id} hint={hintText} error={shownError} />
      <p role="status" className="sr-only">{status}</p>
      {rejected && <p role="alert" className="sr-only">{rejected}</p>}
    </div>
  );
}
