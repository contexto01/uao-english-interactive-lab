'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { sfx } from './utils/soundEffects';
import { formatTime } from './utils/gameUtils';
import GameShell from './components/GameShell';
import GameSummary from './components/GameSummary';
import {
  generateRandomizedQuiz,
  InfinitiveGerundQuestion,
} from './data/infinitivesGerunds';

const CORRECT_POINTS = 10;
const MISTAKE_PENALTY = 5;
const JUMP_MS = 450;

type FrogStatus =
  | 'idle'
  | 'jumping'
  | 'success'
  | 'sinking'
  | 'sunken';

function FrogCharacter({
  status,
  isCelebration = false,
}: {
  status: FrogStatus;
  isCelebration?: boolean;
}) {
  const isHappy = status === 'success' || isCelebration;
  const isSinking = status === 'sinking' || status === 'sunken';

  return (
    <div
      className={`relative transition-all duration-300 ${
        isSinking
          ? 'translate-y-6 scale-90 opacity-40 blur-[0.5px]'
          : isHappy
            ? '-translate-y-2 scale-110'
            : 'scale-100'
      }`}
    >
      <svg
        viewBox="0 0 120 110"
        className="h-20 w-20 drop-shadow-[0_8px_16px_rgba(0,0,0,0.35)] sm:h-24 sm:w-24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {!isSinking && <ellipse cx="60" cy="100" rx="36" ry="7" fill="rgba(6, 44, 30, 0.45)" />}

        <ellipse cx="28" cy="78" rx="18" ry="14" fill="#16a34a" transform="rotate(-20 28 78)" stroke="#14532d" strokeWidth="2.5" />
        <ellipse cx="92" cy="78" rx="18" ry="14" fill="#16a34a" transform="rotate(20 92 78)" stroke="#14532d" strokeWidth="2.5" />

        <path d="M12 90 C 10 95, 20 98, 28 92 C 34 98, 42 94, 38 88" fill="#22c55e" stroke="#14532d" strokeWidth="2" />
        <path d="M108 90 C 110 95, 100 98, 92 92 C 86 98, 78 94, 82 88" fill="#22c55e" stroke="#14532d" strokeWidth="2" />

        <ellipse cx="60" cy="66" rx="34" ry="28" fill="url(#frogBodyGrad)" stroke="#14532d" strokeWidth="3" />
        <ellipse cx="60" cy="72" rx="22" ry="17" fill="#fef08a" opacity="0.9" />

        <circle cx="44" cy="56" r="3.5" fill="#15803d" opacity="0.6" />
        <circle cx="76" cy="58" r="3" fill="#15803d" opacity="0.6" />
        <circle cx="60" cy="48" r="2.5" fill="#15803d" opacity="0.6" />

        {isHappy ? (
          <>
            <path d="M38 65 Q 24 50 20 38" stroke="#16a34a" strokeWidth="6" strokeLinecap="round" />
            <circle cx="19" cy="36" r="5" fill="#22c55e" stroke="#14532d" strokeWidth="2" />
            <path d="M82 65 Q 96 50 100 38" stroke="#16a34a" strokeWidth="6" strokeLinecap="round" />
            <circle cx="101" cy="36" r="5" fill="#22c55e" stroke="#14532d" strokeWidth="2" />
          </>
        ) : (
          <>
            <path d="M42 74 Q 40 88 44 94" stroke="#16a34a" strokeWidth="5" strokeLinecap="round" />
            <circle cx="44" cy="94" r="4.5" fill="#22c55e" stroke="#14532d" strokeWidth="2" />
            <path d="M78 74 Q 80 88 76 94" stroke="#16a34a" strokeWidth="5" strokeLinecap="round" />
            <circle cx="76" cy="94" r="4.5" fill="#22c55e" stroke="#14532d" strokeWidth="2" />
          </>
        )}

        <circle cx="42" cy="38" r="15" fill="#22c55e" stroke="#14532d" strokeWidth="3" />
        <circle cx="78" cy="38" r="15" fill="#22c55e" stroke="#14532d" strokeWidth="3" />

        {isSinking ? (
          <>
            <circle cx="42" cy="38" r="11" fill="#fef08a" />
            <path d="M36 38 Q 42 32 48 38 Q 42 44 38 40" stroke="#854d0e" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <circle cx="78" cy="38" r="11" fill="#fef08a" />
            <path d="M72 38 Q 78 32 84 38 Q 78 44 74 40" stroke="#854d0e" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </>
        ) : isHappy ? (
          <>
            <circle cx="42" cy="38" r="11" fill="#ffffff" />
            <path d="M35 39 Q 42 31 49 39" stroke="#14532d" strokeWidth="3.5" strokeLinecap="round" fill="none" />
            <circle cx="78" cy="38" r="11" fill="#ffffff" />
            <path d="M71 39 Q 78 31 85 39" stroke="#14532d" strokeWidth="3.5" strokeLinecap="round" fill="none" />
          </>
        ) : (
          <>
            <circle cx="42" cy="38" r="11" fill="#ffffff" />
            <circle cx="43" cy="37" r="6" fill="#0f172a" />
            <circle cx="45" cy="34" r="2.5" fill="#ffffff" />
            <circle cx="78" cy="38" r="11" fill="#ffffff" />
            <circle cx="77" cy="37" r="6" fill="#0f172a" />
            <circle cx="79" cy="34" r="2.5" fill="#ffffff" />
          </>
        )}

        <ellipse cx="33" cy="56" rx="5" ry="3" fill="#fb7185" opacity="0.65" />
        <ellipse cx="87" cy="56" rx="5" ry="3" fill="#fb7185" opacity="0.65" />

        {isSinking ? (
          <path d="M50 63 Q 60 55 70 63" stroke="#14532d" strokeWidth="3" strokeLinecap="round" fill="none" />
        ) : isHappy ? (
          <>
            <path d="M48 57 Q 60 74 72 57 Z" fill="#be123c" stroke="#14532d" strokeWidth="2.5" />
            <ellipse cx="60" cy="64" rx="6" ry="3" fill="#f43f5e" />
          </>
        ) : (
          <path d="M48 58 Q 60 67 72 58" stroke="#14532d" strokeWidth="3" strokeLinecap="round" fill="none" />
        )}

        <defs>
          <linearGradient id="frogBodyGrad" x1="60" y1="38" x2="60" y2="94" gradientUnits="userSpaceOnUse">
            <stop stopColor="#4ade80" />
            <stop offset="0.6" stopColor="#22c55e" />
            <stop offset="1" stopColor="#16a34a" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

function LilyPad({
  optionLetter,
  text,
  isSelected,
  isCorrectOption,
  hasAnswered,
  status,
  onClick,
  disabled,
  leafRef,
}: {
  optionLetter: string;
  text: string;
  isSelected: boolean;
  isCorrectOption: boolean;
  hasAnswered: boolean;
  status: FrogStatus;
  onClick: () => void;
  disabled: boolean;
  leafRef: (el: HTMLDivElement | null) => void;
}) {
  const isTargetSunk = isSelected && (status === 'sinking' || status === 'sunken');
  const isTargetSafe = isSelected && status === 'success';
  const showAsRightAnswer = hasAnswered && isCorrectOption;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={`Option ${optionLetter}: ${text}`}
      className={`group relative flex w-full min-w-0 cursor-pointer flex-col items-center justify-start rounded-3xl text-center transition-all duration-300 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-300 disabled:cursor-not-allowed ${
        disabled && !isSelected ? 'opacity-85' : 'hover:-translate-y-1'
      }`}
    >
      <div ref={leafRef} className="relative flex h-24 w-24 items-center justify-center sm:h-36 sm:w-36">
        {isSelected && (
          <div
            className={`absolute inset-0 animate-[ping_0.9s_cubic-bezier(0,0,0.2,1)_2] rounded-full opacity-60 ${
              isTargetSafe
                ? 'border-4 border-emerald-400 bg-emerald-400/20'
                : 'border-4 border-rose-500 bg-rose-500/20'
            }`}
          />
        )}

        {isTargetSunk && (
          <div className="pointer-events-none absolute -top-4 flex animate-bounce items-center gap-1 text-xl">
            <span>🫧</span>
            <span>💧</span>
            <span>🫧</span>
          </div>
        )}

        {isTargetSafe && (
          <div className="pointer-events-none absolute -top-5 flex animate-pulse items-center gap-2 text-2xl">
            <span>✨</span>
            <span>🌟</span>
            <span>✨</span>
          </div>
        )}

        <div
          className={`relative h-full w-full transition-all duration-500 ${
            isTargetSunk
              ? 'translate-y-4 rotate-12 scale-75 opacity-50 blur-[0.6px]'
              : isTargetSafe
                ? 'scale-105 drop-shadow-[0_12px_24px_rgba(16,185,129,0.45)]'
                : 'group-hover:scale-105'
          }`}
        >
          <svg viewBox="0 0 160 160" className="h-full w-full drop-shadow-[0_10px_20px_rgba(0,0,0,0.4)]">
            <ellipse cx="80" cy="88" rx="68" ry="60" fill="rgba(3, 30, 24, 0.55)" />
            <path
              d="M 80 80 L 140 105 A 70 64 0 1 0 148 58 Z"
              fill={`url(#lilyGrad-${optionLetter})`}
              stroke={showAsRightAnswer ? '#34d399' : isTargetSunk ? '#f43f5e' : '#15803d'}
              strokeWidth={showAsRightAnswer || isTargetSunk ? '4' : '2.5'}
            />
            <path
              d="M 80 80 Q 50 60 25 50 M 80 80 Q 40 85 20 95 M 80 80 Q 55 110 38 128 M 80 80 Q 80 120 78 144 M 80 80 Q 110 125 125 130 M 80 80 Q 100 50 115 30 M 80 80 Q 75 40 70 20"
              stroke="#166534"
              strokeWidth="1.5"
              opacity="0.5"
              fill="none"
              strokeLinecap="round"
            />
            <g transform="translate(118, 52) scale(0.65)">
              <circle cx="0" cy="0" r="10" fill="#f43f5e" opacity="0.9" />
              <circle cx="-5" cy="-5" r="7" fill="#fb7185" />
              <circle cx="5" cy="-5" r="7" fill="#fb7185" />
              <circle cx="0" cy="6" r="7" fill="#fb7185" />
              <circle cx="0" cy="0" r="5" fill="#fef08a" />
            </g>
            <ellipse cx="62" cy="64" rx="4" ry="2.5" fill="#ffffff" opacity="0.65" />
            <defs>
              <radialGradient id={`lilyGrad-${optionLetter}`} cx="45%" cy="45%" r="65%">
                <stop offset="0%" stopColor="#4ade80" />
                <stop offset="50%" stopColor="#16a34a" />
                <stop offset="100%" stopColor="#14532d" />
              </radialGradient>
            </defs>
          </svg>

          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full text-base font-black shadow-md transition-all sm:h-9 sm:w-9 sm:text-lg ${
                showAsRightAnswer
                  ? 'scale-110 bg-emerald-400 text-emerald-950 ring-4 ring-emerald-300 ring-offset-2 ring-offset-emerald-900'
                  : isTargetSunk
                    ? 'scale-95 bg-rose-500 text-white ring-4 ring-rose-400'
                    : 'bg-white/90 text-emerald-950 group-hover:scale-110 group-hover:bg-amber-300'
              }`}
            >
              {optionLetter}
            </span>
          </div>
        </div>
      </div>

      <div
        className={`mt-2 w-full max-w-[210px] break-words rounded-2xl p-2 text-[11px] font-semibold shadow-lg backdrop-blur-md transition-all duration-300 sm:p-4 sm:text-sm ${
          showAsRightAnswer
            ? 'border-2 border-emerald-400 bg-emerald-900/90 text-emerald-100 shadow-emerald-500/30'
            : isTargetSunk
              ? 'border-2 border-rose-500 bg-rose-950/85 text-rose-200 line-through opacity-85'
              : 'border border-emerald-700/50 bg-slate-900/80 text-white group-hover:border-emerald-400 group-hover:bg-slate-900/95 group-hover:shadow-emerald-500/20'
        }`}
      >
        <p className="leading-snug">{text}</p>
        {showAsRightAnswer && (
          <span className="mt-1.5 inline-block text-[10px] font-black uppercase tracking-wider text-emerald-300 sm:text-[11px]">
            ✓ Correct
          </span>
        )}
        {isTargetSunk && (
          <span className="mt-1.5 inline-block text-[10px] font-black uppercase tracking-wider text-rose-300 sm:text-[11px]">
            ✗ Sunk
          </span>
        )}
      </div>
    </button>
  );
}

export default function InfinitivesandGerundsGame() {
  const [questions, setQuestions] = useState<InfinitiveGerundQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [lastDelta, setLastDelta] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [missed, setMissed] = useState<InfinitiveGerundQuestion[]>([]);
  const [bestScore, setBestScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState(0);

  const [frogStatus, setFrogStatus] = useState<FrogStatus>('idle');
  const [frogLeafIndex, setFrogLeafIndex] = useState<number | null>(null);
  const [frogPos, setFrogPos] = useState<{ x: number; y: number } | null>(null);
  const [frogAnimated, setFrogAnimated] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const pondRef = useRef<HTMLDivElement | null>(null);
  const rockRef = useRef<HTMLDivElement | null>(null);
  const leafRefs = useRef<(HTMLDivElement | null)[]>([]);
  const hopRef = useRef<HTMLDivElement | null>(null);
  const nextButtonRef = useRef<HTMLButtonElement | null>(null);
  const timeoutsRef = useRef<number[]>([]);

  const later = useCallback((fn: () => void, ms: number) => {
    timeoutsRef.current.push(window.setTimeout(fn, ms));
  }, []);

  const clearTimers = useCallback(() => {
    timeoutsRef.current.forEach((id) => window.clearTimeout(id));
    timeoutsRef.current = [];
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const initGame = useCallback(() => {
    clearTimers();
    setQuestions(generateRandomizedQuiz());
    setCurrentIndex(0);
    setScore(0);
    setLastDelta(0);
    setMistakes(0);
    setMissed([]);
    setCombo(0);
    setIsGameOver(false);
    setFrogStatus('idle');
    setFrogLeafIndex(null);
    setFrogPos(null);
    setFrogAnimated(false);
    setShowExplanation(false);
    setIsAnimating(false);
    setSecondsElapsed(0);
  }, [clearTimers]);

  useEffect(() => {
    const timer = window.setTimeout(() => setQuestions(generateRandomizedQuiz()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isGameOver || questions.length === 0) return;
    const interval = window.setInterval(() => setSecondsElapsed((sec) => sec + 1), 1000);
    return () => window.clearInterval(interval);
  }, [isGameOver, questions.length]);

  const measureFrog = useCallback(() => {
    const pond = pondRef.current;
    if (!pond) return;
    const target = frogLeafIndex === null ? rockRef.current : leafRefs.current[frogLeafIndex];
    if (!target) return;

    const p = pond.getBoundingClientRect();
    const r = target.getBoundingClientRect();
    setFrogPos({
      x: r.left - p.left + r.width / 2,
      y: r.top - p.top + (frogLeafIndex === null ? 6 : r.height * 0.58),
    });
  }, [frogLeafIndex]);

  useEffect(() => {
    measureFrog();
  }, [measureFrog, questions, currentIndex, showExplanation, isGameOver]);

  useEffect(() => {
    window.addEventListener('resize', measureFrog);
    return () => window.removeEventListener('resize', measureFrog);
  }, [measureFrog]);

  useEffect(() => {
    if (!frogPos || frogAnimated) return;
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setFrogAnimated(true)));
    return () => cancelAnimationFrame(id);
  }, [frogPos, frogAnimated]);

  useEffect(() => {
    hopRef.current?.animate(
      [
        { transform: 'translateY(0) scale(1, 1)', offset: 0 },
        { transform: 'translateY(-70px) scale(0.94, 1.08)', offset: 0.5 },
        { transform: 'translateY(0) scale(1.08, 0.92)', offset: 0.9 },
        { transform: 'translateY(0) scale(1, 1)', offset: 1 },
      ],
      { duration: JUMP_MS, easing: 'ease-out' },
    );
  }, [frogLeafIndex]);

  useEffect(() => {
    if (showExplanation) nextButtonRef.current?.focus({ preventScroll: true });
  }, [showExplanation]);

  const currentQ = questions[currentIndex];

  const handleSelectOption = (optionIndex: number) => {
    if (isAnimating || showExplanation || !currentQ) return;

    setIsAnimating(true);
    const isCorrect = currentQ.options[optionIndex].isCorrect;

    setFrogStatus('jumping');
    setFrogLeafIndex(optionIndex);
    sfx.jump();

    later(() => {
      if (isCorrect) {
        setFrogStatus('success');
        sfx.correct();
        setScore((prev) => prev + CORRECT_POINTS);
        setLastDelta(CORRECT_POINTS);
        setCombo((c) => c + 1);
      } else {
        setFrogStatus('sinking');
        sfx.splash();
        setScore((prev) => Math.max(0, prev - MISTAKE_PENALTY));
        setLastDelta(-Math.min(score, MISTAKE_PENALTY));
        setMistakes((m) => m + 1);
        setMissed((prev) => [...prev, currentQ]);
        setCombo(0);
        later(() => setFrogStatus('sunken'), 500);
      }
      setShowExplanation(true);
      setIsAnimating(false);
    }, JUMP_MS);
  };

  const handleNextQuestion = () => {
    clearTimers();

    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((idx) => idx + 1);
      setFrogStatus('idle');
      setFrogLeafIndex(null);
      setShowExplanation(false);
      setIsAnimating(false);
      return;
    }

    setBestScore((prev) => Math.max(prev, score));
    setIsGameOver(true);
    sfx.victory();
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isGameOver || e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;

      if (showExplanation) {
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          handleNextQuestion();
        }
        return;
      }
      if (isAnimating) return;

      const key = e.key.toLowerCase();
      if (key === '1' || key === 'a') handleSelectOption(0);
      else if (key === '2' || key === 'b') handleSelectOption(1);
      else if (key === '3' || key === 'c') handleSelectOption(2);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  if (questions.length === 0) {
    return (
      <GameShell
        title="Infinitives & Gerunds: Frog Jump"
        subtitle="Pond Challenge • Random questions"
        current={0}
        total={1}
        score={0}
        elapsedSeconds={0}
        progressLabel="PROGRESS"
        contentClassName="bg-white"
      >
        <div className="flex min-h-[400px] items-center justify-center p-12 text-center">
          <p className="animate-pulse text-lg font-bold text-slate-600">
            Loading the Infinitives and Gerunds pond... 🐸
          </p>
        </div>
      </GameShell>
    );
  }

  const accuracy = Math.round(((questions.length - mistakes) / questions.length) * 100);
  const kbd = 'rounded border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-[11px] font-bold shadow-xs';

  return (
    <GameShell
      title="Infinitives & Gerunds: Frog Jump"
      subtitle="Pond Challenge • Random questions"
      current={currentIndex + 1}
      total={questions.length}
      score={score}
      elapsedSeconds={secondsElapsed}
      progressLabel="PROGRESS"
      className="shadow-2xl shadow-emerald-950/10"
      contentClassName="bg-white"
      footer={
        <>
          <div className="hidden flex-wrap items-center gap-2 sm:flex">
            <span className="font-semibold text-slate-700">Quick keyboard:</span>
            <kbd className={kbd}>1</kbd>
            <kbd className={kbd}>2</kbd>
            <kbd className={kbd}>3</kbd>
            <span>or</span>
            <kbd className={kbd}>A</kbd>
            <kbd className={kbd}>B</kbd>
            <kbd className={kbd}>C</kbd>
            <span>to jump,</span>
            <kbd className={kbd}>Enter</kbd>
            <span>to continue</span>
          </div>

          <div className="font-semibold text-emerald-700">
            Correct: <span className="font-extrabold text-emerald-800">+{CORRECT_POINTS} pts</span> · Sink:{' '}
            <span className="font-extrabold text-rose-600">-{MISTAKE_PENALTY} pts</span>
          </div>
        </>
      }
    >
      {!isGameOver ? (
        <section className="relative overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-800 via-teal-700 to-cyan-800 px-5 py-3 text-white sm:px-8">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-extrabold uppercase tracking-wide sm:text-sm">
              <div className="flex items-center gap-4">
                <span>
                  Question {currentIndex + 1} of {questions.length}
                </span>
                <span className="text-emerald-300">|</span>
                <span>Sinks: {mistakes}</span>
              </div>

              <div className="flex items-center gap-4">
                {combo > 1 && (
                  <span className="animate-bounce rounded-full bg-amber-400 px-2.5 py-0.5 text-xs font-black uppercase text-amber-950">
                    🔥 {combo}x streak
                  </span>
                )}
                <span className="font-mono text-cyan-200">⏱ {formatTime(secondsElapsed)}</span>
                {bestScore > 0 && <span className="hidden sm:inline">Best: {bestScore} pts</span>}
              </div>
            </div>

            <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-black/25">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-300 to-cyan-300 transition-all duration-500"
                style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>

          <div
            ref={pondRef}
            className="relative flex min-h-[600px] flex-col justify-between overflow-hidden bg-gradient-to-b from-[#031d16] via-[#052b21] to-[#01140e] p-4 sm:min-h-[640px] sm:p-8"
          >
            <div className="pointer-events-none absolute inset-0 opacity-20">
              <div className="absolute left-0 top-0 h-full w-full bg-[radial-gradient(#34d399_1px,transparent_1px)] [background-size:24px_24px]" />
            </div>

            <div className="pointer-events-none absolute left-6 top-6 animate-pulse select-none text-2xl opacity-30">🪷</div>
            <div className="pointer-events-none absolute right-10 top-12 animate-pulse select-none text-3xl opacity-30">🪷</div>
            <div className="pointer-events-none absolute bottom-8 left-12 select-none text-2xl opacity-25">🌿</div>
            <div className="pointer-events-none absolute bottom-10 right-14 select-none text-2xl opacity-25">🌿</div>

            <div className="relative z-10 mx-auto w-full max-w-2xl rounded-3xl border border-emerald-500/20 bg-slate-950/70 p-5 text-center shadow-xl shadow-emerald-950/40 backdrop-blur-xl sm:p-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-800/60 bg-emerald-950/80 px-3.5 py-1 text-xs font-extrabold uppercase tracking-widest text-emerald-400">
                <span>🎯</span> {currentQ.category}
              </div>
              <h3 className="mt-3 text-lg font-black leading-snug text-white sm:text-2xl">{currentQ.question}</h3>
              <p className="mt-2 text-xs text-emerald-200/70 sm:text-sm">Click the correct lily pad so the frog can jump!</p>
            </div>

            <div className="relative z-10 my-4 grid grid-cols-3 items-start justify-items-center gap-2 sm:gap-6">
              {currentQ.options.map((option, index) => {
                const isTarget = frogLeafIndex === index;
                return (
                  <LilyPad
                    key={`${currentIndex}-${option.text}`}
                    optionLetter={String.fromCharCode(65 + index)}
                    text={option.text}
                    isSelected={isTarget}
                    isCorrectOption={option.isCorrect}
                    hasAnswered={showExplanation}
                    status={isTarget ? frogStatus : 'idle'}
                    onClick={() => handleSelectOption(index)}
                    disabled={isAnimating || showExplanation}
                    leafRef={(el) => {
                      leafRefs.current[index] = el;
                    }}
                  />
                );
              })}
            </div>

            <div className="relative z-10 mx-auto mt-2 flex min-h-[150px] w-full max-w-2xl items-end justify-center">
              {showExplanation ? (
                <div
                  role="status"
                  className="w-full animate-[score-pop_0.35s_ease-out] rounded-2xl border border-emerald-400/40 bg-slate-950/90 p-4 shadow-2xl backdrop-blur-md sm:p-5"
                >
                  <div className="flex flex-col items-center justify-between gap-3 text-left sm:flex-row">
                    <div>
                      <span
                        className={`inline-block rounded-md px-2 py-0.5 text-xs font-black uppercase tracking-wider ${
                          frogStatus === 'success'
                            ? 'bg-emerald-400/20 text-emerald-300'
                            : 'bg-rose-400/20 text-rose-300'
                        }`}
                      >
                        {frogStatus === 'success' ? '✓ Excellent jump!' : '✗ The lily pad sank!'}
                        {lastDelta !== 0 && ` ${lastDelta > 0 ? '+' : ''}${lastDelta} pts`}
                      </span>
                      <p className="mt-1 text-xs leading-relaxed text-slate-200 sm:text-sm">{currentQ.explanation}</p>
                    </div>

                    <button
                      ref={nextButtonRef}
                      type="button"
                      onClick={handleNextQuestion}
                      className="w-full shrink-0 cursor-pointer rounded-full bg-emerald-400 px-6 py-2.5 text-sm font-extrabold text-emerald-950 shadow-lg shadow-emerald-400/30 transition hover:scale-105 hover:bg-emerald-300 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-white active:scale-95 sm:w-auto"
                    >
                      {currentIndex + 1 < questions.length ? 'Next question →' : 'View results 🏆'}
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  ref={rockRef}
                  className="flex h-7 w-28 items-center justify-center rounded-full border-t-2 border-emerald-600/40 bg-gradient-to-r from-emerald-900 via-stone-700 to-emerald-950 shadow-[0_10px_20px_rgba(0,0,0,0.6)] sm:w-36"
                >
                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-300/60">Starting rock</span>
                </div>
              )}
            </div>

            {frogPos && (
              <div
                className="pointer-events-none absolute left-0 top-0 z-20"
                style={{
                  transform: `translate(${frogPos.x}px, ${frogPos.y}px)`,
                  transition: frogAnimated ? `transform ${JUMP_MS}ms cubic-bezier(0.45, 0, 0.25, 1)` : 'none',
                  opacity: frogAnimated ? 1 : 0,
                }}
              >
                <div className="-translate-x-1/2 -translate-y-[88%]">
                  <div ref={hopRef}>
                    <div className={frogStatus === 'idle' && frogAnimated ? 'animate-[bounce_3s_infinite_ease-in-out]' : ''}>
                      <FrogCharacter status={frogStatus} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      ) : (
        <GameSummary
          title="Infinitives & Gerunds Master"
          description="The frog crossed the pond and mastered every grammar question!"
          score={score}
          time={secondsElapsed}
          accuracy={accuracy}
          mistakes={mistakes}
          bestScore={bestScore}
          onRestart={initGame}
          restartLabel="Play again (Random questions)"
        >
          {missed.length > 0 && (
            <div className="mb-6 rounded-2xl border border-rose-500/30 bg-rose-950/30 p-5 text-left backdrop-blur-md">
              <h4 className="flex items-center gap-2 font-extrabold text-rose-300">
                <span>🔁</span> Review your sinks
              </h4>
              <ul className="mt-3 space-y-4">
                {missed.map((q) => (
                  <li key={q.question} className="text-xs text-emerald-100 sm:text-sm">
                    <p className="font-bold">{q.question}</p>
                    <p className="mt-1 font-semibold text-emerald-300">
                      ✓ {q.options.find((option) => option.isCorrect)?.text}
                    </p>
                    <p className="mt-0.5 leading-relaxed text-emerald-200/70">{q.explanation}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/60 p-5 text-left text-sm text-emerald-100 backdrop-blur-md">
            <h4 className="flex items-center gap-2 font-extrabold text-emerald-300">
              <span>🌿</span> Key Grammar Rules Summary:
            </h4>
            <ul className="mt-2 list-inside list-disc space-y-1.5 text-xs text-emerald-200/90 sm:text-sm">
              <li>
                <strong>Verbs of liking (enjoy, like):</strong> use a gerund (-ing).
              </li>
              <li>
                <strong>Decision / commitment verbs (decide, promise):</strong> use an infinitive (to + verb).
              </li>
              <li>
                <strong>Prepositions (good at, interested in):</strong> are always followed by a gerund (-ing).
              </li>
              <li>
                <strong>Stop to do vs. Stop doing:</strong> <em>stop to check</em> (pause to do something) vs.{' '}
                <em>stop smoking</em> (quit the habit).
              </li>
              <li>
                <strong>Remember to do:</strong> recordar hacer una tarea pendiente o futura.
              </li>
            </ul>
          </div>
        </GameSummary>
      )}
    </GameShell>
  );
}
