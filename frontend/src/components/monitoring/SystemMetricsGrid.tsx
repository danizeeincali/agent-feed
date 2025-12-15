/**
 * SystemMetricsGrid Component
 * Displays a responsive grid of system metrics using MetricCard components
 */

import React from 'react';
import {
  Cpu,
  HardDrive,
  Users,
  List,
  Activity,
  AlertTriangle,
} from 'lucide-react';
import { SystemMetrics } from '../../types/api';
import { MetricCard } from './MetricCard';

interface SystemMetricsGridProps {
  metrics: SystemMetrics | null;
  loading?: boolean;
}

/**
 * SystemMetricsGrid displays 6 key system metrics in a responsive grid layout
 */
export const SystemMetricsGrid: React.FC<SystemMetricsGridProps> = ({
  metrics,
  loading = false,
}) => {
  // Default values when metrics are null
  const cpuUsage = metrics?.cpu_usage ?? 0;
  const memoryUsage = metrics?.memory_usage ?? 0;
  const activeConnections = metrics?.active_connections ?? 0;
  const queueDepth = metrics?.queue_depth ?? 0;
  const throughput = metrics?.throughput ?? 0;
  const errorRate = metrics?.error_rate ?? 0;

  // Define thresholds for each metric
  const thresholds = {
    cpu: { warning: 70, critical: 90 },
    memory: { warning: 75, critical: 90 },
    errorRate: { warning: 1, critical: 5 },
  };

  return (
    <div className="w-full">
      {/* Grid layout: 1 col mobile, 2 cols tablet, 3 cols desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* CPU Usage */}
        <MetricCard
          title="CPU Usage"
          icon={Cpu}
          value={cpuUsage}
          unit="%"
          max={100}
          threshold={thresholds.cpu}
          loading={loading}
          colorScheme="blue"
        />

        {/* Memory Usage */}
        <MetricCard
          title="Memory Usage"
          icon={HardDrive}
          value={memoryUsage}
          unit="%"
          max={100}
          threshold={thresholds.memory}
          loading={loading}
          colorScheme="green"
        />

        {/* Active Workers/Connections */}
        <MetricCard
          title="Active Workers"
          icon={Users}
          value={activeConnections}
          unit="workers"
          loading={loading}
          colorScheme="purple"
        />

        {/* Queue Length */}
        <MetricCard
          title="Queue Length"
          icon={List}
          value={queueDepth}
          unit="items"
          loading={loading}
          colorScheme="orange"
        />

        {/* Request Rate (Throughput) */}
        <MetricCard
          title="Request Rate"
          icon={Activity}
          value={throughput}
          unit="req/s"
          loading={loading}
          colorScheme="blue"
        />

        {/* Error Rate */}
        <MetricCard
          title="Error Rate"
          icon={AlertTriangle}
          value={errorRate}
          unit="%"
          max={100}
          threshold={thresholds.errorRate}
          loading={loading}
          colorScheme="red"
        />
      </div>

      {/* Optional: Display timestamp of metrics */}
      {metrics?.timestamp && !loading && (
        <div className="mt-4 text-xs text-center text-gray-500 dark:text-gray-400">
          Last updated: {new Date(metrics.timestamp).toLocaleString()}
        </div>
      )}

      {/* Empty state when no metrics available */}
      {!metrics && !loading && (
        <div className="mt-8 text-center text-gray-500 dark:text-gray-400">
          <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No metrics data available</p>
          <p className="text-xs mt-1">System metrics will appear here once available</p>
        </div>
      )}
    </div>
  );
};

export default SystemMetricsGrid;
