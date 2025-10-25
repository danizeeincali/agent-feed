# Phase 2: Orchestrator Integration Research
**Research Date:** 2025-10-12
**Researcher:** Research Specialist Agent
**Status:** Complete

---

## Executive Summary

Phase 2 orchestrator is **partially implemented** with:
- ✅ Core orchestrator class (`/api-server/avi/orchestrator.js`)
- ✅ REST API endpoints (`/api-server/routes/avi-control.js`)
- ✅ Database repositories (PostgreSQL)
- ✅ Comprehensive test suite (101 tests)
- ❌ **Missing:** AgentWorker implementation
- ❌ **Missing:** Server startup integration
- ❌ **Missing:** Feed monitoring service

---

## 1. Orchestrator References in Codebase

### 1.1 Core Implementation Files

| File | Status | Purpose |
|------|--------|---------|
| `/api-server/avi/orchestrator.js` | ✅ Implemented | Main orchestrator class with start/stop/worker management |
| `/api-server/routes/avi-control.js` | ✅ Implemented | REST API endpoints for orchestrator control |
| `/api-server/repositories/postgres/avi-state.repository.js` | ✅ Implemented | State persistence layer |
| `/api-server/repositories/postgres/work-queue.repository.js` | ✅ Implemented | Work ticket management |
| `/api-server/worker/agent-worker.js` | ❌ Missing | Ephemeral worker implementation |

### 1.2 Test Files (101 Tests Total)

```
/api-server/tests/unit/avi/orchestrator.test.js
├── 57 unit tests
├── Mock-based (London School TDD)
└── Tests: start, stop, monitor, spawn, health checks

/api-server/tests/integration/avi/orchestrator-integration.test.js
├── 22 integration tests
├── Real PostgreSQL database
└── Tests: end-to-end workflows, context management, state persistence

/api-server/tests/e2e/avi/orchestrator-e2e.test.js
├── 22 E2E tests
├── Full orchestrator implementation included
└── Tests: lifecycle, monitoring, worker spawning, health dashboard
```

### 1.3 Integration Points Found

**Server Startup (server.js:19):**
```javascript
import { startOrchestrator, stopOrchestrator } from './avi/orchestrator.js';
```

**API Mounting (server.js:190):**
```javascript
app.use('/api/avi', aviControlRouter);
```

**Graceful Shutdown (server.js:3471-3478):**
```javascript
// Stop AVI Orchestrator
try {
  console.log('🤖 Stopping AVI Orchestrator...');
  await stopOrchestrator();
  console.log('✅ AVI Orchestrator stopped');
} catch (error) {
  console.warn('⚠️ Error stopping AVI Orchestrator:', error.message);
}
```

---

## 2. Express Server Startup Analysis

### 2.1 Initialization Flow

**File:** `/api-server/server.js` (3,538 lines)

```
1. Import Dependencies (lines 1-19)
   ├── Express, CORS, Security
   ├── Database connections (SQLite + PostgreSQL)
   ├── Route imports
   └── Orchestrator imports ✅

2. Database Initialization (lines 32-85)
   ├── SQLite databases (token analytics, agent pages)
   ├── PostgreSQL pool via database-selector
   └── Repository initialization

3. Security Middleware Setup (lines 100-169)
   ├── Helmet headers
   ├── CORS whitelist
   ├── Rate limiting
   ├── Input sanitization
   └── XSS/SQL injection prevention

4. Route Mounting (lines 171-190)
   ├── Claude Code SDK routes
   ├── Component catalog
   ├── Agent pages
   ├── Feedback routes
   └── AVI control routes ✅

5. Server Start (lines 3500+)
   └── Port 3001 (default)
```

### 2.2 Missing Integration

**Current State:**
- Orchestrator is imported but **NOT auto-started**
- Manual start required via POST `/api/avi/start`

**Needed Addition:**
```javascript
// After database initialization (around line 85)
if (process.env.AUTO_START_ORCHESTRATOR === 'true') {
  console.log('🤖 Auto-starting AVI Orchestrator...');
  await startOrchestrator({
    maxWorkers: parseInt(process.env.AVI_MAX_WORKERS) || 5,
    maxContextSize: parseInt(process.env.AVI_MAX_CONTEXT) || 50000,
    pollInterval: parseInt(process.env.AVI_POLL_INTERVAL) || 5000
  });
}
```

---

## 3. Database Connection Patterns

### 3.1 PostgreSQL Connection Management

**File:** `/api-server/config/postgres.js`

**Pattern: Singleton Pool Manager**
```javascript
class PostgresManager {
  constructor() {
    this.pool = null;
  }

  connect() {
    if (this.pool) return this.pool;

    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.POSTGRES_DB || 'avidm_dev',
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD,

      // Connection pool settings
      min: parseInt(process.env.DB_POOL_MIN || '4'),
      max: parseInt(process.env.DB_POOL_MAX || '16'),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT_MS || '30000'),
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT_MS || '2000'),
      statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT_MS || '30000')
    });

    return this.pool;
  }
}

export default new PostgresManager();
```

