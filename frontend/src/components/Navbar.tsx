'use client';

import { useState } from 'react';
import Link from 'next/link';
import { GoalAlertLogo } from './GoalAlertLogo';

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">

        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <GoalAlertLogo size={28} />
            <span className="text-yellow-500 font-black text-xl tracking-tight">
              GOALALERT
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-sm font-bold text-slate-400 hover:text-white transition-colors">Jogos</Link>
            <Link href="/comparar" className="text-sm font-bold text-indigo-400 hover:text-indigo-300 transition-colors">Comparador AI</Link>
            <Link href="/selecoes" className="text-sm font-bold text-slate-400 hover:text-white transition-colors">Seleções</Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden md:inline-flex bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-5 py-2 rounded-xl transition text-sm"
          >
            Entrar
          </Link>

          <button
            onClick={() => setOpen(prev => !prev)}
            aria-label="Abrir menu"
            className="md:hidden flex flex-col justify-center items-center w-9 h-9 rounded-lg hover:bg-slate-800 transition gap-1.5"
          >
            <span className={`block w-5 h-0.5 bg-white transition-all duration-200 ${open ? 'rotate-45 translate-y-2' : ''}`} />
            <span className={`block w-5 h-0.5 bg-white transition-all duration-200 ${open ? 'opacity-0' : ''}`} />
            <span className={`block w-5 h-0.5 bg-white transition-all duration-200 ${open ? '-rotate-45 -translate-y-2' : ''}`} />
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-slate-800 bg-slate-950 px-4 py-4 flex flex-col gap-2">
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className="text-sm font-bold text-slate-300 hover:text-white py-2.5 px-3 rounded-xl hover:bg-slate-800 transition"
          >
            Jogos
          </Link>
          <Link
            href="/comparar"
            onClick={() => setOpen(false)}
            className="text-sm font-bold text-indigo-400 hover:text-indigo-300 py-2.5 px-3 rounded-xl hover:bg-slate-800 transition"
          >
            Comparador AI
          </Link>
          <Link
            href="/selecoes"
            onClick={() => setOpen(false)}
            className="text-sm font-bold text-slate-300 hover:text-white py-2.5 px-3 rounded-xl hover:bg-slate-800 transition"
          >
            Seleções
          </Link>
          <Link
            href="/login"
            onClick={() => setOpen(false)}
            className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-5 py-3 rounded-xl transition text-sm text-center mt-1"
          >
            Entrar
          </Link>
        </div>
      )}
    </header>
  );
}
