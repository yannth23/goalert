import type { FootballMatch } from '../types';

const STATUS_MAP: Record<string, { label: string; bg: string; text: string; live: boolean }> = {
  NS:  { label: 'Não iniciado',  bg: 'bg-slate-800',   text: 'text-slate-400',  live: false },
  '1H':{ label: '1º Tempo',      bg: 'bg-green-950',   text: 'text-green-400',  live: true  },
  HT:  { label: 'Intervalo',     bg: 'bg-yellow-950',  text: 'text-yellow-400', live: false },
  '2H':{ label: '2º Tempo',      bg: 'bg-green-950',   text: 'text-green-400',  live: true  },
  ET:  { label: 'Prorrogação',   bg: 'bg-green-950',   text: 'text-green-400',  live: true  },
  PEN: { label: 'Pênaltis',      bg: 'bg-orange-950',  text: 'text-orange-400', live: true  },
  FT:  { label: 'Encerrado',     bg: 'bg-slate-800',   text: 'text-slate-500',  live: false },
  PST: { label: 'Adiado',        bg: 'bg-red-950',     text: 'text-red-400',    live: false },
};

// Flags mapped by English API name
const FLAGS: Record<string, string> = {
  'Brazil': '🇧🇷', 'Argentina': '🇦🇷', 'France': '🇫🇷',
  'Germany': '🇩🇪', 'Spain': '🇪🇸', 'Portugal': '🇵🇹',
  'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'United States': '🇺🇸', 'Mexico': '🇲🇽',
  'Japan': '🇯🇵', 'South Korea': '🇰🇷', 'Morocco': '🇲🇦',
  'Nigeria': '🇳🇬', 'Senegal': '🇸🇳', 'Croatia': '🇭🇷',
  'Netherlands': '🇳🇱', 'Belgium': '🇧🇪', 'Uruguay': '🇺🇾',
  'Italy': '🇮🇹', 'Switzerland': '🇨🇭', 'Denmark': '🇩🇰',
  'Australia': '🇦🇺', 'Canada': '🇨🇦', 'Ecuador': '🇪🇨',
  'Ghana': '🇬🇭', 'Qatar': '🇶🇦', 'Poland': '🇵🇱',
  'Tunisia': '🇹🇳', 'Cameroon': '🇨🇲', 'Costa Rica': '🇨🇷',
  'Serbia': '🇷🇸', 'Iran': '🇮🇷', 'Saudi Arabia': '🇸🇦',
  'Colombia': '🇨🇴', 'Chile': '🇨🇱', 'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'Norway': '🇳🇴', 'Ukraine': '🇺🇦', 'Hungary': '🇭🇺',
  'Algeria': '🇩🇿', 'Indonesia': '🇮🇩', 'Slovenia': '🇸🇮',
  'Iraq': '🇮🇶', 'Sweden': '🇸🇪', 'Austria': '🇦🇹',
  'New Zealand': '🇳🇿', 'Egypt': '🇪🇬', "Côte d'Ivoire": '🇨🇮',
  'Ivory Coast': '🇨🇮', 'DR Congo': '🇨🇩', 'South Africa': '🇿🇦',
  'Türkiye': '🇹🇷', 'Turkey': '🇹🇷', 'Bosnia and Herzegovina': '🇧🇦',
  'Slovakia': '🇸🇰', 'Greece': '🇬🇷', 'Romania': '🇷🇴',
  'Wales': '🏴󠁧󠁢󠁷󠁬󠁳󠁿', 'Paraguay': '🇵🇾', 'Peru': '🇵🇪',
  'Bolivia': '🇧🇴', 'Venezuela': '🇻🇪', 'Panama': '🇵🇦',
};

