import { SetMetadata } from '@nestjs/common';

export const STAFF_ROLES = ['super_admin', 'admin', 'manager', 'editor'] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const ROLE_LABELS: Record<StaffRole, string> = {
  super_admin: 'Super admin', admin: 'Admin', manager: 'Manager', editor: 'Editor',
};

/**
 * What each role may do. Super admins and admins run everything; managers work the sales
 * side (leads, applications, subscribers, chat); editors manage website content.
 * Only a super admin can create, change or remove another super admin.
 */
export const PERMISSIONS = {
  dashboard: ['super_admin', 'admin', 'manager', 'editor'],
  leads: ['super_admin', 'admin', 'manager'],
  'leads.delete': ['super_admin', 'admin'],
  applications: ['super_admin', 'admin', 'manager'],
  subscribers: ['super_admin', 'admin', 'manager'],
  chat: ['super_admin', 'admin', 'manager'],
  content: ['super_admin', 'admin', 'editor'],
  media: ['super_admin', 'admin', 'editor'],
  settings: ['super_admin', 'admin'],
  users: ['super_admin', 'admin'],
  activity: ['super_admin', 'admin', 'manager'],
} satisfies Record<string, StaffRole[]>;
export type Permission = keyof typeof PERMISSIONS;

export interface SessionUser { id: number; name: string; email: string; role: StaffRole }

export const can = (user: Pick<SessionUser, 'role'> | null | undefined, perm: Permission): boolean =>
  !!user && (PERMISSIONS[perm] as readonly string[]).includes(user.role);

export const permissionsFor = (role: StaffRole): Permission[] =>
  (Object.keys(PERMISSIONS) as Permission[]).filter((p) => (PERMISSIONS[p] as readonly string[]).includes(role));

export const PERMS_KEY = 'aspr:perms';
/** Route (or controller) requires every listed permission. Routes under AdminGuard without @Perm need only a valid session. */
export const Perm = (...perms: Permission[]) => SetMetadata(PERMS_KEY, perms);

declare module 'express-serve-static-core' {
  interface Request { user?: SessionUser; sessionId?: string }
}
