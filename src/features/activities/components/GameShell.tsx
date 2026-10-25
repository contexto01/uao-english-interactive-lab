'use client';

import Link from 'next/link';
import { ReactNode } from 'react';
import { formatTime } from '../utils/gameUtils';
import SoundToggle from './SoundToggle';

type GameShellProps = {
  title?: string;
  subtitle?: string;
  current: number;
  total: number;
  score: number;
  elapsedSeconds: number;
  progressLabel?: string;
  progressValue?: number;
  hideProgress?: boolean;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  contentClassName?: string;
};

export default function GameShell({
  title,
  subtitle,
  current,
  total,
  score,
  elapsedSeconds,
  progressLabel = 'PROGRESS',
  progressValue,
  hideProgress = false,
  children,
  footer,
  className = '',
  contentClassName = '',
}: GameShellProps) {
  const progress = progressValue ?? (total > 0 ? Math.min(current, total) : 0);
  const percentage = total > 0 ? (progress / total) * 100 : 0;

  return (
    <section
      className={`relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/70 ${className}`}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-5 py-4 sm:px-8">
        <Link
          href="/"
          className="rounded-xl bg-white px-3.5 py-2 text-sm font-bold text-slate-700 shadow-xs ring-1 ring-slate-200 transition hover:text-brand-700"
        >
          ← Challenges
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <SoundToggle />

          <span className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-xs ring-1 ring-slate-200">
            <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {formatTime(elapsedSeconds)}
          </span>

          {!hideProgress && (
            <span className="rounded-xl bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-xs ring-1 ring-slate-200">
              <span className="text-xs font-bold uppercase text-slate-400">{progressLabel}</span>{' '}
              {progress} / {total}
            </span>
          )}

          <span className="rounded-xl bg-brand-700 px-4 py-2 text-sm font-black text-white">
            Score {score}
          </span>
        </div>
      </div>

      {/* Title area */}
      {(title || subtitle) && (
        <div className="border-b border-slate-100 bg-white px-5 py-5 sm:px-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              {subtitle && (
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-brand-700">
                  {subtitle}
                </p>
              )}
              {title && (
                <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                  {title}
                </h2>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Progress bar */}
      {!hideProgress && (
        <div className="bg-sky-50/60 px-5 py-4 sm:px-8">
          <div className="h-2 overflow-hidden rounded-full bg-sky-100">
            <div
              className="h-full rounded-full bg-emerald-400 transition-all duration-500"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Content */}
      <div className={contentClassName}>{children}</div>

      {/* Footer */}
      {footer && (
        <div className="flex flex-col gap-3 border-t border-slate-100 bg-white px-5 py-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          {footer}
        </div>
      )}
    </section>
  );
}
