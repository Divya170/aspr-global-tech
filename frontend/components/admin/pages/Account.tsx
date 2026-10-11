'use client';

import { useState, type FormEvent } from 'react';
import { adminApi, ApiError, errorMessage } from '@/lib/admin/api';
import { ROLE_INFO } from '@/lib/admin/constants';
import { initials } from '@/lib/admin/format';
import { useSession } from '../SessionProvider';
import { AButton } from '../ui/Button';
import { TextField } from '../ui/Field';
import { Card, CardHeader, DefinitionList, PageHeader } from '../ui/Layout';
import { useToast } from '../ui/Toast';

export function AccountPage() {
  const { user } = useSession();
  const toast = useToast();
  const [v, setV] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const local: Record<string, string> = {};
    if (!v.currentPassword) local.currentPassword = 'Enter your current password.';
    if (v.newPassword.length < 12) local.newPassword = 'Use at least 12 characters.';
    else if (v.newPassword !== v.confirm) local.confirm = "The two passwords don't match.";
    if (Object.keys(local).length) { setErrors(local); return; }
    setErrors({});
    setBusy(true);
    try {
      await adminApi.post('/auth/password', { currentPassword: v.currentPassword, newPassword: v.newPassword });
      setV({ currentPassword: '', newPassword: '', confirm: '' });
      toast.success('Password changed. Other devices have been signed out.');
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) setErrors(err.fieldErrors); else toast.error(errorMessage(err));
    } finally { setBusy(false); }
  };

  return (
    <>
      <PageHeader title="Account" description="Your profile and password." />
      <div className="grid max-w-4xl items-start gap-4 lg:grid-cols-2">
        <Card aria-labelledby="profile">
          <CardHeader id="profile" title="Profile" />
          <div className="p-4">
            <div className="mb-4 flex items-center gap-3">
              <span aria-hidden="true" className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-strong text-base font-semibold text-white">{initials(user.name)}</span>
              <div><p className="font-medium text-text">{user.name}</p><p className="text-sm text-muted">{user.email}</p></div>
            </div>
            <DefinitionList items={[
              { term: 'Role', value: ROLE_INFO[user.role]?.label ?? user.role },
              { term: 'Access', value: ROLE_INFO[user.role]?.about },
            ]} />
            <p className="mt-4 text-xs text-subtle">To change your name, email or role, ask an admin (Team page).</p>
          </div>
        </Card>
        <Card aria-labelledby="password">
          <CardHeader id="password" title="Change password" description="You stay signed in here; other devices are signed out." />
          <form onSubmit={submit} noValidate className="space-y-4 p-4">
            <TextField label="Current password" type="password" autoComplete="current-password" value={v.currentPassword} onChange={(e) => setV({ ...v, currentPassword: e.target.value })} error={errors.currentPassword} required />
            <TextField label="New password" type="password" autoComplete="new-password" value={v.newPassword} onChange={(e) => setV({ ...v, newPassword: e.target.value })} error={errors.newPassword} required hint="At least 12 characters. A short sentence works well." />
            <TextField label="Confirm new password" type="password" autoComplete="new-password" value={v.confirm} onChange={(e) => setV({ ...v, confirm: e.target.value })} error={errors.confirm} required />
            <AButton type="submit" variant="primary" loading={busy}>Change password</AButton>
          </form>
        </Card>
      </div>
    </>
  );
}
