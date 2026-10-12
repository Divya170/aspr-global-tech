import { ImageResponse } from 'next/og';
import { SITE_URL } from '@/lib/site';

export const alt = 'ASPR Global Tech: Websites, 3D Experiences, Web Apps and Custom Software';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/**
 * Default social share image for every page that doesn't set its own. System fonts only.
 * next/og cannot read CSS variables, so the colours are main's light-identity tokens as literals:
 * bg #F5F7FB, text #111F38, muted #45526B, brand #1A4AD8, brand-soft #8FA8F0, mint #25D3A0.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          padding: '72px 80px', color: '#111F38', fontFamily: 'sans-serif',
          backgroundColor: '#F5F7FB',
          backgroundImage:
            'radial-gradient(ellipse 70% 80% at 85% 15%, rgba(143,168,240,0.55), rgba(143,168,240,0) 60%), radial-gradient(ellipse 55% 60% at 8% 100%, rgba(37,211,160,0.22), rgba(37,211,160,0) 60%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 14, height: 14, borderRadius: 999, backgroundColor: '#25D3A0', boxShadow: '0 0 0 6px rgba(37,211,160,0.25)' }} />
          <div style={{ fontSize: 22, letterSpacing: 6, textTransform: 'uppercase', color: '#1A4AD8', fontWeight: 700 }}>{new URL(SITE_URL).host.replace(/^www\./, '')}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 96, fontWeight: 800, letterSpacing: -3, lineHeight: 1.02 }}>ASPR Global Tech</div>
          <div style={{ marginTop: 28, fontSize: 36, color: '#45526B' }}>Websites · 3D Experiences · Web Apps · Custom Software</div>
        </div>
        <div style={{ display: 'flex', height: 4, width: 220, borderRadius: 4, backgroundImage: 'linear-gradient(90deg, #1A4AD8, #25D3A0)' }} />
      </div>
    ),
    size,
  );
}
