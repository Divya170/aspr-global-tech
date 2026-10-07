import type { ApplicationStatus, LeadStatus, Permission, StaffRole } from './types';

export type Tone = 'neutral' | 'brand' | 'accent' | 'signal' | 'success' | 'warning' | 'danger';

export const LEAD_STATUSES: { value: LeadStatus; label: string; tone: Tone }[] = [
  { value: 'new', label: 'New', tone: 'brand' },
  { value: 'contacted', label: 'Contacted', tone: 'signal' },
  { value: 'qualified', label: 'Qualified', tone: 'accent' },
  { value: 'proposal-sent', label: 'Proposal sent', tone: 'accent' },
  { value: 'negotiation', label: 'Negotiation', tone: 'warning' },
  { value: 'won', label: 'Won', tone: 'success' },
  { value: 'lost', label: 'Lost', tone: 'neutral' },
  { value: 'spam', label: 'Spam', tone: 'danger' },
];
export const leadStatus = (s: string) => LEAD_STATUSES.find((x) => x.value === s) ?? { value: s as LeadStatus, label: s, tone: 'neutral' as Tone };

export const APPLICATION_STATUSES: { value: ApplicationStatus; label: string; tone: Tone }[] = [
  { value: 'new', label: 'New', tone: 'brand' },
  { value: 'shortlisted', label: 'Shortlisted', tone: 'accent' },
  { value: 'task-sent', label: 'Task sent', tone: 'signal' },
  { value: 'interview', label: 'Interview', tone: 'warning' },
  { value: 'offer', label: 'Offer', tone: 'success' },
  { value: 'rejected', label: 'Rejected', tone: 'neutral' },
];
export const applicationStatus = (s: string) => APPLICATION_STATUSES.find((x) => x.value === s) ?? { value: s as ApplicationStatus, label: s, tone: 'neutral' as Tone };

export const SOURCE_LABELS: Record<string, string> = {
  quote: 'Quote form', contact: 'Contact form', chat: 'Chat', 'brief-builder': 'Brief builder', 'contact-page': 'Contact page', 'product-demo': 'Product demo',
};

export const ROLE_INFO: Record<StaffRole, { label: string; about: string }> = {
  super_admin: { label: 'Super admin', about: 'Everything, including managing other super admins.' },
  admin: { label: 'Admin', about: 'Everything except super admin accounts: leads, content, settings and the team.' },
  manager: { label: 'Manager', about: 'The sales side: leads, applications, subscribers, chat and the activity log.' },
  editor: { label: 'Editor', about: 'Website content and the media library.' },
};

/** CMS collections in sidebar order (labels match the backend registry). */
export const CONTENT_NAV: { name: string; label: string }[] = [
  { name: 'services', label: 'Services' },
  { name: 'projects', label: 'Portfolio' },
  { name: 'project-categories', label: 'Portfolio categories' },
  { name: 'technologies', label: 'Technologies' },
  { name: 'testimonials', label: 'Testimonials' },
  { name: 'faqs', label: 'FAQs' },
  { name: 'faq-groups', label: 'FAQ groups' },
  { name: 'steps', label: 'Process steps' },
  { name: 'articles', label: 'Insights' },
  { name: 'products', label: 'Products' },
  { name: 'industries', label: 'Industries' },
  { name: 'roles', label: 'Open roles' },
  { name: 'pages', label: 'Pages' },
];

/** Where an activity/notification entity lives in the admin, if anywhere. */
export function entityHref(entity: string, id: number | null | undefined, perms: Permission[]): string | null {
  if (!id) return null;
  if (entity === 'lead' && perms.includes('leads')) return `/admin/leads/${id}`;
  if (entity === 'application' && perms.includes('applications')) return `/admin/applications?open=${id}`;
  if (CONTENT_NAV.some((c) => c.name === entity) && perms.includes('content')) return `/admin/content/${entity}/${id}`;
  return null;
}
