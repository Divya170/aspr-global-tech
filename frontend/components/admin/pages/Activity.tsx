'use client';

import Link from 'next/link';
import { adminApi } from '@/lib/admin/api';
import { CONTENT_NAV, entityHref } from '@/lib/admin/constants';
import { formatDateTime, timeAgo } from '@/lib/admin/format';
import { useResource, useUrlState } from '@/lib/admin/hooks';
import type { ActivityItem, Paged } from '@/lib/admin/types';
import { useSession } from '../SessionProvider';
import { AdminTable, type Column } from '../ui/AdminTable';
import { Select } from '../ui/Field';
import { Card, FilterBar, PageHeader } from '../ui/Layout';
import { Pagination } from '../ui/Pagination';
import { EmptyState, ErrorState, SkeletonRows } from '../ui/States';

const ENTITIES: { value: string; label: string }[] = [
  { value: 'lead', label: 'Leads' },
  { value: 'application', label: 'Applications' },
  { value: 'user', label: 'Team & sign-ins' },
  { value: 'media', label: 'Media' },
  { value: 'settings', label: 'Settings' },
  ...CONTENT_NAV.map((c) => ({ value: c.name, label: `Content: ${c.label}` })),
];

export function ActivityPage() {
  const { user } = useSession();
  const [f, setF] = useUrlState(['entity', 'page'] as const);
  const page = Math.max(1, Number(f.page) || 1);
  const res = useResource(() => adminApi.get<Paged<ActivityItem>>('/activity', { entity: f.entity, page, pageSize: 50 }), [f.entity, page]);

  const columns: Column<ActivityItem>[] = [
    { key: 'when', header: 'When', className: 'whitespace-nowrap text-muted', cell: (a) => <time title={formatDateTime(a.createdAt)} dateTime={a.createdAt}>{timeAgo(a.createdAt)}</time> },
    { key: 'actor', header: 'Who', className: 'whitespace-nowrap', cell: (a) => <span className={a.userId ? 'text-text' : 'text-subtle'}>{a.actor}</span> },
    { key: 'what', header: 'What happened', cell: (a) => {
      const href = entityHref(a.entity, a.entityId, user.permissions);
      return <span className="break-words text-muted">{href ? <Link href={href} className="text-text hover:text-brand hover:underline">{a.summary}</Link> : a.summary}</span>;
    } },
    { key: 'action', header: 'Action', headerClassName: 'hidden lg:table-cell', className: 'hidden lg:table-cell', cell: (a) => <code className="font-mono text-xs text-subtle">{a.action}</code> },
  ];

  return (
    <>
      <PageHeader title="Activity" description="An audit trail of every change in the admin, plus new leads and applications from the website." />
      <Card>
        <FilterBar>
          <label className="flex flex-col gap-1">
            <span className="text-[0.7rem] font-medium uppercase tracking-[0.08em] text-subtle">Area</span>
            <Select value={f.entity} onChange={(e) => setF({ entity: e.target.value })}>
              <option value="">Everything</option>
              {ENTITIES.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
            </Select>
          </label>
        </FilterBar>
        {res.error ? <ErrorState error={res.error} onRetry={res.reload} />
          : !res.data ? <SkeletonRows rows={10} />
          : !res.data.items.length ? <EmptyState title="No activity here yet" />
          : (
            <div className={res.loading ? 'opacity-60' : ''}>
              <AdminTable caption="Activity log" columns={columns} rows={res.data.items} rowKey={(a) => a.id}
                mobileCard={(a) => {
                  const href = entityHref(a.entity, a.entityId, user.permissions);
                  return (
                    <div className="px-4 py-3 text-sm">
                      <p className="break-words text-text">{href ? <Link href={href} className="hover:text-brand">{a.summary}</Link> : a.summary}</p>
                      <p className="mt-0.5 text-xs text-subtle">{a.actor} · {timeAgo(a.createdAt)}</p>
                    </div>
                  );
                }} />
              <Pagination page={res.data.page} pages={res.data.pages} total={res.data.total} pageSize={res.data.pageSize} noun="entries" onPage={(p) => setF({ page: p > 1 ? String(p) : '' })} />
            </div>
          )}
      </Card>
    </>
  );
}
