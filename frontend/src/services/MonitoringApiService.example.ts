/**
 * MonitoringApiService Usage Examples
 *
 * This file demonstrates how to use the MonitoringApiService
 * in your React components or other modules.
 */

import { monitoringApiService } from './MonitoringApiService';
import type {
  HealthStatus,
  SystemMetrics,
  AlertsResponse,
  HistoricalStats,
  AlertRule
} from './MonitoringApiService';

// ==================== EXAMPLE 1: Basic Health Check ====================

export async function checkSystemHealth(): Promise<void> {
  try {
    const health: HealthStatus = await monitoringApiService.getHealth();

    console.log('System Status:', health.status);
    console.log('Uptime:', health.uptime, 'seconds');
    console.log('Database:', health.components.database.status);
    console.log('Monitoring:', health.components.monitoring.status);

    if (health.status === 'unhealthy') {
      console.error('System is unhealthy!');
      // Handle unhealthy state (show alert, etc.)
    }
  } catch (error) {
    console.error('Failed to fetch health status:', error);
  }
}

// ==================== EXAMPLE 2: Fetch Current Metrics ====================

export async function fetchCurrentMetrics(): Promise<void> {
  try {
    const metrics = await monitoringApiService.getMetrics('json');

    if (typeof metrics === 'object') {
      console.log('CPU Usage:', metrics.system.cpu.usage, '%');
      console.log('Memory Usage:', metrics.system.memory.usagePercent, '%');
      console.log('Disk Usage:', metrics.system.disk.usagePercent, '%');
      console.log('Active Requests:', metrics.application.requests.activeRequests);
      console.log('Error Rate:', metrics.application.errors.rate);
    }
  } catch (error) {
    console.error('Failed to fetch metrics:', error);
  }
}

// ==================== EXAMPLE 3: Monitor Active Alerts ====================

export async function monitorActiveAlerts(): Promise<void> {
  try {
    // Get critical alerts only
    const alertsResponse: AlertsResponse = await monitoringApiService.getAlerts({
      severity: 'critical',
      acknowledged: false,
      page: 1,
      limit: 20
    });

    console.log(`Found ${alertsResponse.total} critical alerts`);
    console.log('Statistics:', alertsResponse.stats);

    alertsResponse.alerts.forEach(alert => {
      console.log(`
        Alert: ${alert.ruleName}
        Severity: ${alert.severity}
        Message: ${alert.message}
        Triggered: ${new Date(alert.triggeredAt).toLocaleString()}
        Value: ${alert.metadata.value} (threshold: ${alert.metadata.threshold})
      `);
    });
  } catch (error) {
    console.error('Failed to fetch alerts:', error);
  }
}

// ==================== EXAMPLE 4: Acknowledge Alert ====================

export async function acknowledgeAlert(alertId: string): Promise<void> {
  try {
    const response = await monitoringApiService.acknowledgeAlert(
      alertId,
      'admin@example.com'
    );

    if (response.success) {
      console.log('Alert acknowledged:', response.alert.ruleName);
      console.log('Acknowledged at:', new Date(response.alert.acknowledgedAt!).toLocaleString());
    }
  } catch (error) {
    console.error('Failed to acknowledge alert:', error);
  }
}

// ==================== EXAMPLE 5: Fetch Historical Stats ====================

export async function fetchHistoricalStats(): Promise<void> {
  try {
    // Get stats for the last 24 hours
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);

    const stats: HistoricalStats = await monitoringApiService.getStats({
      startTime: oneDayAgo,
      endTime: Date.now(),
      metrics: ['cpu', 'memory', 'requests']
    });

    console.log('Data Points:', stats.dataPoints);
    console.log('Time Range:', {
      start: new Date(stats.timeRange.start).toLocaleString(),
      end: new Date(stats.timeRange.end).toLocaleString(),
      duration: stats.timeRange.duration / 1000 / 60, // in minutes
    });

    // CPU Trend
    console.log('CPU Trend:', {
      direction: stats.trends.cpu.direction,
      changePercent: stats.trends.cpu.changePercent,
      average: stats.trends.cpu.average,
      min: stats.trends.cpu.min,
      max: stats.trends.cpu.max
    });

    // Memory Trend
    console.log('Memory Trend:', {
      direction: stats.trends.memory.direction,
      changePercent: stats.trends.memory.changePercent,
      average: stats.trends.memory.average
    });
  } catch (error) {
    console.error('Failed to fetch historical stats:', error);
  }
}

// ==================== EXAMPLE 6: Manage Alert Rules ====================

