'use client';

/**
 * Last-resort error page (the root layout itself failed). Inline styles only, since the stylesheet
 * may not have loaded: a soft brand glow and grid behind the message, no external assets. Colours are
 * main's light-identity tokens as literals (bg #F5F7FB, text #111F38, muted #45526B, brand #1A4AD8, mint #25D3A0).
 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{
        margin: 0, minHeight: '100vh', display: 'grid', placeItems: 'center', color: '#111F38', fontFamily: 'system-ui, sans-serif', textAlign: 'center', padding: 24,
        backgroundColor: '#F5F7FB',
        backgroundImage: 'radial-gradient(ellipse 60% 45% at 50% 38%, rgba(143,168,240,0.35), transparent 70%), radial-gradient(ellipse 40% 35% at 78% 20%, rgba(37,211,160,0.14), transparent 70%), linear-gradient(to right, rgba(17,31,56,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(17,31,56,0.05) 1px, transparent 1px)',
        backgroundSize: '100% 100%, 100% 100%, 64px 64px, 64px 64px',
      }}>
        <div style={{ maxWidth: 520, padding: '40px 28px', borderRadius: 24, border: '1px solid rgba(17,31,56,0.1)', background: '#FFFFFF', boxShadow: '0 30px 70px -30px rgba(17,31,56,0.25)' }}>
          <span aria-hidden="true" style={{ display: 'block', width: 10, height: 10, margin: '0 auto 22px', borderRadius: '50%', background: '#25D3A0', boxShadow: '0 0 0 6px rgba(37,211,160,0.22)' }} />
          <h1 style={{ fontSize: 32, margin: '0 0 12px', letterSpacing: '-0.02em' }}>Something went wrong.</h1>
          <p style={{ color: '#45526B', margin: '0 0 24px' }}>Please try again in a moment.</p>
          <button onClick={reset} style={{ background: '#1A4AD8', color: '#fff', border: 0, borderRadius: 999, padding: '12px 22px', fontSize: 15, fontWeight: 600, cursor: 'pointer', boxShadow: '0 10px 30px -12px rgba(26,74,216,0.55)' }}>Try again</button>
        </div>
      </body>
    </html>
  );
}
