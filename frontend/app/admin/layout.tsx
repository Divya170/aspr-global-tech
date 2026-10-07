import type { Metadata } from 'next';
import { ToastProvider } from '@/components/admin/ui/Toast';

export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s · ASPR Admin' },
  robots: { index: false, follow: false, nocache: true },
};

/** Admin area: outside the public (site) layout, so no site navbar, footer or chat widget. */
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
