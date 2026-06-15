import { useEffect, useState } from 'react';

import { api } from '../lib/api';
import type { FootballMatch } from '../types';

export function useMatches() {
  const [matches, setMatches] = useState<FootballMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMatches();
  }, []);

  async function loadMatches() {
    try {
      setLoading(true);
      setError(null);

      const data = await api.getTodayMatches();

      setMatches(data);
    } catch (err) {
      console.error(err);
      setError('Erro ao carregar partidas');
    } finally {
      setLoading(false);
    }
  }

  return {
    matches,
    loading,
    error,
    reload: loadMatches,
  };
}