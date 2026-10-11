'use client';

import { useState } from 'react';
import { ArrowRight, Check, CircleAlert, Loader2, Mail } from 'lucide-react';
import { ApiError, request } from '@/lib/client';

/**
 * Footer newsletter sign-up in main's style for the navy footer: a translucent pill with a
 * brand-soft border, a mail icon that lights up and a square brand arrow button. Tailwind only,
 * so forms.css stays off every page.
 */
export function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) { setError('Enter a valid email address.'); return; }
    setState('sending'); setError('');
    try {
      const r = await request<{ message?: string }>('/api/newsletter/subscribe', { method: 'POST', json: { email: email.trim(), source: 'footer' } });
      setMessage(r?.message || 'You are subscribed.');
      setState('done');
    } catch (err) {
      setError(err instanceof ApiError ? (err.fieldErrors?.email || err.message) : 'Something went wrong. Please try again.');
      setState('idle');
    }
  }

  if (state === 'done') {
    return (
      <p role="status" className="flex max-w-[380px] items-center gap-3 rounded-[14px] border border-brand-soft/35 bg-surface/[0.04] px-3.5 py-3 text-[0.9375rem] font-bold text-white motion-safe:animate-[fade-up_0.6s_var(--ease-out-expo)_both]">
        <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-brand text-white"><Check size={18} strokeWidth={2.6} /></span>{message}
      </p>
    );
  }
  return (
    <form onSubmit={submit} noValidate>
      <label htmlFor="newsletter-email" className="mb-3 block text-[0.9375rem] font-semibold text-white">Occasional notes on building better software</label>
      <div className={`group/nl relative flex max-w-[380px] items-center rounded-[14px] border bg-surface/[0.04] p-[5px] transition-[border-color,box-shadow] duration-200 focus-within:border-brand-soft focus-within:shadow-[0_0_0_4px_color-mix(in_srgb,var(--color-brand-soft)_16%,transparent)] ${error ? 'border-[color-mix(in_srgb,var(--color-danger)_35%,var(--color-surface))]' : 'border-brand-soft/35 hover:border-brand-soft/60'}`}>
        <Mail aria-hidden="true" size={16} strokeWidth={1.8} className="ml-2.5 shrink-0 text-on-navy/60 transition-colors duration-300 group-focus-within/nl:text-brand-soft" />
        <input
          id="newsletter-email" type="email" autoComplete="email" placeholder="you@company.com" value={email}
          onChange={(e) => setEmail(e.target.value)} aria-invalid={!!error} aria-describedby={error ? 'newsletter-error' : undefined}
          className="h-[42px] min-w-0 flex-1 bg-transparent px-2.5 text-[0.9375rem] text-white placeholder:text-on-navy/65 focus:outline-none"
        />
        <button type="submit" disabled={state === 'sending'} aria-label="Subscribe"
          className="group/sub grid h-[42px] w-[46px] shrink-0 place-items-center rounded-[10px] bg-brand text-white transition-[background-color,transform] duration-200 hover:bg-brand-strong active:scale-95 disabled:opacity-60">
          {state === 'sending'
            ? <Loader2 size={16} aria-hidden="true" className="motion-safe:animate-spin" />
            : <ArrowRight size={16} aria-hidden="true" className="transition-transform duration-300 group-hover/sub:translate-x-0.5" />}
        </button>
      </div>
      {error && <p id="newsletter-error" className="mt-2 flex items-center gap-1.5 text-[0.8125rem] font-semibold text-[color-mix(in_srgb,var(--color-danger)_30%,var(--color-surface))]"><CircleAlert aria-hidden="true" size={13} className="shrink-0" />{error}</p>}
    </form>
  );
}
