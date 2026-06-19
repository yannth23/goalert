'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { FootballMatch, TacticalAnalysis } from '@/types';
import { Navbar } from '@/components/Navbar';
import { Loading } from '@/components/Loading';

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

  const t1 = matches.find(m => m.id === team1Id);
  const t2 = matches.find(m => m.id === team2Id);

  const renderStatBar = (label: string, val1: number, val2: number, max: number) => {
    const p1 = (val1 / max) * 100;
    const p2 = (val2 / max) * 100;
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
              {matches.map(m => (
                <option key={m.id} value={m.id}>{m.team1} ({m.championship})</option>
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
              {matches.map(m => (
                <option key={m.id} value={m.id}>{m.team1} ({m.championship})</option>
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
                <div className="text-6xl mb-4">{t1.team1Flag?.startsWith('http') ? <img src={t1.team1Flag} className="w-24 h-16 object-contain mx-auto" /> : '🏳️'}</div>
                <h2 className="text-3xl font-black">{t1.team1}</h2>
                <span className="text-indigo-400 font-bold">{t1.tactics?.home.formation}</span>
              </div>
              <div className="text-5xl font-black text-slate-800 italic">VS</div>
              <div className="text-center z-10">
                <div className="text-6xl mb-4">{t2.team1Flag?.startsWith('http') ? <img src={t2.team1Flag} className="w-24 h-16 object-contain mx-auto" /> : '🏳️'}</div>
                <h2 className="text-3xl font-black">{t2.team1}</h2>
                <span className="text-orange-400 font-bold">{t2.tactics?.home.formation}</span>
              </div>
            </div>

            {/* Gráficos de Comparação */}
            <div className="bg-slate-900/50 border border-slate-800 p-12 rounded-[3rem]">
              <h3 className="text-xl font-black mb-12 text-center uppercase tracking-tighter">Confronto de Dados</h3>
              {renderStatBar("Expectativa de Gols", t1.predictions?.goalsHome || 0, t2.predictions?.goalsHome || 0, 5)}
              {renderStatBar("Posse de Bola (%)", t1.tactics?.home.possession || 0, t2.tactics?.home.possession || 0, 100)}
              {renderStatBar("Intensidade Tática", t1.tactics?.home.intensity || 0, t2.tactics?.home.intensity || 0, 100)}
              {renderStatBar("Faltas por Jogo", t1.predictions?.fouls || 0, t2.predictions?.fouls || 0, 30)}
              {renderStatBar("Cartões", t1.predictions?.cards || 0, t2.predictions?.cards || 0, 10)}
            </div>

            {/* Análise de Probabilidade */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-indigo-950/20 border border-indigo-900/50 p-8 rounded-[2rem]">
                <h4 className="text-indigo-400 font-black text-xl mb-4">Análise AI de Confronto</h4>
                <p className="text-slate-400 leading-relaxed">
                  O duelo entre {t1.team1} e {t2.team1} promete ser equilibrado. Enquanto o {t1.team1} aposta em uma formação {t1.tactics?.home.formation} com foco em {t1.tactics?.home.possession.toFixed(0)}% de posse, 
                  o {t2.team1} traz uma intensidade de {t2.tactics?.home.intensity.toFixed(0)}%. Matematicamente, a vantagem pende levemente para o {t1.predictions?.goalsHome! > t2.predictions?.goalsHome! ? t1.team1 : t2.team1} devido à eficiência ofensiva projetada.
                </p>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2rem] flex flex-col justify-center items-center text-center">
                <span className="text-[10px] uppercase font-bold text-slate-500 mb-2">Probabilidade de Vitória</span>
                <div className="text-5xl font-black text-white mb-2">
                  {((t1.predictions?.goalsHome || 1) / ((t1.predictions?.goalsHome || 1) + (t2.predictions?.goalsHome || 1)) * 100).toFixed(0)}%
                </div>
                <span className="text-sm text-indigo-400 font-bold">Favoritismo: {t1.team1}</span>
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
