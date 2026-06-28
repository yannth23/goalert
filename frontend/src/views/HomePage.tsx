import { Navbar } from '../components/Navbar';
import { Hero } from '../components/Hero';
import { TacticalSpotlight } from '../components/TacticalSpotlight';
import { StandingsTable } from '../components/StandingsTable';
import { TopScorers } from '../components/TopScorers';
import { MatchesSection } from '@/components/MatchesSection';
import { ApiDebug } from '@/components/ApiDebug';
import { BracketSection } from '../components/BracketSection';

export function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <ApiDebug />
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
