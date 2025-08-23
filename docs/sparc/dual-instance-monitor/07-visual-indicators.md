# SPARC Phase 7: Visual Indicator System for Dual Instance Status

## Overview

This phase designs a comprehensive visual indicator system that provides intuitive, real-time feedback about the dual instance monitor status, connection health, and system performance through modern React components.

## Core Visual Components Architecture

### 1. Dual Instance Status Dashboard

```typescript
// /frontend/src/components/dual-instance/DualInstanceDashboard.tsx
import React, { useEffect, useState } from 'react';
import { useDualInstanceMonitor } from '@/hooks/useDualInstanceMonitor';
import { ConnectionStatusPanel } from './ConnectionStatusPanel';
import { SystemHealthIndicator } from './SystemHealthIndicator';
import { LogStreamViewer } from './LogStreamViewer';
import { PerformanceMetrics } from './PerformanceMetrics';
import { AlertPanel } from './AlertPanel';

interface DualInstanceDashboardProps {
  config?: DashboardConfig;
  onStatusChange?: (status: SystemStatus) => void;
}

export const DualInstanceDashboard: React.FC<DualInstanceDashboardProps> = ({
  config,
  onStatusChange
}) => {
  const {
    systemStatus,
    instances,
    logs,
    metrics,
    alerts,
    connectionManager
  } = useDualInstanceMonitor();

  const [layout, setLayout] = useState<DashboardLayout>('default');
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  useEffect(() => {
    onStatusChange?.(systemStatus);
  }, [systemStatus, onStatusChange]);

  return (
    <div className="dual-instance-dashboard">
      {/* Header with overall status */}
      <DashboardHeader
        systemStatus={systemStatus}
        onLayoutChange={setLayout}
        onRefresh={() => connectionManager.refreshAll()}
      />

      {/* Alert banner */}
      {alerts.length > 0 && (
        <AlertBanner alerts={alerts} onDismiss={(id) => dismissAlert(id)} />
      )}

      {/* Main content area */}
      <div className={`dashboard-content layout-${layout}`}>
        
        {/* Left Panel - Instance Status */}
        <div className="instance-panel">
          <ConnectionStatusPanel
            instances={instances}
            onInstanceAction={(id, action) => handleInstanceAction(id, action)}
            onInstanceSelect={(id) => setSelectedInstance(id)}
          />
          
          <SystemHealthIndicator
            health={systemStatus.health}
            metrics={metrics}
            showDetails={layout === 'detailed'}
          />
        </div>

        {/* Center Panel - Main Content */}
        <div className="main-panel">
          <TabNavigation
            activeTab={activeTab}
            onTabChange={setActiveTab}
            tabs={['overview', 'logs', 'metrics', 'settings']}
          />

          <TabContent activeTab={activeTab}>
            <TabPanel value="overview">
              <OverviewPanel
                systemStatus={systemStatus}
                instances={instances}
                recentAlerts={alerts.slice(0, 5)}
              />
            </TabPanel>

            <TabPanel value="logs">
              <LogStreamViewer
                logEntries={logs}
                instances={instances}
                onFilterChange={(filter) => applyLogFilter(filter)}
              />
            </TabPanel>

            <TabPanel value="metrics">
              <PerformanceMetrics
                metrics={metrics}
                timeRange="1h"
                onTimeRangeChange={(range) => setTimeRange(range)}
              />
            </TabPanel>

            <TabPanel value="settings">
              <SettingsPanel
                config={config}
                onConfigChange={(newConfig) => updateConfig(newConfig)}
              />
            </TabPanel>
          </TabContent>
        </div>

        {/* Right Panel - Quick Actions */}
        {layout === 'detailed' && (
          <div className="actions-panel">
            <QuickActions
              instances={instances}
              onAction={(action) => executeQuickAction(action)}
            />
          </div>
        )}
      </div>
    </div>
  );
};
```

### 2. Connection Status Panel

