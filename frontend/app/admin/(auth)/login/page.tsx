import { Suspense } from 'react';
import { LoginForm } from '@/components/admin/auth/AuthForms';

export const metadata = { title: 'Sign in' };

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}
