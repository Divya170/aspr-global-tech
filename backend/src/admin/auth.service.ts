import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { config } from '../config';

/**
 * Stateless admin sessions: a signed, expiring token (HMAC-SHA256).
 * Single shared admin password from ADMIN_PASSWORD.
 */
@Injectable()
export class AuthService {
  private sign(payload: string): string {
    return createHmac('sha256', config.adminTokenSecret).update(payload).digest('base64url');
  }

  private safeEqual(a: string, b: string): boolean {
    const x = Buffer.from(a), y = Buffer.from(b);
    return x.length === y.length && timingSafeEqual(x, y);
  }

  login(password: unknown): { token: string; expiresAt: string } {
    if (typeof password !== 'string' || !this.safeEqual(password, config.adminPassword)) {
      throw new UnauthorizedException('That password is not right.');
    }
    const exp = Date.now() + config.adminTokenTtlHours * 3600_000;
    const payload = Buffer.from(JSON.stringify({ sub: 'admin', exp })).toString('base64url');
    return { token: `${payload}.${this.sign(payload)}`, expiresAt: new Date(exp).toISOString() };
  }

  verify(token: string | undefined): { sub: string; exp: number } {
    const [payload, sig] = String(token || '').split('.');
    if (!payload || !sig || !this.safeEqual(sig, this.sign(payload))) throw new UnauthorizedException('Please sign in again.');
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data.exp || data.exp < Date.now()) throw new UnauthorizedException('Your session expired — please sign in again.');
    return data;
  }
}
