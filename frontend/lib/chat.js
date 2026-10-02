// Site assistant: API client (streaming over Server-Sent Events) and a minimal, safe
// Markdown renderer for the model's replies. Browser-only.

/**
 * Streams the assistant's reply as frames: start | chunk | lead | done | error.
 * Raw fetch rather than a JSON helper, because the body has to be read as a stream.
 */
export async function* streamChat(question, sessionId, sourcePath, signal) {
  let res;
  try {
    res = await fetch('/api/chat/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, sourcePath, ...(sessionId ? { sessionId } : {}) }),
      signal,
    });
  } catch {
    yield { type: 'error', code: 'NETWORK', message: "We couldn't reach the assistant. Check your connection and try again." };
    return;
  }
  if (!res.ok || !res.body) {
    yield {
      type: 'error',
      code: res.status === 429 ? 'RATE_LIMIT' : 'HTTP_' + res.status,
      message: res.status === 429 ? "That's a lot of questions at once — give it a moment and try again." : "The assistant couldn't answer that. Please try again.",
    };
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  // Holds the partial trailing line, so a frame split across packets is reassembled.
  let buffer = '';
  while (true) {
    let result;
    try { result = await reader.read(); } catch { return; } // aborted by the caller
    if (result.done) break;
    buffer += decoder.decode(result.value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue; // ': ping' heartbeats land here
      try { yield JSON.parse(line.slice(6)); } catch { /* skip a malformed frame */ }
    }
  }
}

/** Greeting, starter prompts and the "what do you need" options. */
export async function getChatConfig() {
  try {
    const res = await fetch('/api/chat/config');
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

/** Transcript for a stored session, used to restore the chat after a page change. */
export async function getChatMessages(sessionId) {
  try {
    const res = await fetch(`/api/chat/sessions/${encodeURIComponent(sessionId)}/messages`);
    return res.ok ? await res.json() : [];
  } catch {
    return [];
  }
}

export async function submitChatLead(payload) {
  let res;
  try {
    res = await fetch('/api/chat/lead', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  } catch {
    throw Object.assign(new Error("We couldn't reach the server. Check your connection and try again."), { fields: {} });
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const fields = (body && body.errors) || {};
    const msg = Object.values(fields)[0] || (body && (Array.isArray(body.message) ? body.message[0] : body.message)) || 'Could not send your details. Please try again.';
    throw Object.assign(new Error(res.status >= 500 ? 'Something went wrong on our side. Please try again in a minute.' : msg), { fields });
  }
  return body;
}

// ─────────── Markdown ───────────
// Escape first, then build tags: every <, > and & in the model's output is neutralised
// before any transform runs, so the only tags in the result are ones emitted here.

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escapeHtml = (text) => text.replace(/[&<>"']/g, (c) => ESCAPES[c]);

/** Only site paths (with an optional #hash) and http(s) links may become anchors. */
function safeHref(href) {
  if (href.startsWith('//')) return null; // protocol-relative: looks local, leaves the site
  if (/^\/[a-zA-Z0-9\-._~/#]*$/.test(href)) return href;
  if (/^https?:\/\/[^\s"'<>]+$/i.test(href)) return href;
  return null;
}

/** Finished anchors are parked behind a token so emphasis passes can't mangle URLs. */
const HOLD = /%%H(\d+)%%/g;

function renderInline(text) {
  const held = [];
  const hold = (html) => `%%H${held.push(html) - 1}%%`;
  let out = text;
  out = out.replace(/`([^`]+)`/g, (_, code) => hold(`<code>${code}</code>`));
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) => {
    const safe = safeHref(href);
    if (!safe) return label;
    const external = safe.startsWith('http');
    return hold(`<a href="${safe}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${label}</a>`);
  });
  // Bare site paths mentioned in passing, e.g. "see /company#faq".
  out = out.replace(/(^|[\s(])(\/[a-z0-9#][a-z0-9\-/#]*)/gi, (_, lead, path) => {
    const trimmed = path.replace(/[.,;:!?)]+$/, '');
    return lead + hold(`<a href="${trimmed}">${trimmed}</a>`) + path.slice(trimmed.length);
  });
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  out = out.replace(/(^|[^_\w])_([^_\n]+)_/g, '$1<em>$2</em>');
  return out.replace(HOLD, (_, i) => held[Number(i)]);
}

export function renderMarkdown(source) {
  if (!source) return '';
  const blocks = [];
  let listTag = null, items = [], para = [];
  const flushList = () => { if (!listTag) return; blocks.push(`<${listTag}>${items.map((i) => `<li>${i}</li>`).join('')}</${listTag}>`); listTag = null; items = []; };
  const flushPara = () => { if (!para.length) return; blocks.push(`<p>${para.join('<br>')}</p>`); para = []; };

  for (const line of escapeHtml(source).split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) { flushList(); flushPara(); continue; }
    const bullet = trimmed.match(/^[-*]\s+(.*)$/);
    const numbered = bullet ? null : trimmed.match(/^\d+[.)]\s+(.*)$/);
    const item = bullet || numbered;
    if (item) {
      flushPara();
      const wanted = bullet ? 'ul' : 'ol';
      if (listTag && listTag !== wanted) flushList();
      listTag = wanted;
      items.push(renderInline(item[1]));
      continue;
    }
    flushList();
    para.push(renderInline(trimmed));
  }
  flushList();
  flushPara();
  return blocks.join('');
}
