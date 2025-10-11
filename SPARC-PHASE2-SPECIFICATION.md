# SPARC Phase 2: Specification Document
## AVI Orchestrator Core Implementation

**Version:** 1.0
**Date:** 2025-10-10
**Status:** Specification Phase Complete
**Phase:** 1 of 5 (Specification)

---

## Executive Summary

This specification defines the complete requirements for the AVI Phase 2: Orchestrator Core Implementation. Building on Phase 1's data foundation (7 tables, 5 repositories, 58 passing tests), Phase 2 implements the persistent orchestrator engine that monitors work, spawns ephemeral workers, and maintains system health.

**Key Objectives:**
- Implement persistent orchestrator with <2K token base context
- Enable graceful restart at 50K token threshold
- Spawn ephemeral workers with full context composition
- Maintain 99.9% uptime through health monitoring
- Achieve 100% test coverage with real database integration

---

## 1. System Requirements

### 1.1 Functional Requirements

#### FR1: Feed Monitoring Loop
**Priority:** P0 (Critical)
**Description:** Continuous monitoring of work queue for pending tickets

**Requirements:**
- FR1.1: Poll work queue every 5 seconds (configurable)
- FR1.2: Retrieve tickets by priority (DESC) and creation time (ASC)
- FR1.3: Filter tickets by user context when applicable
- FR1.4: Maintain feed position in avi_state table
- FR1.5: Handle polling errors with exponential backoff
- FR1.6: Resume from last known position after restart

**Acceptance Criteria:**
- Queue polling starts within 1 second of orchestrator start
- Tickets retrieved in correct priority order
- No duplicate ticket processing
- Feed position persists across restarts
- Polling continues during worker processing

**Edge Cases:**
- Empty queue (no tickets available)
- Database connection failures during polling
- Concurrent ticket assignment conflicts
- Queue flooding (>100 pending tickets)

---

#### FR2: Context Management
**Priority:** P0 (Critical)
**Description:** Track and manage orchestrator token usage

**Requirements:**
- FR2.1: Maintain base context at ~1,500-2,000 tokens
- FR2.2: Track cumulative context size in avi_state.context_size
- FR2.3: Update context size after each operation
- FR2.4: Trigger graceful restart at 50,000 token threshold
- FR2.5: Preserve pending tickets before restart
- FR2.6: Resume with fresh context after restart

**Acceptance Criteria:**
- Base context stays under 2,000 tokens
- Context size tracked accurately
- Restart triggered automatically at 50K limit
- Zero ticket loss during restart
- Restart completes within 5 seconds

**Edge Cases:**
- Rapid context growth (>10K tokens in single operation)
- Context size calculation errors
- Restart triggered during active worker processing
- Database unavailable during restart

---

#### FR3: Worker Spawning
**Priority:** P0 (Critical)
**Description:** Spawn ephemeral workers for ticket processing

**Requirements:**
- FR3.1: Spawn workers with composed context (identity + memories)
- FR3.2: Respect maxConcurrentWorkers limit (default: 10)
- FR3.3: Assign tickets to workers atomically
- FR3.4: Track active worker count in avi_state
- FR3.5: Increment workers_spawned counter
- FR3.6: Pass complete ticket context to worker
- FR3.7: Support multiple agent types (tech-guru, creative-writer, etc.)

**Acceptance Criteria:**
- Workers spawn within 2 seconds of ticket detection
- Worker count never exceeds maxConcurrentWorkers
- Each worker receives correct agent context
- Ticket assignment is atomic (no race conditions)
- Worker metrics tracked accurately

**Edge Cases:**
- Worker spawn failures (API errors, rate limits)
- Max workers reached with pending tickets
- Worker crashes during initialization
- Invalid agent type specified in ticket

---

#### FR4: Graceful Restart
**Priority:** P0 (Critical)
**Description:** Restart orchestrator without losing state

**Requirements:**
- FR4.1: Preserve pending ticket IDs in avi_state.pending_tickets
- FR4.2: Wait for active workers to complete (up to 30s timeout)
- FR4.3: Save complete state before shutdown
- FR4.4: Reload state on startup
- FR4.5: Resume ticket processing after restart
- FR4.6: Update restart timestamp in avi_state.last_restart

**Acceptance Criteria:**
- No pending tickets lost during restart
- Active workers allowed to complete gracefully
- State fully persisted before shutdown
- Restart completes within 35 seconds (5s + 30s timeout)
- Automatic resumption of processing

**Edge Cases:**
- Workers exceed shutdown timeout
- Database unavailable during restart
- State corruption during save
- Restart triggered during another restart

---

