'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  causeReasonPurposePairs,
  createDeterministicInitialOrder,
  MatchingPair,
  shuffleArray,
} from './data/causeReasonPurpose';

const CORRECT_POINTS = 10;
const MISTAKE_PENALTY = 5;

/**
 * Web Audio API synthesizer for clean, instant sound effects
 */
class SoundEffects {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  private getContext(): AudioContext | null {
    if (!this.enabled) return null;
    try {
      if (!this.ctx) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  correct() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.15); // G5

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  wrong() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(130, now + 0.25);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.3);
  }

  victory() {
    const ctx = this.getContext();
    if (!ctx) return;
    const fanfare = [
      { f: 523.25, d: 0.12 },
      { f: 659.25, d: 0.12 },
      { f: 783.99, d: 0.12 },
      { f: 1046.5, d: 0.35 },
    ];
    let offset = 0;
    fanfare.forEach((note) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime + offset;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.f, now);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + note.d);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + note.d + 0.05);
      offset += note.d * 0.85;
    });
  }
}

const sfx = new SoundEffects();

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

// Distinct accent colors for matched pairs to visually connect them
const PAIR_ACCENTS: Record<
  number,
  { border: string; bg: string; text: string; badgeBg: string; badgeText: string }
> = {
  1: {
    border: 'border-emerald-500',
    bg: 'bg-emerald-50/70',
    text: 'text-emerald-950',
    badgeBg: 'bg-emerald-600',
    badgeText: 'text-white',
  },
  2: {
    border: 'border-blue-500',
    bg: 'bg-blue-50/70',
    text: 'text-blue-950',
    badgeBg: 'bg-blue-600',
    badgeText: 'text-white',
  },
  3: {
    border: 'border-purple-500',
    bg: 'bg-purple-50/70',
    text: 'text-purple-950',
    badgeBg: 'bg-purple-600',
    badgeText: 'text-white',
  },
  4: {
    border: 'border-amber-500',
    bg: 'bg-amber-50/70',
    text: 'text-amber-950',
    badgeBg: 'bg-amber-600',
    badgeText: 'text-white',
  },
  5: {
    border: 'border-cyan-500',
    bg: 'bg-cyan-50/70',
    text: 'text-cyan-950',
    badgeBg: 'bg-cyan-600',
    badgeText: 'text-white',
  },
  6: {
    border: 'border-rose-500',
    bg: 'bg-rose-50/70',
    text: 'text-rose-950',
    badgeBg: 'bg-rose-600',
    badgeText: 'text-white',
  },
  7: {
    border: 'border-teal-500',
    bg: 'bg-teal-50/70',
    text: 'text-teal-950',
    badgeBg: 'bg-teal-600',
    badgeText: 'text-white',
  },
  8: {
    border: 'border-indigo-500',
    bg: 'bg-indigo-50/70',
    text: 'text-indigo-950',
    badgeBg: 'bg-indigo-600',
    badgeText: 'text-white',
  },
};

