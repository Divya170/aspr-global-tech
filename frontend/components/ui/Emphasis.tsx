/** Renders "*phrase*" in admin-edited headlines as gradient text. */
export function Emphasis({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*[^*]+\*)/g).map((part, i) =>
        part.startsWith('*') && part.endsWith('*') ? <span key={i} className="text-gradient">{part.slice(1, -1)}</span> : part,
      )}
    </>
  );
}
