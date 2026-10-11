'use client';

import { ArrowLeft, Bot, ExternalLink, User } from 'lucide-react';
import Link from 'next/link';
import { adminApi } from '@/lib/admin/api';
import { formatDateTime, timeAgo } from '@/lib/admin/format';
import { useResource, useUrlState } from '@/lib/admin/hooks';
import type { ChatMessage, ChatSession } from '@/lib/admin/types';
import { useSession } from '../SessionProvider';
import { Card, PageHeader } from '../ui/Layout';
import { EmptyState, ErrorState, SkeletonRows, Spinner } from '../ui/States';
import { StatusPill } from '../ui/StatusPill';

export function ChatPage() {
  const [f, setF] = useUrlState(['session'] as const);
  const sessions = useResource(() => adminApi.get<ChatSession[]>('/chat/sessions'), []);
  const selected = f.session;
  const current = sessions.data?.find((s) => s.visitorId === selected);

  return (
    <>
      <PageHeader title="Chat" description="Conversations with the website assistant. Transcripts are kept while the visitor's session is active (30 days)." />
      <Card className="overflow-hidden">
        <div className="grid min-h-[60dvh] md:grid-cols-[20rem_1fr]">
          <div className={`border-line md:border-r ${selected ? 'hidden md:block' : ''}`}>
            <h2 className="border-b border-line px-4 py-3 text-sm font-semibold text-text">Recent conversations</h2>
            {sessions.error ? <ErrorState error={sessions.error} onRetry={sessions.reload} />
              : !sessions.data ? <SkeletonRows rows={6} />
              : !sessions.data.length ? <EmptyState title="No conversations yet">Chats from the website assistant show up here.</EmptyState>
              : (
                <ul className="max-h-[70dvh] overflow-y-auto">
                  {sessions.data.map((s) => {
                    const active = s.visitorId === selected;
                    return (
                      <li key={s.visitorId}>
                        <button type="button" onClick={() => setF({ session: s.visitorId })} aria-current={active ? 'true' : undefined}
                          className={`block w-full border-b border-line/60 px-4 py-3 text-left transition-colors ${active ? 'bg-brand/10' : 'hover:bg-surface'}`}>
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-sm text-text">{s.sourcePath || 'Unknown page'}</span>
                            <span className="shrink-0 text-xs text-subtle">{timeAgo(s.lastMessageAt)}</span>
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-xs text-muted">
                            <span>{s.messageCount} messages</span>
                            {s.enquiryRef && <StatusPill tone="success">Lead {s.enquiryRef}</StatusPill>}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
          </div>
          <div className={`${selected ? '' : 'hidden md:block'} min-w-0`}>
            {selected ? <Transcript sessionId={selected} session={current} onBack={() => setF({ session: '' })} /> : (
              <EmptyState title="Choose a conversation" className="h-full">Pick one on the left to read the transcript.</EmptyState>
            )}
          </div>
        </div>
      </Card>
    </>
  );
}

function Transcript({ sessionId, session, onBack }: { sessionId: string; session?: ChatSession; onBack: () => void }) {
  const { can } = useSession();
  const res = useResource(() => adminApi.get<ChatMessage[]>(`/chat/sessions/${encodeURIComponent(sessionId)}/messages`), [sessionId]);
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
        <button type="button" onClick={onBack} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-surface-3 hover:text-text md:hidden" aria-label="Back to conversations">
          <ArrowLeft size={16} aria-hidden="true" />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold text-text">Transcript</h2>
          <p className="truncate text-xs text-subtle">{session ? `Started ${formatDateTime(session.createdAt)} on ${session.sourcePath || 'an unknown page'}` : sessionId}</p>
        </div>
        {session?.enquiryRef && can('leads') && (
          <Link href={`/admin/leads?q=${encodeURIComponent(session.enquiryRef)}&status=all`} className="text-xs text-brand hover:text-text">Open lead</Link>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {res.error ? <ErrorState error={res.error} onRetry={res.reload} />
          : !res.data ? <Spinner label="Loading transcript…" />
          : !res.data.length ? <EmptyState title="Transcript not available">It may have expired and been removed.</EmptyState>
          : (
            <ol className="space-y-4">
              {res.data.map((m, i) => {
                const user = m.role === 'user';
                return (
                  <li key={i} className={`flex gap-2.5 ${user ? 'flex-row-reverse' : ''}`}>
                    <span aria-hidden="true" className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${user ? 'bg-brand/20 text-brand' : 'bg-accent/15 text-accent-soft'}`}>
                      {user ? <User size={14} /> : <Bot size={14} />}
                    </span>
                    <div className={`max-w-[85%] min-w-0 ${user ? 'text-right' : ''}`}>
                      <p className="sr-only">{user ? 'Visitor' : 'Assistant'}:</p>
                      <div className={`inline-block whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-left text-sm leading-relaxed ${user ? 'rounded-tr-sm bg-brand/15 text-text' : 'rounded-tl-sm border border-line bg-surface-2 text-text'}`}>{m.content}</div>
                      {m.sources?.length > 0 && (
                        <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-subtle">
                          Sources: {m.sources.map((s) => <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 hover:text-text">{s.title}<ExternalLink size={10} aria-hidden="true" /></a>)}
                        </p>
                      )}
                      <p className="mt-0.5 text-[0.7rem] text-subtle">{formatDateTime(m.createdAt)}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
      </div>
    </div>
  );
}