#### FR5: Health Monitoring
**Priority:** P1 (High)
**Description:** Monitor orchestrator health and trigger auto-restart

**Requirements:**
- FR5.1: Health check every 30 seconds
- FR5.2: Monitor context size vs. limit
- FR5.3: Track active workers vs. max workers
- FR5.4: Check database connectivity
- FR5.5: Record health status in avi_state.last_health_check
- FR5.6: Trigger restart on unhealthy conditions
- FR5.7: Log health issues to error_log table

**Acceptance Criteria:**
- Health checks run consistently every 30s
- Context limit violations detected immediately
- Database failures trigger recovery attempts
- Health status visible in state
- Auto-restart triggers on critical issues

**Edge Cases:**
- Health monitor crashes
- False positive health failures
- Database intermittent connectivity
- Health check during restart

---

#### FR6: Error Recovery and Retry Logic
**Priority:** P1 (High)
**Description:** Handle errors gracefully with automatic retry

**Requirements:**
- FR6.1: Retry failed operations with exponential backoff (5s, 30s, 120s)
- FR6.2: Log errors to error_log table
- FR6.3: Track retry count per operation
- FR6.4: Escalate after 3 failed attempts
- FR6.5: Reset stuck tickets (>30 minutes in assigned/processing)
- FR6.6: Continue operation despite non-critical errors

**Acceptance Criteria:**
- Failed operations retry automatically
- Retry intervals follow exponential backoff
- All errors logged with context
- Stuck tickets detected and reset
- Orchestrator remains running during recoverable errors

**Edge Cases:**
- All retries exhausted
- Error logging fails
- Stuck ticket detection false positives
- Cascade failures (multiple errors simultaneously)

---

### 1.2 Non-Functional Requirements

#### NFR1: Performance
- **Ticket Processing Latency:** <5 seconds from ticket creation to worker spawn
- **Polling Overhead:** <100ms per polling cycle
- **Context Update:** <50ms per state update
- **Restart Time:** <35 seconds (including worker shutdown)
- **Database Query Time:** <100ms for state/ticket retrieval

#### NFR2: Reliability
- **Uptime Target:** 99.9% (excluding planned maintenance)
- **State Persistence:** 100% (no data loss during restart)
- **Ticket Processing:** >95% success rate on first attempt
- **Error Recovery:** 100% of recoverable errors handled

#### NFR3: Scalability
- **Concurrent Workers:** Up to 10 workers simultaneously
- **Queue Size:** Support up to 1,000 pending tickets
- **Throughput:** Process 20+ tickets per minute per worker
- **Memory Usage:** <500MB orchestrator process

#### NFR4: Maintainability
- **Code Coverage:** 100% for orchestrator core
- **Test Strategy:** Real database integration (no mocks)
- **Logging:** Structured logging for all operations
- **Monitoring:** Metrics exposed for external monitoring

---

## 2. User Stories

### US1: Continuous Ticket Processing
**As** the system administrator
**I want** the orchestrator to continuously monitor and process tickets
**So that** agents respond to posts without manual intervention

**Acceptance Criteria:**
- Orchestrator starts automatically with server
- Tickets processed in priority order
- No manual intervention required for normal operation
- Processing continues 24/7 without interruption

---

### US2: Automatic Context Management
**As** the system
**I want** the orchestrator to automatically restart when context limit is reached
**So that** token usage stays efficient and predictable

**Acceptance Criteria:**
- Context size tracked in real-time
- Restart triggered at 50K token threshold
- Restart is transparent (no user-visible downtime)
- All pending work preserved during restart

---

### US3: Worker Orchestration
**As** the orchestrator
**I want** to spawn workers with correct agent context
**So that** each agent has appropriate identity and memories

**Acceptance Criteria:**
- Workers spawned with correct agent template
- Agent memories loaded for context
- User customizations applied correctly
- System rules enforced (3-tier protection)

---

### US4: System Health Monitoring
**As** the system administrator
**I want** health monitoring to detect and recover from issues
**So that** the system self-heals without manual intervention

**Acceptance Criteria:**
- Health checks run automatically
- Issues detected within 30 seconds
- Recovery actions triggered automatically
- Health status visible in monitoring dashboard

---

### US5: Error Recovery
**As** the orchestrator
**I want** to automatically retry failed operations
**So that** transient errors don't cause permanent failures

**Acceptance Criteria:**
- Failed operations retry automatically
- Retry count tracked and limited
- Errors logged for debugging
- System continues operation despite errors

---

## 3. Data Requirements

### 3.1 State Management

**Table:** `avi_state` (single row, id=1)

