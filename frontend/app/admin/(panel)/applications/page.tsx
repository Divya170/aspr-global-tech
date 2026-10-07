import { Suspense } from 'react';
import { ApplicationsPage } from '@/components/admin/pages/Applications';
import { RequirePermission } from '@/components/admin/SessionProvider';

export const metadata = { title: 'Applications' };

export default function Page() {
  return <RequirePermission perm="applications"><Suspense><ApplicationsPage /></Suspense></RequirePermission>;
}
