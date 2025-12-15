# System Health Monitoring Script

## Overview

`health-check.ts` is a comprehensive production monitoring script that performs real-time health checks on all critical system components. This script makes **actual API calls and database queries** to detect real issues in production.

**Location:** `/workspaces/agent-feed/scripts/health-check.ts`

## Key Features

### ✅ Real Health Checks (No Simulation)

All checks interact with real systems:
- **Real HTTP requests** to API health endpoint
- **Real PostgreSQL queries** for performance testing
- **Real database writes** for write capability validation
- **Real connection pool** metrics from PostgreSQL
- **Real memory and disk** usage from OS

### 🔍 Comprehensive Monitoring

1. **API Server Health** - HTTP GET to `http://localhost:3001/health`
2. **PostgreSQL Connection Pool** - Queries `pg_stat_activity` for connection stats
3. **Database Query Performance** - Executes 3 real queries with timing
4. **Memory Usage** - Node.js heap and system memory monitoring
5. **Disk Space** - Checks all critical paths for availability and usage
6. **Agent Registration** - SQL count query verifies 23 agents are registered
7. **Database Write Capability** - CREATE/DELETE test record in `health_checks` table
8. **Long-Running Queries** - Detects queries running > 30 seconds
9. **File Watcher Status** - Checks if file watcher process is active

## Usage

### Single Run

```bash
# Using npm script (recommended)
npm run health-check

# Or directly with tsx
tsx scripts/health-check.ts

# Exit codes:
#   0 = All systems healthy
#   1 = Critical issues detected
```

### Continuous Monitoring

```bash
# Run health checks every 30 seconds
npm run health-check:continuous

# Or directly
tsx scripts/health-check.ts --continuous

# Press Ctrl+C to stop
```

## Output Example

```
🏥 Running System Health Checks...
────────────────────────────────────────────────────────

✓ API Server Health: API responding in 45ms
  Details: {
    "status": "healthy",
    "uptime": { "seconds": 3825 },
    "memory": { "heapPercentage": 65 }
  }

✓ PostgreSQL Connection Pool: 6/16 connections (2 active)
  Details: {
    "total_connections": 6,
    "active_connections": 2,
    "idle_connections": 4
  }

✓ Database Query Performance: Avg query time: 12.33ms
  Details: {
    "queries": 3,
    "totalTime": 37,
    "breakdown": { "simple": 3, "count": 15, "join": 19 }
  }

✓ Memory Usage: Heap: 128/256MB (50.0%)
  Details: {
    "process": { "heap": "50.0", "rss": 145 },
    "system": { "used": "65.2", "free": 3521 }
  }

✓ Disk Space: All paths accessible

⚠ Agent Registration: Expected 23 agents, found 22

✓ Database Write Capability: Write successful in 23ms

✓ Database Issues: No issues detected

⚠ File Watcher: Not running (PID file not found)

────────────────────────────────────────────────────────

Health Summary:
  ● Healthy: 7
  ● Degraded: 2
  ● Critical: 0

⚠️  System degraded but operational

📄 Report saved: /workspaces/agent-feed/logs/health-report-2025-10-10T16-32-15-234Z.json
```

## Health Status Levels

### 🟢 Healthy
All metrics within normal operating ranges:
- API response time < 1000ms
- Memory usage < 80%
- Query performance < 200ms avg
- No blocking queries
- All critical paths accessible

### 🟡 Degraded
System operational but showing warning signs:
- API response time 1000-2000ms
- Memory usage 80-90%
- Query performance 200-500ms avg
- Long-running queries detected
- File watcher not running
- Agent count mismatch (non-critical)

### 🔴 Critical
System experiencing serious issues:
- API unreachable or timeout
- Memory usage > 90%
- Connection pool near capacity (> 90%)
- Query performance > 500ms avg
- Database write failures
- Blocking queries detected
- Missing critical paths

## Health Metrics Detail

### 1. API Server Health
**Check:** HTTP GET to `/health` endpoint
**Real Implementation:** Makes actual HTTP request using Node.js `http` module
**Measures:**
- Response time
- API status code
- Memory usage from health endpoint
- Uptime information

```typescript
// Real HTTP request
http.get(`${API_URL}/health`, (res) => {
  // Parse actual response
  const healthData = JSON.parse(data);
  // Check real memory usage
  const heapPercentage = healthData.data?.memory?.heapPercentage;
});
```

