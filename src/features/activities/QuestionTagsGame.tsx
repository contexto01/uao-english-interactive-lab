'use client';

import { ReactElement, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { sfx } from './utils/soundEffects';
import GameShell from './components/GameShell';
import GameSummary from './components/GameSummary';
import {
  createInitialQuestionTagsQuiz,
  generateRandomizedQuestionTagsQuiz,
  QuestionTagOption,
  QuestionTagQuestion,
} from './data/questionTags';

const CORRECT_POINTS = 10;
const MISTAKE_PENALTY = 5;
const STARTING_LIVES = 3;
const MAX_LIVES = 5;
const LASER_DURATION_MS = 240;

// Base time for an asteroid wave to reach the ship (in ms); gets slightly faster each wave
const BASE_APPROACH_MS = 9500;
const MIN_APPROACH_MS = 6500;

// Waves (0-indexed) where a collectible floating life capsule descends through the sector
const LIFE_CAPSULE_WAVES = new Set([1, 3, 5, 7, 9]);

type ShipState = 'idle' | 'firing' | 'hit' | 'victory';
type AsteroidState = 'intact' | 'destroyed' | 'wrong-hit';

type LaserLine = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  isCorrect: boolean;
};

const WARP_STREAKS = [
  { id: 1, left: '8%', height: 'h-16', duration: '1.8s', delay: '0s' },
  { id: 2, left: '19%', height: 'h-24', duration: '1.3s', delay: '0.4s' },
  { id: 3, left: '31%', height: 'h-14', duration: '2.1s', delay: '0.9s' },
  { id: 4, left: '46%', height: 'h-20', duration: '1.5s', delay: '0.2s' },
  { id: 5, left: '61%', height: 'h-24', duration: '1.4s', delay: '0.7s' },
  { id: 6, left: '74%', height: 'h-16', duration: '1.9s', delay: '1.1s' },
  { id: 7, left: '86%', height: 'h-20', duration: '1.35s', delay: '0.5s' },
  { id: 8, left: '94%', height: 'h-14', duration: '1.7s', delay: '1.3s' },
];

const CAPSULE_LANES = ['18%', '82%', '24%', '76%', '50%'];

