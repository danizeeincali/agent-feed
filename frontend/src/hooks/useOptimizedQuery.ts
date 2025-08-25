import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';

// Optimized hook that prevents unnecessary re-fetches and implements intelligent caching
export const useOptimizedQuery = <TData = unknown, TError = unknown>(
  options: UseQueryOptions<TData, TError> & {
    enableSmartRefetch?: boolean;
    throttleMs?: number;
  }
) => {
  const { enableSmartRefetch = true, throttleMs = 1000, ...queryOptions } = options;
  const lastFetchTime = useRef(0);
  
  // Throttle refetch to prevent excessive API calls
  const throttledRefetch = useCallback(() => {
    const now = Date.now();
    if (now - lastFetchTime.current < throttleMs) {
      return Promise.resolve({});
    }
    lastFetchTime.current = now;
    return (queryOptions.queryFn as any)?.({}as any) || Promise.resolve({} as TData);
  }, [queryOptions.queryFn, throttleMs]);
  
  return useQuery({
    ...queryOptions,
    // Custom refetch logic
    queryFn: throttledRefetch,
  } as any);
};

// Hook for real-time data that needs frequent updates
export const useRealtimeQuery = <TData = unknown, TError = unknown>(
  options: UseQueryOptions<TData, TError>
) => {
  return useOptimizedQuery({
    ...options,
    enableSmartRefetch: true,
    throttleMs: 500, // More aggressive for real-time data
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });
};

// Hook for static data that rarely changes
export const useStaticQuery = <TData = unknown, TError = unknown>(
  options: UseQueryOptions<TData, TError>
) => {
  return useOptimizedQuery({
    ...options,
    enableSmartRefetch: false,
    staleTime: 3600000, // 1 hour
    gcTime: 7200000, // 2 hours (React Query v5 uses gcTime)
  });
};