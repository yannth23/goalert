import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { GroupStanding } from '../types';

export function useStandings() {
  const [standings, setStandings] = useState<GroupStanding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStandings();
  }, []);

  async function loadStandings() {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getStandings();
      setStandings(data as unknown as GroupStanding[]);
    } catch (err) {
      console.error(err);
      setError('Erro ao carregar classificação');
    } finally {
      setLoading(false);
    }
  }

  return { standings, loading, error, reload: loadStandings };
}
