import { config } from '../config';

export interface Email { subject: string; html: string; text: string }

const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const nl2br = (s: string) => esc(s).replace(/\r?\n/g, '<br>');

const C = { ink: '#0B1020', text: '#2A3247', muted: '#667085', line: '#E6E8F0', bg: '#F4F5FA', accent: '#6D4CFF', dark: '#070A14' };

/**
 * Shared layout: table-based with inline styles, which is what email clients render reliably.
 * Dark brand header, light body for legibility in every client, plain-text twin for each email.
 */
function layout(opts: { preheader: string; heading: string; body: string; cta?: { label: string; href: string } }): string {
  const cta = opts.cta
    ? `<tr><td style="padding:8px 40px 8px"><a href="${esc(opts.cta.href)}" style="display:inline-block;background:${C.accent};color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:13px 22px;border-radius:10px">${esc(opts.cta.label)}</a></td></tr>`
    : '';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(opts.heading)}</title></head>
<body style="margin:0;padding:0;background:${C.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${C.text}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(opts.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:16px;overflow:hidden;border:1px solid ${C.line}">
<tr><td style="background:${C.dark};padding:28px 40px;background-image:linear-gradient(120deg,#070A14 0%,#121A3A 60%,#2A1A66 100%)">
<img src="${esc(config.siteUrl)}/assets/aspr-logo-white.png" width="132" alt="ASPR Global Tech" style="display:block;border:0;height:auto">
</td></tr>
<tr><td style="padding:36px 40px 8px"><h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:${C.ink};font-weight:700">${esc(opts.heading)}</h1>${opts.body}</td></tr>
${cta}
<tr><td style="padding:28px 40px 32px;border-top:1px solid ${C.line};font-size:13px;line-height:1.6;color:${C.muted}">
ASPR Global Tech · Websites, 3D experiences, apps and custom software<br>
<a href="${esc(config.siteUrl)}" style="color:${C.accent};text-decoration:none">${esc(config.siteUrl.replace(/^https?:\/\//, ''))}</a>
</td></tr></table></td></tr></table></body></html>`;
}

const p = (html: string) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.65">${html}</p>`;

function rows(items: [string, unknown][]): string {
  const filled = items.filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== '');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;border:1px solid ${C.line};border-radius:12px;border-collapse:separate">
${filled.map(([k, v], i) => `<tr><td style="padding:10px 14px;font-size:13px;color:${C.muted};width:38%;vertical-align:top;${i ? `border-top:1px solid ${C.line}` : ''}">${esc(k)}</td><td style="padding:10px 14px;font-size:14px;color:${C.ink};vertical-align:top;${i ? `border-top:1px solid ${C.line}` : ''}">${nl2br(String(v))}</td></tr>`).join('')}
</table>`;
}
const textRows = (items: [string, unknown][]) => items.filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== '').map(([k, v]) => `${k}: ${v}`).join('\n');

export interface LeadEmailData {
  id: number; refNo: string; source: string; name: string; email: string; phone: string; company: string;
  projectType: string; budget: string; timeline: string; heardFrom: string; message: string; attachments: number;
}

/** To ASPR: a new quote request or contact enquiry. */
export function leadForTeam(l: LeadEmailData): Email {
  const kind = l.source === 'contact' ? 'contact enquiry' : l.source === 'chat' ? 'chat lead' : 'project inquiry';
  const items: [string, unknown][] = [
    ['Reference', l.refNo], ['Name', l.name], ['Email', l.email], ['Phone', l.phone], ['Company', l.company],
    ['Project type', l.projectType], ['Budget', l.budget], ['Timeline', l.timeline], ['Heard about us', l.heardFrom],
    ['Attachments', l.attachments ? `${l.attachments} file(s) — download in the admin` : ''],
  ];
  const link = `${config.siteUrl}/admin/leads/${l.id}`;
  return {
    subject: `New Project Inquiry — ${l.refNo}`,
    html: layout({
      preheader: `${l.name}${l.company ? ` (${l.company})` : ''} · ${l.projectType || 'New enquiry'}`,
      heading: `New ${kind}`,
      body: rows(items) + `<div style="margin:0 0 20px;padding:16px;background:${C.bg};border-radius:12px;font-size:14px;line-height:1.65;color:${C.ink}">${nl2br(l.message)}</div>`
        + p(`Reply directly to this email to answer ${esc(l.name)}.`),
      cta: { label: 'Open in admin', href: link },
    }),
    text: `New ${kind}\n\n${textRows(items)}\n\n${l.message}\n\nOpen in admin: ${link}`,
  };
}

/** To the client: confirmation with their inquiry ID. */
export function leadForClient(l: LeadEmailData, company: { email?: string; phone?: string }): Email {
  const items: [string, unknown][] = [['Inquiry ID', l.refNo], ['Project type', l.projectType], ['Budget', l.budget], ['Timeline', l.timeline]];
  const contact = [company.email, company.phone].filter(Boolean).join(' · ');
  return {
    subject: 'Thank you for contacting ASPR Global Tech',
    html: layout({
      preheader: `We've received your inquiry ${l.refNo}. We reply within one working day.`,
      heading: `Thanks, ${l.name.split(' ')[0]}. We've got your inquiry.`,
      body: p('Your message has reached our team. A real person will read it and reply within one working day, usually with a few questions or a time for a short call.')
        + rows(items)
        + p(`Keep your inquiry ID handy: <strong style="color:${C.ink}">${esc(l.refNo)}</strong>. If you need to add anything, just reply to this email.`)
        + (contact ? p(`Prefer to talk? Reach us at ${esc(contact)}.`) : ''),
      cta: { label: 'See how we work', href: `${config.siteUrl}/process` },
    }),
    text: `Thanks, ${l.name}. We've received your inquiry.\n\n${textRows(items)}\n\nWe reply within one working day. Reply to this email to add anything.${contact ? `\n\n${contact}` : ''}`,
  };
}

