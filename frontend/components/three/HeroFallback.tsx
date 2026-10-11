/**
 * Lightweight stand-in for the 3D hero: the same composition (glowing core, website,
 * dashboard and phone panels) in HTML and CSS. Shown first on every device, and kept on
 * phones, low-power devices and for reduced motion.
 */
const line = (w: string, extra = '') => <span className={`block h-2 rounded-full bg-navy/15 ${extra}`} style={{ width: w }} />;

export function HeroFallback() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden [perspective:1400px]">
      {/* core */}
      <div className="absolute left-1/2 top-[46%] size-[min(46vw,340px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_40%_35%,color-mix(in_srgb,var(--color-accent)_33%,transparent),color-mix(in_srgb,var(--color-brand)_15%,transparent)_45%,transparent_70%)] blur-[2px]" />
      <div className="absolute left-1/2 top-[46%] size-[min(58vw,460px)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-brand-soft/20 [transform:translate(-50%,-50%)_rotateX(70deg)]" />
      <div className="absolute left-1/2 top-[46%] size-[min(74vw,600px)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-brand/20 [transform:translate(-50%,-50%)_rotateX(74deg)_rotateZ(20deg)]" />

      {/* website panel */}
      <div className="hero-float absolute left-[28%] top-[6%] hidden w-[34%] max-w-[420px] rounded-2xl border border-brand-soft/30 bg-surface/80 p-3 shadow-[0_30px_80px_-30px_color-mix(in_srgb,var(--color-brand)_36%,transparent)] [transform:rotateY(22deg)_rotateX(4deg)] md:block">
        <div className="mb-3 flex gap-1.5"><i className="size-2 rounded-full bg-danger/80" /><i className="size-2 rounded-full bg-warning/80" /><i className="size-2 rounded-full bg-success/80" /></div>
        <div className="space-y-2 p-2">
          {line('55%', 'h-3 bg-navy/30')}{line('40%', 'h-3 bg-navy/25')}{line('70%')}
          <div className="flex gap-2 pt-2"><span className="h-5 w-16 rounded-full bg-brand" /><span className="h-5 w-14 rounded-full bg-surface-3" /></div>
        </div>
      </div>

      {/* dashboard panel */}
      <div className="hero-float absolute right-[3%] top-[36%] hidden w-[33%] max-w-[400px] rounded-2xl border border-accent/30 bg-surface/80 p-4 shadow-[0_30px_80px_-30px_color-mix(in_srgb,var(--color-accent)_36%,transparent)] [animation-delay:-3s] [transform:rotateY(-24deg)] md:block">
        <div className="grid grid-cols-3 gap-2">
          {['bg-brand', 'bg-accent', 'bg-signal'].map((c) => <div key={c} className="rounded-lg bg-surface-3 p-2">{line('60%')}<span className={`mt-2 block h-1.5 w-8 rounded-full ${c}`} /></div>)}
        </div>
        <svg viewBox="0 0 200 70" className="mt-3 w-full"><path d="M0 60 L25 52 L50 55 L75 38 L100 42 L125 25 L150 30 L175 14 L200 18" fill="none" stroke="var(--color-brand)" strokeWidth="2.5" /><path d="M0 60 L25 52 L50 55 L75 38 L100 42 L125 25 L150 30 L175 14 L200 18 L200 70 L0 70Z" fill="url(#g)" opacity=".5" /><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--color-brand)" /><stop offset="1" stopColor="var(--color-brand)" stopOpacity="0" /></linearGradient></defs></svg>
      </div>

      {/* phone */}
      <div className="hero-float absolute bottom-[8%] left-[58%] hidden w-[11%] max-w-[130px] rounded-[1.4rem] border border-brand-soft/30 bg-surface/85 p-2 [animation-delay:-5s] [transform:rotateY(16deg)] lg:block">
        <div className="h-14 rounded-xl bg-gradient-to-br from-brand to-brand-strong" />
        <div className="mt-2 space-y-1.5">{[0, 1, 2].map((i) => <div key={i} className="h-5 rounded-md bg-surface-3" />)}</div>
      </div>
    </div>
  );
}
