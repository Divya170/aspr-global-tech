'use client';

import { AlertTriangle, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { adminApi, ApiError, errorMessage, setCsrfToken } from '@/lib/admin/api';
import type { LoginResponse } from '@/lib/admin/types';
import { AButton } from '../ui/Button';
import { TextField } from '../ui/Field';

/** Centered dark card used by the sign-in, forgot and reset screens. */
export function AuthCard({ title, lead, children, footer }: { title: string; lead?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-bg px-4 py-12">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-grid opacity-60" />
      <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-[-20%] h-[520px] w-[720px] -translate-x-1/2 rounded-full bg-brand/20 blur-[120px]" />
      <div className="relative w-full max-w-[400px]">
        <div className="mb-7 flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/aspr-logo.png" alt="ASPR Global Tech" width={140} height={65} className="h-10 w-auto" />
        </div>
        <div className="rounded-2xl border border-line-strong bg-surface/90 p-6 shadow-2xl shadow-navy/16 backdrop-blur sm:p-7">
          <h1 className="text-lg font-semibold text-text">{title}</h1>
          {lead && <p className="mt-1 text-sm text-muted">{lead}</p>}
          <div className="mt-5">{children}</div>
        </div>
        {footer && <div className="mt-5 text-center text-sm text-muted">{footer}</div>}
      </div>
    </main>
  );
}

function FormAlert({ tone = 'error', children }: { tone?: 'error' | 'success'; children: ReactNode }) {
  const I = tone === 'error' ? AlertTriangle : CheckCircle2;
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`mb-4 flex gap-2.5 rounded-lg border px-3 py-2.5 text-sm ${tone === 'error' ? 'border-danger/35 bg-danger/10 text-text' : 'border-success/30 bg-success/10 text-text'}`}>
      <I size={17} aria-hidden="true" className={`mt-px shrink-0 ${tone === 'error' ? 'text-danger' : 'text-success'}`} />
      <div>{children}</div>
    </div>
  );
}

function PasswordInput({ label, value, onChange, error, autoComplete, hint, id }: { label: string; value: string; onChange: (v: string) => void; error?: string; autoComplete: string; hint?: string; id: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <TextField id={id} label={label} type={show ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} error={error} hint={hint}
        autoComplete={autoComplete} required className="[&_input]:pr-10" />
      <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show} aria-controls={id}
        className="absolute right-1.5 top-[1.85rem] inline-flex h-7 w-7 items-center justify-center rounded-md text-subtle hover:text-text">
        {show ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
      </button>
    </div>
  );
}

/** Only same-app admin paths are accepted as a post-login destination. */
export function safeNext(next: string | null): string {
  if (!next || !next.startsWith('/admin') || next.startsWith('//') || next.startsWith('/admin/login')) return '/admin';
  return next;
}

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get('next'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const errorRef = useRef<HTMLDivElement>(null);

  // Already signed in? Go straight to the dashboard.
  useEffect(() => {
    let live = true;
    adminApi.get('/auth/me').then(() => { if (live) router.replace(next); }, () => undefined);
    return () => { live = false; };
  }, [router, next]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFields({});
    try {
      const res = await adminApi.post<LoginResponse>('/auth/login', { email: email.trim(), password });
      setCsrfToken(res.csrfToken);
      router.replace(next);
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) setFields(err.fieldErrors);
      else setError(err instanceof ApiError && err.status === 429 ? err.message : errorMessage(err));
      setBusy(false);
      setTimeout(() => errorRef.current?.focus(), 0);
    }
  };

  return (
    <AuthCard title="Sign in to the admin" lead="Staff access for ASPR Global Tech." footer={<Link href="/" className="hover:text-text">← Back to the website</Link>}>
      <div ref={errorRef} tabIndex={-1} className="outline-none">{error && <FormAlert>{error}</FormAlert>}</div>
      <form onSubmit={submit} noValidate className="space-y-4">
        <TextField id="login-email" label="Email" type="email" autoComplete="username" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} error={fields.email} required autoFocus />
        <PasswordInput id="login-password" label="Password" value={password} onChange={setPassword} error={fields.password} autoComplete="current-password" />
        <div className="flex justify-end">
          <Link href="/admin/forgot-password" className="text-sm text-brand hover:text-text">Forgot password?</Link>
        </div>
        <AButton type="submit" variant="primary" className="w-full" loading={busy}>Sign in</AButton>
      </form>
    </AuthCard>
  );
}

export function ForgotForm() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [done, setDone] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFieldError(undefined);
    try {
      const res = await adminApi.post<{ message: string }>('/auth/forgot', { email: email.trim() });
      setDone(res.message);
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors?.email) setFieldError(err.fieldErrors.email);
      else setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard title="Reset your password" lead="Enter your staff email and we'll send a reset link." footer={<Link href="/admin/login" className="hover:text-text">← Back to sign in</Link>}>
      {done ? (
        <FormAlert tone="success">{done}</FormAlert>
      ) : (
        <>
          {error && <FormAlert>{error}</FormAlert>}
          <form onSubmit={submit} noValidate className="space-y-4">
            <TextField label="Email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} error={fieldError} required autoFocus />
            <AButton type="submit" variant="primary" className="w-full" loading={busy}>Send reset link</AButton>
          </form>
        </>
      )}
    </AuthCard>
  );
}

export function ResetForm() {
  const params = useSearchParams();
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 12) { setFields({ newPassword: 'Use at least 12 characters.' }); return; }
    if (password !== confirm) { setFields({ confirm: "The two passwords don't match." }); return; }
    setFields({});
    setBusy(true);
    try {
      await adminApi.post('/auth/reset', { token, newPassword: password });
      setDone(true);
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) {
        if (err.fieldErrors.token) setError(err.fieldErrors.token);
        setFields(err.fieldErrors);
      } else setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <AuthCard title="Reset link missing" footer={<Link href="/admin/login" className="hover:text-text">← Back to sign in</Link>}>
        <FormAlert>This page needs the link from your reset email. <Link href="/admin/forgot-password" className="text-brand underline">Request a new link</Link>.</FormAlert>
      </AuthCard>
    );
  }
  return (
    <AuthCard title="Choose a new password" lead="At least 12 characters. Signing in again will be required on every device." footer={<Link href="/admin/login" className="hover:text-text">← Back to sign in</Link>}>
      {done ? (
        <>
          <FormAlert tone="success">Your password has been changed.</FormAlert>
          <Link href="/admin/login" className="inline-flex h-9 w-full items-center justify-center rounded-lg bg-brand text-sm font-medium text-white hover:bg-brand-strong">Sign in</Link>
        </>
      ) : (
        <>
          {error && <FormAlert>{error} {fields.token && <Link href="/admin/forgot-password" className="text-brand underline">Request a new link</Link>}</FormAlert>}
          <form onSubmit={submit} noValidate className="space-y-4">
            <PasswordInput id="reset-new" label="New password" value={password} onChange={setPassword} error={fields.newPassword} autoComplete="new-password" hint="12 characters or more. A short sentence works well." />
            <PasswordInput id="reset-confirm" label="Confirm new password" value={confirm} onChange={setConfirm} error={fields.confirm} autoComplete="new-password" />
            <AButton type="submit" variant="primary" className="w-full" loading={busy}>Save new password</AButton>
          </form>
        </>
      )}
    </AuthCard>
  );
}
