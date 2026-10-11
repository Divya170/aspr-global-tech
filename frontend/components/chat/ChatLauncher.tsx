'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { MessageCircle } from 'lucide-react';

const ChatWidget = dynamic(() => import('./ChatWidget').then((m) => m.ChatWidget), { ssr: false });

const OPEN_KEY = 'aspr.chat.open';

/**
 * The chat launcher, without the chat. The full assistant (and its code) loads only when a
 * visitor opens it, or straight away when a conversation was left open on the previous page.
 * Keeps the assistant's JavaScript off every first page load.
 */
export function ChatLauncher() {
  const [mode, setMode] = useState<'idle' | 'open' | 'closed'>('idle');
  const pending = useRef<string | undefined>(undefined);

  useEffect(() => {
    let reopen = false;
    try { reopen = sessionStorage.getItem(OPEN_KEY) === '1'; } catch { /* storage blocked */ }
    if (reopen) setMode('open');
    // Other code can open the assistant with an `aspr:chat` event; load it first, then pass it on.
    const onAsk = (e: Event) => {
      pending.current = (e as CustomEvent<{ question?: string }>).detail?.question;
      setMode((m) => (m === 'idle' ? 'open' : m));
    };
    window.addEventListener('aspr:chat', onAsk);
    return () => window.removeEventListener('aspr:chat', onAsk);
  }, []);

  useEffect(() => {
    if (mode === 'idle' || !pending.current) return;
    const q = pending.current;
    pending.current = undefined;
    const t = setTimeout(() => window.dispatchEvent(new CustomEvent('aspr:chat', { detail: { question: q } })), 400);
    return () => clearTimeout(t);
  }, [mode]);

  if (mode !== 'idle') return <ChatWidget initialOpen={mode === 'open'} />;
  return (
    <button
      type="button" onClick={() => setMode('open')} aria-label="Chat with the ASPR assistant"
      // Matches the full widget's launcher so nothing moves when it takes over.
      className="fixed bottom-5 right-5 z-[80] grid size-14 place-items-center rounded-full border border-white/15 bg-brand text-white shadow-[0_12px_32px_-8px_color-mix(in_srgb,var(--color-brand)_42%,transparent)] transition-[background-color,transform,box-shadow] duration-300 ease-[var(--ease-out-expo)] hover:-translate-y-0.5 hover:bg-brand-strong hover:shadow-[0_16px_40px_-8px_color-mix(in_srgb,var(--color-accent)_42%,transparent)] active:scale-95 sm:bottom-6 sm:right-6"
    >
      <MessageCircle aria-hidden="true" size={25} strokeWidth={1.9} />
      <span aria-hidden="true" className="absolute right-1 top-1 size-3 rounded-full border-2 border-bg bg-signal" />
    </button>
  );
}