```typescript
// /frontend/src/components/dual-instance/ConnectionStatusPanel.tsx
import React from 'react';
import { ConnectionStatusIndicator } from './ConnectionStatusIndicator';
import { InstanceCard } from './InstanceCard';

interface ConnectionStatusPanelProps {
  instances: InstanceState[];
  onInstanceAction: (instanceId: string, action: InstanceAction) => void;
  onInstanceSelect: (instanceId: string) => void;
}

export const ConnectionStatusPanel: React.FC<ConnectionStatusPanelProps> = ({
  instances,
  onInstanceAction,
  onInstanceSelect
}) => {
  const connectedInstances = instances.filter(i => i.connectionState === ConnectionState.CONNECTED);
  const overallStatus = calculateOverallStatus(instances);

  return (
    <div className="connection-status-panel">
      {/* Overall Status Header */}
      <div className="panel-header">
        <h3>Instance Status</h3>
        <ConnectionStatusIndicator
          status={overallStatus}
          size="large"
          showLabel={true}
          animated={true}
        />
      </div>

      {/* Dual Instance Status Badge */}
      <DualInstanceBadge
        connectedCount={connectedInstances.length}
        totalCount={instances.length}
        isOptimal={connectedInstances.length === 2}
      />

      {/* Instance List */}
      <div className="instance-list">
        {instances.map(instance => (
          <InstanceCard
            key={instance.descriptor.id}
            instance={instance}
            onClick={() => onInstanceSelect(instance.descriptor.id)}
            onAction={(action) => onInstanceAction(instance.descriptor.id, action)}
            showDetailedMetrics={true}
          />
        ))}
      </div>

      {/* Discovery Status */}
      <DiscoveryStatus
        isActive={true}
        lastDiscovery={new Date()}
        discoveredCount={instances.length}
      />
    </div>
  );
};

// Connection Status Indicator Component
export const ConnectionStatusIndicator: React.FC<{
  status: OverallStatus;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  animated?: boolean;
}> = ({ status, size = 'medium', showLabel = false, animated = false }) => {
  const getStatusConfig = (status: OverallStatus) => {
    switch (status) {
      case OverallStatus.DUAL_INSTANCE_ACTIVE:
        return {
          color: '#10B981', // Green
          icon: '⚡',
          label: 'Dual Instance Active',
          pulseColor: '#34D399'
        };
      case OverallStatus.ALL_CONNECTED:
        return {
          color: '#059669', // Dark Green
          icon: '✅',
          label: 'All Connected',
          pulseColor: '#10B981'
        };
      case OverallStatus.PARTIALLY_CONNECTED:
        return {
          color: '#F59E0B', // Yellow
          icon: '⚠️',
          label: 'Partially Connected',
          pulseColor: '#FBBF24'
        };
      case OverallStatus.ALL_DISCONNECTED:
        return {
          color: '#EF4444', // Red
          icon: '❌',
          label: 'All Disconnected',
          pulseColor: '#F87171'
        };
      case OverallStatus.INITIALIZING:
        return {
          color: '#6B7280', // Gray
          icon: '🔄',
          label: 'Initializing',
          pulseColor: '#9CA3AF'
        };
      default:
        return {
          color: '#6B7280',
          icon: '❓',
          label: 'Unknown',
          pulseColor: '#9CA3AF'
        };
    }
  };

  const config = getStatusConfig(status);
  const sizeMap = { small: 8, medium: 12, large: 16 };
  const iconSize = sizeMap[size];

  return (
    <div className={`connection-status-indicator size-${size}`}>
      <div
        className={`status-dot ${animated ? 'animated' : ''}`}
        style={{
          backgroundColor: config.color,
          width: iconSize,
          height: iconSize,
          ...(animated && {
            boxShadow: `0 0 20px ${config.pulseColor}`,
            animation: 'pulse 2s infinite'
          })
        }}
      >
        <span className="status-icon" style={{ fontSize: iconSize * 0.6 }}>
          {config.icon}
        </span>
      </div>
      
      {showLabel && (
        <span className="status-label" style={{ color: config.color }}>
          {config.label}
        </span>
      )}
    </div>
  );
};

// Dual Instance Badge Component
export const DualInstanceBadge: React.FC<{
  connectedCount: number;
  totalCount: number;
  isOptimal: boolean;
}> = ({ connectedCount, totalCount, isOptimal }) => {
  return (
    <div className={`dual-instance-badge ${isOptimal ? 'optimal' : 'suboptimal'}`}>
      <div className="badge-content">
        <div className="instance-count">
          <span className="connected">{connectedCount}</span>
          <span className="separator">/</span>
          <span className="total">{totalCount}</span>
        </div>
        <div className="badge-label">
          {isOptimal ? 'Dual Instance Active' : 'Instances Connected'}
        </div>
        {isOptimal && <div className="optimal-indicator">⚡</div>}
      </div>
    </div>
  );
};
```

