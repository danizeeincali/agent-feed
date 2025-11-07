# Cost Monitoring Service - Quick Reference

## Quick Start

```bash
# Run tests
cd api-server
npm run test tests/cache-optimization/cost-monitoring.test.js

# Apply migration (if not already done)
node scripts/apply-migration-015.js
```

## API Endpoints

Base URL: `http://localhost:3001/api/cost-metrics`

### GET `/summary`
Complete cost summary with trends and alerts
```json
{
  "today": { "total_cost_usd": 1.87, ... },
  "cache_hit_ratio": 66.17,
  "seven_day_trend": [...],
  "threshold_exceeded": false
}
```

### GET `/daily`
Today's aggregated metrics
```json
{
  "total_cache_write_tokens": 417312,
  "total_cache_read_tokens": 816139,
  "total_cost_usd": 1.87
}
```

### GET `/trend/:days`
Historical trend (1-365 days)
```bash
GET /trend/7  # Last 7 days
```

### POST `/record`
Record usage (internal)
```json
{
  "cache_write_tokens": 417312,
  "cache_read_tokens": 816139,
  "timestamp": 1730880000000
}
```

### GET `/alerts`
Alert status
```json
{
  "threshold_exceeded": false,
  "current_daily_cost": 1.87,
  "threshold": 5.0
}
```

### GET `/savings`
Cost savings calculation
```json
{
  "cost_with_cache_usd": 1.87,
  "savings_usd": 1.83,
  "savings_percentage": 49.46
}
```

## Service Usage

```javascript
import CostMonitoringService from './services/cost-monitoring-service.js';

const service = new CostMonitoringService();

// Record usage
await service.recordCacheUsage({
  cache_write_tokens: 417312,
  cache_read_tokens: 816139,
  timestamp: Date.now()
});

// Calculate cost
const cost = service.calculateCost({
  cache_write_tokens: 417312,
  cache_read_tokens: 816139
});
// Returns: { cache_write_cost_usd, cache_read_cost_usd, total_cost_usd }

// Get daily metrics
const daily = await service.getDailyMetrics();

// Get 7-day trend
const trend = await service.getCostTrend(7);

// Calculate savings
const savings = service.calculateCacheSavings({
  cache_read_tokens: 816139,
  cache_write_tokens: 417312,
  input_tokens_without_cache: 1233451
});
```

## Pricing (Claude Sonnet 4)

| Token Type | Per 1K | Per 1M |
|-----------|--------|--------|
| Cache Write | $0.00375 | $3.75 |
| Cache Read | $0.000375 | $0.375 |
| Standard Input | $0.003 | $3.00 |

## Cost Examples

### Example 1: Typical Usage
- Write: 417,312 tokens → $1.56
- Read: 816,139 tokens → $0.31
- **Total: $1.87** ✅ Under threshold

### Example 2: High Usage
- Write: 1,000,000 tokens → $3.75
- Read: 3,000,000 tokens → $1.13
- **Total: $4.88** ⚠️ Near threshold

### Example 3: Over Threshold
- Write: 2,000,000 tokens → $7.50
- Read: 2,000,000 tokens → $0.75
- **Total: $8.25** ❌ Over threshold (alert triggered)

## Cache Hit Ratio

Formula: `(read_tokens / (read_tokens + write_tokens)) × 100`

### Efficiency Ratings
- **>70%**: Excellent cache efficiency
- **40-70%**: Good cache usage
- **<40%**: Poor - optimize cache strategy

### Example
```javascript
const ratio = service.calculateCacheHitRatio({
  cache_read_tokens: 816139,
  cache_write_tokens: 417312
});
// Returns: 66.17% (Good efficiency)
```

## Alert System

### Default Threshold
$5.00/day

### Modify Threshold
```javascript
class CostMonitoringService {
  constructor() {
    this.ALERT_THRESHOLD_USD = 10.0; // Set your threshold
  }
}
```

### Alert Example
```
⚠️ Cost threshold exceeded: $14.67/day (threshold: $5)
```

## Database Schema

```sql
cache_cost_metrics (
  id INTEGER PRIMARY KEY,
  date TEXT NOT NULL,
  cache_write_tokens INTEGER NOT NULL,
  cache_read_tokens INTEGER NOT NULL,
  cache_write_cost_usd REAL NOT NULL,
  cache_read_cost_usd REAL NOT NULL,
  total_cost_usd REAL NOT NULL,
  timestamp INTEGER NOT NULL,
  UNIQUE(date, timestamp)
)
```

### Indexes
- `idx_cache_cost_date` - Date queries
- `idx_cache_cost_timestamp` - Time-series
- `idx_cache_cost_total` - Cost threshold queries

## Test Results

```
✅ Test Files:  1 passed (1)
✅ Tests:       12 passed (12)
⏱️  Duration:    2.21s
📊 Coverage:    100% of service methods
```

## Files Reference

```
/api-server/services/cost-monitoring-service.js    (254 lines)
/api-server/routes/cost-metrics.js                 (175 lines)
/api-server/tests/cache-optimization/cost-monitoring.test.js  (201 lines)
/api-server/db/migrations/015-cache-cost-metrics.sql  (25 lines)
/api-server/scripts/apply-migration-015.js         (73 lines)
```

## Common Tasks

### Check Current Cost
```bash
curl http://localhost:3001/api/cost-metrics/daily | jq '.data.total_cost_usd'
```

### Check Alert Status
```bash
curl http://localhost:3001/api/cost-metrics/alerts | jq '.data.threshold_exceeded'
```

### Get 7-Day Trend
```bash
curl http://localhost:3001/api/cost-metrics/trend/7 | jq
```

### Calculate Savings
```bash
curl http://localhost:3001/api/cost-metrics/savings | jq '.data.savings_percentage'
```

## React Component Example

```tsx
import { useState, useEffect } from 'react';

function CostMonitor() {
  const [cost, setCost] = useState(null);

  useEffect(() => {
    fetch('/api/cost-metrics/daily')
      .then(r => r.json())
      .then(data => setCost(data.data));
  }, []);

  if (!cost) return <div>Loading...</div>;

  return (
    <div>
      <h3>Today's Cost: ${cost.total_cost_usd}</h3>
      {cost.total_cost_usd > 5 && (
        <div className="alert">⚠️ Over threshold!</div>
      )}
    </div>
  );
}
```

## Troubleshooting

### Issue: API returns 500 error
**Fix**: Check database migration applied
```bash
node api-server/scripts/apply-migration-015.js
```

### Issue: Tests fail
**Fix**: Ensure database connected
```bash
cd api-server && npm run test
```

### Issue: No data returned
**Fix**: Record some test data
```bash
curl -X POST http://localhost:3001/api/cost-metrics/record \
  -H "Content-Type: application/json" \
  -d '{
    "cache_write_tokens": 100000,
    "cache_read_tokens": 200000,
    "timestamp": '$(date +%s000)'
  }'
```

## Documentation Links

- **Full API Docs**: [COST-MONITORING-SERVICE.md](./COST-MONITORING-SERVICE.md)
- **Test Report**: [COST-MONITORING-TEST-REPORT.md](./COST-MONITORING-TEST-REPORT.md)
- **Mission Summary**: [AGENT3-MISSION-COMPLETE.md](./AGENT3-MISSION-COMPLETE.md)

---

**Quick Reference Card** | Last Updated: 2025-11-06
