import { notFound } from 'next/navigation';
import { LeadDetail } from '@/components/admin/pages/LeadDetail';
import { RequirePermission } from '@/components/admin/SessionProvider';

export const metadata = { title: 'Lead' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  return <RequirePermission perm="leads"><LeadDetail id={Number(id)} /></RequirePermission>;
}
