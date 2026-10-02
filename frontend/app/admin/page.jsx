import AdminApp from '@/components/admin/AdminApp';
import './admin.css';

export const metadata = { title: 'Admin', robots: { index: false, follow: false } };

export default function AdminPage() {
  return <AdminApp />;
}
