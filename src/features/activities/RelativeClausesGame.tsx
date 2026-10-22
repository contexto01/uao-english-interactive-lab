'use client';

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { relativeClausesQuestions, tokenizeSentence } from './data/relativeClauses';

const PROGRESS_VERSION = 4;
const MISTAKE_PENALTY = 5;
const CORRECT_REWARD = 10;

type Token = {
  id: string;
  text: string;
  punctuation: boolean;
};

type GameProgress = {
  version: number;
  currentQuestion: number;
  questionOrder: number[];
  bankOrder: string[][]; // orden de las palabras del banco, por pregunta
  filledSlots: number[][]; // posiciones de la oración ya completadas
  usedTokenIds: string[][]; // palabras del banco ya usadas
  score: number;
  elapsedSeconds: number;
  questionSeconds: number;
  questionMistakes: number;
  totalMistakes: number;
  correctAnswers: number;
  completed: boolean;
  bestScore: number;
  combo: number;
};

type Feedback = {
  kind: 'correct' | 'wrong' | 'complete';
  tokenId?: string;
  points?: number;
  combo?: number;
};

function shuffle<T>(items: T[]) {
  const result = [...items];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
  }

  return result;
}

function shuffleBank(ids: string[]) {
  const result = shuffle(ids);

  // Evita que el banco salga ya en el orden correcto.
  if (result.length > 1 && result.every((id, index) => id === ids[index])) {
    [result[0], result[1]] = [result[1], result[0]];
  }

  return result;
}

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function playFeedbackTone(isCorrect: boolean) {
  const AudioContextClass = window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = isCorrect ? 'sine' : 'sawtooth';
  oscillator.frequency.value = isCorrect ? 660 : 180;
  gain.gain.setValueAtTime(0.08, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.18);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.18);
}

function createProgress(tokenSets: Token[][], bestScore = 0, randomize = true): GameProgress {
  const questionIndexes = tokenSets.map((_, index) => index);

  return {
    version: PROGRESS_VERSION,
    currentQuestion: 0,
    questionOrder: randomize ? shuffle(questionIndexes) : questionIndexes,
    bankOrder: tokenSets.map((tokens) => {
      const ids = tokens.filter((token) => !token.punctuation).map((token) => token.id);
      return randomize ? shuffleBank(ids) : [...ids].reverse();
    }),
    filledSlots: tokenSets.map(() => []),
    usedTokenIds: tokenSets.map(() => []),
    score: 0,
    elapsedSeconds: 0,
    questionSeconds: 0,
    questionMistakes: 0,
    totalMistakes: 0,
    correctAnswers: 0,
    completed: false,
    bestScore,
    combo: 0,
  };
}

function isValidProgress(value: unknown): value is GameProgress {
  if (!value || typeof value !== 'object') return false;

  const progress = value as Partial<GameProgress>;
  const total = relativeClausesQuestions.length;
  const isListOfLists = (list: unknown) =>
    Array.isArray(list) && list.length === total && list.every((item) => Array.isArray(item));

  return (
    progress.version === PROGRESS_VERSION &&
    typeof progress.currentQuestion === 'number' &&
    progress.currentQuestion >= 0 &&
    progress.currentQuestion < total &&
    Array.isArray(progress.questionOrder) &&
    progress.questionOrder.length === total &&
    progress.questionOrder.every((index) => typeof index === 'number' && index >= 0 && index < total) &&
    isListOfLists(progress.bankOrder) &&
    isListOfLists(progress.filledSlots) &&
    isListOfLists(progress.usedTokenIds) &&
    typeof progress.score === 'number' &&
    typeof progress.elapsedSeconds === 'number' &&
    typeof progress.questionSeconds === 'number' &&
    typeof progress.questionMistakes === 'number' &&
    typeof progress.totalMistakes === 'number' &&
    typeof progress.correctAnswers === 'number' &&
    typeof progress.completed === 'boolean' &&
    typeof progress.bestScore === 'number' &&
    typeof progress.combo === 'number'
  );
}

/* ---------- Palabra del banco (clic o arrastre) ---------- */

type BankWordProps = {
  token: Token;
  used: boolean;
  isWrong: boolean;
  disabled: boolean;
  onPick: (tokenId: string) => void;
};

