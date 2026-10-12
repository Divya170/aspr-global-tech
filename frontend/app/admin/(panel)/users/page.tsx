import { Suspense } from 'react';
import { UsersPage } from '@/components/admin/pages/Users';
import { RequirePermission } from '@/components/admin/SessionProvider';

export const metadata = { title: 'Team' };

export default function Page() {
  return <RequirePermission perm="users"><Suspense><UsersPage /></Suspense></RequirePermission>;
}
