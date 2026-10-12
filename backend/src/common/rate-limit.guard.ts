import { CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import type { Request } from 'express';

const buckets = new Map<string, number[]>();
/** Raises every limit (e.g. 10 in the test suite). Leave unset in production. */
const MULTIPLIER = Math.max(1, Number(process.env.RATE_LIMIT_MULTIPLIER) || 1);

/**
 * Small in-memory sliding-window limiter for public form endpoints
 * (per client IP + bucket). Good enough for a single API instance; swap for
 * a shared store if the API is ever scaled horizontally.
 * Used as an instance: @UseGuards(new RateLimitGuard('enquiry', 8, 600_000)).
 */
export class RateLimitGuard implements CanActivate {
  constructor(private readonly bucket: string, private readonly limit: number, private readonly windowMs: number) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request>();
    const key = `${this.bucket}:${clientIp(req)}`;
    const now = Date.now();
    const hits = (buckets.get(key) || []).filter((t) => now - t < this.windowMs);
    if (hits.length >= this.limit * MULTIPLIER) {
      throw new HttpException({ statusCode: 429, message: 'Too many submissions from this connection — please try again in a few minutes.' }, HttpStatus.TOO_MANY_REQUESTS);
    }
    hits.push(now);
    buckets.set(key, hits);
    if (buckets.size > 5000) for (const [k, v] of buckets) if (!v.some((t) => now - t < this.windowMs)) buckets.delete(k);
    return true;
  }
}

export function clientIp(req: Request): string {
  return (req.ip || req.socket?.remoteAddress || 'unknown').replace(/^::ffff:/, '');
}
