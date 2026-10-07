import { notFound } from 'next/navigation';
import { ContentEditor } from '@/components/admin/content/ContentEditor';
import { RequirePermission } from '@/components/admin/SessionProvider';
import { CONTENT_NAV } from '@/lib/admin/constants';

export async function generateMetadata({ params }: { params: Promise<{ collection: string }> }) {
  const { collection } = await params;
  return { title: `Edit · ${CONTENT_NAV.find((c) => c.name === collection)?.label ?? 'Content'}` };
}

export default async function Page({ params }: { params: Promise<{ collection: string; id: string }> }) {
  const { collection, id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  return <RequirePermission perm="content"><ContentEditor collection={collection} id={Number(id)} /></RequirePermission>;
}
