'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { FootballMatch, TacticalAnalysis } from '@/types';
import { Navbar } from '@/components/Navbar';
import { Loading } from '@/components/Loading';

interface TeamOption {
  id: string;
  name: string;
  flag?: string;
  championship: string;
  tactics?: TacticalAnalysis;
  predictions?: {
    goalsHome: number;
    goalsAway: number;
    cards: number;
    fouls: number;
    expectedGoals?: number;
  };
}

export default function CompararPage() {
  const [matches, setMatches] = useState<FootballMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [team1Id, setTeam1Id] = useState<string>('');
  const [team2Id, setTeam2Id] = useState<string>('');

  useEffect(() => {
    api.getTodayMatches().then(data => {
      setMatches(data);
      setLoading(false);
    });
  }, []);

  // Extrair times únicos das partidas para as opções de seleção
  const teamOptions: TeamOption[] = [];
  const seenTeams = new Set<string>();

  matches.forEach(m => {
    // Adiciona Time 1
    if (!seenTeams.has(m.team1)) {
      seenTeams.add(m.team1);
      teamOptions.push({
        id: `${m.id}_home`,
        name: m.team1,
        flag: m.team1Flag,
        championship: m.championship,
        tactics: m.tactics?.home,
        predictions: m.predictions ? { ...m.predictions } : undefined
      });
    }
    // Adiciona Time 2
    if (!seenTeams.has(m.team2)) {
      seenTeams.add(m.team2);
      teamOptions.push({
        id: `${m.id}_away`,
        name: m.team2,
        flag: m.team2Flag,
        championship: m.championship,
        tactics: m.tactics?.away,
        predictions: m.predictions ? { 
          goalsHome: m.predictions.goalsAway, // Inverte para o time de fora
          goalsAway: m.predictions.goalsHome,
          cards: m.predictions.cards,
          fouls: m.predictions.fouls
        } : undefined
      });
    }
  });

  const t1 = teamOptions.find(t => t.id === team1Id);
  const t2 = teamOptions.find(t => t.id === team2Id);

  const renderStatBar = (label: string, val1: number, val2: number, max: number) => {
    const p1 = Math.min(100, (val1 / (max || 1)) * 100);
    const p2 = Math.min(100, (val2 / (max || 1)) * 100);
    return (
      <div className="mb-6">
        <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
          <span>{val1.toFixed(1)}</span>
          <span>{label}</span>
          <span>{val2.toFixed(1)}</span>
        </div>
        <div className="flex h-3 gap-1">
          <div className="flex-1 bg-slate-800 rounded-full overflow-hidden flex justify-end">
            <div className="bg-indigo-500 h-full transition-all duration-1000" style={{ width: `${p1}%` }} />
          </div>
          <div className="flex-1 bg-slate-800 rounded-full overflow-hidden">
            <div className="bg-orange-500 h-full transition-all duration-1000" style={{ width: `${p2}%` }} />
          </div>
        </div>
      </div>
    );
  };

  if (loading) return <Loading />;

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-black mb-4 bg-gradient-to-r from-indigo-500 to-orange-500 bg-clip-text text-transparent">
            Comparador Tático AI
          </h1>
          <p className="text-slate-400 font-medium">Selecione dois times para um confronto direto de estatísticas avançadas.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl">
            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-2 tracking-widest">Time A</label>
            <select 
              value={team1Id} 
              onChange={(e) => setTeam1Id(e.target.value)}
              className="w-full bg-slate-800 border-none rounded-xl p-4 text-white font-bold focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Selecione um time...</option>
              {teamOptions.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.championship})</option>
              ))}
            </select>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl">
            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-2 tracking-widest">Time B</label>
            <select 
              value={team2Id} 
              onChange={(e) => setTeam2Id(e.target.value)}
              className="w-full bg-slate-800 border-none rounded-xl p-4 text-white font-bold focus:ring-2 focus:ring-orange-500"
            >
              <option value="">Selecione um time...</option>
              {teamOptions.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.championship})</option>
              ))}
            </select>
          </div>
        </div>

        {t1 && t2 ? (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Cabeçalho do Duelo */}
            <div className="flex items-center justify-around bg-slate-900 border border-slate-800 p-12 rounded-[3rem] relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-orange-500/5" />
              <div className="text-center z-10">
                <div className="text-6xl mb-4">
                  {t1.flag?.startsWith('http') ? <img src={t1.flag} className="w-24 h-16 object-contain mx-auto" alt={t1.name} /> : '🏳️'}
                </div>
                <h2 className="text-3xl font-black">{t1.name}</h2>
                <span className="text-indigo-400 font-bold">{t1.tactics?.formation || 'N/A'}</span>
              </div>
              <div className="text-5xl font-black text-slate-800 italic">VS</div>
              <div className="text-center z-10">
                <div className="text-6xl mb-4">
                  {t2.flag?.startsWith('http') ? <img src={t2.flag} className="w-24 h-16 object-contain mx-auto" alt={t2.name} /> : '🏳️'}
                </div>
                <h2 className="text-3xl font-black">{t2.name}</h2>
                <span className="text-orange-400 font-bold">{t2.tactics?.formation || 'N/A'}</span>
              </div>
            </div>

            {/* Gráficos de Comparação */}
            <div className="bg-slate-900/50 border border-slate-800 p-12 rounded-[3rem]">
              <h3 className="text-xl font-black mb-12 text-center uppercase tracking-tighter">Confronto de Dados</h3>
              {renderStatBar("Expectativa de Gols", t1.predictions?.goalsHome || 0, t2.predictions?.goalsHome || 0, 5)}
              {renderStatBar("xG Médio (Qualidade)", t1.tactics?.expectedGoals || 0, t2.tactics?.expectedGoals || 0, 3)}
              {renderStatBar("Intensidade Tática", t1.tactics?.intensity || 0, t2.tactics?.intensity || 0, 100)}
              {renderStatBar("Probabilidade de Domínio", t1.tactics?.gameDominanceProb || 50, t2.tactics?.gameDominanceProb || 50, 100)}
              {renderStatBar("Faltas Projetadas", t1.predictions?.fouls || 0, t2.predictions?.fouls || 0, 30)}
              {renderStatBar("Cartões Projetados", t1.predictions?.cards || 0, t2.predictions?.cards || 0, 10)}
            </div>

            {/* Análise de Probabilidade */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-indigo-950/20 border border-indigo-900/50 p-8 rounded-[2rem]">
                <h4 className="text-indigo-400 font-black text-xl mb-4">Análise AI de Confronto</h4>
                <p className="text-slate-400 leading-relaxed">
                  O duelo entre {t1.name} e {t2.name} promete ser taticamente rico. Enquanto o {t1.name} utiliza uma formação {t1.tactics?.formation} com estilo "{t1.tactics?.dominanceDescription}", 
                  o {t2.name} responde com {t2.tactics?.formation} e foco em "{t2.tactics?.dominanceDescription}". 
                  Matematicamente, a vantagem pende para o {t1.predictions?.goalsHome! > t2.predictions?.goalsHome! ? t1.name : t2.name} devido à eficiência ofensiva projetada de {Math.max(t1.predictions?.goalsHome || 0, t2.predictions?.goalsHome || 0).toFixed(1)} gols.
                </p>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2rem] flex flex-col justify-center items-center text-center">
                <span className="text-[10px] uppercase font-bold text-slate-500 mb-2">Probabilidade de Vitória</span>
                <div className="text-5xl font-black text-white mb-2">
                  {((t1.predictions?.goalsHome || 1) / ((t1.predictions?.goalsHome || 1) + (t2.predictions?.goalsHome || 1) || 1) * 100).toFixed(0)}%
                </div>
                <span className="text-sm text-indigo-400 font-bold">Favorito: {t1.predictions?.goalsHome! > t2.predictions?.goalsHome! ? t1.name : t2.name}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-900/30 border-2 border-dashed border-slate-800 p-24 rounded-[3rem] text-center">
            <div className="text-4xl mb-4">📊</div>
            <p className="text-slate-500 font-medium">Selecione dois times acima para gerar a análise comparativa.</p>
          </div>
        )}
      </main>
    </div>
  );
}
