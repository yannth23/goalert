import { Navbar } from '../components/Navbar';
import { ClubsLive } from '../components/ClubsLive';

/**
 * Home agora é a página de CLUBES ao vivo (Brasileirão + Top 5 da Europa).
 * A Copa do Mundo virou página própria em /copa (ver CopaPage).
 */
export function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <Navbar />
      <ClubsLive />
    </main>
  );
}
