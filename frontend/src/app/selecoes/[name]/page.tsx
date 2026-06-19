'use client';

import { use, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { TeamReport } from '@/types';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ name: string }>;
}

export default function SelectionReportPage({ params }: PageProps) {
  const { name } = use(params);
  const [report, setReport] = useState<TeamReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true);
        setError(null);
        const decodedName = decodeURIComponent(name);
        const data = await api.getTeamReport(decodedName);
        setReport(data);
      } catch (err: any) {
        setError(err.message || 'Erro ao carregar relatório');
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [name]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Carregando relatório de {decodeURIComponent(name)}...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <Link href="/" className="text-blue-400 hover:text-blue-300 mb-8 inline-block">
            ← Voltar
          </Link>
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-6 text-red-100">
            <h2 className="text-2xl font-bold mb-2">Erro ao Carregar Relatório</h2>
            <p>{error || 'Não foi possível carregar os dados da seleção'}</p>
          </div>
        </div>
      </div>
    );
  }

  const { profile, statistics, recentMatches, webInsights, aiAnalysis } = report;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="text-blue-400 hover:text-blue-300 mb-4 inline-block">
            ← Voltar
          </Link>
          <h1 className="text-5xl font-bold text-white mb-2">{report.teamName}</h1>
          <p className="text-slate-400">
            Última atualização: {new Date(report.lastUpdated).toLocaleString('pt-BR')}
          </p>
        </div>

        {/* Perfil Tático */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Perfil Tático</h2>
            <div className="space-y-3">
              <div>
                <p className="text-slate-400 text-sm">Formação</p>
                <p className="text-white text-xl font-semibold">{profile.formation}</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Jogador Estrela</p>
                <p className="text-white text-lg">{profile.keyPlayer}</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Intensidade</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-slate-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                      style={{ width: `${profile.intensity}%` }}
                    ></div>
                  </div>
                  <p className="text-white font-semibold">{profile.intensity}/100</p>
                </div>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Estilo de Domínio</p>
                <div className="flex gap-2 mt-2">
                  <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold capitalize">
                    {profile.dominanceStyle}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Descrição</p>
                <p className="text-white italic">{profile.description}</p>
              </div>
            </div>
          </div>

          {/* Estatísticas */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Estatísticas</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-700/50 rounded p-3">
                <p className="text-slate-400 text-xs">Jogos</p>
                <p className="text-white text-2xl font-bold">{statistics.matchesPlayed}</p>
              </div>
              <div className="bg-slate-700/50 rounded p-3">
                <p className="text-slate-400 text-xs">Vitórias</p>
                <p className="text-green-400 text-2xl font-bold">{statistics.wins}</p>
              </div>
              <div className="bg-slate-700/50 rounded p-3">
                <p className="text-slate-400 text-xs">Gols Marcados</p>
                <p className="text-blue-400 text-2xl font-bold">{statistics.goalsFor}</p>
              </div>
              <div className="bg-slate-700/50 rounded p-3">
                <p className="text-slate-400 text-xs">Gols Sofridos</p>
                <p className="text-red-400 text-2xl font-bold">{statistics.goalsAgainst}</p>
              </div>
              <div className="bg-slate-700/50 rounded p-3">
                <p className="text-slate-400 text-xs">Saldo</p>
                <p className={`text-2xl font-bold ${statistics.goalDifference >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {statistics.goalDifference > 0 ? '+' : ''}{statistics.goalDifference}
                </p>
              </div>
              <div className="bg-slate-700/50 rounded p-3">
                <p className="text-slate-400 text-xs">Média de Gols</p>
                <p className="text-white text-2xl font-bold">{statistics.averageGoalsPerMatch.toFixed(1)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Análise de IA */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Análise Tática Profunda</h2>
          <p className="text-slate-300 leading-relaxed">{aiAnalysis}</p>
        </div>

        {/* Partidas Recentes */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Últimos Jogos</h2>
          <div className="space-y-3">
            {recentMatches.length > 0 ? (
              recentMatches.map((match, idx) => (
                <div key={idx} className="bg-slate-700/50 rounded p-4 flex justify-between items-center">
                  <div className="flex-1">
                    <p className="text-white font-semibold">
                      {report.teamName} {match.score} {match.opponent}
                    </p>
                    <p className="text-slate-400 text-sm">{match.date}</p>
                  </div>
                  <div className="text-right">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      match.result === 'Vitória' ? 'bg-green-600 text-white' :
                      match.result === 'Derrota' ? 'bg-red-600 text-white' :
                      'bg-yellow-600 text-white'
                    }`}>
                      {match.result}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-400">Nenhuma partida registrada</p>
            )}
          </div>
        </div>

        {/* Insights Web */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Notícias Recentes</h2>
            <ul className="space-y-2">
              {webInsights.recentNews.map((news, idx) => (
                <li key={idx} className="text-slate-300 flex gap-2">
                  <span className="text-blue-400">•</span>
                  <span>{news}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Análise da Imprensa</h2>
            <p className="text-slate-300 mb-4">{webInsights.pressAnalysis}</p>
            <div className="bg-slate-700/50 rounded p-3">
              <p className="text-slate-400 text-sm">Sentimento da Torcida</p>
              <p className="text-white text-lg font-semibold">{webInsights.teamSentiment}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-slate-400 text-sm py-8 border-t border-slate-700">
          <p>Dados atualizados em tempo real • Análise tática com IA • Copa do Mundo 2026</p>
        </div>
      </div>
    </div>
  );
}
