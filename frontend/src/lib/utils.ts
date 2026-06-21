// Utilitários de tradução de times e competições

const TEAM_TRANSLATIONS: Record<string, string> = {
  // Nomes em inglês → português
  'Brazil': 'Brasil',
  'Germany': 'Alemanha',
  'France': 'França',
  'Spain': 'Espanha',
  'England': 'Inglaterra',
  'Portugal': 'Portugal',
  'Argentina': 'Argentina',
  'Netherlands': 'Holanda',
  'Belgium': 'Bélgica',
  'Italy': 'Itália',
  'Croatia': 'Croácia',
  'Serbia': 'Sérvia',
  'Switzerland': 'Suíça',
  'Denmark': 'Dinamarca',
  'Poland': 'Polônia',
  'Ukraine': 'Ucrânia',
  'Sweden': 'Suécia',
  'Norway': 'Noruega',
  'Austria': 'Áustria',
  'Czech Republic': 'Tchéquia',
  'Hungary': 'Hungria',
  'Romania': 'Romênia',
  'Turkey': 'Turquia',
  'Türkiye': 'Turquia',
  'Greece': 'Grécia',
  'Scotland': 'Escócia',
  'Wales': 'País de Gales',
  'Slovakia': 'Eslováquia',
  'Slovenia': 'Eslovênia',
  'Albania': 'Albânia',
  'Georgia': 'Geórgia',
  'United States': 'EUA',
  'Mexico': 'México',
  'Canada': 'Canadá',
  'Ecuador': 'Equador',
  'Colombia': 'Colômbia',
  'Uruguay': 'Uruguai',
  'Chile': 'Chile',
  'Paraguay': 'Paraguai',
  'Bolivia': 'Bolívia',
  'Peru': 'Peru',
  'Venezuela': 'Venezuela',
  'Panama': 'Panamá',
  'Costa Rica': 'Costa Rica',
  'Jamaica': 'Jamaica',
  'Morocco': 'Marrocos',
  'Senegal': 'Senegal',
  'Nigeria': 'Nigéria',
  'Cameroon': 'Camarões',
  'Ghana': 'Gana',
  'Tunisia': 'Tunísia',
  'Egypt': 'Egito',
  'Algeria': 'Argélia',
  "Côte d'Ivoire": 'Costa do Marfim',
  'Ivory Coast': 'Costa do Marfim',
  'South Africa': 'África do Sul',
  'Japan': 'Japão',
  'South Korea': 'Coreia do Sul',
  'Australia': 'Austrália',
  'Iran': 'Irã',
  'Saudi Arabia': 'Arábia Saudita',
  'Qatar': 'Catar',
  'Iraq': 'Iraque',
  'Indonesia': 'Indonésia',
  'China': 'China',
  'India': 'Índia',
  'New Zealand': 'Nova Zelândia',
  'DR Congo': 'RD Congo',
  'Congo DR': 'RD Congo',
};

const COMPETITION_TRANSLATIONS: Record<string, string> = {
  'FIFA World Cup': 'Copa do Mundo FIFA',
  'World Cup': 'Copa do Mundo FIFA',
  'UEFA Champions League': 'Liga dos Campeões',
  'UEFA Europa League': 'Liga Europa',
  'Premier League': 'Premier League',
  'La Liga': 'La Liga',
  'Bundesliga': 'Bundesliga',
  'Serie A': 'Série A',
  'Ligue 1': 'Ligue 1',
  'Copa Libertadores': 'Libertadores',
  'Copa do Brasil': 'Copa do Brasil',
  'Brasileirao': 'Brasileirão',
};

export function traduzirTime(name: string): string {
  return TEAM_TRANSLATIONS[name] ?? name;
}

export function traduzirCompeticao(name: string): string {
  return COMPETITION_TRANSLATIONS[name] ?? name;
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
