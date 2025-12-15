/**
 * useMonitoringData - Custom Hook for Monitoring Data Management
 *
 * Production-ready React hook that manages monitoring data with:
 * - Auto-refresh functionality with configurable intervals
 * - Comprehensive error handling and recovery
 * - Race condition prevention with abort controllers
 * - Loading state management
 * - Alert acknowledgment
 * - Cleanup on unmount
 *
 * @example
 * const {
 *   healthStatus,
 *   metrics,
 *   alerts,
 *   isLoading,
 *   error,
 *   refreshData,
 *   toggleAutoRefresh
 * } = useMonitoringData({ autoRefreshEnabled: true, refreshInterval: 5000 });
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  monitoringApiService,
  HealthStatus,
  SystemMetrics,
  Alert,
  AlertsResponse,
  HistoricalStats
} from '../services/MonitoringApiService';

// ==================== TYPE DEFINITIONS ====================

export interface UseMonitoringDataOptions {
  autoRefreshEnabled?: boolean;
  refreshInterval?: number;
  enableLogging?: boolean;
  onError?: (error: Error) => void;
  onRefresh?: () => void;
}

export interface UseMonitoringDataReturn {
  // Data state
  healthStatus: HealthStatus | null;
  metrics: SystemMetrics | null;
  alerts: Alert[];
  historicalStats: HistoricalStats | null;
  alertsStats: AlertsResponse['stats'] | null;

  // UI state
  isLoading: boolean;
  error: Error | null;
  autoRefresh: boolean;
  refreshInterval: number;
  lastUpdated: Date | null;

  // Methods
  refreshData: () => Promise<void>;
  toggleAutoRefresh: () => void;
  acknowledgeAlert: (alertId: string) => Promise<void>;
  setRefreshInterval: (ms: number) => void;
  clearError: () => void;
}

// ==================== CUSTOM HOOK ====================

export const useMonitoringData = (options: UseMonitoringDataOptions = {}): UseMonitoringDataReturn => {
  const {
    autoRefreshEnabled = true,
    refreshInterval: initialRefreshInterval = 10000,
    enableLogging = true,
    onError,
    onRefresh
  } = options;

  // ==================== STATE ====================

  // Data state
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [historicalStats, setHistoricalStats] = useState<HistoricalStats | null>(null);
  const [alertsStats, setAlertsStats] = useState<AlertsResponse['stats'] | null>(null);

  // UI state
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(autoRefreshEnabled);
  const [refreshInterval, setRefreshIntervalState] = useState<number>(initialRefreshInterval);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // ==================== REFS ====================

  // Refs for cleanup and race condition prevention
  const abortControllerRef = useRef<AbortController | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const isRefreshingRef = useRef<boolean>(false);

  // ==================== LOGGING HELPER ====================

  const log = useCallback((message: string, data?: any) => {
    if (enableLogging) {
      console.log(`[useMonitoringData] ${message}`, data || '');
    }
  }, [enableLogging]);

  const logError = useCallback((message: string, err: any) => {
    if (enableLogging) {
      console.error(`[useMonitoringData] ${message}`, err);
    }
  }, [enableLogging]);

  // ==================== DATA FETCHING ====================

  /**
   * Fetch all monitoring data from API
   * Handles race conditions and cleanup properly
   */
  const fetchAllData = useCallback(async (): Promise<void> => {
    // Prevent concurrent refreshes
    if (isRefreshingRef.current) {
      log('Refresh already in progress, skipping...');
      return;
    }

    // Abort any ongoing requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this fetch
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    isRefreshingRef.current = true;

    try {
      setIsLoading(true);
      setError(null);

      log('Fetching monitoring data...');

      // Fetch all data in parallel for performance
      const [healthData, metricsData, alertsData, statsData] = await Promise.all([
        monitoringApiService.getHealth(false).catch(err => {
          logError('Failed to fetch health status', err);
          return null;
        }),
        monitoringApiService.getMetrics('json', undefined, false).catch(err => {
          logError('Failed to fetch metrics', err);
          return null;
        }) as Promise<SystemMetrics | null>,
        monitoringApiService.getAlerts({ page: 1, limit: 100 }).catch(err => {
          logError('Failed to fetch alerts', err);
          return { alerts: [], total: 0, page: 1, limit: 100, totalPages: 0, stats: { total: 0, active: 0, bySeverity: {} } };
        }),
        monitoringApiService.getStats({}, false).catch(err => {
          logError('Failed to fetch historical stats', err);
          return null;
        })
      ]);

      // Check if component is still mounted and request wasn't aborted
      if (!isMountedRef.current || abortController.signal.aborted) {
        log('Component unmounted or request aborted, skipping state update');
        return;
      }

      // Update state with fetched data
      if (healthData) setHealthStatus(healthData);
      if (metricsData) setMetrics(metricsData);
      if (alertsData) {
        setAlerts(alertsData.alerts);
        setAlertsStats(alertsData.stats);
      }
      if (statsData) setHistoricalStats(statsData);

      setLastUpdated(new Date());
      setError(null);

      log('Monitoring data fetched successfully', {
        health: !!healthData,
        metrics: !!metricsData,
        alerts: alertsData?.alerts.length || 0,
        stats: !!statsData
      });

      onRefresh?.();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error occurred');

      // Don't update state if aborted
      if (error.name === 'AbortError' || !isMountedRef.current) {
        log('Request aborted or component unmounted');
        return;
      }

      logError('Error fetching monitoring data', error);
      setError(error);
      onError?.(error);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
      isRefreshingRef.current = false;
    }
  }, [log, logError, onRefresh, onError]);

  // ==================== PUBLIC METHODS ====================

  /**
   * Manually refresh all monitoring data
   */
  const refreshData = useCallback(async (): Promise<void> => {
    log('Manual refresh triggered');
    await fetchAllData();
  }, [fetchAllData, log]);

  /**
   * Toggle auto-refresh on/off
   */
  const toggleAutoRefresh = useCallback(() => {
    setAutoRefresh(prev => {
      const newValue = !prev;
      log(`Auto-refresh ${newValue ? 'enabled' : 'disabled'}`);
      return newValue;
    });
  }, [log]);

  /**
   * Acknowledge an alert
   */
  const acknowledgeAlert = useCallback(async (alertId: string): Promise<void> => {
    try {
      log(`Acknowledging alert: ${alertId}`);

      await monitoringApiService.acknowledgeAlert(alertId, 'user');

      // Update local state optimistically
      setAlerts(prev =>
        prev.map(alert =>
          alert.id === alertId
            ? { ...alert, acknowledged: true, acknowledgedAt: Date.now() }
            : alert
        )
      );

      log(`Alert ${alertId} acknowledged successfully`);

      // Refresh alerts data to get latest state
      const alertsData = await monitoringApiService.getAlerts({ page: 1, limit: 100 });
      if (isMountedRef.current) {
        setAlerts(alertsData.alerts);
        setAlertsStats(alertsData.stats);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to acknowledge alert');
      logError('Error acknowledging alert', error);
      setError(error);
      onError?.(error);
      throw error; // Re-throw so caller can handle
    }
  }, [log, logError, onError]);

  /**
   * Update refresh interval
   */
  const setRefreshInterval = useCallback((ms: number) => {
    if (ms < 1000) {
      logError('Refresh interval must be at least 1000ms', { provided: ms });
      return;
    }

    log(`Refresh interval updated: ${ms}ms`);
    setRefreshIntervalState(ms);
  }, [log, logError]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    log('Clearing error state');
    setError(null);
  }, [log]);

  // ==================== EFFECTS ====================

  /**
   * Initial data load on mount
   */
  useEffect(() => {
    log('Component mounted, fetching initial data...');
    fetchAllData();
  }, [fetchAllData, log]);

  /**
   * Auto-refresh logic
   * Only runs when autoRefresh is true
   * Cleans up interval when component unmounts or autoRefresh changes
   */
  useEffect(() => {
    // Clear existing interval
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }

    // Set up new interval if auto-refresh is enabled
    if (autoRefresh) {
      log(`Setting up auto-refresh with interval: ${refreshInterval}ms`);

      refreshIntervalRef.current = setInterval(() => {
        // Don't refresh if already loading
        if (!isRefreshingRef.current) {
          log('Auto-refresh triggered');
          fetchAllData();
        } else {
          log('Skipping auto-refresh - request already in progress');
        }
      }, refreshInterval);
    } else {
      log('Auto-refresh disabled');
    }

    // Cleanup on unmount or when dependencies change
    return () => {
      if (refreshIntervalRef.current) {
        log('Cleaning up auto-refresh interval');
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [autoRefresh, refreshInterval, fetchAllData, log]);

  /**
   * Cleanup on unmount
   * Abort ongoing requests and clear intervals
   */
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      log('Component unmounting, cleaning up...');
      isMountedRef.current = false;

      // Abort ongoing requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }

      // Clear refresh interval
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }

      // Clear service cache and abort all requests
      monitoringApiService.clearCache();
    };
  }, [log]);

  // ==================== RETURN ====================

  return {
    // Data state
    healthStatus,
    metrics,
    alerts,
    historicalStats,
    alertsStats,

    // UI state
    isLoading,
    error,
    autoRefresh,
    refreshInterval,
    lastUpdated,

    // Methods
    refreshData,
    toggleAutoRefresh,
    acknowledgeAlert,
    setRefreshInterval,
    clearError
  };
};
