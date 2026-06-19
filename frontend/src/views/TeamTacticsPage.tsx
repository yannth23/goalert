'use client';

import { useRouter } from 'next/navigation';
import { useMatches } from '../hooks/useMatches';
import { Loading } from '../components/Loading';
import type { TacticalAnalysis, FootballMatch } from '../types';

const COACHES: Record<string, string> = {
  'Brazil': 'Dorival Júnior',
  'Argentina': 'Lionel Scaloni',
  'France': 'Didier Deschamps',
  'Germany': 'Julian Nagelsmann',
  'Spain': 'Luis de la Fuente',
  'England': 'Thomas Tuchel',
  'Portugal': 'Roberto Martínez',
  'Netherlands': 'Ronald Koeman',
  'Italy': 'Luciano Spalletti',
  'Croatia': 'Zlatko Dalić',
  'Morocco': 'Walid Regragui',
  'Senegal': 'Aliou Cissé',
  'USA': 'Mauricio Pochettino',
  'Mexico': 'Javier Aguirre',
  'Canada': 'Jesse Marsch',
  'Uruguay': 'Marcelo Bielsa',
  'Colombia': 'Néstor Lorenzo',
  'Ecuador': 'Sebastián Beccacece',
  'Chile': 'Ricardo Gareca',
  'Peru': 'Jorge Fossati',
  'Venezuela': 'Fernando Batista',
  'Bolivia': 'Óscar Villegas',
  'Paraguay': 'Gustavo Alfaro',
  'Japan': 'Hajime Moriyasu',
  'South Korea': 'Hong Myung-bo',
  'Australia': 'Tony Popovic',
  'Iran': 'Amir Ghalenoei',
  'Saudi Arabia': 'Hervé Renard',
  'Qatar': 'Branko Ivanković',
  'Nigeria': 'Finidi George',
  'Ghana': 'Otto Addo',
  'Cameroon': 'Marc Brys',
  'Egypt': 'Hossam El-Badry',
  'Algeria': 'Vladimír Weiss',
  'Tunisia': 'Jalel Kadri',
  'Ivory Coast': 'Emerse Faé',
  'Denmark': 'Kasper Hjulmand',
  'Belgium': 'Domenico Tedesco',
  'Switzerland': 'Murat Yakin',
  'Austria': 'Ralf Rangnick',
  'Poland': 'Michał Probierz',
  'Ukraine': 'Serhiy Rebrov',
  'Turkey': 'Vincenzo Montella',
  'Serbia': 'Dragan Stojković',
  'Wales': 'Craig Bellamy',
  'Scotland': 'Steve Clarke',
  'Czech Republic': 'Ivan Hašek',
  'Hungary': 'Marco Rossi',
  'Slovakia': 'Francesco Calzona',
  'New Zealand': 'Darren Bazeley',
  'Panama': 'Thomas Christiansen',
  'Costa Rica': 'Luis Fernando Suárez',
  'Honduras': 'Reinaldo Rueda',
  'Jamaica': 'Heimir Hallgrímsson',
  'South Africa': 'Hugo Broos',
  'Zambia': 'Avram Grant',
  'DR Congo': 'Sébastien Desabre',
  'Mali': 'Éric Chelle',
  'Indonesia': 'Patrick Kluivert',
  'Iraq': 'Jesús Casas',
};

const STYLE_ICON: Record<string, string> = {
  pressing:   '🔥',
  counter:    '⚡',
  possession: '🔵',
  defensive:  '🛡️',
  balanced:   '⚖️',
};
const STYLE_LABEL: Record<string, string> = {
  pressing:   'Pressão',
  counter:    'Contra-ataque',
  possession: 'Posse de bola',
  defensive:  'Defensivo',
  balanced:   'Equilibrado',
};
const STYLE_COLOR: Record<string, string> = {
  pressing:   'text-orange-400',
  counter:    'text-yellow-400',
  possession: 'text-blue-400',
  defensive:  'text-slate-300',
  balanced:   'text-green-400',
};
const STYLE_BG: Record<string, string> = {
  pressing:   'bg-orange-950/60 border-orange-800/40',
  counter:    'bg-yellow-950/60 border-yellow-800/40',
  possession: 'bg-blue-950/60 border-blue-800/40',
  defensive:  'bg-slate-800/60 border-slate-700/40',
  balanced:   'bg-green-950/60 border-green-800/40',
};

