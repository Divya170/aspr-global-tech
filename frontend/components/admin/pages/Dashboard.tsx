'use client';

import { AlertTriangle, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { adminApi } from '@/lib/admin/api';
import { entityHref, leadStatus } from '@/lib/admin/constants';
import { formatNumber, timeAgo } from '@/lib/admin/format';
import { useResource } from '@/lib/admin/hooks';
import type { Stats } from '@/lib/admin/types';
import { HorizontalBars, LeadsByMonthChart } from '../charts';
import { useSession } from '../SessionProvider';
import { Card, CardHeader, PageHeader } from '../ui/Layout';
import { ErrorState, Skeleton } from '../ui/States';
import { StatusPill } from '../ui/StatusPill';

function Kpi({ label, value, note, href }: { label: string; value: string; note?: string; href?: string }) {
  const body = (
    <>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1.5 font-display text-2xl font-semibold tabular-nums tracking-tight text-text">{value}</p>
      {note && <p className="mt-0.5 text-xs text-subtle">{note}</p>}
    </>
  );
  const cls = 'block rounded-xl border border-line bg-surface/70 px-4 py-3.5';
  return href ? <Link href={href} className={`${cls} transition-colors hover:border-line-strong hover:bg-surface`}>{body}</Link> : <div className={cls}>{body}</div>;
}

export function Dashboard() {
  const { user, can } = useSession();
  const { data, error, loading, reload } = useResource(() => adminApi.get<Stats>('/stats'), []);
  const greeting = (() => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; })();

  if (error) return <><PageHeader title="Dashboard" /><Card><ErrorState error={error} onRetry={reload} /></Card></>;
  if (loading || !data) {
    return (
      <div role="status" aria-label="Loading dashboard">
        <PageHeader title="Dashboard" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-[5.5rem] rounded-xl" />)}</div>
        <div className="mt-4 grid gap-4 lg:grid-cols-3"><Skeleton className="h-72 rounded-xl lg:col-span-2" /><Skeleton className="h-72 rounded-xl" /></div>
      </div>
    );
  }

  const o = data.overview;
  const leadsHref = can('leads');
  const emailProblem = !data.email.enabled || data.email.failed > 0;

  return (
    <>
      <PageHeader title={`${greeting}, ${user.name.split(' ')[0]}`} description="Your pipeline, website content and recent activity at a glance." />

      {emailProblem && (
        <div role="status" className="mb-4 flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/[0.07] px-4 py-3 text-sm">
          <AlertTriangle size={18} aria-hidden="true" className="mt-px shrink-0 text-warning" />
          <div className="min-w-0 flex-1 text-text">
            {!data.email.enabled
              ? <><strong className="font-medium">Email sending is off — set SMTP_HOST.</strong> <span className="text-muted">New leads are saved, but no one is emailed about them and clients get no confirmation.</span></>
              : <><strong className="font-medium">{data.email.failed} email{data.email.failed === 1 ? '' : 's'} failed to send.</strong> <span className="text-muted">Check the SMTP settings and the delivery log.</span></>}
          </div>
          {can('settings') && <Link href="/admin/settings?tab=email" className="shrink-0 text-brand hover:text-text">Delivery log</Link>}
        </div>
      )}

      <h2 className="sr-only">Overview</h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Total leads" value={formatNumber(o.totalLeads)} note="Excluding spam" href={leadsHref ? '/admin/leads' : undefined} />
        <Kpi label="New leads" value={formatNumber(o.newLeads)} note={o.unassigned ? `${o.unassigned} open & unassigned` : 'Waiting for a first reply'} href={leadsHref ? '/admin/leads?status=new' : undefined} />
        <Kpi label="Last 30 days" value={formatNumber(o.last30Days)} note="Leads received" />
        <Kpi label="Active pipeline" value={formatNumber(o.activePipeline)} note="Qualified to negotiation" href={leadsHref ? '/admin/leads?status=open' : undefined} />
        <Kpi label="Won" value={formatNumber(o.won)} note={`${formatNumber(o.lost)} lost`} href={leadsHref ? '/admin/leads?status=won' : undefined} />
        <Kpi label="Conversion rate" value={o.conversionRate === null ? '—' : `${o.conversionRate}%`} note={o.conversionRate === null ? 'No decided leads yet' : 'Won ÷ (won + lost)'} />
        <Kpi label="Portfolio projects" value={formatNumber(o.portfolioProjects)} note={o.draftProjects ? `${o.draftProjects} draft${o.draftProjects === 1 ? '' : 's'} not published` : 'All published'} href={can('content') ? '/admin/content/projects' : undefined} />
        <Kpi label="New applications" value={formatNumber(o.newApplications)} note={`${formatNumber(o.subscribers)} newsletter subscribers`} href={can('applications') ? '/admin/applications?status=new' : undefined} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2" aria-labelledby="chart-months">
          <CardHeader id="chart-months" title="Leads by month" description="Last 12 months, spam excluded" />
          <div className="p-4"><LeadsByMonthChart data={data.leadsByMonth} /></div>
        </Card>
        <Card aria-labelledby="chart-demand">
          <CardHeader id="chart-demand" title="Service demand" description="Leads by project type" />
          <div className="p-4">
            <HorizontalBars label="Leads by project type" items={data.serviceDemand.map((s) => ({ key: s.type, label: s.type, value: s.count }))} emptyText="No leads yet." />
          </div>
        </Card>
      </div>

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-3">
        <Card aria-labelledby="by-status">
          <CardHeader id="by-status" title="Status breakdown" description="Every lead, including spam" />
          <div className="p-4">
            <HorizontalBars label="Leads by status" color="var(--color-brand)"
              items={[...data.byStatus].sort((a, b) => b.count - a.count).map((s) => ({ key: s.status, label: s.label, value: s.count }))}
              renderLabel={(i) => <StatusPill tone={leadStatus(i.key).tone}>{i.label}</StatusPill>} emptyText="No leads yet." />
          </div>
        </Card>

        {leadsHref && <Card className="lg:col-span-2" aria-labelledby="recent-leads">
          <CardHeader id="recent-leads" title="Recent leads" actions={leadsHref && <Link href="/admin/leads" className="inline-flex items-center gap-1 text-xs text-brand hover:text-text">All leads <ArrowRight size={13} aria-hidden="true" /></Link>} />
          {data.recentLeads.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted">No leads yet. They appear here as soon as someone sends the quote or contact form.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Six most recent leads</caption>
                <thead>
                  <tr className="border-b border-line text-[0.7rem] uppercase tracking-[0.08em] text-subtle">
                    <th scope="col" className="px-4 py-2 font-medium">Lead</th>
                    <th scope="col" className="hidden px-4 py-2 font-medium sm:table-cell">Project</th>
                    <th scope="col" className="px-4 py-2 font-medium">Status</th>
                    <th scope="col" className="hidden px-4 py-2 text-right font-medium sm:table-cell">Received</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentLeads.map((l) => (
                    <tr key={l.id} className="border-b border-line/60 last:border-0">
                      <td className="px-4 py-2.5">
                        {leadsHref ? <Link href={`/admin/leads/${l.id}`} className="font-medium text-text hover:text-brand">{l.name}</Link> : <span className="font-medium">{l.name}</span>}
                        <span className="block text-xs text-subtle">{l.refNo}{l.company ? ` · ${l.company}` : ''}</span>
                      </td>
                      <td className="hidden px-4 py-2.5 text-muted sm:table-cell">{l.projectType || '—'}</td>
                      <td className="px-4 py-2.5"><StatusPill tone={leadStatus(l.status).tone}>{l.statusLabel}</StatusPill></td>
                      <td className="hidden whitespace-nowrap px-4 py-2.5 text-right text-muted sm:table-cell">{timeAgo(l.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>}
      </div>

      <Card className="mt-4" aria-labelledby="recent-activity">
        <CardHeader id="recent-activity" title="Recent activity" actions={can('activity') && <Link href="/admin/activity" className="inline-flex items-center gap-1 text-xs text-brand hover:text-text">Full log <ArrowRight size={13} aria-hidden="true" /></Link>} />
        {data.recentActivity.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted">Nothing yet.</p>
        ) : (
          <ol className="divide-y divide-line/60">
            {data.recentActivity.map((a) => {
              const href = entityHref(a.entity, a.entityId, user.permissions);
              return (
                <li key={a.id} className="flex items-start gap-3 px-4 py-2.5 text-sm">
                  <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-soft/70" />
                  <p className="min-w-0 flex-1 text-muted">
                    <span className="text-text">{a.actor}</span> · {href ? <Link href={href} className="hover:text-text hover:underline">{a.summary}</Link> : a.summary}
                  </p>
                  <time className="shrink-0 whitespace-nowrap text-xs text-subtle">{timeAgo(a.createdAt)}</time>
                </li>
              );
            })}
          </ol>
        )}
      </Card>
    </>
  );
}
