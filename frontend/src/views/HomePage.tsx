import { Navbar } from '../components/Navbar';
import { Hero } from '../components/Hero';
import { StandingsTable } from '../components/StandingsTable';
import { TopScorers } from '../components/TopScorers';
import { MatchesSection } from '@/components/MatchesSection';
import { ApiDebug } from '@/components/ApiDebug';

export function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <ApiDebug />
      <Navbar />
      <Hero />
      <MatchesSection />
      <div id="standings">
        <StandingsTable />
      </div>
      <TopScorers />
    </main>
  );
}
