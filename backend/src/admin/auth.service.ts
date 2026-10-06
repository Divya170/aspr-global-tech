import { HttpException, HttpStatus, Injectable, Logger, OnModuleDestroy, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import type { Request, Response } from 'express';
import { assertValid, fail } from '../common/errors';
import { EMAIL_RE, str } from '../common/rules';
import { config } from '../config';
import { DatabaseService, Row } from '../database/database.service';
import { MailService } from '../mail/mail.service';
import { passwordReset } from '../mail/templates';
import { ActivityService } from '../ops/activity.service';
import { hashPassword, passwordProblem, verifyPassword } from './passwords';
import { permissionsFor, SessionUser, StaffRole } from './permissions';

export const CSRF_HEADER = 'x-csrf-token';
const COOKIE = config.cookieSecure ? '__Host-aspr_session' : 'aspr_session';
const MAX_FAILED = 5;
const LOCK_MINUTES = 15;
const RESET_MINUTES = 30;

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');
const token = () => randomBytes(32).toString('base64url');
const sqlTime = (d: Date) => d.toISOString().replace('T', ' ').slice(0, 19);

export interface Session { id: string; csrf: string; user: SessionUser }

/**
 * Staff authentication. Passwords are scrypt-hashed; sessions live in the database and are
 * referenced by an opaque httpOnly cookie (only its SHA-256 is stored). Each session carries
 * a CSRF token the admin app must echo on writes. Repeated failures lock an account for
 * 15 minutes, on top of the per-IP rate limit on the login route.
 */
@Injectable()
export class AuthService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('Auth');
  private dummyHash = '';
  private sweeper?: NodeJS.Timeout;

  constructor(private readonly db: DatabaseService, private readonly mail: MailService, private readonly activity: ActivityService) {}

  async onModuleInit(): Promise<void> {
    this.dummyHash = await hashPassword(randomBytes(16).toString('hex'));
    await this.bootstrapFirstAdmin();
    this.sweeper = setInterval(() => {
      this.db.run("DELETE FROM sessions WHERE expires_at < datetime('now')");
      this.db.run("DELETE FROM password_resets WHERE expires_at < datetime('now', '-1 day')");
    }, 60 * 60_000);
    this.sweeper.unref();
  }

  onModuleDestroy(): void {
    if (this.sweeper) clearInterval(this.sweeper);
  }

  /** Creates the first super admin from ADMIN_EMAIL / ADMIN_PASSWORD when no staff account exists. */
  private async bootstrapFirstAdmin(): Promise<void> {
    if (this.db.get("SELECT 1 FROM users WHERE kind = 'staff' LIMIT 1")) return;
    const problem = passwordProblem(config.adminPassword);
    if (config.isProd && (config.adminPassword === 'change-me-aspr' || problem)) {
      throw new Error(`Refusing to start: set ADMIN_EMAIL and a strong ADMIN_PASSWORD (12+ characters) in .env to create the first admin account.${problem ? ' ' + problem : ''}`);
    }
    this.db.run("INSERT INTO users (email, name, password_hash, role, password_changed_at) VALUES (?, ?, ?, 'super_admin', datetime('now'))",
      [config.adminEmail.toLowerCase(), config.adminName, await hashPassword(config.adminPassword)]);
    this.logger.log(`Created the first super admin: ${config.adminEmail}`);
    if (config.adminPassword === 'change-me-aspr') this.logger.warn('The first admin uses the default password. Change it in the admin under Account.');
  }

  // ─────────── sign in / out ───────────

  async login(rawEmail: unknown, rawPassword: unknown, req: Request, res: Response) {
    const email = str(rawEmail).toLowerCase();
    const password = typeof rawPassword === 'string' ? rawPassword : '';
    if (!EMAIL_RE.test(email) || !password) assertValid({ ...(!EMAIL_RE.test(email) && { email: 'Enter your email address.' }), ...(!password && { password: 'Enter your password.' }) });

    const u = this.db.get("SELECT * FROM users WHERE email = ? AND kind = 'staff'", [email]);
    if (u?.locked_until && new Date(u.locked_until + 'Z') > new Date()) {
      throw new HttpException({ statusCode: 429, message: `Too many failed attempts. Try again in ${LOCK_MINUTES} minutes, or reset your password.` }, HttpStatus.TOO_MANY_REQUESTS);
    }
    const ok = await verifyPassword(password, u?.password_hash || this.dummyHash);
    if (!u || !ok || u.status !== 'active') {
      if (u && !ok) {
        const failed = u.failed_logins + 1;
        const lock = failed >= MAX_FAILED ? sqlTime(new Date(Date.now() + LOCK_MINUTES * 60_000)) : null;
        this.db.run('UPDATE users SET failed_logins = ?, locked_until = ? WHERE id = ?', [lock ? 0 : failed, lock, u.id]);
        if (lock) this.activity.log(null, { action: 'auth.locked', entity: 'user', entityId: u.id, summary: `Account locked after ${MAX_FAILED} failed sign-ins` }, req.ip);
      }
      throw new UnauthorizedException(u && ok ? 'This account is disabled. Ask an admin to re-enable it.' : 'That email and password don’t match.');
    }
    this.db.run("UPDATE users SET failed_logins = 0, locked_until = NULL, last_login_at = datetime('now') WHERE id = ?", [u.id]);
    const session = this.createSession(u.id, req, res);
    const user = this.toUser(u);
    this.activity.log(user, { action: 'auth.login', entity: 'user', entityId: u.id, summary: 'Signed in' }, req.ip);
    return { user: this.profile(user), csrfToken: session.csrf, expiresAt: session.expiresAt };
  }

  logout(req: Request, res: Response) {
    if (req.sessionId) this.db.run('DELETE FROM sessions WHERE id = ?', [req.sessionId]);
    this.activity.log(req.user, { action: 'auth.logout', entity: 'user', entityId: req.user?.id, summary: 'Signed out' }, req.ip);
    this.clearCookie(res);
    return { ok: true };
  }

  private createSession(userId: number, req: Request, res: Response) {
    const raw = token();
    const csrf = token();
    const expires = new Date(Date.now() + config.sessionTtlHours * 3600_000);
    this.db.run('INSERT INTO sessions (id, user_id, csrf, ip, user_agent, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
      [sha256(raw), userId, csrf, req.ip || null, String(req.headers['user-agent'] || '').slice(0, 300), sqlTime(expires)]);
    res.cookie(COOKIE, raw, { httpOnly: true, secure: config.cookieSecure, sameSite: 'strict', path: '/', expires });
    return { csrf, expiresAt: expires.toISOString() };
  }

  private clearCookie(res: Response) {
    res.clearCookie(COOKIE, { httpOnly: true, secure: config.cookieSecure, sameSite: 'strict', path: '/' });
  }

  // ─────────── per-request checks ───────────

  sessionFromRequest(req: Request): Session {
    const raw = readCookie(req.headers.cookie, COOKIE);
    if (!raw) throw new UnauthorizedException('Please sign in.');
    const s = this.db.get(`SELECT s.id, s.csrf, s.last_seen_at, u.id AS uid, u.name, u.email, u.role, u.status
      FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ? AND s.expires_at > datetime('now')`, [sha256(raw)]);
    if (!s || s.status !== 'active') throw new UnauthorizedException('Your session has ended. Please sign in again.');
    if (Date.now() - new Date(s.last_seen_at + 'Z').getTime() > 5 * 60_000) {
      this.db.run("UPDATE sessions SET last_seen_at = datetime('now') WHERE id = ?", [s.id]);
    }
    return { id: s.id, csrf: s.csrf, user: { id: s.uid, name: s.name, email: s.email, role: s.role } };
  }

  csrfMatches(expected: string, given: string | undefined): boolean {
    if (!given) return false;
    const a = Buffer.from(expected), b = Buffer.from(given);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  me(req: Request) {
    const s = this.sessionFromRequest(req);
    return { user: this.profile(s.user), csrfToken: s.csrf };
  }

  // ─────────── passwords ───────────

  async changePassword(user: SessionUser, sessionId: string, body: Row, ip?: string) {
    const u = this.db.get('SELECT password_hash, email FROM users WHERE id = ?', [user.id])!;
    if (!(await verifyPassword(String(body.currentPassword ?? ''), u.password_hash))) assertValid({ currentPassword: 'Your current password is not right.' });
    const problem = passwordProblem(body.newPassword, u.email);
    if (problem) assertValid({ newPassword: problem });
    this.db.run("UPDATE users SET password_hash = ?, password_changed_at = datetime('now'), updated_at = datetime('now') WHERE id = ?", [await hashPassword(body.newPassword), user.id]);
    this.db.run('DELETE FROM sessions WHERE user_id = ? AND id <> ?', [user.id, sessionId]);
    this.activity.log(user, { action: 'auth.password_changed', entity: 'user', entityId: user.id, summary: 'Changed their password' }, ip);
    return { ok: true };
  }

  /** Always answers the same way, so it cannot be used to find out which emails have accounts. */
  requestReset(rawEmail: unknown, ip?: string) {
    const email = str(rawEmail).toLowerCase();
    if (!EMAIL_RE.test(email)) assertValid({ email: 'Enter your email address.' });
    const u = this.db.get("SELECT id, name, email FROM users WHERE email = ? AND kind = 'staff' AND status = 'active'", [email]);
    if (u) {
      const raw = token();
      this.db.run('DELETE FROM password_resets WHERE user_id = ?', [u.id]);
      this.db.run('INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES (?, ?, ?)',
        [sha256(raw), u.id, sqlTime(new Date(Date.now() + RESET_MINUTES * 60_000))]);
      this.mail.send('password-reset', u.email, passwordReset({ name: u.name, link: `${config.siteUrl}/admin/reset-password?token=${raw}`, minutes: RESET_MINUTES }));
      this.activity.log(null, { action: 'auth.reset_requested', entity: 'user', entityId: u.id, summary: 'Password reset requested' }, ip);
    }
    return { ok: true, message: 'If that email belongs to a staff account, a reset link is on its way. It expires in 30 minutes.' };
  }

  async resetPassword(body: Row, ip?: string) {
    const raw = str(body.token);
    const r = raw && this.db.get(`SELECT p.user_id, u.email FROM password_resets p JOIN users u ON u.id = p.user_id
      WHERE p.token_hash = ? AND p.used_at IS NULL AND p.expires_at > datetime('now')`, [sha256(raw)]);
    if (!r) fail({ token: 'This reset link is invalid or has expired. Request a new one.' });
    const problem = passwordProblem(body.newPassword, r.email);
    if (problem) assertValid({ newPassword: problem });
    const hash = await hashPassword(body.newPassword);
    this.db.tx(() => {
      this.db.run("UPDATE password_resets SET used_at = datetime('now') WHERE token_hash = ?", [sha256(raw)]);
      this.db.run("UPDATE users SET password_hash = ?, failed_logins = 0, locked_until = NULL, password_changed_at = datetime('now') WHERE id = ?", [hash, r.user_id]);
      this.db.run('DELETE FROM sessions WHERE user_id = ?', [r.user_id]);
    });
    this.activity.log(null, { action: 'auth.password_reset', entity: 'user', entityId: r.user_id, summary: 'Password reset by email link' }, ip);
    return { ok: true };
  }

  // ─────────── helpers ───────────

  toUser(u: Row): SessionUser {
    return { id: u.id, name: u.name, email: u.email, role: u.role as StaffRole };
  }

  profile(u: SessionUser) {
    return { ...u, permissions: permissionsFor(u.role) };
  }

  revokeSessions(userId: number): void {
    this.db.run('DELETE FROM sessions WHERE user_id = ?', [userId]);
  }
}

export function readCookie(header: string | undefined, name: string): string | null {
  for (const part of String(header || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) {
      try { return decodeURIComponent(part.slice(i + 1).trim()); } catch { return null; }
    }
  }
  return null;
}