export default function CauseReasonandPurposeGame() {
  // Left column items (numbered 1 to 8, in order)
  const leftColumnItems = causeReasonPurposePairs;

  // Right column items (deterministic initial order for SSR, shuffled in useEffect)
  const [rightColumnItems, setRightColumnItems] = useState<MatchingPair[]>(() =>
    createDeterministicInitialOrder(causeReasonPurposePairs),
  );

  // Selection states
  const [selectedLeftId, setSelectedLeftId] = useState<number | null>(null);
  const [selectedRightId, setSelectedRightId] = useState<number | null>(null);

  // Matched pairs list
  const [matchedPairIds, setMatchedPairIds] = useState<number[]>([]);

  // Wrong pair animation state (keeps track of briefly flashing wrong ids)
  const [wrongSelection, setWrongSelection] = useState<{
    leftId: number;
    rightId: number;
  } | null>(null);

  // Score & Stats
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Floating feedback message
  const [feedback, setFeedback] = useState<{
    kind: 'correct' | 'wrong' | null;
    text: string;
    points?: number;
  }>({ kind: null, text: '' });

  // Sound toggle
  const [isMuted, setIsMuted] = useState(false);
  const [isInputLocked, setIsInputLocked] = useState(false);

  // Shuffle right column on client mount
  useEffect(() => {
    setRightColumnItems(shuffleArray(causeReasonPurposePairs));
    setIsHydrated(true);
  }, []);

  // Timer
  useEffect(() => {
    if (!isHydrated || isCompleted) return;

    const timer = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isHydrated, isCompleted]);

  // High score tracking
  useEffect(() => {
    if (!isCompleted || !isHydrated) return;
    setBestScore((currentBest) => Math.max(currentBest, score));
  }, [isCompleted, isHydrated, score, bestScore]);

  // Audio toggle
  const toggleSound = () => {
    const nextState = !isMuted;
    setIsMuted(nextState);
    sfx.enabled = !nextState;
  };

  /**
   * Evaluates a connection attempt between leftId and rightId
   */
  const evaluateMatch = useCallback(
    (leftId: number, rightId: number) => {
      if (leftId === rightId) {
        // Correct match!
        sfx.correct();
        const nextMatches = [...matchedPairIds, leftId];
        setMatchedPairIds(nextMatches);
        setSelectedLeftId(null);
        setSelectedRightId(null);

        // Score update (+10)
        setScore((prev) => prev + CORRECT_POINTS);
        setCombo((prev) => {
          const next = prev + 1;
          setMaxCombo((m) => Math.max(m, next));
          return next;
        });

        setFeedback({
          kind: 'correct',
          text: `+${CORRECT_POINTS} Correct match!`,
          points: CORRECT_POINTS,
        });

        // Check if all 8 pairs are matched
        if (nextMatches.length === causeReasonPurposePairs.length) {
          sfx.victory();
          setTimeout(() => {
            setIsCompleted(true);
          }, 600);
        }
      } else {
        // Wrong match!
        sfx.wrong();
        setIsInputLocked(true);
        setWrongSelection({ leftId, rightId });

        // Score penalty (-5, min 0)
        setScore((prev) => Math.max(0, prev - MISTAKE_PENALTY));
        setMistakes((prev) => prev + 1);
        setCombo(0);

        setFeedback({
          kind: 'wrong',
          text: `-${MISTAKE_PENALTY} Incorrect match`,
          points: -MISTAKE_PENALTY,
        });

        // Clear wrong highlight after 650ms
        setTimeout(() => {
          setWrongSelection(null);
          setSelectedLeftId(null);
          setSelectedRightId(null);
          setIsInputLocked(false);
        }, 650);
      }
    },
    [matchedPairIds],
  );

  /**
   * Handle Left Card click
   */
  const handleLeftClick = (id: number) => {
    if (isInputLocked || matchedPairIds.includes(id)) return;

    if (selectedLeftId === id) {
      // Deselect if already selected
      setSelectedLeftId(null);
      return;
    }

    setSelectedLeftId(id);

    // If a right item is already selected, evaluate match
    if (selectedRightId !== null) {
      evaluateMatch(id, selectedRightId);
    }
  };

  /**
   * Handle Right Card click
   */
  const handleRightClick = (id: number) => {
    if (isInputLocked || matchedPairIds.includes(id)) return;

    if (selectedRightId === id) {
      // Deselect if already selected
      setSelectedRightId(null);
      return;
    }

    setSelectedRightId(id);

    // If a left item is already selected, evaluate match
    if (selectedLeftId !== null) {
      evaluateMatch(selectedLeftId, id);
    }
  };

  /**
   * Restart game
   */
  const handleRestart = () => {
    setMatchedPairIds([]);
    setSelectedLeftId(null);
    setSelectedRightId(null);
    setWrongSelection(null);
    setScore(0);
    setMistakes(0);
    setCombo(0);
    setElapsedSeconds(0);
    setIsCompleted(false);
    setFeedback({ kind: null, text: '' });
    setRightColumnItems(shuffleArray(causeReasonPurposePairs));
  };

  // Accuracy calculation
  const totalAttempts = matchedPairIds.length + mistakes;
  const accuracyPercent =
    totalAttempts === 0
      ? 100
      : Math.max(0, Math.round((matchedPairIds.length / totalAttempts) * 100));

  return (
    <div className="w-full">
      {/* Top Header & Navigation Bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <Link href="/" className="inline-flex items-center gap-2 rounded-xl bg-white px-3.5 py-2 text-sm font-bold text-slate-700 shadow-xs ring-1 ring-slate-200 transition-all hover:bg-slate-50 hover:text-brand-700">
          ← Challenges
        </Link>
        {/* Live Status Indicators */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          {/* Sound Toggle */}
          <button
            type="button"
            onClick={toggleSound}
            aria-label={isMuted ? 'Unmute sound' : 'Mute sound'}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-600 shadow-xs ring-1 ring-slate-200 transition-all hover:bg-slate-50 hover:text-slate-900"
          >
            {isMuted ? (
              <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            ) : (
              <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                />
              </svg>
            )}
          </button>

          {/* Timer Badge */}
          <div className="flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-xs ring-1 ring-slate-200">
            <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{formatTime(elapsedSeconds)}</span>
          </div>

          {/* Matches Progress Badge */}
          <div className="flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-xs ring-1 ring-slate-200">
            <span className="text-xs text-slate-400 font-bold uppercase">Matched</span>
            <span className="font-black text-brand-700">
              {matchedPairIds.length} / {causeReasonPurposePairs.length}
            </span>
          </div>

          {/* Current Score Badge */}
          <div className="flex items-center gap-2 rounded-xl bg-linear-to-r from-brand-600 to-brand-700 px-4 py-2 text-white shadow-sm ring-1 ring-brand-800">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-100">Score</span>
            <span className="text-base font-black">{score}</span>
          </div>

          {/* Combo Badge */}
          {combo >= 2 && (
            <div className="flex items-center gap-1 rounded-xl bg-amber-500 px-3 py-2 text-xs font-black text-white shadow-sm animate-bounce">
              <span>🔥</span>
              <span>x{combo}</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Game Screen */}
      {!isCompleted ? (
        <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/90">
          {/* Progress Header */}
          <div className="border-b border-slate-100 bg-slate-50/80 px-6 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
              <div className="flex items-center gap-2 font-bold text-slate-700">
                <span className="inline-block rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-black text-brand-700">
                  Connector Match
                </span>
                <span>Cause, Reason and Purpose</span>
              </div>
              <div className="text-xs font-semibold text-slate-500">
                Correct: <strong className="text-emerald-600">+10 pts</strong> · Mistake:{' '}
                <strong className="text-rose-600">-5 pts</strong>
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200/90">
              <div
                className="h-full rounded-full bg-linear-to-r from-brand-600 to-brand-500 transition-all duration-300"
                style={{
                  width: `${(matchedPairIds.length / causeReasonPurposePairs.length) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* Game Instructions & Floating Feedback */}
          <div className="px-5 pt-6 pb-2 sm:px-8 text-center">
            <h2 className="text-lg font-extrabold text-slate-900 sm:text-2xl">
              Connect the Pairs
            </h2>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm max-w-xl mx-auto">
              Click a numbered clause on the left, then click its corresponding cause, reason, or
              purpose clause on the right.
            </p>

            {/* Feedback Pop-up */}
            <div className="my-3 flex h-9 items-center justify-center">
              {feedback.kind && (
                <div
                  className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-extrabold shadow-xs transition-all ${
                    feedback.kind === 'correct'
                      ? 'bg-emerald-100 text-emerald-800 animate-[score-pop_420ms_ease-out]'
                      : 'bg-rose-100 text-rose-800 animate-[token-shake_420ms_ease-in-out]'
                  }`}
                >
                  <span>{feedback.kind === 'correct' ? '✓' : '✗'}</span>
                  <span>{feedback.text}</span>
                </div>
              )}
            </div>
          </div>

          {/* TWO COLUMNS MATCHING BOARD */}
          <div className="px-5 pb-8 sm:px-8">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* LEFT COLUMN: Numbered 1 to 8 */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Statements (Numbered 1-8)
                  </span>
                  <span className="text-xs text-slate-400">Left Column</span>
                </div>

                {leftColumnItems.map((item) => {
                  const isMatched = matchedPairIds.includes(item.id);
                  const isSelected = selectedLeftId === item.id;
                  const isWrong = wrongSelection?.leftId === item.id;
                  const accent = PAIR_ACCENTS[item.id];

                  return (
                    <button
                      key={`left-${item.id}`}
                      type="button"
                      disabled={isMatched || isInputLocked}
                      onClick={() => handleLeftClick(item.id)}
                      className={`group relative flex items-center justify-between rounded-2xl p-4 text-left font-medium transition-all duration-200 select-none ${
                        isMatched
                          ? `${accent.bg} ${accent.border} ${accent.text} border-2 opacity-90 cursor-default shadow-xs`
                          : isWrong
                          ? 'border-2 border-rose-500 bg-rose-50 text-rose-900 shadow-md ring-2 ring-rose-400/50 animate-[token-shake_420ms_ease-in-out]'
                          : isSelected
                          ? 'border-2 border-brand-500 bg-brand-50/60 text-brand-950 shadow-md ring-3 ring-brand-300/60 scale-[1.01]'
                          : 'border-2 border-slate-200 bg-white text-slate-800 shadow-xs hover:border-brand-400 hover:bg-slate-50 hover:-translate-y-0.5 hover:shadow-md cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 pr-2">
                        {/* Number Badge */}
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm font-black transition-colors ${
                            isMatched
                              ? `${accent.badgeBg} ${accent.badgeText}`
                              : isSelected
                              ? 'bg-brand-600 text-white'
                              : isWrong
                              ? 'bg-rose-600 text-white'
                              : 'bg-slate-100 text-slate-700 group-hover:bg-brand-100 group-hover:text-brand-800'
                          }`}
                        >
                          {item.id}
                        </span>

                        <span className="text-sm sm:text-base font-semibold leading-snug">
                          {item.leftText}
                        </span>
                      </div>

                      {/* Right Indicator / Matched Tag */}
                      <div className="shrink-0 pl-2">
                        {isMatched ? (
                          <span
                            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold ${accent.badgeBg} ${accent.badgeText}`}
                          >
                            <span>✓</span>
                            <span className="hidden sm:inline">Linked</span>
                          </span>
                        ) : isSelected ? (
                          <span className="flex h-3 w-3 rounded-full bg-brand-500 animate-ping" />
                        ) : (
                          <span className="flex h-3 w-3 rounded-full bg-slate-200 group-hover:bg-brand-300" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* RIGHT COLUMN: Shuffled clauses to match */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Connectors &amp; Clauses
                  </span>
                  <span className="text-xs text-slate-400">Right Column</span>
                </div>

                {rightColumnItems.map((item) => {
                  const isMatched = matchedPairIds.includes(item.id);
                  const isSelected = selectedRightId === item.id;
                  const isWrong = wrongSelection?.rightId === item.id;
                  const accent = PAIR_ACCENTS[item.id];

                  return (
                    <button
                      key={`right-${item.id}`}
                      type="button"
                      disabled={isMatched || isInputLocked}
                      onClick={() => handleRightClick(item.id)}
                      className={`group relative flex items-center justify-between rounded-2xl p-4 text-left font-medium transition-all duration-200 select-none ${
                        isMatched
                          ? `${accent.bg} ${accent.border} ${accent.text} border-2 opacity-90 cursor-default shadow-xs`
                          : isWrong
                          ? 'border-2 border-rose-500 bg-rose-50 text-rose-900 shadow-md ring-2 ring-rose-400/50 animate-[token-shake_420ms_ease-in-out]'
                          : isSelected
                          ? 'border-2 border-brand-500 bg-brand-50/60 text-brand-950 shadow-md ring-3 ring-brand-300/60 scale-[1.01]'
                          : 'border-2 border-slate-200 bg-white text-slate-800 shadow-xs hover:border-brand-400 hover:bg-slate-50 hover:-translate-y-0.5 hover:shadow-md cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-3 pr-2">
                        {/* Dot indicator */}
                        <div className="shrink-0">
                          {isMatched ? (
                            <span
                              className={`flex h-7 w-7 items-center justify-center rounded-xl text-xs font-black ${accent.badgeBg} ${accent.badgeText}`}
                            >
                              #{item.id}
                            </span>
                          ) : (
                            <span
                              className={`flex h-7 w-7 items-center justify-center rounded-xl text-xs font-bold ${
                                isSelected
                                  ? 'bg-brand-600 text-white'
                                  : isWrong
                                  ? 'bg-rose-600 text-white'
                                  : 'bg-slate-100 text-slate-500 group-hover:bg-brand-100 group-hover:text-brand-800'
                              }`}
                            >
                              🔗
                            </span>
                          )}
                        </div>

                        <div>
                          <span className="text-sm sm:text-base font-semibold leading-snug">
                            {item.rightText}
                          </span>
                        </div>
                      </div>

                      {/* Connector Category Tag (shown once matched) */}
                      {isMatched && (
                        <div className="shrink-0 pl-2">
                          <span className="inline-block rounded-md bg-white/80 px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-700 shadow-xs border border-slate-200">
                            {item.category}
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-4 text-xs font-semibold text-slate-500">
              <button
                type="button"
                onClick={handleRestart}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Restart Game
              </button>

              <div>
                Personal Best:{' '}
                <strong className="text-brand-700">{Math.max(bestScore, score)} pts</strong>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* VICTORY & GAME SUMMARY SCREEN */
        <div className="overflow-hidden rounded-3xl bg-white p-7 shadow-lg ring-1 ring-slate-200/90 sm:p-10 animate-[score-pop_400ms_ease-out]">
          <div className="mx-auto max-w-2xl text-center">
            {/* Trophy Icon */}
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-100 text-4xl shadow-inner ring-4 ring-amber-200">
              🏆
            </div>

            <span className="mt-4 inline-block rounded-full bg-emerald-100 px-3.5 py-1 text-xs font-black text-emerald-800 uppercase tracking-wider">
              All Pairs Connected!
            </span>

            <h2 className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl">
              Great job with Cause, Reason and Purpose!
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              You have successfully connected all 8 clauses using the correct connectors.
            </p>

            {/* Score Stats Grid */}
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl bg-brand-50 p-4 ring-1 ring-brand-100">
                <span className="text-xs font-bold text-brand-700 uppercase">Score</span>
                <p className="mt-1 text-2xl font-black text-brand-900">{score}</p>
              </div>

              <div className="rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-100">
                <span className="text-xs font-bold text-emerald-700 uppercase">Accuracy</span>
                <p className="mt-1 text-2xl font-black text-emerald-900">{accuracyPercent}%</p>
              </div>

              <div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-100">
                <span className="text-xs font-bold text-amber-700 uppercase">Max Combo</span>
                <p className="mt-1 text-2xl font-black text-amber-900">x{maxCombo}</p>
              </div>

              <div className="rounded-2xl bg-blue-50 p-4 ring-1 ring-blue-100">
                <span className="text-xs font-bold text-blue-700 uppercase">Time</span>
                <p className="mt-1 text-2xl font-black text-blue-900">
                  {formatTime(elapsedSeconds)}
                </p>
              </div>
            </div>

            {/* Complete Sentences Educational Review */}
            <div className="mt-8 text-left">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-600 mb-3">
                Complete Sentences Review:
              </h3>
              <div className="max-h-80 overflow-y-auto rounded-2xl border border-slate-200 divide-y divide-slate-100 bg-slate-50/50 p-2">
                {causeReasonPurposePairs.map((pair) => (
                  <div key={pair.id} className="p-3 text-xs sm:text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                      <span className="font-black text-slate-900">Pair #{pair.id}</span>
                      <span
                        className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                          pair.category === 'Purpose'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {pair.category} ({pair.connector})
                      </span>
                    </div>
                    <p className="text-slate-800 font-medium">
                      &ldquo;{pair.leftText}{' '}
                      <strong className="underline decoration-brand-500 font-extrabold text-brand-700">
                        {pair.rightText}
                      </strong>
                      &rdquo;
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">{pair.explanation}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleRestart}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-brand-700 px-6 py-3.5 text-sm font-extrabold text-white shadow-md transition-all hover:bg-brand-800 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-brand-500/30 active:scale-95 cursor-pointer"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Play Again
              </button>

              <Link
                href="/"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-extrabold text-slate-700 shadow-xs ring-1 ring-slate-200 transition-all hover:bg-slate-50 hover:text-slate-900 cursor-pointer"
              >
                Back to Challenges
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
