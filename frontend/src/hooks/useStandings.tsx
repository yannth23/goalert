import { useCallback } from 'react';
import { api } from '../lib/api';
import { useApiQuery } from './useApiQuery';
import type { GroupStanding } from '../types';

export function useStandings() {
  const fetcher = useCallback(() => api.getStandings() as Promise<GroupStanding[]>, []);
  const { data, loading, error, reload } = useApiQuery<GroupStanding[]>(
    fetcher,
    'Erro ao carregar classificação',
  );

  return { standings: data ?? [], loading, error, reload };
}
