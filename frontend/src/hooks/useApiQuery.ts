'use client';

import { useEffect, useState, useCallback } from 'react';

interface UseApiQueryResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/**
 * Generic hook for fetching API data with loading/error state.
 * Deduplicates the pattern used in useMatches, useStandings, etc.
 */
export function useApiQuery<T>(
  fetcher: () => Promise<T>,
  errorMessage = 'Erro ao carregar dados',
): UseApiQueryResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetcher();
      setData(result);
    } catch (err) {
      console.error(err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [fetcher, errorMessage]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}
