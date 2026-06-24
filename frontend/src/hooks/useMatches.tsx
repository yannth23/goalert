import { useCallback, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { useApiQuery } from './useApiQuery';
import type { FootballMatch } from '../types';

export function useMatches() {
  const fetcher = useCallback(() => api.getTodayMatches(), []);
  const { data, loading, error, reload } = useApiQuery<FootballMatch[]>(
    fetcher,
    'Erro ao carregar partidas',
  );

  const matches = data ?? [];
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Polling normal a cada 30s
    const interval = setInterval(() => {
      reload();
    }, 30000);
    return () => clearInterval(interval);
  }, [reload]);

  // Retry agressivo quando banco vazio: tenta novamente a cada 8s (até 5x)
  const retryCountRef = useRef(0);
  useEffect(() => {
    if (!loading && matches.length === 0) {
      if (retryCountRef.current < 5) {
        retryRef.current = setTimeout(() => {
          retryCountRef.current += 1;
          reload();
        }, 8000);
      }
    } else {
      retryCountRef.current = 0;
      if (retryRef.current) clearTimeout(retryRef.current);
    }
    return () => {
      if (retryRef.current) clearTimeout(retryRef.current);
    };
  }, [loading, matches.length, reload]);

  return {
    matches,
    loading,
    error,
    reload,
  };
}
