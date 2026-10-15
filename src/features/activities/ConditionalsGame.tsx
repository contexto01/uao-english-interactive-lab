'use client';

import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { conditionalQuestions, tokenizeSentence } from './data/conditionals';

const STORAGE_KEY = 'uao-english-lab:progress:conditionals';
const PROGRESS_VERSION = 3;
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
  tokenOrder: string[][];
  lockedTokenIds: string[][];
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

function shuffleTokens(ids: string[]) {
  const result = shuffle(ids);

  // Make sure the first word is not already in the correct position.
  if (result.length > 1 && result[0] === ids[0]) {
    [result[0], result[1]] = [result[1], result[0]];
  }

  return result;
}

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function createProgress(tokenSets: Token[][], bestScore = 0, randomize = true): GameProgress {
  const questionIndexes = tokenSets.map((_, index) => index);

  return {
    version: PROGRESS_VERSION,
    currentQuestion: 0,
    questionOrder: randomize ? shuffle(questionIndexes) : questionIndexes,
    tokenOrder: tokenSets.map((tokens) => {
      const ids = tokens.map((token) => token.id);
      return randomize ? shuffleTokens(ids) : ids.length > 1 ? [ids[1], ids[0], ...ids.slice(2)] : ids;
    }),
    lockedTokenIds: tokenSets.map(() => []),
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
  return (
    progress.version === PROGRESS_VERSION &&
    typeof progress.currentQuestion === 'number' &&
    progress.currentQuestion >= 0 &&
    progress.currentQuestion < conditionalQuestions.length &&
    Array.isArray(progress.questionOrder) &&
    progress.questionOrder.length === conditionalQuestions.length &&
    progress.questionOrder.every((index) => typeof index === 'number' && index >= 0 && index < conditionalQuestions.length) &&
    Array.isArray(progress.tokenOrder) &&
    progress.tokenOrder.length === conditionalQuestions.length &&
    progress.tokenOrder.every((tokens) => Array.isArray(tokens)) &&
    Array.isArray(progress.lockedTokenIds) &&
    progress.lockedTokenIds.length === conditionalQuestions.length &&
    progress.lockedTokenIds.every((tokens) => Array.isArray(tokens)) &&
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

type SortableTokenProps = {
  token: Token;
  isCorrect: boolean;
  isWrong: boolean;
  disabled: boolean;
};

function SortableToken({ token, isCorrect, isWrong, disabled }: SortableTokenProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: token.id,
    disabled,
  });

  const stateClass = isCorrect
    ? 'border-emerald-400 bg-emerald-100 text-emerald-800'
    : isWrong
      ? 'border-red-400 bg-red-50 text-red-700'
      : token.punctuation
        ? 'border-transparent bg-transparent px-1 text-slate-700 shadow-none'
        : 'border-slate-200 bg-white text-slate-800';

  return (
    <button
      ref={setNodeRef}
      type="button"
      disabled={disabled}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        touchAction: 'none',
        zIndex: isDragging ? 10 : undefined,
      }}
      {...attributes}
      {...listeners}
      className={`rounded-xl border-2 px-4 py-3 text-base font-extrabold shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:cursor-not-allowed sm:text-lg ${stateClass} ${
        isDragging ? 'opacity-30' : isWrong ? 'animate-[token-shake_420ms_ease-in-out]' : 'hover:border-red-400 hover:bg-red-50'
      }`}
      aria-label={`Palabra ${token.text}. Arrastra para reordenar.`}
    >
      {token.text}
    </button>
  );
}

