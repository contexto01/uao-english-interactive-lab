'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { User } from '@supabase/supabase-js';
import { challenges } from '@/features/challenges/data/challenges';
import { createClient } from '@/lib/supabase/client';

const STORAGE_KEY = 'uao-english-progress-v1';

export type ProgressRecord = {
  challengeId: string;
  completed: true;
  bestScore: number;
  completedAt: string;
};

type ProgressMap = Record<string, ProgressRecord>;
type ProfileRole = 'student' | 'admin';

type ProgressContextValue = {
  user: User | null;
  role: ProfileRole;
  records: ProgressMap;
  isLoading: boolean;
  syncError: string | null;
  isUnlocked: (challengeId: string) => boolean;
  completeChallenge: (challengeId: string, score: number) => Promise<boolean>;
  signOut: () => Promise<void>;
};

const ProgressContext = createContext<ProgressContextValue | null>(null);

function readGuestProgress(): ProgressMap {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (!value) return {};

    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object') return {};

    const validIds = new Set(challenges.map((challenge) => challenge.id));
    return Object.fromEntries(
      Object.entries(parsed).flatMap(([challengeId, record]) => {
        if (!validIds.has(challengeId) || !record || typeof record !== 'object') return [];
        const candidate = record as Partial<ProgressRecord>;
        if (
          candidate.completed !== true ||
          typeof candidate.bestScore !== 'number' ||
          !Number.isFinite(candidate.bestScore) ||
          candidate.bestScore < 0
        ) {
          return [];
        }

        return [[challengeId, {
          challengeId,
          completed: true,
          bestScore: Math.floor(candidate.bestScore),
          completedAt: typeof candidate.completedAt === 'string' ? candidate.completedAt : new Date().toISOString(),
        } satisfies ProgressRecord]];
      }),
    );
  } catch {
    return {};
  }
}

function writeGuestProgress(records: ProgressMap) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // Progress still remains available in memory for this browser session.
  }
}

