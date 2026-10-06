'use client';

import { useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { ApiError, request } from '@/lib/client';

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
    return <p role="status" className="flex items-center gap-2 text-sm text-success"><Check size={16} aria-hidden="true" />{message}</p>;
  }
  return (
    <form onSubmit={submit} noValidate>
      <label htmlFor="newsletter-email" className="mb-2 block text-sm font-medium text-text">Occasional notes on building better software</label>
      <div className="flex rounded-full border border-line-strong bg-white/[0.03] p-1 focus-within:border-brand-soft/60">
        <input
          id="newsletter-email" type="email" autoComplete="email" placeholder="you@company.com" value={email}
          onChange={(e) => setEmail(e.target.value)} aria-invalid={!!error} aria-describedby={error ? 'newsletter-error' : undefined}
          className="min-w-0 flex-1 bg-transparent px-4 text-sm text-text placeholder:text-subtle focus:outline-none"
        />
        <button type="submit" disabled={state === 'sending'} aria-label="Subscribe"
          className="grid size-9 shrink-0 place-items-center rounded-full bg-brand text-white transition-colors hover:bg-brand-strong disabled:opacity-60">
          <ArrowRight size={16} aria-hidden="true" />
        </button>
      </div>
      {error && <p id="newsletter-error" className="mt-2 text-xs text-danger">{error}</p>}
    </form>
  );
}
