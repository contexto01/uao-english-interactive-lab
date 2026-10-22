'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DeterminerQuestion,
  determinersQuestions,
  shuffleArray,
} from './data/determiners';

const CORRECT_POINTS = 10;
const MISTAKE_PENALTY = 5;

/**
 * Web Audio API procedural sound effects synthesizer
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
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.14); // A5

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
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.linearRampToValueAtTime(110, now + 0.24);

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
    const notes = [
      { f: 523.25, d: 0.12 },
      { f: 659.25, d: 0.12 },
      { f: 783.99, d: 0.12 },
      { f: 1046.5, d: 0.35 },
    ];
    let offset = 0;
    notes.forEach((note) => {
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

export default function DeterminersGame() {
  // Deterministic initial questions order for SSR
  const [questions, setQuestions] = useState<DeterminerQuestion[]>(determinersQuestions);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Card animation state: 'center' | 'swiping-right' (True) | 'swiping-left' (False)
  const [cardAnimation, setCardAnimation] = useState<'center' | 'swiping-right' | 'swiping-left'>(
    'center',
  );

  // Current question answer feedback state
  const [answeredState, setAnsweredState] = useState<{
    chosenAnswer: boolean;
    isCorrect: boolean;
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

  // Ref to auto-focus next button once answered
  const nextButtonRef = useRef<HTMLButtonElement | null>(null);

  const currentQuestion = questions[currentIndex] ?? questions[0];

  // Shuffle questions on client mount
  useEffect(() => {
    setQuestions(shuffleArray(determinersQuestions));
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
   * Handle user choosing True or False
   * Rule:
   * - "si el usuario presiona verdadero la carta gira a la derecha" (rotates right)
   * - "si presiona falso ira a la izquierda" (rotates left)
   * - "Si es correcto +10 puntos y si es falso -5 puntos."
   */
  const handleAnswer = useCallback(
    (chosenAnswer: boolean) => {
      if (isInputLocked || answeredState !== null || isCompleted) return;

      setIsInputLocked(true);

      // Trigger tilt/rotation animation: True -> right, False -> left
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

      // Unlock input and focus next button
      setTimeout(() => {
        setIsInputLocked(false);
        nextButtonRef.current?.focus();
      }, 350);
    },
    [isInputLocked, answeredState, isCompleted, currentQuestion],
  );

  /**
   * Move to next question or complete game
   */
  const handleNextQuestion = useCallback(() => {
    if (currentIndex + 1 >= questions.length) {
      // Finished all 10 questions!
      sfx.victory();
      setIsCompleted(true);
    } else {
      // Reset card position & feedback for next card
      setCardAnimation('center');
      setAnsweredState(null);
      setFeedback({ kind: null, text: '' });
      setCurrentIndex((prev) => prev + 1);
    }
  }, [currentIndex, questions.length]);

  /**
   * Restart entire game
   */
  const handleRestart = () => {
    const shuffled = shuffleArray(determinersQuestions);
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

  // Keyboard shortcut listener:
  // - Left Arrow / 'F' -> False
  // - Right Arrow / 'T' -> True
  // - Enter / Space -> Next question (when answered)
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

  // Accuracy calculation
  const totalAnswers = currentIndex + (answeredState !== null ? 1 : 0);
  const correctCount = Math.max(0, totalAnswers - mistakes);
  const accuracyPercent =
    totalAnswers === 0 ? 100 : Math.round((correctCount / totalAnswers) * 100);

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

            {/* Visual Progress Bar */}
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200/90">
              <div
                className="h-full rounded-full bg-linear-to-r from-brand-600 to-brand-500 transition-all duration-300"
                style={{
                  width: `${((currentIndex + (answeredState !== null ? 1 : 0)) / questions.length) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* Question Presentation & Interactive Card */}
          <div className="px-5 py-8 sm:px-10 text-center">
            <div className="mx-auto max-w-xl">
              <span className="inline-block rounded-full bg-brand-50 px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider text-brand-700">
                Determiners · True or False
              </span>

              {/* Floating Feedback Badge */}
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

              {/* CARD CONTAINER with dynamic 3D tilt/rotation */}
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
                  {/* Category Pill on Card */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Topic: {currentQuestion.category}
                    </span>
                    <span className="text-xs font-black text-brand-700">
                      #{currentIndex + 1}
                    </span>
                  </div>

                  {/* Main Statement Text */}
                  <h3 className="min-h-24 sm:min-h-28 flex items-center justify-center text-xl sm:text-2xl font-black leading-snug text-slate-900">
                    {currentQuestion.statement}
                  </h3>

                  {/* Visual Swipe Direction Hint Indicators on Card */}
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

              {/* ANSWER EXPLANATION BOX (Revealed after answering) */}
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
                /* ACTION BUTTONS (FALSE on left, TRUE on right) */
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
                  {/* FALSE BUTTON (Tilts card to left) */}
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

                  {/* TRUE BUTTON (Tilts card to right) */}
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

              {/* Keyboard helper note */}
              <div className="mt-5 text-xs text-slate-400">
                Tip: Press <kbd className="rounded border bg-slate-100 px-1.5 py-0.5">←</kbd> or{' '}
                <kbd className="rounded border bg-slate-100 px-1.5 py-0.5">F</kbd> for False ·{' '}
                <kbd className="rounded border bg-slate-100 px-1.5 py-0.5">→</kbd> or{' '}
                <kbd className="rounded border bg-slate-100 px-1.5 py-0.5">T</kbd> for True
              </div>
            </div>
          </div>

          {/* Footer Stats */}
          <div className="flex flex-wrap items-center justify-between border-t border-slate-100 bg-slate-50/60 px-6 py-3 text-xs text-slate-500">
            <div>
              Current Mistakes: <strong className="text-slate-700">{mistakes}</strong>
            </div>
            <div>
              Personal Best:{' '}
              <strong className="text-brand-700">{Math.max(bestScore, score)} pts</strong>
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
              Challenge Completed!
            </span>

            <h2 className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl">
              Great job with Determiners!
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              You have completed all 10 True or False statements on articles, demonstratives,
              possessives, and quantifiers.
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

            {/* Educational Concepts Review List */}
            <div className="mt-8 text-left">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-600 mb-3">
                Concept Review (All 10 Statements):
              </h3>
              <div className="max-h-80 overflow-y-auto rounded-2xl border border-slate-200 divide-y divide-slate-100 bg-slate-50/50 p-2">
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
