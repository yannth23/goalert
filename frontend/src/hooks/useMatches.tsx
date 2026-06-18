import { useCallback } from 'react';
import { api } from '../lib/api';
import { useApiQuery } from './useApiQuery';
import type { FootballMatch } from '../types';

export function useMatches() {
  const fetcher = useCallback(() => api.getTodayMatches(), []);
  const { data, loading, error, reload } = useApiQuery<FootballMatch[]>(
    fetcher,
    'Erro ao carregar partidas',
  );

  return {
    matches: data ?? [],
    loading,
    error,
    reload,
  };
}