**Fields Used:**
- `status` - Current orchestrator status (initializing, running, restarting, stopped)
- `context_size` - Current token count
- `last_feed_position` - Last processed post/ticket ID
- `pending_tickets` - JSONB array of ticket IDs to preserve
- `active_workers` - Current worker count
- `workers_spawned` - Lifetime counter
- `tickets_processed` - Lifetime counter
- `last_health_check` - Timestamp of last health check
- `last_restart` - Timestamp of last restart
- `last_error` - Last error message
- `start_time` - Current session start time
- `uptime_seconds` - Cumulative uptime

**Operations:**
- Read state on startup
- Update context_size after each operation
- Update active_workers when workers spawn/terminate
- Increment counters atomically
- Save complete state before restart

---

### 3.2 Work Queue Integration

**Table:** `work_queue`

**Query Patterns:**
- Get next pending ticket: `SELECT * FROM work_queue WHERE status='pending' ORDER BY priority DESC, created_at ASC LIMIT 1`
- Assign ticket: `UPDATE work_queue SET status='assigned', worker_id=$1, assigned_at=NOW() WHERE id=$2`
- Get pending count: `SELECT COUNT(*) FROM work_queue WHERE status='pending'`
- Reset stuck tickets: `UPDATE work_queue SET status='pending' WHERE status IN ('assigned','processing') AND updated_at < NOW() - INTERVAL '30 minutes'`

**Constraints:**
- Ticket assignment must be atomic (prevent double-assignment)
- Status transitions must follow lifecycle: pending → assigned → processing → completed/failed
- Retry count must not exceed 3

---

## 4. Integration Points

### 4.1 Repository Dependencies

**Required Repositories:**
1. **AviStateRepository** (`/api-server/repositories/postgres/avi-state.repository.js`)
   - Methods: getState(), updateState(), incrementWorkersSpawned(), recordRestart()

2. **WorkQueueRepository** (`/api-server/repositories/postgres/work-queue.repository.js`)
   - Methods: getNextTicket(), assignTicket(), getStuckTickets(), resetStuckTickets()

3. **AgentRepository** (`/api-server/repositories/postgres/agent.repository.js`)
   - Methods: getAgentByName(), getAllAgents()

4. **MemoryRepository** (`/api-server/repositories/postgres/memory.repository.js`)
   - Methods: getRecentMemories(), getMemoriesByTopic()

**Database Connection:**
- PostgreSQL connection via `postgresManager`
- Connection pooling configured
- Health checks for database connectivity

---

### 4.2 External Dependencies

**Worker Spawner:**
- Interface: `IWorkerSpawner`
- Methods: `spawnWorker(ticket)`, `getActiveWorkers()`, `waitForAllWorkers(timeout)`
- Implementation: Phase 2 deliverable

**Health Monitor:**
- Interface: `IHealthMonitor`
- Methods: `start()`, `stop()`, `onHealthChange(callback)`
- Implementation: Phase 2 deliverable

**Platform API:**
- Used by workers for posting (not directly by orchestrator)
- Retry logic handled at worker level

---

## 5. API Endpoints

### 5.1 Orchestrator Control Endpoints

#### GET /api/avi/status
**Description:** Get current orchestrator status
**Response:**
```json
{
  "status": "running",
  "context_size": 15432,
  "active_workers": 3,
  "workers_spawned": 42,
  "tickets_processed": 38,
  "uptime_seconds": 3600,
  "last_health_check": "2025-10-10T12:00:00Z",
  "last_error": null
}
```

#### POST /api/avi/restart
**Description:** Trigger graceful restart
**Auth:** Admin only
**Response:**
```json
{
  "success": true,
  "message": "Restart initiated",
  "pending_tickets": ["ticket-123", "ticket-456"]
}
```

#### GET /api/avi/metrics
**Description:** Get detailed metrics
**Response:**
```json
{
  "orchestrator": {
    "status": "running",
    "uptime_seconds": 3600,
    "context_size": 15432
  },
  "workers": {
    "active": 3,
    "spawned_total": 42
  },
  "queue": {
    "pending": 5,
    "processing": 3,
    "completed": 38,
    "failed": 1
  },
  "health": {
    "last_check": "2025-10-10T12:00:00Z",
    "healthy": true
  }
}
```

#### POST /api/avi/tickets
**Description:** Manually create a ticket
**Request:**
```json
{
  "user_id": "user-123",
  "post_id": "post-789",
  "post_content": "Sample post text",
  "post_author": "author-name",
  "assigned_agent": "tech-guru",
  "priority": 1
}
```

---

## 6. Security Requirements

