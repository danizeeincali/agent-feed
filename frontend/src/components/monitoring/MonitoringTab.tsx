import React from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { useMonitoringData } from '../../hooks/useMonitoringData';
import { RefreshControls } from './RefreshControls';
import { HealthStatusCard } from './HealthStatusCard';
import { SystemMetricsGrid } from './SystemMetricsGrid';
import { MonitoringCharts } from './MonitoringCharts';
import AlertsPanel from './AlertsPanel';
import { LoadingSpinner } from '../LoadingSpinner';

interface MonitoringTabProps {
  className?: string;
}

/**
 * MonitoringTab - Main container for the system monitoring interface
 *
 * This component provides real-time monitoring of system health, metrics,
 * and alerts. It uses the useMonitoringData hook to manage state and
 * auto-refresh functionality.
 *
 * Features:
 * - Real-time health status monitoring
 * - System metrics visualization
 * - Historical data charts
 * - Alert management with acknowledgement
 * - Configurable auto-refresh
 * - Dark mode support
 * - Graceful error handling
 */
const MonitoringTab: React.FC<MonitoringTabProps> = ({ className = '' }) => {
  const {
    healthStatus,
    metrics,
    alerts,
    historicalStats,
    isLoading,
    error,
    autoRefresh,
    refreshInterval,
    lastUpdated,
    refreshData,
    toggleAutoRefresh,
    acknowledgeAlert,
    setRefreshInterval
  } = useMonitoringData();

  // Loading skeleton component for individual sections
  const SectionSkeleton = () => (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="animate-pulse space-y-4">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
        </div>
      </div>
    </div>
  );

  // Error banner component
  const ErrorBanner = () => {
    if (!error) return null;

    return (
      <Alert variant="destructive" className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle className="text-red-800 dark:text-red-200">Monitoring Error</AlertTitle>
        <AlertDescription className="text-red-700 dark:text-red-300">
          <div className="flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={refreshData}
              className="ml-4 flex items-center px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 rounded hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors text-sm"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Retry
            </button>
          </div>
        </AlertDescription>
      </Alert>
    );
  };

  return (
    <div className={`monitoring-tab space-y-6 ${className}`}>
      {/* Page Header with Refresh Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            System Monitoring
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
            Real-time health metrics and system alerts
          </p>
        </div>

        <RefreshControls
          autoRefresh={autoRefresh}
          refreshInterval={refreshInterval}
          lastUpdated={lastUpdated}
          isRefreshing={isLoading}
          onManualRefresh={refreshData}
          onToggleAutoRefresh={toggleAutoRefresh}
          onIntervalChange={setRefreshInterval}
        />
      </div>

      {/* Error Banner */}
      <ErrorBanner />

      {/* Health Status Section */}
      <div className="space-y-4">
        {isLoading && !healthStatus ? (
          <SectionSkeleton />
        ) : (
          <HealthStatusCard
            healthStatus={healthStatus}
            loading={isLoading}
          />
        )}
      </div>

      {/* System Metrics Grid */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          System Metrics
        </h3>
        {isLoading && !metrics ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <SectionSkeleton />
            <SectionSkeleton />
            <SectionSkeleton />
            <SectionSkeleton />
          </div>
        ) : (
          <SystemMetricsGrid
            metrics={metrics ? {
              timestamp: new Date(metrics.timestamp).toISOString(),
              server_id: 'monitoring-server',
              cpu_usage: metrics.system?.cpu?.usage ?? 0,
              memory_usage: metrics.system?.memory?.usagePercent ?? 0,
              disk_usage: metrics.system?.disk?.usagePercent ?? 0,
              active_connections: metrics.application?.requests?.activeRequests ?? 0,
              queue_depth: metrics.application?.queue?.depth ?? 0,
              throughput: metrics.application?.requests?.rate ?? 0,
              error_rate: metrics.application?.errors?.rate ?? 0,
              network_io: {
                bytes_in: metrics.system?.network?.bytesIn ?? 0,
                bytes_out: metrics.system?.network?.bytesOut ?? 0,
              },
            } : null}
            loading={isLoading}
          />
        )}
      </div>

      {/* Historical Charts */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Historical Trends
        </h3>
        {isLoading && !historicalStats ? (
          <SectionSkeleton />
        ) : (
          <MonitoringCharts
            data={historicalStats}
            loading={isLoading}
          />
        )}
      </div>

      {/* Alerts Panel */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Active Alerts
          </h3>
          {alerts && alerts.length > 0 && (
            <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 text-xs font-medium rounded">
              {alerts.filter(alert => !alert.acknowledged).length} Active
            </span>
          )}
        </div>
        {isLoading && !alerts ? (
          <SectionSkeleton />
        ) : (
          <AlertsPanel
            alerts={alerts || []}
            onAcknowledge={acknowledgeAlert}
          />
        )}
      </div>

      {/* Footer Info */}
      {lastUpdated && (
        <div className="text-center text-xs text-gray-500 dark:text-gray-400 pt-4 border-t border-gray-200 dark:border-gray-700">
          Last updated: {new Date(lastUpdated).toLocaleString()}
          {autoRefresh && (
            <span className="ml-2">
              • Auto-refresh enabled (every {refreshInterval / 1000}s)
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default MonitoringTab;