export default function ConditionalsGame() {
  const tokenSets = useMemo(
    () =>
      conditionalQuestions.map((question) =>
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
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const questionIndex = progress.questionOrder[progress.currentQuestion] ?? 0;
  const question = conditionalQuestions[questionIndex] ?? conditionalQuestions[0];
  const tokens = tokenSets[questionIndex] ?? [];
  const tokenMap = new Map(tokens.map((token) => [token.id, token]));
  const currentTokenOrder = progress.tokenOrder[questionIndex] ?? [];
  const orderedTokens = currentTokenOrder
    .map((id) => tokenMap.get(id))
    .filter((token): token is Token => Boolean(token));
  const expectedIds = tokens.map((token) => token.id);
  const lockedTokenIds = progress.lockedTokenIds[questionIndex] ?? [];
  const activeToken = activeId ? tokenMap.get(activeId) : undefined;
  const currentQuestionComplete = feedback?.kind === 'complete';

  useEffect(() => {
    const loadProgress = window.setTimeout(() => {
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        let restored = false;

        if (stored) {
          const parsed: unknown = JSON.parse(stored);
          if (isValidProgress(parsed)) {
            setProgress(parsed);
            restored = true;
          }
        }

        if (!restored) setProgress(createProgress(tokenSets));
      } catch {
        // A blocked or malformed localStorage entry should not prevent the game from loading.
        setProgress(createProgress(tokenSets));
      } finally {
        setIsHydrated(true);
      }
    }, 0);

    return () => window.clearTimeout(loadProgress);
  }, [tokenSets]);

  useEffect(() => {
    if (!isHydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }, [isHydrated, progress]);

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

  function handleDragStart({ active }: DragStartEvent) {
    if (!isHydrated || progress.completed || currentQuestionComplete) return;
    setActiveId(String(active.id));
    setFeedback(null);
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null);
    if (!isHydrated || progress.completed || currentQuestionComplete || !over) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    const oldIndex = currentTokenOrder.indexOf(activeId);
    const newIndex = currentTokenOrder.indexOf(overId);

    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;
    if (lockedTokenIds.includes(activeId) || lockedTokenIds.includes(overId)) return;

    const nextTokenOrder = [...currentTokenOrder];
    [nextTokenOrder[oldIndex], nextTokenOrder[newIndex]] = [nextTokenOrder[newIndex], nextTokenOrder[oldIndex]];
    const nextLockedTokenIds = expectedIds.filter(
      (id, index) => id === nextTokenOrder[index] || lockedTokenIds.includes(id),
    );
    const newlyLockedCount = nextLockedTokenIds.filter((id) => !lockedTokenIds.includes(id)).length;
    const isQuestionComplete = nextLockedTokenIds.length === expectedIds.length;

    if (newlyLockedCount > 0) {
      const isLastQuestion = progress.currentQuestion === conditionalQuestions.length - 1;
      const points = CORRECT_REWARD * newlyLockedCount;
      const nextCombo = progress.combo + newlyLockedCount;

      setProgress((current) => {
        const nextScore = current.score + points;
        return {
          ...current,
          tokenOrder: current.tokenOrder.map((order, index) => (index === questionIndex ? nextTokenOrder : order)),
          lockedTokenIds: current.lockedTokenIds.map((ids, index) => (index === questionIndex ? nextLockedTokenIds : ids)),
          score: nextScore,
          combo: nextCombo,
          correctAnswers: isQuestionComplete ? current.correctAnswers + 1 : current.correctAnswers,
          completed: isQuestionComplete && isLastQuestion,
          bestScore: isQuestionComplete && isLastQuestion ? Math.max(current.bestScore, nextScore) : current.bestScore,
        };
      });
      setFeedback({
        kind: isQuestionComplete ? 'complete' : 'correct',
        points,
        combo: nextCombo,
      });
      return;
    }

    setProgress((current) => ({
      ...current,
      tokenOrder: current.tokenOrder.map((order, index) => (index === questionIndex ? nextTokenOrder : order)),
      score: Math.max(0, current.score - (current.score > 0 ? MISTAKE_PENALTY : 0)),
      questionMistakes: current.questionMistakes + 1,
      totalMistakes: current.totalMistakes + 1,
      combo: 0,
    }));
    setFeedback({
      kind: 'wrong',
      tokenId: activeId,
      points: progress.score > 0 ? -MISTAKE_PENALTY : undefined,
    });
  }

  function handleDragCancel() {
    setActiveId(null);
  }

  function continueToNextQuestion() {
    if (progress.currentQuestion >= conditionalQuestions.length - 1) return;

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

  const completedCount = progress.completed ? conditionalQuestions.length : progress.currentQuestion;

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/70">
      <div className="border-b border-slate-100 bg-white px-5 py-5 sm:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-brand-700">
              UAO English Lab • Módulo autónomo
            </p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              Conditionals: Build the Sentences
            </h2>
          </div>
          <div className="rounded-full bg-slate-50 px-4 py-2 text-sm font-bold text-slate-600 ring-1 ring-slate-100">
            Puntaje total: <span className="text-xl text-emerald-700">{progress.score}</span> pts
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-red-700 via-rose-600 to-red-600 px-5 py-4 text-white sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm font-extrabold uppercase tracking-wide">
          <span>Errores: {progress.totalMistakes}</span>
          <span className="rounded-full bg-white/15 px-4 py-2 normal-case tracking-normal">Conditionals Challenge</span>
          <span>Puntos: {progress.score} pts</span>
        </div>
      </div>

      <div className="bg-sky-50/60 p-5 sm:p-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 text-sm font-bold text-slate-600">
          <span>Pregunta {Math.min(progress.currentQuestion + 1, conditionalQuestions.length)} / {conditionalQuestions.length}</span>
          <span>Progreso: {completedCount} / {conditionalQuestions.length}</span>
          <span>Tiempo: {formatTime(progress.elapsedSeconds)}</span>
        </div>

        <div className="mb-6 h-2 overflow-hidden rounded-full bg-sky-100">
          <div
            className="h-full rounded-full bg-emerald-400 transition-all duration-500"
            style={{ width: `${(completedCount / conditionalQuestions.length) * 100}%` }}
          />
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100 sm:p-8">
          <div className="mb-6 text-center">
            <p className="text-sm font-bold text-brand-700">Ordena las palabras</p>
            <p className="mt-2 text-slate-500">Arrastra las palabras para construir correctamente la oración.</p>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <SortableContext items={currentTokenOrder} strategy={rectSortingStrategy}>
              <div className="mb-4 flex h-12 items-center justify-center" aria-live="assertive">
                {feedback && feedback.points !== undefined && (
                  <div
                    className={`rounded-full px-5 py-2 text-lg font-black shadow-sm ${
                      feedback.kind === 'wrong'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-emerald-100 text-emerald-700'
                    } animate-[score-pop_420ms_ease-out]`}
                  >
                    {feedback.points !== undefined && (feedback.points > 0 ? `+${feedback.points}` : feedback.points)}
                    {feedback.combo && feedback.combo > 1 ? ` · Combo x${feedback.combo}` : ''}
                  </div>
                )}
              </div>
              <div
                className="flex min-h-32 flex-wrap items-center justify-center gap-2 rounded-2xl bg-slate-50 p-5 ring-1 ring-inset ring-slate-100"
                aria-label="Palabras para ordenar"
                aria-live="polite"
              >
                {orderedTokens.map((token) => (
                  <SortableToken
                    key={token.id}
                    token={token}
                    isCorrect={lockedTokenIds.includes(token.id)}
                    isWrong={feedback?.kind === 'wrong' && feedback.tokenId === token.id}
                    disabled={lockedTokenIds.includes(token.id) || currentQuestionComplete || progress.completed}
                  />
                ))}
              </div>
            </SortableContext>
            <DragOverlay dropAnimation={null}>
              {activeToken ? (
                <div className="rounded-xl border-2 border-red-400 bg-white px-4 py-3 text-base font-extrabold text-slate-800 shadow-xl sm:text-lg">
                  {activeToken.text}
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>

          {currentQuestionComplete && !progress.completed && (
            <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
              <p className="font-extrabold text-emerald-800">Regla aplicada</p>
              <p className="mt-1 text-sm leading-6 text-emerald-900/75">{question.explanation}</p>
              <button
                type="button"
                onClick={continueToNextQuestion}
                className="mt-4 w-full rounded-xl bg-brand-700 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-brand-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
              >
                Siguiente oración →
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-100 bg-white px-5 py-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <span>Tiempo de esta oración: {formatTime(progress.questionSeconds)}</span>
        <button type="button" onClick={restartChallenge} className="font-bold text-brand-700 hover:underline">
          Reiniciar desafío
        </button>
      </div>

      {progress.completed && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/60 p-5 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 text-center shadow-2xl sm:p-8">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl">★</div>
            <p className="mt-5 text-sm font-extrabold uppercase tracking-[0.18em] text-brand-700">Módulo superado</p>
            <h3 className="mt-3 text-3xl font-extrabold text-slate-900">¡Actividad completada!</h3>
            <p className="mt-3 leading-7 text-slate-600">
              Has organizado correctamente todas las oraciones de Conditionals.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3 text-left">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Puntaje final</p>
                <p className="mt-1 text-2xl font-extrabold text-emerald-700">{progress.score} pts</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Tiempo total</p>
                <p className="mt-1 text-2xl font-extrabold text-slate-900">{formatTime(progress.elapsedSeconds)}</p>
              </div>
            </div>

            <p className="mt-4 text-sm font-bold text-slate-500">
              {progress.correctAnswers} de {conditionalQuestions.length} oraciones correctas · Mejor puntaje: {progress.bestScore} pts
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={restartChallenge}
                className="flex-1 rounded-xl bg-brand-700 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-brand-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
              >
                Repetir desafío
              </button>
              <Link
                href="/#desafios"
                className="flex-1 rounded-xl bg-slate-100 px-5 py-3 text-sm font-extrabold text-slate-700 transition hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
              >
                Finalizar sesión
              </Link>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
