# AVI Persistent Session - Risk & Dependency Matrix

**Project:** AVI Persistent Session Implementation
**Date:** 2025-10-24
**Document Type:** Risk Analysis & Dependency Mapping

---

## 1. CRITICAL PATH ANALYSIS

### 1.1 Dependency Chain

```
CRITICAL PATH (Must complete in order):

[Phase 1: Schema Migration] ──┐
  Duration: 30 min              │
  Risk: Medium                  │
  Blocks: EVERYTHING            │
                                ├──> [Phase 2: Session Manager]
                                │      Duration: 4 hours
                                │      Risk: High
                                │      Blocks: Phase 3 & 4
                                │
                                └──> [Phase 3: Post Integration]
                                       Duration: 2 hours
                                       Risk: Medium
                                       Blocks: Production deployment

PARALLEL PATHS (Can run simultaneously):

[Phase 2 Complete] ──┬──> [Phase 3: Post Integration]
                      │      Duration: 2 hours
                      │
                      ├──> [Phase 4: API Endpoints]
                      │      Duration: 2 hours
                      │
                      └──> [Phase 5: Optimization]
                             Duration: 4 hours
```

### 1.2 Blocking Analysis

**Phase 1 Blocks:**
- Phase 2 (technically independent, but risky to proceed)
- Phase 3 (depends on working comments)
- Phase 4 (needs comment system working)
- Phase 5 (needs session manager)
- Production deployment

**Phase 2 Blocks:**
- Phase 3 (needs session manager)
- Phase 4 (needs session manager)
- Phase 5 (needs session manager)

**No Blockers:**
- Phase 4 and 5 can run in parallel after Phase 2

### 1.3 Critical Dependencies

**MUST EXIST Before Implementation:**
- [ ] `/workspaces/agent-feed/database.db` (SQLite database)
- [ ] `/workspaces/agent-feed/prod/.claude/CLAUDE.md` (AVI personality)
- [ ] `/prod/src/services/ClaudeCodeSDKManager.ts` (SDK access)
- [ ] `/api-server/config/database-selector.js` (DB abstraction)
- [ ] Working comment creation endpoint

**MUST VERIFY Before Migration:**
- [ ] Database backup exists
- [ ] Current schema documented
- [ ] Comment count recorded (for verification)
- [ ] No active write operations during migration

---

## 2. RISK MATRIX

### 2.1 Risk Scoring

**Probability Scale:**
- Very Low (1): <5% chance
- Low (2): 5-20% chance
- Medium (3): 20-50% chance
- High (4): 50-80% chance
- Very High (5): >80% chance

**Impact Scale:**
- Negligible (1): <1 hour delay, no data loss
- Low (2): <4 hours delay, no data loss
- Medium (3): <1 day delay, recoverable data loss
- High (4): >1 day delay, significant data loss
- Critical (5): Project failure, unrecoverable data loss

**Risk Score = Probability × Impact**

### 2.2 High-Risk Items (Score ≥ 9)

#### RISK-001: Schema Migration Data Corruption
**Category:** Data Integrity
**Phase:** Phase 1
**Probability:** Low (2)
**Impact:** Critical (5)
**Risk Score:** 10

**Description:**
Migration script fails mid-execution, leaving comments table in inconsistent state with partial author_agent population.

**Failure Scenarios:**
1. Power failure during UPDATE operation
2. Out of disk space during ALTER TABLE
3. Lock timeout from concurrent writes
4. SQL syntax error on specific rows

**Impact Analysis:**
- All agent comments fail to post
- link-logger agent breaks ("No summary available")
- User-facing error messages
- Potential data loss if rollback fails
- System downtime during recovery

**Mitigation Strategy:**
1. **Pre-Migration:**
   - Full database backup (verify backup integrity)
   - Test on exact copy of production DB
   - Verify disk space (need 2x current DB size)
   - Stop all write operations (brief maintenance mode)
   - Document current row counts

2. **During Migration:**
   - Use transaction wrapper (BEGIN TRANSACTION ... COMMIT)
   - Add timeout monitoring
   - Log each step completion
   - Verify row counts match before/after

3. **Post-Migration:**
   - Immediate NULL check query
   - Sample data verification (10+ rows)
   - Re-enable write operations
   - Monitor error logs for 1 hour

