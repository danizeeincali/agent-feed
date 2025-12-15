# useMonitoringData Hook

Production-ready React custom hook for managing monitoring data from the Phase 5 Monitoring API.

## Features

✅ **Auto-refresh functionality** - Configurable polling with intelligent race condition prevention
✅ **Comprehensive error handling** - Graceful error recovery with callback support
✅ **Loading state management** - Track data fetching status
✅ **Alert acknowledgment** - Mark alerts as acknowledged with optimistic updates
✅ **Abort controller support** - Proper cleanup and cancellation of requests
✅ **TypeScript** - Full type safety with exported interfaces
✅ **Memory leak prevention** - Proper cleanup on unmount
✅ **Logging support** - Optional debug logging for troubleshooting

---

## Installation

The hook is already available in the project. Import it from the hooks directory:

```typescript
import { useMonitoringData } from '../hooks/useMonitoringData';
// or
import { useMonitoringData } from '../hooks';
```

---

## Basic Usage

```typescript
import { useMonitoringData } from '../hooks/useMonitoringData';

function MonitoringDashboard() {
  const {
    healthStatus,
    metrics,
    alerts,
    historicalStats,
    isLoading,
    error,
    refreshData,
    toggleAutoRefresh
  } = useMonitoringData();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h1>System Status: {healthStatus?.status}</h1>
      <button onClick={refreshData}>Refresh</button>
      <button onClick={toggleAutoRefresh}>Toggle Auto-Refresh</button>
    </div>
  );
}
```

---

## API Reference

### Options

```typescript
interface UseMonitoringDataOptions {
  autoRefreshEnabled?: boolean;   // Default: true
  refreshInterval?: number;        // Default: 10000ms (10 seconds)
  enableLogging?: boolean;         // Default: true
  onError?: (error: Error) => void;
  onRefresh?: () => void;
}
```

**Example with custom options:**

```typescript
const monitoring = useMonitoringData({
  autoRefreshEnabled: true,
  refreshInterval: 5000, // 5 seconds
  enableLogging: false,
  onError: (error) => {
    console.error('Monitoring error:', error);
    // Send to error tracking service
  },
  onRefresh: () => {
    console.log('Data refreshed at', new Date());
  }
});
```

---

### Return Value

```typescript
interface UseMonitoringDataReturn {
  // ===== DATA STATE =====
  healthStatus: HealthStatus | null;
  metrics: SystemMetrics | null;
  alerts: Alert[];
  historicalStats: HistoricalStats | null;
  alertsStats: AlertsResponse['stats'] | null;

  // ===== UI STATE =====
  isLoading: boolean;
  error: Error | null;
  autoRefresh: boolean;
  refreshInterval: number;
  lastUpdated: Date | null;

  // ===== METHODS =====
  refreshData: () => Promise<void>;
  toggleAutoRefresh: () => void;
  acknowledgeAlert: (alertId: string) => Promise<void>;
  setRefreshInterval: (ms: number) => void;
  clearError: () => void;
}
```

---

## Data Types

### HealthStatus

```typescript
interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: number;
  uptime: number;
  version: string;
  components: {
    database: ComponentHealth;
    monitoring: ComponentHealth;
    alerting: ComponentHealth;
    workers: ComponentHealth;
  };
  metrics?: {
    cpu: number;
    memory: number;
    disk: number;
  };
}
```

### SystemMetrics

```typescript
interface SystemMetrics {
  timestamp: number;
  system: {
    cpu: CpuMetrics;
    memory: MemoryMetrics;
    disk: DiskMetrics;
    network?: NetworkMetrics;
  };
  process: {
    cpu: number;
    memory: number;
    uptime: number;
    pid: number;
  };
  application: {
    requests: RequestMetrics;
    errors: ErrorMetrics;
    cache: CacheMetrics;
    queue: QueueMetrics;
  };
}
```

### Alert

```typescript
interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  message: string;
  triggeredAt: number;
  acknowledged: boolean;
  acknowledgedAt?: number;
  acknowledgedBy?: string;
  resolvedAt?: number;
  metadata: {
    metric: string;
    threshold: number;
    value: number;
    condition: string;
  };
  actions: string[];
}
```

### HistoricalStats

```typescript
interface HistoricalStats {
  dataPoints: number;
  timeRange: {
    start: number;
    end: number;
    duration: number;
  };
  cpuHistory: MetricDataPoint[];
  memoryHistory: MetricDataPoint[];
  diskHistory: MetricDataPoint[];
  requestHistory: MetricDataPoint[];
  errorHistory: MetricDataPoint[];
  trends: {
    cpu: TrendAnalysis;
    memory: TrendAnalysis;
    disk: TrendAnalysis;
    requests: TrendAnalysis;
    errors: TrendAnalysis;
  };
}
```

---

## Methods

### refreshData()

Manually refresh all monitoring data.

```typescript
const { refreshData, isLoading } = useMonitoringData();

async function handleRefresh() {
  await refreshData();
  console.log('Data refreshed!');
}

<button onClick={handleRefresh} disabled={isLoading}>
  Refresh
</button>
```

### toggleAutoRefresh()

Toggle auto-refresh on/off.

```typescript
const { autoRefresh, toggleAutoRefresh } = useMonitoringData();

<button onClick={toggleAutoRefresh}>
  {autoRefresh ? 'Disable' : 'Enable'} Auto-Refresh
</button>
```

### acknowledgeAlert(alertId)

Acknowledge an alert. Updates optimistically, then syncs with server.

```typescript
const { alerts, acknowledgeAlert } = useMonitoringData();

async function handleAcknowledge(alertId: string) {
  try {
    await acknowledgeAlert(alertId);
    console.log('Alert acknowledged');
  } catch (error) {
    console.error('Failed to acknowledge:', error);
  }
}

{alerts.map(alert => (
  <div key={alert.id}>
    {alert.message}
    {!alert.acknowledged && (
      <button onClick={() => handleAcknowledge(alert.id)}>
        Acknowledge
      </button>
    )}
  </div>
))}
```

