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
        className="rounded-lg bg-brand-700 px-3 py-2 text-sm font-bold text-white transition hover:bg-brand-800"
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
    <div className="flex items-center gap-2">
      <Link href="/progreso" className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">
        My progress
      </Link>
      {role === 'admin' && (
        <Link href="/admin" className="rounded-lg px-3 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50">
          Admin
        </Link>
      )}
      <button
        type="button"
        onClick={signOut}
        className="rounded-lg px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100"
      >
        Sign out
      </button>
    </div>
  );
}
