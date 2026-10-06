import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { assertValid } from '../common/errors';
import { checkEmail, Errors, str } from '../common/rules';
import { DatabaseService, Row } from '../database/database.service';
import { ActivityService } from '../ops/activity.service';
import { AuthService } from './auth.service';
import { hashPassword, passwordProblem } from './passwords';
import { ROLE_LABELS, SessionUser, STAFF_ROLES, StaffRole } from './permissions';

/** Staff accounts. Admins manage everyone except super admins; only a super admin manages super admins. */
@Injectable()
export class UsersService {
  constructor(private readonly db: DatabaseService, private readonly auth: AuthService, private readonly activity: ActivityService) {}

  private map(r: Row) {
    return {
      id: r.id, name: r.name, email: r.email, role: r.role, roleLabel: ROLE_LABELS[r.role as StaffRole] ?? r.role, status: r.status,
      locked: !!(r.locked_until && new Date(r.locked_until + 'Z') > new Date()), lastLoginAt: r.last_login_at, createdAt: r.created_at,
    };
  }

  list() {
    return { items: this.db.all("SELECT * FROM users WHERE kind = 'staff' ORDER BY status, name").map((r) => this.map(r)), roles: STAFF_ROLES.map((value) => ({ value, label: ROLE_LABELS[value] })) };
  }

  /** Active staff for "assign to" pickers. */
  options() {
    return this.db.all("SELECT id, name, role FROM users WHERE kind = 'staff' AND status = 'active' ORDER BY name");
  }

  get(id: number) {
    const r = this.db.get("SELECT * FROM users WHERE id = ? AND kind = 'staff'", [id]);
    if (!r) throw new NotFoundException('User not found');
    return r;
  }

  private guardRole(actor: SessionUser, role: string) {
    if (role === 'super_admin' && actor.role !== 'super_admin') throw new ForbiddenException('Only a super admin can manage super admin accounts.');
  }

  private superAdminsLeft(excludingId: number): number {
    return this.db.get<{ n: number }>("SELECT COUNT(*) AS n FROM users WHERE role = 'super_admin' AND status = 'active' AND id <> ?", [excludingId])!.n;
  }

  async create(actor: SessionUser, body: Row, ip?: string) {
    const input = { name: str(body.name), email: str(body.email).toLowerCase(), role: str(body.role), password: body.password };
    const e: Errors = {};
    if (!input.name) e.name = 'Enter a name.';
    checkEmail(e, input.email);
    if (!(STAFF_ROLES as readonly string[]).includes(input.role)) e.role = 'Choose a role.';
    const problem = passwordProblem(input.password, input.email);
    if (problem) e.password = problem;
    if (!e.email && this.db.get('SELECT 1 FROM users WHERE email = ?', [input.email])) e.email = 'There is already an account with this email.';
    assertValid(e);
    this.guardRole(actor, input.role);
    const id = this.db.run("INSERT INTO users (email, name, password_hash, role, password_changed_at) VALUES (?, ?, ?, ?, datetime('now'))",
      [input.email, input.name.slice(0, 120), await hashPassword(input.password as string), input.role]).lastInsertRowid;
    this.activity.log(actor, { action: 'user.created', entity: 'user', entityId: id, summary: `Added ${input.name} as ${ROLE_LABELS[input.role as StaffRole]}` }, ip);
    return this.map(this.get(id));
  }

  async update(actor: SessionUser, id: number, body: Row, ip?: string) {
    const u = this.get(id);
    this.guardRole(actor, u.role);
    const sets: string[] = [], params: unknown[] = [], e: Errors = {}, changes: string[] = [];
    if (body.name !== undefined) {
      const name = str(body.name);
      if (!name) e.name = 'Enter a name.'; else { sets.push('name = ?'); params.push(name.slice(0, 120)); changes.push('name'); }
    }
    if (body.role !== undefined && body.role !== u.role) {
      if (!(STAFF_ROLES as readonly string[]).includes(String(body.role))) e.role = 'Choose a role.';
      else if (id === actor.id) e.role = "You can't change your own role.";
      else if (u.role === 'super_admin' && !this.superAdminsLeft(id)) e.role = 'There must always be at least one super admin.';
      else { this.guardRole(actor, String(body.role)); sets.push('role = ?'); params.push(body.role); changes.push(`role → ${ROLE_LABELS[body.role as StaffRole]}`); }
    }
    if (body.status !== undefined && body.status !== u.status) {
      if (!['active', 'disabled'].includes(String(body.status))) e.status = 'Status must be active or disabled.';
      else if (id === actor.id) e.status = "You can't disable your own account.";
      else if (body.status === 'disabled' && u.role === 'super_admin' && !this.superAdminsLeft(id)) e.status = 'There must always be at least one active super admin.';
      else { sets.push('status = ?'); params.push(body.status); changes.push(String(body.status)); }
    }
    if (body.unlock) { sets.push('failed_logins = 0, locked_until = NULL'); changes.push('unlocked'); }
    if (body.password !== undefined && body.password !== '') {
      const problem = passwordProblem(body.password, u.email);
      if (problem) e.password = problem;
      else { sets.push("password_hash = ?, password_changed_at = datetime('now')"); params.push(await hashPassword(String(body.password))); changes.push('password reset'); }
    }
    assertValid(e);
    if (sets.length) {
      this.db.run(`UPDATE users SET ${sets.join(', ')}, updated_at = datetime('now') WHERE id = ?`, [...params, id]);
      if (body.status === 'disabled' || changes.includes('password reset') || changes.some((c) => c.startsWith('role'))) this.auth.revokeSessions(id);
      this.activity.log(actor, { action: 'user.updated', entity: 'user', entityId: id, summary: `${u.name}: ${changes.join(', ')}` }, ip);
    }
    return this.map(this.get(id));
  }

  remove(actor: SessionUser, id: number, ip?: string) {
    const u = this.get(id);
    this.guardRole(actor, u.role);
    if (id === actor.id) assertValid({ id: "You can't delete your own account." });
    if (u.role === 'super_admin' && !this.superAdminsLeft(id)) assertValid({ id: 'There must always be at least one super admin.' });
    this.db.run('DELETE FROM users WHERE id = ?', [id]);
    this.activity.log(actor, { action: 'user.deleted', entity: 'user', entityId: id, summary: `Removed ${u.name}` }, ip);
    return { deleted: true, id };
  }
}
