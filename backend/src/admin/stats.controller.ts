import { Controller, Get, UseGuards } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AdminGuard } from './admin.guard';

/** Dashboard summary for the admin home. */
@Controller('admin/stats')
@UseGuards(AdminGuard)
export class StatsController {
  constructor(private readonly db: DatabaseService) {}

  @Get()
  stats() {
    const count = (sql: string, p: unknown[] = []) => this.db.get<{ n: number }>(sql, p)!.n;
    const byStatus = (table: string) => Object.fromEntries(this.db.all<{ status: string; n: number }>(`SELECT status, COUNT(*) AS n FROM ${table} GROUP BY status`).map((r) => [r.status, r.n]));
    return {
      enquiries: {
        total: count('SELECT COUNT(*) AS n FROM enquiries'),
        last7Days: count("SELECT COUNT(*) AS n FROM enquiries WHERE created_at >= datetime('now', '-7 days')"),
        byStatus: byStatus('enquiries'),
        topNeeds: this.db.all<{ need: string; n: number }>('SELECT j.value AS need, COUNT(*) AS n FROM enquiries, json_each(enquiries.needs) j GROUP BY j.value ORDER BY n DESC LIMIT 6'),
      },
      applications: {
        total: count('SELECT COUNT(*) AS n FROM applications'),
        last7Days: count("SELECT COUNT(*) AS n FROM applications WHERE created_at >= datetime('now', '-7 days')"),
        byStatus: byStatus('applications'),
      },
      subscribers: {
        active: count("SELECT COUNT(*) AS n FROM subscribers WHERE status = 'active'"),
        total: count('SELECT COUNT(*) AS n FROM subscribers'),
      },
      recent: this.db.all("SELECT 'enquiry' AS kind, id, ref_no AS refNo, name, status, created_at AS createdAt FROM enquiries UNION ALL SELECT 'application', id, ref_no, name, status, created_at FROM applications ORDER BY createdAt DESC LIMIT 8"),
    };
  }
}