### 2. PostgreSQL Connection Pool
**Check:** Queries `pg_stat_activity` system table
**Real Implementation:** Creates actual pg.Pool connection and executes SQL
**Measures:**
- Total connections in use
- Active vs idle connections
- Pool capacity utilization

```typescript
// Real PostgreSQL query
const result = await client.query(`
  SELECT
    count(*) as total_connections,
    count(*) FILTER (WHERE state = 'active') as active_connections
  FROM pg_stat_activity
  WHERE datname = $1
`, [process.env.POSTGRES_DB]);
```

### 3. Database Query Performance
**Check:** Executes 3 real queries with timing
**Real Implementation:** Actual SQL queries against database
**Measures:**
- Simple SELECT timing
- COUNT query with WHERE clause
- Complex JOIN query performance

```typescript
// Test 1: Simple SELECT
await client.query('SELECT 1');

// Test 2: Count agents (real table)
await client.query('SELECT COUNT(*) FROM agents WHERE user_id = $1', ['anonymous']);

// Test 3: Complex join (real tables)
await client.query(`
  SELECT a.name, COUNT(p.id) as post_count
  FROM agents a
  LEFT JOIN agent_posts p ON a.id = p.author_agent_id
  WHERE a.user_id = $1
  GROUP BY a.name
`, ['anonymous']);
```

### 4. Memory Usage
**Check:** Node.js `process.memoryUsage()` and OS `os.totalmem()`
**Real Implementation:** Actual memory statistics from runtime
**Measures:**
- Heap used vs total
- RSS (Resident Set Size)
- System memory usage

### 5. Disk Space
**Check:** `fs.statfsSync()` for filesystem statistics
**Real Implementation:** Actual filesystem queries
**Measures:**
- Disk usage percentage
- Free space available
- Path existence validation

### 6. Agent Registration
**Check:** SQL COUNT query on agents table
**Real Implementation:** Actual database query
**Expected:** 23 agents should be registered
**Measures:**
- Total active agents
- Comparison to expected count

```typescript
// Real query to count agents
const result = await client.query(`
  SELECT COUNT(*) as count
  FROM agents
  WHERE user_id = $1 AND status = 'active'
`, ['anonymous']);
```

### 7. Database Write Capability
**Check:** INSERT, SELECT, DELETE test record
**Real Implementation:** Actual database write operations
**Measures:**
- Write operation timing
- Write verification success
- Cleanup success

```typescript
// Real database write test
const testId = `health-check-${Date.now()}`;

// CREATE test record
await client.query(`
  INSERT INTO health_checks (id, status, created_at)
  VALUES ($1, $2, NOW())
`, [testId, 'test']);

// VERIFY it exists
const verify = await client.query('SELECT id FROM health_checks WHERE id = $1', [testId]);

// DELETE test record
await client.query('DELETE FROM health_checks WHERE id = $1', [testId]);
```

### 8. Database Issues
**Check:** Queries `pg_stat_activity` for problematic queries
**Real Implementation:** Actual PostgreSQL monitoring queries
**Detects:**
- Long-running queries (> 30 seconds)
- Blocked queries (deadlocks)
- Query details for debugging

```typescript
// Real query to find long-running queries
const longQueries = await client.query(`
  SELECT pid, now() - query_start as duration, state, query
  FROM pg_stat_activity
  WHERE state != 'idle'
    AND now() - query_start > interval '30 seconds'
`, [process.env.POSTGRES_DB]);
```

### 9. File Watcher Status
**Check:** Reads PID file and verifies process
**Real Implementation:** Actual process existence check
**Measures:**
- PID file existence
- Process running status

## Report Generation

### Console Output
Colored, formatted output with:
- Status symbols (✓ ⚠ ✗)
- Detailed metrics
- Summary statistics
- Color-coded severity

### JSON Reports
Timestamped JSON files saved to `/workspaces/agent-feed/logs/`:

```json
{
  "timestamp": "2025-10-10T16:32:15.234Z",
  "metrics": [
    {
      "name": "API Server Health",
      "status": "healthy",
      "value": 45,
      "threshold": 1000,
      "message": "API responding in 45ms",
      "details": { ... },
      "timestamp": "2025-10-10T16:32:15.234Z"
    }
  ],
  "summary": {
    "total": 9,
    "healthy": 7,
    "degraded": 2,
    "critical": 0
  }
}
```

