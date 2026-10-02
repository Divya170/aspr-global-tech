// Renders a bound value the way the design runtime does: strings/numbers become a
// text span; null, undefined and booleans render nothing.
export function t(value) {
  if (value === null || value === undefined || typeof value === 'boolean') return null;
  return <span>{String(value)}</span>;
}
