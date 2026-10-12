import { Suspense } from 'react';
import { SettingsPage } from '@/components/admin/pages/Settings';
import { RequirePermission } from '@/components/admin/SessionProvider';

export const metadata = { title: 'Settings' };

export default function Page() {
  return <RequirePermission perm="settings"><Suspense><SettingsPage /></Suspense></RequirePermission>;
}