4. **Rollback Plan:**
   - Automated rollback script ready
   - Restore from backup procedure tested
   - Communication plan for downtime

**Residual Risk After Mitigation:** Low (2) × Medium (3) = 6

---

#### RISK-002: Claude Code SDK Unavailability
**Category:** External Dependency
**Phase:** Phase 2, 3, 4
**Probability:** Medium (3)
**Impact:** High (4)
**Risk Score:** 12

**Description:**
Claude Code SDK becomes unavailable, changes API contract, or experiences intermittent failures.

**Failure Scenarios:**
1. SDK service outage (API down)
2. Rate limiting on SDK side
3. Breaking API changes in SDK update
4. Network connectivity issues
5. Authentication failures

**Impact Analysis:**
- AVI cannot initialize sessions
- All AVI responses fail
- User questions go unanswered
- No graceful degradation path
- User frustration

**Mitigation Strategy:**
1. **Error Handling:**
   - Retry logic with exponential backoff (3 attempts)
   - Timeout limits (30 seconds max)
   - Graceful error messages to users
   - Fallback message: "AVI is temporarily unavailable"

2. **Monitoring:**
   - SDK health check endpoint
   - Alert on repeated failures (>3 in 10 min)
   - Log all SDK errors with context
   - Track SDK response times

3. **Graceful Degradation:**
   - Queue questions for later processing
   - Notify user of delay
   - Continue normal post creation

4. **Dependency Management:**
   - Pin SDK version
   - Test before upgrading SDK
   - Maintain SDK changelog awareness
   - Coordinate with SDK team on changes

**Residual Risk After Mitigation:** Low (2) × Medium (3) = 6

---

#### RISK-003: Token Cost Runaway
**Category:** Cost Control
**Phase:** Phase 2, 3, 4, 5
**Probability:** Low (2)
**Impact:** High (4)
**Risk Score:** 8 (borderline high)

**Description:**
Bug or misconfiguration causes excessive token usage, leading to unexpectedly high costs.

**Failure Scenarios:**
1. maxTokens limit not enforced
2. Session doesn't cleanup (runs for weeks)
3. Infinite retry loop on errors
4. Very long system prompt loaded repeatedly
5. Malicious user sends huge inputs

**Impact Analysis:**
- Daily costs exceed $100+ instead of $10
- Budget exhausted quickly
- Need emergency shutdown
- Finance escalation

**Mitigation Strategy:**
1. **Hard Limits:**
   - Enforce maxTokens: 2000 (strict)
   - Input length limit: 5000 chars
   - Rate limiting: 60 requests/hour per user
   - Daily cost alert: >$15

2. **Monitoring:**
   - Real-time token usage tracking
   - Cost estimation per interaction
   - Alert on >25K tokens single interaction
   - Daily cost summary

3. **Automatic Safeguards:**
   - Session auto-cleanup (60 min guaranteed)
   - Circuit breaker on repeated errors
   - Admin kill switch endpoint

4. **Testing:**
   - Load test with 1000 interactions
   - Verify actual costs match projections
   - Test cost alerts

**Residual Risk After Mitigation:** Very Low (1) × Medium (3) = 3

---

### 2.3 Medium-Risk Items (Score 6-8)

#### RISK-004: Session Memory Leak
**Category:** Resource Management
**Phase:** Phase 2
**Probability:** Medium (3)
**Impact:** Medium (3)
**Risk Score:** 9

**Description:**
Session cleanup timer not cleared properly, leading to memory leak over time.

**Mitigation:**
- Rigorous timer management (clearInterval on cleanup)
- Memory monitoring with alerts
- 24-hour stability test
- Forced cleanup endpoint for emergencies
- Health check monitors memory usage

**Residual Risk:** Low (2) × Low (2) = 4

---

#### RISK-005: Comment Attribution Confusion
**Category:** User Experience
**Phase:** Phase 1, 3
**Probability:** Medium (3)
**Impact:** Low (2)
**Risk Score:** 6

**Description:**
During dual-column transition period, inconsistent attribution between author and author_agent.

**Mitigation:**
- Clear documentation of transition period
- Monitor for NULL values in either column
- Gradual migration over 2+ weeks
- User-facing displays prioritize author_agent
- Communication to users about change

**Residual Risk:** Low (2) × Negligible (1) = 2

---

