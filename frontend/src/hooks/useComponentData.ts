import { useState, useEffect } from 'react';

interface DataSource {
  endpoint: string;
  method?: 'GET' | 'POST';
  refreshInterval?: number;
  headers?: Record<string, string>;
}

interface UseComponentDataResult<T = any> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export const useComponentData = <T = any>(
  dataSource?: DataSource
): UseComponentDataResult<T> => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = async () => {
    if (!dataSource) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(dataSource.endpoint, {
        method: dataSource.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...dataSource.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Set up auto-refresh if specified
    if (dataSource?.refreshInterval) {
      const interval = setInterval(fetchData, dataSource.refreshInterval);
      return () => clearInterval(interval);
    }
  }, [dataSource?.endpoint, dataSource?.method, dataSource?.refreshInterval]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
};