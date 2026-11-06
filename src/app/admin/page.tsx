import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

// This page checks the Supabase session for every request and must not be prerendered.
export const instant = false;

export default async function AdminPage() {
  const supabase = await createClient();
  if (!supabase) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-3xl font-extrabold text-slate-900">Admin dashboard</h1>
        <p className="mt-4 text-slate-600">Configure Supabase in `.env.local` and apply the migration to enable this page.</p>
      </div>
    );
  }

  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = typeof claimsData?.claims?.sub === 'string' ? claimsData.claims.sub : null;
  if (!userId) redirect('/login?next=%2Fadmin');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();
  if (profile?.role !== 'admin') redirect('/');

  const [{ data: profiles, error: profilesError }, { data: progress, error: progressError }] = await Promise.all([
    supabase.from('profiles').select('id,email,display_name,role,created_at').order('created_at', { ascending: true }),
    supabase.from('user_progress').select('user_id,challenge_id,best_score,completed_at'),
  ]);

  const progressByUser = new Map<string, { completed: number; score: number }>();
  for (const record of progress ?? []) {
    const aggregate = progressByUser.get(record.user_id) ?? { completed: 0, score: 0 };
    aggregate.completed += 1;
    aggregate.score += record.best_score;
    progressByUser.set(record.user_id, aggregate);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-brand-700">UAO English</p>
          <h1 className="mt-2 text-3xl font-extrabold text-slate-900">Admin dashboard</h1>
          <p className="mt-2 text-slate-600">Review students, completed levels, and accumulated scores.</p>
        </div>
        <Link href="/" className="text-sm font-bold text-brand-700 hover:underline">← Back to the lab</Link>
      </div>

      {(profilesError || progressError) && (
        <p role="alert" className="mt-6 rounded-xl bg-rose-50 p-4 text-sm font-semibold text-rose-700">
          We could not load the data. Confirm that the Supabase SQL migration has been run.
        </p>
      )}

      <div className="mt-8 overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[680px] border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-4 font-extrabold">Student</th>
              <th className="px-5 py-4 font-extrabold">Role</th>
              <th className="px-5 py-4 font-extrabold">Levels completed</th>
              <th className="px-5 py-4 font-extrabold">Best-score total</th>
              <th className="px-5 py-4 font-extrabold">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(profiles ?? []).map((student) => {
              const result = progressByUser.get(student.id) ?? { completed: 0, score: 0 };
              return (
                <tr key={student.id}>
                  <td className="px-5 py-4">
                    <p className="font-extrabold text-slate-900">{student.display_name || 'UAO student'}</p>
                    <p className="mt-1 text-slate-500">{student.email}</p>
                  </td>
                  <td className="px-5 py-4 capitalize text-slate-600">{student.role}</td>
                  <td className="px-5 py-4 font-bold text-slate-700">{result.completed} / 6</td>
                  <td className="px-5 py-4 font-bold text-slate-700">{result.score} pts</td>
                  <td className="px-5 py-4 text-slate-500">{new Date(student.created_at).toLocaleDateString('en-US')}</td>
                </tr>
              );
            })}
            {(profiles ?? []).length === 0 && !profilesError && (
              <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-500">No accounts have been registered yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
