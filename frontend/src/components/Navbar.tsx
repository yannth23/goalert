import Link from 'next/link';

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">

        <div className="flex items-center gap-2">
          <span className="text-2xl">⚽</span>

          <h1 className="text-yellow-500 font-black text-xl">
            GOALALERT
          </h1>
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