'use client';

import Link from 'next/link';
import { useState } from 'react';
import { challenges } from '@/features/challenges/data/challenges';
import { useProgress } from '@/features/progress/ProgressProvider';

function getGoogleAvatarUrl(user: ReturnType<typeof useProgress>['user']) {
  const candidate = user?.user_metadata.avatar_url ?? user?.user_metadata.picture;
  if (typeof candidate !== 'string') return null;

  try {
    const url = new URL(candidate);
    const isGoogleImage = url.hostname === 'googleusercontent.com' || url.hostname.endsWith('.googleusercontent.com');
    return url.protocol === 'https:' && isGoogleImage ? url.toString() : null;
  } catch {
    return null;
  }
}

function AccountAvatar({ email, photoUrl }: { email: string; photoUrl: string | null }) {
  const [imageFailed, setImageFailed] = useState(false);
  const initials = email.trim().charAt(0).toUpperCase() || 'U';

  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-100 text-xl font-black text-brand-800 ring-2 ring-white">
      {photoUrl && !imageFailed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl}
          alt={`${email}'s Google profile`}
          width={56}
          height={56}
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span aria-hidden="true">{initials}</span>
      )}
    </div>
  );
}

export default function ProgressPage() {
  const { user, isLoading, isUnlocked, records, syncError } = useProgress();
  const totalScore = Object.values(records).reduce((total, record) => total + record.bestScore, 0);
  const avatarUrl = getGoogleAvatarUrl(user);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-brand-700">Student dashboard</p>
      <h1 className="mt-3 text-3xl font-extrabold text-slate-900">My progress</h1>

      {isLoading ? (
        <div className="mt-8 h-48 animate-pulse rounded-3xl bg-slate-100" />
      ) : (
        <>
          <section className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl bg-brand-700 p-6 text-white">
              <p className="text-sm font-bold uppercase tracking-wide text-brand-100">Best-score total</p>
              <p className="mt-2 text-4xl font-black">{totalScore} pts</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-6">
              <div className="flex items-center gap-4">
                {user && <AccountAvatar email={user.email ?? 'UAO student'} photoUrl={avatarUrl} />}
                <div className="min-w-0">
                  <p className="text-sm font-bold uppercase tracking-wide text-slate-500">Account</p>
                  <p className="mt-2 break-all text-lg font-extrabold text-slate-900">
                    {user?.email ?? 'Guest progress on this browser'}
                  </p>
                  {!user && (
                    <Link href="/login?next=%2Fprogreso" className="mt-3 inline-flex text-sm font-bold text-brand-700 hover:underline">
                      Sign in to sync your progress →
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </section>

          {syncError && <p role="status" className="mt-5 rounded-xl bg-amber-50 p-4 text-sm font-semibold text-amber-800">{syncError}</p>}

          <section className="mt-10 overflow-hidden rounded-3xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-6 py-5">
              <h2 className="text-xl font-extrabold text-slate-900">Level-by-level results</h2>
            </div>
            <ul className="divide-y divide-slate-100">
              {challenges.map((challenge, index) => {
                const record = records[challenge.id];
                const unlocked = isUnlocked(challenge.id);
                return (
                  <li key={challenge.id} className="flex flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-extrabold uppercase tracking-wide text-brand-700">Level {index + 1}</p>
                      <h3 className="mt-1 font-extrabold text-slate-900">{challenge.title}</h3>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`text-sm font-bold ${record ? 'text-emerald-700' : 'text-slate-500'}`}>
                        {record ? `Completed · ${record.bestScore} pts` : unlocked ? 'Available' : 'Locked'}
                      </span>
                      {unlocked && (
                        <Link href={`/desafios/${challenge.id}`} className="text-sm font-extrabold text-brand-700 hover:underline">
                          {record ? 'Play again' : 'Open'}
                        </Link>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
