import { ImageResponse } from 'next/og';
import { SITE_URL } from '@/lib/site';

export const alt = 'ASPR Global Tech: Websites, 3D Experiences, Web Apps and Custom Software';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** Default social share image for every page that doesn't set its own. System fonts only. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          padding: '72px 80px', color: '#eef0f8', fontFamily: 'sans-serif',
          backgroundColor: '#05070d',
          backgroundImage:
            'radial-gradient(ellipse 70% 80% at 85% 20%, rgba(65,112,255,0.38), transparent 60%), radial-gradient(ellipse 55% 60% at 10% 100%, rgba(139,92,246,0.30), transparent 60%), linear-gradient(160deg, #0b1638 0%, #05070d 60%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 14, height: 14, borderRadius: 999, backgroundColor: '#5eead4', boxShadow: '0 0 24px #5eead4' }} />
          <div style={{ fontSize: 22, letterSpacing: 6, textTransform: 'uppercase', color: '#8aa6ff' }}>{new URL(SITE_URL).host.replace(/^www\./, '')}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 96, fontWeight: 700, letterSpacing: -3, lineHeight: 1.02 }}>ASPR Global Tech</div>
          <div style={{ marginTop: 28, fontSize: 36, color: '#a6aec4' }}>Websites · 3D Experiences · Web Apps · Custom Software</div>
        </div>
        <div style={{ display: 'flex', height: 4, width: 220, borderRadius: 4, backgroundImage: 'linear-gradient(90deg, #4170ff, #8b5cf6)' }} />
      </div>
    ),
    size,
  );
}
