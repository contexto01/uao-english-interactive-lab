'use client';

import Link from "next/link";
import { useState } from "react";
import AuthStatus from "@/features/auth/AuthStatus";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:flex-nowrap sm:gap-4">
        <Link href="/" className="shrink-0 leading-tight">
          <span className="block text-lg font-extrabold text-brand-700">UAO English</span>
          <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            Interactive Lab
          </span>
        </Link>
        <button
          type="button"
          className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 sm:hidden"
          aria-expanded={isMenuOpen}
          aria-controls="site-navigation"
          aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          <span className="sr-only">{isMenuOpen ? 'Close menu' : 'Open menu'}</span>
          {isMenuOpen ? (
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
            </svg>
          ) : (
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
        <nav
          id="site-navigation"
          className={`${isMenuOpen ? 'flex' : 'hidden'} basis-full flex-col gap-1 border-t border-slate-100 pt-3 text-sm font-semibold text-slate-600 sm:flex sm:basis-auto sm:flex-row sm:items-center sm:justify-end sm:gap-1 sm:border-0 sm:pt-0`}
        >
          <Link href="/#challenges" onClick={() => setIsMenuOpen(false)} className="w-full rounded-lg px-3 py-2 hover:bg-slate-100 sm:w-auto">Challenges</Link>
          <Link href="/#how-it-works" onClick={() => setIsMenuOpen(false)} className="w-full rounded-lg px-3 py-2 hover:bg-slate-100 sm:w-auto">How it works</Link>
          <AuthStatus />
        </nav>
      </div>
    </header>
  );
}
