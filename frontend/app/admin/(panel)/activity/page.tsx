import { Suspense } from 'react';
import { ActivityPage } from '@/components/admin/pages/Activity';
import { RequirePermission } from '@/components/admin/SessionProvider';

export const metadata = { title: 'Activity' };

export default function Page() {
  return <RequirePermission perm="activity"><Suspense><ActivityPage /></Suspense></RequirePermission>;
}
