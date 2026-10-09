import Link from 'next/link';
import { notFound } from 'next/navigation';
import { challenges, getChallengeById } from '@/features/challenges/data/challenges';

export function generateStaticParams() {
  return challenges.map((challenge) => ({ challengeId: challenge.id }));
}

export default async function ChallengeResultPage({
  params,
}: {
  params: Promise<{ challengeId: string }>;
}) {
  const { challengeId } = await params;
  const challenge = getChallengeById(challengeId);

  if (!challenge) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:py-24">
      <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-brand-700">Resultados</p>
      <h1 className="mt-4 text-3xl font-extrabold text-slate-900">{challenge.title}</h1>
      <p className="mt-4 leading-7 text-slate-600">
        Tu puntaje y el tiempo empleado aparecerán aquí después de completar este desafío.
      </p>
      <Link
        href={`/desafios/${challenge.id}`}
        className="mt-8 inline-flex rounded-xl bg-brand-700 px-6 py-3 text-sm font-bold text-white transition hover:bg-brand-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
      >
        Volver al desafío
      </Link>
    </div>
  );
}
