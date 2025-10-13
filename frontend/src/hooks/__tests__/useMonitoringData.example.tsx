/**
 * Example usage of useMonitoringData hook
 * This file demonstrates how to use the hook in a React component
 */

import React from 'react';
import { useMonitoringData } from '../useMonitoringData';

/**
 * Example Component: Monitoring Dashboard
 */
export const MonitoringDashboardExample: React.FC = () => {
  const {
    healthStatus,
    metrics,
    alerts,
    historicalStats,
    alertsStats,
    isLoading,
    error,
    autoRefresh,
    refreshInterval,
    lastUpdated,
    refreshData,
    toggleAutoRefresh,
    acknowledgeAlert,
    setRefreshInterval,
    clearError
  } = useMonitoringData({
    autoRefreshEnabled: true,
    refreshInterval: 10000, // 10 seconds
    enableLogging: true,
    onError: (error) => {
      console.error('Monitoring error:', error);
    },
    onRefresh: () => {
      console.log('Data refreshed successfully');
    }
  });

  return (
    <div className="monitoring-dashboard">
      <div className="controls">
        <button onClick={refreshData} disabled={isLoading}>
          {isLoading ? 'Refreshing...' : 'Refresh Data'}
        </button>

        <button onClick={toggleAutoRefresh}>
          {autoRefresh ? 'Disable' : 'Enable'} Auto-Refresh
        </button>

        <select
          value={refreshInterval}
          onChange={(e) => setRefreshInterval(Number(e.target.value))}
        >
          <option value={5000}>5 seconds</option>
          <option value={10000}>10 seconds</option>
          <option value={30000}>30 seconds</option>
          <option value={60000}>1 minute</option>
        </select>

        {lastUpdated && (
          <span className="last-updated">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </span>
        )}
      </div>

      {error && (
        <div className="error-banner">
          <span>Error: {error.message}</span>
          <button onClick={clearError}>Dismiss</button>
        </div>
      )}

      {isLoading && <div className="loading">Loading monitoring data...</div>}

      <div className="data-sections">
        {/* Health Status Section */}
        {healthStatus && (
          <div className="health-section">
            <h2>System Health</h2>
            <div className={`status ${healthStatus.status}`}>
              Status: {healthStatus.status}
            </div>
            <div>Uptime: {Math.floor(healthStatus.uptime / 3600)} hours</div>
            <div>Version: {healthStatus.version}</div>

            <h3>Components</h3>
            {Object.entries(healthStatus.components).map(([name, component]) => (
              <div key={name} className={`component ${component.status}`}>
                {name}: {component.status}
                {component.message && <span> - {component.message}</span>}
              </div>
            ))}
          </div>
        )}

        {/* Metrics Section */}
        {metrics && (
          <div className="metrics-section">
            <h2>System Metrics</h2>
            <div className="metric">
              CPU Usage: {metrics.system.cpu.usage.toFixed(2)}%
            </div>
            <div className="metric">
              Memory Usage: {metrics.system.memory.usagePercent.toFixed(2)}%
            </div>
            <div className="metric">
              Disk Usage: {metrics.system.disk.usagePercent.toFixed(2)}%
            </div>
            <div className="metric">
              Active Requests: {metrics.application.requests.activeRequests}
            </div>
            <div className="metric">
              Error Rate: {metrics.application.errors.rate.toFixed(2)}/min
            </div>
          </div>
        )}

        {/* Alerts Section */}
        {alerts.length > 0 && (
          <div className="alerts-section">
            <h2>Active Alerts ({alerts.length})</h2>
            {alertsStats && (
              <div className="alert-stats">
                <span>Total: {alertsStats.total}</span>
                <span>Active: {alertsStats.active}</span>
                {Object.entries(alertsStats.bySeverity).map(([severity, count]) => (
                  <span key={severity}>
                    {severity}: {count}
                  </span>
                ))}
              </div>
            )}

            {alerts.map(alert => (
              <div key={alert.id} className={`alert ${alert.severity}`}>
                <div className="alert-header">
                  <span className="severity">{alert.severity.toUpperCase()}</span>
                  <span className="rule-name">{alert.ruleName}</span>
                </div>
                <div className="alert-message">{alert.message}</div>
                <div className="alert-metadata">
                  Metric: {alert.metadata.metric} |
                  Value: {alert.metadata.value} |
                  Threshold: {alert.metadata.threshold}
                </div>
                <div className="alert-time">
                  Triggered: {new Date(alert.triggeredAt).toLocaleString()}
                </div>
                {!alert.acknowledged && (
                  <button
                    onClick={() => acknowledgeAlert(alert.id)}
                    className="acknowledge-btn"
                  >
                    Acknowledge
                  </button>
                )}
                {alert.acknowledged && (
                  <div className="acknowledged">
                    Acknowledged
                    {alert.acknowledgedAt &&
                      ` at ${new Date(alert.acknowledgedAt).toLocaleString()}`
                    }
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Historical Stats Section */}
        {historicalStats && (
          <div className="stats-section">
            <h2>Historical Statistics</h2>
            <div className="time-range">
              Time Range: {new Date(historicalStats.timeRange.start).toLocaleString()}
              {' to '}
              {new Date(historicalStats.timeRange.end).toLocaleString()}
            </div>
            <div className="data-points">
              Data Points: {historicalStats.dataPoints}
            </div>

            <h3>Trends</h3>
            {Object.entries(historicalStats.trends).map(([metric, trend]) => (
              <div key={metric} className="trend">
                <strong>{metric}:</strong> {trend.direction}
                <span> ({trend.changePercent > 0 ? '+' : ''}{trend.changePercent.toFixed(2)}%)</span>
                <div className="trend-stats">
                  Avg: {trend.average.toFixed(2)} |
                  Min: {trend.min.toFixed(2)} |
                  Max: {trend.max.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Example Component: Simple Health Monitor
 */
export const SimpleHealthMonitor: React.FC = () => {
  const { healthStatus, isLoading, error } = useMonitoringData({
    autoRefreshEnabled: true,
    refreshInterval: 5000
  });

  if (isLoading && !healthStatus) {
    return <div>Loading health status...</div>;
  }

  if (error) {
    return <div className="error">Error: {error.message}</div>;
  }

  if (!healthStatus) {
    return <div>No health data available</div>;
  }

  return (
    <div className={`health-indicator ${healthStatus.status}`}>
      <span className="status-icon">
        {healthStatus.status === 'healthy' ? '✅' :
         healthStatus.status === 'degraded' ? '⚠️' : '❌'}
      </span>
      <span className="status-text">{healthStatus.status}</span>
    </div>
  );
};

/**
 * Example Component: Alert List with Acknowledgment
 */
export const AlertListExample: React.FC = () => {
  const { alerts, acknowledgeAlert, isLoading, error } = useMonitoringData({
    autoRefreshEnabled: true,
    refreshInterval: 10000
  });

  const handleAcknowledge = async (alertId: string) => {
    try {
      await acknowledgeAlert(alertId);
      console.log(`Alert ${alertId} acknowledged`);
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    }
  };

  if (error) {
    return <div className="error">Error loading alerts: {error.message}</div>;
  }

  if (alerts.length === 0) {
    return <div className="no-alerts">No active alerts</div>;
  }

  return (
    <div className="alert-list">
      <h3>Active Alerts ({alerts.length})</h3>
      {alerts.map(alert => (
        <div key={alert.id} className={`alert-item ${alert.severity}`}>
          <div>{alert.message}</div>
          {!alert.acknowledged && (
            <button
              onClick={() => handleAcknowledge(alert.id)}
              disabled={isLoading}
            >
              Acknowledge
            </button>
          )}
        </div>
      ))}
    </div>
  );
};
