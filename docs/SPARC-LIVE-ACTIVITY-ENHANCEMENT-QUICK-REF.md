# Enhanced Live Activity System - Quick Reference

## Overview
Real-time telemetry capture, processing, and visualization of Claude Code SDK activity.

## Architecture Components

### 1. Event Capture Layer
- **Location**: `ClaudeCodeSDKManager.queryClaudeCode()` message loop
- **Purpose**: Intercept SDK tool executions
- **Output**: Tool execution events → Event Queue

### 2. Event Processing Layer
- **Service**: `TelemetryService.js` (new)
- **Functions**:
  - Event validation & sanitization
  - Event enrichment (add context)
  - Event aggregation (metrics)
  - Batching (50 events or 500ms)

### 3. Broadcasting Layer
- **Endpoint**: `GET /api/activity/stream` (SSE)
- **Features**:
  - Real-time event streaming
  - Client filtering (priority, tools, session)
  - <50ms latency target
  - Connection pooling (max 1000 clients)

### 4. Persistence Layer
- **Database**: SQLite with WAL mode
- **Tables**:
  - `activity_events` - General event log
  - `agent_executions` - Agent-level tracking
  - `tool_executions` - Tool-level tracking
  - `session_metrics` - Session aggregates
- **Performance**: Batch writes, <10ms latency

### 5. Frontend Layer
- **Components**:
  - `<LiveActivityFeed />` - Real-time event stream
  - `<SessionMetricsPanel />` - Current session stats
  - `<ToolUsageChart />` - Tool breakdown
- **State**: Zustand store (activityStore)
- **Hook**: `useActivityStream()` for SSE connection

## Database Schema

### activity_events
```sql
CREATE TABLE activity_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,     -- 'tool_execution', 'agent_started', etc.
  session_id TEXT NOT NULL,
  tool_name TEXT,
  action TEXT,                   -- Sanitized (200 chars max)
  status TEXT NOT NULL,          -- 'started', 'success', 'failed'
  duration INTEGER,              -- Milliseconds
  timestamp DATETIME NOT NULL,
  metadata JSON
);
```

### agent_executions
```sql
CREATE TABLE agent_executions (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  agent_type TEXT NOT NULL,
  status TEXT NOT NULL,          -- 'running', 'completed', 'failed'
  prompt TEXT,                   -- Truncated (200 chars)
  model TEXT NOT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME,
  duration INTEGER,
  tokens_used INTEGER,
  cost REAL,
  error TEXT
);
```

### tool_executions
```sql
CREATE TABLE tool_executions (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  agent_id TEXT,
  tool_name TEXT NOT NULL,
  action TEXT,
  status TEXT NOT NULL,
  duration INTEGER NOT NULL,
  output_size INTEGER,
  file_path TEXT,                -- Sanitized
  error TEXT,
  timestamp DATETIME NOT NULL
);
```

### session_metrics
```sql
CREATE TABLE session_metrics (
  session_id TEXT PRIMARY KEY,
  start_time DATETIME NOT NULL,
  end_time DATETIME,
  duration INTEGER,
  request_count INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  total_cost REAL DEFAULT 0.0,
  agent_count INTEGER DEFAULT 0,
  tool_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  status TEXT                    -- 'active', 'completed', 'failed'
);
```

## API Endpoints

### SSE Stream
```
GET /api/activity/stream
Query: ?priority=high&tools=Bash,Read&session_id=xyz
Response: Server-Sent Events
```

### Activity Events
```
GET /api/activity/events
Query: ?session_id=xyz&tool=Read&status=success&page=1&limit=50
Response: { success, events[], pagination }
```

### Session Details
```
GET /api/activity/sessions/:sessionId
Query: ?include_tools=true&include_agents=true
Response: { success, session, agents[], tools[] }
```

### Metrics
```
GET /api/activity/metrics
Query: ?time_range=24h&session_id=xyz
Response: { success, metrics, time_range }
```

### Health Check
```
GET /api/activity/health
Response: { success, telemetry: { status, database_connected, ... } }
```

## Event Flow

### 1. Capture
```javascript
// In ClaudeCodeSDKManager.queryClaudeCode()
if (block.type === 'tool_use') {
  telemetryService.captureToolExecution({
    tool: block.name,
    action: formatToolAction(block.name, block.input),
    session_id: getCurrentSessionId(),
    timestamp: Date.now()
  });
}
```

### 2. Process
```javascript
// TelemetryService.captureToolExecution()
const enrichedEvent = enrichEvent(event);      // Add context
const validatedEvent = validateEvent(enrichedEvent); // Sanitize
queueEvent(validatedEvent);                    // Add to batch queue
```

### 3. Broadcast (Parallel)
```javascript
// Immediate SSE broadcast
broadcastToSSE(event);  // <50ms latency
```

### 4. Persist (Batched)
```javascript
// TelemetryWriter.flush() - every 500ms or 50 events
db.transaction(() => {
  for (const event of batch) {
    insertEvent(event);
  }
});  // <10ms write
```

### 5. Display
```javascript
// Frontend: useActivityStream()
const { isConnected } = useActivityStream({ priority: 'high' });
// Auto-updates <ActivityFeed /> component
```

## Performance Targets

| Metric | Target | Strategy |
|--------|--------|----------|
| Events/Hour | 10,000+ | Event batching |
| Concurrent Sessions | 100+ | Connection pooling |
| SSE Latency | <50ms | In-memory queue |
| DB Write Latency | <10ms | Batch writes |
| Query Time | <100ms | Optimized indexes |
| Frontend FPS | 30 | Virtual scrolling |