### 3. Instance Card Component

```typescript
// /frontend/src/components/dual-instance/InstanceCard.tsx
import React, { useState } from 'react';
import { HealthMeter } from './HealthMeter';
import { ConnectionTimeline } from './ConnectionTimeline';
import { MetricsChart } from './MetricsChart';

interface InstanceCardProps {
  instance: InstanceState;
  onClick: () => void;
  onAction: (action: InstanceAction) => void;
  showDetailedMetrics?: boolean;
}

export const InstanceCard: React.FC<InstanceCardProps> = ({
  instance,
  onClick,
  onAction,
  showDetailedMetrics = false
}) => {
  const [expanded, setExpanded] = useState(false);
  const { descriptor, connectionState, healthStatus, metrics } = instance;

  const getConnectionStateConfig = (state: ConnectionState) => {
    switch (state) {
      case ConnectionState.CONNECTED:
        return { color: '#10B981', icon: '🟢', label: 'Connected' };
      case ConnectionState.CONNECTING:
        return { color: '#F59E0B', icon: '🟡', label: 'Connecting' };
      case ConnectionState.RECONNECTING:
        return { color: '#F59E0B', icon: '🔄', label: 'Reconnecting' };
      case ConnectionState.DISCONNECTED:
        return { color: '#EF4444', icon: '🔴', label: 'Disconnected' };
      case ConnectionState.ERROR:
        return { color: '#DC2626', icon: '❌', label: 'Error' };
      case ConnectionState.CIRCUIT_BREAKER_OPEN:
        return { color: '#7C2D12', icon: '⚠️', label: 'Circuit Open' };
      default:
        return { color: '#6B7280', icon: '⚪', label: 'Unknown' };
    }
  };

  const stateConfig = getConnectionStateConfig(connectionState);

  return (
    <div 
      className={`instance-card state-${connectionState.toLowerCase()}`}
      onClick={onClick}
    >
      {/* Card Header */}
      <div className="card-header">
        <div className="instance-info">
          <div className="instance-name">
            {descriptor.metadata.name || `Instance ${descriptor.id.slice(-4)}`}
          </div>
          <div className="instance-type">
            {descriptor.type} • {descriptor.metadata.port || 'Unknown Port'}
          </div>
        </div>
        
        <div className="connection-status">
          <span className="status-icon">{stateConfig.icon}</span>
          <span className="status-text" style={{ color: stateConfig.color }}>
            {stateConfig.label}
          </span>
        </div>
      </div>

      {/* Health Indicator */}
      <div className="health-section">
        <HealthMeter
          health={healthStatus}
          size="small"
          showLatency={true}
          showUptime={true}
        />
      </div>

      {/* Quick Metrics */}
      <div className="quick-metrics">
        <MetricItem
          label="Latency"
          value={healthStatus.latency ? `${healthStatus.latency}ms` : 'N/A'}
          status={getLatencyStatus(healthStatus.latency)}
        />
        <MetricItem
          label="Uptime"
          value={`${(healthStatus.uptime * 100).toFixed(1)}%`}
          status={getUptimeStatus(healthStatus.uptime)}
        />
        <MetricItem
          label="Messages"
          value={metrics.usageMetrics.messagesReceived.toString()}
          status="neutral"
        />
      </div>

      {/* Connection Timeline */}
      {connectionState !== ConnectionState.CONNECTED && (
        <ConnectionTimeline
          instance={instance}
          compact={true}
        />
      )}

      {/* Action Buttons */}
      <div className="card-actions">
        {connectionState === ConnectionState.DISCONNECTED && (
          <button
            className="action-button primary"
            onClick={(e) => {
              e.stopPropagation();
              onAction('reconnect');
            }}
          >
            Reconnect
          </button>
        )}
        
        {connectionState === ConnectionState.CONNECTED && (
          <button
            className="action-button secondary"
            onClick={(e) => {
              e.stopPropagation();
              onAction('health_check');
            }}
          >
            Ping
          </button>
        )}

        <button
          className="action-button tertiary"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
        >
          {expanded ? '▲' : '▼'}
        </button>
      </div>

      {/* Expanded Details */}
      {expanded && showDetailedMetrics && (
        <div className="expanded-details">
          <div className="detailed-metrics">
            <MetricsChart
              data={metrics}
              timeRange="5m"
              height={100}
            />
          </div>
          
          <div className="instance-metadata">
            <h4>Instance Details</h4>
            <dl>
              <dt>URL</dt>
              <dd>{descriptor.url}</dd>
              <dt>Discovered</dt>
              <dd>{descriptor.discovered.toLocaleTimeString()}</dd>
              <dt>Capabilities</dt>
              <dd>{descriptor.capabilities.join(', ') || 'None'}</dd>
            </dl>
          </div>
        </div>
      )}
    </div>
  );
};

// Metric Item Component
const MetricItem: React.FC<{
  label: string;
  value: string;
  status: 'good' | 'warning' | 'error' | 'neutral';
}> = ({ label, value, status }) => {
  const statusColors = {
    good: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    neutral: '#6B7280'
  };

  return (
    <div className="metric-item">
      <div className="metric-label">{label}</div>
      <div 
        className="metric-value"
        style={{ color: statusColors[status] }}
      >
        {value}
      </div>
    </div>
  );
};
```

