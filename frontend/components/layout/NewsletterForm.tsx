'use client';

import { useState } from 'react';
import { ArrowRight, Check, CircleAlert, Loader2, Mail } from 'lucide-react';
import { ApiError, request } from '@/lib/client';

/**
 * Footer newsletter sign-up: a glass pill whose border glows on focus, with a mail icon that
 * lights up and an arrow button that nudges on hover. Tailwind only, so forms.css stays off
 * every page.
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
      <p role="status" className="flex items-center gap-3 rounded-full border border-success/30 bg-success/[0.07] py-1.5 pl-1.5 pr-4 text-sm text-success motion-safe:animate-[fade-up_0.6s_var(--ease-out-expo)_both]">
        <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full bg-success/20 shadow-[0_0_18px_-4px_color-mix(in_srgb,var(--color-accent)_56%,transparent)]"><Check size={16} strokeWidth={2.6} /></span>{message}
      </p>
    );
  }
  return (
    <form onSubmit={submit} noValidate>
      <label htmlFor="newsletter-email" className="mb-2 block text-sm font-medium text-text">Occasional notes on building better software</label>
      <div className={`group/nl relative flex items-center rounded-full border bg-surface p-1 shadow-[inset_0_1px_0_color-mix(in_srgb,var(--color-surface)_4%,transparent)] transition-[border-color,box-shadow,background-color] duration-300 hover:border-brand-soft/40 focus-within:border-brand-soft/70 focus-within:bg-brand/[0.06] focus-within:shadow-[0_0_0_4px_color-mix(in_srgb,var(--color-brand)_12%,transparent),0_14px_36px_-18px_color-mix(in_srgb,var(--color-brand)_57%,transparent)] ${error ? 'border-danger/70' : 'border-line-strong'}`}>
        <Mail aria-hidden="true" size={16} strokeWidth={1.8} className="ml-3 shrink-0 text-subtle transition-colors duration-300 group-focus-within/nl:text-brand" />
        <input
          id="newsletter-email" type="email" autoComplete="email" placeholder="you@company.com" value={email}
          onChange={(e) => setEmail(e.target.value)} aria-invalid={!!error} aria-describedby={error ? 'newsletter-error' : undefined}
          className="h-9 min-w-0 flex-1 bg-transparent px-3 text-sm text-text placeholder:text-subtle focus:outline-none"
        />
        <button type="submit" disabled={state === 'sending'} aria-label="Subscribe"
          className="fx-shine group/sub grid size-9 shrink-0 place-items-center rounded-full bg-brand-strong text-white shadow-[0_0_0_1px_color-mix(in_srgb,var(--color-surface)_12%,transparent)_inset,0_8px_22px_-8px_color-mix(in_srgb,var(--color-brand)_54%,transparent)] transition-[background-color,box-shadow,transform] duration-300 hover:bg-brand-strong hover:shadow-[0_0_0_1px_color-mix(in_srgb,var(--color-surface)_18%,transparent)_inset,0_10px_28px_-8px_color-mix(in_srgb,var(--color-accent)_54%,transparent)] active:scale-95 disabled:opacity-60">
          {state === 'sending'
            ? <Loader2 size={16} aria-hidden="true" className="motion-safe:animate-spin" />
            : <ArrowRight size={16} aria-hidden="true" className="transition-transform duration-300 group-hover/sub:translate-x-0.5" />}
        </button>
      </div>
      {error && <p id="newsletter-error" className="mt-2 flex items-center gap-1.5 text-xs text-danger"><CircleAlert aria-hidden="true" size={13} className="shrink-0" />{error}</p>}
    </form>
  );
}
