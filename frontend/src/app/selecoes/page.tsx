'use client';

import { useState } from 'react';
import Link from 'next/link';

const TEAMS_2026 = [
  'Brasil', 'Argentina', 'Uruguai', 'Paraguai', 'Colômbia', 'Equador', 'Peru', 'Venezuela', 'Chile', 'Bolívia',
  'França', 'Alemanha', 'Espanha', 'Portugal', 'Inglaterra', 'Holanda', 'Bélgica', 'Itália', 'Croácia', 'Dinamarca',
  'Suécia', 'Noruega', 'Polônia', 'República Tcheca', 'Hungria', 'Romênia', 'Sérvia', 'Eslováquia', 'Eslovênia', 'Áustria',
  'Suíça', 'Grécia', 'Turquia', 'Irã', 'Iraque', 'Arábia Saudita', 'Catar', 'Emirados Árabes Unidos', 'Japão', 'Coreia do Sul',
  'Austrália', 'Nova Zelândia', 'Vietnã', 'Tailândia', 'Indonésia', 'Singapura', 'Malásia', 'Filipinas', 'Camboja', 'Laos',
  'Egito', 'Marrocos', 'Senegal', 'Nigéria', 'Gana', 'Costa do Marfim', 'Camarões', 'Argélia', 'Tunísia', 'Ruanda',
  'Tanzânia', 'Quênia', 'Zimbábue', 'África do Sul', 'Angola', 'Moçambique', 'Uganda', 'Etiópia', 'Somália', 'Benin',
  'Estados Unidos', 'México', 'Canadá', 'Costa Rica', 'Panamá', 'Honduras', 'El Salvador', 'Guatemala', 'Jamaica', 'Trinidad e Tobago',
];

const FLAGS: Record<string, string> = {
  'Brasil': '🇧🇷', 'Argentina': '🇦🇷', 'Uruguai': '🇺🇾', 'Paraguai': '🇵🇾', 'Colômbia': '🇨🇴',
  'Equador': '🇪🇨', 'Peru': '🇵🇪', 'Venezuela': '🇻🇪', 'Chile': '🇨🇱', 'Bolívia': '🇧🇴',
  'França': '🇫🇷', 'Alemanha': '🇩🇪', 'Espanha': '🇪🇸', 'Portugal': '🇵🇹', 'Inglaterra': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'Holanda': '🇳🇱', 'Bélgica': '🇧🇪', 'Itália': '🇮🇹', 'Croácia': '🇭🇷', 'Dinamarca': '🇩🇰',
  'Suécia': '🇸🇪', 'Noruega': '🇳🇴', 'Polônia': '🇵🇱', 'República Tcheca': '🇨🇿', 'Hungria': '🇭🇺',
  'Romênia': '🇷🇴', 'Sérvia': '🇷🇸', 'Eslováquia': '🇸🇰', 'Eslovênia': '🇸🇮', 'Áustria': '🇦🇹',
  'Suíça': '🇨🇭', 'Grécia': '🇬🇷', 'Turquia': '🇹🇷', 'Irã': '🇮🇷', 'Iraque': '🇮🇶',
  'Arábia Saudita': '🇸🇦', 'Catar': '🇶🇦', 'Emirados Árabes Unidos': '🇦🇪', 'Japão': '🇯🇵', 'Coreia do Sul': '🇰🇷',
  'Austrália': '🇦🇺', 'Nova Zelândia': '🇳🇿', 'Vietnã': '🇻🇳', 'Tailândia': '🇹🇭', 'Indonésia': '🇮🇩',
  'Singapura': '🇸🇬', 'Malásia': '🇲🇾', 'Filipinas': '🇵🇭', 'Camboja': '🇰🇭', 'Laos': '🇱🇦',
  'Egito': '🇪🇬', 'Marrocos': '🇲🇦', 'Senegal': '🇸🇳', 'Nigéria': '🇳🇬', 'Gana': '🇬🇭',
  'Costa do Marfim': '🇨🇮', 'Camarões': '🇨🇲', 'Argélia': '🇩🇿', 'Tunísia': '🇹🇳', 'Ruanda': '🇷🇼',
  'Tanzânia': '🇹🇿', 'Quênia': '🇰🇪', 'Zimbábue': '🇿🇼', 'África do Sul': '🇿🇦', 'Angola': '🇦🇴',
  'Moçambique': '🇲🇿', 'Uganda': '🇺🇬', 'Etiópia': '🇪🇹', 'Somália': '🇸🇴', 'Benin': '🇧🇯',
  'Estados Unidos': '🇺🇸', 'México': '🇲🇽', 'Canadá': '🇨🇦', 'Costa Rica': '🇨🇷', 'Panamá': '🇵🇦',
  'Honduras': '🇭🇳', 'El Salvador': '🇸🇻', 'Guatemala': '🇬🇹', 'Jamaica': '🇯🇲', 'Trinidad e Tobago': '🇹🇹',
};

export default function SelectionsPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTeams = TEAMS_2026.filter(team =>
    team.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">Seleções Copa 2026</h1>
          <p className="text-slate-400 text-lg">
            Explore relatórios táticos detalhados de todas as seleções participantes da Copa do Mundo 2026
          </p>
        </div>

        {/* Search */}
        <div className="mb-8">
          <input
            type="text"
            placeholder="Buscar seleção..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {/* Teams Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredTeams.length > 0 ? (
            filteredTeams.map((team) => (
              <Link
                key={team}
                href={`/selecoes/${encodeURIComponent(team)}`}
                className="group bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-blue-500 hover:bg-slate-700/50 transition-all hover:shadow-lg hover:shadow-blue-500/20"
              >
                <div className="text-center">
                  <div className="text-4xl mb-2">{FLAGS[team] || '⚽'}</div>
                  <h3 className="text-white font-semibold text-sm group-hover:text-blue-400 transition-colors">
                    {team}
                  </h3>
                </div>
              </Link>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <p className="text-slate-400 text-lg">Nenhuma seleção encontrada</p>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="mt-16 pt-8 border-t border-slate-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-4xl font-bold text-blue-400">{TEAMS_2026.length}</p>
              <p className="text-slate-400 mt-2">Seleções Participantes</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-green-400">32</p>
              <p className="text-slate-400 mt-2">Grupos</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-purple-400">64</p>
              <p className="text-slate-400 mt-2">Partidas Totais</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 text-center text-slate-400 text-sm">
          <p>Dados atualizados em tempo real • Análise tática com IA • Copa do Mundo 2026</p>
        </div>
      </div>
    </div>
  );
}
