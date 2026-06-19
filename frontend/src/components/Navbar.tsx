import Link from 'next/link';
import { GoalAlertLogo } from './GoalAlertLogo';

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">

        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <GoalAlertLogo size={30} />
            <h1 className="text-yellow-500 font-black text-xl tracking-tight">
              GOALALERT
            </h1>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-sm font-bold text-slate-400 hover:text-white transition-colors">Jogos</Link>
            <Link href="/comparar" className="text-sm font-bold text-indigo-400 hover:text-indigo-300 transition-colors">Comparador AI</Link>
          </nav>
        </div>

        <Link
          href="/login"
          className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-5 py-2 rounded-xl transition"
        >
          Entrar
        </Link>

      </div>
    </header>
  );
}
