'use client';

import Link from 'next/link';
import { ReactNode } from 'react';
import { formatTime } from '../utils/gameUtils';

type GameSummaryProps = {
  title: string;
  description?: string;
  score: number;
  time: number;
  accuracy?: number;
  bestScore?: number;
  mistakes?: number;
  maxCombo?: number;
  children?: ReactNode;
  onRestart: () => void;
  restartLabel?: string;
};

export default function GameSummary({
  title,
  description,
  score,
  time,
  accuracy,
  bestScore,
  mistakes,
  maxCombo,
  children,
  onRestart,
  restartLabel = 'Try challenge again',
}: GameSummaryProps) {
  const stats = [
    { label: 'Final score', value: `${score} pts`, tone: 'emerald' },
    ...(accuracy !== undefined
      ? [{ label: 'Accuracy', value: `${accuracy}%`, tone: 'brand' as const }]
      : []),
    ...(mistakes !== undefined
      ? [{ label: 'Mistakes', value: String(mistakes), tone: 'rose' as const }]
      : []),
    ...(maxCombo !== undefined
      ? [{ label: 'Max combo', value: `x${maxCombo}`, tone: 'amber' as const }]
      : []),
    { label: 'Total time', value: formatTime(time), tone: 'slate' },
    ...(bestScore !== undefined
      ? [{ label: 'Best score', value: `${bestScore} pts`, tone: 'blue' as const }]
      : []),
  ];

  const toneClasses: Record<string, { bg: string; text: string; ring: string }> = {
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-100' },
    brand: { bg: 'bg-brand-50', text: 'text-brand-700', ring: 'ring-brand-100' },
    rose: { bg: 'bg-rose-50', text: 'text-rose-700', ring: 'ring-rose-100' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-700', ring: 'ring-amber-100' },
    slate: { bg: 'bg-slate-50', text: 'text-slate-700', ring: 'ring-slate-100' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-700', ring: 'ring-blue-100' },
  };

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/60 p-5 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 text-center shadow-2xl sm:p-10">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-100 text-4xl shadow-inner ring-4 ring-amber-200">
          🏆
        </div>

        <p className="mt-5 text-sm font-extrabold uppercase tracking-[0.18em] text-brand-700">
          Challenge completed
        </p>
        <h3 className="mt-3 text-3xl font-extrabold text-slate-900">{title}</h3>
        {description && <p className="mt-3 leading-7 text-slate-600">{description}</p>}

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 text-left">
          {stats.map((stat) => {
            const tone = toneClasses[stat.tone];
            return (
              <div
                key={stat.label}
                className={`rounded-2xl ${tone.bg} p-4 ring-1 ${tone.ring}`}
              >
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  {stat.label}
                </p>
                <p className={`mt-1 text-2xl font-extrabold ${tone.text}`}>{stat.value}</p>
              </div>
            );
          })}
        </div>

        {children && <div className="mt-8 text-left">{children}</div>}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onRestart}
            className="flex-1 cursor-pointer rounded-xl bg-brand-700 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-brand-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          >
            {restartLabel}
          </button>
          <Link
            href="/"
            className="flex-1 cursor-pointer rounded-xl bg-slate-100 px-5 py-3 text-sm font-extrabold text-slate-700 transition hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
          >
            End session
          </Link>
        </div>
      </div>
    </div>
  );
}
