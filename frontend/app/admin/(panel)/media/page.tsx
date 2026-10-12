import { Suspense } from 'react';
import { MediaPage } from '@/components/admin/pages/Media';
import { RequirePermission } from '@/components/admin/SessionProvider';

export const metadata = { title: 'Media' };

export default function Page() {
  return <RequirePermission perm="media"><Suspense><MediaPage /></Suspense></RequirePermission>;
}
