export function AlertBanner() {
  return (
    <section className="px-4 py-8">
      <div className="max-w-6xl mx-auto">

        <div className="bg-gradient-to-r from-green-700 to-green-600 rounded-2xl p-6 shadow-lg">

          <div className="flex items-start gap-4">

            <div className="text-4xl">
              📬
            </div>

            <div>
              <h2 className="text-xl font-bold text-white">
                Receba alertas diários dos jogos
              </h2>

              <p className="text-green-100 mt-2">
                Cadastre seus times favoritos e receba todos os dias
                os jogos, horários e resultados diretamente no seu e-mail.
              </p>

              <a
                href="#signup"
                className="inline-block mt-4 bg-white text-green-700 font-bold px-5 py-3 rounded-xl hover:bg-slate-100 transition"
              >
                Criar conta grátis
              </a>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}