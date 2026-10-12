export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://asprglobaltech.com').replace(/\/$/, '');
export const SITE_NAME = 'ASPR Global Tech';
export const DEFAULT_DESCRIPTION =
  'ASPR Global Tech builds premium websites, interactive 3D experiences, web applications, custom software and mobile apps for businesses worldwide.';

export const NAV = [
  { label: 'Services', href: '/services' },
  { label: 'Portfolio', href: '/portfolio' },
  { label: 'Process', href: '/process' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
];

/** Upload limits shown on forms. Must match backend config (maxFiles, maxFileBytes, ATTACHMENT_EXT). */
export const UPLOAD = {
  maxFiles: 5,
  maxBytes: 10 * 1024 * 1024,
  accept: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.webp,.zip',
  ext: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'png', 'jpg', 'jpeg', 'webp', 'zip'],
};

/**
 * How the 300+ / 150+ figures must be qualified wherever they appear (main's wording): they are the
 * team's track record across previous and current engagements, not the firm's (established March 2026).
 */
export const TEAM_RECORD_NOTE = 'Projects and clients: delivered by our team, across previous and current engagements. ASPR Global Tech was established in March 2026.';