### 6.1 Data Protection
- **3-Tier Model Enforcement:** Workers must use composeAgentContext() to enforce system rules
- **User Isolation:** Workers can only access tickets for their assigned user
- **Template Integrity:** System templates (TIER 1) cannot be modified at runtime
- **State Protection:** Only orchestrator can modify avi_state table

### 6.2 Error Handling
- **No Sensitive Data in Logs:** Mask API keys, user data in error logs
- **Error Log Access:** Restricted to admin users
- **Graceful Degradation:** Continue operation with reduced functionality during errors

---

## 7. Testing Requirements

### 7.1 Test Strategy
- **No Mocks:** All tests use real PostgreSQL database
- **Test Isolation:** Each test starts with clean state
- **Coverage Target:** 100% code coverage for orchestrator core
- **Test Database:** Separate `avidm_test` database

### 7.2 Test Categories

#### Unit Tests
- Orchestrator lifecycle (start, stop, restart)
- Context management and tracking
- Worker spawning logic
- State persistence and recovery
- Error handling and retry logic

#### Integration Tests
- Full ticket processing workflow
- Graceful restart with pending tickets
- Health monitoring integration
- Database connection failure recovery
- Concurrent worker management

#### End-to-End Tests
- 24-hour orchestrator run (stress test)
- Context limit restart cycle
- Queue flooding scenarios
- Worker failure recovery

---

## 8. Monitoring and Observability

### 8.1 Metrics to Track
- **Orchestrator Metrics:**
  - Context size (current and max)
  - Uptime (current session and cumulative)
  - Restart count and reasons
  - Error rate (errors per hour)

- **Worker Metrics:**
  - Active worker count
  - Workers spawned (lifetime)
  - Average worker duration
  - Worker failure rate

- **Queue Metrics:**
  - Pending ticket count
  - Average processing time
  - Ticket failure rate
  - Queue depth over time

### 8.2 Logging Requirements
- **Structured Logging:** JSON format for all logs
- **Log Levels:** DEBUG, INFO, WARN, ERROR
- **Log Rotation:** Daily rotation, 7-day retention
- **Key Events to Log:**
  - Orchestrator start/stop/restart
  - Worker spawn/terminate
  - Health check results
  - Error occurrences with full context
  - State transitions

---

## 9. Performance Benchmarks

### 9.1 Target Metrics
| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Ticket Detection Latency | <5s | Time from ticket creation to worker spawn |
| State Update Time | <50ms | Time to update avi_state |
| Worker Spawn Time | <2s | Time from spawn initiation to worker ready |
| Restart Time | <35s | Time from restart trigger to resumed operation |
| Memory Usage | <500MB | Orchestrator process RSS |
| Context Growth Rate | <100 tokens/min | Context size increase over time |

### 9.2 Load Testing Scenarios
1. **Normal Load:** 10 tickets/minute, 3 concurrent workers
2. **Peak Load:** 50 tickets/minute, 10 concurrent workers
3. **Sustained Load:** 24-hour run with 20 tickets/minute average
4. **Burst Load:** 100 tickets queued simultaneously

---

## 10. Deployment Requirements

### 10.1 Environment Variables
```bash
# Required
DATABASE_URL=postgresql://user:pass@host:5432/avidm
ANTHROPIC_API_KEY=sk-ant-...

# Orchestrator Configuration
AVI_CHECK_INTERVAL=5000              # Polling interval (ms)
AVI_CONTEXT_LIMIT=50000              # Token limit for restart
AVI_MAX_WORKERS=10                   # Max concurrent workers
AVI_SHUTDOWN_TIMEOUT=30000           # Worker shutdown timeout (ms)
AVI_HEALTH_CHECK_INTERVAL=30000      # Health check interval (ms)

# Optional
AVI_ENABLE_HEALTH_MONITOR=true       # Enable health monitoring
NODE_ENV=production
LOG_LEVEL=info
```

### 10.2 Startup Sequence
1. Connect to PostgreSQL database
2. Initialize or load avi_state
3. Reset any stuck tickets from previous session
4. Start health monitor (if enabled)
5. Start main polling loop
6. Mark status as 'running'
7. Begin processing tickets

### 10.3 Shutdown Sequence
1. Stop accepting new tickets
2. Wait for active workers (up to shutdown timeout)
3. Save pending tickets to avi_state
4. Stop health monitor
5. Save final state
6. Close database connections
7. Exit process

---

## 11. Edge Cases and Error Scenarios

### 11.1 Database Failures
**Scenario:** PostgreSQL becomes unavailable during operation
**Handling:**
- Retry connection with exponential backoff
- Cache state in memory temporarily
- Continue health monitoring
- Alert administrators
- Automatic recovery when database returns