function rowsToProgress(
  rows: { challenge_id: string; best_score: number; completed_at: string }[],
): ProgressMap {
  return Object.fromEntries(
    rows.map((row) => [row.challenge_id, {
      challengeId: row.challenge_id,
      completed: true,
      bestScore: row.best_score,
      completedAt: row.completed_at,
    } satisfies ProgressRecord]),
  );
}

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<ProfileRole>('student');
  const [records, setRecords] = useState<ProgressMap>({});
  const [isLoading, setIsLoading] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadProgress() {
      const guestProgress = readGuestProgress();
      setRecords(guestProgress);

      const supabase = createClient();
      if (!supabase) {
        if (active) setIsLoading(false);
        return;
      }

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (!active) return;
      if (userError) {
        if (process.env.NODE_ENV !== 'production') console.error('[auth] Could not validate the Supabase session:', userError);
        setSyncError('We could not validate your Supabase session.');
      }

      const currentUser = userData.user;
      if (!currentUser) {
        setIsLoading(false);
        return;
      }

      setUser(currentUser);
      const email = currentUser.email?.toLowerCase() ?? '';
      if (!email.endsWith('@uao.edu.co')) {
        await supabase.auth.signOut();
        if (active) {
          setUser(null);
          setSyncError('Only @uao.edu.co institutional accounts are allowed.');
          setIsLoading(false);
        }
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', currentUser.id)
        .maybeSingle();
      if (active && profile?.role) setRole(profile.role);
      if (profileError) {
        if (process.env.NODE_ENV !== 'production') {
          console.error('[profile] Could not load the account profile:', {
            code: profileError.code,
            message: profileError.message,
            details: profileError.details,
            hint: profileError.hint,
          });
        }
        setSyncError(`We could not load your account profile (database error ${profileError.code ?? 'unknown'}).`);
      } else if (!profile) {
        setSyncError('Your account profile was not found. Check the Supabase profile trigger and migration.');
      }

      const { data: progressRows, error: progressError } = await supabase
        .from('user_progress')
        .select('challenge_id,best_score,completed_at')
        .eq('user_id', currentUser.id);

      if (!active) return;
      if (progressError) {
        if (process.env.NODE_ENV !== 'production') {
          console.error('[progress] Could not load user_progress:', {
            code: progressError.code,
            message: progressError.message,
            details: progressError.details,
            hint: progressError.hint,
          });
        }
        setSyncError(`We could not load your progress (database error ${progressError.code ?? 'unknown'}).`);
        setIsLoading(false);
        return;
      }

      let merged = rowsToProgress(progressRows ?? []);
      setRecords(merged);

      const guestRecords = readGuestProgress();
      let importedAll = true;
      for (const challenge of challenges) {
        const guestRecord = guestRecords[challenge.id];
        if (!guestRecord) continue;

        const { data, error } = await supabase.rpc('complete_challenge', {
          p_challenge_id: challenge.id,
          p_score: guestRecord.bestScore,
        });
        if (error || !data?.[0]) {
          if (error && process.env.NODE_ENV !== 'production') {
            console.error('[progress] Could not import guest progress:', {
              code: error.code,
              message: error.message,
              details: error.details,
              hint: error.hint,
            });
          }
          importedAll = false;
          setSyncError('We could not import all guest progress. We will try again next time you sign in.');
          break;
        }

        merged = {
          ...merged,
          [challenge.id]: {
            challengeId: challenge.id,
            completed: true,
            bestScore: data[0].best_score,
            completedAt: data[0].completed_at,
          },
        };
      }

      if (importedAll && Object.keys(guestRecords).length > 0) {
        try {
          window.localStorage.removeItem(STORAGE_KEY);
        } catch {
          // Clearing the local cache is best-effort; the RPC is idempotent.
        }
      }

      if (active) {
        setRecords(merged);
        setIsLoading(false);
      }
    }

    void loadProgress().catch(() => {
      if (active) {
        setSyncError('An error occurred while connecting to Supabase.');
        setIsLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  const isUnlocked = useCallback((challengeId: string) => {
    const index = challenges.findIndex((challenge) => challenge.id === challengeId);
    if (index < 0 || challenges[index].activity.status !== 'available') return false;
    return index === 0 || records[challenges[index - 1].id]?.completed === true;
  }, [records]);

  const completeChallenge = useCallback(async (challengeId: string, score: number) => {
    if (isLoading || !Number.isFinite(score) || score < 0) return false;
    const index = challenges.findIndex((challenge) => challenge.id === challengeId);
    if (index < 0 || !isUnlocked(challengeId)) return false;

    const safeScore = Math.floor(score);
    if (!user) {
      const updated = {
        ...records,
        [challengeId]: {
          challengeId,
          completed: true as const,
          bestScore: Math.max(records[challengeId]?.bestScore ?? 0, safeScore),
          completedAt: records[challengeId]?.completedAt ?? new Date().toISOString(),
        },
      };
      setRecords(updated);
      writeGuestProgress(updated);
      return true;
    }

    const supabase = createClient();
    if (!supabase) return false;

    const { data, error } = await supabase.rpc('complete_challenge', {
      p_challenge_id: challengeId,
      p_score: safeScore,
    });

    if (error || !data?.[0]) {
      if (error && process.env.NODE_ENV !== 'production') {
        console.error('[progress] Could not save the result:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });
      }
      setSyncError(`We could not save your result (database error ${error?.code ?? 'unknown'}).`);
      return false;
    }

    setRecords((current) => ({
      ...current,
      [challengeId]: {
        challengeId,
        completed: true,
        bestScore: data[0].best_score,
        completedAt: data[0].completed_at,
      },
    }));
    setSyncError(null);
    return true;
  }, [isLoading, isUnlocked, records, user]);

  const signOut = useCallback(async () => {
    await createClient()?.auth.signOut();
    setUser(null);
    setRole('student');
    setRecords(readGuestProgress());
    setSyncError(null);
  }, []);

  const value = useMemo<ProgressContextValue>(() => ({
    user,
    role,
    records,
    isLoading,
    syncError,
    isUnlocked,
    completeChallenge,
    signOut,
  }), [user, role, records, isLoading, syncError, isUnlocked, completeChallenge, signOut]);

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress() {
  const context = useContext(ProgressContext);
  if (!context) throw new Error('useProgress must be used inside ProgressProvider.');
  return context;
}
