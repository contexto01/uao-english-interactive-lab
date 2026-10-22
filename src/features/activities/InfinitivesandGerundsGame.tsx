'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  generateRandomizedQuiz,
  InfinitiveGerundQuestion,
} from './data/infinitivesGerunds';

const CORRECT_POINTS = 10;
const MISTAKE_PENALTY = 5;

type FrogStatus =
  | 'idle' // Waiting on rock
  | 'jumping' // In mid-air towards leaf
  | 'success' // Landed safely on leaf, happy
  | 'sinking' // Wrong leaf, sinking into water
  | 'sunken'; // Underwater with bubbles

/**
 * Procedural Audio Synthesizer using Web Audio API
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

  jump() {
    const ctx = this.getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(540, now + 0.18);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  success() {
    const ctx = this.getContext();
    if (!ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime + idx * 0.08;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.3);
    });
  }

  splash() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Low pitch drop (water glug)
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.35);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.38);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.4);

    // Filtered noise for splash spray
    try {
      const bufferSize = ctx.sampleRate * 0.25;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(800, now);
      filter.Q.setValueAtTime(1.5, now);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.18, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.005, now + 0.25);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(ctx.destination);

      noise.start(now);
      noise.stop(now + 0.25);
    } catch {
      // Ignore audio buffer issues if unsupported
    }
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

      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + note.d);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + note.d + 0.05);
      offset += note.d * 0.9;
    });
  }
}

const sfx = new SoundEffects();

/**
 * Stylized Cute SVG Frog with Dynamic States
 */
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
          ? 'scale-90 opacity-40 translate-y-6 filter blur-[0.5px]'
          : isHappy
          ? 'scale-110 -translate-y-2'
          : 'scale-100'
      }`}
    >
      <svg
        viewBox="0 0 120 110"
        className="h-20 w-20 drop-shadow-[0_8px_16px_rgba(0,0,0,0.35)] sm:h-24 sm:w-24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Shadow under frog (only if not sinking) */}
        {!isSinking && (
          <ellipse cx="60" cy="100" rx="36" ry="7" fill="rgba(6, 44, 30, 0.45)" />
        )}

        {/* Back Legs */}
        <ellipse
          cx="28"
          cy="78"
          rx="18"
          ry="14"
          fill="#16a34a"
          transform="rotate(-20 28 78)"
          stroke="#14532d"
          strokeWidth="2.5"
        />
        <ellipse
          cx="92"
          cy="78"
          rx="18"
          ry="14"
          fill="#16a34a"
          transform="rotate(20 92 78)"
          stroke="#14532d"
          strokeWidth="2.5"
        />

        {/* Webbed Feet Back */}
        <path
          d="M12 90 C 10 95, 20 98, 28 92 C 34 98, 42 94, 38 88"
          fill="#22c55e"
          stroke="#14532d"
          strokeWidth="2"
        />
        <path
          d="M108 90 C 110 95, 100 98, 92 92 C 86 98, 78 94, 82 88"
          fill="#22c55e"
          stroke="#14532d"
          strokeWidth="2"
        />

        {/* Main Body */}
        <ellipse
          cx="60"
          cy="66"
          rx="34"
          ry="28"
          fill="url(#frogBodyGrad)"
          stroke="#14532d"
          strokeWidth="3"
        />

        {/* Belly (Cream/Yellowish) */}
        <ellipse cx="60" cy="72" rx="22" ry="17" fill="#fef08a" opacity="0.9" />

        {/* Spots on back */}
        <circle cx="44" cy="56" r="3.5" fill="#15803d" opacity="0.6" />
        <circle cx="76" cy="58" r="3" fill="#15803d" opacity="0.6" />
        <circle cx="60" cy="48" r="2.5" fill="#15803d" opacity="0.6" />

        {/* Front Arms / Paws */}
        {isHappy ? (
          // Joyful arms raised!
          <>
            <path
              d="M38 65 Q 24 50 20 38"
              stroke="#16a34a"
              strokeWidth="6"
              strokeLinecap="round"
            />
            <circle cx="19" cy="36" r="5" fill="#22c55e" stroke="#14532d" strokeWidth="2" />
            <path
              d="M82 65 Q 96 50 100 38"
              stroke="#16a34a"
              strokeWidth="6"
              strokeLinecap="round"
            />
            <circle cx="101" cy="36" r="5" fill="#22c55e" stroke="#14532d" strokeWidth="2" />
          </>
        ) : (
          // Resting paws
          <>
            <path
              d="M42 74 Q 40 88 44 94"
              stroke="#16a34a"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <circle cx="44" cy="94" r="4.5" fill="#22c55e" stroke="#14532d" strokeWidth="2" />
            <path
              d="M78 74 Q 80 88 76 94"
              stroke="#16a34a"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <circle cx="76" cy="94" r="4.5" fill="#22c55e" stroke="#14532d" strokeWidth="2" />
          </>
        )}

        {/* Eye Bulges */}
        <circle cx="42" cy="38" r="15" fill="#22c55e" stroke="#14532d" strokeWidth="3" />
        <circle cx="78" cy="38" r="15" fill="#22c55e" stroke="#14532d" strokeWidth="3" />

        {/* Eyes Content based on state */}
        {isSinking ? (
          // Dizzy / Swirly Eyes when sinking
          <>
            <circle cx="42" cy="38" r="11" fill="#fef08a" />
            <path
              d="M36 38 Q 42 32 48 38 Q 42 44 38 40"
              stroke="#854d0e"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />
            <circle cx="78" cy="38" r="11" fill="#fef08a" />
            <path
              d="M72 38 Q 78 32 84 38 Q 78 44 74 40"
              stroke="#854d0e"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />
          </>
        ) : isHappy ? (
          // Starry / joyful closed-arc eyes (^_^)
          <>
            <circle cx="42" cy="38" r="11" fill="#ffffff" />
            <path
              d="M35 39 Q 42 31 49 39"
              stroke="#14532d"
              strokeWidth="3.5"
              strokeLinecap="round"
              fill="none"
            />
            <circle cx="78" cy="38" r="11" fill="#ffffff" />
            <path
              d="M71 39 Q 78 31 85 39"
              stroke="#14532d"
              strokeWidth="3.5"
              strokeLinecap="round"
              fill="none"
            />
          </>
        ) : (
          // Regular big alert cartoon eyes
          <>
            <circle cx="42" cy="38" r="11" fill="#ffffff" />
            <circle cx="43" cy="37" r="6" fill="#0f172a" />
            <circle cx="45" cy="34" r="2.5" fill="#ffffff" />

            <circle cx="78" cy="38" r="11" fill="#ffffff" />
            <circle cx="77" cy="37" r="6" fill="#0f172a" />
            <circle cx="79" cy="34" r="2.5" fill="#ffffff" />
          </>
        )}

        {/* Rosy Cheeks */}
        <ellipse cx="33" cy="56" rx="5" ry="3" fill="#fb7185" opacity="0.65" />
        <ellipse cx="87" cy="56" rx="5" ry="3" fill="#fb7185" opacity="0.65" />

        {/* Mouth */}
        {isSinking ? (
          // Wobbly sad mouth
          <path
            d="M50 63 Q 60 55 70 63"
            stroke="#14532d"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
        ) : isHappy ? (
          // Big joyful open smile!
          <>
            <path
              d="M48 57 Q 60 74 72 57 Z"
              fill="#be123c"
              stroke="#14532d"
              strokeWidth="2.5"
            />
            <ellipse cx="60" cy="64" rx="6" ry="3" fill="#f43f5e" />
          </>
        ) : (
          // Sweet gentle smile
          <path
            d="M48 58 Q 60 67 72 58"
            stroke="#14532d"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
        )}

        {/* Gradients */}
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

/**
 * Beautiful Lily Pad component with authentic slit notch & veining
 */
function LilyPad({
  optionLetter,
  text,
  isSelected,
  isCorrectOption,
  hasAnswered,
  status,
  onClick,
  disabled,
}: {
  optionLetter: 'A' | 'B' | 'C';
  text: string;
  isSelected: boolean;
  isCorrectOption: boolean;
  hasAnswered: boolean;
  status: FrogStatus;
  onClick: () => void;
  disabled: boolean;
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
      className={`group relative flex flex-col items-center justify-start text-center transition-all duration-300 focus:outline-hidden disabled:cursor-not-allowed ${
        disabled && !isSelected ? 'opacity-85' : 'hover:-translate-y-1'
      }`}
    >
      {/* Lily Pad Leaf Floating Area */}
      <div className="relative flex h-28 w-28 items-center justify-center sm:h-36 sm:w-36">
        {/* Dynamic Frog sitting or sinking on this Lily Pad */}
        {isSelected && status !== 'idle' && (
          <div className="pointer-events-none absolute -top-10 sm:-top-14 z-20 transition-all duration-300">
            <FrogCharacter status={status} />
          </div>
        )}

        {/* Water Ring Ripple effect when landed or sunk */}
        {isSelected && (
          <div
            className={`absolute inset-0 rounded-full animate-ping opacity-60 ${
              isTargetSafe
                ? 'border-4 border-emerald-400 bg-emerald-400/20'
                : 'border-4 border-rose-500 bg-rose-500/20'
            }`}
          />
        )}

        {/* Water Splash Bubbles when sinking */}
        {isTargetSunk && (
          <div className="pointer-events-none absolute -top-4 flex items-center gap-1 text-xl animate-bounce">
            <span>🫧</span>
            <span>💧</span>
            <span>🫧</span>
          </div>
        )}

        {/* Success Sparkles */}
        {isTargetSafe && (
          <div className="pointer-events-none absolute -top-5 flex items-center gap-2 text-2xl animate-pulse">
            <span>✨</span>
            <span>🌟</span>
            <span>✨</span>
          </div>
        )}

        {/* Lily Pad SVG */}
        <div
          className={`relative h-full w-full transition-all duration-500 ${
            isTargetSunk
              ? 'scale-75 translate-y-4 opacity-50 rotate-12 filter blur-[0.6px]'
              : isTargetSafe
              ? 'scale-105 filter drop-shadow-[0_12px_24px_rgba(16,185,129,0.45)]'
              : 'group-hover:scale-105'
          }`}
        >
          <svg viewBox="0 0 160 160" className="h-full w-full drop-shadow-[0_10px_20px_rgba(0,0,0,0.4)]">
            {/* Soft water shadow under leaf */}
            <ellipse cx="80" cy="88" rx="68" ry="60" fill="rgba(3, 30, 24, 0.55)" />

            {/* Lily Pad with V-notch */}
            <path
              d="M 80 80 L 140 105 A 70 64 0 1 0 148 58 Z"
              fill="url(#lilyGrad)"
              stroke={
                showAsRightAnswer
                  ? '#34d399'
                  : isTargetSunk
                  ? '#f43f5e'
                  : '#15803d'
              }
              strokeWidth={showAsRightAnswer || isTargetSunk ? '4' : '2.5'}
            />

            {/* Veins */}
            <path
              d="M 80 80 Q 50 60 25 50 M 80 80 Q 40 85 20 95 M 80 80 Q 55 110 38 128 M 80 80 Q 80 120 78 144 M 80 80 Q 110 125 125 130 M 80 80 Q 100 50 115 30 M 80 80 Q 75 40 70 20"
              stroke="#166534"
              strokeWidth="1.5"
              opacity="0.5"
              fill="none"
              strokeLinecap="round"
            />

            {/* Little pink water lily flower on the edge of the leaf */}
            <g transform="translate(118, 52) scale(0.65)">
              <circle cx="0" cy="0" r="10" fill="#f43f5e" opacity="0.9" />
              <circle cx="-5" cy="-5" r="7" fill="#fb7185" />
              <circle cx="5" cy="-5" r="7" fill="#fb7185" />
              <circle cx="0" cy="6" r="7" fill="#fb7185" />
              <circle cx="0" cy="0" r="5" fill="#fef08a" />
            </g>

            {/* Dew drop */}
            <ellipse cx="62" cy="64" rx="4" ry="2.5" fill="#ffffff" opacity="0.65" />

            <defs>
              <radialGradient id="lilyGrad" cx="45%" cy="45%" r="65%">
                <stop offset="0%" stopColor="#4ade80" />
                <stop offset="50%" stopColor="#16a34a" />
                <stop offset="100%" stopColor="#14532d" />
              </radialGradient>
            </defs>
          </svg>

          {/* Letter Badge (A, B, or C) centered in the leaf */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span
              className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full text-base sm:text-lg font-black shadow-md transition-all ${
                showAsRightAnswer
                  ? 'bg-emerald-400 text-emerald-950 ring-4 ring-emerald-300 ring-offset-2 ring-offset-emerald-900 scale-110'
                  : isTargetSunk
                  ? 'bg-rose-500 text-white ring-4 ring-rose-400 scale-95'
                  : 'bg-white/90 text-emerald-950 group-hover:scale-110 group-hover:bg-amber-300'
              }`}
            >
              {optionLetter}
            </span>
          </div>
        </div>
      </div>

      {/* Option Text Card */}
      <div
        className={`mt-2 max-w-[170px] sm:max-w-[210px] rounded-2xl p-3 sm:p-4 text-xs sm:text-sm font-semibold transition-all duration-300 backdrop-blur-md shadow-lg ${
          showAsRightAnswer
            ? 'border-2 border-emerald-400 bg-emerald-900/90 text-emerald-100 shadow-emerald-500/30'
            : isTargetSunk
            ? 'border-2 border-rose-500 bg-rose-950/85 text-rose-200 line-through opacity-85'
            : 'border border-emerald-700/50 bg-slate-900/80 text-white hover:border-emerald-400 hover:bg-slate-900/95 group-hover:shadow-emerald-500/20'
        }`}
      >
        <p className="leading-snug">{text}</p>
        {showAsRightAnswer && (
          <span className="mt-1.5 inline-block text-[11px] font-black uppercase tracking-wider text-emerald-300">
             ✓ Correct
          </span>
        )}
        {isTargetSunk && (
          <span className="mt-1.5 inline-block text-[11px] font-black uppercase tracking-wider text-rose-300">
             ✗ Sunk
          </span>
        )}
      </div>
    </button>
  );
}