function SpaceshipGraphic({
  state,
  angleDeg,
}: {
  state: ShipState;
  angleDeg: number;
}) {
  const isHit = state === 'hit';
  const isFiring = state === 'firing';

  return (
    <div
      className={`relative transition-transform duration-150 ${
        isHit ? 'animate-[token-shake_420ms_ease-in-out]' : ''
      }`}
      style={{ transform: `rotate(${angleDeg}deg)` }}
    >
      {/* Dual afterburner thruster flames */}
      <div
        className={`absolute -bottom-5 left-1/2 -translate-x-1/2 transition-all duration-150 ${
          isFiring ? 'scale-125 opacity-100' : 'scale-105 opacity-95 animate-pulse'
        }`}
      >
        <svg viewBox="0 0 40 36" className="h-9 w-9" fill="none">
          <path
            d="M20 35 C 13 25, 9 13, 14 2 L 26 2 C 31 13, 27 25, 20 35 Z"
            fill="url(#thrusterOuter)"
          />
          <path
            d="M20 27 C 16 20, 14 11, 17 3 L 23 3 C 26 11, 24 20, 20 27 Z"
            fill="#fef08a"
          />
          <defs>
            <linearGradient id="thrusterOuter" x1="20" y1="2" x2="20" y2="35" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Main spacecraft SVG */}
      <svg
        viewBox="0 0 120 120"
        className={`h-20 w-20 sm:h-24 sm:w-24 drop-shadow-[0_10px_22px_rgba(56,189,248,0.5)] ${
          isHit ? 'drop-shadow-[0_0_26px_rgba(244,63,94,0.95)]' : ''
        }`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {isHit && (
          <circle
            cx="60"
            cy="62"
            r="52"
            stroke="#f43f5e"
            strokeWidth="3"
            strokeDasharray="8 6"
            fill="rgba(244, 63, 94, 0.18)"
          />
        )}

        {/* Left & Right Wings */}
        <path
          d="M 45 55 L 12 86 L 18 98 L 48 84 Z"
          fill="url(#wingGrad)"
          stroke={isHit ? '#fb7185' : '#38bdf8'}
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path
          d="M 75 55 L 108 86 L 102 98 L 72 84 Z"
          fill="url(#wingGrad)"
          stroke={isHit ? '#fb7185' : '#38bdf8'}
          strokeWidth="2.5"
          strokeLinejoin="round"
        />

        {/* Wing laser cannons */}
        <rect x="20" y="64" width="5" height="18" rx="2.5" fill="#e2e8f0" stroke="#0284c7" strokeWidth="1.5" />
        <rect x="95" y="64" width="5" height="18" rx="2.5" fill="#e2e8f0" stroke="#0284c7" strokeWidth="1.5" />

        {/* Center Hull */}
        <path
          d="M 60 10 C 46 32, 42 58, 44 92 L 76 92 C 78 58, 74 32, 60 10 Z"
          fill="url(#hullGrad)"
          stroke={isHit ? '#f43f5e' : '#7dd3fc'}
          strokeWidth="3"
          strokeLinejoin="round"
        />

        {/* Nose cone accent */}
        <path
          d="M 60 12 C 55 24, 53 32, 53 36 L 67 36 C 67 32, 65 24, 60 12 Z"
          fill="#ef4444"
        />

        {/* Cockpit canopy */}
        <ellipse
          cx="60"
          cy="54"
          rx="10"
          ry="16"
          fill="url(#cockpitGrad)"
          stroke="#bae6fd"
          strokeWidth="2"
        />
        <ellipse cx="57" cy="48" rx="3" ry="6" fill="#ffffff" opacity="0.65" />

        {/* Engine Exhaust Nozzles */}
        <rect x="48" y="92" width="9" height="7" rx="2" fill="#334155" stroke="#94a3b8" strokeWidth="1.5" />
        <rect x="63" y="92" width="9" height="7" rx="2" fill="#334155" stroke="#94a3b8" strokeWidth="1.5" />

        {/* Nose laser flash */}
        {isFiring && (
          <circle cx="60" cy="10" r="8" fill="#34d399" opacity="0.95" />
        )}

        <defs>
          <linearGradient id="hullGrad" x1="60" y1="10" x2="60" y2="94" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="55%" stopColor="#cbd5e1" />
            <stop offset="100%" stopColor="#475569" />
          </linearGradient>
          <linearGradient id="wingGrad" x1="12" y1="55" x2="48" y2="98" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0284c7" />
            <stop offset="100%" stopColor="#1e3a8a" />
          </linearGradient>
          <linearGradient id="cockpitGrad" x1="60" y1="38" x2="60" y2="70" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#0369a1" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

function AsteroidTarget({
  option,
  index,
  state,
  approachProgress,
  isCurrentAim,
  showRightAnswer,
  disabled,
  onShoot,
  onAim,
  asteroidRef,
}: {
  option: QuestionTagOption;
  index: number;
  state: AsteroidState;
  approachProgress: number;
  isCurrentAim: boolean;
  showRightAnswer: boolean;
  disabled: boolean;
  onShoot: () => void;
  onAim: () => void;
  asteroidRef: (el: HTMLDivElement | null) => void;
}) {
  const isDestroyed = state === 'destroyed';
  const isWrongHit = state === 'wrong-hit';
  const isDangerClose = approachProgress >= 0.72 && !isDestroyed && !isWrongHit && !showRightAnswer;

  // Give each asteroid a subtle individual phase offset and rotation so the wave looks organic
  const laneOffsetPx = index % 2 === 0 ? 0 : 14;
  const spinDeg = (approachProgress * 220 + index * 55) * (index % 2 === 0 ? 1 : -1);
  const scaleFactor = 0.86 + approachProgress * 0.24;

  return (
    <button
      type="button"
      disabled={disabled || isWrongHit}
      onClick={onShoot}
      onMouseEnter={onAim}
      onFocus={onAim}
      style={{
        transform: `translateY(${laneOffsetPx}px) scale(${
          isDestroyed ? 1.15 : isWrongHit ? 0.88 : scaleFactor
        })`,
      }}
      aria-label={`Shoot approaching asteroid ${option.letter}: ${option.text}`}
      className={`group relative flex w-full min-w-0 flex-col items-center justify-start rounded-3xl p-1 text-center transition-shadow duration-150 focus:outline-hidden ${
        disabled || isWrongHit ? 'cursor-default' : 'cursor-crosshair'
      }`}
    >
      <div
        ref={asteroidRef}
        className="relative flex h-20 w-20 items-center justify-center sm:h-28 sm:w-28"
      >
        {/* Crosshair target reticle */}
        {isCurrentAim && !disabled && !isWrongHit && (
          <div className="pointer-events-none absolute -inset-1.5 z-20 flex items-center justify-center">
            <div
              className={`h-full w-full animate-pulse rounded-full border-2 border-dashed ${
                isDangerClose
                  ? 'border-rose-400 shadow-[0_0_24px_rgba(244,63,94,0.65)]'
                  : 'border-cyan-400/90 shadow-[0_0_20px_rgba(34,211,238,0.4)]'
              }`}
            />
          </div>
        )}

        {/* Danger proximity glow when asteroid is very close to ship */}
        {isDangerClose && (
          <div className="pointer-events-none absolute -inset-2 z-10 animate-ping rounded-full bg-rose-500/20" />
        )}

        {/* Explosion particles when correct asteroid is destroyed */}
        {isDestroyed && (
          <div className="pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center animate-[score-pop_360ms_ease-out]">
            <div className="text-3xl sm:text-4xl">💥✨</div>
            <span className="mt-1 rounded-full bg-emerald-400 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-emerald-950 shadow-lg">
              +{CORRECT_POINTS} PTS
            </span>
          </div>
        )}

        {/* Deflection / Shield impact when wrong asteroid is hit */}
        {isWrongHit && (
          <div className="pointer-events-none absolute -top-3 z-30 flex items-center gap-1 rounded-full bg-rose-600 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-lg animate-[token-shake_420ms_ease-in-out]">
            <span>☄️ -1 LIFE</span>
          </div>
        )}

        {/* Rotating SVG Asteroid Rock */}
        <div
          className={`relative h-full w-full transition-opacity duration-300 ${
            isDestroyed
              ? 'scale-125 opacity-15 blur-[1px]'
              : isWrongHit
                ? 'scale-90 opacity-40 grayscale'
                : showRightAnswer
                  ? 'scale-105 drop-shadow-[0_0_22px_rgba(52,211,153,0.85)]'
                  : 'group-hover:scale-105'
          }`}
        >
          <svg
            viewBox="0 0 160 160"
            style={{ transform: `rotate(${spinDeg}deg)` }}
            className="h-full w-full drop-shadow-[0_14px_20px_rgba(0,0,0,0.75)]"
            fill="none"
          >
            {/* Outer irregular asteroid polygon */}
            <path
              d="M 82 14 L 122 26 L 146 62 L 138 110 L 106 142 L 56 146 L 20 118 L 14 70 L 38 28 Z"
              fill={`url(#asteroidGrad-${option.letter})`}
              stroke={
                showRightAnswer
                  ? '#34d399'
                  : isWrongHit
                    ? '#f43f5e'
                    : isDangerClose
                      ? '#fb7185'
                      : isCurrentAim
                        ? '#38bdf8'
                        : '#64748b'
              }
              strokeWidth={showRightAnswer || isWrongHit || isCurrentAim || isDangerClose ? '5' : '3'}
              strokeLinejoin="round"
            />

            {/* Surface facets & craters */}
            <path
              d="M 38 28 L 68 52 L 122 26 M 20 118 L 64 98 L 106 142"
              stroke="#334155"
              strokeWidth="2"
              opacity="0.45"
            />
            <ellipse cx="54" cy="54" rx="14" ry="10" fill="#1e293b" opacity="0.5" />
            <ellipse cx="52" cy="52" rx="11" ry="7" fill="#0f172a" opacity="0.4" />
            <circle cx="108" cy="68" r="11" fill="#1e293b" opacity="0.5" />
            <circle cx="106" cy="66" r="8" fill="#0f172a" opacity="0.4" />
            <ellipse cx="76" cy="112" rx="16" ry="11" fill="#1e293b" opacity="0.45" />
            <circle cx="42" cy="92" r="6" fill="#1e293b" opacity="0.45" />

            <defs>
              <radialGradient id={`asteroidGrad-${option.letter}`} cx="38%" cy="32%" r="70%">
                <stop offset="0%" stopColor="#94a3b8" />
                <stop offset="55%" stopColor="#475569" />
                <stop offset="100%" stopColor="#1e293b" />
              </radialGradient>
            </defs>
          </svg>

          {/* Upright Option Letter Badge on the Asteroid */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-black shadow-md transition-all sm:h-9 sm:w-9 sm:text-sm ${
                showRightAnswer
                  ? 'scale-110 bg-emerald-400 text-emerald-950 ring-4 ring-emerald-300/60'
                  : isWrongHit
                    ? 'bg-rose-600 text-white ring-2 ring-rose-400'
                    : isDangerClose
                      ? 'bg-rose-500 text-white ring-4 ring-rose-300/60'
                      : isCurrentAim
                        ? 'bg-cyan-400 text-slate-950 ring-4 ring-cyan-300/50'
                        : 'bg-slate-900/90 text-cyan-300 ring-2 ring-slate-500/80 group-hover:bg-cyan-400 group-hover:text-slate-950'
              }`}
            >
              {option.letter}
            </span>
          </div>
        </div>
      </div>

      {/* Question Tag Text Pill attached below the Asteroid */}
      <div
        className={`mt-1 w-full max-w-[175px] rounded-2xl px-2.5 py-1.5 text-xs font-extrabold shadow-lg backdrop-blur-md transition-all duration-150 sm:px-3.5 sm:py-2 sm:text-sm ${
          showRightAnswer
            ? 'border-2 border-emerald-400 bg-emerald-950/95 text-emerald-200 shadow-emerald-500/30'
            : isWrongHit
              ? 'border-2 border-rose-500/70 bg-rose-950/80 text-rose-300 line-through opacity-75'
              : isDangerClose
                ? 'border-2 border-rose-400 bg-rose-950/90 text-white shadow-rose-500/30'
                : isCurrentAim
                  ? 'border-2 border-cyan-400 bg-slate-900/95 text-white shadow-cyan-500/25'
                  : 'border border-slate-600/80 bg-slate-900/90 text-slate-100 group-hover:border-cyan-400 group-hover:bg-slate-900/95'
        }`}
      >
        <span>{option.text}?</span>
      </div>
    </button>
  );
}

export default function QuestionTagsGame(): ReactElement {
  const [questions, setQuestions] = useState<QuestionTagQuestion[]>(() =>
    createInitialQuestionTagsQuiz(),
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHydrated, setIsHydrated] = useState(false);

  const [lives, setLives] = useState(STARTING_LIVES);
  const [livesCollected, setLivesCollected] = useState(0);
  const [capsuleAvailable, setCapsuleAvailable] = useState(false);
  const [capsuleCollectedToast, setCapsuleCollectedToast] = useState(false);

  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Real-time approach progress: 0 (top of sector) -> 1 (collides with ship at bottom)
  const [approachProgress, setApproachProgress] = useState(0);
  const [collisionFlash, setCollisionFlash] = useState(false);

  const [aimIndex, setAimIndex] = useState<number>(0);
  const [shipAngle, setShipAngle] = useState<number>(0);
  const [shipState, setShipState] = useState<ShipState>('idle');
  const [asteroidStates, setAsteroidStates] = useState<Record<number, AsteroidState>>({});
  const [laserLine, setLaserLine] = useState<LaserLine | null>(null);
  const [isFiringLock, setIsFiringLock] = useState(false);

  const [waveSolved, setWaveSolved] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isOutOfLives, setIsOutOfLives] = useState(false);

  const arenaRef = useRef<HTMLDivElement | null>(null);
  const shipRef = useRef<HTMLDivElement | null>(null);
  const asteroidRefs = useRef<(HTMLDivElement | null)[]>([]);
  const nextButtonRef = useRef<HTMLButtonElement | null>(null);
  const timeoutsRef = useRef<number[]>([]);
  const lastFrameTimeRef = useRef<number | null>(null);

  const currentQuestion = questions[currentIndex] ?? questions[0];

  // Approach duration scales slightly faster as player advances through the 10 sectors
  const waveApproachDurationMs = useMemo(() => {
    return Math.max(MIN_APPROACH_MS, BASE_APPROACH_MS - currentIndex * 320);
  }, [currentIndex]);

  const scheduleTimeout = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timeoutsRef.current.push(id);
    return id;
  }, []);

  const clearScheduledTimeouts = useCallback(() => {
    timeoutsRef.current.forEach((id) => window.clearTimeout(id));
    timeoutsRef.current = [];
  }, []);

  useEffect(() => clearScheduledTimeouts, [clearScheduledTimeouts]);

  // Randomize questions and options after mount for deterministic SSR hydration
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setQuestions(generateRandomizedQuestionTagsQuiz());
    setIsHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // Spawn life capsule on designated waves
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setCapsuleAvailable(LIFE_CAPSULE_WAVES.has(currentIndex));
    setCapsuleCollectedToast(false);
    setApproachProgress(0);
    lastFrameTimeRef.current = null;
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [currentIndex]);

  // Game clock
  useEffect(() => {
    if (!isHydrated || isCompleted || isOutOfLives) return;

    const timer = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isHydrated, isCompleted, isOutOfLives]);

  // Handle when asteroids reach the spaceship (approachProgress >= 1)
  const handleAsteroidCollisionWithShip = useCallback(() => {
    sfx.explosion();
    sfx.wrong();
    setShipState('hit');
    setCollisionFlash(true);
    setScore((prev) => Math.max(0, prev - MISTAKE_PENALTY));
    setMistakes((prev) => prev + 1);
    setCombo(0);

    setLives((prevLives) => {
      const nextLives = prevLives - 1;
      if (nextLives <= 0) {
        sfx.gameOver();
        scheduleTimeout(() => {
          setIsOutOfLives(true);
          setCollisionFlash(false);
        }, 500);
      } else {
        // Respawn the asteroid wave at the top of the sector so the player can keep shooting
        scheduleTimeout(() => {
          setShipState('idle');
          setCollisionFlash(false);
        }, 550);
      }
      return nextLives;
    });

    setApproachProgress(0);
    lastFrameTimeRef.current = null;
  }, [scheduleTimeout]);

  // Smooth 60fps requestAnimationFrame loop moving the asteroids toward the ship
  useEffect(() => {
    if (!isHydrated || waveSolved || isCompleted || isOutOfLives || isFiringLock) {
      lastFrameTimeRef.current = null;
      return;
    }

    let animationFrameId: number;

    const tick = (timestamp: number) => {
      if (lastFrameTimeRef.current === null) {
        lastFrameTimeRef.current = timestamp;
      }
      const deltaMs = timestamp - lastFrameTimeRef.current;
      lastFrameTimeRef.current = timestamp;

      setApproachProgress((prev) => {
        const next = prev + deltaMs / waveApproachDurationMs;
        if (next >= 1) {
          // Trigger hull impact on next tick
          window.setTimeout(() => {
            handleAsteroidCollisionWithShip();
          }, 0);
          return 0;
        }
        return next;
      });

      animationFrameId = window.requestAnimationFrame(tick);
    };

    animationFrameId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [
    isHydrated,
    waveSolved,
    isCompleted,
    isOutOfLives,
    isFiringLock,
    waveApproachDurationMs,
    handleAsteroidCollisionWithShip,
  ]);

  // Focus Next Wave button when wave is solved
  useEffect(() => {
    if (waveSolved) {
      nextButtonRef.current?.focus({ preventScroll: true });
    }
  }, [waveSolved]);

  const computeAimCoordinates = useCallback((targetIndex: number) => {
    const arena = arenaRef.current;
    const ship = shipRef.current;
    const asteroid = asteroidRefs.current[targetIndex];
    if (!arena || !ship || !asteroid) return null;

    const arenaRect = arena.getBoundingClientRect();
    const shipRect = ship.getBoundingClientRect();
    const astRect = asteroid.getBoundingClientRect();

    const x1 = shipRect.left - arenaRect.left + shipRect.width / 2;
    const y1 = shipRect.top - arenaRect.top + shipRect.height * 0.22;
    const x2 = astRect.left - arenaRect.left + astRect.width / 2;
    const y2 = astRect.top - arenaRect.top + astRect.height / 2;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI + 90;

    return { x1, y1, x2, y2, angleDeg };
  }, []);

  const handleAimAsteroid = useCallback(
    (index: number) => {
      setAimIndex(index);
      const coords = computeAimCoordinates(index);
      if (coords) {
        setShipAngle(Math.max(-60, Math.min(60, coords.angleDeg)));
      }
    },
    [computeAimCoordinates],
  );

  const handleCollectCapsule = useCallback(() => {
    if (!capsuleAvailable || isOutOfLives || isCompleted) return;
    sfx.powerup();
    setCapsuleAvailable(false);
    setCapsuleCollectedToast(true);
    setLives((prev) => Math.min(MAX_LIVES, prev + 1));
    setLivesCollected((prev) => prev + 1);
    setScore((prev) => prev + 5);
  }, [capsuleAvailable, isOutOfLives, isCompleted]);

  const handleShootAsteroid = useCallback(
    (optionIndex: number) => {
      if (
        isFiringLock ||
        waveSolved ||
        isCompleted ||
        isOutOfLives ||
        asteroidStates[optionIndex] === 'wrong-hit'
      ) {
        return;
      }

      const option = currentQuestion.options[optionIndex];
      if (!option) return;

      setIsFiringLock(true);
      setAimIndex(optionIndex);

      const coords = computeAimCoordinates(optionIndex);
      if (coords) {
        setShipAngle(Math.max(-60, Math.min(60, coords.angleDeg)));
        setLaserLine({
          x1: coords.x1,
          y1: coords.y1,
          x2: coords.x2,
          y2: coords.y2,
          isCorrect: option.isCorrect,
        });
      }

      setShipState('firing');
      sfx.laser();

      scheduleTimeout(() => {
        setLaserLine(null);

        if (option.isCorrect) {
          sfx.explosion();
          sfx.correct();
          setAsteroidStates((prev) => ({ ...prev, [optionIndex]: 'destroyed' }));
          setShipState('victory');
          setScore((prev) => prev + CORRECT_POINTS);
          setCombo((prev) => {
            const next = prev + 1;
            setMaxCombo((m) => Math.max(m, next));
            return next;
          });
          setWaveSolved(true);
          setIsFiringLock(false);
        } else {
          sfx.explosion();
          sfx.wrong();
          setAsteroidStates((prev) => ({ ...prev, [optionIndex]: 'wrong-hit' }));
          setShipState('hit');
          setScore((prev) => Math.max(0, prev - MISTAKE_PENALTY));
          setMistakes((prev) => prev + 1);
          setCombo(0);

          const nextLives = lives - 1;
          setLives(nextLives);

          if (nextLives <= 0) {
            sfx.gameOver();
            scheduleTimeout(() => {
              setIsOutOfLives(true);
              setIsFiringLock(false);
            }, 550);
          } else {
            scheduleTimeout(() => {
              setShipState('idle');
              setIsFiringLock(false);
            }, 400);
          }
        }
      }, LASER_DURATION_MS);
    },
    [
      isFiringLock,
      waveSolved,
      isCompleted,
      isOutOfLives,
      asteroidStates,
      currentQuestion,
      computeAimCoordinates,
      scheduleTimeout,
      lives,
    ],
  );

  const handleNextWave = useCallback(() => {
    clearScheduledTimeouts();
    if (currentIndex + 1 >= questions.length) {
      sfx.victory();
      setBestScore((prev) => Math.max(prev, score));
      setIsCompleted(true);
    } else {
      setCurrentIndex((prev) => prev + 1);
      setAsteroidStates({});
      setApproachProgress(0);
      lastFrameTimeRef.current = null;
      setWaveSolved(false);
      setShipState('idle');
      setShipAngle(0);
      setLaserLine(null);
      setIsFiringLock(false);
    }
  }, [clearScheduledTimeouts, currentIndex, questions.length, score]);

  const handleRestartGame = useCallback(() => {
    clearScheduledTimeouts();
    setQuestions(generateRandomizedQuestionTagsQuiz());
    setCurrentIndex(0);
    setLives(STARTING_LIVES);
    setLivesCollected(0);
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setMistakes(0);
    setElapsedSeconds(0);
    setAsteroidStates({});
    setApproachProgress(0);
    lastFrameTimeRef.current = null;
    setCollisionFlash(false);
    setWaveSolved(false);
    setShipState('idle');
    setShipAngle(0);
    setLaserLine(null);
    setIsFiringLock(false);
    setIsCompleted(false);
    setIsOutOfLives(false);
  }, [clearScheduledTimeouts]);

  // Keyboard controls (1-4 or A-D to shoot asteroids, L for life capsule, Enter/Space for next wave)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;

      if (isCompleted || isOutOfLives) return;

      if (waveSolved) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') {
          e.preventDefault();
          handleNextWave();
        }
        return;
      }

      const key = e.key.toLowerCase();
      if (key === '1' || key === 'a') {
        e.preventDefault();
        handleShootAsteroid(0);
      } else if (key === '2' || key === 'b') {
        e.preventDefault();
        handleShootAsteroid(1);
      } else if (key === '3' || key === 'c') {
        e.preventDefault();
        handleShootAsteroid(2);
      } else if (key === '4' || key === 'd') {
        e.preventDefault();
        handleShootAsteroid(3);
      } else if (key === 'l' || key === 'h') {
        if (capsuleAvailable) {
          e.preventDefault();
          handleCollectCapsule();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    isCompleted,
    isOutOfLives,
    waveSolved,
    capsuleAvailable,
    handleNextWave,
    handleShootAsteroid,
    handleCollectCapsule,
  ]);

  const totalShots = (currentIndex + (waveSolved ? 1 : 0)) + mistakes;
  const accuracyPercent = useMemo(() => {
    const hits = currentIndex + (waveSolved ? 1 : 0);
    if (totalShots === 0) return 100;
    return Math.max(0, Math.round((hits / totalShots) * 100));
  }, [currentIndex, waveSolved, totalShots]);

  // Vertical travel distance in pixels for the descending asteroid wave (0px -> 230px)
  const waveDescentPx = Math.round(approachProgress * 230);
  const capsuleLaneLeft = CAPSULE_LANES[currentIndex % CAPSULE_LANES.length];
  const capsuleTopPercent = 18 + Math.round(approachProgress * 54);
  const isDangerZone = approachProgress >= 0.72 && !waveSolved;

  const kbdClass =
    'rounded border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-[11px] font-bold text-slate-700 shadow-xs';

  return (
    <GameShell
      title="Question Tags: Asteroid Blaster"
      subtitle="Space Arcade • Blast the correct Question Tag asteroid before impact!"
      current={currentIndex + (waveSolved ? 1 : 0)}
      total={questions.length}
      score={score}
      elapsedSeconds={elapsedSeconds}
      progressLabel="WAVE"
      className="shadow-2xl shadow-slate-950/15"
      contentClassName="bg-slate-950"
      footer={
        <>
          <div className="hidden flex-wrap items-center gap-1.5 sm:flex">
            <span className="font-semibold text-slate-700">Controls:</span>
            <span>Click or press</span>
            <kbd className={kbdClass}>A</kbd>
            <kbd className={kbdClass}>B</kbd>
            <kbd className={kbdClass}>C</kbd>
            <kbd className={kbdClass}>D</kbd>
            <span>to fire laser ·</span>
            <kbd className={kbdClass}>L</kbd>
            <span>collect life capsule</span>
          </div>

          <div className="flex items-center gap-3 font-semibold text-slate-700">
            <span>
              Hit: <strong className="text-emerald-700">+{CORRECT_POINTS} pts</strong>
            </span>
            <span>·</span>
            <span>
              Wrong / Impact: <strong className="text-rose-600">-1 Life &amp; -{MISTAKE_PENALTY} pts</strong>
            </span>
          </div>
        </>
      }
    >
      {!isCompleted ? (
        <section className="relative overflow-hidden">
          {/* Top Arcade HUD Bar */}
          <div className="border-b border-cyan-500/20 bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 px-5 py-3.5 text-white sm:px-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Lives counter */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-black uppercase tracking-widest text-cyan-300">
                  Hull Lives:
                </span>
                <div
                  className="flex items-center gap-1.5"
                  aria-label={`${lives} lives remaining out of ${MAX_LIVES}`}
                >
                  {Array.from({ length: MAX_LIVES }).map((_, idx) => {
                    const isAlive = idx < lives;
                    return (
                      <span
                        key={`life-${idx}`}
                        className={`inline-flex h-7 w-7 items-center justify-center rounded-lg border text-base transition-all duration-300 ${
                          isAlive
                            ? 'scale-100 border-rose-400/60 bg-rose-500/20 text-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.35)]'
                            : 'scale-90 border-slate-800 bg-slate-900/60 text-slate-700 opacity-40'
                        }`}
                      >
                        ❤️
                      </span>
                    );
                  })}
                </div>
                {livesCollected > 0 && (
                  <span className="hidden rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-300 ring-1 ring-emerald-400/40 sm:inline-block">
                    +{livesCollected} Extra {livesCollected === 1 ? 'Life' : 'Lives'} Collected
                  </span>
                )}
              </div>

              {/* Proximity Radar Bar & Wave Counter */}
              <div className="flex flex-wrap items-center gap-3 text-xs font-extrabold uppercase tracking-wider">
                <div className="flex items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-900/80 px-3 py-1">
                  <span className={isDangerZone ? 'animate-pulse text-rose-400' : 'text-cyan-300'}>
                    {isDangerZone ? '⚠️ IMPACT ALERT' : '☄️ ASTEROID RADAR'}
                  </span>
                  <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-800 sm:w-28">
                    <div
                      className={`h-full transition-colors ${
                        isDangerZone
                          ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                          : 'bg-gradient-to-r from-cyan-400 to-emerald-400'
                      }`}
                      style={{ width: `${Math.min(100, Math.round(approachProgress * 100))}%` }}
                    />
                  </div>
                </div>

                {combo > 1 && (
                  <span className="animate-bounce rounded-full bg-amber-400 px-2.5 py-0.5 text-xs font-black text-amber-950">
                    ⚡ {combo}x Streak
                  </span>
                )}
                <span className="rounded-xl border border-cyan-500/30 bg-cyan-950/60 px-3 py-1 text-cyan-200">
                  Sector {currentIndex + 1} / {questions.length}
                </span>
              </div>
            </div>
          </div>

          {/* Space Battle Arena with Parallax Moving Starfield */}
          <div
            ref={arenaRef}
            className={`relative flex min-h-[650px] flex-col justify-between overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950 via-slate-950 to-[#020617] p-4 transition-colors duration-300 sm:min-h-[700px] sm:p-8 ${
              collisionFlash ? 'ring-4 ring-inset ring-rose-500/80' : ''
            }`}
          >
            {/* Moving Parallax Starfield Layers */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              {/* Slow deep space star grid scrolling downward */}
              <div
                className="absolute inset-0 opacity-45 animate-[space-scroll-slow_14s_linear_infinite]"
                style={{
                  backgroundImage:
                    'radial-gradient(1.5px 1.5px at 24px 36px, #ffffff, transparent), radial-gradient(1px 1px at 96px 112px, #bae6fd, transparent), radial-gradient(1.5px 1.5px at 180px 64px, #e2e8f0, transparent), radial-gradient(1px 1px at 260px 210px, #38bdf8, transparent)',
                  backgroundSize: '300px 240px',
                }}
              />

              {/* Fast foreground star layer scrolling downward */}
              <div
                className="absolute inset-0 opacity-65 animate-[space-scroll-fast_7s_linear_infinite]"
                style={{
                  backgroundImage:
                    'radial-gradient(2px 2px at 60px 80px, #ffffff, transparent), radial-gradient(2px 2px at 220px 160px, #7dd3fc, transparent), radial-gradient(1.5px 1.5px at 140px 290px, #ffffff, transparent)',
                  backgroundSize: '360px 360px',
                }}
              />

              {/* High-speed vertical warp light streaks */}
              {WARP_STREAKS.map((streak) => (
                <span
                  key={streak.id}
                  style={{
                    left: streak.left,
                    animationDuration: streak.duration,
                    animationDelay: streak.delay,
                  }}
                  className={`absolute top-0 w-[1.5px] rounded-full bg-gradient-to-b from-transparent via-cyan-300/60 to-transparent animate-[warp-streak_linear_infinite] ${streak.height}`}
                />
              ))}

              {/* Ambient space nebula glows */}
              <div className="absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
              <div className="absolute -right-24 bottom-1/4 h-72 w-72 rounded-full bg-purple-500/10 blur-3xl" />
            </div>

            {/* Laser Beam SVG Overlay */}
            {laserLine && (
              <svg
                className="pointer-events-none absolute inset-0 z-30 h-full w-full"
                aria-hidden="true"
              >
                <line
                  x1={laserLine.x1}
                  y1={laserLine.y1}
                  x2={laserLine.x2}
                  y2={laserLine.y2}
                  stroke={laserLine.isCorrect ? '#34d399' : '#fb7185'}
                  strokeWidth="12"
                  strokeLinecap="round"
                  opacity="0.35"
                />
                <line
                  x1={laserLine.x1}
                  y1={laserLine.y1}
                  x2={laserLine.x2}
                  y2={laserLine.y2}
                  stroke={laserLine.isCorrect ? '#a7f3d0' : '#ffe4e6'}
                  strokeWidth="4.5"
                  strokeLinecap="round"
                />
              </svg>
            )}

            {/* Top Mission Sentence Prompt */}
            <div className="relative z-20 mx-auto w-full max-w-2xl rounded-3xl border border-cyan-400/30 bg-slate-900/85 p-4 text-center shadow-[0_0_35px_rgba(6,182,212,0.2)] backdrop-blur-xl sm:p-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/40 bg-cyan-950/80 px-3 py-0.5 text-[11px] font-black uppercase tracking-widest text-cyan-300">
                <span>🛸</span> Target Transmission · {currentQuestion.category}
              </div>

              <h3 className="mt-2.5 text-xl font-black tracking-tight text-white sm:text-3xl">
                <span>{currentQuestion.statementPart} </span>
                <span
                  className={`inline-block rounded-xl border-2 px-3 py-0.5 font-mono transition-all ${
                    waveSolved
                      ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300 shadow-[0_0_15px_rgba(52,211,153,0.4)]'
                      : 'border-dashed border-cyan-400/70 bg-cyan-950/60 text-cyan-300'
                  }`}
                >
                  {waveSolved ? `${currentQuestion.answer}?` : '___?'}
                </span>
              </h3>

              <p className="mt-1.5 text-xs text-slate-300 sm:text-sm">
                Shoot the correct Question Tag asteroid before the wave reaches your ship!
              </p>
            </div>

            {/* Descending Asteroid Wave Zone */}
            <div className="relative z-10 flex flex-1 flex-col justify-start pt-3 pb-48">
              <div
                style={{
                  transform: `translate3d(0, ${waveDescentPx}px, 0)`,
                }}
                className="grid grid-cols-2 items-start justify-items-center gap-3 will-change-transform sm:grid-cols-4 sm:gap-5"
              >
                {currentQuestion.options.map((option, idx) => (
                  <AsteroidTarget
                    key={`${currentQuestion.id}-${option.letter}`}
                    option={option}
                    index={idx}
                    state={asteroidStates[idx] ?? 'intact'}
                    approachProgress={approachProgress}
                    isCurrentAim={aimIndex === idx}
                    showRightAnswer={waveSolved && option.isCorrect}
                    disabled={isFiringLock || waveSolved || isOutOfLives}
                    onAim={() => handleAimAsteroid(idx)}
                    onShoot={() => handleShootAsteroid(idx)}
                    asteroidRef={(el) => {
                      asteroidRefs.current[idx] = el;
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Descending Collectible Life Supply Capsule along the way */}
            {capsuleAvailable && !isOutOfLives && (
              <div
                style={{ left: capsuleLaneLeft, top: `${capsuleTopPercent}%` }}
                className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
              >
                <button
                  type="button"
                  onClick={handleCollectCapsule}
                  aria-label="Collect descending extra life supply capsule"
                  className="group flex cursor-pointer items-center gap-2 rounded-full border-2 border-emerald-400 bg-emerald-950/95 px-3.5 py-2 text-xs font-black text-emerald-200 shadow-[0_0_24px_rgba(16,185,129,0.75)] transition-transform hover:scale-110 hover:bg-emerald-900 active:scale-95"
                >
                  <span className="text-base sm:text-lg">💊❤️</span>
                  <span>+1 LIFE (Click / L)</span>
                </button>
              </div>
            )}

            {capsuleCollectedToast && (
              <div className="pointer-events-none relative z-20 mx-auto my-1 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-4 py-1 text-xs font-black text-emerald-300 ring-1 ring-emerald-400/50 animate-[score-pop_320ms_ease-out]">
                <span>✨❤️ Extra Life Capsule Collected! (+1 Life &amp; +5 pts)</span>
              </div>
            )}

            {/* Hull Impact Warning Banner */}
            {collisionFlash && (
              <div className="pointer-events-none relative z-30 mx-auto mb-2 inline-flex items-center gap-2 rounded-full bg-rose-600 px-4 py-1.5 text-xs font-black uppercase tracking-wider text-white shadow-lg animate-[token-shake_420ms_ease-in-out]">
                <span>☄️ Asteroid Hull Impact! -1 Life &amp; -{MISTAKE_PENALTY} pts</span>
              </div>
            )}

            {/* Bottom Defense Perimeter Line & Spaceship Dock */}
            <div className="relative z-20 mx-auto mt-auto flex min-h-[145px] w-full max-w-2xl flex-col items-center justify-end">
              {/* Defense laser perimeter line */}
              {!waveSolved && (
                <div className="pointer-events-none mb-2 flex w-full items-center gap-2 opacity-75">
                  <div
                    className={`h-[1.5px] flex-1 border-t border-dashed ${
                      isDangerZone ? 'border-rose-500' : 'border-cyan-500/40'
                    }`}
                  />
                  <span
                    className={`text-[10px] font-black uppercase tracking-widest ${
                      isDangerZone ? 'animate-pulse text-rose-400' : 'text-cyan-400/70'
                    }`}
                  >
                    {isDangerZone ? '⚠️ Danger Perimeter · Shoot Now!' : 'Defense Perimeter'}
                  </span>
                  <div
                    className={`h-[1.5px] flex-1 border-t border-dashed ${
                      isDangerZone ? 'border-rose-500' : 'border-cyan-500/40'
                    }`}
                  />
                </div>
              )}

              {waveSolved ? (
                <div
                  role="status"
                  className="w-full animate-[score-pop_320ms_ease-out] rounded-2xl border-2 border-emerald-400/60 bg-slate-900/95 p-5 shadow-2xl backdrop-blur-md"
                >
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-xs font-black text-slate-950">
                          ✓
                        </span>
                        <span className="text-sm font-black uppercase tracking-wider text-emerald-300">
                          Direct Hit! Asteroid Destroyed (+{CORRECT_POINTS} pts)
                        </span>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-slate-200 sm:text-sm">
                        💡 <strong className="text-emerald-300">Grammar Rule:</strong>{' '}
                        {currentQuestion.explanation}
                      </p>
                    </div>

                    <button
                      ref={nextButtonRef}
                      type="button"
                      onClick={handleNextWave}
                      className="w-full shrink-0 cursor-pointer rounded-xl bg-emerald-400 px-6 py-3 text-sm font-black text-emerald-950 shadow-lg shadow-emerald-500/25 transition hover:scale-105 hover:bg-emerald-300 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-white active:scale-95 sm:w-auto"
                    >
                      {currentIndex + 1 < questions.length
                        ? 'Next Asteroid Wave →'
                        : 'Complete Mission 🏆'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div ref={shipRef} className="relative flex items-center justify-center">
                    <SpaceshipGraphic state={shipState} angleDeg={shipAngle} />
                  </div>
                  <span className="mt-2 rounded-full border border-cyan-500/30 bg-slate-900/80 px-3 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-cyan-300/80">
                    UAO Starfighter · Click an approaching asteroid to fire
                  </span>
                </div>
              )}
            </div>

            {/* Game Over Overlay when all lives are lost */}
            {isOutOfLives && (
              <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/85 p-5 backdrop-blur-md">
                <div className="w-full max-w-md animate-[score-pop_320ms_ease-out] rounded-3xl border-2 border-rose-500/60 bg-slate-900 p-7 text-center text-white shadow-2xl">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/20 text-4xl ring-2 ring-rose-500/50">
                    💥
                  </div>
                  <p className="mt-4 text-xs font-black uppercase tracking-[0.2em] text-rose-400">
                    Hull Integrity Depleted
                  </p>
                  <h3 className="mt-2 text-2xl font-black text-white">Mission Failed!</h3>
                  <p className="mt-2 text-sm text-slate-300">
                    Your spaceship ran out of lives on Sector {currentIndex + 1}. The correct tag for{' '}
                    <strong className="text-cyan-300">&ldquo;{currentQuestion.statementPart}&rdquo;</strong> was{' '}
                    <strong className="text-emerald-300">&ldquo;{currentQuestion.answer}?&rdquo;</strong>.
                  </p>
                  <p className="mt-2 rounded-xl bg-slate-950/70 p-3 text-xs text-slate-400">
                    {currentQuestion.explanation}
                  </p>

                  <div className="mt-5 flex items-center justify-center gap-4 text-xs font-bold text-slate-300">
                    <span>Score: {score} pts</span>
                    <span>·</span>
                    <span>Waves Cleared: {currentIndex} / {questions.length}</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleRestartGame}
                    className="mt-6 w-full cursor-pointer rounded-xl bg-rose-600 px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-rose-600/30 transition hover:bg-rose-500 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-rose-300 active:scale-95"
                  >
                    Launch New Spaceship (3 Lives) 🚀
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      ) : (
        <GameSummary
          challengeId="question-tags"
          title="Asteroid Sector Cleared!"
          description="You piloted your spaceship through all 10 asteroid waves and blasted every Question Tag accurately!"
          score={score}
          time={elapsedSeconds}
          accuracy={accuracyPercent}
          mistakes={mistakes}
          maxCombo={maxCombo}
          bestScore={bestScore}
          onRestart={handleRestartGame}
          restartLabel="Play Asteroid Blaster Again 🚀"
        >
          <div className="max-h-72 overflow-y-auto rounded-2xl border border-slate-200 divide-y divide-slate-100 bg-slate-50/70 p-2">
            <h3 className="p-3 text-sm font-extrabold uppercase tracking-wider text-slate-600">
              Mission Log · All 10 Question Tags:
            </h3>
            {questions.map((item, idx) => (
              <div key={item.id} className="p-3 text-xs sm:text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-black text-slate-900">
                    {idx + 1}. {item.statementPart}{' '}
                    <span className="text-brand-700 underline">{item.answer}?</span>
                  </span>
                  <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-extrabold text-emerald-800">
                    ✓ Destroyed
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-600">{item.explanation}</p>
              </div>
            ))}
          </div>
        </GameSummary>
      )}
    </GameShell>
  );
}
