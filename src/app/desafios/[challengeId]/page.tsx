import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { challenges, getChallengeById } from '@/features/challenges/data/challenges';
import EmbeddedActivity from '@/features/activities/EmbeddedActivity';
import InternalActivity from '@/features/activities/InternalActivity';

// Generate routes for the six challenges at build time (also supports static export).
export function generateStaticParams() {
  return challenges.map((c) => ({ challengeId: c.id }));
}

async function ChallengeContent({
  params,
}: {
  params: Promise<{ challengeId: string }>;
}) {
  const { challengeId } = await params;
  const challenge = getChallengeById(challengeId);
  if (!challenge) notFound();

  return (
    <>
      <h1 className="mt-4 text-3xl font-extrabold">{challenge.title}</h1>
      <p className="mt-2 text-slate-600">{challenge.description}</p>

      <div className="mt-8">
        {challenge.activity.kind === 'embedded' && challenge.activity.status === 'available' ? (
          <EmbeddedActivity src={challenge.activity.src} title={challenge.activity.title} />
        ) : challenge.activity.kind === 'internal' && challenge.activity.status === 'available' ? (
          <InternalActivity gameId={challenge.activity.gameId} />
        ) : (
          <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
             This activity will be available soon.
          </div>
        )}
      </div>
    </>
  );
}

function ChallengeSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="mt-4 h-9 w-64 rounded-xl bg-slate-200" />
      <div className="mt-2 h-5 w-96 rounded-lg bg-slate-100" />
      <div className="mt-8 h-96 rounded-3xl bg-slate-100" />
    </div>
  );
}

export default function ChallengePage({
  params,
}: {
  params: Promise<{ challengeId: string }>;
}) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <Suspense fallback={<ChallengeSkeleton />}>
        <ChallengeContent params={params} />
      </Suspense>
    </div>
  );
}