#### RISK-006: Integration Breaking Changes
**Category:** System Stability
**Phase:** Phase 3
**Probability:** Low (2)
**Impact:** Medium (3)
**Risk Score:** 6

**Description:**
Post creation integration breaks existing link-logger or work queue functionality.

**Mitigation:**
- Comprehensive integration testing
- Test both AVI and link-logger paths
- Verify work queue tickets still created
- Backward compatibility checks
- Staged rollout with monitoring

**Residual Risk:** Very Low (1) × Low (2) = 2

---

#### RISK-007: CLAUDE.md File Issues
**Category:** Configuration
**Phase:** Phase 2
**Probability:** Low (2)
**Impact:** Medium (3)
**Risk Score:** 6

**Description:**
CLAUDE.md file missing, corrupted, or sections reorganized.

**Mitigation:**
- File existence check on startup
- Try/catch on file read
- Default fallback prompt hardcoded
- Version control on CLAUDE.md
- Validation of extracted sections

**Residual Risk:** Very Low (1) × Low (2) = 2

---

### 2.4 Low-Risk Items (Score ≤ 5)

#### RISK-008: WebSocket Service Unavailable
**Score:** 2 (Low prob × Low impact)
- Optional feature, graceful degradation built-in
- No functional impact on core features

#### RISK-009: Concurrent Initialization Race
**Score:** 3 (Very low prob × Medium impact)
- Rare edge case, lock mechanism planned
- Quick recovery if occurs

#### RISK-010: Migration Performance on Large DB
**Score:** 4 (Low prob × Medium impact)
- Test on production-size data
- Batching strategy available

---

## 3. DEPENDENCY MAPPING

### 3.1 External Dependencies

#### DEP-001: Claude Code SDK Manager
**Type:** Runtime - Critical
**Path:** `/prod/src/services/ClaudeCodeSDKManager.ts`
**Stability:** Medium
**Update Frequency:** Monthly
**Breaking Change Risk:** Medium

**Contract Requirements:**
- Method: `executeHeadlessTask(prompt, options)`
- Returns: `{ success, messages, usage }`
- Session support: `options.sessionId`
- Error handling: Throws on failures

**Failure Impact:**
- Complete AVI functionality unavailable
- Cannot initialize sessions
- Cannot process user questions

**Mitigation:**
- Version pinning
- SDK health monitoring
- Graceful error handling
- Fallback messaging

**Testing Requirements:**
- Mock SDK for unit tests
- Integration test with real SDK
- Error scenario testing

---

#### DEP-002: Better-SQLite3
**Type:** Runtime - Critical
**Package:** `better-sqlite3` v9.x
**Stability:** High
**Update Frequency:** Quarterly
**Breaking Change Risk:** Low

**Contract Requirements:**
- Synchronous API
- Prepare/run pattern
- Transaction support
- Schema modification (ALTER TABLE)

**Failure Impact:**
- Cannot read/write database
- Migration cannot execute
- System completely non-functional

**Mitigation:**
- Stable, mature package
- Version pinning
- Minimal API surface used
- Well-tested

**Testing Requirements:**
- Test migrations on real DB
- Transaction rollback testing
- Concurrent access testing

---

#### DEP-003: Socket.IO
**Type:** Runtime - Optional
**Package:** `socket.io` v4.x
**Stability:** High
**Update Frequency:** Quarterly
**Breaking Change Risk:** Low

**Contract Requirements:**
- Server initialization
- Event emission
- Room support (optional)

**Failure Impact:**
- No real-time updates to frontend
- Core functionality unaffected
- Graceful degradation

**Mitigation:**
- Check initialization before use
- Try/catch on emit
- Feature works without it

**Testing Requirements:**
- Test with and without WebSocket
- Verify graceful degradation

---

### 3.2 Internal Dependencies

#### DEP-004: Database Selector
**Type:** Runtime - Critical
**Path:** `/api-server/config/database-selector.js`
**Owned By:** Internal team
**Stability:** High
**Breaking Change Risk:** Low (we control it)

**Contract Requirements:**
- Method: `createComment(userId, commentData)`
- Accepts: `{ author, author_agent, content, post_id, ... }`
- Returns: Created comment object

**Changes Required:**
- Accept both author and author_agent fields
- Populate both columns in INSERT
- Backward compatible with existing code

