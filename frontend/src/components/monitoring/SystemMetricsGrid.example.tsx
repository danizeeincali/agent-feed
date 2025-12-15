/**
 * SystemMetricsGrid Example Usage
 *
 * This file demonstrates how to use the SystemMetricsGrid and MetricCard components
 */

import React, { useState, useEffect } from 'react';
import { SystemMetricsGrid } from './SystemMetricsGrid';
import { SystemMetrics } from '../../types/api';

/**
 * Example 1: Basic Usage with Static Data
 */
export const StaticMetricsExample: React.FC = () => {
  const mockMetrics: SystemMetrics = {
    timestamp: new Date().toISOString(),
    server_id: 'server-001',
    cpu_usage: 45.3,
    memory_usage: 62.8,
    disk_usage: 38.5,
    network_io: {
      bytes_in: 1024000,
      bytes_out: 2048000,
      packets_in: 500,
      packets_out: 750,
    },
    response_time: 125,
    throughput: 45.2,
    error_rate: 0.5,
    active_connections: 12,
    queue_depth: 8,
    cache_hit_rate: 87.3,
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">System Metrics - Static Example</h2>
      <SystemMetricsGrid metrics={mockMetrics} />
    </div>
  );
};

/**
 * Example 2: Loading State
 */
export const LoadingStateExample: React.FC = () => {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">System Metrics - Loading State</h2>
      <SystemMetricsGrid metrics={null} loading={true} />
    </div>
  );
};

/**
 * Example 3: Real-time Updates with API Polling
 */
export const RealTimeMetricsExample: React.FC = () => {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching metrics from API
    const fetchMetrics = async () => {
      try {
        setLoading(true);

        // Replace with actual API call
        // const response = await fetch('/api/monitoring/metrics');
        // const data = await response.json();

        // Simulate API response
        const mockData: SystemMetrics = {
          timestamp: new Date().toISOString(),
          server_id: 'server-001',
          cpu_usage: Math.random() * 100,
          memory_usage: Math.random() * 100,
          disk_usage: Math.random() * 100,
          network_io: {
            bytes_in: Math.floor(Math.random() * 10000000),
            bytes_out: Math.floor(Math.random() * 10000000),
            packets_in: Math.floor(Math.random() * 1000),
            packets_out: Math.floor(Math.random() * 1000),
          },
          response_time: Math.random() * 500,
          throughput: Math.random() * 100,
          error_rate: Math.random() * 10,
          active_connections: Math.floor(Math.random() * 50),
          queue_depth: Math.floor(Math.random() * 100),
          cache_hit_rate: Math.random() * 100,
        };

        setMetrics(mockData);
      } catch (error) {
        console.error('Failed to fetch metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchMetrics();

    // Poll every 5 seconds
    const interval = setInterval(fetchMetrics, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">System Metrics - Real-time Updates</h2>
      <SystemMetricsGrid metrics={metrics} loading={loading} />
    </div>
  );
};

/**
 * Example 4: Empty State
 */
export const EmptyStateExample: React.FC = () => {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">System Metrics - No Data</h2>
      <SystemMetricsGrid metrics={null} loading={false} />
    </div>
  );
};

/**
 * Example 5: High Load Warning State
 */
export const HighLoadExample: React.FC = () => {
  const criticalMetrics: SystemMetrics = {
    timestamp: new Date().toISOString(),
    server_id: 'server-002',
    cpu_usage: 95.7, // Critical threshold
    memory_usage: 92.3, // Critical threshold
    disk_usage: 85.2,
    network_io: {
      bytes_in: 5024000,
      bytes_out: 8048000,
      packets_in: 2500,
      packets_out: 3750,
    },
    response_time: 450,
    throughput: 85.2,
    error_rate: 8.5, // Critical threshold
    active_connections: 48,
    queue_depth: 156,
    cache_hit_rate: 42.1,
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">System Metrics - High Load Warning</h2>
      <SystemMetricsGrid metrics={criticalMetrics} />
    </div>
  );
};

/**
 * Example 6: Integration with Custom Hook
 */
export const useSystemMetrics = (refreshInterval = 5000) => {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        // Replace with your actual API endpoint
        const response = await fetch('/api/monitoring/metrics');

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setMetrics(data.data || data);
        setError(null);
      } catch (err) {
        setError(err as Error);
        console.error('Failed to fetch system metrics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  return { metrics, loading, error };
};

/**
 * Example 7: Using Custom Hook in Component
 */
export const MetricsWithHookExample: React.FC = () => {
  const { metrics, loading, error } = useSystemMetrics(3000);

  if (error) {
    return (
      <div className="p-6">
        <div className="text-red-600 dark:text-red-400">
          Error loading metrics: {error.message}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">System Metrics - Custom Hook</h2>
      <SystemMetricsGrid metrics={metrics} loading={loading} />
    </div>
  );
};

export default StaticMetricsExample;