export async function manageAlertRules(): Promise<void> {
  try {
    // Get all rules
    const rulesResponse = await monitoringApiService.getRules();
    console.log(`Total rules: ${rulesResponse.total}`);

    // Add a new rule
    const newRule: AlertRule = {
      id: 'high-cpu-alert',
      name: 'High CPU Usage Alert',
      description: 'Alert when CPU usage exceeds 80%',
      enabled: true,
      metric: 'cpu.usage',
      condition: 'gt',
      threshold: 80,
      duration: 300000, // 5 minutes
      severity: 'high',
      actions: ['email', 'slack'],
      cooldown: 600000, // 10 minutes
      tags: ['performance', 'cpu']
    };

    const addResponse = await monitoringApiService.addRule(newRule);
    console.log('Rule added:', addResponse.rule.name);

    // Update the rule
    const updateResponse = await monitoringApiService.updateRule(
      'high-cpu-alert',
      { threshold: 85, severity: 'critical' }
    );
    console.log('Rule updated:', updateResponse.rule);

    // Delete the rule (if needed)
    // const deleteResponse = await monitoringApiService.deleteRule('high-cpu-alert');
    // console.log('Rule deleted:', deleteResponse.message);
  } catch (error) {
    console.error('Failed to manage rules:', error);
  }
}

// ==================== EXAMPLE 7: React Component Usage ====================

export function MonitoringDashboardExample() {
  // This is a conceptual example - actual React implementation would use hooks

  /*
  import { useEffect, useState } from 'react';
  import { monitoringApiService, HealthStatus } from './MonitoringApiService';

  function MonitoringDashboard() {
    const [health, setHealth] = useState<HealthStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
      let isMounted = true;

      async function loadHealth() {
        try {
          setLoading(true);
          const data = await monitoringApiService.getHealth();
          if (isMounted) {
            setHealth(data);
            setError(null);
          }
        } catch (err) {
          if (isMounted) {
            setError(err instanceof Error ? err.message : 'Failed to load health');
          }
        } finally {
          if (isMounted) {
            setLoading(false);
          }
        }
      }

      loadHealth();

      // Poll every 10 seconds
      const interval = setInterval(loadHealth, 10000);

      return () => {
        isMounted = false;
        clearInterval(interval);
        monitoringApiService.destroy(); // Cleanup
      };
    }, []);

    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error}</div>;
    if (!health) return null;

    return (
      <div>
        <h1>System Health</h1>
        <p>Status: {health.status}</p>
        <p>Uptime: {health.uptime}s</p>
        <p>CPU: {health.metrics?.cpu}%</p>
        <p>Memory: {health.metrics?.memory}%</p>
      </div>
    );
  }
  */
}

// ==================== EXAMPLE 8: Prometheus Metrics Export ====================

export async function exportPrometheusMetrics(): Promise<void> {
  try {
    const metrics = await monitoringApiService.getMetrics('prometheus');

    if (typeof metrics === 'string') {
      console.log('Prometheus metrics:');
      console.log(metrics);

      // You can expose this at /metrics endpoint for Prometheus scraping
    }
  } catch (error) {
    console.error('Failed to export Prometheus metrics:', error);
  }
}

// ==================== EXAMPLE 9: Cache Management ====================

export function manageCacheExample(): void {
  // Get cache statistics
  const stats = monitoringApiService.getCacheStats();
  console.log('Cache size:', stats.size);
  console.log('Cached keys:', stats.keys);

  // Clear specific cache pattern
  monitoringApiService.clearCache('/alerts');

  // Clear all cache
  monitoringApiService.clearCache();
}

// ==================== EXAMPLE 10: Error Handling Best Practices ====================

export async function errorHandlingExample(): Promise<void> {
  try {
    const health = await monitoringApiService.getHealth();

    // Success handling
    if (health.status === 'healthy') {
      console.log('✅ All systems operational');
    } else if (health.status === 'degraded') {
      console.warn('⚠️ System is degraded');
      // Show warning to user
    } else {
      console.error('❌ System is unhealthy');
      // Show error to user, trigger alerts
    }
  } catch (error) {
    // Network or API error
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        console.error('Request timed out - server may be slow');
      } else if (error.message.includes('Network error')) {
        console.error('Network connection failed');
      } else if (error.message.includes('HTTP 404')) {
        console.error('Endpoint not found - check API version');
      } else if (error.message.includes('HTTP 500')) {
        console.error('Server error - check backend logs');
      } else {
        console.error('Unexpected error:', error.message);
      }
    }

    // Implement retry logic or fallback behavior
    // Consider showing cached data if available
  }
}

// ==================== EXAMPLE 11: Abort Long-Running Requests ====================

export async function abortRequestsExample(): Promise<void> {
  // Start a request
  const statsPromise = monitoringApiService.getStats({
    startTime: Date.now() - (30 * 24 * 60 * 60 * 1000), // 30 days
    endTime: Date.now()
  });

  // Abort after 5 seconds if user navigates away
  setTimeout(() => {
    monitoringApiService.abortAll();
    console.log('Aborted all ongoing requests');
  }, 5000);

  try {
    await statsPromise;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.log('Request was aborted');
    }
  }
}
