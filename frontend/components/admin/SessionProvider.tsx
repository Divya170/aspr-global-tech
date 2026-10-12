'use client';

import { usePathname, useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { adminApi, ApiError, errorMessage, setCsrfToken, setUnauthorizedHandler } from '@/lib/admin/api';
import type { AdminUser, MeResponse, Permission } from '@/lib/admin/types';
import { AButton } from './ui/Button';

interface Session {
  user: AdminUser;
  can: (p: Permission) => boolean;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<Session | null>(null);

export function useSession(): Session {
  const s = useContext(Ctx);
  if (!s) throw new Error('useSession must be used inside <SessionProvider>');
  return s;
}

export function loginUrl(next?: string) {
  return next && next !== '/admin' ? `/admin/login?next=${encodeURIComponent(next)}` : '/admin/login';
}

/** Loads the signed-in staff member; anyone without a session is sent to the sign-in page. */
export function SessionProvider({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const redirecting = useRef(false);

  const toLogin = useCallback(() => {
    if (redirecting.current) return;
    redirecting.current = true;
    setCsrfToken(null);
    router.replace(loginUrl(window.location.pathname + window.location.search));
  }, [router]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const me = await adminApi.get<MeResponse>('/auth/me');
      setCsrfToken(me.csrfToken);
      setUser(me.user);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) toLogin();
      else setError(errorMessage(e));
    }
  }, [toLogin]);

  useEffect(() => {
    setUnauthorizedHandler(toLogin);
    load();
    return () => setUnauthorizedHandler(null);
  }, [load, toLogin]);

  // A new page view resets the redirect latch (e.g. after signing back in).
  useEffect(() => { redirecting.current = false; }, [pathname]);

  const logout = useCallback(async () => {
    try { await adminApi.post('/auth/logout'); } catch { /* the session may already be gone */ }
    setCsrfToken(null);
    redirecting.current = true;
    router.replace('/admin/login');
  }, [router]);

  const value = useMemo<Session | null>(() => user && {
    user,
    can: (p) => user.permissions.includes(p),
    logout,
    refresh: load,
  }, [user, logout, load]);

  if (error && !user) {
    return (
      <div role="alert" className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="font-medium text-text">We couldn&apos;t load the dashboard.</p>
        <p className="max-w-sm text-sm text-muted">{error}</p>
        <AButton onClick={load} size="sm">Try again</AButton>
      </div>
    );
  }
  if (!value) return <>{fallback}</>;
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Renders children only when the user holds `perm`; otherwise the "no access" state. */
export function RequirePermission({ perm, children }: { perm: Permission; children: ReactNode }) {
  const { can } = useSession();
  if (!can(perm)) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
        <p className="font-medium text-text">You don&apos;t have access</p>
        <p className="mt-1 max-w-sm text-sm text-muted">Your role doesn&apos;t include this area. Ask an admin if you need it.</p>
      </div>
    );
  }
  return <>{children}</>;
}