**Failure Impact:**
- Comments cannot be created
- Agent responses fail to post
- link-logger breaks

**Mitigation:**
- We control this code
- Backward compatibility enforced
- Comprehensive testing

**Testing Requirements:**
- Test with author only
- Test with author_agent only
- Test with both
- Test with neither (should use userId)

---

#### DEP-005: Work Queue Repository
**Type:** Runtime - Parallel System
**Path:** `/api-server/repositories/work-queue-repository.js`
**Owned By:** Internal team
**Stability:** High
**Breaking Change Risk:** None (separate concern)

**Contract Requirements:**
- Method: `createTicket(data)`
- Independent of AVI session manager

**Changes Required:**
- NONE - parallel system

**Interaction:**
- Both AVI session and work queue can coexist
- AVI questions don't create tickets
- URL posts create tickets (existing behavior)

**Failure Impact:**
- No impact on AVI session manager
- link-logger uses work queue independently

**Mitigation:**
- Clear separation of concerns
- No code coupling

---

#### DEP-006: WebSocket Service
**Type:** Runtime - Optional Enhancement
**Path:** `/api-server/services/websocket-service.js`
**Owned By:** Internal team
**Stability:** Medium (newer code)
**Breaking Change Risk:** Low

**Contract Requirements:**
- Method: `isInitialized()`
- Method: `emitTicketStatusUpdate(payload)`
- Optional integration

**Changes Required:**
- NONE - optional enhancement

**Failure Impact:**
- No real-time updates
- Core functionality unaffected

**Mitigation:**
- Check initialization before use
- Graceful skip if not available

---

#### DEP-007: AVI Orchestrator
**Type:** Runtime - Parallel System
**Path:** `/api-server/avi/orchestrator.js`
**Owned By:** Internal team
**Stability:** Medium
**Breaking Change Risk:** None (separate concern)

**Contract Requirements:**
- Independent lifecycle
- Manages proactive agents (link-logger)
- No interaction with session manager

**Changes Required:**
- NONE - separate responsibility

**Interaction:**
- Session Manager: Q&A with users
- Orchestrator: Proactive agent coordination
- Both can run on same server
- No resource conflicts

**Failure Impact:**
- No impact on session manager
- Orchestrator handles different use cases

---

### 3.3 File System Dependencies

#### DEP-008: CLAUDE.md Configuration File
**Type:** Configuration - Critical
**Path:** `/workspaces/agent-feed/prod/.claude/CLAUDE.md`
**Size:** ~15KB
**Owned By:** Production system
**Stability:** Medium
**Update Frequency:** Weekly
**Breaking Change Risk:** Medium

**Contract Requirements:**
- Readable text file
- Contains section: "## 🤖 Meet Λvi"
- Contains section: "## 🚨 MANDATORY: Λvi Behavioral Patterns"
- Contains section: "## 🎯 Specialized Agent Routing"

**Failure Scenarios:**
1. File not found (moved or deleted)
2. Permissions issue (not readable)
3. Sections renamed or removed
4. File corrupted (invalid UTF-8)

**Impact Analysis:**
- Cannot load AVI personality
- Session initialization fails
- Undefined AVI behavior

**Mitigation Strategy:**
1. **File Validation:**
   - Check file existence on startup
   - Verify readability
   - Log file stats (size, permissions)

2. **Error Handling:**
   - Try/catch on file read
   - Fallback to default prompt
   - Log error with context

3. **Default Fallback Prompt:**
```javascript
const DEFAULT_PROMPT = `
You are Λvi (AVI), Chief of Staff for this system.
You answer questions about the system and coordinate tasks.
Keep responses concise (max 2000 tokens).
This is a persistent session - context is maintained.
`;
```

4. **Monitoring:**
   - Alert if fallback prompt used
   - Track CLAUDE.md read success rate

**Testing Requirements:**
- Test with file present
- Test with file missing (fallback)
- Test with corrupted file (fallback)
- Test with sections missing (partial load)

**Residual Risk:** Low (2) × Low (2) = 4

---

#### DEP-009: Migration SQL Files
**Type:** One-time - Critical
**Path:** `/api-server/db/migrations/007-rename-author-column.sql`
**Size:** <1KB
**Owned By:** Internal team
**Stability:** N/A (one-time use)

