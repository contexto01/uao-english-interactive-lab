'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useProgress } from '@/features/progress/ProgressProvider';

export default function ChallengeAccessGate({
  challengeId,
  children,
}: {
  challengeId: string;
  children: ReactNode;
}) {
  const { isLoading, isUnlocked } = useProgress();

  if (isLoading) {
    return <div className="mt-8 h-80 animate-pulse rounded-3xl bg-slate-100" aria-label="Loading challenge access" />;
  }

  if (!isUnlocked(challengeId)) {
    return (
      <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-12">
        <span className="text-4xl" aria-hidden="true">🔒</span>
        <h2 className="mt-4 text-2xl font-extrabold text-slate-900">This level is locked</h2>
        <p className="mx-auto mt-3 max-w-lg leading-7 text-slate-600">
          Complete the previous challenge to unlock this activity. Your progress is saved in this browser;
          sign in with Google to keep it on your account.
        </p>
        <Link
          href="/#challenges"
          className="mt-6 inline-flex rounded-xl bg-brand-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-brand-800"
        >
          Back to challenges
        </Link>
      </div>
    );
  }

  return children;
}
