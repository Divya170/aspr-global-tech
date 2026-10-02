// Full-page status message in the design's visual language (loading, errors, 404).
export default function StatusScreen({ eyebrow, title, body, action, spinner = false }) {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '24px', fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif",
      backgroundColor: '#F5F7FB', backgroundImage: 'radial-gradient(circle at 88% 0%, #DBE8FA 0%, rgba(219,232,250,0) 46%),radial-gradient(#D6DEEC 1px, transparent 1.3px)', backgroundSize: '100% 100%,22px 22px' }}>
      <div role={spinner ? 'status' : 'alert'} style={{ maxWidth: '520px', width: '100%', background: '#fff', border: '1px solid #E3E8F2', borderRadius: '20px', padding: 'clamp(28px,4vw,44px)', boxShadow: '0 18px 40px -24px rgba(17,31,56,0.28)' }}>
        <img src="/assets/aspr-logo.png" alt="ASPR Global Tech" style={{ height: '44px', width: 'auto', marginBottom: '28px' }} />
        {spinner ? <span aria-hidden="true" className="aspr-spin" style={{ display: 'block', width: '36px', height: '36px', borderRadius: '50%', border: '3px solid #EAF0FD', borderTopColor: '#1A4AD8', marginBottom: '20px' }} /> : null}
        {eyebrow ? <p style={{ margin: 0, fontWeight: 800, fontSize: '13px', letterSpacing: '0.18em', color: '#1A4AD8' }}>{eyebrow}</p> : null}
        <h1 style={{ margin: '12px 0 0', fontWeight: 800, fontSize: 'clamp(26px,3vw,34px)', letterSpacing: '-0.025em', lineHeight: 1.15, color: '#111F38' }}>{title}</h1>
        {body ? <p style={{ margin: '12px 0 0', color: '#5A6380', fontSize: '16px', lineHeight: 1.6 }}>{body}</p> : null}
        {action ? <div style={{ marginTop: '24px', display: 'flex', flexWrap: 'wrap', gap: '12px' }}>{action}</div> : null}
      </div>
      <style>{'@keyframes aspr-spin{to{transform:rotate(360deg)}}.aspr-spin{animation:aspr-spin 800ms linear infinite}'}</style>
    </main>
  );
}

export const primaryBtn = { background: '#1A4AD8', color: '#fff', padding: '14px 22px', borderRadius: '12px', fontWeight: 700, fontSize: '15px', border: 'none', cursor: 'pointer', fontFamily: 'inherit' };
export const secondaryBtn = { background: '#fff', color: '#111F38', padding: '12.5px 20px', borderRadius: '12px', fontWeight: 700, fontSize: '15px', border: '1.5px solid #111F38', cursor: 'pointer', fontFamily: 'inherit' };