function BankWord({ token, used, isWrong, disabled, onPick }: BankWordProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: token.id,
    disabled: disabled || used,
  });

  // Hueco fantasma para que el banco no "salte" cuando se usa una palabra.
  if (used) {
    return (
      <span
        aria-hidden="true"
        className="rounded-xl border-2 border-transparent bg-slate-100 px-4 py-3 text-base font-extrabold text-transparent select-none sm:text-lg"
      >
        {token.text}
      </span>
    );
  }

  return (
    <button
      ref={setNodeRef}
      type="button"
      disabled={disabled}
      onClick={() => onPick(token.id)}
      style={{ touchAction: 'none' }}
      {...attributes}
      {...listeners}
      className={`rounded-xl border-2 border-b-4 px-4 py-3 text-base font-extrabold shadow-sm transition-colors select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 sm:text-lg ${
        disabled ? 'cursor-default' : 'cursor-pointer active:cursor-grabbing'
      } ${
        isWrong
          ? 'animate-[token-shake_420ms_ease-in-out] border-red-400 bg-red-50 text-red-700'
          : 'border-slate-200 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-100'
      } ${isDragging ? 'opacity-30' : ''}`}
       aria-label={`Word ${token.text}. Click or drag it into the sentence.`}
    >
      {token.text}
    </button>
  );
}

/* ---------- Espacio de la oración (destino del arrastre) ---------- */

type SlotProps = {
  index: number;
  token: Token;
  filled: boolean;
  isNext: boolean;
  disabled: boolean;
};

function Slot({ index, token, filled, isNext, disabled }: SlotProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `slot-${index}`, disabled: filled || disabled });

  if (filled) {
    return (
      <span className="animate-[score-pop_420ms_ease-out] rounded-xl border-2 border-b-4 border-emerald-500 bg-emerald-100 px-4 py-3 text-base font-extrabold text-emerald-800 sm:text-lg">
        {token.text}
      </span>
    );
  }

  return (
    <span
      ref={setNodeRef}
       aria-label="Empty slot"
      className={`inline-block min-w-[4.5rem] rounded-xl border-2 border-dashed px-4 py-3 text-base font-extrabold text-transparent select-none transition-colors sm:text-lg ${
        isOver
          ? 'border-slate-500 bg-slate-200'
          : isNext
            ? 'border-slate-400 bg-slate-100'
            : 'border-slate-300 bg-slate-50'
      }`}
    >
      &nbsp;
    </span>
  );
}

/* ---------- Juego ---------- */

