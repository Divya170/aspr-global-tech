/** Thin top progress bar while a page's data loads. */
export default function Loading() {
  return (
    <div role="status" aria-label="Loading" className="fixed inset-x-0 top-0 z-[60] h-0.5 overflow-hidden">
      <div className="h-full w-1/3 animate-[loading_1.1s_ease-in-out_infinite] bg-gradient-to-r from-brand to-accent" />
    </div>
  );
}
