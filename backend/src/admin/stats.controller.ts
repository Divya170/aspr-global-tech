import { Controller, Get, UseGuards } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { STATUS_LABELS } from '../leads/leads.service';
import { MailService } from '../mail/mail.service';
import { ActivityService } from '../ops/activity.service';
import { AdminGuard } from './admin.guard';
import { Perm } from './permissions';

const OPEN = "('qualified','proposal-sent','negotiation')";

/** Dashboard analytics: pipeline overview, leads by month, service demand, recent activity. */
@Controller('admin/stats')
@UseGuards(AdminGuard)
export class StatsController {
  constructor(private readonly db: DatabaseService, private readonly activity: ActivityService, private readonly mail: MailService) {}

  @Get()
  @Perm('dashboard')
  stats() {
    const n = (sql: string, p: unknown[] = []) => this.db.get<{ n: number }>(sql, p)!.n;
    const leads = "FROM enquiries WHERE status <> 'spam'";
    const won = n(`SELECT COUNT(*) AS n ${leads} AND status = 'won'`);
    const lost = n(`SELECT COUNT(*) AS n ${leads} AND status = 'lost'`);

    // Last 12 calendar months, oldest first, including empty months.
    const months: string[] = [];
    const d = new Date();
    d.setUTCDate(1);
    for (let i = 11; i >= 0; i--) {
      const m = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - i, 1));
      months.push(m.toISOString().slice(0, 7));
    }
    const monthly = new Map(this.db.all<{ m: string; total: number; won: number }>(
      `SELECT strftime('%Y-%m', created_at) AS m, COUNT(*) AS total, SUM(status = 'won') AS won ${leads} AND created_at >= ? GROUP BY m`,
      [months[0] + '-01']).map((r) => [r.m, r]));

    return {
      overview: {
        totalLeads: n(`SELECT COUNT(*) AS n ${leads}`),
        newLeads: n(`SELECT COUNT(*) AS n ${leads} AND status = 'new'`),
        last30Days: n(`SELECT COUNT(*) AS n ${leads} AND created_at >= datetime('now', '-30 days')`),
        activePipeline: n(`SELECT COUNT(*) AS n ${leads} AND status IN ${OPEN}`),
        won, lost,
        // Of the leads that reached a decision, the share that were won.
        conversionRate: won + lost ? Math.round((won / (won + lost)) * 1000) / 10 : null,
        unassigned: n(`SELECT COUNT(*) AS n ${leads} AND assigned_to IS NULL AND status NOT IN ('won','lost')`),
        portfolioProjects: n('SELECT COUNT(*) AS n FROM projects WHERE active = 1'),
        draftProjects: n('SELECT COUNT(*) AS n FROM projects WHERE active = 0'),
        newApplications: n("SELECT COUNT(*) AS n FROM applications WHERE status = 'new'"),
        subscribers: n("SELECT COUNT(*) AS n FROM subscribers WHERE status = 'active'"),
      },
      leadsByMonth: months.map((m) => ({ month: m, total: monthly.get(m)?.total ?? 0, won: monthly.get(m)?.won ?? 0 })),
      serviceDemand: this.db.all(`SELECT CASE WHEN project_type = '' THEN 'Not specified' ELSE project_type END AS type, COUNT(*) AS count
        ${leads} GROUP BY type ORDER BY count DESC`),
      byStatus: this.db.all<{ status: string; count: number }>(`SELECT status, COUNT(*) AS count FROM enquiries GROUP BY status`)
        .map((r) => ({ ...r, label: STATUS_LABELS[r.status] || r.status })),
      bySource: this.db.all(`SELECT source, COUNT(*) AS count ${leads} GROUP BY source ORDER BY count DESC`),
      recentLeads: this.db.all(`SELECT id, ref_no AS refNo, name, company, project_type AS projectType, status, created_at AS createdAt
        ${leads} ORDER BY id DESC LIMIT 6`).map((r) => ({ ...r, statusLabel: STATUS_LABELS[r.status] })),
      recentActivity: this.activity.list({ pageSize: 10 }).items,
      email: { enabled: this.mail.enabled, failed: n("SELECT COUNT(*) AS n FROM email_outbox WHERE status = 'failed'") },
    };
  }

  @Get('email')
  @Perm('settings')
  email() {
    return this.mail.status();
  }
}
