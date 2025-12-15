# Cost Monitoring Service Documentation

## Overview

The Cost Monitoring Service tracks Claude API cache token usage and calculates associated costs for optimization and budgeting. It provides real-time monitoring, alerts, and analytics for prompt caching efficiency.

## Features

- **Real-time Cost Tracking**: Monitor cache write/read token usage and costs
- **Cost Threshold Alerts**: Get notified when daily costs exceed $5 threshold
- **Cache Hit Ratio Analytics**: Track cache efficiency (read vs write ratio)
- **7-Day Cost Trends**: Historical cost analysis and projections
- **Cost Savings Calculator**: Compare cache costs vs standard input costs
- **Database Persistence**: Store metrics for historical analysis

## Pricing (Claude Sonnet 4)

| Token Type | Price per 1K tokens | Price per 1M tokens |
|-----------|-------------------|-------------------|
| Cache Write | $0.00375 | $3.75 |
| Cache Read | $0.000375 | $0.375 |
| Standard Input | $0.003 | $3.00 |

## Installation

### 1. Apply Database Migration

```bash
cd api-server
node scripts/apply-migration-015.js
```

This creates the `cache_cost_metrics` table with proper indexes.

### 2. Service Already Integrated

The service is automatically available at `/api/cost-metrics` endpoint.

## API Endpoints

### GET `/api/cost-metrics/summary`

Get comprehensive cost summary including today's metrics and 7-day trend.

**Response:**
```json
{
  "success": true,
  "data": {
    "today": {
      "date": "2025-11-06",
      "total_cache_write_tokens": 417312,
      "total_cache_read_tokens": 816139,
      "total_cost_usd": 1.871,
      "record_count": 1
    },
    "cache_hit_ratio": 66.17,
    "seven_day_trend": [
      {
        "date": "2025-11-06",
        "cost_usd": 1.871,
        "total_write_tokens": 417312,
        "total_read_tokens": 816139
      }
    ],
    "alert_threshold_usd": 5.0,
    "threshold_exceeded": false
  }
}
```

### GET `/api/cost-metrics/daily`

Get today's aggregated metrics.

**Response:**
```json
{
  "success": true,
  "data": {
    "date": "2025-11-06",
    "total_cache_write_tokens": 417312,
    "total_cache_read_tokens": 816139,
    "total_cache_write_cost_usd": 1.5649,
    "total_cache_read_cost_usd": 0.3061,
    "total_cost_usd": 1.871,
    "record_count": 1
  }
}
```

### GET `/api/cost-metrics/trend/:days`

Get cost trend over specified number of days (1-365).

**Example:** `/api/cost-metrics/trend/7`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "date": "2025-11-06",
      "cost_usd": 1.871,
      "total_write_tokens": 417312,
      "total_read_tokens": 816139
    }
  ]
}
```

### POST `/api/cost-metrics/record`

Record cache usage metrics (for internal use or webhooks).

**Request Body:**
```json
{
  "cache_write_tokens": 417312,
  "cache_read_tokens": 816139,
  "timestamp": 1730880000000
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "cache_write_cost_usd": 1.5649,
    "cache_read_cost_usd": 0.3061,
    "total_cost_usd": 1.871
  }
}
```

### GET `/api/cost-metrics/alerts`

Get current alert status and cost thresholds.

**Response:**
```json
{
  "success": true,
  "data": {
    "has_alert": false,
    "alert_message": null,
    "current_daily_cost": 1.871,
    "threshold": 5.0,
    "threshold_exceeded": false
  }
}
```

### GET `/api/cost-metrics/savings`

Calculate cost savings from using cache vs standard input.

**Response:**
```json
{
  "success": true,
  "data": {
    "cost_with_cache_usd": 1.871,
    "cost_without_cache_usd": 3.70,
    "savings_usd": 1.83,
    "savings_percentage": 49.46
  }
}
```

## Usage Examples

### JavaScript/TypeScript

```typescript
// Get daily cost summary
const response = await fetch('http://localhost:3001/api/cost-metrics/daily');
const { data } = await response.json();

