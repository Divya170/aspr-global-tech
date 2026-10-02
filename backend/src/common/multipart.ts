import { discard } from '../uploads/upload.options';
import { ValidationFailed } from './errors';

/** Multipart submissions carry their fields as JSON in a `data` part (files in `files`). */
export function parseDataField(body: Record<string, unknown> | undefined, files?: Express.Multer.File[]): Record<string, unknown> {
  const raw = body?.data;
  if (typeof raw !== 'string') return body || {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
  } catch {
    /* fall through */
  }
  discard(files);
  throw new ValidationFailed({}, 'The form data could not be read. Please try again.');
}

/** Runs a handler; if it throws, uploaded files are removed so rejected submissions leave no trace. */
export function withUploads<T>(files: Express.Multer.File[] | undefined, fn: () => T): T {
  try {
    return fn();
  } catch (e) {
    discard(files);
    throw e;
  }
}
