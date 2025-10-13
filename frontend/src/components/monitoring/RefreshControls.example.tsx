/**
 * RefreshControls Component Examples
 *
 * This file demonstrates various usage patterns for the RefreshControls component.
 */

import React, { useState, useCallback } from 'react';
import { RefreshControls } from './RefreshControls';

/**
 * Example 1: Basic Usage with State Management
 */
export const BasicExample: React.FC = () => {
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [refreshInterval, setRefreshInterval] = useState(10000);

  const handleManualRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setLastUpdated(new Date());
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  return (
    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Basic Example</h3>
      <RefreshControls
        autoRefresh={autoRefresh}
        onToggleAutoRefresh={() => setAutoRefresh(!autoRefresh)}
        onManualRefresh={handleManualRefresh}
        isRefreshing={isRefreshing}
        lastUpdated={lastUpdated}
        refreshInterval={refreshInterval}
        onIntervalChange={setRefreshInterval}
      />
    </div>
  );
};

/**
 * Example 2: With Auto-Refresh Logic
 */
export const AutoRefreshExample: React.FC = () => {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [refreshInterval, setRefreshInterval] = useState(5000);
  const [data, setData] = useState<any[]>([]);

  // Fetch data function
  const fetchData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // Simulate API call
      const response = await fetch('/api/data');
      const result = await response.json();
      setData(result);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Auto-refresh effect
  React.useEffect(() => {
    if (!autoRefresh) return;

    // Initial fetch
    fetchData();

    // Set up interval
    const intervalId = setInterval(fetchData, refreshInterval);

    return () => clearInterval(intervalId);
  }, [autoRefresh, refreshInterval, fetchData]);

  return (
    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Auto-Refresh Example</h3>
      <RefreshControls
        autoRefresh={autoRefresh}
        onToggleAutoRefresh={() => setAutoRefresh(!autoRefresh)}
        onManualRefresh={fetchData}
        isRefreshing={isRefreshing}
        lastUpdated={lastUpdated}
        refreshInterval={refreshInterval}
        onIntervalChange={setRefreshInterval}
      />
      <div className="mt-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Data items: {data.length}
        </p>
      </div>
    </div>
  );
};

/**
 * Example 3: Without Interval Selector
 */
export const WithoutIntervalSelectorExample: React.FC = () => {
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const handleManualRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setLastUpdated(new Date());
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  return (
    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Without Interval Selector</h3>
      <RefreshControls
        autoRefresh={autoRefresh}
        onToggleAutoRefresh={() => setAutoRefresh(!autoRefresh)}
        onManualRefresh={handleManualRefresh}
        isRefreshing={isRefreshing}
        lastUpdated={lastUpdated}
        refreshInterval={10000}
        // Note: onIntervalChange is not provided
      />
    </div>
  );
};

/**
 * Example 4: In a Dashboard Header
 */
export const DashboardHeaderExample: React.FC = () => {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [refreshInterval, setRefreshInterval] = useState(30000);

  const handleManualRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // Fetch all dashboard data
      await Promise.all([
        fetch('/api/metrics'),
        fetch('/api/alerts'),
        fetch('/api/health'),
      ]);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to refresh dashboard:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            System Dashboard
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Real-time system monitoring
          </p>
        </div>
        <RefreshControls
          autoRefresh={autoRefresh}
          onToggleAutoRefresh={() => setAutoRefresh(!autoRefresh)}
          onManualRefresh={handleManualRefresh}
          isRefreshing={isRefreshing}
          lastUpdated={lastUpdated}
          refreshInterval={refreshInterval}
          onIntervalChange={setRefreshInterval}
        />
      </div>
    </div>
  );
};

/**
 * Example 5: With Custom Hook for Refresh Logic
 */
const useRefreshableData = <T,>(
  fetchFn: () => Promise<T>,
  initialInterval: number = 10000
) => {
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshInterval, setRefreshInterval] = useState(initialInterval);
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const result = await fetchFn();
      setData(result);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchFn]);

  React.useEffect(() => {
    if (!autoRefresh) return;

    refresh();
    const intervalId = setInterval(refresh, refreshInterval);

    return () => clearInterval(intervalId);
  }, [autoRefresh, refreshInterval, refresh]);

  return {
    data,
    error,
    isRefreshing,
    autoRefresh,
    lastUpdated,
    refreshInterval,
    setAutoRefresh,
    setRefreshInterval,
    refresh,
  };
};

export const CustomHookExample: React.FC = () => {
  const {
    data,
    isRefreshing,
    autoRefresh,
    lastUpdated,
    refreshInterval,
    setAutoRefresh,
    setRefreshInterval,
    refresh,
  } = useRefreshableData(
    async () => {
      const response = await fetch('/api/data');
      return response.json();
    },
    10000
  );

  return (
    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Custom Hook Example</h3>
      <RefreshControls
        autoRefresh={autoRefresh}
        onToggleAutoRefresh={() => setAutoRefresh(!autoRefresh)}
        onManualRefresh={refresh}
        isRefreshing={isRefreshing}
        lastUpdated={lastUpdated}
        refreshInterval={refreshInterval}
        onIntervalChange={setRefreshInterval}
      />
      <div className="mt-4">
        {data && (
          <pre className="text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded">
            {JSON.stringify(data, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
};

/**
 * Example 6: Minimal Configuration
 */
export const MinimalExample: React.FC = () => {
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  return (
    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Minimal Example</h3>
      <RefreshControls
        autoRefresh={autoRefresh}
        onToggleAutoRefresh={() => setAutoRefresh(!autoRefresh)}
        onManualRefresh={() => setLastUpdated(new Date())}
        isRefreshing={false}
        lastUpdated={lastUpdated}
        refreshInterval={10000}
      />
    </div>
  );
};

/**
 * All Examples Component
 */
export const AllExamples: React.FC = () => {
  return (
    <div className="space-y-6 p-6 bg-gray-50 dark:bg-gray-900">
      <h2 className="text-2xl font-bold mb-4">RefreshControls Examples</h2>
      <BasicExample />
      <AutoRefreshExample />
      <WithoutIntervalSelectorExample />
      <DashboardHeaderExample />
      <CustomHookExample />
      <MinimalExample />
    </div>
  );
};

export default AllExamples;