### setRefreshInterval(ms)

Change the auto-refresh interval. Minimum is 1000ms (1 second).

```typescript
const { setRefreshInterval } = useMonitoringData();

<select onChange={(e) => setRefreshInterval(Number(e.target.value))}>
  <option value={5000}>5 seconds</option>
  <option value={10000}>10 seconds</option>
  <option value={30000}>30 seconds</option>
  <option value={60000}>1 minute</option>
</select>
```

### clearError()

Clear the error state.

```typescript
const { error, clearError } = useMonitoringData();

{error && (
  <div className="error">
    {error.message}
    <button onClick={clearError}>Dismiss</button>
  </div>
)}
```

---

## Advanced Examples

### Custom Error Handling

```typescript
const monitoring = useMonitoringData({
  onError: (error) => {
    // Send to error tracking service
    errorTracker.capture(error);

    // Show toast notification
    showNotification({
      type: 'error',
      message: `Monitoring error: ${error.message}`
    });
  }
});
```

### Health Indicator Component

```typescript
function HealthIndicator() {
  const { healthStatus, isLoading, error } = useMonitoringData({
    autoRefreshEnabled: true,
    refreshInterval: 5000
  });

  if (error) return <span>❌ Error</span>;
  if (isLoading && !healthStatus) return <span>⏳ Loading...</span>;

  const statusIcon = {
    healthy: '✅',
    degraded: '⚠️',
    unhealthy: '❌'
  }[healthStatus?.status || 'unhealthy'];

  return <span>{statusIcon} {healthStatus?.status}</span>;
}
```

### Alert Counter Badge

```typescript
function AlertBadge() {
  const { alerts, alertsStats } = useMonitoringData();

  const criticalCount = alerts.filter(a =>
    a.severity === 'critical' && !a.acknowledged
  ).length;

  if (criticalCount === 0) return null;

  return (
    <span className="badge critical">
      {criticalCount} Critical Alerts
    </span>
  );
}
```

### Metrics Chart with Auto-Refresh

```typescript
function MetricsChart() {
  const {
    metrics,
    isLoading,
    lastUpdated,
    autoRefresh,
    toggleAutoRefresh
  } = useMonitoringData({
    refreshInterval: 5000
  });

  return (
    <div>
      <div className="chart-header">
        <h2>System Metrics</h2>
        <div className="controls">
          <button onClick={toggleAutoRefresh}>
            {autoRefresh ? '⏸ Pause' : '▶ Resume'}
          </button>
          {lastUpdated && (
            <span>Updated: {lastUpdated.toLocaleTimeString()}</span>
          )}
        </div>
      </div>

      {metrics && (
        <div className="metrics">
          <div>CPU: {metrics.system.cpu.usage.toFixed(1)}%</div>
          <div>Memory: {metrics.system.memory.usagePercent.toFixed(1)}%</div>
          <div>Disk: {metrics.system.disk.usagePercent.toFixed(1)}%</div>
        </div>
      )}
    </div>
  );
}
```

---

## Performance Considerations

### Race Condition Prevention

The hook automatically prevents race conditions:
- Only one refresh can run at a time
- Subsequent refreshes are skipped if one is in progress
- Abort controllers cancel stale requests

### Memory Leak Prevention

The hook properly cleans up on unmount:
- Clears all intervals
- Aborts ongoing requests
- Clears API service cache
- Resets internal refs

### Optimistic Updates

Alert acknowledgment uses optimistic updates for instant UI feedback:

```typescript
await acknowledgeAlert(alertId);
// UI updates immediately, then syncs with server
```

---

## Troubleshooting

### Enable Debug Logging

```typescript
const monitoring = useMonitoringData({
  enableLogging: true // Default is true
});
```

Check browser console for messages like:
- `[useMonitoringData] Component mounted, fetching initial data...`
- `[useMonitoringData] Fetching monitoring data...`
- `[useMonitoringData] Auto-refresh triggered`

### Common Issues

**Data not refreshing?**
- Check that `autoRefresh` is `true`
- Verify `refreshInterval` is >= 1000ms
- Look for errors in console

**Stale data after unmount?**
- The hook automatically cleans up on unmount
- No manual cleanup needed

**High memory usage?**
- Consider increasing `refreshInterval`
- The hook includes built-in memory leak prevention

---

## Testing

See example usage in:
- `/workspaces/agent-feed/frontend/src/hooks/__tests__/useMonitoringData.example.tsx`

---

## Integration with MonitoringTab

This hook is designed to be used by the MonitoringTab component:

```typescript
// In MonitoringTab.tsx
import { useMonitoringData } from '../hooks/useMonitoringData';

function MonitoringTab() {
  const {
    healthStatus,
    metrics,
    alerts,
    historicalStats,
    isLoading,
    error,
    refreshData,
    toggleAutoRefresh,
    acknowledgeAlert
  } = useMonitoringData();

  // Use the data to render monitoring UI
  return (
    <div className="monitoring-tab">
      {/* Render monitoring dashboard */}
    </div>
  );
}
```

---

## Related Files

- **Service**: `/workspaces/agent-feed/frontend/src/services/MonitoringApiService.ts`
- **Hook**: `/workspaces/agent-feed/frontend/src/hooks/useMonitoringData.ts`
- **Examples**: `/workspaces/agent-feed/frontend/src/hooks/__tests__/useMonitoringData.example.tsx`
- **Export**: `/workspaces/agent-feed/frontend/src/hooks/index.ts`

---

## License

Part of the Agent Feed project.
