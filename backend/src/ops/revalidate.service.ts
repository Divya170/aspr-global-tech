import { Injectable, Logger } from '@nestjs/common';
import { config } from '../config';

/**
 * Tells the Next.js website to drop its cached content after an admin edit, so changes show
 * on the next page load. Fire-and-forget: if the call fails, the cache expires on its own
 * within a few minutes.
 */
@Injectable()
export class RevalidateService {
  private readonly logger = new Logger('Revalidate');
  private timer: NodeJS.Timeout | null = null;

  /** Debounced: a burst of edits (e.g. reordering) triggers one refresh. */
  content(): void {
    if (!config.revalidateSecret) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      fetch(`${config.webInternalUrl}/internal/revalidate`, {
        method: 'POST', headers: { 'x-revalidate-secret': config.revalidateSecret }, signal: AbortSignal.timeout(5000),
      }).then((r) => { if (!r.ok) this.logger.warn(`Website refused revalidation (${r.status})`); })
        .catch((e) => this.logger.warn(`Website not reachable for revalidation: ${(e as Error).message}`));
    }, 300);
    this.timer.unref?.();
  }
}
