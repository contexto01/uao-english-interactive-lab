'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import GoogleSignInButton from '@/features/auth/GoogleSignInButton';

const loginErrors: Record<string, string> = {
  domain: 'Please use your institutional @uao.edu.co account.',
  oauth: 'We could not complete sign-in. Please try again.',
};

export default function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error') ? loginErrors[searchParams.get('error')!] : undefined;
  const requestedNext = searchParams.get('next') ?? '/';
  const next = requestedNext.startsWith('/') && !requestedNext.startsWith('//') ? requestedNext : '/';

  return (
    <div className="mx-auto flex min-h-[65vh] max-w-lg items-center px-4 py-16">
      <section className="w-full rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
        <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-brand-700">UAO English Interactive Lab</p>
        <h1 className="mt-3 text-3xl font-extrabold text-slate-900">Save your progress</h1>
        <p className="mt-3 leading-7 text-slate-600">
          Sign in with your institutional account. If you played as a guest in this browser,
          we will import your completed levels and best scores.
        </p>
        {error && <p role="alert" className="mt-5 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p>}
        <div className="mt-7">
          <GoogleSignInButton next={next} />
        </div>
        <p className="mt-5 text-center text-xs leading-5 text-slate-500">
          Only accounts ending in <strong>@uao.edu.co</strong> are allowed.
        </p>
        <Link href="/" className="mt-6 block text-center text-sm font-bold text-brand-700 hover:underline">
          Back to challenges
        </Link>
      </section>
    </div>
  );
}
