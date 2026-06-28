import { Navbar } from '../components/Navbar';
import { Hero } from '../components/Hero';
import { WorldCupSection } from '../components/WorldCupSection';
import { TacticalSpotlight } from '../components/TacticalSpotlight';
import { MatchesSection } from '@/components/MatchesSection';
import { TopScorers } from '../components/TopScorers';

export function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <Navbar />
      <Hero />
      <WorldCupSection />
      <TacticalSpotlight />
      <MatchesSection />
      <TopScorers />
    </main>
  );
}