const HISTORY_PATTERNS: Record<string, string[]> = {
  pressing:   ['pressing', 'pressing', 'balanced', 'pressing', 'counter'],
  counter:    ['counter', 'balanced', 'counter', 'counter', 'pressing'],
  possession: ['possession', 'possession', 'balanced', 'possession', 'possession'],
  defensive:  ['defensive', 'balanced', 'defensive', 'defensive', 'counter'],
  balanced:   ['balanced', 'counter', 'pressing', 'balanced', 'balanced'],
};

const FLAGS: Record<string, string> = {
  'Brazil': '🇧🇷', 'Argentina': '🇦🇷', 'France': '🇫🇷', 'Germany': '🇩🇪',
  'Spain': '🇪🇸', 'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Portugal': '🇵🇹', 'Netherlands': '🇳🇱',
  'Italy': '🇮🇹', 'Croatia': '🇭🇷', 'Morocco': '🇲🇦', 'Senegal': '🇸🇳',
  'USA': '🇺🇸', 'Mexico': '🇲🇽', 'Canada': '🇨🇦', 'Uruguay': '🇺🇾',
  'Colombia': '🇨🇴', 'Ecuador': '🇪🇨', 'Chile': '🇨🇱', 'Peru': '🇵🇪',
  'Japan': '🇯🇵', 'South Korea': '🇰🇷', 'Australia': '🇦🇺', 'Iran': '🇮🇷',
  'Saudi Arabia': '🇸🇦', 'Nigeria': '🇳🇬', 'Ghana': '🇬🇭', 'Egypt': '🇪🇬',
  'Denmark': '🇩🇰', 'Belgium': '🇧🇪', 'Switzerland': '🇨🇭', 'Poland': '🇵🇱',
  'Turkey': '🇹🇷', 'Serbia': '🇷🇸', 'Wales': '🏴󠁧󠁢󠁷󠁬󠁳󠁿', 'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'Indonesia': '🇮🇩', 'Iraq': '🇮🇶', 'Panama': '🇵🇦', 'Costa Rica': '🇨🇷',
};

const TRANSLATIONS: Record<string, string> = {
  'Brazil': 'Brasil', 'Argentina': 'Argentina', 'France': 'França',
  'Germany': 'Alemanha', 'Spain': 'Espanha', 'England': 'Inglaterra',
  'Portugal': 'Portugal', 'Netherlands': 'Holanda', 'Italy': 'Itália',
  'Croatia': 'Croácia', 'Morocco': 'Marrocos', 'Senegal': 'Senegal',
  'USA': 'EUA', 'Mexico': 'México', 'Canada': 'Canadá', 'Uruguay': 'Uruguai',
  'Colombia': 'Colômbia', 'Ecuador': 'Equador', 'Chile': 'Chile',
  'South Korea': 'Coreia do Sul', 'Japan': 'Japão', 'Australia': 'Austrália',
  'Saudi Arabia': 'Arábia Saudita', 'Iran': 'Irã', 'Nigeria': 'Nigéria',
  'Denmark': 'Dinamarca', 'Belgium': 'Bélgica', 'Switzerland': 'Suíça',
  'Poland': 'Polônia', 'Turkey': 'Turquia', 'Serbia': 'Sérvia',
  'Indonesia': 'Indonésia', 'Iraq': 'Iraque', 'Panama': 'Panamá',
};

function traduzir(name: string) {
  return TRANSLATIONS[name] || name;
}