## Security Features

### Data Sanitization
- **Prompts**: Truncate to 200 chars, redact API keys
- **File Paths**: Remove user directories, truncate long paths
- **PII**: Filter emails, phone numbers, SSN, credit cards

### Access Control
- **API Key**: Required for all endpoints
- **Session Auth**: Users can only access their own sessions
- **Rate Limiting**: 100 requests/15min per IP

### CORS
- **Allowed Origins**: `localhost:5173`, production domain
- **Credentials**: Enabled for authenticated requests

## File Structure

### New Files
```
/workspaces/agent-feed/
├── src/
│   └── services/
│       ├── TelemetryService.js          (new)
│       ├── EventEnricher.js             (new)
│       ├── MetricsAggregator.js         (new)
│       └── TelemetryWriter.js           (new)
├── api-server/
│   ├── db/
│   │   └── migrations/
│   │       └── 009-telemetry-tables.sql (new)
│   └── scripts/
│       └── run-migration-009.js         (new)
└── frontend/
    └── src/
        ├── components/
        │   ├── LiveActivityFeed.jsx     (new)
        │   ├── ActivityEventItem.jsx    (new)
        │   ├── SessionMetricsPanel.jsx  (new)
        │   └── ToolUsageChart.jsx       (new)
        ├── hooks/
        │   └── useActivityStream.js     (new)
        └── stores/
            └── activityStore.js         (new)
```

### Modified Files
```
/workspaces/agent-feed/
├── src/
│   └── services/
│       └── ClaudeCodeSDKManager.js      (modify: add telemetry capture)
├── api-server/
│   └── server.js                        (enhance: add SSE endpoint)
└── src/
    └── api/
        └── routes/
            └── claude-code-sdk.js       (modify: enhance broadcastToolActivity)
```

## Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Create database migration (009-telemetry-tables.sql)
- [ ] Implement TelemetryService.js
- [ ] Implement TelemetryWriter.js (batch writes)
- [ ] Add telemetry capture to ClaudeCodeSDKManager

### Phase 2: API Layer (Week 2)
- [ ] Add SSE endpoint (/api/activity/stream)
- [ ] Implement activity events endpoint
- [ ] Implement session details endpoint
- [ ] Implement metrics endpoint

### Phase 3: Frontend (Week 3)
- [ ] Create activityStore (Zustand)
- [ ] Implement useActivityStream hook
- [ ] Build LiveActivityFeed component
- [ ] Build SessionMetricsPanel component

### Phase 4: Optimization (Week 4)
- [ ] Add virtual scrolling
- [ ] Optimize database indexes
- [ ] Implement event batching
- [ ] Add connection pooling

### Phase 5: Security & Testing (Week 5)
- [ ] Add data sanitization
- [ ] Implement rate limiting
- [ ] Add API key authentication
- [ ] Write E2E tests

## Quick Start Commands

### Run Migration
```bash
cd /workspaces/agent-feed/api-server
node scripts/run-migration-009.js
```

### Start Development
```bash
# Terminal 1: API Server
cd /workspaces/agent-feed/api-server
npm run dev

# Terminal 2: Frontend
cd /workspaces/agent-feed/frontend
npm run dev

# Terminal 3: Test SSE Connection
curl -N http://localhost:3001/api/activity/stream
```

### Test Telemetry
```javascript
// In browser console
const eventSource = new EventSource('http://localhost:3001/api/activity/stream?priority=high');
eventSource.onmessage = (e) => console.log('Event:', JSON.parse(e.data));
```

### Query Activity
```bash
# Get recent events
curl http://localhost:3001/api/activity/events?limit=10

# Get session details
curl http://localhost:3001/api/activity/sessions/session_xyz

# Get metrics
curl http://localhost:3001/api/activity/metrics?time_range=24h
```

## Monitoring

### Health Check
```bash
curl http://localhost:3001/api/activity/health
```

### Database Stats
```sql
-- Event count by type
SELECT event_type, COUNT(*) as count
FROM activity_events
GROUP BY event_type;

-- Top tools
SELECT tool_name, COUNT(*) as count
FROM tool_executions
GROUP BY tool_name
ORDER BY count DESC
LIMIT 10;

-- Session summary
SELECT status, COUNT(*) as count, AVG(duration) as avg_duration
FROM session_metrics
GROUP BY status;
```

### Prometheus Metrics
```bash
curl http://localhost:3001/metrics
```

## Troubleshooting

### SSE Not Connecting
- Check CORS configuration
- Verify SSE endpoint is running
- Check browser network tab for errors

### Events Not Persisting
- Check TelemetryWriter queue size
- Verify database connection
- Check migration status

### High Latency
- Monitor event queue size
- Check database write performance
- Verify batch size configuration

### Memory Issues
- Limit event history (max 100 in store)
- Enable virtual scrolling
- Clear old sessions periodically

## References

- **Full Architecture**: `/workspaces/agent-feed/docs/SPARC-LIVE-ACTIVITY-ENHANCEMENT-ARCHITECTURE.md`
- **Existing SSE Implementation**: `/workspaces/agent-feed/frontend/src/hooks/useHTTPSSE.jsx`
- **ClaudeCodeSDKManager**: `/workspaces/agent-feed/src/services/ClaudeCodeSDKManager.js`
- **Database Manager**: `/workspaces/agent-feed/api-server/database.js`

---

**Version**: 1.0.0
**Last Updated**: 2025-10-25
