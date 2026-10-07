import { Suspense } from 'react';
import { SubscribersPage } from '@/components/admin/pages/Subscribers';
import { RequirePermission } from '@/components/admin/SessionProvider';

export const metadata = { title: 'Subscribers' };

export default function Page() {
  return <RequirePermission perm="subscribers"><Suspense><SubscribersPage /></Suspense></RequirePermission>;
}
