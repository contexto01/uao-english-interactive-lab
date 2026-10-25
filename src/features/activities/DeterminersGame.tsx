'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { sfx } from './utils/soundEffects';
import { shuffle } from './utils/gameUtils';
import GameShell from './components/GameShell';
import GameSummary from './components/GameSummary';
import {
  DeterminerQuestion,
  determinersQuestions,
} from './data/determiners';

const CORRECT_POINTS = 10;
const MISTAKE_PENALTY = 5;

type AnsweredState = {
  chosenAnswer: boolean;
  isCorrect: boolean;
};

export default function DeterminersGame() {
  const [questions, setQuestions] = useState<DeterminerQuestion[]>(determinersQuestions);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [cardAnimation, setCardAnimation] = useState<'center' | 'swiping-right' | 'swiping-left'>('center');

  const [answeredState, setAnsweredState] = useState<AnsweredState | null>(null);

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

  const nextButtonRef = useRef<HTMLButtonElement | null>(null);

  const currentQuestion = questions[currentIndex] ?? questions[0];

  // Shuffle after mount to keep server/client markup deterministic during hydration.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setQuestions(shuffle(determinersQuestions));
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

  const handleAnswer = useCallback(
    (chosenAnswer: boolean) => {
      if (isInputLocked || answeredState !== null || isCompleted) return;

      setIsInputLocked(true);

      if (chosenAnswer) {
        setCardAnimation('swiping-right');
      } else {
        setCardAnimation('swiping-left');
      }

      const isCorrect = chosenAnswer === currentQuestion.isTrue;

      if (isCorrect) {
        sfx.correct();
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
      } else {
        sfx.wrong();
        setScore((prev) => Math.max(0, prev - MISTAKE_PENALTY));
        setMistakes((prev) => prev + 1);
        setCombo(0);
        setFeedback({
          kind: 'wrong',
          text: `-${MISTAKE_PENALTY} Incorrect`,
          points: -MISTAKE_PENALTY,
        });
      }

      setAnsweredState({
        chosenAnswer,
        isCorrect,
      });

      setTimeout(() => {
        setIsInputLocked(false);
        nextButtonRef.current?.focus();
      }, 350);
    },
    [isInputLocked, answeredState, isCompleted, currentQuestion],
  );

  const handleNextQuestion = useCallback(() => {
    if (currentIndex + 1 >= questions.length) {
      sfx.victory();
      setIsCompleted(true);
    } else {
      setCardAnimation('center');
      setAnsweredState(null);
      setFeedback({ kind: null, text: '' });
      setCurrentIndex((prev) => prev + 1);
    }
  }, [currentIndex, questions.length]);

  const handleRestart = () => {
    const shuffled = shuffle(determinersQuestions);
    setQuestions(shuffled);
    setCurrentIndex(0);
    setCardAnimation('center');
    setAnsweredState(null);
    setFeedback({ kind: null, text: '' });
    setScore(0);
    setMistakes(0);
    setCombo(0);
    setElapsedSeconds(0);
    setIsCompleted(false);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (answeredState !== null) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') {
          e.preventDefault();
          handleNextQuestion();
        }
        return;
      }

      if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'f') {
        e.preventDefault();
        handleAnswer(false);
      } else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 't') {
        e.preventDefault();
        handleAnswer(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [answeredState, handleAnswer, handleNextQuestion]);

  const totalAnswers = currentIndex + (answeredState !== null ? 1 : 0);
  const correctCount = Math.max(0, totalAnswers - mistakes);
  const accuracyPercent = totalAnswers === 0 ? 100 : Math.round((correctCount / totalAnswers) * 100);

  return (
    <GameShell
      title="Determiners · True or False"
      subtitle="Read the statement and choose True or False"
      current={currentIndex + (answeredState !== null ? 1 : 0)}
      total={questions.length}
      score={score}
      elapsedSeconds={elapsedSeconds}
      progressLabel="PROGRESS"
      contentClassName="bg-white"
      footer={
        <>
          <div>
            Current Mistakes: <strong className="text-slate-700">{mistakes}</strong>
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
                  Statement {currentIndex + 1} of {questions.length}
                </span>
              </div>
              <div className="text-xs font-semibold text-slate-500">
                Correct: <strong className="text-emerald-600">+10 pts</strong> · Mistake:{' '}
                <strong className="text-rose-600">-5 pts</strong>
              </div>
            </div>
          </div>

          <div className="px-5 py-8 sm:px-10 text-center">
            <div className="mx-auto max-w-xl">
              <span className="inline-block rounded-full bg-brand-50 px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider text-brand-700">
                Determiners · True or False
              </span>

              <div className="my-3 flex h-8 items-center justify-center">
                {feedback.kind && (
                  <div
                    className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1 text-xs sm:text-sm font-extrabold shadow-xs transition-all ${
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

              <div className="relative py-4 perspective-1000">
                <div
                  className={`mx-auto w-full max-w-lg rounded-3xl p-7 sm:p-10 border-2 transition-all duration-300 ease-out select-none shadow-lg ${
                    cardAnimation === 'swiping-right'
                      ? 'translate-x-12 rotate-12 scale-95 border-emerald-500 bg-emerald-50/80 shadow-emerald-200 ring-4 ring-emerald-300/40'
                      : cardAnimation === 'swiping-left'
                        ? '-translate-x-12 -rotate-12 scale-95 border-rose-500 bg-rose-50/80 shadow-rose-200 ring-4 ring-rose-300/40'
                        : 'translate-x-0 rotate-0 scale-100 border-slate-200/90 bg-linear-to-b from-white to-slate-50 shadow-md ring-1 ring-slate-100'
                  }`}
                  style={{
                    transformOrigin: '50% 120%',
                  }}
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Topic: {currentQuestion.category}
                    </span>
                    <span className="text-xs font-black text-brand-700">
                      #{currentIndex + 1}
                    </span>
                  </div>

                  <h3 className="min-h-24 sm:min-h-28 flex items-center justify-center text-xl sm:text-2xl font-black leading-snug text-slate-900">
                    {currentQuestion.statement}
                  </h3>

                  <div className="mt-6 flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-slate-400 border-t border-slate-100 pt-3">
                    <span className="flex items-center gap-1 text-rose-600">
                      <span>←</span>
                      <span>Rotate Left for False</span>
                    </span>
                    <span className="flex items-center gap-1 text-emerald-600">
                      <span>Rotate Right for True</span>
                      <span>→</span>
                    </span>
                  </div>
                </div>
              </div>

              {answeredState !== null ? (
                <div className="mt-6 overflow-hidden rounded-2xl border-2 p-5 text-left transition-all animate-[score-pop_300ms_ease-out] shadow-sm bg-white border-slate-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-black text-white ${
                        answeredState.isCorrect ? 'bg-emerald-600' : 'bg-rose-600'
                      }`}
                    >
                      {answeredState.isCorrect ? '✓' : '✗'}
                    </span>
                    <span className="text-sm font-extrabold text-slate-900">
                      {answeredState.isCorrect ? 'Well done!' : 'Not quite right!'} The statement is{' '}
                      <strong
                        className={`underline ${
                          currentQuestion.isTrue ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {currentQuestion.isTrue ? 'TRUE' : 'FALSE'}
                      </strong>
                      .
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-600 pl-8 leading-relaxed">
                    💡 <strong>Explanation:</strong> {currentQuestion.explanation}
                  </p>

                  <div className="mt-4 flex justify-end">
                    <button
                      ref={nextButtonRef}
                      type="button"
                      onClick={handleNextQuestion}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-700 px-6 py-3 text-sm font-extrabold text-white shadow-md transition-all hover:bg-brand-800 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-brand-500/30 active:scale-95 cursor-pointer"
                    >
                      <span>
                        {currentIndex + 1 >= questions.length
                          ? 'View Final Results 🎉'
                          : 'Next Statement →'}
                      </span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
                  <button
                    type="button"
                    disabled={isInputLocked}
                    onClick={() => handleAnswer(false)}
                    aria-label="False: statement is incorrect (rotates card left)"
                    className="w-full sm:w-1/2 flex items-center justify-center gap-3 rounded-2xl border-2 border-rose-300 bg-linear-to-b from-rose-50 to-white px-6 py-4.5 text-rose-700 font-black shadow-sm transition-all duration-150 hover:border-rose-500 hover:bg-rose-50 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-95 cursor-pointer focus:outline-none focus:ring-4 focus:ring-rose-200"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-600 text-white text-base shadow-xs">
                      ✗
                    </span>
                    <span className="text-lg">FALSE</span>
                    <span className="text-xs text-rose-400 font-semibold">(← Left)</span>
                  </button>

                  <button
                    type="button"
                    disabled={isInputLocked}
                    onClick={() => handleAnswer(true)}
                    aria-label="True: statement is correct (rotates card right)"
                    className="w-full sm:w-1/2 flex items-center justify-center gap-3 rounded-2xl border-2 border-emerald-300 bg-linear-to-b from-emerald-50 to-white px-6 py-4.5 text-emerald-700 font-black shadow-sm transition-all duration-150 hover:border-emerald-500 hover:bg-emerald-50 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-95 cursor-pointer focus:outline-none focus:ring-4 focus:ring-emerald-200"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 text-white text-base shadow-xs">
                      ✓
                    </span>
                    <span className="text-lg">TRUE</span>
                    <span className="text-xs text-emerald-400 font-semibold">(Right →)</span>
                  </button>
                </div>
              )}

              <div className="mt-5 text-xs text-slate-400">
                Tip: Press <kbd className="rounded border bg-slate-100 px-1.5 py-0.5">←</kbd> or{' '}
                <kbd className="rounded border bg-slate-100 px-1.5 py-0.5">F</kbd> for False ·{' '}
                <kbd className="rounded border bg-slate-100 px-1.5 py-0.5">→</kbd> or{' '}
                <kbd className="rounded border bg-slate-100 px-1.5 py-0.5">T</kbd> for True
              </div>
            </div>
          </div>
        </div>
      ) : (
        <GameSummary
          title="Great job with Determiners!"
          description="You have completed all 10 True or False statements on articles, demonstratives, possessives, and quantifiers."
          score={score}
          time={elapsedSeconds}
          accuracy={accuracyPercent}
          maxCombo={maxCombo}
          onRestart={handleRestart}
        >
          <div className="max-h-80 overflow-y-auto rounded-2xl border border-slate-200 divide-y divide-slate-100 bg-slate-50/50 p-2">
            <h3 className="p-3 text-sm font-extrabold uppercase tracking-wider text-slate-600">
              Concept Review (All 10 Statements):
            </h3>
            {determinersQuestions.map((q) => (
              <div key={q.id} className="p-3 text-xs sm:text-sm">
                <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                  <span className="font-bold text-slate-900">
                    {q.id}. {q.statement}
                  </span>
                  <span
                    className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-black uppercase ${
                      q.isTrue
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {q.isTrue ? 'TRUE ✓' : 'FALSE ✗'}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">{q.explanation}</p>
              </div>
            ))}
          </div>
        </GameSummary>
      )}
    </GameShell>
  );
}
