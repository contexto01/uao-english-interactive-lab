'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createInitialTiles,
  createScrambledTiles,
  LetterTile,
  QuestionTagItem,
  questionTagsQuestions,
  shuffleArray,
} from './data/questionTags';

const STORAGE_KEY = 'uao-english-lab:progress:question-tags';
const CORRECT_POINTS = 10;
const MISTAKE_PENALTY = 5;

/**
 * Web Audio API synthesizer for instant procedural sound effects
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
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.22);
  }

  wrong() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.linearRampToValueAtTime(110, now + 0.25);

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.3);
  }

  wordComplete() {
    const ctx = this.getContext();
    if (!ctx) return;
    const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime + idx * 0.08;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.28);
    });
  }

  victory() {
    const ctx = this.getContext();
    if (!ctx) return;
    const melody = [
      { f: 523.25, d: 0.12 },
      { f: 659.25, d: 0.12 },
      { f: 783.99, d: 0.12 },
      { f: 1046.5, d: 0.35 },
    ];
    let offset = 0;
    melody.forEach((note) => {
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
      offset += note.d * 0.85;
    });
  }
}

const sfx = new SoundEffects();

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

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export default function QuestionTagsGame() {
  // Game questions order (deterministic initial state for prerendering)
  const [questions, setQuestions] = useState<QuestionTagItem[]>(questionTagsQuestions);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Current question data
  const currentQuestion = questions[currentIndex] ?? questions[0];
  const targetWord = currentQuestion.word.toUpperCase();

  // Scrambled letters in pool (deterministic initial state for prerendering)
  const [scrambledTiles, setScrambledTiles] = useState<LetterTile[]>(() =>
    createInitialTiles(questionTagsQuestions[0].word),
  );
  // Track which tile IDs are placed in the word
  const [usedTileIds, setUsedTileIds] = useState<string[]>([]);

  // Letter slots for the word being formed
  const [slots, setSlots] = useState<SlotState[]>(() =>
    targetWord.split('').map(() => ({ char: '', status: 'empty' })),
  );

  // Score & Game Stats
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [totalMistakes, setTotalMistakes] = useState(0);
  const [wordMistakes, setWordMistakes] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Timer
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Feedback state for floating score/messages
  const [feedback, setFeedback] = useState<FeedbackState>({ kind: null, text: '' });
  const [isInputLocked, setIsInputLocked] = useState(false);

  // Sound toggle
  const [isMuted, setIsMuted] = useState(false);

  // Ref to focus next button on word completion
  const nextButtonRef = useRef<HTMLButtonElement | null>(null);

  // Check if current word is fully formed & correct
  const isWordFinished = useMemo(() => {
    return (
      slots.length === targetWord.length &&
      slots.every((slot) => slot.status === 'correct') &&
      slots.map((s) => s.char).join('') === targetWord
    );
  }, [slots, targetWord]);

  // Next slot index waiting to be filled
  const nextEmptySlotIndex = useMemo(() => {
    return slots.findIndex((slot) => slot.status === 'empty');
  }, [slots]);

  // Load best score & mute preferences, and shuffle questions on client mount
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (typeof parsed.bestScore === 'number') {
          setBestScore(parsed.bestScore);
        }
      }
      const soundPref = window.localStorage.getItem('uao-english-lab:sound-enabled');
      if (soundPref === 'false') {
        setIsMuted(true);
        sfx.enabled = false;
      }
    } catch {
      // Ignore storage errors
    } finally {
      setQuestions(shuffleArray(questionTagsQuestions));
      setIsHydrated(true);
    }
  }, []);

  // Update high score in local storage when completed
  useEffect(() => {
    if (!isCompleted || !isHydrated) return;
    try {
      const newBest = Math.max(bestScore, score);
      setBestScore(newBest);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ bestScore: newBest }));
    } catch {
      // Ignore
    }
  }, [isCompleted, isHydrated, score, bestScore]);

  // Overall timer
  useEffect(() => {
    if (!isHydrated || isCompleted) return;

    const timer = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isHydrated, isCompleted]);

  // Synchronize tiles & slots whenever question changes
  const resetWordState = useCallback((word: string) => {
    const tiles = createScrambledTiles(word);
    setScrambledTiles(tiles);
    setUsedTileIds([]);
    setSlots(word.split('').map(() => ({ char: '', status: 'empty' })));
    setWordMistakes(0);
    setFeedback({ kind: null, text: '' });
    setIsInputLocked(false);
  }, []);

  useEffect(() => {
    if (questions[currentIndex]) {
      resetWordState(questions[currentIndex].word);
    }
  }, [currentIndex, questions, resetWordState]);

  // Audio mute toggle
  const toggleSound = () => {
    const nextState = !isMuted;
    setIsMuted(nextState);
    sfx.enabled = !nextState;
    try {
      window.localStorage.setItem('uao-english-lab:sound-enabled', String(!nextState));
    } catch {
      // Ignore
    }
  };

  /**
   * Handle letter selection
   */
  const handleSelectLetter = useCallback(
    (tile: LetterTile) => {
      if (isInputLocked || isWordFinished || usedTileIds.includes(tile.id)) {
        return;
      }

      const slotIdx = nextEmptySlotIndex;
      if (slotIdx === -1) return; // Word already full

      const expectedChar = targetWord[slotIdx];
      const isCorrect = tile.char.toUpperCase() === expectedChar.toUpperCase();

      if (isCorrect) {
        // Correct letter!
        sfx.correct();
        const nextSlots = [...slots];
        nextSlots[slotIdx] = {
          char: tile.char,
          status: 'correct',
          tileId: tile.id,
        };
        setSlots(nextSlots);
        setUsedTileIds((prev) => [...prev, tile.id]);

        // Points & combo
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

        // Check if word is now completed
        const isNowComplete = slotIdx === targetWord.length - 1;
        if (isNowComplete) {
          sfx.wordComplete();
          setFeedback({
            kind: 'complete',
            text: 'Word completed successfully!',
            points: CORRECT_POINTS,
          });

          // Focus next button
          setTimeout(() => {
            nextButtonRef.current?.focus();
          }, 150);
        }
      } else {
        // Wrong letter!
        sfx.wrong();
        setIsInputLocked(true);

        // Put the letter into the slot with 'wrong' status (Red box, white text)
        const nextSlots = [...slots];
        nextSlots[slotIdx] = {
          char: tile.char,
          status: 'wrong',
          tileId: tile.id,
        };
        setSlots(nextSlots);

        // Deduct 5 points (minimum 0)
        setScore((prev) => Math.max(0, prev - MISTAKE_PENALTY));
        setTotalMistakes((prev) => prev + 1);
        setWordMistakes((prev) => prev + 1);
        setCombo(0);

        setFeedback({
          kind: 'wrong',
          text: `-${MISTAKE_PENALTY} Incorrect letter`,
          points: -MISTAKE_PENALTY,
        });

        // After a brief shake (~650ms), return the letter so user can try again
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

  /**
   * Reset current word placed letters
   */
  const handleResetWord = () => {
    resetWordState(targetWord);
  };

  /**
   * Advance to the next question or complete game
   */
  const handleNextQuestion = () => {
    if (currentIndex + 1 >= questions.length) {
      // Completed all questions!
      sfx.victory();
      setIsCompleted(true);
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  /**
   * Restart entire game with new randomized questions
   */
  const handleRestartGame = () => {
    const shuffled = shuffleArray(questionTagsQuestions);
    setQuestions(shuffled);
    setCurrentIndex(0);
    setScore(0);
    setCombo(0);
    setTotalMistakes(0);
    setElapsedSeconds(0);
    setIsCompleted(false);
    resetWordState(shuffled[0].word);
  };

  // Physical keyboard listener (Type letters A-Z, Enter, Backspace)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input or modifying keys
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
        // Undo last placed letter if possible
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
        // Find available tile matching this letter
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

  // Calculate completion statistics
  const totalLetters = useMemo(() => {
    return questions.reduce((sum, q) => sum + q.word.length, 0);
  }, [questions]);

  const accuracyPercent = useMemo(() => {
    const totalAttempts = totalLetters + totalMistakes;
    if (totalAttempts === 0) return 100;
    return Math.max(0, Math.round((totalLetters / totalAttempts) * 100));
  }, [totalLetters, totalMistakes]);

  return (
    <div className="w-full">
      {/* Top Header & Navigation Bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl bg-white px-3.5 py-2 text-sm font-bold text-slate-700 shadow-xs ring-1 ring-slate-200 transition-all hover:bg-slate-50 hover:text-brand-700"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Challenges
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

          {/* Combo Badge (if combo >= 2) */}
          {combo >= 2 && (
            <div className="flex items-center gap-1 rounded-xl bg-amber-500 px-3 py-2 text-xs font-black text-white shadow-sm animate-bounce">
              <span>🔥</span>
              <span>x{combo}</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Game Card */}
      {!isCompleted ? (
        <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/90">
          {/* Progress Bar & Question Counter Header */}
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

            {/* Visual Progress Bar */}
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200/90">
              <div
                className="h-full rounded-full bg-linear-to-r from-brand-600 to-brand-500 transition-all duration-300"
                style={{
                  width: `${((currentIndex + (isWordFinished ? 1 : 0)) / questions.length) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* Question Clue & Target Word Area */}
          <div className="px-5 py-7 sm:px-10 sm:py-9">
            {/* Clue Prompt */}
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

            {/* Dynamic Feedback Floating Badge */}
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

            {/* TARGET WORD SLOTS (The ordered boxes) */}
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
                      {/* Letter Display */}
                      {slot.char ? (
                        <span>{slot.char}</span>
                      ) : (
                        <span className="text-xs font-bold text-slate-300 sm:text-sm">
                          {index + 1}
                        </span>
                      )}

                      {/* Small Active Cursor Dot for Current Slot */}
                      {isCurrentTarget && !slot.char && (
                        <span className="absolute bottom-1.5 h-1.5 w-4 rounded-full bg-brand-500 animate-pulse" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SCRAMBLED LETTER POOL (Interactive Buttons) */}
            <div className="rounded-2xl bg-slate-50/90 p-5 ring-1 ring-inset ring-slate-200/80 sm:p-7">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  Available letters (Click or type):
                </span>
                <span className="text-xs text-slate-400">
                  {scrambledTiles.filter((t) => !usedTileIds.includes(t.id)).length} remaining
                </span>
              </div>

              {/* Tiles Grid */}
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

              {/* Bottom Quick Controls (Reset word) */}
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

            {/* Word Solved Educational Box */}
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

          {/* Footer Stats */}
          <div className="flex flex-wrap items-center justify-between border-t border-slate-100 bg-slate-50/60 px-6 py-3 text-xs text-slate-500">
            <div>
              Mistakes on this word: <strong className="text-slate-700">{wordMistakes}</strong>
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
          <div className="mx-auto max-w-xl text-center">
            {/* Trophy Icon */}
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-100 text-4xl shadow-inner ring-4 ring-amber-200">
              🏆
            </div>

            <span className="mt-4 inline-block rounded-full bg-emerald-100 px-3.5 py-1 text-xs font-black text-emerald-800 uppercase tracking-wider">
              Challenge Completed!
            </span>

            <h2 className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl">
              Great job with Question Tags!
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              You have successfully mastered all 10 essential question tags concepts.
            </p>

            {/* Score Highlights Grid */}
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

            {/* Vocabulary Review Accordion/List */}
            <div className="mt-8 text-left">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-600 mb-3">
                Summary of Concepts Learned:
              </h3>
              <div className="max-h-64 overflow-y-auto rounded-2xl border border-slate-200 divide-y divide-slate-100 bg-slate-50/50 p-2">
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
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleRestartGame}
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
