# MonitoringApiService

Production-ready TypeScript API service wrapper for Phase 5 monitoring endpoints.

## Features

✅ **Full Type Safety** - Comprehensive TypeScript interfaces for all requests/responses
✅ **Retry Logic** - 3 attempts with exponential backoff (1s, 2s, 4s)
✅ **Request Caching** - Configurable TTL (5-30 seconds) for GET requests
✅ **Abort Controller** - Clean request cancellation and cleanup
✅ **Error Handling** - Network errors, timeouts, HTTP status codes
✅ **Loading States** - Track request lifecycle
✅ **Real API Endpoints** - No mocks, connects to actual backend

## Installation

```typescript
import { monitoringApiService } from './services/MonitoringApiService';
import type { HealthStatus, SystemMetrics, Alert } from './services/MonitoringApiService';
```

## API Reference

### Health Check

```typescript
// GET /api/monitoring/health
const health: HealthStatus = await monitoringApiService.getHealth();

console.log(health.status); // 'healthy' | 'degraded' | 'unhealthy'
console.log(health.uptime); // seconds
console.log(health.components.database.status);
```

### System Metrics

```typescript
// GET /api/monitoring/metrics
const metrics: SystemMetrics = await monitoringApiService.getMetrics();

console.log(metrics.system.cpu.usage); // CPU percentage
console.log(metrics.system.memory.usagePercent); // Memory percentage
console.log(metrics.application.requests.total); // Total requests

// Get Prometheus format
const prometheusMetrics = await monitoringApiService.getMetrics('prometheus');
```

### Active Alerts

```typescript
// GET /api/monitoring/alerts
const alerts = await monitoringApiService.getAlerts({
  severity: 'critical',
  acknowledged: false,
  page: 1,
  limit: 20
});

console.log(alerts.total); // Total alert count
console.log(alerts.alerts); // Alert array
console.log(alerts.stats.bySeverity); // Severity breakdown
```

### Alert History

```typescript
// GET /api/monitoring/alerts/history
const history = await monitoringApiService.getAlertHistory({
  severity: 'high',
  startTime: Date.now() - 86400000, // Last 24 hours
  page: 1,
  limit: 50
});
```

### Acknowledge Alert

```typescript
// POST /api/monitoring/alerts/:id/acknowledge
const result = await monitoringApiService.acknowledgeAlert(
  'alert-123',
  'admin@example.com'
);

console.log(result.success); // true
console.log(result.alert.acknowledgedAt); // timestamp
```

### Historical Statistics

```typescript
// GET /api/monitoring/stats
const stats = await monitoringApiService.getStats({
  startTime: Date.now() - 3600000, // Last hour
  endTime: Date.now(),
  metrics: ['cpu', 'memory', 'requests']
});

console.log(stats.cpuHistory); // Array of data points
console.log(stats.trends.cpu.direction); // 'increasing' | 'decreasing' | 'stable'
console.log(stats.trends.cpu.changePercent); // Percentage change
```

### Alert Rules

```typescript
// GET /api/monitoring/rules
const rules = await monitoringApiService.getRules();

// POST /api/monitoring/rules
const newRule = await monitoringApiService.addRule({
  id: 'cpu-alert',
  name: 'High CPU Alert',
  metric: 'cpu.usage',
  condition: 'gt',
  threshold: 80,
  severity: 'high',
  actions: ['email'],
  enabled: true
});

// PUT /api/monitoring/rules/:id
const updated = await monitoringApiService.updateRule('cpu-alert', {
  threshold: 85
});

// DELETE /api/monitoring/rules/:id
await monitoringApiService.deleteRule('cpu-alert');
```

## React Component Example

```typescript
import { useEffect, useState } from 'react';
import { monitoringApiService, HealthStatus } from './services/MonitoringApiService';

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
          setError(err instanceof Error ? err.message : 'Failed to load');
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
      monitoringApiService.destroy();
    };
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!health) return null;

  return (
    <div className="monitoring-dashboard">
      <h1>System Health</h1>
      <div className={`status status-${health.status}`}>
        {health.status.toUpperCase()}
      </div>
      <div className="metrics">
        <div>Uptime: {Math.floor(health.uptime / 3600)}h</div>
        <div>CPU: {health.metrics?.cpu}%</div>
        <div>Memory: {health.metrics?.memory}%</div>
      </div>
      <div className="components">
        <ComponentStatus name="Database" status={health.components.database.status} />
        <ComponentStatus name="Monitoring" status={health.components.monitoring.status} />
        <ComponentStatus name="Workers" status={health.components.workers.status} />
      </div>
    </div>
  );
}
```

## Error Handling

