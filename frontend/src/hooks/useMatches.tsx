import { useCallback, useEffect } from 'react';
import { api } from '../lib/api';
import { useApiQuery } from './useApiQuery';
import type { FootballMatch } from '../types';

export function useMatches() {
  const fetcher = useCallback(() => api.getTodayMatches(), []);
  const { data, loading, error, reload } = useApiQuery<FootballMatch[]>(
    fetcher,
    'Erro ao carregar partidas',
  );

  // Polling para manter status atualizados (cada 30s)
  useEffect(() => {
    const interval = setInterval(() => {
      reload();
    }, 30000);
    return () => clearInterval(interval);
  }, [reload]);

  return {
    matches: data ?? [],
    loading,
    error,
    reload,
  };
}