## Integration with Monitoring Systems

### Use in CI/CD Pipelines

```bash
# Pre-deployment health check
npm run health-check || exit 1

# Post-deployment verification
sleep 10  # Wait for services to stabilize
npm run health-check
```

### Cron Job for Continuous Monitoring

```bash
# Add to crontab for every 5 minutes
*/5 * * * * cd /workspaces/agent-feed && npm run health-check >> /var/log/health-check.log 2>&1
```

### Docker Health Check

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD npm run health-check || exit 1
```

### Kubernetes Liveness Probe

```yaml
livenessProbe:
  exec:
    command:
      - npm
      - run
      - health-check
  initialDelaySeconds: 30
  periodSeconds: 60
  timeoutSeconds: 10
  failureThreshold: 3
```

## Environment Variables

Required environment variables (from `.env`):

```bash
# API Configuration
PORT=3001  # API server port

# PostgreSQL Configuration
DB_HOST=localhost
DB_PORT=5432
POSTGRES_DB=avidm_dev
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password

# Connection Pool
DB_POOL_MIN=4
DB_POOL_MAX=16

# System Paths
WORKSPACE_ROOT=/workspaces/agent-feed
```

## Troubleshooting

### API Health Check Fails
```
✗ API Server Health: Cannot connect to API: connect ECONNREFUSED
```
**Solution:** Ensure API server is running on port 3001
```bash
cd api-server && npm run dev
```

### PostgreSQL Connection Fails
```
✗ PostgreSQL Connection Pool: Pool check failed: connection refused
```
**Solution:** Verify PostgreSQL is running and credentials are correct
```bash
psql -U postgres -d avidm_dev -c "SELECT 1"
```

### Agent Count Mismatch
```
⚠ Agent Registration: Expected 23 agents, found 22
```
**Solution:** Run agent migration
```bash
npm run migrate:agents
```

### health_checks Table Missing
```
⚠ Database Write Capability: health_checks table not found (non-critical)
```
**Solution:** This is expected if table doesn't exist. Create it:
```sql
CREATE TABLE IF NOT EXISTS health_checks (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

## Performance Impact

- **Single run:** ~500-1000ms total
- **Memory overhead:** < 10MB
- **Database load:** 3-5 lightweight queries
- **Network impact:** 1 HTTP request
- **Continuous mode:** ~0.1% CPU average

Safe for production use with minimal performance impact.

## Exit Codes

- `0` - All systems healthy or degraded (operational)
- `1` - Critical issues detected (system compromised)

## Security Considerations

1. **Credentials:** Uses environment variables, never hardcoded
2. **SQL Injection:** All queries use parameterized statements (`$1`, `$2`)
3. **Permissions:** Requires read access to databases, write access to health_checks table
4. **PID Security:** File watcher PID check uses signal 0 (non-invasive)
5. **Reports:** JSON reports may contain sensitive metrics, protect logs directory

## Development vs Production

### Development
```bash
# Quick check during development
npm run health-check

# Watch for issues while coding
npm run health-check:continuous
```

### Production
```bash
# Scheduled monitoring with log rotation
0 */5 * * * cd /workspaces/agent-feed && npm run health-check >> /var/log/health-check.log 2>&1

# Alert on critical issues
npm run health-check || /usr/local/bin/send-alert "System health critical"
```

## Future Enhancements

Potential additions:
- [ ] Slack/email notifications for critical issues
- [ ] Prometheus metrics export
- [ ] Custom threshold configuration via config file
- [ ] Historical trend analysis
- [ ] Auto-remediation for known issues
- [ ] GraphQL endpoint health checks
- [ ] Redis connection verification
- [ ] External service dependency checks

## Related Scripts

- `scripts/process-monitor.js` - Process-level monitoring
- `scripts/validate-phase1-deployment.sh` - Deployment validation
- `api-server/server.js` - API health endpoint implementation

## Support

For issues or questions:
1. Check logs in `/workspaces/agent-feed/logs/`
2. Review API server logs
3. Verify PostgreSQL connection
4. Ensure all environment variables are set

---

**Note:** This script is designed for production monitoring and uses real system interactions. All checks perform actual operations against live systems to ensure accurate health reporting.
