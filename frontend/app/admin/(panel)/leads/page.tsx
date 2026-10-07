import { Suspense } from 'react';
import { LeadsPage } from '@/components/admin/pages/Leads';
import { RequirePermission } from '@/components/admin/SessionProvider';

export const metadata = { title: 'Leads' };

export default function Page() {
  return <RequirePermission perm="leads"><Suspense><LeadsPage /></Suspense></RequirePermission>;
}
