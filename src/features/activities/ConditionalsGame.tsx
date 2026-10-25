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
import { useEffect, useMemo, useState } from 'react';
import { sfx } from './utils/soundEffects';
import { formatTime, shuffle } from './utils/gameUtils';
import GameShell from './components/GameShell';
import GameSummary from './components/GameSummary';
import { conditionalQuestions, tokenizeSentence } from './data/conditionals';

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
  bankOrder: string[][];
  filledSlots: number[][];
  usedTokenIds: string[][];
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

function shuffleBank(ids: string[]) {
  const result = shuffle(ids);

  // Evita que el banco salga ya en el orden correcto.
  if (result.length > 1 && result.every((id, index) => id === ids[index])) {
    [result[0], result[1]] = [result[1], result[0]];
  }

  return result;
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
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const questionIndex = progress.questionOrder[progress.currentQuestion] ?? 0;
  const question = conditionalQuestions[questionIndex] ?? conditionalQuestions[0];
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
      sfx.simpleCorrect();
      const isQuestionComplete = filledSlots.length + 1 === totalWords;
      const isLastQuestion = progress.currentQuestion === conditionalQuestions.length - 1;
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
    sfx.simpleWrong();
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
    <GameShell
      title="Conditionals: Build the Sentences"
      subtitle="UAO English Lab • Self-paced module"
      current={completedCount}
      total={conditionalQuestions.length}
      score={progress.score}
      elapsedSeconds={progress.elapsedSeconds}
      progressLabel="PROGRESS"
      contentClassName="bg-sky-50/60 p-5 sm:p-8"
      footer={
        <>
          <span>Time for this sentence: {formatTime(progress.questionSeconds)}</span>
          <button
            type="button"
            onClick={restartChallenge}
            className="cursor-pointer font-bold text-brand-700 hover:underline"
          >
            Restart challenge
          </button>
        </>
      }
    >
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

      {progress.completed && (
        <GameSummary
          title="Activity completed!"
          description="You correctly organized all the Conditionals sentences."
          score={progress.score}
          time={progress.elapsedSeconds}
          bestScore={progress.bestScore}
          onRestart={restartChallenge}
        />
      )}
    </GameShell>
  );
}
