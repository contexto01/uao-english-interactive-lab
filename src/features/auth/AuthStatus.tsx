'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useProgress } from '@/features/progress/ProgressProvider';

export default function AuthStatus() {
  const router = useRouter();
  const { user, role, isLoading, signOut: signOutUser } = useProgress();

  if (isLoading) {
    return <span className="hidden h-9 w-24 animate-pulse rounded-xl bg-slate-100 sm:block" aria-label="Loading account" />;
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="w-full rounded-lg bg-brand-700 px-3 py-2 text-left text-sm font-bold text-white transition hover:bg-brand-800 sm:w-auto sm:text-center"
      >
        Sign in
      </Link>
    );
  }

  async function signOut() {
    await signOutUser();
    router.push('/');
  }

  return (
    <div className="contents sm:flex sm:items-center sm:gap-2">
      <Link href="/progreso" className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-600 hover:bg-slate-100 sm:w-auto sm:text-center">
        My progress
      </Link>
      {role === 'admin' && (
        <Link href="/admin" className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-brand-700 hover:bg-brand-50 sm:w-auto sm:text-center">
          Admin
        </Link>
      )}
      <button
        type="button"
        onClick={signOut}
        className="w-full rounded-lg px-3 py-2 text-left text-sm font-bold text-slate-600 hover:bg-slate-100 sm:w-auto sm:text-center"
      >
        Sign out
      </button>
    </div>
  );
}
