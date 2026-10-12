'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { formatNumber, monthLong, monthShort } from '@/lib/admin/format';

/*
 * Small dependency-free charts for the dashboard, on the light surface. Series 1 = brand blue,
 * series 2 = the teal tone (both ≥ 4.5:1 on white and distinct in hue and lightness for CVD).
 * Colours are CSS variables, applied through style so SVG resolves them.
 * Text always uses text tokens; identity comes from the swatch next to it.
 */
const SERIES = ['var(--color-brand)', 'var(--color-tone-teal)'] as const;

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/** Round the axis maximum up to a clean step (1, 2, 5 × 10ⁿ). */
function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0, 1];
  const raw = max / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const s = Math.max(1, step);
  const top = Math.ceil(max / s) * s;
  const out: number[] = [];
  for (let v = 0; v <= top + 1e-9; v += s) out.push(Math.round(v));
  return out;
}

export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
      {items.map((i) => (
        <li key={i.label} className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-[3px]" style={{ background: i.color }} />{i.label}
        </li>
      ))}
    </ul>
  );
}

/** Paired columns per month (all leads vs won), with hover tooltip and a screen-reader table. */
export function LeadsByMonthChart({ data }: { data: { month: string; total: number; won: number }[] }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const height = 220;
  const pad = { top: 12, right: 8, bottom: 26, left: 32 };
  const ticks = niceTicks(Math.max(...data.map((d) => d.total), 0));
  const top = ticks[ticks.length - 1] || 1;
  const innerW = Math.max(0, width - pad.left - pad.right);
  const innerH = height - pad.top - pad.bottom;
  const band = data.length ? innerW / data.length : 0;
  const barW = Math.max(3, Math.min(14, (band - 10) / 2));
  const y = (v: number) => pad.top + innerH - (v / top) * innerH;
  const totalAll = data.reduce((s, d) => s + d.total, 0);
  const wonAll = data.reduce((s, d) => s + d.won, 0);
  const narrow = band < 34;

  /** Column with a 4px rounded data end and a square baseline. */
  const column = (x: number, v: number, color: string) => {
    if (v <= 0) return null;
    const yTop = y(v);
    const h = pad.top + innerH - yTop;
    const r = Math.min(4, h, barW / 2);
    const d = `M${x},${pad.top + innerH} V${yTop + r} Q${x},${yTop} ${x + r},${yTop} H${x + barW - r} Q${x + barW},${yTop} ${x + barW},${yTop + r} V${pad.top + innerH} Z`;
    return <path d={d} style={{ fill: color }} />;
  };

  return (
    <figure className="m-0">
      <figcaption className="sr-only">Leads by month, last 12 months: {formatNumber(totalAll)} leads in total, {formatNumber(wonAll)} won.</figcaption>
      <div ref={ref} className="relative" onMouseLeave={() => setHover(null)}>
        {width > 0 && (
          <svg width={width} height={height} role="img" aria-label={`Column chart of leads per month. ${formatNumber(totalAll)} leads and ${formatNumber(wonAll)} won over the last 12 months.`}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} style={{ stroke: 'var(--color-line)' }} strokeWidth={1} />
                <text x={pad.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} style={{ fill: 'var(--color-subtle)' }} className="tabular-nums">{formatNumber(t)}</text>
              </g>
            ))}
            {data.map((d, i) => {
              const x0 = pad.left + i * band;
              const cx = x0 + band / 2;
              return (
                <g key={d.month}>
                  {hover === i && <rect x={x0 + 1} y={pad.top} width={band - 2} height={innerH} style={{ fill: 'var(--color-surface-3)' }} rx={4} />}
                  {column(cx - barW - 1, d.total, SERIES[0])}
                  {column(cx + 1, d.won, SERIES[1])}
                  {(!narrow || i % 2 === 1) && (
                    <text x={cx} y={height - 8} textAnchor="middle" fontSize={11} style={{ fill: 'var(--color-subtle)' }}>{monthShort(d.month)}</text>
                  )}
                  <rect x={x0} y={pad.top} width={band} height={innerH + pad.bottom} fill="transparent" onMouseEnter={() => setHover(i)} />
                </g>
              );
            })}
          </svg>
        )}
        {hover !== null && data[hover] && width > 0 && (
          <div aria-hidden="true" className="pointer-events-none absolute z-10 min-w-36 rounded-lg border border-line-strong bg-surface-3 px-3 py-2 text-xs shadow-xl shadow-navy/16"
            style={{ left: Math.min(Math.max(pad.left + hover * band + band / 2 - 72, 0), width - 150), top: 0 }}>
            <p className="mb-1 font-medium text-text">{monthLong(data[hover].month)}</p>
            <p className="flex items-center justify-between gap-4 text-muted"><span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-[2px]" style={{ background: SERIES[0] }} />All leads</span><span className="tabular-nums text-text">{data[hover].total}</span></p>
            <p className="flex items-center justify-between gap-4 text-muted"><span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-[2px]" style={{ background: SERIES[1] }} />Won</span><span className="tabular-nums text-text">{data[hover].won}</span></p>
          </div>
        )}
        {width === 0 && <div style={{ height }} />}
      </div>
      <div className="mt-2"><Legend items={[{ label: 'All leads', color: SERIES[0] }, { label: 'Won', color: SERIES[1] }]} /></div>
      <table className="sr-only">
        <caption>Leads per month</caption>
        <thead><tr><th scope="col">Month</th><th scope="col">All leads</th><th scope="col">Won</th></tr></thead>
        <tbody>{data.map((d) => <tr key={d.month}><th scope="row">{monthLong(d.month)}</th><td>{d.total}</td><td>{d.won}</td></tr>)}</tbody>
      </table>
    </figure>
  );
}

/**
 * Horizontal bars for a ranked breakdown. Labels and values are real text, so the list itself is
 * the accessible data view; the bars are decorative.
 */
export function HorizontalBars({ items, label, color = SERIES[0], renderLabel, emptyText = 'No data yet.' }: {
  items: { key: string; label: string; value: number }[]; label: string; color?: string; renderLabel?: (i: { key: string; label: string }) => ReactNode; emptyText?: string;
}) {
  const max = Math.max(...items.map((i) => i.value), 1);
  const total = items.reduce((s, i) => s + i.value, 0);
  if (!items.length) return <p className="py-6 text-center text-sm text-muted">{emptyText}</p>;
  return (
    <ul aria-label={label} className="space-y-2.5">
      {items.map((i) => {
        const pct = total ? Math.round((i.value / total) * 100) : 0;
        return (
          <li key={i.key}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate text-text">{renderLabel ? renderLabel(i) : i.label}</span>
              <span className="shrink-0 tabular-nums text-muted"><span className="text-text">{formatNumber(i.value)}</span> · {pct}%</span>
            </div>
            <div aria-hidden="true" className="h-2 rounded-full bg-surface">
              <div className="h-2 rounded-full" style={{ width: `${Math.max(2, (i.value / max) * 100)}%`, background: color }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
