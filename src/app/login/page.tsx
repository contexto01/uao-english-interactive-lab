import { Suspense } from 'react';
import LoginContent from '@/features/auth/LoginContent';

function LoginFallback() {
  return (
    <div className="mx-auto flex min-h-[65vh] max-w-lg items-center px-4 py-16">
      <div className="h-80 w-full animate-pulse rounded-3xl bg-slate-100" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginContent />
    </Suspense>
  );
}