export interface ApplicationEmailData { id: number; refNo: string; role: string; name: string; email: string; phone: string; portfolio: string; attachments: number }

export function applicationForTeam(a: ApplicationEmailData): Email {
  const items: [string, unknown][] = [['Reference', a.refNo], ['Role', a.role], ['Name', a.name], ['Email', a.email], ['Phone', a.phone], ['Links', a.portfolio], ['Attachments', a.attachments || '']];
  const link = `${config.siteUrl}/admin/applications`;
  return {
    subject: `New application: ${a.role} — ${a.refNo}`,
    html: layout({ preheader: `${a.name} applied for ${a.role}`, heading: 'New job application', body: rows(items), cta: { label: 'Open in admin', href: link } }),
    text: `New job application\n\n${textRows(items)}\n\n${link}`,
  };
}

export function applicationForApplicant(a: ApplicationEmailData): Email {
  return {
    subject: `Application received: ${a.role}`,
    html: layout({
      preheader: `Reference ${a.refNo}`,
      heading: `Thanks for applying, ${a.name.split(' ')[0]}.`,
      body: p(`We've received your application for <strong style="color:${C.ink}">${esc(a.role)}</strong>. We look at the work first and reply within one working day.`)
        + p(`Your reference: <strong style="color:${C.ink}">${esc(a.refNo)}</strong>.`),
    }),
    text: `Thanks for applying for ${a.role}. Reference ${a.refNo}. We reply within one working day.`,
  };
}

export function passwordReset(d: { name: string; link: string; minutes: number }): Email {
  return {
    subject: 'Reset your ASPR admin password',
    html: layout({
      preheader: `This link expires in ${d.minutes} minutes.`,
      heading: 'Reset your password',
      body: p(`Hi ${esc(d.name)}, someone (hopefully you) asked to reset the password for your ASPR admin account.`)
        + p(`The link below works once and expires in ${d.minutes} minutes. If you didn't ask for this, ignore this email; your password stays the same.`),
      cta: { label: 'Choose a new password', href: d.link },
    }),
    text: `Reset your ASPR admin password (expires in ${d.minutes} minutes):\n${d.link}\n\nIf you didn't ask for this, ignore this email.`,
  };
}
