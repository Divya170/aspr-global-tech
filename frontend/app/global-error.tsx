'use client';

/** Last-resort error page (the root layout itself failed). Plain styles: the stylesheet may not have loaded. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#05070d', color: '#eef0f8', fontFamily: 'system-ui, sans-serif', textAlign: 'center', padding: 24 }}>
        <div>
          <h1 style={{ fontSize: 32, margin: '0 0 12px' }}>Something went wrong.</h1>
          <p style={{ color: '#a6aec4', margin: '0 0 24px' }}>Please try again in a moment.</p>
          <button onClick={reset} style={{ background: '#4170ff', color: '#fff', border: 0, borderRadius: 999, padding: '12px 22px', fontSize: 15, cursor: 'pointer' }}>Try again</button>
        </div>
      </body>
    </html>
  );
}
