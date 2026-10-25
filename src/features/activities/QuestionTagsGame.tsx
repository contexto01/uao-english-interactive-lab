'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { sfx } from './utils/soundEffects';
import { shuffle } from './utils/gameUtils';
import GameShell from './components/GameShell';
import GameSummary from './components/GameSummary';
import {
  createInitialTiles,
  createScrambledTiles,
  LetterTile,
  QuestionTagItem,
  questionTagsQuestions,
} from './data/questionTags';

const CORRECT_POINTS = 10;
const MISTAKE_PENALTY = 5;

type SlotState = {
  char: string;
  status: 'empty' | 'correct' | 'wrong';
  tileId?: string;
};

type FeedbackState = {
  kind: 'correct' | 'wrong' | 'complete' | null;
  text: string;
  points?: number;
};

export default function QuestionTagsGame() {
  const [questions, setQuestions] = useState<QuestionTagItem[]>(questionTagsQuestions);
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentQuestion = questions[currentIndex] ?? questions[0];
  const targetWord = currentQuestion.word.toUpperCase();

  const [scrambledTiles, setScrambledTiles] = useState<LetterTile[]>(() =>
    createInitialTiles(questionTagsQuestions[0].word),
  );
  const [usedTileIds, setUsedTileIds] = useState<string[]>([]);

  const [slots, setSlots] = useState<SlotState[]>(() =>
    targetWord.split('').map(() => ({ char: '', status: 'empty' })),
  );

  const [score, setScore] = useState(0);
  const [, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [totalMistakes, setTotalMistakes] = useState(0);
  const [wordMistakes, setWordMistakes] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const [feedback, setFeedback] = useState<FeedbackState>({ kind: null, text: '' });
  const [isInputLocked, setIsInputLocked] = useState(false);

  const nextButtonRef = useRef<HTMLButtonElement | null>(null);

  const isWordFinished = useMemo(() => {
    return (
      slots.length === targetWord.length &&
      slots.every((slot) => slot.status === 'correct') &&
      slots.map((s) => s.char).join('') === targetWord
    );
  }, [slots, targetWord]);

  const nextEmptySlotIndex = useMemo(() => {
    return slots.findIndex((slot) => slot.status === 'empty');
  }, [slots]);

  // Shuffle after mount to keep server/client markup deterministic during hydration.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setQuestions(shuffle(questionTagsQuestions));
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

  const resetWordState = useCallback((word: string) => {
    const tiles = createScrambledTiles(word);
    setScrambledTiles(tiles);
    setUsedTileIds([]);
    setSlots(word.split('').map(() => ({ char: '', status: 'empty' })));
    setWordMistakes(0);
    setFeedback({ kind: null, text: '' });
    setIsInputLocked(false);
  }, []);

  // Reset tile/slot state whenever the active question changes.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (questions[currentIndex]) {
      resetWordState(questions[currentIndex].word);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [currentIndex, questions, resetWordState]);

  const handleSelectLetter = useCallback(
    (tile: LetterTile) => {
      if (isInputLocked || isWordFinished || usedTileIds.includes(tile.id)) {
        return;
      }

      const slotIdx = nextEmptySlotIndex;
      if (slotIdx === -1) return;

      const expectedChar = targetWord[slotIdx];
      const isCorrect = tile.char.toUpperCase() === expectedChar.toUpperCase();

      if (isCorrect) {
        sfx.correct();
        const nextSlots = [...slots];
        nextSlots[slotIdx] = {
          char: tile.char,
          status: 'correct',
          tileId: tile.id,
        };
        setSlots(nextSlots);
        setUsedTileIds((prev) => [...prev, tile.id]);

        setScore((prev) => prev + CORRECT_POINTS);
        setCombo((prev) => {
          const next = prev + 1;
          setMaxCombo((m) => Math.max(m, next));
          return next;
        });

        setFeedback({
          kind: 'correct',
          text: `+${CORRECT_POINTS} Correct!`,
          points: CORRECT_POINTS,
        });

        const isNowComplete = slotIdx === targetWord.length - 1;
        if (isNowComplete) {
          sfx.wordComplete();
          setFeedback({
            kind: 'complete',
            text: 'Word completed successfully!',
            points: CORRECT_POINTS,
          });

          setTimeout(() => {
            nextButtonRef.current?.focus();
          }, 150);
        }
      } else {
        sfx.wrong();
        setIsInputLocked(true);

        const nextSlots = [...slots];
        nextSlots[slotIdx] = {
          char: tile.char,
          status: 'wrong',
          tileId: tile.id,
        };
        setSlots(nextSlots);

        setScore((prev) => Math.max(0, prev - MISTAKE_PENALTY));
        setTotalMistakes((prev) => prev + 1);
        setWordMistakes((prev) => prev + 1);
        setCombo(0);

        setFeedback({
          kind: 'wrong',
          text: `-${MISTAKE_PENALTY} Incorrect letter`,
          points: -MISTAKE_PENALTY,
        });

        setTimeout(() => {
          setSlots((currentSlots) => {
            const reverted = [...currentSlots];
            if (reverted[slotIdx] && reverted[slotIdx].status === 'wrong') {
              reverted[slotIdx] = { char: '', status: 'empty' };
            }
            return reverted;
          });
          setIsInputLocked(false);
        }, 650);
      }
    },
    [isInputLocked, isWordFinished, usedTileIds, nextEmptySlotIndex, targetWord, slots],
  );

  const handleResetWord = () => {
    resetWordState(targetWord);
  };

  const handleNextQuestion = useCallback(() => {
    if (currentIndex + 1 >= questions.length) {
      sfx.victory();
      setIsCompleted(true);
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [currentIndex, questions.length]);

  const handleRestartGame = () => {
    const shuffled = shuffle(questionTagsQuestions);
    setQuestions(shuffled);
    setCurrentIndex(0);
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setTotalMistakes(0);
    setElapsedSeconds(0);
    setIsCompleted(false);
    resetWordState(shuffled[0].word);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === 'Enter') {
        if (isWordFinished) {
          e.preventDefault();
          handleNextQuestion();
        }
        return;
      }

      if (e.key === 'Backspace') {
        if (!isWordFinished && !isInputLocked && slots.some((s) => s.status === 'correct')) {
          e.preventDefault();
          const lastFilledIdx = [...slots].reverse().findIndex((s) => s.status === 'correct');
          if (lastFilledIdx !== -1) {
            const actualIdx = slots.length - 1 - lastFilledIdx;
            const tileIdToRemove = slots[actualIdx].tileId;
            setSlots((prev) => {
              const updated = [...prev];
              updated[actualIdx] = { char: '', status: 'empty' };
              return updated;
            });
            if (tileIdToRemove) {
              setUsedTileIds((prev) => prev.filter((id) => id !== tileIdToRemove));
            }
          }
        }
        return;
      }

      const keyChar = e.key.toUpperCase();
      if (/^[A-Z]$/.test(keyChar)) {
        const availableTile = scrambledTiles.find(
          (t) => t.char.toUpperCase() === keyChar && !usedTileIds.includes(t.id),
        );
        if (availableTile) {
          e.preventDefault();
          handleSelectLetter(availableTile);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isWordFinished,
    isInputLocked,
    scrambledTiles,
    usedTileIds,
    handleNextQuestion,
    handleSelectLetter,
    slots,
  ]);

  const totalLetters = useMemo(() => {
    return questions.reduce((sum, q) => sum + q.word.length, 0);
  }, [questions]);

  const accuracyPercent = useMemo(() => {
    const totalAttempts = totalLetters + totalMistakes;
    if (totalAttempts === 0) return 100;
    return Math.max(0, Math.round((totalLetters / totalAttempts) * 100));
  }, [totalLetters, totalMistakes]);

  return (
    <GameShell
      title="Question Tags"
      subtitle="Arrange the letters to spell the correct word"
      current={currentIndex + (isWordFinished ? 1 : 0)}
      total={questions.length}
      score={score}
      elapsedSeconds={elapsedSeconds}
      progressLabel="PROGRESS"
      contentClassName="bg-white"
      footer={
        <>
          <div>
            Mistakes on this word: <strong className="text-slate-700">{wordMistakes}</strong>
          </div>
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
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-xs font-black text-brand-700">
                  {currentIndex + 1}
                </span>
                <span>
                  Question {currentIndex + 1} of {questions.length}
                </span>
              </div>
              <div className="text-xs font-semibold text-slate-500">
                Correct: <strong className="text-emerald-600">+10 pts</strong> · Mistake:{' '}
                <strong className="text-rose-600">-5 pts</strong>
              </div>
            </div>
          </div>

          <div className="px-5 py-7 sm:px-10 sm:py-9">
            <div className="mx-auto max-w-2xl text-center">
              <span className="inline-block rounded-full bg-brand-50 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-brand-700">
                Question Tags Definition
              </span>
              <h2 className="mt-3 text-lg font-bold leading-snug text-slate-900 sm:text-2xl">
                &ldquo;{currentQuestion.clue}&rdquo;
              </h2>
              <p className="mt-2 text-xs text-slate-500 sm:text-sm">
                Arrange the letters to spell the correct word.
              </p>
            </div>

            <div className="my-4 flex h-10 items-center justify-center">
              {feedback.kind && (
                <div
                  className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-extrabold shadow-xs transition-all ${
                    feedback.kind === 'correct'
                      ? 'bg-emerald-100 text-emerald-800 animate-[score-pop_420ms_ease-out]'
                      : feedback.kind === 'wrong'
                        ? 'bg-rose-100 text-rose-800 animate-[token-shake_420ms_ease-in-out]'
                        : 'bg-brand-100 text-brand-800 animate-[score-pop_420ms_ease-out]'
                  }`}
                >
                  {feedback.kind === 'correct' && <span>✓</span>}
                  {feedback.kind === 'wrong' && <span>✗</span>}
                  {feedback.kind === 'complete' && <span>🎉</span>}
                  <span>{feedback.text}</span>
                </div>
              )}
            </div>

            <div className="mt-2 mb-8">
              <div className="text-center text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                Target Word ({targetWord.length} letters)
              </div>
              <div
                className="flex flex-wrap items-center justify-center gap-2 sm:gap-3"
                role="region"
                aria-label="Word letter slots"
              >
                {slots.map((slot, index) => {
                  const isCurrentTarget = index === nextEmptySlotIndex && !isWordFinished;
                  return (
                    <div
                      key={`slot-${index}`}
                      className={`relative flex h-13 w-13 sm:h-16 sm:w-16 items-center justify-center rounded-2xl text-xl sm:text-2xl font-black uppercase transition-all duration-200 select-none ${
                        slot.status === 'correct'
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25 ring-2 ring-emerald-500 scale-100 animate-[score-pop_280ms_ease-out]'
                          : slot.status === 'wrong'
                            ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30 ring-2 ring-rose-500 scale-105 animate-[token-shake_420ms_ease-in-out]'
                            : isCurrentTarget
                              ? 'border-2 border-dashed border-brand-400 bg-brand-50/40 text-brand-700 shadow-inner ring-2 ring-brand-300/60 ring-offset-1'
                              : 'border-2 border-dashed border-slate-300 bg-slate-50/70 text-slate-300'
                      }`}
                    >
                      {slot.char ? (
                        <span>{slot.char}</span>
                      ) : (
                        <span className="text-xs font-bold text-slate-300 sm:text-sm">
                          {index + 1}
                        </span>
                      )}

                      {isCurrentTarget && !slot.char && (
                        <span className="absolute bottom-1.5 h-1.5 w-4 rounded-full bg-brand-500 animate-pulse" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50/90 p-5 ring-1 ring-inset ring-slate-200/80 sm:p-7">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  Available letters (Click or type):
                </span>
                <span className="text-xs text-slate-400">
                  {scrambledTiles.filter((t) => !usedTileIds.includes(t.id)).length} remaining
                </span>
              </div>

              <div
                className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3.5"
                role="group"
                aria-label="Available letter tiles"
              >
                {scrambledTiles.map((tile) => {
                  const isUsed = usedTileIds.includes(tile.id);

                  return (
                    <button
                      key={tile.id}
                      type="button"
                      disabled={isUsed || isInputLocked || isWordFinished}
                      onClick={() => handleSelectLetter(tile)}
                      aria-label={`Select letter ${tile.char}`}
                      className={`relative flex h-13 w-13 sm:h-16 sm:w-16 items-center justify-center rounded-2xl text-xl sm:text-2xl font-black uppercase transition-all duration-150 select-none ${
                        isUsed
                          ? 'opacity-20 bg-slate-200 text-slate-400 border border-slate-200 cursor-not-allowed scale-90'
                          : 'bg-white text-slate-800 border-2 border-slate-200 shadow-sm hover:border-brand-500 hover:text-brand-700 hover:-translate-y-1 hover:shadow-md active:translate-y-0 active:scale-95 cursor-pointer'
                      }`}
                    >
                      {tile.char}
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/70 pt-4 text-xs font-semibold text-slate-600">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetWord}
                    disabled={usedTileIds.length === 0 || isWordFinished}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-slate-600 transition-colors hover:bg-slate-200/70 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Reset word
                  </button>
                </div>

                <div className="text-slate-400">
                  Tip: You can also use your physical keyboard to type letters directly.
                </div>
              </div>
            </div>

            {isWordFinished && (
              <div className="mt-6 overflow-hidden rounded-2xl border-2 border-emerald-400 bg-emerald-50/90 p-5 shadow-sm animate-[score-pop_300ms_ease-out]">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-xs font-black text-white">
                        ✓
                      </span>
                      <h3 className="text-base font-extrabold text-emerald-950">
                        Correct word: {targetWord}!
                      </h3>
                    </div>
                    <p className="mt-1.5 text-sm font-semibold text-emerald-900">
                      {currentQuestion.example}
                    </p>
                    {currentQuestion.tip && (
                      <p className="mt-1 text-xs text-emerald-800">
                        💡 <strong>Rule:</strong> {currentQuestion.tip}
                      </p>
                    )}
                  </div>

                  <button
                    ref={nextButtonRef}
                    type="button"
                    onClick={handleNextQuestion}
                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-brand-700 px-6 py-3.5 text-sm font-extrabold text-white shadow-md transition-all hover:bg-brand-800 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-brand-500/30 active:scale-95 cursor-pointer"
                  >
                    <span>
                      {currentIndex + 1 >= questions.length
                        ? 'View Final Results 🎉'
                        : 'Next Word →'}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <GameSummary
          title="Great job with Question Tags!"
          description="You have successfully mastered all 10 essential question tags concepts."
          score={score}
          time={elapsedSeconds}
          accuracy={accuracyPercent}
          maxCombo={maxCombo}
          onRestart={handleRestartGame}
        >
          <div className="max-h-64 overflow-y-auto rounded-2xl border border-slate-200 divide-y divide-slate-100 bg-slate-50/50 p-2">
            <h3 className="p-3 text-sm font-extrabold uppercase tracking-wider text-slate-600">
              Summary of Concepts Learned:
            </h3>
            {questions.map((item, idx) => (
              <div key={item.id} className="p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-black text-slate-900">
                    {idx + 1}. {item.word}
                  </span>
                  <span className="text-emerald-700 font-bold">✓ Solved</span>
                </div>
                <p className="mt-0.5 text-slate-600">{item.clue}</p>
                <p className="mt-1 text-slate-500 italic">{item.example}</p>
              </div>
            ))}
          </div>
        </GameSummary>
      )}
    </GameShell>
  );
}
