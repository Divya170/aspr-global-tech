'use client';

/**
 * Last-resort error page (the root layout itself failed). Inline styles only, since the stylesheet
 * may not have loaded: a soft brand glow and grid behind the message, no external assets.
 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{
        margin: 0, minHeight: '100vh', display: 'grid', placeItems: 'center', color: '#eef0f8', fontFamily: 'system-ui, sans-serif', textAlign: 'center', padding: 24,
        backgroundColor: '#05070d',
        backgroundImage: 'radial-gradient(ellipse 60% 45% at 50% 38%, rgba(65,112,255,0.22), transparent 70%), radial-gradient(ellipse 40% 35% at 78% 20%, rgba(139,92,246,0.16), transparent 70%), linear-gradient(to right, rgba(148,163,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,255,0.06) 1px, transparent 1px)',
        backgroundSize: '100% 100%, 100% 100%, 64px 64px, 64px 64px',
      }}>
        <div style={{ maxWidth: 520, padding: '40px 28px', borderRadius: 24, border: '1px solid rgba(148,163,255,0.2)', background: 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.015))', boxShadow: '0 40px 90px -40px rgba(65,112,255,0.7)' }}>
          <span aria-hidden="true" style={{ display: 'block', width: 10, height: 10, margin: '0 auto 22px', borderRadius: '50%', background: '#5eead4', boxShadow: '0 0 0 6px rgba(94,234,212,0.15), 0 0 18px #5eead4' }} />
          <h1 style={{ fontSize: 32, margin: '0 0 12px', letterSpacing: '-0.02em' }}>Something went wrong.</h1>
          <p style={{ color: '#a6aec4', margin: '0 0 24px' }}>Please try again in a moment.</p>
          <button onClick={reset} style={{ background: '#4170ff', color: '#fff', border: 0, borderRadius: 999, padding: '12px 22px', fontSize: 15, cursor: 'pointer', boxShadow: '0 10px 30px -10px rgba(65,112,255,0.8)' }}>Try again</button>
        </div>
      </body>
    </html>
  );
}
