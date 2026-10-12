'use client';

import { AdminShell, ShellSkeleton } from '@/components/admin/AdminShell';
import { SessionProvider } from '@/components/admin/SessionProvider';

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider fallback={<ShellSkeleton />}>
      <AdminShell>{children}</AdminShell>
    </SessionProvider>
  );
}
