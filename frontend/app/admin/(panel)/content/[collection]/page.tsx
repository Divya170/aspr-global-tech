import { Suspense } from 'react';
import { ContentListPage } from '@/components/admin/content/ContentList';
import { RequirePermission } from '@/components/admin/SessionProvider';
import { CONTENT_NAV } from '@/lib/admin/constants';

export async function generateMetadata({ params }: { params: Promise<{ collection: string }> }) {
  const { collection } = await params;
  return { title: CONTENT_NAV.find((c) => c.name === collection)?.label ?? 'Content' };
}

export default async function Page({ params }: { params: Promise<{ collection: string }> }) {
  const { collection } = await params;
  return <RequirePermission perm="content"><Suspense><ContentListPage collection={collection} /></Suspense></RequirePermission>;
}
