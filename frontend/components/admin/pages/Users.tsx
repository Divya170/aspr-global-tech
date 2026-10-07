'use client';

import { KeyRound, Lock, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { adminApi, ApiError, errorMessage } from '@/lib/admin/api';
import { ROLE_INFO } from '@/lib/admin/constants';
import { formatDate, timeAgo } from '@/lib/admin/format';
import { useResource } from '@/lib/admin/hooks';
import type { StaffRole, StaffUser, UsersResponse } from '@/lib/admin/types';
import { useSession } from '../SessionProvider';
import { AdminTable, type Column } from '../ui/AdminTable';
import { AButton, IconButton } from '../ui/Button';
import { SelectField, Switch, TextField } from '../ui/Field';
import { ConfirmDialog, Modal } from '../ui/Modal';
import { Card, CardHeader, PageHeader } from '../ui/Layout';
import { ErrorState, SkeletonRows } from '../ui/States';
import { StatusPill } from '../ui/StatusPill';
import { useToast } from '../ui/Toast';

export function UsersPage() {
  const { user: me } = useSession();
  const toast = useToast();
  const res = useResource(() => adminApi.get<UsersResponse>('/users'), []);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<StaffUser | null>(null);
  const [toDelete, setToDelete] = useState<StaffUser | null>(null);
  const [deleting, setDeleting] = useState(false);
  const roles = res.data?.roles ?? [];
  // Only a super admin may manage super admins.
  const manageable = (u: StaffUser) => me.role === 'super_admin' || u.role !== 'super_admin';

  const remove = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try { await adminApi.del(`/users/${toDelete.id}`); toast.success(`${toDelete.name} removed.`); setToDelete(null); res.reload(); }
    catch (e) { toast.error(e instanceof ApiError && e.fieldErrors ? Object.values(e.fieldErrors)[0] : errorMessage(e)); }
    finally { setDeleting(false); }
  };

  const columns: Column<StaffUser>[] = [
    { key: 'name', header: 'Name', cell: (u) => (
      <div><p className="font-medium text-text">{u.name}{u.id === me.id && <span className="ml-1.5 text-xs font-normal text-subtle">(you)</span>}</p><p className="text-xs text-subtle">{u.email}</p></div>
    ) },
    { key: 'role', header: 'Role', cell: (u) => <span className="text-muted">{u.roleLabel}</span> },
    { key: 'status', header: 'Status', cell: (u) => (
      <span className="flex flex-wrap gap-1">
        <StatusPill tone={u.status === 'active' ? 'success' : 'neutral'}>{u.status === 'active' ? 'Active' : 'Disabled'}</StatusPill>
        {u.locked && <StatusPill tone="warning">Locked</StatusPill>}
      </span>
    ) },
    { key: 'login', header: 'Last sign-in', headerClassName: 'hidden md:table-cell', className: 'hidden md:table-cell whitespace-nowrap text-muted', cell: (u) => u.lastLoginAt ? timeAgo(u.lastLoginAt) : 'Never' },
    { key: 'created', header: 'Added', headerClassName: 'hidden lg:table-cell', className: 'hidden lg:table-cell whitespace-nowrap text-muted', cell: (u) => formatDate(u.createdAt) },
    { key: 'actions', header: <span className="sr-only">Actions</span>, className: 'text-right', cell: (u) => manageable(u) ? (
      <div className="flex justify-end gap-0.5">
        <IconButton size="sm" label={`Edit ${u.name}`} onClick={() => setEditing(u)}><Pencil size={14} aria-hidden="true" /></IconButton>
        {u.id !== me.id && <IconButton size="sm" label={`Remove ${u.name}`} onClick={() => setToDelete(u)} className="hover:!text-danger"><Trash2 size={14} aria-hidden="true" /></IconButton>}
      </div>
    ) : <span className="text-xs text-subtle">Super admin only</span> },
  ];

  return (
    <>
      <PageHeader title="Team" description="Staff accounts for this admin. Everyone signs in with their own email and password."
        actions={<AButton variant="primary" onClick={() => setAdding(true)} icon={<Plus size={15} aria-hidden="true" />}>Add team member</AButton>} />
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <Card>
          {res.error ? <ErrorState error={res.error} onRetry={res.reload} /> : !res.data ? <SkeletonRows rows={4} /> : (
            <AdminTable caption="Staff accounts" columns={columns} rows={res.data.items} rowKey={(u) => u.id}
              mobileCard={(u) => (
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-text">{u.name}{u.id === me.id && <span className="ml-1 text-xs font-normal text-subtle">(you)</span>}</p>
                    <p className="truncate text-xs text-subtle">{u.email}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-1 text-xs text-muted">{u.roleLabel} · <StatusPill tone={u.status === 'active' ? 'success' : 'neutral'}>{u.status === 'active' ? 'Active' : 'Disabled'}</StatusPill>{u.locked && <StatusPill tone="warning">Locked</StatusPill>}</p>
                  </div>
                  {manageable(u) && <IconButton label={`Edit ${u.name}`} onClick={() => setEditing(u)}><Pencil size={15} aria-hidden="true" /></IconButton>}
                </div>
              )} />
          )}
        </Card>
        <Card as="aside" aria-labelledby="roles-help">
          <CardHeader id="roles-help" title="What each role can do" />
          <dl className="space-y-3 p-4 text-sm">
            {(Object.keys(ROLE_INFO) as StaffRole[]).map((r) => (
              <div key={r}><dt className="font-medium text-text">{ROLE_INFO[r].label}</dt><dd className="mt-0.5 text-xs leading-relaxed text-muted">{ROLE_INFO[r].about}</dd></div>
            ))}
          </dl>
        </Card>
      </div>
      {adding && <AddUserModal roles={roles} canSuper={me.role === 'super_admin'} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); res.reload(); }} />}
      {editing && <EditUserModal user={editing} roles={roles} isSelf={editing.id === me.id} canSuper={me.role === 'super_admin'} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); res.reload(); }} />}
      <ConfirmDialog open={!!toDelete} title={`Remove ${toDelete?.name}?`} busy={deleting} onCancel={() => setToDelete(null)} onConfirm={remove} confirmLabel="Remove"
        description="Their account is deleted and they are signed out everywhere. Their past notes and activity stay. To pause access instead, disable the account." />
    </>
  );
}