### 3.2 Repository Pattern

**All repositories follow same pattern:**

```javascript
class AviStateRepository {
  async getState() {
    const query = `SELECT * FROM avi_state WHERE id = 1`;
    const result = await postgresManager.query(query);
    return result.rows[0];
  }

  async updateState(updates) {
    // Parameterized queries for security
    const query = `UPDATE avi_state SET ... WHERE id = 1`;
    const result = await postgresManager.query(query, values);
    return result.rows[0];
  }
}

export default new AviStateRepository(); // Singleton pattern
```

### 3.3 Database Schema

**State Table:** `/src/database/schema/002_phase2_avi_state.sql`
```sql
ALTER TABLE avi_state
  ADD COLUMN IF NOT EXISTS status VARCHAR(50),
  ADD COLUMN IF NOT EXISTS start_time TIMESTAMP,
  ADD COLUMN IF NOT EXISTS tickets_processed INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS workers_spawned INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS active_workers INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_health_check TIMESTAMP,
  ADD COLUMN IF NOT EXISTS last_error TEXT;
```

**Work Queue Table:** `/src/database/schema/003_work_queue.sql`
```sql
CREATE TABLE work_queue (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(100) NOT NULL,
  post_id VARCHAR(100) NOT NULL,
  post_content TEXT NOT NULL,
  assigned_agent VARCHAR(50),
  worker_id VARCHAR(100),
  status VARCHAR(50) DEFAULT 'pending',
  priority INTEGER DEFAULT 0,
  result JSONB,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  assigned_at TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP
);
```

---

## 4. Feed Monitoring Setup

### 4.1 Current State: NOT IMPLEMENTED

**No feed monitoring service found in codebase.**

The orchestrator has a `processWorkQueue()` method but no actual feed ingestion:

```javascript
// orchestrator.js:92-116
async processWorkQueue() {
  // Get pending tickets from database
  const tickets = await workQueueRepo.getTicketsByUser(null, {
    status: 'pending',
    limit: availableSlots
  });

  // Spawn workers for each ticket
  for (const ticket of tickets) {
    await this.spawnWorker(ticket);
  }
}
```

### 4.2 Scheduling Pattern

**File:** `orchestrator.js:70-87`

```javascript
startMainLoop() {
  const loop = async () => {
    if (!this.running) return;

    try {
      await this.processWorkQueue();
    } catch (error) {
      console.error('❌ Error in main loop:', error);
    }

    // Schedule next iteration
    this.mainLoopTimer = setTimeout(loop, this.pollInterval);
  };

  loop();
}
```

**Pattern Used:** Recursive `setTimeout` (safer than `setInterval`)

### 4.3 Health Check Pattern

```javascript
startHealthMonitoring() {
  const healthCheck = async () => {
    if (!this.running) return;

    await aviStateRepo.updateState({
      context_size: this.contextSize,
      active_workers: this.activeWorkers.size,
      last_health_check: new Date()
    });

    this.healthCheckTimer = setTimeout(healthCheck, this.healthCheckInterval);
  };

  healthCheck();
}
```

### 4.4 Feed Configuration: MISSING

**Expected but not found:**
- Feed source configuration
- RSS/Atom feed URLs
- Polling intervals per feed
- Feed priority settings

**Recommendation:** Create `/api-server/config/feeds.json`:
```json
{
  "feeds": [
    {
      "id": "tech-feed",
      "type": "rss",
      "url": "https://example.com/feed",
      "pollInterval": 300000,
      "priority": 1
    }
  ]
}
```

---

## 5. Phase 2 Test Inventory

### 5.1 Test Suite Summary

| Test Type | File | Count | Status |
|-----------|------|-------|--------|
| Unit | `orchestrator.test.js` | 57 | ✅ Exists |
| Integration | `orchestrator-integration.test.js` | 22 | ✅ Exists |
| E2E | `orchestrator-e2e.test.js` | 22 | ✅ Exists |
| **Total** | | **101** | |

### 5.2 Test Execution Status

**Run tests with:**
```bash
# All orchestrator tests
npm test -- orchestrator

# Individual test files
npm test -- tests/unit/avi/orchestrator.test.js
npm test -- tests/integration/avi/orchestrator-integration.test.js
npm test -- tests/e2e/avi/orchestrator-e2e.test.js
```

### 5.3 Currently Failing Tests

**Expected Failures:**
1. All tests requiring `AgentWorker` class (not implemented)
2. Integration tests expecting feed monitoring
3. E2E tests with real worker execution

