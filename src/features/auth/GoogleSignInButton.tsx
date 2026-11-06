'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function GoogleSignInButton({ next = '/' }: { next?: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function signIn() {
    setError(null);
    const supabase = createClient();
    if (!supabase) {
      setError('Add the Supabase URL and publishable key to .env.local.');
      return;
    }

    setIsLoading(true);
    const callbackUrl = new URL('/auth/callback', window.location.origin);
    callbackUrl.searchParams.set('next', next.startsWith('/') && !next.startsWith('//') ? next : '/');

    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: callbackUrl.toString() },
    });

    if (authError) {
      setError('Could not sign in with Google. Check the Supabase OAuth settings.');
      setIsLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={signIn}
        disabled={isLoading}
        className="inline-flex w-full items-center justify-center gap-3 rounded-xl bg-white px-5 py-3.5 text-sm font-extrabold text-slate-800 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
      >
        <svg aria-hidden="true" viewBox="0 0 48 48" className="h-5 w-5">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" transform="translate(0 4)" />
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.73 7.18l7.63 5.92c4.45-4.11 7.14-10.16 7.14-17.57Z" transform="translate(0 0)" />
          <path fill="#FBBC05" d="M10.54 28.59a14.4 14.4 0 0 1 0-9.18l-7.98-6.19a23.98 23.98 0 0 0 0 21.56l7.98-6.19Z" transform="translate(0 0)" />
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.88l-7.63-5.92c-2.12 1.42-4.83 2.27-8.27 2.27-6.26 0-11.57-4.22-13.48-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" transform="translate(0 0)" />
        </svg>
        {isLoading ? 'Connecting to Google…' : 'Continue with Google'}
      </button>
      {error && <p role="alert" className="mt-3 text-sm font-semibold text-rose-700">{error}</p>}
    </div>
  );
}