function AddUserModal({ roles, canSuper, onClose, onSaved }: { roles: UsersResponse['roles']; canSuper: boolean; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [v, setV] = useState({ name: '', email: '', role: 'editor', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const local: Record<string, string> = {};
    if (!v.name.trim()) local.name = 'Enter a name.';
    if (!/^\S+@\S+\.\S+$/.test(v.email.trim())) local.email = 'Enter a valid email.';
    if (v.password.length < 12) local.password = 'Use at least 12 characters.';
    if (Object.keys(local).length) { setErrors(local); return; }
    setBusy(true);
    try {
      await adminApi.post('/users', { ...v, name: v.name.trim(), email: v.email.trim() });
      toast.success(`${v.name} added. Share the password with them securely; they can change it under Account.`);
      onSaved();
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) setErrors(err.fieldErrors); else toast.error(errorMessage(err));
    } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title="Add team member" description="They can sign in straight away with this email and password."
      footer={<><AButton onClick={onClose}>Cancel</AButton><AButton variant="primary" type="submit" form="add-user" loading={busy}>Add member</AButton></>}>
      <form id="add-user" onSubmit={submit} noValidate className="space-y-4">
        <TextField label="Name" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} error={errors.name} required autoComplete="off" data-autofocus />
        <TextField label="Email" type="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} error={errors.email} required autoComplete="off" />
        <SelectField label="Role" value={v.role} onChange={(e) => setV({ ...v, role: e.target.value })} error={errors.role} hint={ROLE_INFO[v.role as StaffRole]?.about}>
          {roles.filter((r) => canSuper || r.value !== 'super_admin').map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </SelectField>
        <TextField label="Temporary password" type="text" value={v.password} onChange={(e) => setV({ ...v, password: e.target.value })} error={errors.password} required
          autoComplete="new-password" spellCheck={false} hint="At least 12 characters. Ask them to change it after signing in." className="[&_input]:font-mono" />
      </form>
    </Modal>
  );
}

function EditUserModal({ user, roles, isSelf, canSuper, onClose, onSaved }: { user: StaffUser; roles: UsersResponse['roles']; isSelf: boolean; canSuper: boolean; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [name, setName] = useState(user.name);
  const [role, setRole] = useState<string>(user.role);
  const [active, setActive] = useState(user.status === 'active');
  const [password, setPassword] = useState('');
  const [unlock, setUnlock] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password && password.length < 12) { setErrors({ password: 'Use at least 12 characters.' }); return; }
    const body: Record<string, unknown> = {};
    if (name.trim() !== user.name) body.name = name.trim();
    if (role !== user.role) body.role = role;
    if ((active ? 'active' : 'disabled') !== user.status) body.status = active ? 'active' : 'disabled';
    if (password) body.password = password;
    if (unlock) body.unlock = true;
    if (!Object.keys(body).length) { onClose(); return; }
    setBusy(true);
    try {
      await adminApi.patch(`/users/${user.id}`, body);
      toast.success(`${name.trim()} updated.${body.password || body.status === 'disabled' || body.role ? ' They have been signed out.' : ''}`);
      onSaved();
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) setErrors(err.fieldErrors); else toast.error(errorMessage(err));
    } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title={`Edit ${user.name}`} description={user.email}
      footer={<><AButton onClick={onClose}>Cancel</AButton><AButton variant="primary" type="submit" form="edit-user" loading={busy}>Save</AButton></>}>
      <form id="edit-user" onSubmit={submit} noValidate className="space-y-4">
        <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} required />
        <SelectField label="Role" value={role} onChange={(e) => setRole(e.target.value)} error={errors.role} disabled={isSelf}
          hint={isSelf ? "You can't change your own role." : ROLE_INFO[role as StaffRole]?.about}>
          {roles.filter((r) => canSuper || r.value !== 'super_admin').map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </SelectField>
        <Switch label="Account active" checked={active} onChange={setActive} disabled={isSelf} error={errors.status}
          hint={isSelf ? "You can't disable your own account." : 'Disabled accounts cannot sign in and are signed out immediately.'} />
        {user.locked && (
          <div className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/[0.07] p-3">
            <Lock size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-warning" />
            <div className="flex-1 text-sm">
              <p className="text-text">Locked after too many wrong passwords.</p>
              <label className="mt-1.5 inline-flex cursor-pointer items-center gap-2 text-muted"><input type="checkbox" checked={unlock} onChange={(e) => setUnlock(e.target.checked)} className="h-4 w-4 accent-[var(--color-brand)]" />Unlock now</label>
            </div>
          </div>
        )}
        <div className="border-t border-line pt-4">
          <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-text"><KeyRound size={15} aria-hidden="true" className="text-subtle" />Reset password</p>
          <TextField label="New password" hideLabel type="text" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password}
            placeholder="Leave empty to keep the current password" autoComplete="new-password" spellCheck={false} className="[&_input]:font-mono"
            hint="At least 12 characters. They'll be signed out and need the new password." />
        </div>
      </form>
    </Modal>
  );
}