**Key Test Requirements:**
- Mock Claude API (no real API calls)
- Real PostgreSQL database
- Worker spawning verification
- Context size tracking
- Graceful restart logic

---

## 6. Environment Variables

### 6.1 Database Configuration

**Required:**
```bash
# PostgreSQL
USE_POSTGRES=true
DB_HOST=localhost
DB_PORT=5432
POSTGRES_DB=avidm_dev
POSTGRES_USER=postgres
POSTGRES_PASSWORD=dev_password_change_in_production

# Connection Pool
DB_POOL_MIN=4
DB_POOL_MAX=16
DB_IDLE_TIMEOUT_MS=30000
DB_CONNECTION_TIMEOUT_MS=2000
```

### 6.2 Orchestrator Configuration

**Needed (not yet defined):**
```bash
# Orchestrator Settings
AUTO_START_ORCHESTRATOR=false
AVI_MAX_WORKERS=5
AVI_MAX_CONTEXT=50000
AVI_POLL_INTERVAL=5000
AVI_HEALTH_CHECK_INTERVAL=30000

# Feed Monitoring
FEED_CONFIG_PATH=/workspaces/agent-feed/config/feeds.json
```

---

## 7. Missing Components Analysis

### 7.1 Critical Missing Files

| Component | Expected Path | Status | Priority |
|-----------|--------------|--------|----------|
| AgentWorker | `/api-server/worker/agent-worker.js` | ❌ Missing | **CRITICAL** |
| Feed Service | `/api-server/services/feed-monitor.js` | ❌ Missing | High |
| Feed Config | `/api-server/config/feeds.json` | ❌ Missing | Medium |

### 7.2 AgentWorker Requirements

**From orchestrator.js:131-163:**
```javascript
const worker = new AgentWorker({
  workerId,
  ticketId: ticket.id.toString(),
  agentId: ticket.agent_id
});

worker.execute()
  .then(async (result) => {
    await workQueueRepo.completeTicket(ticket.id.toString(), {
      result: result.response,
      tokens_used: result.tokensUsed || 0
    });
  })
  .catch(async (error) => {
    await workQueueRepo.failTicket(ticket.id.toString(), error.message);
  })
  .finally(() => {
    this.activeWorkers.delete(workerId);
  });
```

**Expected Interface:**
```typescript
class AgentWorker {
  constructor(config: {
    workerId: string;
    ticketId: string;
    agentId: string;
  });

  execute(): Promise<{
    response: string;
    tokensUsed: number;
  }>;
}
```

### 7.3 Feed Monitor Requirements

**Expected Interface:**
```javascript
class FeedMonitor {
  constructor(config) {
    this.feeds = config.feeds;
  }

  async pollFeeds() {
    // Poll each feed
    // Create work tickets for new posts
    // Return new ticket count
  }

  async markAsRead(feedId, postId) {
    // Update feed position
  }
}
```

---

## 8. Integration Approach Recommendations

### 8.1 Implementation Order

**Phase 2A: Core Components (Week 1)**
1. ✅ Orchestrator class (complete)
2. ✅ Repositories (complete)
3. ❌ **AgentWorker class** (implement first)
4. ❌ Basic worker execution

**Phase 2B: Feed Integration (Week 2)**
1. Feed configuration system
2. Feed monitor service
3. RSS/Atom parsers
4. Ticket creation from posts

**Phase 2C: Server Integration (Week 3)**
1. Auto-start on server boot
2. Environment configuration
3. Health monitoring
4. Production deployment

### 8.2 Quick Start Integration

**Minimal viable integration:**

```javascript
// api-server/server.js (after line 85)

// Initialize orchestrator if enabled
let orchestratorInstance = null;
if (process.env.USE_POSTGRES === 'true') {
  const { getOrchestrator } = await import('./avi/orchestrator.js');
  orchestratorInstance = getOrchestrator({
    maxWorkers: 5,
    maxContextSize: 50000,
    pollInterval: 5000
  });

  // Optional: Auto-start
  if (process.env.AUTO_START_ORCHESTRATOR === 'true') {
    await orchestratorInstance.start();
    console.log('✅ AVI Orchestrator started automatically');
  }
}

// Export for route access
export { orchestratorInstance };
```

### 8.3 Testing Strategy

**Before integration:**
1. Implement AgentWorker stub
2. Run unit tests (should pass)
3. Run integration tests with mocked workers
4. Verify database operations

**After integration:**
1. Manual testing via API endpoints
2. Monitor logs for errors
3. Check database state persistence
4. Verify graceful shutdown

---

## 9. Architecture Patterns Observed

### 9.1 Dependency Injection