console.log(`Today's cost: $${data.total_cost_usd}`);
console.log(`Cache write tokens: ${data.total_cache_write_tokens}`);
console.log(`Cache read tokens: ${data.total_cache_read_tokens}`);

// Check if alert threshold exceeded
const alertResponse = await fetch('http://localhost:3001/api/cost-metrics/alerts');
const alertData = await alertResponse.json();

if (alertData.data.threshold_exceeded) {
  console.warn(`⚠️ Cost threshold exceeded: $${alertData.data.current_daily_cost}`);
}

// Get 7-day cost trend
const trendResponse = await fetch('http://localhost:3001/api/cost-metrics/trend/7');
const trendData = await trendResponse.json();

trendData.data.forEach(day => {
  console.log(`${day.date}: $${day.cost_usd}`);
});
```

### React Component Example

```tsx
import { useEffect, useState } from 'react';

function CostMonitorDashboard() {
  const [costData, setCostData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCostData() {
      const response = await fetch('http://localhost:3001/api/cost-metrics/summary');
      const { data } = await response.json();
      setCostData(data);
      setLoading(false);
    }

    fetchCostData();
    // Refresh every 5 minutes
    const interval = setInterval(fetchCostData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="cost-monitor">
      <h2>Cache Cost Monitor</h2>

      <div className="today-metrics">
        <h3>Today's Cost: ${costData.today.total_cost_usd}</h3>
        <p>Cache Hit Ratio: {costData.cache_hit_ratio}%</p>

        {costData.threshold_exceeded && (
          <div className="alert">
            ⚠️ Cost threshold exceeded (${costData.alert_threshold_usd}/day)
          </div>
        )}
      </div>

      <div className="trend-chart">
        <h3>7-Day Cost Trend</h3>
        {costData.seven_day_trend.map(day => (
          <div key={day.date}>
            {day.date}: ${day.cost_usd}
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Service Methods

### CostMonitoringService Class

```javascript
import CostMonitoringService from './services/cost-monitoring-service.js';

const service = new CostMonitoringService();

// Record cache usage
await service.recordCacheUsage({
  cache_write_tokens: 417312,
  cache_read_tokens: 816139,
  timestamp: Date.now()
});

// Calculate cost from tokens
const cost = service.calculateCost({
  cache_write_tokens: 417312,
  cache_read_tokens: 816139
});
// Returns: { cache_write_cost_usd, cache_read_cost_usd, total_cost_usd }

// Check cost threshold
const alertTriggered = await service.checkCostThreshold({
  daily_cost_usd: 14.67
});

// Calculate cache hit ratio
const ratio = service.calculateCacheHitRatio({
  cache_read_tokens: 816139,
  cache_write_tokens: 417312
});
// Returns: 66.17 (percentage)

// Get daily metrics
const daily = await service.getDailyMetrics();

// Get aggregated daily metrics
const aggregated = await service.getAggregatedDailyMetrics();

// Get cost trend
const trend = await service.getCostTrend(7);

// Calculate cost savings
const savings = service.calculateCacheSavings({
  cache_read_tokens: 816139,
  cache_write_tokens: 417312,
  input_tokens_without_cache: 1233451
});
// Returns: { cost_with_cache_usd, cost_without_cache_usd, savings_usd, savings_percentage }

// Get comprehensive summary
const summary = await service.getCostSummary();
```

## Database Schema

```sql
CREATE TABLE cache_cost_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  cache_write_tokens INTEGER NOT NULL,
  cache_read_tokens INTEGER NOT NULL,
  cache_write_cost_usd REAL NOT NULL,
  cache_read_cost_usd REAL NOT NULL,
  total_cost_usd REAL NOT NULL,
  timestamp INTEGER NOT NULL,
  UNIQUE(date, timestamp)
) STRICT;

CREATE INDEX idx_cache_cost_date ON cache_cost_metrics(date);
CREATE INDEX idx_cache_cost_timestamp ON cache_cost_metrics(timestamp);
CREATE INDEX idx_cache_cost_total ON cache_cost_metrics(total_cost_usd);
```

## Testing

### Run All Tests

```bash
cd api-server
npm run test tests/cache-optimization/cost-monitoring.test.js
```

### Test Coverage

12 comprehensive tests covering:
- ✅ Cache token tracking
- ✅ Cost calculations
- ✅ Alert threshold triggering
- ✅ Cache hit ratio calculations
- ✅ Cost trend analytics
- ✅ Database persistence
- ✅ Error handling
- ✅ Daily metric aggregation
- ✅ Cost savings calculations
- ✅ Comprehensive summaries

**Test Results:**
```
Test Files  1 passed (1)
Tests       12 passed (12)
Duration    1.10s
```

## Configuration

### Alert Threshold

Default: $5.00/day

To modify, edit the service constructor:

```javascript
class CostMonitoringService {
  constructor() {
    this.ALERT_THRESHOLD_USD = 10.0; // Set your threshold
  }
}
```

### Pricing Constants

Update pricing if Claude rates change:

```javascript
class CostMonitoringService {
  constructor() {
    this.CACHE_WRITE_COST_PER_1K = 0.00375;  // $3.75 per million
    this.CACHE_READ_COST_PER_1K = 0.000375;   // $0.375 per million
    this.INPUT_COST_PER_1K = 0.003;           // $3.00 per million
  }
}
```

## Monitoring Best Practices

### 1. Track Cache Efficiency

Monitor cache hit ratio (target: >60%):
- High ratio (>70%): Excellent cache efficiency
- Medium ratio (40-70%): Good cache usage
- Low ratio (<40%): Consider optimizing cache strategy

### 2. Set Up Alerts

Configure notifications when daily costs exceed threshold:
- Email alerts
- Slack notifications
- Dashboard warnings

### 3. Analyze Cost Trends

Review 7-day trends weekly:
- Identify cost spikes
- Correlate with feature releases
- Optimize expensive operations

### 4. Calculate ROI

Compare cache costs vs standard input costs:
- Track savings percentage
- Validate cache strategy effectiveness
- Justify infrastructure costs

## Integration with Dashboard

The service is designed to integrate with a cost monitoring dashboard:

1. **Real-time Metrics**: Display current daily costs
2. **Cost Charts**: Visualize 7-day cost trends
3. **Alert Indicators**: Show threshold warnings
4. **Savings Display**: Highlight cost savings from caching
5. **Cache Efficiency**: Show cache hit ratio gauge

## Troubleshooting

### Issue: Tests failing

**Solution**: Ensure database migration applied:
```bash
node api-server/scripts/apply-migration-015.js
```

### Issue: API endpoint returns 500 error

**Solution**: Check database connection and table exists:
```bash
sqlite3 data/agent-pages.db ".tables"
# Should show cache_cost_metrics table
```

### Issue: Metrics not aggregating correctly

**Solution**: Verify timezone handling for date grouping:
```javascript
const today = new Date().toISOString().split('T')[0];
```

## Future Enhancements

- [ ] Email/Slack alert notifications
- [ ] Cost projections based on trends
- [ ] Budget allocation by feature/agent
- [ ] Cost optimization recommendations
- [ ] Export cost reports (CSV/PDF)
- [ ] Multi-workspace cost tracking
- [ ] Real-time WebSocket cost updates

## Support

- **Service File**: `/workspaces/agent-feed/api-server/services/cost-monitoring-service.js`
- **Routes File**: `/workspaces/agent-feed/api-server/routes/cost-metrics.js`
- **Tests File**: `/workspaces/agent-feed/api-server/tests/cache-optimization/cost-monitoring.test.js`
- **Migration File**: `/workspaces/agent-feed/api-server/db/migrations/015-cache-cost-metrics.sql`

## License

Part of Agent Feed project. See main project LICENSE.
