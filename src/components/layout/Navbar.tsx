import Link from "next/link";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="leading-tight">
          <span className="block text-lg font-extrabold text-brand-700">UAO English</span>
          <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            Interactive Lab
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm font-semibold text-slate-600">
          <Link href="/#desafios" className="rounded-lg px-3 py-2 hover:bg-slate-100">Desafíos</Link>
          <Link href="/#como-funciona" className="rounded-lg px-3 py-2 hover:bg-slate-100">Cómo funciona</Link>
        </nav>
      </div>
    </header>
  );
}