```javascript
class AviOrchestrator {
  constructor(config = {}) {
    this.maxWorkers = config.maxWorkers || 5;
    // ...
  }
}

// Singleton pattern for easy access
let orchestratorInstance = null;
export function getOrchestrator(config) {
  if (!orchestratorInstance) {
    orchestratorInstance = new AviOrchestrator(config);
  }
  return orchestratorInstance;
}
```

### 9.2 Repository Pattern

- All database access through repositories
- Parameterized queries (SQL injection safe)
- Singleton repository instances
- Clean separation of concerns

### 9.3 Error Handling

```javascript
try {
  await operation();
} catch (error) {
  console.error('❌ Error:', error);
  await aviStateRepo.updateState({ last_error: error.message });
}
```

### 9.4 Graceful Shutdown

- Stop accepting new work
- Wait for active workers (30s timeout)
- Force terminate if needed
- Preserve pending tickets in database

---

## 10. Security & Performance Considerations

### 10.1 Security Measures

✅ **Already Implemented:**
- Parameterized SQL queries
- Input validation via express-validator
- Rate limiting on API endpoints
- CORS whitelist
- SQL injection prevention middleware
- XSS sanitization

### 10.2 Performance Patterns

✅ **Already Implemented:**
- Connection pooling (4-16 connections)
- Query timeouts (30s default)
- Idle connection cleanup
- Memory monitoring
- Graceful shutdown

### 10.3 Scalability Concerns

**Current Limits:**
- Max workers: 5 (configurable)
- Max context: 50K tokens
- Poll interval: 5s (configurable)

**Recommendations:**
- Increase max workers for production (10-20)
- Implement worker priority queues
- Add distributed orchestrator support (future)

---

## 11. Documentation References

### 11.1 Existing Documentation

| Document | Path | Relevance |
|----------|------|-----------|
| Test Suite Summary | `/api-server/tests/TEST-SUITE-SUMMARY.md` | High - Test execution guide |
| AVI Architecture | `/AVI-ARCHITECTURE-PLAN.md` | High - System design |
| Phase 2 Spec | `/SPARC-PHASE2-SPECIFICATION.md` | High - Requirements |
| Phase 2 Pseudocode | `/SPARC-PHASE2-PSEUDOCODE.md` | High - Implementation guide |

### 11.2 API Documentation

**Control Endpoints:**
- `GET /api/avi/status` - Get orchestrator status
- `POST /api/avi/start` - Start orchestrator
- `POST /api/avi/stop` - Graceful stop
- `POST /api/avi/restart` - Restart with context reset
- `GET /api/avi/metrics` - Performance metrics
- `GET /api/avi/health` - Health check

---

## 12. Action Items for Implementation Team

### 12.1 Immediate (Priority 1)

- [ ] **Implement AgentWorker class** at `/api-server/worker/agent-worker.js`
  - Basic execution stub
  - Error handling
  - Token counting
  - Result formatting

- [ ] **Create worker tests** to verify interface
  - Unit tests for worker lifecycle
  - Mock Claude API calls
  - Verify database interactions

### 12.2 Short-term (Priority 2)

- [ ] **Create feed configuration system**
  - JSON config file
  - Feed types (RSS, Atom, custom)
  - Polling intervals

- [ ] **Implement feed monitor service**
  - RSS/Atom parser
  - Duplicate detection
  - Ticket creation

- [ ] **Add environment variables**
  - Orchestrator settings
  - Feed configuration
  - Auto-start flag

### 12.3 Medium-term (Priority 3)

- [ ] **Server startup integration**
  - Auto-start orchestrator
  - Configuration loading
  - Error handling

- [ ] **Production deployment prep**
  - Docker configuration
  - Health monitoring
  - Log aggregation

---

## 13. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| AgentWorker complexity | High | High | Start with stub, iterate |
| Feed parsing errors | Medium | Medium | Robust error handling, retries |
| Context overflow | Low | Medium | Auto-restart at threshold |
| Database connection loss | Low | High | Connection retry logic |
| Memory leaks | Medium | High | Regular monitoring, GC forcing |

---

## 14. Conclusion

### 14.1 Readiness Assessment

**Phase 2 Orchestrator:**
- 75% complete
- Core logic implemented
- Database layer ready
- Comprehensive tests exist

**Missing Components:**
- AgentWorker (25% of work)
- Feed monitoring (optional)
- Server integration (5% of work)

### 14.2 Time Estimate

**To Production-Ready:**
- AgentWorker: 2-3 days
- Feed Monitor: 2-3 days
- Integration: 1 day
- Testing: 1-2 days
- **Total: 6-9 days**

### 14.3 Recommended Next Steps

1. Review this research document with team
2. Prioritize AgentWorker implementation
3. Design worker interface contracts
4. Implement stub worker for testing
5. Run existing test suite
6. Begin server integration

---

**Research Complete**
Generated: 2025-10-12
By: Research Specialist Agent
