'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { api } from '@/lib/api';
import { GoalAlertLogo } from '@/components/GoalAlertLogo';
import { Loading } from '@/components/Loading';
import { EmptyState } from '@/components/EmptyState';
import { MatchCard } from '@/components/MatchCard';
import type { FootballMatch } from '@/types';

interface PageProps {
  params: Promise<{ name: string }>;
}

export default function SelecaoPage({ params }: PageProps) {
  const { name: rawName } = use(params);
  const name = decodeURIComponent(rawName);
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<FootballMatch[]>([]);
  const [report, setReport] = useState<any>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [matchData, reportData] = await Promise.all([
          api.getTodayMatches(),
          api.getTeamReport(name)
        ]);
        
        setMatches(matchData.filter(m => m.team1 === name || m.team2 === name));
        setReport(reportData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [name]);

  if (loading) return <main className="min-h-screen bg-slate-950 flex items-center justify-center"><Loading /></main>;

  return (
    <main className="min-h-screen bg-slate-950 text-white pb-12">
      {/* Navbar */}
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <GoalAlertLogo size={30} />
            <span className="text-yellow-400 font-black text-xl tracking-tight">GOALALERT</span>
          </Link>
          <Link href="/dashboard" className="text-sm text-slate-400 hover:text-white transition">Voltar ao Início</Link>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header da Seleção */}
        <div className="bg-gradient-to-br from-indigo-900/40 to-slate-900 border border-indigo-500/20 rounded-3xl p-8 mb-8">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center text-5xl shadow-2xl border-4 border-slate-700">
              ⚽
            </div>
            <div className="text-center md:text-left">
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-2">{name.toUpperCase()}</h1>
              <p className="text-indigo-400 font-bold uppercase tracking-widest text-sm">Relatório de Inteligência Copa 2026</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Relatório Principal (Web + IA) */}
          <div className="lg:col-span-2 space-y-8">
            <section className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
              <h2 className="text-xl font-black mb-6 flex items-center gap-2">
                <span className="text-indigo-500">📊</span> Dossiê Tático & Notícias da Web
              </h2>
              <div className="prose prose-invert prose-indigo max-w-none">
                <ReactMarkdown>{report?.report || "Nenhuma análise disponível no momento."}</ReactMarkdown>
              </div>
            </section>

            <section>
              <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 px-2">Partidas Recentes / Próximas</h2>
              <div className="space-y-4">
                {matches.length > 0 ? (
                  matches.map(m => <MatchCard key={m.id} match={m} />)
                ) : (
                  <EmptyState message="Nenhuma partida encontrada para esta seleção hoje." />
                )}
              </div>
            </section>
          </div>

          {/* Sidebar: Notícias de Blogs/Portais */}
          <div className="space-y-6">
            <section className="bg-indigo-950/20 border border-indigo-500/30 rounded-2xl p-6">
              <h2 className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-6">Radar da Imprensa & Blogs</h2>
              <div className="space-y-6">
                {report?.news && report.news.length > 0 ? (
                  report.news.map((n: any, i: number) => (
                    <div key={i} className="group cursor-default">
                      <p className="text-[10px] text-indigo-500 font-black uppercase mb-1">{n.source}</p>
                      <h3 className="font-bold text-sm text-white group-hover:text-indigo-300 transition mb-2">{n.title}</h3>
                      <p className="text-xs text-slate-400 leading-relaxed">{n.summary}</p>
                      {i < report.news.length - 1 && <div className="h-px bg-indigo-500/10 mt-6" />}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 italic">Buscando notícias recentes em blogs e portais...</p>
                )}
              </div>
            </section>

            <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Status da Inteligência</h2>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Sincronizado com Blogs e Notícias
              </div>
              <p className="text-[10px] text-slate-600 mt-2">Última atualização: {report?.updatedAt ? new Date(report.updatedAt).toLocaleString('pt-BR') : 'Agora'}</p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