```typescript
try {
  const health = await monitoringApiService.getHealth();
  // Handle success
} catch (error) {
  if (error instanceof Error) {
    if (error.message.includes('timeout')) {
      // Handle timeout
      console.error('Request timed out');
    } else if (error.message.includes('Network error')) {
      // Handle network failure
      console.error('No network connection');
    } else if (error.message.includes('HTTP 404')) {
      // Handle not found
      console.error('Endpoint not found');
    } else if (error.message.includes('HTTP 500')) {
      // Handle server error
      console.error('Server error');
    } else {
      // Handle other errors
      console.error('Unexpected error:', error.message);
    }
  }
}
```

## Caching

```typescript
// Check cache statistics
const stats = monitoringApiService.getCacheStats();
console.log('Cache size:', stats.size);
console.log('Cached keys:', stats.keys);

// Clear specific cache pattern
monitoringApiService.clearCache('/alerts');

// Clear all cache
monitoringApiService.clearCache();

// Bypass cache for specific request
const freshMetrics = await monitoringApiService.getMetrics('json', undefined, false);
```

## Request Cancellation

```typescript
// Abort all ongoing requests
monitoringApiService.abortAll();

// Cleanup on component unmount
useEffect(() => {
  return () => {
    monitoringApiService.destroy();
  };
}, []);
```

## Configuration

The service automatically:
- **Retries** failed requests 3 times with exponential backoff
- **Caches** GET requests with appropriate TTL:
  - Health: 5 seconds
  - Metrics: 5 seconds
  - Stats: 10 seconds
  - Rules: 30 seconds
  - History: 30 seconds
  - Alerts: No cache (real-time)
- **Times out** requests after 8 seconds
- **Handles** network errors, timeouts, and HTTP errors

## Type Definitions

All types are fully documented and exported:

```typescript
import type {
  // Health
  HealthStatus,
  ComponentHealth,

  // Metrics
  SystemMetrics,
  CpuMetrics,
  MemoryMetrics,
  RequestMetrics,

  // Alerts
  Alert,
  AlertsResponse,
  AlertRule,

  // Statistics
  HistoricalStats,
  MetricDataPoint,
  TrendAnalysis
} from './services/MonitoringApiService';
```

## Best Practices

### 1. Use TypeScript Types

```typescript
import type { HealthStatus } from './services/MonitoringApiService';

const health: HealthStatus = await monitoringApiService.getHealth();
```

### 2. Handle Loading States

```typescript
const [loading, setLoading] = useState(true);
const [data, setData] = useState(null);

try {
  setLoading(true);
  const result = await monitoringApiService.getHealth();
  setData(result);
} finally {
  setLoading(false);
}
```

### 3. Clean Up Resources

```typescript
useEffect(() => {
  return () => {
    monitoringApiService.destroy();
  };
}, []);
```

### 4. Use Caching Wisely

```typescript
// Use cache for frequently accessed data
const metrics = await monitoringApiService.getMetrics(); // Cached

// Bypass cache for real-time data
const alerts = await monitoringApiService.getAlerts(); // Not cached
```

### 5. Implement Retry Logic

The service automatically retries failed requests, but you can add additional logic:

```typescript
async function loadWithRetry() {
  for (let i = 0; i < 3; i++) {
    try {
      return await monitoringApiService.getHealth();
    } catch (error) {
      if (i === 2) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

## Performance Tips

1. **Use caching** for frequently accessed data
2. **Poll wisely** - adjust intervals based on data freshness needs
3. **Abort requests** when component unmounts
4. **Clear cache** when data becomes stale
5. **Filter data** at the API level (use query parameters)
6. **Paginate** large datasets

## Troubleshooting

### Request Timeout

```typescript
// Default timeout is 8 seconds
// If you need longer, consider backend optimization
```

### Cache Not Working

```typescript
// Ensure you're using GET requests
// Check cache TTL hasn't expired
const stats = monitoringApiService.getCacheStats();
```

### Type Errors

```typescript
// Ensure you're importing types correctly
import type { HealthStatus } from './services/MonitoringApiService';
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/monitoring/health` | GET | System health status |
| `/api/monitoring/metrics` | GET | Current metrics snapshot |
| `/api/monitoring/alerts` | GET | Active alerts |
| `/api/monitoring/alerts/history` | GET | Alert history |
| `/api/monitoring/alerts/:id/acknowledge` | POST | Acknowledge alert |
| `/api/monitoring/stats` | GET | Historical statistics |
| `/api/monitoring/rules` | GET | Alert rules |
| `/api/monitoring/rules` | POST | Add alert rule |
| `/api/monitoring/rules/:id` | PUT | Update alert rule |
| `/api/monitoring/rules/:id` | DELETE | Delete alert rule |

## Contributing

When adding new endpoints:

1. Add types to the type definitions section
2. Implement the method following the existing pattern
3. Add error handling with retry logic
4. Configure appropriate cache TTL
5. Add usage examples to the example file
6. Update this README

## License

Part of the Agent Feed Phase 5 monitoring system.
