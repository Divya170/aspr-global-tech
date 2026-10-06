import * as fs from 'fs';

/**
 * Allowed upload types, checked twice: by extension when the upload starts, and by the file's
 * first bytes ("magic number") once it is on disk. A renamed executable or HTML file fails the
 * second check. SVG is deliberately excluded (it can carry scripts).
 */
interface FileType { ext: string[]; mime: string; magic: (b: Buffer) => boolean }

const starts = (sig: number[], offset = 0) => (b: Buffer) => sig.every((x, i) => b[offset + i] === x);
const ZIP = starts([0x50, 0x4b, 0x03, 0x04]);
const OLE = starts([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]); // legacy .doc/.xls/.ppt

const TYPES: Record<string, FileType> = {
  pdf: { ext: ['pdf'], mime: 'application/pdf', magic: starts([0x25, 0x50, 0x44, 0x46]) },
  png: { ext: ['png'], mime: 'image/png', magic: starts([0x89, 0x50, 0x4e, 0x47]) },
  jpg: { ext: ['jpg', 'jpeg'], mime: 'image/jpeg', magic: starts([0xff, 0xd8, 0xff]) },
  webp: { ext: ['webp'], mime: 'image/webp', magic: (b) => starts([0x52, 0x49, 0x46, 0x46])(b) && starts([0x57, 0x45, 0x42, 0x50], 8)(b) },
  avif: { ext: ['avif'], mime: 'image/avif', magic: (b) => b.subarray(4, 12).toString('latin1').startsWith('ftypavi') },
  gif: { ext: ['gif'], mime: 'image/gif', magic: starts([0x47, 0x49, 0x46, 0x38]) },
  mp4: { ext: ['mp4', 'm4v'], mime: 'video/mp4', magic: (b) => b.subarray(4, 8).toString('latin1') === 'ftyp' },
  webm: { ext: ['webm'], mime: 'video/webm', magic: starts([0x1a, 0x45, 0xdf, 0xa3]) },
  doc: { ext: ['doc'], mime: 'application/msword', magic: OLE },
  docx: { ext: ['docx'], mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', magic: ZIP },
  xls: { ext: ['xls'], mime: 'application/vnd.ms-excel', magic: OLE },
  xlsx: { ext: ['xlsx'], mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', magic: ZIP },
  ppt: { ext: ['ppt'], mime: 'application/vnd.ms-powerpoint', magic: OLE },
  pptx: { ext: ['pptx'], mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', magic: ZIP },
  zip: { ext: ['zip'], mime: 'application/zip', magic: ZIP },
};

const byExt = new Map<string, FileType>();
for (const t of Object.values(TYPES)) for (const e of t.ext) byExt.set(e, t);

/** Client attachments on quote, contact and job forms. */
export const ATTACHMENT_EXT = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'png', 'jpg', 'jpeg', 'webp', 'zip'];
export const IMAGE_EXT = ['png', 'jpg', 'jpeg', 'webp', 'avif', 'gif'];
export const VIDEO_EXT = ['mp4', 'm4v', 'webm'];

export const extOf = (name: string) => (name.split('.').pop() || '').toLowerCase();
export const mimeFor = (ext: string) => byExt.get(ext)?.mime || 'application/octet-stream';

/** True when the file on disk really is the type its extension claims. */
export function contentMatches(path: string, ext: string): boolean {
  const t = byExt.get(ext);
  if (!t) return false;
  const fd = fs.openSync(path, 'r');
  try {
    const buf = Buffer.alloc(16);
    const n = fs.readSync(fd, buf, 0, 16, 0);
    return n >= 4 && t.magic(buf);
  } finally {
    fs.closeSync(fd);
  }
}
