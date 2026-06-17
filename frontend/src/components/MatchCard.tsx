import type { FootballMatch } from '../types';

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  NS:  { label: 'Não iniciado',  className: 'bg-slate-800 text-slate-400' },
  '1H':{ label: '● 1º Tempo',    className: 'bg-green-950 text-green-400' },
  HT:  { label: 'Intervalo',     className: 'bg-yellow-950 text-yellow-400' },
  '2H':{ label: '● 2º Tempo',    className: 'bg-green-950 text-green-400' },
  ET:  { label: '● Prorrogação', className: 'bg-green-950 text-green-400' },
  PEN: { label: '● Pênaltis',    className: 'bg-orange-950 text-orange-400' },
  FT:  { label: 'Encerrado',     className: 'bg-slate-800 text-slate-500' },
  PST: { label: 'Adiado',        className: 'bg-red-950 text-red-400' },
};

const TEAM_PT: Record<string, string> = {
  // Grupo A
  'Mexico': 'México',
  'South Korea': 'Coreia do Sul',
  'Czech Republic': 'República Tcheca',
  'Czechia': 'República Tcheca',
  'South Africa': 'África do Sul',
  // Grupo B
  'Switzerland': 'Suíça',
  'Canada': 'Canadá',
  'Serbia': 'Sérvia',
  'Bosnia and Herzegovina': 'Bósnia e Herzegovina',
  // Grupo C
  'Scotland': 'Escócia',
  'Morocco': 'Marrocos',
  'Brazil': 'Brasil',
  'Chile': 'Chile',
  // Grupo D
  'United States': 'Estados Unidos',
  'Australia': 'Austrália',
  'Türkiye': 'Turquia',
  'Turkey': 'Turquia',
  'Netherlands': 'Holanda',
  // Grupo E
  'Germany': 'Alemanha',
  'Japan': 'Japão',
  'Belgium': 'Bélgica',
  'Costa Rica': 'Costa Rica',
  // Grupo F
  'Portugal': 'Portugal',
  'Argentina': 'Argentina',
  'Egypt': 'Egito',
  'New Zealand': 'Nova Zelândia',
  // Grupo G
  'Spain': 'Espanha',
  'France': 'França',
  'Senegal': 'Senegal',
  'Uruguay': 'Uruguai',
  // Grupo H
  'England': 'Inglaterra',
  'Colombia': 'Colômbia',
  'Saudi Arabia': 'Arábia Saudita',
  'Iran': 'Irã',
  // Grupo I
  'Nigeria': 'Nigéria',
  'Croatia': 'Croácia',
  'Denmark': 'Dinamarca',
  'Ecuador': 'Equador',
  // Grupo J
  'Italy': 'Itália',
  'Mexico': 'México',
  'Norway': 'Noruega',
  'Iraq': 'Iraque',
  // Grupo K
  'Poland': 'Polônia',
  'Ukraine': 'Ucrânia',
  'Hungary': 'Hungria',
  'Algeria': 'Argélia',
  // Grupo L
  'Cameroon': 'Camarões',
  'Ghana': 'Gana',
  'Indonesia': 'Indonésia',
  'Slovenia': 'Eslovênia',
  // Outros comuns
  'Sweden': 'Suécia',
  'Russia': 'Rússia',
  'Greece': 'Grécia',
  'Romania': 'Romênia',
  'Austria': 'Áustria',
  'China': 'China',
  'Iran': 'Irã',
  'Qatar': 'Catar',
  'Tunisia': 'Tunísia',
  'Ivory Coast': 'Costa do Marfim',
  "Côte d'Ivoire": 'Costa do Marfim',
  'DR Congo': 'Congo',
  'Venezuela': 'Venezuela',
  'Paraguay': 'Paraguai',
  'Peru': 'Peru',
  'Bolivia': 'Bolívia',
  'Jamaica': 'Jamaica',
  'Honduras': 'Honduras',
  'Panama': 'Panamá',
  'Guatemala': 'Guatemala',
  'Trinidad and Tobago': 'Trinidad e Tobago',
  'Uzbekistan': 'Uzbequistão',
  'Slovakia': 'Eslováquia',
  'Wales': 'País de Gales',
  'Northern Ireland': 'Irlanda do Norte',
  'Republic of Ireland': 'República da Irlanda',
  'Ireland': 'Irlanda',
  'Kosovo': 'Kosovo',
  'Albania': 'Albânia',
  'North Macedonia': 'Macedônia do Norte',
  'Montenegro': 'Montenegro',
  'Kenya': 'Quênia',
  'Senegal': 'Senegal',
  'Mali': 'Mali',
  'Angola': 'Angola',
  'Tanzania': 'Tanzânia',
  'Zimbabwe': 'Zimbábue',
};

const COMPETITION_PT: Record<string, string> = {
  'FIFA World Cup': 'Copa do Mundo FIFA',
  'UEFA Champions League': 'Liga dos Campeões',
  'UEFA Europa League': 'Liga Europa',
  'Premier League': 'Premier League',
  'Primera Division': 'La Liga',
  'Bundesliga': 'Bundesliga',
  'Serie A': 'Serie A',
  'Ligue 1': 'Ligue 1',
  'Brasileirao Serie A': 'Brasileirão Série A',
  'Copa Libertadores': 'Copa Libertadores',
};

function traduzirTime(nome: string): string {
  return TEAM_PT[nome] ?? nome;
}

function traduzirCompeticao(nome: string): string {
  return COMPETITION_PT[nome] ?? nome;
}

const LIVE_STATUSES = new Set(['1H', 'HT', '2H', 'ET', 'PEN']);

interface MatchCardProps {
  match: FootballMatch;
  highlighted?: boolean;
}

export function MatchCard({ match, highlighted }: MatchCardProps) {
  const time = new Date(match.date).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const status = STATUS_MAP[match.status] ?? {
    label: match.status,
    className: 'bg-slate-800 text-slate-400',
  };

  const isLive = LIVE_STATUSES.has(match.status);
  const isFinished = match.status === 'FT';
  const hasScore = match.team1Score !== undefined && match.team2Score !== undefined;

  return (
    <div className={`bg-slate-900 border rounded-2xl p-5 transition-all ${
      highlighted
        ? 'border-yellow-600/50 shadow-yellow-900/20 shadow-lg'
        : 'border-slate-800'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-slate-500 font-medium">
          {traduzirCompeticao(match.championship)}
        </span>
        <span className={`text-xs font-bold px-3 py-1 rounded-full ${status.className}`}>
          {status.label}
        </span>
      </div>

      <div className="flex items-center justify-between gap-4">
        <span className="font-bold text-white flex-1 text-right">
          {traduzirTime(match.team1)}
        </span>

        <div className="flex flex-col items-center px-4">
          {(isLive || isFinished) && hasScore ? (
            <span className={`font-black text-2xl ${isLive ? 'text-yellow-500' : 'text-slate-300'}`}>
              {match.team1Score} · {match.team2Score}
            </span>
          ) : (
            <>
              <span className="text-sm text-slate-400 font-semibold">{time}</span>
              <span className="text-xs text-slate-700">vs</span>
            </>
          )}
        </div>

        <span className="font-bold text-white flex-1">
          {traduzirTime(match.team2)}
        </span>
      </div>

      {highlighted && (
        <div className="mt-3 pt-3 border-t border-yellow-900/40 text-xs text-yellow-500 font-semibold">
          ⭐ Time favorito
        </div>
      )}
    </div>
  );
}