export default function InfinitivesandGerundsGame() {
  const [questions, setQuestions] = useState<InfinitiveGerundQuestion[]>(() =>
    generateRandomizedQuiz()
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isSoundMuted, setIsSoundMuted] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState(0);

  // Frog state & animation
  const [frogStatus, setFrogStatus] = useState<FrogStatus>('idle');
  const [frogLeafIndex, setFrogLeafIndex] = useState<number | null>(null); // null = on starting rock, 0/1/2 = on leaf
  const [floatingScore, setFloatingScore] = useState<{ text: string; positive: boolean } | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Initialize and randomize game
  const initGame = useCallback(() => {
    const randomized = generateRandomizedQuiz();
    setQuestions(randomized);
    setCurrentIndex(0);
    setScore(0);
    setMistakes(0);
    setCombo(0);
    setIsGameOver(false);
    setFrogStatus('idle');
    setFrogLeafIndex(null);
    setShowExplanation(false);
    setFloatingScore(null);
    setIsAnimating(false);
    setSecondsElapsed(0);
  }, []);

  // Start with a clean session; progress is not persisted during testing.
  useEffect(() => {
    setBestScore(0);
  }, []);

  // Audio toggle sync
  useEffect(() => {
    sfx.enabled = !isSoundMuted;
  }, [isSoundMuted]);

  // Timer loop
  useEffect(() => {
    if (isGameOver || questions.length === 0) return;
    const interval = setInterval(() => {
      setSecondsElapsed((sec) => sec + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isGameOver, questions.length]);

  const currentQ = questions[currentIndex];

  // Track the best score for the current session
  const updateBestScore = useCallback((newScore: number) => {
    setBestScore((prev) => {
      const highest = Math.max(prev, newScore);
      return highest;
    });
  }, []);

  // Handle jump selection
  const handleSelectOption = (optionIndex: number) => {
    if (isAnimating || showExplanation || !currentQ) return;

    setIsAnimating(true);
    const selectedOption = currentQ.options[optionIndex];
    const isCorrect = selectedOption.isCorrect;

    // 1. Jump phase
    setFrogStatus('jumping');
    setFrogLeafIndex(optionIndex);
    sfx.jump();

    // 2. Landing phase after jump flight time (450ms)
    setTimeout(() => {
      if (isCorrect) {
        // Frog stays safe on the leaf!
        setFrogStatus('success');
        sfx.success();
        const pointsAwarded = CORRECT_POINTS;
        setScore((prev) => {
          const next = prev + pointsAwarded;
          updateBestScore(next);
          return next;
        });
        setCombo((c) => c + 1);
        setFloatingScore({ text: `+${pointsAwarded} pts!`, positive: true });
        setShowExplanation(true);
      } else {
        // Frog sinks into water!
        setFrogStatus('sinking');
        sfx.splash();
        const penalty = MISTAKE_PENALTY;
        setScore((prev) => Math.max(0, prev - penalty));
        setMistakes((m) => m + 1);
        setCombo(0);
        setFloatingScore({ text: `-${penalty} pts`, positive: false });
        setShowExplanation(true);

        // Turn sunken after splash
        setTimeout(() => {
          setFrogStatus('sunken');
        }, 500);
      }
      setIsAnimating(false);
    }, 450);
  };

  // Move to next question or end game
  const handleNextQuestion = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((idx) => idx + 1);
      setFrogStatus('idle');
      setFrogLeafIndex(null);
      setShowExplanation(false);
      setFloatingScore(null);
      setIsAnimating(false);
    } else {
      // Victory / End of Quiz
      setIsGameOver(true);
      sfx.victory();
      updateBestScore(score);
    }
  };

  // Keyboard navigation: 1, 2, 3 or A, B, C or Space/Enter for Next
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isGameOver) return;
      if (showExplanation) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') {
          e.preventDefault();
          handleNextQuestion();
        }
        return;
      }
      if (isAnimating) return;

      if (e.key === '1' || e.key === 'a' || e.key === 'A') {
        handleSelectOption(0);
      } else if (e.key === '2' || e.key === 'b' || e.key === 'B') {
        handleSelectOption(1);
      } else if (e.key === '3' || e.key === 'c' || e.key === 'C') {
        handleSelectOption(2);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, '0');
    const secs = (totalSeconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  if (questions.length === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-[2rem] border border-slate-200 bg-white p-12 text-center">
        <p className="text-lg font-bold text-slate-600 animate-pulse">
           Loading the Infinitives and Gerunds pond... 🐸
        </p>
      </div>
    );
  }

  // Finished Screen
  if (isGameOver) {
    const accuracy = Math.round(
      (questions.length / Math.max(1, questions.length + mistakes)) * 100
    );
    return (
      <section className="relative overflow-hidden rounded-[2.5rem] border border-emerald-900/30 bg-gradient-to-b from-emerald-950 via-teal-950 to-slate-950 p-6 text-white shadow-2xl shadow-emerald-950/50 sm:p-12">
        <div className="mx-auto max-w-2xl text-center">
          {/* Celebratory Frog with Crown */}
          <div className="relative mx-auto flex h-32 w-32 items-center justify-center">
            <span className="absolute -top-3 text-4xl animate-bounce">👑</span>
            <FrogCharacter status="success" isCelebration={true} />
          </div>

          <p className="mt-4 text-xs font-black uppercase tracking-[0.25em] text-emerald-400">
             Mission complete!
          </p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl text-emerald-100">
            Infinitives & Gerunds Master
          </h2>
          <p className="mt-2 text-sm text-emerald-300/80">
             The frog crossed the pond and mastered every grammar question!
          </p>

          {/* Score Stats Grid */}
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
            <div className="rounded-2xl border border-emerald-800/40 bg-emerald-900/30 p-4 backdrop-blur-md">
               <span className="text-xs uppercase text-emerald-300/80 font-bold">Score</span>
              <p className="mt-1 text-3xl font-black text-amber-300">{score} pts</p>
            </div>
            <div className="rounded-2xl border border-emerald-800/40 bg-emerald-900/30 p-4 backdrop-blur-md">
               <span className="text-xs uppercase text-emerald-300/80 font-bold">Best</span>
              <p className="mt-1 text-3xl font-black text-emerald-300">{bestScore} pts</p>
            </div>
            <div className="rounded-2xl border border-emerald-800/40 bg-emerald-900/30 p-4 backdrop-blur-md">
               <span className="text-xs uppercase text-emerald-300/80 font-bold">Accuracy</span>
              <p className="mt-1 text-3xl font-black text-emerald-300">{accuracy}%</p>
            </div>
            <div className="rounded-2xl border border-emerald-800/40 bg-emerald-900/30 p-4 backdrop-blur-md">
               <span className="text-xs uppercase text-emerald-300/80 font-bold">Sinks</span>
              <p className="mt-1 text-3xl font-black text-rose-400">{mistakes}</p>
            </div>
            <div className="rounded-2xl border border-emerald-800/40 bg-emerald-900/30 p-4 backdrop-blur-md">
               <span className="text-xs uppercase text-emerald-300/80 font-bold">Time</span>
              <p className="mt-1 text-3xl font-black text-cyan-300">{formatTimer(secondsElapsed)}</p>
            </div>
          </div>

          {/* Feedback summary badge */}
          <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-950/60 p-5 text-left text-sm text-emerald-100 backdrop-blur-md">
            <h4 className="font-extrabold text-emerald-300 flex items-center gap-2">
               <span>🌿</span> Key Grammar Rules Summary:
            </h4>
            <ul className="mt-2 space-y-1.5 text-xs sm:text-sm text-emerald-200/90 list-disc list-inside">
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
                 <strong>Stop to do vs. Stop doing:</strong> <em>stop to check</em> (pause to do something) vs. <em>stop smoking</em> (quit the habit).
              </li>
              <li>
                <strong>Remember to do:</strong> recordar hacer una tarea pendiente o futura.
              </li>
            </ul>
          </div>

          {/* Actions */}
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={initGame}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500 px-8 py-3.5 text-base font-extrabold text-emerald-950 shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400 hover:scale-105 active:scale-95 cursor-pointer"
            >
               <span>🔄</span> Play again (Random questions)
            </button>
            <Link
              href="/#challenges"
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-full border border-emerald-700/50 bg-emerald-950/40 px-6 py-3.5 text-base font-bold text-emerald-200 transition hover:bg-emerald-900/60"
            >
               ← Back to the board
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white shadow-2xl shadow-emerald-950/10">
      {/* 1. Header with branding & score stats */}
      <div className="border-b border-slate-100 bg-white px-5 py-4 sm:px-8">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-black uppercase tracking-wider text-emerald-800">
                Pond Challenge 🐸
              </span>
               <span className="text-xs font-bold text-slate-400">• Random questions</span>
            </div>
            <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
               Infinitives & Gerunds: Frog Jump
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setIsSoundMuted((m) => !m)}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
               title={isSoundMuted ? 'Turn sound on' : 'Mute sound'}
            >
              <span>{isSoundMuted ? '🔇' : '🔊'}</span>
               <span>{isSoundMuted ? 'Muted' : 'Sound'}</span>
            </button>

            <button
              type="button"
              onClick={initGame}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
               title="Restart and shuffle questions"
            >
               <span>🔄</span> Restart
            </button>

            <div className="rounded-full bg-emerald-50 px-4 py-1.5 text-xs sm:text-sm font-extrabold text-emerald-800 ring-1 ring-emerald-200">
               Points: <span className="text-base sm:text-lg text-emerald-600">{score}</span> pts
            </div>
          </div>
        </div>
      </div>

      {/* 2. Status ribbon */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-700 to-cyan-800 px-5 py-3 text-white sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm font-extrabold uppercase tracking-wide">
          <div className="flex items-center gap-4">
            <span>
               Question {currentIndex + 1} of {questions.length}
            </span>
            <span className="text-emerald-300">|</span>
             <span>Sinks: {mistakes}</span>
          </div>

          <div className="flex items-center gap-4">
            {combo > 1 && (
              <span className="rounded-full bg-amber-400 px-2.5 py-0.5 text-xs font-black uppercase text-amber-950 animate-bounce">
                🔥 {combo}x Racha
              </span>
            )}
            <span className="font-mono text-cyan-200">⏱ {formatTimer(secondsElapsed)}</span>
             {bestScore > 0 && <span className="hidden sm:inline">Best: {bestScore} pts</span>}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-black/25">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-300 to-cyan-300 transition-all duration-500"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* 3. The Main Interactive Pond Environment */}
      <div className="relative min-h-[580px] sm:min-h-[620px] overflow-hidden bg-gradient-to-b from-[#031d16] via-[#052b21] to-[#01140e] p-4 sm:p-8 flex flex-col justify-between">
        {/* Animated Water Caustics / Ripple Shimmer Background */}
        <div className="pointer-events-none absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 h-full w-full bg-[radial-gradient(#34d399_1px,transparent_1px)] [background-size:24px_24px]" />
        </div>

        {/* Floating Water Lily Flowers in Background */}
        <div className="pointer-events-none absolute top-6 left-6 opacity-30 select-none text-2xl animate-pulse">
          🪷
        </div>
        <div className="pointer-events-none absolute top-12 right-10 opacity-30 select-none text-3xl animate-pulse">
          🪷
        </div>
        <div className="pointer-events-none absolute bottom-8 left-12 opacity-25 select-none text-2xl">
          🌿
        </div>
        <div className="pointer-events-none absolute bottom-10 right-14 opacity-25 select-none text-2xl">
          🌿
        </div>

        {/* Floating Score Badge (+10 pts or -5 pts) */}
        {floatingScore && (
          <div
            className={`pointer-events-none absolute top-20 left-1/2 -translate-x-1/2 z-30 rounded-full px-5 py-2 text-lg sm:text-xl font-black shadow-2xl animate-[score-pop_0.6s_ease-out_forwards] ${
              floatingScore.positive
                ? 'bg-emerald-400 text-emerald-950 ring-4 ring-emerald-300/50'
                : 'bg-rose-500 text-white ring-4 ring-rose-300/50'
            }`}
          >
            {floatingScore.text}
          </div>
        )}

        {/* Question Card Box */}
        <div className="relative z-10 mx-auto w-full max-w-2xl rounded-3xl border border-emerald-500/20 bg-slate-950/70 p-5 sm:p-6 backdrop-blur-xl shadow-xl shadow-emerald-950/40 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-950/80 px-3.5 py-1 text-xs font-extrabold uppercase tracking-widest text-emerald-400 border border-emerald-800/60">
            <span>🎯</span> {currentQ.category}
          </div>
          <h3 className="mt-3 text-lg sm:text-2xl font-black text-white leading-snug">
            {currentQ.question}
          </h3>
          <p className="mt-2 text-xs sm:text-sm text-emerald-200/70">
             Click the correct lily pad so the frog can jump!
          </p>
        </div>

        {/* Lily Pads Zone (The 3 Options) */}
        <div className="relative z-10 my-4 grid grid-cols-3 gap-2 sm:gap-6 items-start justify-items-center">
          {currentQ.options.map((option, index) => {
            const isTarget = frogLeafIndex === index;
            return (
              <LilyPad
                key={option.letter}
                optionLetter={option.letter}
                text={option.text}
                isSelected={isTarget}
                isCorrectOption={option.isCorrect}
                hasAnswered={showExplanation}
                status={isTarget ? frogStatus : 'idle'}
                onClick={() => handleSelectOption(index)}
                disabled={isAnimating || showExplanation}
              />
            );
          })}
        </div>

        {/* Educational Feedback Drawer / Banner (appears after answer) */}
        {showExplanation && (
          <div className="relative z-20 mx-auto w-full max-w-2xl rounded-2xl border border-emerald-400/40 bg-slate-950/90 p-4 sm:p-5 backdrop-blur-md shadow-2xl text-center animate-[score-pop_0.35s_ease-out]">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
              <div>
                <span
                  className={`inline-block text-xs font-black uppercase tracking-wider rounded-md px-2 py-0.5 ${
                    frogStatus === 'success'
                      ? 'bg-emerald-400/20 text-emerald-300'
                      : 'bg-rose-400/20 text-rose-300'
                  }`}
                >
                   {frogStatus === 'success' ? '✓ Excellent jump!' : '✗ The lily pad sank!'}
                </span>
                <p className="mt-1 text-xs sm:text-sm text-slate-200 leading-relaxed">
                  {currentQ.explanation}
                </p>
              </div>

              <button
                type="button"
                onClick={handleNextQuestion}
                className="w-full sm:w-auto shrink-0 rounded-full bg-emerald-400 px-6 py-2.5 text-sm font-extrabold text-emerald-950 shadow-lg shadow-emerald-400/30 transition hover:bg-emerald-300 hover:scale-105 active:scale-95 cursor-pointer"
              >
                 {currentIndex + 1 < questions.length ? 'Next question →' : 'View results 🏆'}
              </button>
            </div>
          </div>
        )}

        {/* Lower Starting Rock & Dynamic Frog Platform */}
        <div className="relative z-10 mx-auto mt-2 flex flex-col items-center">
          {/* If the frog is on the starting rock */}
          {frogLeafIndex === null && (
            <div className="relative flex flex-col items-center animate-[bounce_3s_infinite_ease-in-out]">
              <FrogCharacter status={frogStatus} />
              {/* Natural Mossy Rock */}
              <div className="h-7 w-28 sm:w-36 rounded-full bg-gradient-to-r from-emerald-900 via-stone-700 to-emerald-950 border-t-2 border-emerald-600/40 shadow-[0_10px_20px_rgba(0,0,0,0.6)] flex items-center justify-center">
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-300/60">
                   Starting rock
                </span>
              </div>
            </div>
          )}

          {/* If the frog jumped to one of the leaves */}
          {frogLeafIndex !== null && (
            <div className="relative flex flex-col items-center opacity-40">
              {/* Empty Starting Rock when frog is on a leaf */}
              <div className="h-7 w-28 sm:w-36 rounded-full bg-gradient-to-r from-emerald-900 via-stone-700 to-emerald-950 border-t-2 border-emerald-600/40 shadow-inner flex items-center justify-center">
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-300/40">
                   {frogStatus === 'sunken' ? 'The frog will reappear here!' : 'On the lily pad'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. Footer with Keyboard navigation instructions */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-5 py-3 text-xs text-slate-500 sm:px-8">
        <div className="flex items-center gap-2">
           <span className="font-semibold text-slate-700">Quick keyboard:</span>
          <kbd className="rounded border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-[11px] font-bold shadow-xs">
            1
          </kbd>
          <kbd className="rounded border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-[11px] font-bold shadow-xs">
            2
          </kbd>
          <kbd className="rounded border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-[11px] font-bold shadow-xs">
            3
          </kbd>
          <span>o</span>
          <kbd className="rounded border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-[11px] font-bold shadow-xs">
            A
          </kbd>
          <kbd className="rounded border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-[11px] font-bold shadow-xs">
            B
          </kbd>
          <kbd className="rounded border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-[11px] font-bold shadow-xs">
            C
          </kbd>
           <span>to jump,</span>
          <kbd className="rounded border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-[11px] font-bold shadow-xs">
            Enter
          </kbd>
           <span>to continue</span>
        </div>

        <div className="font-semibold text-emerald-700">
           Correct: <span className="text-emerald-800 font-extrabold">+10 pts</span> • Sink:{' '}
          <span className="text-rose-600 font-extrabold">-5 pts</span>
        </div>
      </div>
    </section>
  );
}
