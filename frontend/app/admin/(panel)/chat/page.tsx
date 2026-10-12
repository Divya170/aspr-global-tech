import { Suspense } from 'react';
import { ChatPage } from '@/components/admin/pages/Chat';
import { RequirePermission } from '@/components/admin/SessionProvider';

export const metadata = { title: 'Chat' };

export default function Page() {
  return <RequirePermission perm="chat"><Suspense><ChatPage /></Suspense></RequirePermission>;
}
