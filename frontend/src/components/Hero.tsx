export function Hero() {
  return (
    <section className="px-4 pt-10">
      <div className="max-w-6xl mx-auto">

        <div className="bg-gradient-to-b from-slate-900 via-slate-950 to-blue-950 border border-slate-800 rounded-3xl p-10 md:p-16 text-center">

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-yellow-600 text-yellow-500 text-sm font-semibold">
            🏆 Copa do Mundo 2026
          </div>

          <h1 className="mt-6 text-4xl sm:text-6xl md:text-8xl font-black uppercase text-white">
            O Mundo
          </h1>

          <h1 className="text-4xl sm:text-6xl md:text-8xl font-black uppercase text-yellow-500">
            Joga
          </h1>

          <h1 className="text-4xl sm:text-6xl md:text-8xl font-black uppercase text-white">
            Aqui
          </h1>

          <p className="max-w-2xl mx-auto mt-6 text-slate-400 text-base sm:text-lg">
            Análise tática em tempo real — formações, estilos de jogo, domínio e
            probabilidades da Copa do Mundo 2026.
          </p>

          <div className="mt-8 flex justify-center">
            <span className="px-4 py-2 rounded-full bg-red-950 border border-red-700 text-red-400 text-sm">
              🔴 Copa em andamento
            </span>
          </div>

          <div className="flex justify-center gap-4 mt-10 flex-wrap">

            <a
              href="#matches"
              className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-8 py-4 rounded-xl"
            >
              Ver análises táticas
            </a>

            <a
              href="#standings"
              className="border border-slate-700 hover:border-slate-500 px-8 py-4 rounded-xl"
            >
              Ver grupos
            </a>

          </div>

        </div>

      </div>
    </section>
  );
}
