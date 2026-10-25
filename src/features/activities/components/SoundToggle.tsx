'use client';

import { useGameAudio } from '../context/GameAudioProvider';

export default function SoundToggle({ className = '' }: { className?: string }) {
  const { isMuted, toggleMute } = useGameAudio();

  return (
    <button
      type="button"
      onClick={toggleMute}
      aria-label={isMuted ? 'Unmute sound' : 'Mute sound'}
      className={`flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-600 shadow-xs ring-1 ring-slate-200 transition-all hover:bg-slate-50 hover:text-slate-900 ${className}`}
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
  );
}