export default function ConditionalsGame() {
  const tokenSets = useMemo(
    () =>
      relativeClausesQuestions.map((question) =>
        tokenizeSentence(question.sentence).map((text, index) => ({
          id: `${question.id}-${index}`,
          text,
          punctuation: /^[,.!?]$/.test(text),
        })),
      ),
    [],
  );

  const [progress, setProgress] = useState<GameProgress>(() => createProgress(tokenSets, 0, false));
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isSoundMuted, setIsSoundMuted] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const questionIndex = progress.questionOrder[progress.currentQuestion] ?? 0;
  const question = relativeClausesQuestions[questionIndex] ?? relativeClausesQuestions[0];
  const tokens = tokenSets[questionIndex] ?? [];
  const tokenMap = new Map(tokens.map((token) => [token.id, token]));
  const bankOrder = progress.bankOrder[questionIndex] ?? [];
  const bankTokens = bankOrder
    .map((id) => tokenMap.get(id))
    .filter((token): token is Token => Boolean(token));
  const filledSlots = progress.filledSlots[questionIndex] ?? [];
  const usedTokenIds = progress.usedTokenIds[questionIndex] ?? [];
  const totalWords = tokens.filter((token) => !token.punctuation).length;
  const nextSlotIndex = tokens.findIndex((token, index) => !token.punctuation && !filledSlots.includes(index));
  const activeToken = activeId ? tokenMap.get(activeId) : undefined;
  const currentQuestionComplete = feedback?.kind === 'complete' || filledSlots.length === totalWords;
  const locked = !isHydrated || progress.completed || currentQuestionComplete;

  useEffect(() => {
    const loadProgress = window.setTimeout(() => {
      setProgress(createProgress(tokenSets));
      setIsHydrated(true);
    }, 0);

    return () => window.clearTimeout(loadProgress);
  }, [tokenSets]);

  useEffect(() => {
    if (!isHydrated || progress.completed || currentQuestionComplete) return;

    const timer = window.setInterval(() => {
      setProgress((current) => ({
        ...current,
        elapsedSeconds: current.elapsedSeconds + 1,
        questionSeconds: current.questionSeconds + 1,
      }));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [currentQuestionComplete, isHydrated, progress.completed]);

  function placeToken(tokenId: string, slotIndex: number) {
    if (locked) return;

    const token = tokenMap.get(tokenId);
    const slot = tokens[slotIndex];

    if (!token || !slot || slot.punctuation) return;
    if (filledSlots.includes(slotIndex) || usedTokenIds.includes(tokenId)) return;

    if (token.text === slot.text) {
      if (!isSoundMuted) playFeedbackTone(true);
      const isQuestionComplete = filledSlots.length + 1 === totalWords;
      const isLastQuestion = progress.currentQuestion === relativeClausesQuestions.length - 1;
      const nextCombo = progress.combo + 1;

      setProgress((current) => {
        const nextScore = current.score + CORRECT_REWARD;
        return {
          ...current,
          filledSlots: current.filledSlots.map((slots, index) =>
            index === questionIndex ? [...slots, slotIndex] : slots,
          ),
          usedTokenIds: current.usedTokenIds.map((ids, index) =>
            index === questionIndex ? [...ids, tokenId] : ids,
          ),
          score: nextScore,
          combo: nextCombo,
          correctAnswers: isQuestionComplete ? current.correctAnswers + 1 : current.correctAnswers,
          completed: isQuestionComplete && isLastQuestion,
          bestScore: isQuestionComplete && isLastQuestion ? Math.max(current.bestScore, nextScore) : current.bestScore,
        };
      });
      setFeedback({
        kind: isQuestionComplete ? 'complete' : 'correct',
        points: CORRECT_REWARD,
        combo: nextCombo,
      });
      return;
    }

    setProgress((current) => ({
      ...current,
      score: Math.max(0, current.score - MISTAKE_PENALTY),
      questionMistakes: current.questionMistakes + 1,
      totalMistakes: current.totalMistakes + 1,
      combo: 0,
    }));
    setFeedback({
      kind: 'wrong',
      tokenId,
      points: progress.score > 0 ? -MISTAKE_PENALTY : undefined,
    });
    if (!isSoundMuted) playFeedbackTone(false);
  }

  // Clic: la palabra va al primer espacio vacío.
  function handlePick(tokenId: string) {
    if (nextSlotIndex < 0) return;
    placeToken(tokenId, nextSlotIndex);
  }

  function handleDragStart({ active }: DragStartEvent) {
    if (locked) return;
    setActiveId(String(active.id));
    setFeedback(null);
  }

  // Arrastre: la palabra se evalúa contra el espacio donde se suelta.
  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null);
    if (locked || !over) return;

    const overId = String(over.id);
    if (!overId.startsWith('slot-')) return;

    placeToken(String(active.id), Number(overId.replace('slot-', '')));
  }

  function handleDragCancel() {
    setActiveId(null);
  }

  function continueToNextQuestion() {
    if (progress.currentQuestion >= relativeClausesQuestions.length - 1) return;

    setProgress((current) => ({
      ...current,
      currentQuestion: current.currentQuestion + 1,
      questionSeconds: 0,
      questionMistakes: 0,
      combo: 0,
    }));
    setFeedback(null);
  }

  function restartChallenge() {
    setProgress(createProgress(tokenSets, progress.bestScore));
    setFeedback(null);
    setActiveId(null);
  }

  const completedCount = progress.completed ? relativeClausesQuestions.length : progress.currentQuestion;

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/70">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-5 py-4 sm:px-8">
        <Link href="/" className="rounded-xl bg-white px-3.5 py-2 text-sm font-bold text-slate-700 shadow-xs ring-1 ring-slate-200 hover:text-brand-700">
          ← Challenges
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsSoundMuted((muted) => !muted)}
            aria-label={isSoundMuted ? 'Unmute sound' : 'Mute sound'}
            className="rounded-xl bg-white px-3 py-2 text-lg shadow-xs ring-1 ring-slate-200"
          >
            {isSoundMuted ? '🔇' : '🔊'}
          </button>
          <span className="rounded-xl bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-xs ring-1 ring-slate-200">
            ◷ {formatTime(progress.elapsedSeconds)}
          </span>
          <span className="rounded-xl bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-xs ring-1 ring-slate-200">
            <span className="text-xs font-bold uppercase text-slate-400">Matched</span>{' '}
            {completedCount} / {relativeClausesQuestions.length}
          </span>
          <span className="rounded-xl bg-brand-700 px-4 py-2 text-sm font-black text-white">
            Score {progress.score}
          </span>
        </div>
      </div>

      <div className="border-b border-slate-100 bg-white px-5 py-5 sm:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-brand-700">
               UAO English Lab • Self-paced module
            </p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              Relative Clauses: Build the Sentences
            </h2>
          </div>
        </div>
      </div>

      <div className="bg-sky-50/60 p-5 sm:p-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 text-sm font-bold text-slate-600">
           <span>Question {Math.min(progress.currentQuestion + 1, relativeClausesQuestions.length)} / {relativeClausesQuestions.length}</span>
        </div>

        <div className="mb-6 h-2 overflow-hidden rounded-full bg-sky-100">
          <div
            className="h-full rounded-full bg-emerald-400 transition-all duration-500"
            style={{ width: `${(completedCount / relativeClausesQuestions.length) * 100}%` }}
          />
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100 sm:p-8">
          <div className="mb-6 text-center">
            <p className="text-sm font-bold text-brand-700">Complete the sentence</p>
            <p className="mt-2 text-slate-500">
              Tap a word from the bank or drag it into its place in the sentence.
            </p>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={pointerWithin}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <div className="mb-4 flex h-12 items-center justify-center" aria-live="assertive">
              {feedback && feedback.points !== undefined && (
                <div
                  className={`rounded-full px-5 py-2 text-lg font-black shadow-sm ${
                    feedback.kind === 'wrong' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                  } animate-[score-pop_420ms_ease-out]`}
                >
                  {feedback.points > 0 ? `+${feedback.points}` : feedback.points}
                  {feedback.combo && feedback.combo > 1 ? ` · Combo x${feedback.combo}` : ''}
                </div>
              )}
            </div>

            {/* Oración: puntuación fija + espacios para las palabras */}
            <div
              className="flex min-h-28 flex-wrap items-center justify-center gap-x-2 gap-y-3 rounded-2xl bg-slate-50 p-5 ring-1 ring-inset ring-slate-100"
               aria-label="Sentence to complete"
            >
              {tokens.map((token, index) =>
                token.punctuation ? (
                  <span key={token.id} className="-ml-1 text-2xl font-extrabold text-slate-700">
                    {token.text}
                  </span>
                ) : (
                  <Slot
                    key={token.id}
                    index={index}
                    token={token}
                    filled={filledSlots.includes(index)}
                    isNext={index === nextSlotIndex}
                    disabled={locked}
                  />
                ),
              )}
            </div>

            {/* Banco de palabras */}
            <div
              className="mt-6 flex min-h-20 flex-wrap items-center justify-center gap-3 border-t-2 border-dashed border-slate-100 pt-6"
               aria-label="Word bank"
            >
              {bankTokens.map((token) => (
                <BankWord
                  key={token.id}
                  token={token}
                  used={usedTokenIds.includes(token.id)}
                  isWrong={feedback?.kind === 'wrong' && feedback.tokenId === token.id}
                  disabled={locked}
                  onPick={handlePick}
                />
              ))}
            </div>

            <DragOverlay dropAnimation={null}>
              {activeToken ? (
                <div className="cursor-grabbing rounded-xl border-2 border-slate-400 bg-white px-4 py-3 text-base font-extrabold text-slate-800 shadow-xl sm:text-lg">
                  {activeToken.text}
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>

          {currentQuestionComplete && !progress.completed && (
            <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
               <p className="font-extrabold text-emerald-800">Rule applied</p>
              <p className="mt-1 text-sm leading-6 text-emerald-900/75">{question.explanation}</p>
              <button
                type="button"
                onClick={continueToNextQuestion}
                className="mt-4 w-full cursor-pointer rounded-xl bg-brand-700 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-brand-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
              >
                 Next sentence →
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-100 bg-white px-5 py-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8">
         <span>Time for this sentence: {formatTime(progress.questionSeconds)}</span>
        <button type="button" onClick={restartChallenge} className="cursor-pointer font-bold text-brand-700 hover:underline">
           Restart challenge
        </button>
      </div>

      {progress.completed && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/60 p-5 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 text-center shadow-2xl sm:p-8">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl">★</div>
            <p className="mt-5 text-sm font-extrabold uppercase tracking-[0.18em] text-brand-700">Module passed</p>
            <h3 className="mt-3 text-3xl font-extrabold text-slate-900">Activity completed!</h3>
            <p className="mt-3 leading-7 text-slate-600">
              You correctly organized all the Relative Clauses sentences.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3 text-left">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Final score</p>
                <p className="mt-1 text-2xl font-extrabold text-emerald-700">{progress.score} pts</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Total time</p>
                <p className="mt-1 text-2xl font-extrabold text-slate-900">{formatTime(progress.elapsedSeconds)}</p>
              </div>
            </div>

            <p className="mt-4 text-sm font-bold text-slate-500">
              {progress.correctAnswers} of {relativeClausesQuestions.length} sentences correct · Best score: {progress.bestScore} pts
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={restartChallenge}
                className="flex-1 cursor-pointer rounded-xl bg-brand-700 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-brand-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
              >
                Try challenge again
              </button>
              <Link
                 href="/#challenges"
                className="flex-1 cursor-pointer rounded-xl bg-slate-100 px-5 py-3 text-sm font-extrabold text-slate-700 transition hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
              >
                 End session
              </Link>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