### 4. Health Visualization Components

```typescript
// /frontend/src/components/dual-instance/HealthMeter.tsx
import React from 'react';

interface HealthMeterProps {
  health: HealthStatus;
  size?: 'small' | 'medium' | 'large';
  showLatency?: boolean;
  showUptime?: boolean;
  interactive?: boolean;
}

export const HealthMeter: React.FC<HealthMeterProps> = ({
  health,
  size = 'medium',
  showLatency = false,
  showUptime = false,
  interactive = false
}) => {
  const healthScore = calculateHealthScore(health);
  const healthLevel = getHealthLevel(healthScore);
  
  const sizeConfig = {
    small: { radius: 30, strokeWidth: 4 },
    medium: { radius: 50, strokeWidth: 6 },
    large: { radius: 80, strokeWidth: 8 }
  };

  const config = sizeConfig[size];
  const circumference = 2 * Math.PI * config.radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (healthScore / 100) * circumference;

  return (
    <div className={`health-meter size-${size} ${interactive ? 'interactive' : ''}`}>
      <div className="meter-container">
        <svg
          width={(config.radius + config.strokeWidth) * 2}
          height={(config.radius + config.strokeWidth) * 2}
          className="health-circle"
        >
          {/* Background circle */}
          <circle
            cx={config.radius + config.strokeWidth}
            cy={config.radius + config.strokeWidth}
            r={config.radius}
            fill="none"
            stroke="#E5E7EB"
            strokeWidth={config.strokeWidth}
          />
          
          {/* Health progress circle */}
          <circle
            cx={config.radius + config.strokeWidth}
            cy={config.radius + config.strokeWidth}
            r={config.radius}
            fill="none"
            stroke={getHealthColor(healthLevel)}
            strokeWidth={config.strokeWidth}
            strokeLinecap="round"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            transform={`rotate(-90 ${config.radius + config.strokeWidth} ${config.radius + config.strokeWidth})`}
            className="health-progress"
          />
        </svg>
        
        {/* Center content */}
        <div className="meter-content">
          <div className="health-score">{Math.round(healthScore)}</div>
          <div className="health-label">{healthLevel}</div>
        </div>
      </div>

      {/* Additional metrics */}
      {(showLatency || showUptime) && (
        <div className="health-details">
          {showLatency && (
            <div className="health-metric">
              <span className="metric-label">Latency</span>
              <span className="metric-value">
                {health.latency ? `${health.latency}ms` : 'N/A'}
              </span>
            </div>
          )}
          
          {showUptime && (
            <div className="health-metric">
              <span className="metric-label">Uptime</span>
              <span className="metric-value">
                {(health.uptime * 100).toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// System Health Overview Component
export const SystemHealthIndicator: React.FC<{
  health: SystemHealthStatus;
  metrics: SystemMetrics;
  showDetails?: boolean;
}> = ({ health, metrics, showDetails = false }) => {
  return (
    <div className="system-health-indicator">
      <div className="health-overview">
        <HealthMeter
          health={health.overall}
          size="large"
          interactive={true}
        />
        
        <div className="health-summary">
          <h3>System Health</h3>
          <div className="health-stats">
            <HealthStat
              label="Network Quality"
              value={health.networkQuality}
              icon="📶"
            />
            <HealthStat
              label="Performance"
              value={getPerformanceLevel(metrics.performance)}
              icon="⚡"
            />
            <HealthStat
              label="Stability"
              value={getStabilityLevel(metrics.stability)}
              icon="🛡️"
            />
          </div>
        </div>
      </div>

      {showDetails && (
        <div className="health-details-panel">
          <HealthTrendChart
            data={health.trend}
            timeRange="1h"
          />
          
          <div className="health-alerts">
            {health.alerts.map(alert => (
              <HealthAlert key={alert.id} alert={alert} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
```

