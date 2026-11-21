import { useCallback, useEffect, useRef, useState } from 'react';
import type { DependencyList } from 'react';

export interface UseAsyncResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  reload: () => void;
}

/**
 * Runs an async loader and tracks its latest result. The loader is read from a
 * ref so callers can pass an inline closure; only `deps` (plus `reload`) decide
 * when a new request starts. A cancellation flag prevents stale responses from
 * overwriting newer data.
 */
export function useAsync<T>(
  loader: () => Promise<T>,
  deps: DependencyList = [],
): UseAsyncResult<T> {
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    const run = async () => {
      try {
        const value = await loaderRef.current();
        if (!cancelled) {
          setData(value);
          setLoading(false);
        }
      } catch (reason: unknown) {
        if (!cancelled) {
          setError(
            reason instanceof Error ? reason : new Error(String(reason)),
          );
          setLoading(false);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [reloadToken, ...deps]);

  const reload = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  return { data, loading, error, reload };
}
