'use client';

import { useCallback, useEffect, useState } from 'react';
import { sfx } from './utils/soundEffects';
import { shuffle } from './utils/gameUtils';
import GameShell from './components/GameShell';
import GameSummary from './components/GameSummary';
import {
  causeReasonPurposePairs,
  createDeterministicInitialOrder,
  MatchingPair,
} from './data/causeReasonPurpose';

const CORRECT_POINTS = 10;
const MISTAKE_PENALTY = 5;

const PAIR_ACCENTS: Record<
  number,
  { border: string; bg: string; text: string; badgeBg: string; badgeText: string }
> = {
  1: { border: 'border-emerald-500', bg: 'bg-emerald-50/70', text: 'text-emerald-950', badgeBg: 'bg-emerald-600', badgeText: 'text-white' },
  2: { border: 'border-blue-500', bg: 'bg-blue-50/70', text: 'text-blue-950', badgeBg: 'bg-blue-600', badgeText: 'text-white' },
  3: { border: 'border-purple-500', bg: 'bg-purple-50/70', text: 'text-purple-950', badgeBg: 'bg-purple-600', badgeText: 'text-white' },
  4: { border: 'border-amber-500', bg: 'bg-amber-50/70', text: 'text-amber-950', badgeBg: 'bg-amber-600', badgeText: 'text-white' },
  5: { border: 'border-cyan-500', bg: 'bg-cyan-50/70', text: 'text-cyan-950', badgeBg: 'bg-cyan-600', badgeText: 'text-white' },
  6: { border: 'border-rose-500', bg: 'bg-rose-50/70', text: 'text-rose-950', badgeBg: 'bg-rose-600', badgeText: 'text-white' },
  7: { border: 'border-teal-500', bg: 'bg-teal-50/70', text: 'text-teal-950', badgeBg: 'bg-teal-600', badgeText: 'text-white' },
  8: { border: 'border-indigo-500', bg: 'bg-indigo-50/70', text: 'text-indigo-950', badgeBg: 'bg-indigo-600', badgeText: 'text-white' },
};

export default function CauseReasonandPurposeGame() {
  const leftColumnItems = causeReasonPurposePairs;

  const [rightColumnItems, setRightColumnItems] = useState<MatchingPair[]>(() =>
    createDeterministicInitialOrder(causeReasonPurposePairs),
  );

  const [selectedLeftId, setSelectedLeftId] = useState<number | null>(null);
  const [selectedRightId, setSelectedRightId] = useState<number | null>(null);

  const [matchedPairIds, setMatchedPairIds] = useState<number[]>([]);

  const [wrongSelection, setWrongSelection] = useState<{
    leftId: number;
    rightId: number;
  } | null>(null);

  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  const [feedback, setFeedback] = useState<{
    kind: 'correct' | 'wrong' | null;
    text: string;
    points?: number;
  }>({ kind: null, text: '' });

  const [isInputLocked, setIsInputLocked] = useState(false);

  // Shuffle after mount to keep server/client markup deterministic during hydration.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setRightColumnItems(shuffle(causeReasonPurposePairs));
    setIsHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (!isHydrated || isCompleted) return;

    const timer = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isHydrated, isCompleted]);

  const evaluateMatch = useCallback(
    (leftId: number, rightId: number) => {
      if (leftId === rightId) {
        sfx.correct();
        const nextMatches = [...matchedPairIds, leftId];
        setMatchedPairIds(nextMatches);
        setSelectedLeftId(null);
        setSelectedRightId(null);

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

        if (nextMatches.length === causeReasonPurposePairs.length) {
          sfx.victory();
          setTimeout(() => {
            setIsCompleted(true);
          }, 600);
        }
      } else {
        sfx.wrong();
        setIsInputLocked(true);
        setWrongSelection({ leftId, rightId });

        setScore((prev) => Math.max(0, prev - MISTAKE_PENALTY));
        setMistakes((prev) => prev + 1);
        setCombo(0);

        setFeedback({
          kind: 'wrong',
          text: `-${MISTAKE_PENALTY} Incorrect match`,
          points: -MISTAKE_PENALTY,
        });

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

  const handleLeftClick = (id: number) => {
    if (isInputLocked || matchedPairIds.includes(id)) return;

    if (selectedLeftId === id) {
      setSelectedLeftId(null);
      return;
    }

    setSelectedLeftId(id);

    if (selectedRightId !== null) {
      evaluateMatch(id, selectedRightId);
    }
  };

  const handleRightClick = (id: number) => {
    if (isInputLocked || matchedPairIds.includes(id)) return;

    if (selectedRightId === id) {
      setSelectedRightId(null);
      return;
    }

    setSelectedRightId(id);

    if (selectedLeftId !== null) {
      evaluateMatch(selectedLeftId, id);
    }
  };

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
    setRightColumnItems(shuffle(causeReasonPurposePairs));
  };

  const totalAttempts = matchedPairIds.length + mistakes;
  const accuracyPercent =
    totalAttempts === 0
      ? 100
      : Math.max(0, Math.round((matchedPairIds.length / totalAttempts) * 100));

  return (
    <GameShell
      title="Cause, Reason and Purpose"
      subtitle="Connect the pairs using the correct connectors"
      current={matchedPairIds.length}
      total={causeReasonPurposePairs.length}
      score={score}
      elapsedSeconds={elapsedSeconds}
      progressLabel="MATCHED"
      contentClassName="bg-white"
      footer={
        <>
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
            Score: <strong className="text-brand-700">{score} pts</strong>
          </div>
        </>
      }
    >
      {!isCompleted ? (
        <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/90">
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
          </div>

          <div className="px-5 pt-6 pb-2 sm:px-8 text-center">
            <h2 className="text-lg font-extrabold text-slate-900 sm:text-2xl">
              Connect the Pairs
            </h2>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm max-w-xl mx-auto">
              Click a numbered clause on the left, then click its corresponding cause, reason, or
              purpose clause on the right.
            </p>

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

          <div className="px-5 pb-8 sm:px-8">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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
          </div>
        </div>
      ) : (
        <GameSummary
          title="Great job with Cause, Reason and Purpose!"
          description="You have successfully connected all 8 clauses using the correct connectors."
          score={score}
          time={elapsedSeconds}
          accuracy={accuracyPercent}
          maxCombo={maxCombo}
          onRestart={handleRestart}
        >
          <div className="max-h-80 overflow-y-auto rounded-2xl border border-slate-200 divide-y divide-slate-100 bg-slate-50/50 p-2">
            <h3 className="p-3 text-sm font-extrabold uppercase tracking-wider text-slate-600">
              Complete Sentences Review:
            </h3>
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
        </GameSummary>
      )}
    </GameShell>
  );
}
