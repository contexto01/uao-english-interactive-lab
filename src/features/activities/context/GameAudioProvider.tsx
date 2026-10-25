'use client';

import { createContext, ReactNode, useContext, useState } from 'react';
import { sfx } from '../utils/soundEffects';

type GameAudioContextValue = {
  isMuted: boolean;
  toggleMute: () => void;
};

const GameAudioContext = createContext<GameAudioContextValue | null>(null);

export function GameAudioProvider({ children }: { children: ReactNode }) {
  const [isMuted, setIsMuted] = useState(false);

  const toggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev;
      sfx.enabled = !next;
      return next;
    });
  };

  return (
    <GameAudioContext.Provider value={{ isMuted, toggleMute }}>
      {children}
    </GameAudioContext.Provider>
  );
}

export function useGameAudio() {
  const context = useContext(GameAudioContext);
  if (!context) {
    throw new Error('useGameAudio must be used within a GameAudioProvider');
  }
  return context;
}
