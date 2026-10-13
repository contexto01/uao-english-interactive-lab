'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { conditionalQuestions, tokenizeSentence } from './data/conditionals';

const STORAGE_KEY = 'uao-english-lab:progress:conditionals';
const PROGRESS_VERSION = 1;
const STARTING_LIVES = 5;

type Token = {
  id: string;
  text: string;
  punctuation: boolean;
};

type GameProgress = {
  version: number;
  currentQuestion: number;
  selectedIds: string[];
  shuffledTokenIds: string[][];
  score: number;
  lives: number;
  elapsedSeconds: number;
  questionSeconds: number;
  questionMistakes: number;
  totalMistakes: number;
  correctAnswers: number;
  completed: boolean;
  bestScore: number;
};

type Feedback = {
  kind: 'correct' | 'wrong' | 'complete';
  message: string;
  tokenId?: string;
};

function shuffle<T>(items: T[]) {
  const result = [...items];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
  }

  return result;
}

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function createProgress(tokenSets: Token[][], bestScore = 0, randomize = true): GameProgress {
  return {
    version: PROGRESS_VERSION,
    currentQuestion: 0,
    selectedIds: [],
    shuffledTokenIds: tokenSets.map((tokens) => {
      const ids = tokens.map((token) => token.id);
      return randomize ? shuffle(ids) : ids;
    }),
    score: 0,
    lives: STARTING_LIVES,
    elapsedSeconds: 0,
    questionSeconds: 0,
    questionMistakes: 0,
    totalMistakes: 0,
    correctAnswers: 0,
    completed: false,
    bestScore,
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
    Array.isArray(progress.selectedIds) &&
    Array.isArray(progress.shuffledTokenIds) &&
    progress.shuffledTokenIds.length === conditionalQuestions.length &&
    typeof progress.score === 'number' &&
    typeof progress.lives === 'number' &&
    typeof progress.elapsedSeconds === 'number' &&
    typeof progress.questionSeconds === 'number' &&
    typeof progress.questionMistakes === 'number' &&
    typeof progress.totalMistakes === 'number' &&
    typeof progress.correctAnswers === 'number' &&
    typeof progress.completed === 'boolean' &&
    typeof progress.bestScore === 'number'
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
  const [gameOver, setGameOver] = useState(false);
  const [lastAward, setLastAward] = useState<number | null>(null);

  const question = conditionalQuestions[progress.currentQuestion];
  const tokens = tokenSets[progress.currentQuestion] ?? [];
  const tokenMap = new Map(tokens.map((token) => [token.id, token]));
  const answerTokens = progress.selectedIds
    .map((id) => tokenMap.get(id))
    .filter((token): token is Token => Boolean(token));
  const bankTokens = (progress.shuffledTokenIds[progress.currentQuestion] ?? [])
    .map((id) => tokenMap.get(id))
    .filter((token): token is Token => {
      if (!token) return false;
      return !progress.selectedIds.includes(token.id);
    });
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
    if (!isHydrated || progress.completed || gameOver || currentQuestionComplete) return;

    const timer = window.setInterval(() => {
      setProgress((current) => ({
        ...current,
        elapsedSeconds: current.elapsedSeconds + 1,
        questionSeconds: current.questionSeconds + 1,
      }));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [currentQuestionComplete, gameOver, isHydrated, progress.completed]);

  useEffect(() => {
    if (!feedback || feedback.kind === 'complete') return;

    const timeout = window.setTimeout(() => setFeedback(null), 650);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  function handleTokenClick(token: Token) {
    if (!isHydrated || progress.completed || gameOver || currentQuestionComplete) return;

    const expectedToken = tokens[progress.selectedIds.length];

    if (token.id === expectedToken?.id) {
      const selectedIds = [...progress.selectedIds, token.id];
      const isLastToken = selectedIds.length === tokens.length;

      if (!isLastToken) {
        setProgress((current) => ({ ...current, selectedIds }));
        setFeedback({ kind: 'correct', message: '¡Bien! Continúa con la siguiente palabra.' });
        return;
      }

      const points = Math.max(25, 150 - progress.questionSeconds * 2 - progress.questionMistakes * 10);
      const isLastQuestion = progress.currentQuestion === conditionalQuestions.length - 1;

      setProgress((current) => {
        const nextScore = current.score + points;
        return {
          ...current,
          selectedIds,
          score: nextScore,
          correctAnswers: current.correctAnswers + 1,
          completed: isLastQuestion,
          bestScore: isLastQuestion ? Math.max(current.bestScore, nextScore) : current.bestScore,
        };
      });
      setLastAward(points);
      setFeedback({
        kind: 'complete',
        message: isLastQuestion ? '¡Desafío completado!' : '¡Oración correcta!',
      });
      return;
    }

    const remainingLives = progress.lives - 1;
    setProgress((current) => ({
      ...current,
      lives: Math.max(0, remainingLives),
      questionMistakes: current.questionMistakes + 1,
      totalMistakes: current.totalMistakes + 1,
    }));
    setFeedback({
      kind: 'wrong',
      message: remainingLives > 0 ? 'Todavía no. Busca la palabra que continúa la oración.' : 'Se agotaron tus vidas.',
      tokenId: token.id,
    });

    if (remainingLives <= 0) setGameOver(true);
  }

  function continueToNextQuestion() {
    if (progress.currentQuestion >= conditionalQuestions.length - 1) return;

    setProgress((current) => ({
      ...current,
      currentQuestion: current.currentQuestion + 1,
      selectedIds: [],
      questionSeconds: 0,
      questionMistakes: 0,
    }));
    setFeedback(null);
    setLastAward(null);
  }

  function restartChallenge() {
    setProgress(createProgress(tokenSets, progress.bestScore));
    setFeedback(null);
    setGameOver(false);
    setLastAward(null);
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

      <div className="bg-gradient-to-r from-sky-700 via-cyan-600 to-sky-600 px-5 py-4 text-white sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm font-extrabold uppercase tracking-wide">
          <span>
            Vidas <span className="ml-2 text-lg tracking-normal text-pink-200">{'♥'.repeat(progress.lives)}{'♡'.repeat(STARTING_LIVES - progress.lives)}</span>
          </span>
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
            <p className="mt-2 text-slate-500">Selecciona la palabra que debe continuar la oración.</p>
          </div>

          <div className="flex min-h-32 flex-wrap items-center justify-center gap-2 rounded-2xl bg-slate-50 p-5 ring-1 ring-inset ring-slate-100" aria-live="polite">
            {answerTokens.map((token) => (
              <span
                key={token.id}
                className={`rounded-xl px-3 py-2 text-base font-extrabold shadow-sm sm:text-lg ${
                  token.punctuation ? 'bg-transparent px-1 text-slate-700 shadow-none' : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {token.text}
              </span>
            ))}
            {!answerTokens.length && <span className="text-sm font-semibold text-slate-400">Tu oración aparecerá aquí</span>}
            {answerTokens.length > 0 && !currentQuestionComplete && (
              <span className="rounded-xl border-2 border-dashed border-slate-200 px-4 py-2 text-sm font-bold text-slate-300">?</span>
            )}
          </div>

          <div className="mt-7 flex flex-wrap justify-center gap-3" aria-label="Palabras disponibles">
            {bankTokens.map((token) => {
              const isWrong = feedback?.kind === 'wrong' && feedback.tokenId === token.id;
              return (
                <button
                  key={token.id}
                  type="button"
                  onClick={() => handleTokenClick(token)}
                  disabled={currentQuestionComplete || gameOver}
                  className={`rounded-xl border-2 px-4 py-3 text-base font-extrabold shadow-sm transition hover:-translate-y-0.5 hover:border-sky-400 hover:bg-sky-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:cursor-not-allowed sm:text-lg ${
                    isWrong ? 'border-red-400 bg-red-50 text-red-700' : 'border-slate-200 bg-white text-slate-800'
                  }`}
                >
                  {token.text}
                </button>
              );
            })}
          </div>

          <div className="mt-7 min-h-20 rounded-2xl bg-slate-50 p-4 text-center" aria-live="assertive">
            {feedback ? (
              <div className={feedback.kind === 'wrong' ? 'text-red-700' : 'text-emerald-700'}>
                <p className="font-extrabold">{feedback.message}</p>
                {feedback.kind === 'complete' && (
                  <p className="mt-2 text-sm font-semibold text-slate-600">
                    {question.rule} · +{lastAward} puntos
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm font-semibold text-slate-500">Cada respuesta correcta suma puntos según tu rapidez.</p>
            )}
          </div>

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

      {(progress.completed || gameOver) && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/60 p-5 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 text-center shadow-2xl sm:p-8">
            <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full text-3xl ${progress.completed ? 'bg-emerald-100' : 'bg-red-100'}`}>
              {progress.completed ? '★' : '♡'}
            </div>
            <p className="mt-5 text-sm font-extrabold uppercase tracking-[0.18em] text-brand-700">
              {progress.completed ? 'Módulo superado' : 'Fin de la partida'}
            </p>
            <h3 className="mt-3 text-3xl font-extrabold text-slate-900">
              {progress.completed ? '¡Actividad completada!' : 'Se agotaron tus vidas'}
            </h3>
            <p className="mt-3 leading-7 text-slate-600">
              {progress.completed
                ? 'Has organizado correctamente todas las oraciones de Conditionals.'
                : 'Puedes intentarlo nuevamente para mejorar tu puntaje y completar el desafío.'}
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

            {progress.completed && (
              <p className="mt-4 text-sm font-bold text-slate-500">
                {progress.correctAnswers} de {conditionalQuestions.length} oraciones correctas · Mejor puntaje: {progress.bestScore} pts
              </p>
            )}

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
