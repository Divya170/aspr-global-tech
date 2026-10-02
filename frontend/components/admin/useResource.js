'use client';
import { useCallback, useEffect, useState } from 'react';

/** Loads `loader()` and re-runs it whenever `deps` change. Exposes loading / error / data / reload. */
export function useResource(loader, deps) {
  const [state, setState] = useState({ loading: true, error: null, data: null });
  const run = useCallback(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    loader().then((data) => alive && setState({ loading: false, error: null, data }))
      .catch((error) => alive && setState((s) => ({ loading: false, error, data: s.data })));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => run(), [run]);
  return { ...state, reload: run };
}
