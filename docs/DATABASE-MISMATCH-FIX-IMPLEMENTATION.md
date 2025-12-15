# Database Mismatch Bug Fix - Implementation Summary

## Problem Statement
Server.js line 26 hardcoded PostgreSQL repository import, causing silent failures when running in SQLite mode. The orchestrator was trying to query `work_queue` table (PostgreSQL) when the actual table was `work_queue_tickets` (SQLite).

## Root Cause
```javascript
// OLD CODE (line 26 in server.js):
import workQueueRepository from './repositories/postgres/work-queue.repository.js';
```

This forced PostgreSQL usage regardless of `USE_POSTGRES` environment variable, breaking the dual-database architecture.

## Solution Implemented

### 1. Created Work Queue Selector
**File**: `/workspaces/agent-feed/api-server/config/work-queue-selector.js`

Follows the same pattern as `database-selector.js`:
- Respects `USE_POSTGRES` environment variable
- Provides unified `repository` getter
- Initializes with SQLite db instance when needed
- Singleton pattern for consistent usage

**Key Code**:
```javascript
class WorkQueueSelector {
  constructor() {
    this.usePostgres = process.env.USE_POSTGRES === 'true';
  }

  initialize(sqliteDb) {
    if (!this.usePostgres) {
      this.sqliteRepository = new SQLiteWorkQueueRepository(sqliteDb);
    }
  }

  get repository() {
    return this.usePostgres ? this.postgresRepository : this.sqliteRepository;
  }
}
```

### 2. Updated SQLite Repository
**File**: `/workspaces/agent-feed/api-server/repositories/work-queue-repository.js`

**Added method** at line 213-241:
```javascript
async getAllPendingTickets(options = {})
```

This provides PostgreSQL-compatible interface for the orchestrator:
- Accepts `status`, `limit`, `offset` options
- Returns Promise for consistency with PostgreSQL
- Queries `work_queue_tickets` table (SQLite)
- Includes debug logging

### 3. Updated PostgreSQL Repository
**File**: `/workspaces/agent-feed/api-server/repositories/postgres/work-queue.repository.js`

**Added method** at line 253-284:
```javascript
async getPendingTickets(options = {})
```

This provides compatibility with orchestrator's existing API:
- Accepts `limit`, `agent_id` options
- Queries `work_queue` table (PostgreSQL)
- Maintains existing `getAllPendingTickets()` for other uses

### 4. Updated server.js

#### Line 26 (Import Statement)
**OLD**:
```javascript
import workQueueRepository from './repositories/postgres/work-queue.repository.js';
```

**NEW**:
```javascript
import workQueueSelector from './config/work-queue-selector.js';
```

#### Lines 85-87 (Initialization)
**ADDED**:
```javascript
// Initialize work queue selector (must be called after database connections are established)
workQueueSelector.initialize(db);
console.log('✅ Work queue selector initialized');
```

#### Line 1133 (Post Ticket Creation)
**OLD**: `await workQueueRepository.createTicket({`
**NEW**: `await workQueueSelector.repository.createTicket({`

#### Line 1631 (Comment Ticket Creation #1)
**OLD**: `await workQueueRepository.createTicket({`
**NEW**: `await workQueueSelector.repository.createTicket({`

#### Line 1768 (Comment Ticket Creation #2)
**OLD**: `await workQueueRepository.createTicket({`
**NEW**: `await workQueueSelector.repository.createTicket({`

#### Lines 4333-4341 (Orchestrator Initialization)
**OLD**:
```javascript
await startOrchestrator({
  maxWorkers: parseInt(process.env.AVI_MAX_WORKERS) || 5,
  maxContextSize: parseInt(process.env.AVI_MAX_CONTEXT) || 50000,
  pollInterval: parseInt(process.env.AVI_POLL_INTERVAL) || 5000,
  healthCheckInterval: parseInt(process.env.AVI_HEALTH_CHECK_INTERVAL) || 30000
}, proactiveWorkQueue, websocketService);
```

**NEW**:
```javascript
// Use workQueueSelector.repository for post/comment tickets (respects USE_POSTGRES)
// This ensures orchestrator uses the same database mode as the rest of the app
await startOrchestrator({
  maxWorkers: parseInt(process.env.AVI_MAX_WORKERS) || 5,
  maxContextSize: parseInt(process.env.AVI_MAX_CONTEXT) || 50000,
  pollInterval: parseInt(process.env.AVI_POLL_INTERVAL) || 5000,
  healthCheckInterval: parseInt(process.env.AVI_HEALTH_CHECK_INTERVAL) || 30000
}, workQueueSelector.repository, websocketService);
console.log(`✅ AVI Orchestrator started - using ${workQueueSelector.usePostgres ? 'PostgreSQL' : 'SQLite'} work queue`);
```

## Database Schema Compatibility

### SQLite (work_queue_tickets table)
```sql
CREATE TABLE work_queue_tickets (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  agent_id TEXT NOT NULL,
  content TEXT NOT NULL,
  url TEXT,
  priority TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  retry_count INTEGER DEFAULT 0,
  metadata TEXT,
  post_id TEXT,
  created_at INTEGER NOT NULL,
  assigned_at INTEGER,
  completed_at INTEGER,
  result TEXT,
  last_error TEXT
)
```

### PostgreSQL (work_queue table)
```sql
CREATE TABLE work_queue (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) DEFAULT 'anonymous',
  post_id VARCHAR(255),
  post_content TEXT,
  post_author VARCHAR(255),
  post_metadata JSONB,
  assigned_agent VARCHAR(255),
  worker_id VARCHAR(255),
  priority INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pending',
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  result JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  assigned_at TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
)
```

## Benefits

1. **Dual Database Support**: Respects `USE_POSTGRES` environment variable
2. **No Breaking Changes**: Maintains backward compatibility with both databases
3. **Consistent Pattern**: Follows `database-selector.js` architecture
4. **Type Safety**: Both repositories expose same interface
5. **Debug Visibility**: Added logging to track which database is being used

## Testing Checklist

- [ ] Server starts successfully in SQLite mode (`USE_POSTGRES=false`)
- [ ] Server starts successfully in PostgreSQL mode (`USE_POSTGRES=true`)
- [ ] Post creation generates work queue ticket in correct database
- [ ] Comment creation generates work queue ticket in correct database
- [ ] Orchestrator polls correct work queue table
- [ ] Orchestrator processes tickets successfully
- [ ] No silent failures or database mismatch errors

## Files Modified

1. `/workspaces/agent-feed/api-server/config/work-queue-selector.js` - **CREATED**
2. `/workspaces/agent-feed/api-server/repositories/work-queue-repository.js` - Lines 213-241 added
3. `/workspaces/agent-feed/api-server/repositories/postgres/work-queue.repository.js` - Lines 253-284 added
4. `/workspaces/agent-feed/api-server/server.js` - Lines 26, 85-87, 1133, 1631, 1768, 4333-4341 modified

## Deployment Notes

- No database migrations required
- Both tables already exist in their respective databases
- Change is backward compatible
- Server restart required to pick up changes
