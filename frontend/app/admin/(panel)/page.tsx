import { Dashboard } from '@/components/admin/pages/Dashboard';
import { RequirePermission } from '@/components/admin/SessionProvider';

export const metadata = { title: 'Dashboard' };

export default function AdminHome() {
  return <RequirePermission perm="dashboard"><Dashboard /></RequirePermission>;
}