**Contract Requirements:**
- Valid SQL syntax
- Idempotent execution
- Verification query included

**Failure Scenarios:**
1. SQL syntax error
2. File not found
3. Permissions issue

**Impact Analysis:**
- Migration cannot run
- Comments system broken
- Blocks entire implementation

**Mitigation Strategy:**
1. **Pre-Execution:**
   - Validate SQL syntax
   - Test on development DB
   - Review migration script

2. **Execution:**
   - Transaction wrapper
   - Rollback on error
   - Verification after execution

3. **Post-Execution:**
   - Can delete file (one-time use)
   - Keep for documentation

**Residual Risk:** Very Low (1) × Medium (3) = 3

---

### 3.4 Network Dependencies

#### DEP-010: Internal HTTP (AVI to Comments API)
**Type:** Runtime - Critical
**Protocol:** HTTP
**Endpoint:** `http://localhost:3001/api/agent-posts/:postId/comments`
**Stability:** High
**Latency:** <10ms

**Contract Requirements:**
- POST endpoint accepts JSON
- Returns 201 on success
- Accepts: `{ content, author, author_agent, skipTicket }`

**Failure Scenarios:**
1. Server not running on port 3001
2. Network timeout
3. Server error (500)
4. Invalid request (400)

**Impact Analysis:**
- AVI response generated but cannot post
- User sees question but no answer
- Token cost incurred without output

**Mitigation Strategy:**
1. **Pre-Request:**
   - Verify server running
   - Health check endpoint

2. **Request:**
   - Timeout: 5 seconds
   - Retry: 2 attempts
   - Error logging

3. **Error Handling:**
   - Log failed post attempts
   - Alert on repeated failures
   - Consider queue for retry

**Residual Risk:** Very Low (1) × Low (2) = 2

---

## 4. FAILURE MODE ANALYSIS

### 4.1 Complete Failure Scenarios

#### SCENARIO-001: Database Corruption During Migration
**Trigger:** Power failure during migration
**Probability:** Very Low (1%)
**Impact:** Critical

**Failure Chain:**
1. Migration starts ALTER TABLE
2. Power failure occurs mid-operation
3. Database file corrupted
4. Server restart attempts to read DB
5. SQLite error: "database disk image is malformed"
6. All database operations fail
7. System completely down

**Detection:**
- SQLite error on startup
- Cannot open database
- Health check fails

**Recovery Steps:**
1. Stop server
2. Restore database from backup
3. Verify backup integrity
4. Restart server
5. Verify system functional
6. Re-run migration if needed

**Prevention:**
- Full backup before migration
- Test backup restore procedure
- UPS for database server (if applicable)
- Maintenance mode during migration

**Recovery Time:** 15-30 minutes
**Data Loss:** None (if backup recent)

---

#### SCENARIO-002: Claude SDK Complete Outage
**Trigger:** SDK service down
**Probability:** Low (5%)
**Impact:** High

**Failure Chain:**
1. User posts question to AVI
2. Session manager tries to initialize
3. SDK connection fails
4. Retry 3 times with backoff
5. All retries fail
6. Error logged, no comment posted
7. User sees question with no answer

**Detection:**
- SDK error logs
- No AVI comments appearing
- Metrics show 0% success rate

**Degraded Operation:**
- Post creation still works
- link-logger still works
- Only AVI Q&A affected

**Recovery Steps:**
1. Monitor SDK status
2. Notify users of outage
3. Queue questions for later (optional)
4. Automatic recovery when SDK returns

**Prevention:**
- SDK health monitoring
- Alert on SDK errors
- Communication plan for outages

**Recovery Time:** Depends on SDK restoration
**Data Loss:** Questions not answered (acceptable)

---

### 4.2 Partial Failure Scenarios

#### SCENARIO-003: Session Cleanup Failure
**Trigger:** Timer not cleared properly
**Probability:** Medium (10%)
**Impact:** Medium

**Failure Chain:**
1. Session initialized
2. User interaction completes
3. Cleanup timer not cleared
4. Multiple timers accumulate
5. Memory leak over time
6. Server slows down
7. Eventually crashes (days/weeks)

**Detection:**
- Memory usage trending up
- Multiple active timers
- Process monitoring alerts

**Degraded Operation:**
- System still functional
- Gradual performance degradation
- Not immediately critical

