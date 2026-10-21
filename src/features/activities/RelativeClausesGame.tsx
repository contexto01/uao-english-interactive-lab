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
import {
  relativeClausesQuestions,
  tokenizeSentence,
} from './data/relativeClauses';

const STORAGE_KEY = 'uao-english-lab:progress:relative-clauses';
const PROGRESS_VERSION = 1;
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

function shuffleTokens(ids: string[], tokens: Token[]) {
  // Intentamos obtener una mezcla donde la mayoría de palabras estén desordenadas
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const candidate = shuffle(ids);
    const matchesCount = candidate.filter((id, index) => {
      const currentToken = tokens.find((t) => t.id === id);
      return currentToken && currentToken.text === tokens[index]?.text;
    }).length;

    // Si ninguna palabra coincide con su posición original y el primer elemento cambió
    if (matchesCount === 0 && candidate[0] !== ids[0]) {
      return candidate;
    }
  }

  const fallback = shuffle(ids);
  if (fallback.length > 1 && fallback[0] === ids[0]) {
    [fallback[0], fallback[1]] = [fallback[1], fallback[0]];
  }
  return fallback;
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
      return randomize
        ? shuffleTokens(ids, tokens)
        : ids.length > 1
          ? [ids[1], ids[0], ...ids.slice(2)]
          : ids;
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
  const total = relativeClausesQuestions.length;

  return (
    progress.version === PROGRESS_VERSION &&
    typeof progress.currentQuestion === 'number' &&
    progress.currentQuestion >= 0 &&
    progress.currentQuestion < total &&
    Array.isArray(progress.questionOrder) &&
    progress.questionOrder.length === total &&
    progress.questionOrder.every((index) => typeof index === 'number' && index >= 0 && index < total) &&
    Array.isArray(progress.tokenOrder) &&
    progress.tokenOrder.length === total &&
    progress.tokenOrder.every((tokens) => Array.isArray(tokens)) &&
    Array.isArray(progress.lockedTokenIds) &&
    progress.lockedTokenIds.length === total &&
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
  isSelected: boolean;
  disabled: boolean;
  onClick: () => void;
};

function SortableToken({
  token,
  isCorrect,
  isWrong,
  isSelected,
  disabled,
  onClick,
}: SortableTokenProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: token.id,
    disabled,
  });

  const stateClass = isCorrect
    ? 'border-emerald-400 bg-emerald-100 text-emerald-800 cursor-default'
    : isWrong
      ? 'border-red-400 bg-red-50 text-red-700'
      : isSelected
        ? 'border-brand-600 bg-brand-50 text-brand-900 ring-2 ring-brand-500 scale-105 shadow-md'
        : token.punctuation
          ? 'border-slate-200 bg-slate-100/90 text-slate-800 hover:border-brand-400 hover:bg-brand-50/50'
          : 'border-slate-200 bg-white text-slate-800 hover:border-brand-400 hover:bg-brand-50/50';

  return (
    <button
      ref={setNodeRef}
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        touchAction: 'none',
        zIndex: isDragging ? 20 : isSelected ? 15 : undefined,
      }}
      {...attributes}
      {...listeners}
      className={`relative inline-flex items-center justify-center rounded-xl border-2 px-4 py-3 text-base font-extrabold shadow-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-not-allowed sm:text-lg ${token.punctuation ? 'min-w-[2.75rem] px-2.5' : ''
        } ${stateClass} ${isDragging
          ? 'opacity-30'
          : isWrong
            ? 'animate-[token-shake_420ms_ease-in-out]'
            : ''
        }`}
      aria-label={`Palabra ${token.text}. Arrastra o selecciona para reordenar.`}
    >
      {token.text}
      {isCorrect && (
        <span
          className="ml-1.5 inline-block text-xs font-black text-emerald-600"
          aria-hidden="true"
        >
          ✓
        </span>
      )}
    </button>
  );
}

