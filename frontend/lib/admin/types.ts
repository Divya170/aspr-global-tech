// Shapes returned by the admin API (backend/src/**). Dates are SQLite UTC strings ("2026-10-02 08:01:55").

export type Permission =
  | 'dashboard' | 'leads' | 'leads.delete' | 'applications' | 'subscribers' | 'chat'
  | 'content' | 'media' | 'settings' | 'users' | 'activity';

export type StaffRole = 'super_admin' | 'admin' | 'manager' | 'editor';

export interface AdminUser { id: number; name: string; email: string; role: StaffRole; permissions: Permission[] }
export interface MeResponse { user: AdminUser; csrfToken: string }
export interface LoginResponse extends MeResponse { expiresAt: string }

export interface Paged<T> { items: T[]; total: number; page: number; pageSize: number; pages: number }

export interface ActivityItem {
  id: number; userId: number | null; actor: string; action: string; entity: string; entityId: number | null; summary: string; createdAt: string;
}

export interface NotificationItem {
  id: number; type: string; title: string; body: string; link: string; createdAt: string; readAt: string | null; read: boolean;
}
export interface NotificationsResponse { items: NotificationItem[]; unread: number }

// ─── leads ───
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal-sent' | 'negotiation' | 'won' | 'lost' | 'spam';

export interface Lead {
  id: number; refNo: string; source: string; projectType: string; needs: string[]; name: string; email: string; phone: string;
  company: string; budget: string; timeline: string; heardFrom: string; message: string; status: LeadStatus; statusLabel: string;
  assignedTo: { id: number; name: string } | null; attachmentCount?: number; noteCount?: number; createdAt: string; updatedAt: string;
}
export interface Attachment { id: number; name: string; mime: string; size: number; createdAt: string }
export interface LeadNote { id: number; body: string; createdAt: string; author: string }
export interface LeadDetail extends Lead { attachments: Attachment[]; notes: LeadNote[]; activity: ActivityItem[] }

export interface LeadFacets {
  statuses: { value: LeadStatus; label: string }[]; projectTypes: string[]; budgets: string[]; sources: string[];
}
export interface StaffOption { id: number; name: string; role: StaffRole }

// ─── applications ───
export type ApplicationStatus = 'new' | 'shortlisted' | 'task-sent' | 'interview' | 'offer' | 'rejected';
export interface Application {
  id: number; refNo: string; roleId: number; roleTitle: string; name: string; email: string; phone: string; portfolio: string;
  message: string; status: ApplicationStatus; notes: string; attachmentCount?: number; createdAt: string; updatedAt: string;
}
export interface ApplicationDetail extends Application { attachments: Attachment[] }

// ─── subscribers ───
export interface Subscriber { id: number; email: string; status: 'active' | 'unsubscribed'; source: string; createdAt: string; updatedAt: string }

// ─── chat ───
export interface ChatSession { visitorId: string; messageCount: number; lastMessageAt: string; enquiryRef: string | null; sourcePath: string; createdAt: string }
export interface ChatMessage { role: 'user' | 'assistant'; content: string; sources: { title: string; url: string }[]; createdAt: string }

// ─── team ───
export interface StaffUser {
  id: number; name: string; email: string; role: StaffRole; roleLabel: string; status: 'active' | 'disabled'; locked: boolean;
  lastLoginAt: string | null; createdAt: string;
}
export interface UsersResponse { items: StaffUser[]; roles: { value: StaffRole; label: string }[] }

// ─── media ───
export interface MediaItem { id: number; kind: 'image' | 'video'; name: string; url: string; mime: string; size: number; createdAt: string }

// ─── stats ───
export interface Stats {
  overview: {
    totalLeads: number; newLeads: number; last30Days: number; activePipeline: number; won: number; lost: number;
    conversionRate: number | null; unassigned: number; portfolioProjects: number; draftProjects: number; newApplications: number; subscribers: number;
  };
  leadsByMonth: { month: string; total: number; won: number }[];
  serviceDemand: { type: string; count: number }[];
  byStatus: { status: LeadStatus; count: number; label: string }[];
  bySource: { source: string; count: number }[];
  recentLeads: { id: number; refNo: string; name: string; company: string; projectType: string; status: LeadStatus; statusLabel: string; createdAt: string }[];
  recentActivity: ActivityItem[];
  email: { enabled: boolean; failed: number };
}
export interface EmailStatus {
  enabled: boolean; counts: Record<string, number>;
  recent: { id: number; template: string; to: string; subject: string; status: string; attempts: number; lastError: string | null; createdAt: string; sentAt: string | null }[];
}

// ─── content (CMS) ───
export type FieldType = 'text' | 'textarea' | 'number' | 'boolean' | 'list' | 'blocks' | 'select' | 'image' | 'ref' | 'pairs' | 'gallery' | 'refs';
export interface FieldSchema {
  key: string; type: FieldType; label: string; required?: boolean; nullable?: boolean; options?: (string | number)[];
  ref?: { collection: string; labelKey: string }; pairLabels?: [string, string]; pattern?: string; patternHint?: string;
  help?: string; max?: number; min?: number; section?: string;
}
export interface CollectionSchema { name: string; label: string; titleKey: string; filters: string[]; publicPath?: string; fields: FieldSchema[] }
export type ContentItem = { id: number; createdAt?: string; updatedAt?: string } & Record<string, unknown>;
export interface ContentList { items: ContentItem[]; total: number; page: number; pageSize: number }
export interface Block { type: string; text: string }
export interface GalleryItem { src: string; alt: string }
