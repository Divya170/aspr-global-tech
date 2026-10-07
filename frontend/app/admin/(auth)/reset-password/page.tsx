import { Suspense } from 'react';
import { ResetForm } from '@/components/admin/auth/AuthForms';

export const metadata = { title: 'Reset password' };

export default function ResetPasswordPage() {
  return <Suspense><ResetForm /></Suspense>;
}