### 5. Real-time Performance Charts

```typescript
// /frontend/src/components/dual-instance/PerformanceCharts.tsx
import React, { useEffect, useRef } from 'react';
import { Chart, ChartConfiguration } from 'chart.js';

interface PerformanceChartsProps {
  metrics: SystemMetrics;
  timeRange: string;
  onTimeRangeChange: (range: string) => void;
}

export const PerformanceCharts: React.FC<PerformanceChartsProps> = ({
  metrics,
  timeRange,
  onTimeRangeChange
}) => {
  const latencyChartRef = useRef<HTMLCanvasElement>(null);
  const throughputChartRef = useRef<HTMLCanvasElement>(null);
  const errorRateChartRef = useRef<HTMLCanvasElement>(null);
  
  const latencyChart = useRef<Chart>();
  const throughputChart = useRef<Chart>();
  const errorRateChart = useRef<Chart>();

  useEffect(() => {
    initializeCharts();
    return () => {
      destroyCharts();
    };
  }, []);

  useEffect(() => {
    updateCharts();
  }, [metrics]);

  const initializeCharts = () => {
    // Latency Chart
    if (latencyChartRef.current) {
      latencyChart.current = new Chart(latencyChartRef.current, {
        type: 'line',
        data: {
          labels: [],
          datasets: [
            {
              label: 'Instance 1 Latency',
              data: [],
              borderColor: '#10B981',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              tension: 0.4
            },
            {
              label: 'Instance 2 Latency',
              data: [],
              borderColor: '#3B82F6',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              tension: 0.4
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Latency (ms)'
              }
            }
          },
          plugins: {
            title: {
              display: true,
              text: 'Connection Latency'
            }
          }
        }
      });
    }

    // Throughput Chart
    if (throughputChartRef.current) {
      throughputChart.current = new Chart(throughputChartRef.current, {
        type: 'bar',
        data: {
          labels: [],
          datasets: [
            {
              label: 'Messages/sec',
              data: [],
              backgroundColor: 'rgba(99, 102, 241, 0.8)',
              borderColor: '#6366F1',
              borderWidth: 1
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Messages per Second'
              }
            }
          },
          plugins: {
            title: {
              display: true,
              text: 'Message Throughput'
            }
          }
        }
      });
    }

    // Error Rate Chart
    if (errorRateChartRef.current) {
      errorRateChart.current = new Chart(errorRateChartRef.current, {
        type: 'doughnut',
        data: {
          labels: ['Success', 'Errors'],
          datasets: [
            {
              data: [0, 0],
              backgroundColor: ['#10B981', '#EF4444'],
              borderWidth: 0
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: true,
              text: 'Error Rate'
            },
            legend: {
              position: 'bottom'
            }
          }
        }
      });
    }
  };

  const updateCharts = () => {
    // Update charts with new metrics data
    updateLatencyChart();
    updateThroughputChart();
    updateErrorRateChart();
  };

  const updateLatencyChart = () => {
    if (!latencyChart.current || !metrics.latencyHistory) return;

    const chart = latencyChart.current;
    const timeLabels = metrics.latencyHistory.map(point => 
      new Date(point.timestamp).toLocaleTimeString()
    );

    chart.data.labels = timeLabels;
    chart.data.datasets[0].data = metrics.latencyHistory.map(point => point.instance1);
    chart.data.datasets[1].data = metrics.latencyHistory.map(point => point.instance2);
    
    chart.update('none'); // No animation for real-time updates
  };

  const updateThroughputChart = () => {
    if (!throughputChart.current || !metrics.throughputHistory) return;

    const chart = throughputChart.current;
    const timeLabels = metrics.throughputHistory.map(point => 
      new Date(point.timestamp).toLocaleTimeString()
    );

    chart.data.labels = timeLabels;
    chart.data.datasets[0].data = metrics.throughputHistory.map(point => point.messagesPerSecond);
    
    chart.update('none');
  };

  const updateErrorRateChart = () => {
    if (!errorRateChart.current) return;

    const chart = errorRateChart.current;
    const successRate = 100 - metrics.errorRate;
    
    chart.data.datasets[0].data = [successRate, metrics.errorRate];
    chart.update('none');
  };

  const destroyCharts = () => {
    latencyChart.current?.destroy();
    throughputChart.current?.destroy();
    errorRateChart.current?.destroy();
  };

  return (
    <div className="performance-charts">
      <div className="charts-header">
        <h3>Performance Metrics</h3>
        <div className="time-range-selector">
          {['5m', '15m', '1h', '6h', '24h'].map(range => (
            <button
              key={range}
              className={`range-button ${timeRange === range ? 'active' : ''}`}
              onClick={() => onTimeRangeChange(range)}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-container">
          <canvas ref={latencyChartRef} />
        </div>
        
        <div className="chart-container">
          <canvas ref={throughputChartRef} />
        </div>
        
        <div className="chart-container">
          <canvas ref={errorRateChartRef} />
        </div>
      </div>

      <div className="metrics-summary">
        <MetricsSummary metrics={metrics} />
      </div>
    </div>
  );
};
```