const TEAM_PT: Record<string, string> = {
  'Mexico': 'México', 'South Korea': 'Coreia do Sul',
  'Czech Republic': 'República Tcheca', 'Czechia': 'República Tcheca',
  'South Africa': 'África do Sul', 'Switzerland': 'Suíça',
  'Canada': 'Canadá', 'Serbia': 'Sérvia',
  'Bosnia and Herzegovina': 'Bósnia e Herzegovina', 'Scotland': 'Escócia',
  'Morocco': 'Marrocos', 'Brazil': 'Brasil', 'Chile': 'Chile',
  'United States': 'Estados Unidos', 'Australia': 'Austrália',
  'Türkiye': 'Turquia', 'Turkey': 'Turquia', 'Netherlands': 'Holanda',
  'Germany': 'Alemanha', 'Japan': 'Japão', 'Belgium': 'Bélgica',
  'Costa Rica': 'Costa Rica', 'Portugal': 'Portugal',
  'Argentina': 'Argentina', 'Egypt': 'Egito', 'New Zealand': 'Nova Zelândia',
  'Spain': 'Espanha', 'France': 'França', 'Senegal': 'Senegal',
  'Uruguay': 'Uruguai', 'England': 'Inglaterra', 'Colombia': 'Colômbia',
  'Saudi Arabia': 'Arábia Saudita', 'Iran': 'Irã', 'Nigeria': 'Nigéria',
  'Croatia': 'Croácia', 'Denmark': 'Dinamarca', 'Ecuador': 'Equador',
  'Italy': 'Itália', 'Norway': 'Noruega', 'Iraq': 'Iraque',
  'Poland': 'Polônia', 'Ukraine': 'Ucrânia', 'Hungary': 'Hungria',
  'Algeria': 'Argélia', 'Cameroon': 'Camarões', 'Ghana': 'Gana',
  'Indonesia': 'Indonésia', 'Slovenia': 'Eslovênia', 'Sweden': 'Suécia',
  'Russia': 'Rússia', 'Greece': 'Grécia', 'Romania': 'Romênia',
  'Austria': 'Áustria', 'Qatar': 'Catar', 'Tunisia': 'Tunísia',
  'Ivory Coast': 'Costa do Marfim', "Côte d'Ivoire": 'Costa do Marfim',
  'DR Congo': 'Congo', 'Venezuela': 'Venezuela', 'Paraguay': 'Paraguai',
  'Peru': 'Peru', 'Bolivia': 'Bolívia', 'Jamaica': 'Jamaica',
  'Honduras': 'Honduras', 'Panama': 'Panamá', 'Guatemala': 'Guatemala',
  'Trinidad and Tobago': 'Trinidad e Tobago', 'Uzbekistan': 'Uzbequistão',
  'Slovakia': 'Eslováquia', 'Wales': 'País de Gales',
  'Northern Ireland': 'Irlanda do Norte',
  'Republic of Ireland': 'República da Irlanda', 'Ireland': 'Irlanda',
  'Kosovo': 'Kosovo', 'Albania': 'Albânia',
  'North Macedonia': 'Macedônia do Norte', 'Montenegro': 'Montenegro',
  'Kenya': 'Quênia', 'Mali': 'Mali', 'Angola': 'Angola',
  'Tanzania': 'Tanzânia', 'Zimbabwe': 'Zimbábue',
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

const LIVE_STATUSES = new Set(['1H', '2H', 'ET', 'PEN']);

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
    bg: 'bg-slate-800',
    text: 'text-slate-400',
    live: false,
  };

  const isLive = LIVE_STATUSES.has(match.status);
  const isFinished = match.status === 'FT';
  const hasScore = match.team1Score !== undefined && match.team2Score !== undefined;

  const flag1 = match.team1Flag || FLAGS[match.team1] || '';
  const flag2 = match.team2Flag || FLAGS[match.team2] || '';

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
        <span className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full ${status.bg} ${status.text}`}>
          {status.live && (
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
          )}
          {status.label}
        </span>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 flex flex-col items-end gap-0.5">
          {flag1 && (
            flag1.startsWith('http') 
              ? <img src={flag1} alt={match.team1} className="w-6 h-4 object-contain" />
              : <span className="text-xl leading-none">{flag1}</span>
          )}
          <span className="font-bold text-white text-sm text-right leading-tight">
            {traduzirTime(match.team1)}
          </span>
        </div>

        <div className="flex flex-col items-center px-3">
          {(isLive || isFinished) && hasScore ? (
            <span className={`font-black text-2xl px-4 py-1 rounded-xl ${
              isLive
                ? 'bg-yellow-950/70 text-yellow-400'
                : 'bg-slate-800 text-slate-300'
            }`}>
              {match.team1Score} – {match.team2Score}
            </span>
          ) : (
            <>
              <span className="text-sm text-slate-400 font-semibold">{time}</span>
              <span className="text-xs text-slate-700">vs</span>
            </>
          )}
        </div>

        <div className="flex-1 flex flex-col items-start gap-0.5">
          {flag2 && (
            flag2.startsWith('http') 
              ? <img src={flag2} alt={match.team2} className="w-6 h-4 object-contain" />
              : <span className="text-xl leading-none">{flag2}</span>
          )}
          <span className="font-bold text-white text-sm leading-tight">
            {traduzirTime(match.team2)}
          </span>
        </div>
      </div>

      {match.predictions && (
        <div className="mt-4 pt-4 border-t border-slate-800">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Predições Estatísticas</span>
            <span className="text-[10px] bg-indigo-950 text-indigo-400 px-2 py-0.5 rounded-full font-bold">AI Insight</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-slate-800/50 p-2 rounded-lg text-center">
              <span className="block text-[10px] text-slate-500 mb-0.5">Gols</span>
              <span className="text-xs font-bold text-white">{match.predictions.goalsHome.toFixed(1)} - {match.predictions.goalsAway.toFixed(1)}</span>
            </div>
            <div className="bg-slate-800/50 p-2 rounded-lg text-center">
              <span className="block text-[10px] text-slate-500 mb-0.5">Cartões</span>
              <span className="text-xs font-bold text-white">{match.predictions.cards}</span>
            </div>
            <div className="bg-slate-800/50 p-2 rounded-lg text-center">
              <span className="block text-[10px] text-slate-500 mb-0.5">Faltas</span>
              <span className="text-xs font-bold text-white">{match.predictions.fouls}</span>
            </div>
          </div>
        </div>
      )}

      {highlighted && (
        <div className="mt-3 pt-3 border-t border-yellow-900/40 flex items-center gap-1.5 text-xs text-yellow-500 font-semibold">
          <span>⭐</span>
          <span>Time favorito</span>
        </div>
      )}
    </div>
  );
}