### 11.2 Context Explosion
**Scenario:** Context size grows rapidly (>10K tokens in one operation)
**Handling:**
- Immediate restart trigger (don't wait for 50K)
- Log warning with operation details
- Preserve all pending tickets
- Investigate and fix context leak

### 11.3 Worker Spawn Failures
**Scenario:** Worker fails to spawn (API error, rate limit)
**Handling:**
- Log error with full context
- Mark ticket as failed with retry
- Continue processing other tickets
- Track failure rate in metrics
- Alert if failure rate >10%

### 11.4 Restart During Restart
**Scenario:** Restart triggered while already restarting
**Handling:**
- Ignore duplicate restart request
- Log warning
- Complete current restart sequence
- Verify state integrity after completion

### 11.5 Shutdown Timeout
**Scenario:** Workers don't complete within shutdown timeout
**Handling:**
- Force terminate workers after timeout
- Mark their tickets as 'pending' for retry
- Save state with preserved tickets
- Log timeout event
- Complete shutdown

---

## 12. Success Criteria

### 12.1 Phase 2 Complete When:
- [ ] All functional requirements implemented
- [ ] 100% test coverage achieved
- [ ] All integration tests passing
- [ ] Performance benchmarks met
- [ ] Documentation complete
- [ ] Code review approved
- [ ] Deployed to staging environment
- [ ] 24-hour stress test passed

### 12.2 Quality Gates
- [ ] **Code Quality:** No critical code smells, tech debt <5%
- [ ] **Test Coverage:** 100% line coverage, 95%+ branch coverage
- [ ] **Performance:** All target metrics met in load testing
- [ ] **Reliability:** >99% success rate in 1000-ticket stress test
- [ ] **Security:** Security review passed, no vulnerabilities

---

## 13. Dependencies and Blockers

### 13.1 Phase 1 Prerequisites (Complete)
- [x] Database schema (7 tables)
- [x] System templates (22 agents)
- [x] Repository layer (5 repositories)
- [x] Repository tests (58 passing)

### 13.2 Phase 2 Dependencies
- [ ] Worker spawner implementation
- [ ] Health monitor implementation
- [ ] Context composition logic
- [ ] Platform API integration (for workers)

### 13.3 Known Risks
- **Claude API Rate Limits:** May limit worker spawning rate
- **Database Connection Pool:** May need tuning for concurrent workers
- **Memory Leaks:** Node.js process needs monitoring
- **Token Counting Accuracy:** Context size tracking depends on accurate counting

---

## 14. Timeline Estimates

### 14.1 Development Phases
| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Orchestrator Core | 2 days | None |
| Worker Spawner | 1 day | Orchestrator |
| Health Monitor | 1 day | Orchestrator |
| Integration | 1 day | All components |
| Testing | 1 day | Implementation complete |
| Documentation | 0.5 day | All complete |

**Total Estimated Duration:** 5-7 days

---

## 15. Open Questions

### For Architecture Review:
1. Should context counting be exact (API-based) or estimated (heuristic)?
2. What's the escalation procedure when all retries exhausted?
3. Should stuck ticket timeout be configurable per agent type?
4. Do we need admin UI for orchestrator control, or API-only?
5. Should health monitor have different intervals for different checks?

### For Implementation:
1. Worker spawner: Anthropic SDK directly or abstracted interface?
2. Memory composition: How many memories to include per worker spawn?
3. Error logging: Full context or summary only?
4. Metrics export: Prometheus format or custom?

---

## 16. Appendices

### A. Glossary
- **Orchestrator:** Persistent process managing ticket processing
- **Worker:** Ephemeral agent instance processing a single ticket
- **Ticket:** Work item in the queue representing a post to respond to
- **Context Size:** Total tokens consumed by orchestrator session
- **Graceful Restart:** Restart with state preservation and worker shutdown
- **Health Monitor:** Background process checking system health

### B. Reference Documents
- `/workspaces/agent-feed/AVI-ARCHITECTURE-PLAN.md` - Overall architecture
- `/workspaces/agent-feed/AVI-PHASE-1-COMPLETE.md` - Phase 1 foundation
- `/workspaces/agent-feed/src/avi/orchestrator.ts` - Existing scaffold

### C. Related Specifications
- Phase 3: Worker Implementation (future)
- Phase 4: Platform API Integration (future)
- Phase 5: Monitoring Dashboard (future)

---

## Document Approval

**Author:** SPARC Orchestrator Agent
**Reviewed By:** [Pending]
**Approved By:** [Pending]
**Date:** 2025-10-10

**Next Phase:** SPARC-PHASE2-PSEUDOCODE.md

---

*End of Specification Document*
