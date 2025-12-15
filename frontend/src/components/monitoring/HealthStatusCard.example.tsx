/**
 * HealthStatusCard Usage Examples
 *
 * This file demonstrates how to use the HealthStatusCard component
 * in various scenarios.
 */

import React, { useState, useEffect } from 'react';
import { HealthStatusCard } from './HealthStatusCard';

/**
 * Example 1: Basic Usage with Mock Data
 */
export const BasicExample: React.FC = () => {
  const healthStatus = {
    isHealthy: true,
    latency: 45,
    lastPing: new Date(),
    consecutiveFailures: 0,
    uptime: 432000, // 5 days in seconds
    serverTimestamp: new Date(),
    networkQuality: 'excellent' as const
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Healthy System</h2>
      <HealthStatusCard healthStatus={healthStatus} />
    </div>
  );
};

/**
 * Example 2: Degraded System
 */
export const DegradedExample: React.FC = () => {
  const healthStatus = {
    isHealthy: true,
    latency: 250,
    lastPing: new Date(),
    consecutiveFailures: 1,
    uptime: 86400, // 1 day in seconds
    serverTimestamp: new Date(),
    networkQuality: 'fair' as const
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Degraded System</h2>
      <HealthStatusCard healthStatus={healthStatus} />
    </div>
  );
};

/**
 * Example 3: Unhealthy System
 */
export const UnhealthyExample: React.FC = () => {
  const healthStatus = {
    isHealthy: false,
    latency: 1200,
    lastPing: new Date(Date.now() - 300000), // 5 minutes ago
    consecutiveFailures: 3,
    uptime: 3600, // 1 hour in seconds
    serverTimestamp: new Date(),
    networkQuality: 'poor' as const
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Unhealthy System</h2>
      <HealthStatusCard healthStatus={healthStatus} />
    </div>
  );
};

/**
 * Example 4: Loading State
 */
export const LoadingExample: React.FC = () => {
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Loading State</h2>
      <HealthStatusCard healthStatus={null} loading={true} />
    </div>
  );
};

/**
 * Example 5: Empty State (No Data)
 */
export const EmptyExample: React.FC = () => {
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Empty State</h2>
      <HealthStatusCard healthStatus={null} loading={false} />
    </div>
  );
};

/**
 * Example 6: Live Updating Data
 */
export const LiveUpdateExample: React.FC = () => {
  const [healthStatus, setHealthStatus] = useState({
    isHealthy: true,
    latency: 45,
    lastPing: new Date(),
    consecutiveFailures: 0,
    uptime: 0,
    serverTimestamp: new Date(),
    networkQuality: 'excellent' as const
  });

  useEffect(() => {
    // Simulate live updates every 5 seconds
    const interval = setInterval(() => {
      setHealthStatus(prev => ({
        ...prev,
        latency: Math.floor(Math.random() * 200) + 30,
        lastPing: new Date(),
        uptime: prev.uptime + 5,
        networkQuality: ['excellent', 'good', 'fair'][Math.floor(Math.random() * 3)] as any
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Live Updating Data</h2>
      <HealthStatusCard healthStatus={healthStatus} />
    </div>
  );
};

/**
 * Example 7: Integration with Connection Manager
 */
export const ConnectionManagerExample: React.FC = () => {
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate connection manager integration
    const initializeConnection = async () => {
      setLoading(true);

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Set initial health status
      setHealthStatus({
        isHealthy: true,
        latency: 45,
        lastPing: new Date(),
        consecutiveFailures: 0,
        uptime: 86400,
        serverTimestamp: new Date(),
        networkQuality: 'good' as const
      });

      setLoading(false);
    };

    initializeConnection();

    // Simulate periodic health checks
    const healthCheckInterval = setInterval(() => {
      setHealthStatus((prev: any) => {
        if (!prev) return prev;

        return {
          ...prev,
          latency: Math.floor(Math.random() * 150) + 30,
          lastPing: new Date(),
          uptime: prev.uptime + 30
        };
      });
    }, 30000); // Every 30 seconds

    return () => clearInterval(healthCheckInterval);
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Connection Manager Integration</h2>
      <HealthStatusCard healthStatus={healthStatus} loading={loading} />
    </div>
  );
};

/**
 * Example 8: Grid Layout with Multiple States
 */
export const GridLayoutExample: React.FC = () => {
  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-6">All States Overview</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <BasicExample />
        <DegradedExample />
        <UnhealthyExample />
        <LoadingExample />
        <EmptyExample />
      </div>
    </div>
  );
};

/**
 * Example 9: Dark Mode
 */
export const DarkModeExample: React.FC = () => {
  const healthStatus = {
    isHealthy: true,
    latency: 45,
    lastPing: new Date(),
    consecutiveFailures: 0,
    uptime: 432000,
    serverTimestamp: new Date(),
    networkQuality: 'excellent' as const
  };

  return (
    <div className="p-4 dark bg-gray-900 min-h-screen">
      <h2 className="text-xl font-bold mb-4 text-white">Dark Mode</h2>
      <HealthStatusCard healthStatus={healthStatus} />
    </div>
  );
};

// Export all examples for demo page
export const AllExamples = {
  BasicExample,
  DegradedExample,
  UnhealthyExample,
  LoadingExample,
  EmptyExample,
  LiveUpdateExample,
  ConnectionManagerExample,
  GridLayoutExample,
  DarkModeExample
};

export default AllExamples;