export default function RelativeClausesGame() {
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
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const questionIndex = progress.questionOrder[progress.currentQuestion] ?? 0;
  const question = relativeClausesQuestions[questionIndex] ?? relativeClausesQuestions[0];
  const tokens = useMemo(() => tokenSets[questionIndex] ?? [], [tokenSets, questionIndex]);
  const tokenMap = useMemo(() => new Map(tokens.map((token) => [token.id, token])), [tokens]);
  const currentTokenOrder = progress.tokenOrder[questionIndex] ?? [];
  const orderedTokens = currentTokenOrder
    .map((id) => tokenMap.get(id))
    .filter((token): token is Token => Boolean(token));
  const lockedTokenIds = progress.lockedTokenIds[questionIndex] ?? [];
  const activeToken = activeId ? tokenMap.get(activeId) : undefined;
  const currentQuestionComplete = feedback?.kind === 'complete';

  // Carga inicial de progreso guardado
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
        setProgress(createProgress(tokenSets));
      } finally {
        setIsHydrated(true);
      }
    }, 0);

    return () => window.clearTimeout(loadProgress);
  }, [tokenSets]);

  // Persistencia en localStorage
  useEffect(() => {
    if (!isHydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }, [isHydrated, progress]);

  // Temporizador de tiempo transcurrido
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

  // Lógica para procesar un intercambio de tokens (tanto por drag como por click)
  function executeSwap(sourceId: string, targetId: string) {
    if (!isHydrated || progress.completed || currentQuestionComplete) return;

    const oldIndex = currentTokenOrder.indexOf(sourceId);
    const newIndex = currentTokenOrder.indexOf(targetId);

    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;
    if (lockedTokenIds.includes(sourceId) || lockedTokenIds.includes(targetId)) return;

    const nextTokenOrder = [...currentTokenOrder];
    [nextTokenOrder[oldIndex], nextTokenOrder[newIndex]] = [nextTokenOrder[newIndex], nextTokenOrder[oldIndex]];

    // Determinamos qué tokens coinciden con la palabra esperada en cada posición
    const nextLockedTokenIds: string[] = [];
    for (let index = 0; index < tokens.length; index += 1) {
      const currentId = nextTokenOrder[index];
      const currentToken = tokenMap.get(currentId);
      const expectedToken = tokens[index];

      if (lockedTokenIds.includes(currentId)) {
        nextLockedTokenIds.push(currentId);
      } else if (currentToken && expectedToken && currentToken.text === expectedToken.text) {
        nextLockedTokenIds.push(currentId);
      }
    }

    const newlyLockedCount = nextLockedTokenIds.filter((id) => !lockedTokenIds.includes(id)).length;
    const isQuestionComplete = nextLockedTokenIds.length === tokens.length;

    if (newlyLockedCount > 0) {
      const isLastQuestion = progress.currentQuestion === relativeClausesQuestions.length - 1;
      const points = CORRECT_REWARD * newlyLockedCount;
      const nextCombo = progress.combo + newlyLockedCount;

      setProgress((current) => {
        const nextScore = current.score + points;
        return {
          ...current,
          tokenOrder: current.tokenOrder.map((order, idx) => (idx === questionIndex ? nextTokenOrder : order)),
          lockedTokenIds: current.lockedTokenIds.map((ids, idx) => (idx === questionIndex ? nextLockedTokenIds : ids)),
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

    // Si falló el movimiento (ninguna palabra quedó en posición correcta): -5 puntos
    setProgress((current) => ({
      ...current,
      tokenOrder: current.tokenOrder.map((order, idx) => (idx === questionIndex ? nextTokenOrder : order)),
      score: Math.max(0, current.score - (current.score > 0 ? MISTAKE_PENALTY : 0)),
      questionMistakes: current.questionMistakes + 1,
      totalMistakes: current.totalMistakes + 1,
      combo: 0,
    }));

    setFeedback({
      kind: 'wrong',
      tokenId: sourceId,
      points: progress.score > 0 ? -MISTAKE_PENALTY : undefined,
    });
  }

  function handleDragStart({ active }: DragStartEvent) {
    if (!isHydrated || progress.completed || currentQuestionComplete) return;
    setActiveId(String(active.id));
    setSelectedTokenId(null);
    setFeedback(null);
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null);
    if (!over) return;
    executeSwap(String(active.id), String(over.id));
  }

  function handleDragCancel() {
    setActiveId(null);
  }

  function handleTokenClick(tokenId: string) {
    if (!isHydrated || progress.completed || currentQuestionComplete) return;
    if (lockedTokenIds.includes(tokenId)) return;

    if (!selectedTokenId) {
      setSelectedTokenId(tokenId);
      return;
    }

    if (selectedTokenId === tokenId) {
      setSelectedTokenId(null);
      return;
    }

    // Intercambiar el token previamente seleccionado con el clickeado
    const source = selectedTokenId;
    setSelectedTokenId(null);
    executeSwap(source, tokenId);
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
    setSelectedTokenId(null);
  }

  function restartChallenge() {
    setProgress(createProgress(tokenSets, progress.bestScore));
    setFeedback(null);
    setActiveId(null);
    setSelectedTokenId(null);
  }

  const completedCount = progress.completed
    ? relativeClausesQuestions.length
    : progress.currentQuestion;

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/70">
      {/* Encabezado */}
      <div className="border-b border-slate-100 bg-white px-5 py-5 sm:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-brand-700">
              UAO English Lab • Módulo interactivo
            </p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              Relative Clauses: Build the Sentences
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-slate-50 px-4 py-2 text-sm font-bold text-slate-600 ring-1 ring-slate-100">
              Puntaje total: <span className="text-xl text-emerald-700">{progress.score}</span> pts
            </div>
          </div>
        </div>
      </div>

      {/* Barra de estado con gradiente temático */}
      <div className="bg-gradient-to-r from-brand-800 via-brand-700 to-rose-600 px-5 py-4 text-white sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm font-extrabold uppercase tracking-wide">
          <span>Errores: {progress.totalMistakes}</span>
          <span className="rounded-full bg-white/15 px-4 py-1.5 normal-case tracking-normal backdrop-blur-xs">
            Relative Clauses Challenge
          </span>
          <span>Puntos: {progress.score} pts</span>
        </div>
      </div>

      {/* Contenedor principal de la actividad */}
      <div className="bg-sky-50/60 p-5 sm:p-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 text-sm font-bold text-slate-600">
          <span>
            Pregunta {Math.min(progress.currentQuestion + 1, relativeClausesQuestions.length)} /{' '}
            {relativeClausesQuestions.length}
          </span>
          <span>
            Progreso: {completedCount} / {relativeClausesQuestions.length}
          </span>
          <span>Tiempo: {formatTime(progress.elapsedSeconds)}</span>
        </div>

        {/* Barra de progreso */}
        <div className="mb-6 h-2 overflow-hidden rounded-full bg-sky-100">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
            style={{
              width: `${(completedCount / relativeClausesQuestions.length) * 100}%`,
            }}
          />
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100 sm:p-8">
          <div className="mb-6 text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700">
              <span>Tipo: {question.relativeType === 'defining' ? 'Defining Relative Clause' : 'Non-defining Relative Clause'}</span>
              <span>•</span>
              <span>Conector: <strong className="underline">{question.relativeWord}</strong></span>
            </div>
            <p className="mt-3 text-lg font-extrabold text-slate-900">Ordena las palabras</p>
            <p className="mt-1 text-sm text-slate-500">
              Arrastra las palabras o haz clic en dos fichas para intercambiarlas y formar la oración.
            </p>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <SortableContext items={currentTokenOrder} strategy={rectSortingStrategy}>
              {/* Animación flotante de feedback de puntuación */}
              <div className="mb-4 flex h-12 items-center justify-center" aria-live="assertive">
                {feedback && feedback.points !== undefined && (
                  <div
                    className={`rounded-full px-5 py-2 text-lg font-black shadow-sm ${feedback.kind === 'wrong'
                        ? 'bg-red-100 text-red-700 animate-[token-shake_420ms_ease-in-out]'
                        : 'bg-emerald-100 text-emerald-700'
                      } animate-[score-pop_420ms_ease-out]`}
                  >
                    {feedback.points > 0 ? `+${feedback.points}` : feedback.points}
                    {feedback.combo && feedback.combo > 1 ? ` · Combo x${feedback.combo} 🔥` : ''}
                  </div>
                )}
              </div>

              {/* Contenedor de fichas de palabras */}
              <div
                className="flex min-h-36 flex-wrap items-center justify-center gap-2.5 rounded-2xl bg-slate-50 p-6 ring-1 ring-inset ring-slate-200/80"
                aria-label="Palabras para ordenar"
                aria-live="polite"
              >
                {orderedTokens.map((token) => (
                  <SortableToken
                    key={token.id}
                    token={token}
                    isCorrect={lockedTokenIds.includes(token.id)}
                    isWrong={feedback?.kind === 'wrong' && feedback.tokenId === token.id}
                    isSelected={selectedTokenId === token.id}
                    disabled={
                      lockedTokenIds.includes(token.id) ||
                      currentQuestionComplete ||
                      progress.completed
                    }
                    onClick={() => handleTokenClick(token.id)}
                  />
                ))}
              </div>
            </SortableContext>

            {/* Ficha superpuesta durante el arrastre */}
            <DragOverlay dropAnimation={null}>
              {activeToken ? (
                <div className="rounded-xl border-2 border-brand-500 bg-white px-4 py-3 text-base font-extrabold text-brand-900 shadow-2xl ring-2 ring-brand-300 sm:text-lg">
                  {activeToken.text}
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>

          {/* Explicación pedagógica al completar la oración */}
          {currentQuestionComplete && !progress.completed && (
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-xs text-white">✓</span>
                <p className="font-extrabold text-emerald-900">¡Oración correcta!</p>
              </div>
              <p className="mt-2 text-sm font-semibold text-emerald-950">
                Regla gramatical: <span className="font-normal text-emerald-900">{question.rule}</span>
              </p>
              <p className="mt-1 text-sm leading-6 text-emerald-800">{question.explanation}</p>
              <button
                type="button"
                onClick={continueToNextQuestion}
                className="mt-4 w-full rounded-xl bg-brand-700 px-5 py-3.5 text-sm font-extrabold text-white transition hover:bg-brand-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
              >
                Siguiente oración →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Pie de página con control de reinicio y tiempo */}
      <div className="flex flex-col gap-3 border-t border-slate-100 bg-white px-5 py-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <span>Tiempo en esta oración: {formatTime(progress.questionSeconds)}</span>
        <button
          type="button"
          onClick={restartChallenge}
          className="font-bold text-brand-700 hover:underline"
        >
          Reiniciar desafío
        </button>
      </div>

      {/* Modal de felicitaciones al completar todo el juego */}
      {progress.completed && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/60 p-5 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 text-center shadow-2xl sm:p-8 animate-[score-pop_350ms_ease-out]">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-4xl shadow-inner">
              🏆
            </div>
            <p className="mt-5 text-xs font-extrabold uppercase tracking-[0.2em] text-brand-700">
              Módulo superado con éxito
            </p>
            <h3 className="mt-2 text-3xl font-extrabold text-slate-900">
              ¡Desafío completado!
            </h3>
            <p className="mt-3 leading-7 text-slate-600">
              Has ordenado correctamente las 8 oraciones de Relative Clauses, dominando pronombres como{' '}
              <em className="font-semibold text-slate-900">who, that, which, whose</em> y el adverbio{' '}
              <em className="font-semibold text-slate-900">where</em>.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3 text-left">
              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Puntaje final</p>
                <p className="mt-1 text-2xl font-extrabold text-emerald-700">{progress.score} pts</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Tiempo total</p>
                <p className="mt-1 text-2xl font-extrabold text-slate-900">{formatTime(progress.elapsedSeconds)}</p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-600 ring-1 ring-slate-100">
              <span>Total de fallos: <strong className="text-rose-600">{progress.totalMistakes}</strong></span>
              <span>Mejor puntaje: <strong className="text-emerald-700">{progress.bestScore} pts</strong></span>
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={restartChallenge}
                className="flex-1 rounded-xl bg-brand-700 px-5 py-3.5 text-sm font-extrabold text-white transition hover:bg-brand-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
              >
                Repetir desafío
              </button>
              <Link
                href="/#desafios"
                className="flex-1 rounded-xl bg-slate-100 px-5 py-3.5 text-sm font-extrabold text-slate-700 transition hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
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