function IntensityBar({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  const color = pct >= 70 ? 'bg-orange-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-blue-500';
  return (
    <div className="w-full bg-slate-800 rounded-full h-2">
      <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function HistoryDot({ style }: { style: string }) {
  const colors: Record<string, string> = {
    pressing: 'bg-orange-500', counter: 'bg-yellow-500',
    possession: 'bg-blue-500', defensive: 'bg-slate-500', balanced: 'bg-green-500',
  };
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`w-3 h-3 rounded-full ${colors[style] ?? 'bg-slate-600'}`} />
      <span className="text-[8px] text-slate-600 uppercase tracking-wide rotate-[-30deg] origin-top">
        {STYLE_LABEL[style]?.split(' ')[0]}
      </span>
    </div>
  );
}

interface Props {
  teamName: string;
}

export function TeamTacticsPage({ teamName }: Props) {
  const { matches, loading } = useMatches();
  const router = useRouter();

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loading />
      </main>
    );
  }

  const match = matches.find(
    (m) => m.team1 === teamName || m.team2 === teamName,
  ) as FootballMatch | undefined;

  const isHome = match?.team1 === teamName;
  const tactics: TacticalAnalysis | undefined = match?.tactics
    ? isHome ? match.tactics.home : match.tactics.away
    : undefined;

  const flag = FLAGS[teamName] || '🏴';
  const nome = traduzir(teamName);
  const coach = COACHES[teamName] || '—';
  const style = tactics?.dominanceStyle ?? 'balanced';
  const history = HISTORY_PATTERNS[style] ?? HISTORY_PATTERNS['balanced'];

  const opponent = match ? (isHome ? match.team2 : match.team1) : null;
  const matchDate = match
    ? new Date(match.date).toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
      })
    : null;

  return (
    <main className="min-h-screen bg-slate-950 text-white">

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-slate-400 hover:text-white transition text-sm"
          >
            ← Voltar
          </button>
          <div className="w-px h-4 bg-slate-700" />
          <span className="text-sm font-bold text-white truncate">{flag} {nome}</span>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* Card principal */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center gap-4 mb-5">
            <span className="text-5xl leading-none">{flag}</span>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-black text-white">{nome}</h1>
              <p className="text-slate-400 text-sm mt-0.5 flex items-center gap-1">
                <span className="text-slate-600">🧑‍💼</span>
                <span>Técnico: <span className="text-white font-semibold">{coach}</span></span>
              </p>
            </div>
          </div>

          {match && (
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/60 rounded-xl text-sm text-slate-400 mb-4">
              <span className="text-slate-500 text-xs">⚽ Jogo hoje:</span>
              <span className="font-semibold text-white">
                {traduzir(match.team1)} vs {traduzir(match.team2)}
              </span>
              <span className="text-slate-600 text-xs ml-auto shrink-0">{matchDate}</span>
            </div>
          )}

          {tactics ? (
            <>
              {/* Estilo + Formação */}
              <div className="flex gap-3 mb-4">
                <div className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border ${STYLE_BG[style]}`}>
                  <span className="text-2xl leading-none">{STYLE_ICON[style]}</span>
                  <span className={`text-xs font-black uppercase tracking-wide ${STYLE_COLOR[style]}`}>
                    {STYLE_LABEL[style]}
                  </span>
                  <span className="text-[10px] text-slate-500">Estilo</span>
                </div>
                <div className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border bg-slate-800/60 border-slate-700/40">
                  <span className="text-xl font-black text-white">{tactics.formation || '—'}</span>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wide">Formação</span>
                </div>
              </div>

              {/* Intensidade */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs text-slate-500 uppercase tracking-wide font-bold">Intensidade</span>
                  <span className="text-xs font-black text-white">{tactics.intensity ?? 50}/100</span>
                </div>
                <IntensityBar value={tactics.intensity ?? 50} />
              </div>

              {/* Jogador-chave */}
              {tactics.keyPlayer && (
                <div className="flex items-center gap-3 px-4 py-3 bg-yellow-950/30 border border-yellow-800/30 rounded-xl mb-4">
                  <span className="text-xl">⭐</span>
                  <div>
                    <p className="text-[10px] text-yellow-600 uppercase tracking-widest font-bold">Jogador-chave</p>
                    <p className="text-white font-black text-sm leading-tight">{tactics.keyPlayer}</p>
                  </div>
                </div>
              )}

              {/* Descrição tática */}
              {tactics.dominanceDescription && (
                <div className="px-4 py-3 bg-slate-800/40 border border-slate-700/30 rounded-xl mb-4">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1.5">
                    Análise tática
                  </p>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    {tactics.dominanceDescription}
                  </p>
                </div>
              )}

              {/* Escalação */}
              {tactics.lineup && tactics.lineup.length > 0 && (
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2">
                    Escalação provável
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {tactics.lineup.map((player, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-800/60 rounded-lg"
                      >
                        <span className="text-[10px] font-black text-slate-600 w-4 shrink-0">{i + 1}</span>
                        <span className="text-xs text-slate-300 font-medium leading-tight truncate">{player}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-slate-600">
              <p className="text-3xl mb-2">⏳</p>
              <p className="text-sm">Análise tática ainda não disponível</p>
              <p className="text-xs mt-1">Será gerada antes do jogo</p>
            </div>
          )}
        </div>

        {/* Histórico tático */}
        {tactics && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">
              Tendência tática — últimas 5 partidas
            </h2>

            <div className="flex items-end justify-around gap-2 mb-3">
              {history.map((s, i) => {
                const heights: Record<string, number> = {
                  pressing: 72, counter: 56, possession: 80, defensive: 40, balanced: 60,
                };
                const barColors: Record<string, string> = {
                  pressing: 'bg-orange-500/70', counter: 'bg-yellow-500/70',
                  possession: 'bg-blue-500/70', defensive: 'bg-slate-500/70', balanced: 'bg-green-500/70',
                };
                const h = heights[s] ?? 48;
                const isLast = i === history.length - 1;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[9px] text-slate-600">{isLast ? 'Hoje' : `J${i + 1}`}</span>
                    <div
                      className={`w-full rounded-t-lg ${barColors[s]} ${isLast ? 'ring-2 ring-white/20' : ''}`}
                      style={{ height: `${h}px` }}
                    />
                    <span className="text-base leading-none">{STYLE_ICON[s]}</span>
                    <span className="text-[8px] text-slate-600 text-center leading-tight">
                      {STYLE_LABEL[s]?.split(' ')[0]}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-800">
              {Object.entries(
                history.reduce<Record<string, number>>((acc, s) => {
                  acc[s] = (acc[s] ?? 0) + 1;
                  return acc;
                }, {}),
              )
                .sort((a, b) => b[1] - a[1])
                .map(([s, count]) => (
                  <span
                    key={s}
                    className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-slate-800 text-slate-400"
                  >
                    {STYLE_ICON[s]} {STYLE_LABEL[s]}
                    <span className="font-black text-white ml-0.5">{count}x</span>
                  </span>
                ))}
            </div>
          </div>
        )}

        {/* Confronto direto */}
        {opponent && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
              Adversário hoje
            </h2>
            <button
              onClick={() => router.push(`/pais/${encodeURIComponent(opponent)}`)}
              className="w-full flex items-center gap-3 px-4 py-3 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/40 hover:border-slate-600 rounded-xl transition group"
            >
              <span className="text-2xl leading-none">{FLAGS[opponent] || '🏴'}</span>
              <span className="font-bold text-white group-hover:text-yellow-400 transition">
                {traduzir(opponent)}
              </span>
              <span className="ml-auto text-slate-600 group-hover:text-slate-400 transition text-sm">→</span>
            </button>
          </div>
        )}

      </div>
    </main>
  );
}