**Recovery Steps:**
1. Restart server (clears memory)
2. Fix cleanup logic
3. Deploy fixed code
4. Monitor memory usage

**Prevention:**
- Rigorous timer management code review
- 24-hour stability test
- Memory monitoring
- Health checks

**Recovery Time:** Immediate (restart)
**Data Loss:** None (session state in-memory only)

---

## 5. MITIGATION IMPLEMENTATION CHECKLIST

### 5.1 Pre-Implementation Checklist

**Before Starting Phase 1:**
- [ ] Full database backup created
- [ ] Backup restore procedure tested
- [ ] Development database available for testing
- [ ] Current comment count documented
- [ ] Rollback SQL script prepared
- [ ] Maintenance window scheduled (if needed)

**Before Starting Phase 2:**
- [ ] CLAUDE.md file exists and readable
- [ ] Default fallback prompt prepared
- [ ] SDK connection tested
- [ ] Error handling code reviewed
- [ ] Monitoring plan defined

**Before Starting Phase 3:**
- [ ] Phase 1 and 2 complete and tested
- [ ] Integration test plan prepared
- [ ] Both AVI and link-logger paths tested
- [ ] Rollback plan documented

---

### 5.2 Post-Implementation Monitoring

**First 24 Hours:**
- [ ] Monitor error logs every 2 hours
- [ ] Check token usage every 4 hours
- [ ] Verify AVI responses posting correctly
- [ ] Check session cleanup working
- [ ] Monitor database performance
- [ ] Track cost metrics

**First Week:**
- [ ] Daily cost review
- [ ] Daily error log review
- [ ] Token efficiency analysis
- [ ] User feedback collection
- [ ] Performance metrics review

**Ongoing:**
- [ ] Weekly cost analysis
- [ ] Monthly efficiency report
- [ ] Quarterly dependency updates
- [ ] Continuous error monitoring

---

## 6. DECISION MATRIX

### 6.1 Go/No-Go Criteria for Each Phase

#### Phase 1: Schema Migration
**GO Criteria:**
- ✅ Database backup complete and verified
- ✅ Development DB test successful
- ✅ Zero active writes (or maintenance mode)
- ✅ Rollback script ready

**NO-GO Criteria:**
- ❌ No recent backup
- ❌ Production DB under heavy load
- ❌ Untested on dev DB
- ❌ Active incidents in progress

---

#### Phase 2: Session Manager
**GO Criteria:**
- ✅ Phase 1 complete and verified
- ✅ CLAUDE.md accessible
- ✅ SDK connection tested
- ✅ Fallback prompt ready
- ✅ Unit tests written and passing

**NO-GO Criteria:**
- ❌ Phase 1 not complete
- ❌ SDK unavailable
- ❌ Critical bugs in Phase 1
- ❌ Insufficient testing

---

#### Phase 3: Post Integration
**GO Criteria:**
- ✅ Phase 2 complete and verified
- ✅ Session manager stable
- ✅ Integration tests passing
- ✅ Both AVI and link-logger paths tested

**NO-GO Criteria:**
- ❌ Phase 2 unstable
- ❌ Session manager errors
- ❌ Failed integration tests
- ❌ Performance issues

---

### 6.2 Rollback Decision Criteria

**Immediate Rollback If:**
- Data corruption detected
- >50% error rate for 10+ minutes
- Security vulnerability discovered
- Critical system functionality broken
- Unrecoverable errors

**Planned Rollback If:**
- >10% error rate sustained
- Token costs >$50/day
- Performance degradation >50%
- User complaints >5 in 1 hour
- Alternative solution identified

**Continue Despite:**
- Occasional errors (<1%)
- Minor performance impact (<10%)
- Cosmetic issues
- Non-critical bugs
- User confusion (addressable with docs)

---

## DOCUMENT CONTROL

**Version:** 1.0
**Created:** 2025-10-24
**Author:** SPARC Specification Agent
**Classification:** Internal Technical

**Usage:**
This document should be reviewed:
- Before starting each implementation phase
- During risk assessment meetings
- When incidents occur
- During post-mortems
- Quarterly for updates

**Related Documents:**
- AVI-PERSISTENT-SESSION-SPECIFICATION.md (main spec)
- AVI-PERSISTENT-SESSION-IMPLEMENTATION-PLAN.md (implementation guide)
