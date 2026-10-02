'use client';

// Opens the site assistant, optionally asking a question straight away.
export default function AskAiButton({ question = '', className = '', children }) {
  return (
    <button type="button" className={className} onClick={() => window.dispatchEvent(new CustomEvent('aspr:chat', { detail: { question } }))}>
      {children}
    </button>
  );
}