### 6. Alert and Notification System

```typescript
// /frontend/src/components/dual-instance/AlertSystem.tsx
import React, { useState, useEffect } from 'react';
import { AlertLevel, SystemAlert } from '@/types/alerts';

interface AlertSystemProps {
  alerts: SystemAlert[];
  onDismiss: (alertId: string) => void;
  onAction: (alertId: string, action: string) => void;
}

export const AlertSystem: React.FC<AlertSystemProps> = ({
  alerts,
  onDismiss,
  onAction
}) => {
  const [visibleAlerts, setVisibleAlerts] = useState<SystemAlert[]>([]);
  const [alertHistory, setAlertHistory] = useState<SystemAlert[]>([]);

  useEffect(() => {
    // Show new alerts and manage visibility
    const activeAlerts = alerts.filter(alert => !alert.dismissed);
    setVisibleAlerts(activeAlerts.slice(0, 5)); // Show max 5 alerts
    setAlertHistory(alerts.slice(0, 20)); // Keep last 20 alerts
  }, [alerts]);

  return (
    <div className="alert-system">
      {/* Active Alerts */}
      <div className="active-alerts">
        {visibleAlerts.map(alert => (
          <AlertCard
            key={alert.id}
            alert={alert}
            onDismiss={() => onDismiss(alert.id)}
            onAction={(action) => onAction(alert.id, action)}
          />
        ))}
      </div>

      {/* Alert History */}
      {alertHistory.length > 0 && (
        <div className="alert-history">
          <h4>Recent Alerts</h4>
          <div className="history-list">
            {alertHistory.map(alert => (
              <AlertHistoryItem
                key={alert.id}
                alert={alert}
                compact={true}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Individual Alert Card
const AlertCard: React.FC<{
  alert: SystemAlert;
  onDismiss: () => void;
  onAction: (action: string) => void;
}> = ({ alert, onDismiss, onAction }) => {
  const getAlertConfig = (level: AlertLevel) => {
    switch (level) {
      case AlertLevel.CRITICAL:
        return { color: '#DC2626', icon: '🚨', bg: '#FEF2F2' };
      case AlertLevel.ERROR:
        return { color: '#EF4444', icon: '❌', bg: '#FEF2F2' };
      case AlertLevel.WARNING:
        return { color: '#F59E0B', icon: '⚠️', bg: '#FFFBEB' };
      case AlertLevel.INFO:
        return { color: '#3B82F6', icon: 'ℹ️', bg: '#EFF6FF' };
      default:
        return { color: '#6B7280', icon: '📋', bg: '#F9FAFB' };
    }
  };

  const config = getAlertConfig(alert.level);

  return (
    <div 
      className={`alert-card level-${alert.level.toLowerCase()}`}
      style={{ backgroundColor: config.bg, borderLeftColor: config.color }}
    >
      <div className="alert-header">
        <span className="alert-icon">{config.icon}</span>
        <span className="alert-title" style={{ color: config.color }}>
          {alert.title}
        </span>
        <button className="dismiss-button" onClick={onDismiss}>
          ×
        </button>
      </div>

      <div className="alert-content">
        <p>{alert.message}</p>
        
        {alert.metadata && (
          <div className="alert-metadata">
            {Object.entries(alert.metadata).map(([key, value]) => (
              <span key={key} className="metadata-item">
                <strong>{key}:</strong> {String(value)}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="alert-footer">
        <span className="alert-time">
          {alert.timestamp.toLocaleTimeString()}
        </span>
        
        {alert.actions && alert.actions.length > 0 && (
          <div className="alert-actions">
            {alert.actions.map(action => (
              <button
                key={action.id}
                className={`action-button ${action.style || 'primary'}`}
                onClick={() => onAction(action.id)}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
```

