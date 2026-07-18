import { Navbar } from '../components/Navbar';
import { Hero } from '../components/Hero';
import { TacticalSpotlight } from '../components/TacticalSpotlight';
import { StandingsTable } from '../components/StandingsTable';
import { TopScorers } from '../components/TopScorers';
import { MatchesSection } from '@/components/MatchesSection';
import { BracketSection } from '../components/BracketSection';

/**
 * Página dedicada à Copa do Mundo 2026 (mata-mata + grupos + artilheiros).
 * Foi separada da home, que agora é dos clubes. Todo o conteúdo da Copa vive
 * aqui em /copa.
 */
export function CopaPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <Navbar />
      <Hero />
      <BracketSection />
      <TacticalSpotlight />
      <MatchesSection />
      <div id="standings">
        <StandingsTable />
      </div>
      <TopScorers />
    </main>
  );
}
