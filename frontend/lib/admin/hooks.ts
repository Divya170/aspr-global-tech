'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, type DependencyList } from 'react';
import { adminApi } from './api';
import type { CollectionSchema } from './types';

export interface Resource<T> {
  data: T | undefined;
  error: unknown;
  loading: boolean;
  reload: () => void;
  setData: (fn: (prev: T | undefined) => T | undefined) => void;
}

/** Loads data with `fn` whenever `deps` change. Stale responses are ignored. */
export function useResource<T>(fn: () => Promise<T>, deps: DependencyList): Resource<T> {
  const [data, setDataState] = useState<T | undefined>(undefined);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const seq = useRef(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    const id = ++seq.current;
    setLoading(true);
    setError(null);
    fnRef.current().then(
      (d) => { if (id === seq.current) { setDataState(d); setLoading(false); } },
      (e) => { if (id === seq.current) { setError(e); setLoading(false); } },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  const setData = useCallback((f: (prev: T | undefined) => T | undefined) => setDataState(f), []);
  return { data, error, loading, reload, setData };
}

export function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/**
 * Filters kept in the URL query string, so views can be shared, bookmarked and survive reloads.
 * `set({ status: 'won' })` resets `page` unless it is part of the patch.
 */
export function useUrlState<K extends string>(keys: readonly K[]) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const values = useMemo(() => {
    const out = {} as Record<K, string>;
    for (const k of keys) out[k] = params.get(k) ?? '';
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);
  const set = useCallback((patch: Partial<Record<K, string>>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch) as [string, string | undefined][]) {
      if (v === undefined || v === '') next.delete(k); else next.set(k, v);
    }
    if (!('page' in patch)) next.delete('page');
    const s = next.toString();
    router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
  }, [params, pathname, router]);
  return [values, set] as const;
}

let schemaPromise: Promise<CollectionSchema[]> | null = null;
/** The CMS collection registry, fetched once per page load. */
export function loadSchema(): Promise<CollectionSchema[]> {
  if (!schemaPromise) {
    schemaPromise = adminApi.get<CollectionSchema[]>('/content/schema');
    schemaPromise.catch(() => { schemaPromise = null; });
  }
  return schemaPromise;
}

/** Warns before closing/reloading the tab and before following in-app links while `dirty`. */
export function useUnsavedChanges(dirty: boolean, message = 'You have unsaved changes. Leave without saving?') {
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a || a.target === '_blank' || a.hasAttribute('download') || a.dataset.skipUnsaved !== undefined) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || (url.pathname === location.pathname && url.search === location.search)) return;
      if (!window.confirm(message)) { e.preventDefault(); e.stopPropagation(); }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onClick, true);
    };
  }, [dirty, message]);
}

/** Calls `fn` every `ms` while the tab is visible, and right away when it becomes visible again. */
export function useVisiblePolling(fn: () => void, ms: number) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => { if (!timer) timer = setInterval(() => ref.current(), ms); };
    const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
    const onVis = () => { if (document.visibilityState === 'visible') { ref.current(); start(); } else stop(); };
    if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', onVis);
    return () => { stop(); document.removeEventListener('visibilitychange', onVis); };
  }, [ms]);
}

/**
 * Search box bound to a URL parameter: typing updates the URL after a pause, and URL changes
 * (back/forward, "clear filters") flow back into the box unless the user is mid-typing.
 */
export function useUrlSearch(urlValue: string, commit: (v: string) => void, ms = 350) {
  const [value, setValue] = useState(urlValue);
  const typing = useRef(false);
  const latest = useRef({ urlValue, commit });
  latest.current = { urlValue, commit };
  useEffect(() => { if (!typing.current) setValue(urlValue); }, [urlValue]);
  useEffect(() => {
    if (!typing.current) return;
    const t = setTimeout(() => {
      typing.current = false;
      if (value !== latest.current.urlValue) latest.current.commit(value);
    }, ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  const onType = useCallback((v: string) => { typing.current = true; setValue(v); }, []);
  return [value, onType] as const;
}