## CSS Styling System

```css
/* /frontend/src/styles/dual-instance-monitor.css */

/* Dashboard Layout */
.dual-instance-dashboard {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
}

.dashboard-content {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 1rem;
  padding: 1rem;
  flex: 1;
  overflow: hidden;
}

.dashboard-content.layout-detailed {
  grid-template-columns: 300px 1fr 250px;
}

/* Connection Status Indicators */
.connection-status-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-dot {
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.status-dot.animated {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
  70% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
  100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
}

/* Instance Cards */
.instance-card {
  background: white;
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 0.75rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  cursor: pointer;
  border-left: 4px solid transparent;
}

.instance-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.instance-card.state-connected {
  border-left-color: #10B981;
}

.instance-card.state-disconnected {
  border-left-color: #EF4444;
}

.instance-card.state-connecting {
  border-left-color: #F59E0B;
}

/* Health Meter */
.health-meter {
  position: relative;
  display: inline-block;
}

.meter-container {
  position: relative;
}

.meter-content {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.health-score {
  font-size: 1.25rem;
  font-weight: bold;
  color: #1f2937;
}

.health-label {
  font-size: 0.75rem;
  color: #6b7280;
  text-transform: uppercase;
}

.health-progress {
  transition: stroke-dashoffset 0.5s ease;
}

/* Alert System */
.alert-card {
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 0.5rem;
  border-left: 4px solid;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.alert-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.alert-icon {
  margin-right: 0.5rem;
}

.dismiss-button {
  background: none;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.dismiss-button:hover {
  opacity: 1;
}

/* Performance Charts */
.performance-charts {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.charts-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 1rem;
  height: 400px;
}

.chart-container {
  position: relative;
  background: #f8fafc;
  border-radius: 8px;
  padding: 1rem;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .dashboard-content {
    grid-template-columns: 1fr;
  }
  
  .dashboard-content.layout-detailed {
    grid-template-columns: 1fr;
  }
  
  .charts-grid {
    grid-template-columns: 1fr;
    height: auto;
  }
}

@media (max-width: 768px) {
  .dual-instance-dashboard {
    padding: 0.5rem;
  }
  
  .instance-card {
    padding: 0.75rem;
  }
  
  .health-meter.size-large {
    transform: scale(0.8);
  }
}
```

This comprehensive visual indicator system provides:

1. **Real-time Status Updates**: Live connection and health indicators
2. **Intuitive Visual Feedback**: Color-coded states and animated indicators  
3. **Comprehensive Dashboards**: Multi-panel layout with detailed metrics
4. **Interactive Components**: Clickable cards and expandable details
5. **Alert Management**: Real-time notifications with action buttons
6. **Performance Visualization**: Charts and graphs for metrics
7. **Responsive Design**: Works on all screen sizes
8. **Accessibility**: Proper contrast and keyboard navigation
9. **Theme Support**: Light/dark mode compatibility
10. **Animation System**: Smooth transitions and status changes

The system provides clear visual feedback for all dual instance scenarios and ensures users can quickly understand system status at a glance.