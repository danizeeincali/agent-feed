# AVI Persistent Session Implementation - SPARC Specification

**Document Type:** Technical Requirements Specification
**Project:** AVI Persistent Session with Auto-Cleanup
**Date:** 2025-10-24
**Status:** Requirements Analysis Complete
**Methodology:** SPARC (Specification, Pseudocode, Architecture, Refinement, Completion)
**Phase:** Specification (S)

---

## 1. EXECUTIVE SUMMARY

### 1.1 Purpose
This specification defines the complete technical requirements for implementing a persistent AVI (Amplifying Virtual Intelligence) session manager that provides cost-efficient, context-preserving conversational AI capabilities for the Agent Feed system.

### 1.2 Scope
- Database schema migration to support agent attribution
- AVI session lifecycle management with lazy initialization
- Integration with existing post creation workflow
- Direct messaging API for AVI interaction
- Token cost optimization through session persistence
- Real-time status monitoring and metrics

### 1.3 Key Performance Indicators
- **Token Cost Reduction:** 95% savings vs spawn-per-question
- **Response Time:** <2 seconds for subsequent interactions
- **Session Persistence:** 60 minutes idle timeout
- **Availability:** 99.9% uptime during active sessions
- **Cost Target:** <$10/day for 100 interactions

---

## 2. FUNCTIONAL REQUIREMENTS

### FR-2.1: Comment Schema Migration (P0 - CRITICAL)

#### FR-2.1.1: Database Schema Enhancement
**Priority:** P0 (Blocks all agent comment posting)
**Category:** Data Model

**Requirements:**
- Add `author_agent` TEXT column to `comments` table
- Maintain backward compatibility with existing `author` column
- Migrate all existing comment data to populate `author_agent`
- Preserve referential integrity with foreign keys

**Acceptance Criteria:**
- [ ] Migration script executes without errors
- [ ] All existing comments have `author_agent` populated with `author` values
- [ ] New comments can be inserted with both `author` and `author_agent`
- [ ] Zero data loss during migration
- [ ] Schema changes backwards compatible for 2+ weeks transition period

**SQL Migration Specification:**
```sql
-- Migration 007: Add author_agent column
ALTER TABLE comments ADD COLUMN author_agent TEXT;
UPDATE comments SET author_agent = author WHERE author_agent IS NULL;
-- Verification: SELECT COUNT(*) FROM comments WHERE author_agent IS NULL; -- Expected: 0
```

**Validation Requirements:**
- Post-migration NULL check must return 0 rows
- Sample data verification with minimum 5 records
- Console output confirmation of successful migration
- Automated rollback procedure if migration fails

#### FR-2.1.2: Database Accessor Layer Updates
**Priority:** P0
**Category:** Data Access

**Requirements:**
- Update `database-selector.js` `createComment()` method to accept both fields
- Implement backward compatibility logic: accept `author` OR `author_agent`
- Set `author_agent` as primary field, `author` as fallback
- Maintain dual-column support during transition period

**Acceptance Criteria:**
- [ ] Comments created with `author_agent` field store correctly
- [ ] Comments created with legacy `author` field still work
- [ ] Both columns populated on creation for backward compatibility
- [ ] No breaking changes to existing comment creation endpoints
- [ ] link-logger agent comments post successfully

**Code Implementation Specification:**
```javascript
// Accept both author and author_agent for backward compatibility
const author = commentData.author || userId;
const authorAgent = commentData.author_agent || commentData.author || userId;

insert.run(
  commentId,
  commentData.post_id,
  commentData.parent_id || null,
  author,           // Backward compatibility
  authorAgent,      // Primary field
  commentData.content,
  mentionedUsers
);
```

---

### FR-2.2: AVI Session Manager (P0)

#### FR-2.2.1: Session Initialization
**Priority:** P0
**Category:** Core Functionality

**Requirements:**
- Lazy initialization: session created on first interaction only
- Load AVI system prompt from `/prod/.claude/CLAUDE.md`
- Extract relevant sections: Chief of Staff, Behavioral Patterns, Agent Routing
- Initialize Claude Code SDK Manager connection
- Generate unique session ID with timestamp
- Start idle timeout monitoring

**Acceptance Criteria:**
- [ ] Session does not initialize on server startup
- [ ] First chat request triggers initialization
- [ ] System prompt loaded from CLAUDE.md successfully
- [ ] SDK Manager connection established
- [ ] Unique session ID generated (format: `avi-session-{timestamp}`)
- [ ] Idle timeout timer started (60 minutes)
- [ ] Initialization completes in <5 seconds
- [ ] First interaction token cost: ~30,000 tokens

**Session State Model:**
```typescript
interface AviSessionState {
  sessionId: string | null;
  sessionActive: boolean;
  lastActivity: number | null;
  idleTimeout: number;  // milliseconds
  cleanupTimer: NodeJS.Timer | null;
  systemPrompt: string | null;
  totalTokensUsed: number;
  interactionCount: number;
}
```

#### FR-2.2.2: Session Persistence
**Priority:** P0
**Category:** Performance Optimization

**Requirements:**
- Reuse existing session context across all subsequent interactions
- Update activity timestamp on each interaction
- Reset idle timeout on activity
- Maintain conversation history in session context
- Track token usage per interaction and cumulative

**Acceptance Criteria:**
- [ ] Subsequent interactions reuse existing session
- [ ] No re-initialization unless session expired
- [ ] Activity timestamp updates on each chat
- [ ] Idle timer resets on activity
- [ ] Token usage <2,000 per subsequent interaction
- [ ] Session maintains context across conversations
- [ ] Response time <2 seconds for cached sessions

**Token Cost Model:**
```
First interaction:  ~30,000 tokens (full context load)
Interaction 2-100:  ~1,700 tokens each (session reuse)
Total for 100:      198,300 tokens
Cost:               ~$3-4 (vs $45-60 spawn-per-question)
Savings:            93-95%
```

#### FR-2.2.3: Automatic Cleanup
**Priority:** P0
**Category:** Resource Management

**Requirements:**
- Monitor session idle time every 60 seconds
- Calculate idle duration from last activity timestamp
- Trigger cleanup when idle exceeds 60 minutes (configurable)
- Log session statistics before cleanup
- Clear session state and release resources
- Stop idle timeout monitoring

**Acceptance Criteria:**
- [ ] Idle check runs every 60 seconds
- [ ] Cleanup triggers at 60 minutes + 60 seconds (max delay)
- [ ] Session marked inactive before cleanup
- [ ] Statistics logged: interactions, total tokens
- [ ] Resources released: timers cleared, session nullified
- [ ] New interaction after cleanup triggers re-initialization
- [ ] No memory leaks from unreleased resources

**Cleanup Logic:**
```javascript
if (Date.now() - lastActivity > idleTimeout) {
  console.log(`Session idle for ${idleTime}ms, cleaning up...`);
  console.log(`Stats: ${interactionCount} interactions, ${totalTokensUsed} tokens`);
  cleanup();
}
```

#### FR-2.2.4: System Prompt Loading
**Priority:** P0
**Category:** Configuration

**Requirements:**
- Read CLAUDE.md from `/workspaces/agent-feed/prod/.claude/CLAUDE.md`
- Extract sections: "Meet Λvi", "Behavioral Patterns", "Agent Routing"
- Append current context: working directory, available specialists
- Define response constraints: max 2000 tokens, concise format
- Include persistence note: "You are a persistent session"

**Acceptance Criteria:**
- [ ] CLAUDE.md file read successfully
- [ ] All required sections extracted
- [ ] Context variables substituted correctly
- [ ] Response constraints included in prompt
- [ ] Prompt length <10,000 tokens
- [ ] AVI identity and personality preserved

**System Prompt Structure:**
```markdown
You are Λvi (AVI), Chief of Staff for this system.

[CLAUDE.md sections: Meet Λvi, Behavioral Patterns, Agent Routing]

## Current Context
- Working Directory: /workspaces/agent-feed/prod/agent_workspace/
- System Mode: Production
- Available Specialists: [list]
- Active Orchestrator: Monitoring proactive agents

## Your Role
- Answer user questions about the system
- Coordinate specialist agents when needed
- Keep responses concise (max 2000 tokens)

## Important
- Persistent session - context maintained across conversations
- Respond naturally and conversationally
- Use tools when appropriate
```

#### FR-2.2.5: Chat Processing
**Priority:** P0
**Category:** Core Functionality

**Requirements:**
- Accept user message as plain text input
- Include system prompt on first interaction only
- Execute through Claude Code SDK Manager
- Respect maxTokens limit (default: 2000)
- Extract response from SDK result messages
- Track token usage from response metadata
- Update cumulative statistics
- Handle SDK errors with retry logic

**Acceptance Criteria:**
- [ ] User message processed correctly
- [ ] System prompt included on first interaction only
- [ ] SDK execution completes successfully
- [ ] Response extracted from assistant messages
- [ ] Token usage tracked and reported
- [ ] Cumulative stats updated
- [ ] Errors logged with context
- [ ] Failed session recovers with re-initialization

**Error Handling:**
```javascript
try {
  const result = await sdk.executeHeadlessTask(prompt, options);
  return processResult(result);
} catch (error) {
  if (error.message.includes('session')) {
    console.log('Session lost, reinitializing...');
    await initialize();
    return await chat(message, options); // Retry once
  }
  throw error;
}
```

---

### FR-2.3: Post Creation Integration (P0)

#### FR-2.3.1: Question Detection
**Priority:** P0
**Category:** Content Analysis

**Requirements:**
- Analyze post content for question indicators
- Exclude posts containing URLs (route to link-logger instead)
- Detect patterns: question marks, question keywords, direct AVI address
- Return boolean: true if AVI should respond

**Acceptance Criteria:**
- [ ] Posts with URLs return false (go to link-logger)
- [ ] Posts with "?" return true
- [ ] Posts starting with "what/where/when/why/how" return true
- [ ] Posts mentioning "avi" or "λvi" return true
- [ ] Pattern detection case-insensitive
- [ ] No false positives for link-logger posts
- [ ] No false negatives for AVI questions

**Detection Patterns:**
```javascript
// Pattern 1: Direct address
if (content.toLowerCase().includes('avi') || content.includes('λvi')) return true;

// Pattern 2: Question marks
if (content.includes('?')) return true;

// Pattern 3: Question keywords
const patterns = [
  /^(what|where|when|why|how|who|status|help)/i,
  /directory/i,
  /working on/i,
  /tell me/i
];
return patterns.some(p => p.test(content));
```

#### FR-2.3.2: Async Response Handler
**Priority:** P0
**Category:** Integration

**Requirements:**
- Process AVI responses asynchronously (non-blocking)
- Initialize AVI session on demand
- Send user post content to AVI chat
- Post AVI response as comment on original post
- Set author_agent to "avi"
- Skip ticket creation for AVI comments
- Log token usage and session stats
- Handle errors gracefully without failing post creation

**Acceptance Criteria:**
- [ ] Post creation returns immediately (non-blocking)
- [ ] AVI response processed in background
- [ ] AVI comment posted to correct post
- [ ] author_agent set to "avi"
- [ ] No ticket created for AVI comments (skipTicket: true)
- [ ] Token usage logged
- [ ] Errors don't crash server
- [ ] User sees post immediately, AVI comment appears shortly after

**Integration Point (server.js):**
```javascript
// After post creation
if (isAviQuestion(content)) {
  handleAviResponse(createdPost).catch(error => {
    console.error('AVI response error:', error);
  });
}

// Return immediately - don't wait for AVI
res.status(201).json({ success: true, data: createdPost });
```

---

### FR-2.4: AVI Direct Messaging API (P1)

#### FR-2.4.1: Chat Endpoint
**Priority:** P1
**Category:** API

**Requirements:**
- Accept POST requests to `/api/avi/chat`
- Validate message field (required, non-empty)
- Process through AVI session manager
- Return response with token usage and session info
- Support optional parameters: maxTokens, temperature

**Acceptance Criteria:**
- [ ] Endpoint responds to POST /api/avi/chat
- [ ] Empty messages return 400 Bad Request
- [ ] Valid messages return 200 OK with response
- [ ] Response includes: response text, tokensUsed, sessionId, sessionStatus
- [ ] Errors return 500 with error details
- [ ] Multiple DM messages reuse same session
- [ ] API rate limiting enforced (if configured)

**API Specification:**
```yaml
POST /api/avi/chat
Request:
  Content-Type: application/json
  Body:
    message: string (required, 1-5000 chars)
    maxTokens?: number (optional, default 2000)
    temperature?: number (optional, default 0.7)

Response 200:
  {
    "success": true,
    "data": {
      "response": string,
      "tokensUsed": number,
      "sessionId": string,
      "sessionStatus": {
        "active": boolean,
        "interactionCount": number,
        "totalTokens": number
      }
    }
  }

Response 400:
  { "success": false, "error": "Message is required" }

Response 500:
  { "success": false, "error": "Failed to process", "details": string }
```

#### FR-2.4.2: Status Endpoint
**Priority:** P1
**Category:** API

**Requirements:**
- Accept GET requests to `/api/avi/status`
- Return current session status
- Include: active state, session ID, idle time, token stats
- No authentication required (single-user system)

**Acceptance Criteria:**
- [ ] Endpoint responds to GET /api/avi/status
- [ ] Returns current session state
- [ ] Includes all status fields
- [ ] Works when session inactive (returns null/0 values)
- [ ] Response time <100ms

**API Specification:**
```yaml
GET /api/avi/status
Response 200:
  {
    "success": true,
    "data": {
      "active": boolean,
      "sessionId": string | null,
      "lastActivity": number | null,
      "idleTime": number | null,
      "idleTimeout": number,
      "interactionCount": number,
      "totalTokensUsed": number,
      "averageTokensPerInteraction": number
    }
  }
```

#### FR-2.4.3: Session Reset Endpoint
**Priority:** P1
**Category:** API

**Requirements:**
- Accept DELETE requests to `/api/avi/session`
- Force cleanup of current session
- Return previous session statistics
- Allow manual reset for testing/debugging

**Acceptance Criteria:**
- [ ] Endpoint responds to DELETE /api/avi/session
- [ ] Session cleaned up immediately
- [ ] Previous stats returned in response
- [ ] Next interaction creates fresh session
- [ ] Useful for development/testing

**API Specification:**
```yaml
DELETE /api/avi/session
Response 200:
  {
    "success": true,
    "message": "AVI session cleaned up",
    "previousSession": {
      "sessionId": string,
      "interactions": number,
      "tokensUsed": number
    }
  }
```

#### FR-2.4.4: Metrics Endpoint
**Priority:** P1
**Category:** Monitoring

**Requirements:**
- Accept GET requests to `/api/avi/metrics`
- Calculate cost estimates based on token usage
- Calculate efficiency vs spawn-per-question model
- Return session, usage, cost, and efficiency metrics

**Acceptance Criteria:**
- [ ] Endpoint responds to GET /api/avi/metrics
- [ ] Cost calculations accurate ($3/M tokens)
- [ ] Efficiency percentage correct
- [ ] Metrics useful for cost analysis
- [ ] Updated in real-time

**API Specification:**
```yaml
GET /api/avi/metrics
Response 200:
  {
    "success": true,
    "data": {
      "session": {
        "active": boolean,
        "sessionId": string,
        "uptime": number
      },
      "usage": {
        "totalInteractions": number,
        "totalTokens": number,
        "averageTokensPerInteraction": number
      },
      "cost": {
        "estimatedCost": number,
        "averageCostPerInteraction": number
      },
      "efficiency": {
        "savingsVsSpawnPerQuestion": number  // percentage
      }
    }
  }
```

---

### FR-2.5: Token Optimization (P1)

#### FR-2.5.1: Prompt Caching
**Priority:** P1
**Category:** Performance

**Requirements:**
- Cache system prompt after first load
- Reuse cached prompt for all subsequent interactions
- Include system prompt in SDK context once
- Reduce redundant prompt tokens

**Acceptance Criteria:**
- [ ] System prompt loaded once per session
- [ ] Prompt cached in session manager
- [ ] Not re-sent on subsequent interactions
- [ ] Token savings measurable in metrics

#### FR-2.5.2: Response Length Limits
**Priority:** P1
**Category:** Cost Control

**Requirements:**
- Enforce maxTokens limit on all AVI responses
- Default: 2000 tokens
- Configurable per request
- Reject requests exceeding safe limits

**Acceptance Criteria:**
- [ ] maxTokens parameter enforced
- [ ] Default limit applied when not specified
- [ ] Responses stay within limits
- [ ] Cost predictable and controlled

#### FR-2.5.3: Token Usage Monitoring
**Priority:** P1
**Category:** Observability

**Requirements:**
- Track tokens per interaction
- Track cumulative session tokens
- Calculate averages and trends
- Log usage to console
- Expose via metrics endpoint

**Acceptance Criteria:**
- [ ] Per-interaction tokens logged
- [ ] Cumulative totals maintained
- [ ] Averages calculated correctly
- [ ] Metrics endpoint shows current usage
- [ ] Historical trends available

---

## 3. NON-FUNCTIONAL REQUIREMENTS

### NFR-3.1: Performance

#### NFR-3.1.1: Response Time
**Requirement:** AVI responses must be fast and predictable
**Measurement:** p95 latency
**Target:**
- First interaction: <5 seconds
- Subsequent interactions: <2 seconds
- Status endpoint: <100ms
- Metrics endpoint: <200ms

**Validation:**
- Load testing with 10 concurrent users
- Measure response times under load
- 95th percentile within targets

#### NFR-3.1.2: Token Efficiency
**Requirement:** Significant cost reduction through session reuse
**Measurement:** Tokens per interaction
**Target:**
- First: ~30,000 tokens
- Subsequent: <2,000 tokens
- Overall savings: >90% vs spawn-per-question

**Validation:**
- Measure token usage over 100 interactions
- Compare to baseline spawn-per-question model
- Calculate savings percentage

#### NFR-3.1.3: Resource Usage
**Requirement:** Efficient memory and CPU utilization
**Measurement:** System resource monitoring
**Target:**
- Memory: <500MB per session
- CPU: <10% idle, <50% under load
- No memory leaks over 24 hours

**Validation:**
- Monitor with system tools
- Run 24-hour stability test
- Check for memory growth

### NFR-3.2: Reliability

#### NFR-3.2.1: Session Stability
**Requirement:** Sessions remain stable during active use
**Measurement:** Session uptime during activity
**Target:**
- 99.9% stability during active period
- Automatic recovery from SDK errors
- Graceful degradation on failures

**Validation:**
- Run 1000 interactions without manual intervention
- Simulate SDK errors
- Verify recovery mechanisms

#### NFR-3.2.2: Data Integrity
**Requirement:** Comment data preserved correctly
**Measurement:** Database consistency checks
**Target:**
- Zero data loss during migration
- 100% author_agent population
- Referential integrity maintained

**Validation:**
- Pre and post-migration data counts
- Null value checks
- Foreign key constraint validation

#### NFR-3.2.3: Error Handling
**Requirement:** Graceful error handling throughout
**Measurement:** Error rate and recovery
**Target:**
- All errors logged with context
- User-facing errors provide actionable info
- No cascading failures

**Validation:**
- Simulate various error conditions
- Verify error messages
- Check system recovery

### NFR-3.3: Security

#### NFR-3.3.1: Input Validation
**Requirement:** All user inputs validated
**Measurement:** Security testing
**Target:**
- Message length limits enforced
- SQL injection prevention
- XSS prevention in responses

**Validation:**
- Security scan with automated tools
- Manual penetration testing
- Input fuzzing

#### NFR-3.3.2: Rate Limiting
**Requirement:** Prevent API abuse
**Measurement:** Request rate monitoring
**Target:**
- Max 60 requests/minute per IP (configurable)
- 429 responses for exceeded limits
- No denial of service vulnerability

**Validation:**
- Automated rate limit testing
- Load testing beyond limits
- Verify 429 responses

### NFR-3.4: Maintainability

#### NFR-3.4.1: Code Quality
**Requirement:** Clean, documented, testable code
**Measurement:** Code review
**Target:**
- All functions documented
- Complex logic commented
- Consistent code style
- Test coverage >80%

**Validation:**
- Code review by team
- Automated linting
- Test coverage reports

#### NFR-3.4.2: Logging
**Requirement:** Comprehensive operational logging
**Measurement:** Log analysis
**Target:**
- All major operations logged
- Error logging with stack traces
- Performance metrics logged
- Structured log format

**Validation:**
- Review logs during testing
- Verify log completeness
- Test log parsing tools

### NFR-3.5: Scalability

#### NFR-3.5.1: Single-User Architecture
**Requirement:** Optimized for single-user system
**Measurement:** Architecture review
**Target:**
- Single global session instance
- No multi-tenancy complexity
- Singleton pattern enforced
- Configuration for future expansion

**Validation:**
- Architecture documentation
- Code review for patterns
- Future scalability assessment

---

## 4. SYSTEM CONSTRAINTS

### 4.1 Technical Constraints

#### C-4.1.1: Database Platform
**Constraint:** SQLite primary, PostgreSQL secondary
**Impact:** Migration scripts must support SQLite syntax
**Mitigation:** Test on both platforms if PostgreSQL active

#### C-4.1.2: Node.js Version
**Constraint:** Node.js 18+ required
**Impact:** Can use modern ES modules, async/await
**Mitigation:** Document minimum version requirement

#### C-4.1.3: Claude Code SDK
**Constraint:** Dependency on external SDK
**Impact:** Session lifecycle tied to SDK availability
**Mitigation:** Error handling, retry logic, graceful degradation

#### C-4.1.4: File System Access
**Constraint:** Must read CLAUDE.md from prod directory
**Impact:** Path must be correct and file accessible
**Mitigation:** Error handling for missing file, default prompt fallback

### 4.2 Business Constraints

#### C-4.2.1: Single-User System
**Constraint:** No multi-tenancy required
**Impact:** Simpler architecture, global singleton
**Mitigation:** Document for future expansion needs

#### C-4.2.2: Cost Target
**Constraint:** Daily cost must stay under $10 for typical usage
**Impact:** Token optimization critical
**Mitigation:** Monitoring, alerts, automatic session cleanup

#### C-4.2.3: Backward Compatibility
**Constraint:** Must support existing comment system for 2+ weeks
**Impact:** Dual-column support during transition
**Mitigation:** Gradual deprecation path, documentation

### 4.3 Operational Constraints

#### C-4.3.1: Zero Downtime Migration
**Constraint:** Schema migration must not disrupt service
**Impact:** Migration must be fast (<1 minute)
**Mitigation:** Test on development DB first, backup before migration

#### C-4.3.2: Development Environment
**Constraint:** Working directory /workspaces/agent-feed
**Impact:** Paths must be absolute and correct
**Mitigation:** Path constants, environment validation

---

## 5. DEPENDENCIES

### 5.1 External Dependencies

#### D-5.1.1: Claude Code SDK Manager
**Type:** Runtime Dependency
**Location:** `/prod/src/services/ClaudeCodeSDKManager.ts`
**Purpose:** Execute Claude Code tasks with context
**Risk:** Medium - External service dependency
**Mitigation:** Error handling, retry logic, session recovery

#### D-5.1.2: Better-SQLite3
**Type:** Database Driver
**Package:** `better-sqlite3`
**Purpose:** SQLite database operations
**Risk:** Low - Stable, widely used
**Mitigation:** Version pinning

#### D-5.1.3: Socket.IO
**Type:** WebSocket Library
**Package:** `socket.io`
**Purpose:** Real-time status updates
**Risk:** Low - Optional for core functionality
**Mitigation:** Graceful degradation if unavailable

### 5.2 Internal Dependencies

#### D-5.2.1: Database Selector
**Type:** Data Access Layer
**Location:** `/api-server/config/database-selector.js`
**Purpose:** Abstract SQLite/PostgreSQL operations
**Risk:** Low - Existing, tested code
**Mitigation:** Update only createComment method

#### D-5.2.2: Work Queue Repository
**Type:** Work Queue Management
**Location:** `/api-server/repositories/work-queue-repository.js`
**Purpose:** Ticket creation for proactive agents
**Risk:** Low - Parallel system
**Mitigation:** No changes required

#### D-5.2.3: WebSocket Service
**Type:** Real-time Updates
**Location:** `/api-server/services/websocket-service.js`
**Purpose:** Broadcast status changes
**Risk:** Low - Optional enhancement
**Mitigation:** Check initialization before use

#### D-5.2.4: AVI Orchestrator
**Type:** Agent Coordination
**Location:** `/api-server/avi/orchestrator.js`
**Purpose:** Manage proactive agent workers
**Risk:** Low - Separate concern
**Mitigation:** No interference with session manager

### 5.3 File System Dependencies

#### D-5.3.1: CLAUDE.md
**Type:** Configuration File
**Location:** `/workspaces/agent-feed/prod/.claude/CLAUDE.md`
**Purpose:** AVI system prompt and personality
**Risk:** Medium - File must exist and be readable
**Mitigation:** Error handling, default prompt fallback, validation

#### D-5.3.2: Migration Files
**Type:** SQL Schema
**Location:** `/api-server/db/migrations/007-rename-author-column.sql`
**Purpose:** Database schema changes
**Risk:** Low - One-time execution
**Mitigation:** Idempotent design, verification queries

### 5.4 Dependency Map

```
AVI Session Manager
├── ClaudeCodeSDKManager.ts [EXTERNAL - CRITICAL]
├── database-selector.js [INTERNAL - REQUIRED]
│   └── better-sqlite3 [PACKAGE - REQUIRED]
├── CLAUDE.md [FILE - REQUIRED]
├── websocket-service.js [INTERNAL - OPTIONAL]
└── server.js [INTERNAL - INTEGRATION POINT]

Migration System
├── 007-rename-author-column.sql [FILE - REQUIRED]
├── apply-migration-007.js [SCRIPT - REQUIRED]
└── database-selector.js [INTERNAL - REQUIRED]

Post Integration
├── session-manager.js [NEW - REQUIRED]
├── server.js [INTERNAL - MODIFY]
└── work-queue-repository.js [INTERNAL - PARALLEL]
```

---

## 6. INTEGRATION POINTS

### 6.1 Post Creation Flow

#### I-6.1.1: Current Flow
```
User creates post
  → POST /api/v1/agent-posts
    → Validate content
    → Create post in database
    → Create work queue ticket (if URL detected)
    → Trigger orchestrator (for proactive agents)
    → Return 201 with post data
```

#### I-6.1.2: Enhanced Flow with AVI
```
User creates post
  → POST /api/v1/agent-posts
    → Validate content
    → Create post in database
    → [NEW] Detect if AVI question
      → If URL: Create ticket for link-logger (existing)
      → If question without URL: Trigger AVI (async)
    → Return 201 immediately (non-blocking)

  [Async Background]
  → AVI Response Handler
    → Initialize AVI session (if needed)
    → Send question to AVI
    → Receive response
    → Post comment with author_agent="avi"
    → Log token usage
```

**Integration Requirements:**
- Non-blocking: Post creation returns immediately
- Error isolation: AVI errors don't fail post creation
- Logging: Clear distinction between sync and async operations
- Routing: URL posts go to link-logger, questions go to AVI

### 6.2 Comment Creation Flow

#### I-6.2.1: Current Flow
```
Agent/User creates comment
  → POST /api/agent-posts/:postId/comments
    → Validate data
    → Insert into comments table (author column)
    → Update post engagement count
    → Optionally create ticket
    → Return 201 with comment data
```

#### I-6.2.2: Enhanced Flow with Migration
```
Agent/User creates comment
  → POST /api/agent-posts/:postId/comments
    → Validate data
    → [ENHANCED] Accept author OR author_agent
    → [ENHANCED] Populate both columns
      - author = provided author or userId
      - author_agent = provided author_agent or author or userId
    → Insert into comments table (both columns)
    → Update post engagement count
    → Optionally create ticket
    → Return 201 with comment data
```

**Integration Requirements:**
- Backward compatibility: Old code sending only `author` still works
- Forward compatibility: New code can send `author_agent`
- Data consistency: Both columns always populated
- Transition period: Support both fields for 2+ weeks

### 6.3 AVI Orchestrator Interaction

#### I-6.3.1: Separation of Concerns
```
AVI Session Manager (Q&A)
- Handles direct user questions
- Manages persistent session
- Posts comments as responses
- Independent lifecycle

AVI Orchestrator (Proactive Agents)
- Monitors work queue
- Spawns agent workers
- Manages link-logger, etc.
- Independent lifecycle
```

**Integration Requirements:**
- No direct interaction between Session Manager and Orchestrator
- Separate responsibilities: Q&A vs proactive agents
- Can coexist on same server
- No resource conflicts

### 6.4 WebSocket Integration

#### I-6.4.1: Optional Real-Time Updates
```
AVI Session Manager
  ↓ (optional)
WebSocket Service
  ↓
Frontend Client
  ↓
Display: "AVI is typing..."
```

**Integration Requirements:**
- Check websocketService initialization before use
- Gracefully skip if not available
- Emit events: "avi_processing", "avi_response_ready"
- No breaking changes if WebSocket unavailable

---

## 7. EDGE CASES AND RISKS

### 7.1 Edge Cases

#### E-7.1.1: Migration Edge Cases

**Case 1: Comments with NULL author**
- **Scenario:** Existing comment has NULL in author column
- **Behavior:** Migration sets author_agent to NULL
- **Mitigation:** Pre-migration validation, require author column NOT NULL

**Case 2: Migration runs twice**
- **Scenario:** Migration script executed multiple times
- **Behavior:** UPDATE sets author_agent = author again (idempotent)
- **Mitigation:** Check for column existence before ALTER, log if already exists

**Case 3: Large table migration**
- **Scenario:** Millions of comments in database
- **Behavior:** Migration takes >1 minute
- **Mitigation:** Test on production data size, consider batching

**Case 4: Concurrent writes during migration**
- **Scenario:** New comment inserted while migration running
- **Behavior:** May have NULL author_agent if inserted mid-migration
- **Mitigation:** Brief maintenance mode, or post-migration NULL check

#### E-7.1.2: Session Management Edge Cases

**Case 1: Session timeout during active chat**
- **Scenario:** User types slowly, 60 minutes pass
- **Behavior:** Session cleaned up mid-conversation
- **Mitigation:** Reset timer on any activity, consider increasing timeout

**Case 2: SDK connection lost**
- **Scenario:** Claude Code SDK becomes unavailable
- **Behavior:** Session cannot execute
- **Mitigation:** Retry logic, re-initialize session, error response to user

**Case 3: Multiple simultaneous first interactions**
- **Scenario:** Rare race condition on initialization
- **Behavior:** Could create multiple sessions
- **Mitigation:** Lock on initialization, check sessionActive before creating

**Case 4: Server restart with active session**
- **Scenario:** Server crashes or restarts
- **Behavior:** In-memory session lost
- **Mitigation:** Acceptable - next interaction re-initializes

**Case 5: CLAUDE.md file missing**
- **Scenario:** File moved, deleted, or permissions issue
- **Behavior:** Cannot load system prompt
- **Mitigation:** Try/catch, use default fallback prompt, log error

**Case 6: Extremely long conversation**
- **Scenario:** 1000+ interactions in one session
- **Behavior:** Context may bloat, slow down, or exceed limits
- **Mitigation:** Monitor context size, restart session at threshold

#### E-7.1.3: Post Integration Edge Cases

**Case 1: Post with URL and question mark**
- **Scenario:** "Check out this article: https://example.com - what do you think?"
- **Behavior:** Current logic routes to link-logger (URL takes precedence)
- **Mitigation:** Document priority: URL > question, acceptable behavior

**Case 2: Post mentioning "avi" but for link-logger**
- **Scenario:** "Can avi analyze https://example.com?"
- **Behavior:** Goes to link-logger (URL precedence)
- **Mitigation:** Same as above, acceptable

**Case 3: AVI response fails**
- **Scenario:** SDK error, timeout, etc.
- **Behavior:** No comment posted, error logged
- **Mitigation:** User doesn't see error (async), check logs, retry option

**Case 4: Very long user question**
- **Scenario:** 10,000 character post
- **Behavior:** May exceed context limits
- **Mitigation:** Truncate input, or pass validation error to user

#### E-7.1.4: API Edge Cases

**Case 1: Rapid API requests**
- **Scenario:** Script sends 100 requests/second
- **Behavior:** Could overwhelm server
- **Mitigation:** Rate limiting (NFR-3.3.2)

**Case 2: Very large response**
- **Scenario:** AVI generates >10,000 tokens somehow
- **Behavior:** High cost, slow response
- **Mitigation:** Enforce maxTokens strictly, truncate if exceeded

**Case 3: Session reset during active chat**
- **Scenario:** DELETE /api/avi/session while chat in progress
- **Behavior:** Session cleaned up, next request re-initializes
- **Mitigation:** Document behavior, acceptable for admin/testing

### 7.2 Risk Analysis

#### R-7.2.1: High Risks

**Risk 1: Migration Data Loss**
- **Probability:** Low
- **Impact:** Critical
- **Description:** Migration fails and corrupts comment data
- **Mitigation:**
  - Backup database before migration
  - Test on development database first
  - Idempotent migration design
  - Verification queries after migration
  - Rollback procedure documented

**Risk 2: SDK Dependency Failure**
- **Probability:** Medium
- **Impact:** High
- **Description:** Claude Code SDK unavailable or changes API
- **Mitigation:**
  - Error handling and graceful degradation
  - Retry logic with exponential backoff
  - Clear error messages to user
  - Monitor SDK health
  - Version pinning

**Risk 3: Token Cost Runaway**
- **Probability:** Low
- **Impact:** High
- **Description:** Bug causes excessive token usage, high costs
- **Mitigation:**
  - Strict maxTokens enforcement
  - Cost monitoring and alerts
  - Automatic session cleanup
  - Daily cost limits
  - Usage metrics endpoint

#### R-7.2.2: Medium Risks

**Risk 4: Session Memory Leak**
- **Probability:** Medium
- **Impact:** Medium
- **Description:** Session not cleaned up, memory grows over time
- **Mitigation:**
  - Rigorous timer management
  - Memory monitoring
  - Forced cleanup endpoint
  - Health checks
  - 24-hour stability testing

**Risk 5: Comment Attribution Confusion**
- **Probability:** Medium
- **Impact:** Medium
- **Description:** Dual-column period causes attribution errors
- **Mitigation:**
  - Clear documentation of transition
  - Gradual migration (2+ weeks)
  - Monitoring for NULL values
  - Clear deprecation timeline

**Risk 6: Integration Breaking Changes**
- **Probability:** Low
- **Impact:** Medium
- **Description:** Changes break existing functionality
- **Mitigation:**
  - Comprehensive testing
  - Backward compatibility design
  - Gradual rollout
  - Rollback plan

#### R-7.2.3: Low Risks

**Risk 7: WebSocket Service Unavailable**
- **Probability:** Low
- **Impact:** Low
- **Description:** WebSocket not initialized
- **Mitigation:**
  - Optional integration
  - Check before use
  - Graceful degradation
  - No functional impact

**Risk 8: CLAUDE.md Format Changes**
- **Probability:** Low
- **Impact:** Low
- **Description:** File format changes break extraction
- **Mitigation:**
  - Fallback prompt
  - Error logging
  - Manual prompt option
  - Version control

---

## 8. ACCEPTANCE CRITERIA SUMMARY

### 8.1 Phase 1: Comment Schema (CRITICAL PATH)

**MUST COMPLETE BEFORE ANY OTHER PHASE**

- [ ] **AC-1.1:** Migration script executes without errors on development DB
- [ ] **AC-1.2:** All existing comments have author_agent populated (0 NULLs)
- [ ] **AC-1.3:** New comments insert successfully with both columns
- [ ] **AC-1.4:** database-selector.js accepts both author and author_agent
- [ ] **AC-1.5:** link-logger agent posts comments successfully (no "No summary")
- [ ] **AC-1.6:** Sample queries verify data consistency
- [ ] **AC-1.7:** Rollback procedure documented and tested

**Success Metrics:**
- Migration time: <1 minute
- Data loss: 0 rows
- NULL author_agent count: 0
- link-logger success rate: 100%

---

### 8.2 Phase 2: AVI Session Manager

- [ ] **AC-2.1:** Session initializes on first chat (not on server start)
- [ ] **AC-2.2:** CLAUDE.md loaded successfully, prompt extracted
- [ ] **AC-2.3:** First interaction completes in <5 seconds
- [ ] **AC-2.4:** First interaction uses ~30,000 tokens
- [ ] **AC-2.5:** Subsequent interactions reuse session
- [ ] **AC-2.6:** Subsequent interactions use <2,000 tokens
- [ ] **AC-2.7:** Session persists for 60 minutes idle
- [ ] **AC-2.8:** Session cleans up automatically after idle timeout
- [ ] **AC-2.9:** Session statistics logged on cleanup
- [ ] **AC-2.10:** SDK errors handled gracefully with retry
- [ ] **AC-2.11:** Unit tests pass with >80% coverage

**Success Metrics:**
- Initialization time: <5s
- Subsequent response time: <2s
- Token savings: >90%
- Session stability: 99.9%

---

### 8.3 Phase 3: Post Integration

- [ ] **AC-3.1:** Questions without URLs detected correctly
- [ ] **AC-3.2:** Posts with URLs routed to link-logger (not AVI)
- [ ] **AC-3.3:** AVI responses processed asynchronously (non-blocking)
- [ ] **AC-3.4:** Post creation returns immediately (<500ms)
- [ ] **AC-3.5:** AVI comment appears on post shortly after (<5s)
- [ ] **AC-3.6:** AVI comments have author_agent="avi"
- [ ] **AC-3.7:** AVI comments skip ticket creation (skipTicket: true)
- [ ] **AC-3.8:** AVI errors logged but don't fail post creation
- [ ] **AC-3.9:** Token usage logged for each interaction
- [ ] **AC-3.10:** Integration tests pass

**Success Metrics:**
- Post creation time: <500ms
- AVI response time: <5s
- Routing accuracy: 100%
- Error isolation: 100%

---

### 8.4 Phase 4: AVI DM API

- [ ] **AC-4.1:** POST /api/avi/chat accepts valid messages
- [ ] **AC-4.2:** POST /api/avi/chat rejects empty messages (400)
- [ ] **AC-4.3:** POST /api/avi/chat returns response with stats
- [ ] **AC-4.4:** GET /api/avi/status returns current session state
- [ ] **AC-4.5:** DELETE /api/avi/session cleans up session
- [ ] **AC-4.6:** GET /api/avi/metrics returns cost analysis
- [ ] **AC-4.7:** Multiple DM messages reuse same session
- [ ] **AC-4.8:** API errors return proper status codes and messages
- [ ] **AC-4.9:** API documentation complete and accurate
- [ ] **AC-4.10:** Postman/curl examples provided

**Success Metrics:**
- API response time: <2s
- Error handling: 100%
- Documentation: Complete
- Session reuse: 100%

---

### 8.5 Phase 5: Token Optimization

- [ ] **AC-5.1:** System prompt cached after first load
- [ ] **AC-5.2:** maxTokens limit enforced on all requests
- [ ] **AC-5.3:** Token usage tracked per interaction
- [ ] **AC-5.4:** Cumulative token stats accurate
- [ ] **AC-5.5:** Metrics endpoint shows real-time usage
- [ ] **AC-5.6:** Cost calculations accurate ($3/M tokens)
- [ ] **AC-5.7:** Efficiency vs spawn-per-question >90%
- [ ] **AC-5.8:** Usage alerts configured (if >$10/day)
- [ ] **AC-5.9:** Performance benchmarks documented
- [ ] **AC-5.10:** Cost projections validated

**Success Metrics:**
- Token savings: >90%
- Daily cost: <$10 for 100 interactions
- Monitoring: Complete
- Alerts: Configured

---

## 9. TESTING STRATEGY

### 9.1 Unit Testing

#### Unit Test Coverage
- [ ] AVI Session Manager class methods
- [ ] Question detection logic
- [ ] Response extraction
- [ ] Token calculation
- [ ] Cleanup logic
- [ ] Error handling paths

**Target:** >80% code coverage

### 9.2 Integration Testing

#### Integration Test Scenarios
- [ ] End-to-end post creation with AVI response
- [ ] Migration script execution
- [ ] Comment creation with both columns
- [ ] Session lifecycle (init, chat, cleanup)
- [ ] API endpoints (chat, status, reset, metrics)
- [ ] Error scenarios (SDK failure, timeout, etc.)

**Target:** All critical paths covered

### 9.3 Load Testing

#### Load Test Scenarios
- [ ] 100 sequential AVI interactions
- [ ] 10 concurrent API requests
- [ ] Session stability over 24 hours
- [ ] Memory usage monitoring
- [ ] Token usage verification

**Target:** Performance within NFR limits

### 9.4 Manual Testing

#### Manual Test Checklist
- [ ] Create post with question - verify AVI responds
- [ ] Create post with URL - verify link-logger processes
- [ ] Direct message via API - verify session reuse
- [ ] Wait 60 minutes - verify session cleanup
- [ ] Check metrics endpoint - verify accuracy
- [ ] Force reset session - verify recovery
- [ ] Check logs - verify comprehensive logging

**Target:** All user-facing scenarios validated

---

## 10. IMPLEMENTATION ROADMAP

### 10.1 Phase Dependencies

```
Phase 1 (Schema Migration) - MUST COMPLETE FIRST
  ↓
Phase 2 (Session Manager) - Can start after Phase 1
  ↓
Phase 3 (Post Integration) - Requires Phase 2 complete
  ↓
Phase 4 (API Endpoints) - Parallel with Phase 3
  ↓
Phase 5 (Optimization) - Parallel with Phase 4
```

### 10.2 Timeline Estimates

**Phase 1: Comment Schema Migration**
- Duration: 30 minutes
- Blockers: None
- Risk: Low
- Priority: P0 CRITICAL

**Phase 2: AVI Session Manager**
- Duration: 4 hours
- Blockers: Phase 1 complete
- Risk: Medium
- Priority: P0

**Phase 3: Post Integration**
- Duration: 2 hours
- Blockers: Phase 2 complete
- Risk: Medium
- Priority: P0

**Phase 4: AVI DM API**
- Duration: 2 hours
- Blockers: Phase 2 complete (can parallel with Phase 3)
- Risk: Low
- Priority: P1

**Phase 5: Token Optimization**
- Duration: 4 hours
- Blockers: Phase 2 complete (can parallel with Phase 3 & 4)
- Risk: Low
- Priority: P1

**Total Time: 1 day (with parallelization)**

### 10.3 Success Criteria

**Project Complete When:**
- [ ] All P0 phases complete and tested
- [ ] All acceptance criteria met
- [ ] Token savings >90% validated
- [ ] Daily cost <$10 for typical usage
- [ ] No regressions in existing functionality
- [ ] Documentation complete
- [ ] Stakeholder approval

---

## 11. ROLLBACK PLAN

### 11.1 Phase 1 Rollback (Migration)

**If migration fails:**
1. Restore database from backup
2. Verify data integrity
3. Investigate failure cause
4. Fix migration script
5. Re-test on development DB
6. Retry migration

**Rollback SQL:**
```sql
-- If migration partially complete
ALTER TABLE comments DROP COLUMN author_agent;
-- Restore from backup if data corrupted
```

### 11.2 Phase 2-5 Rollback

**If implementation fails:**
1. Revert code changes via git
2. Restart server
3. Verify existing functionality works
4. No database changes needed (schema already migrated)

**Git Rollback:**
```bash
git revert <commit-hash>
git push origin v1
```

### 11.3 Emergency Rollback

**Complete system rollback:**
1. Stop server
2. Restore database from backup
3. Git revert all changes
4. Restart server
5. Verify basic functionality
6. Notify stakeholders

---

## 12. MONITORING AND OBSERVABILITY

### 12.1 Metrics to Monitor

**Session Metrics:**
- Active session count (should be 0 or 1)
- Session uptime
- Idle time
- Interactions per session

**Performance Metrics:**
- Response time (p50, p95, p99)
- Token usage per interaction
- Cumulative token usage
- Cost per day

**Error Metrics:**
- SDK errors
- Session failures
- Migration errors
- API errors

### 12.2 Logging Requirements

**Info Level:**
- Session initialization
- Session cleanup
- AVI interactions
- Token usage

**Warn Level:**
- High token usage
- Approaching cost limits
- Idle timeout approaching

**Error Level:**
- SDK failures
- Session errors
- Migration failures
- API errors

**Log Format:**
```javascript
console.log(`[AVI] ${timestamp} ${level} ${message}`, { context });
```

### 12.3 Alerting

**Critical Alerts:**
- Migration failure
- SDK unavailable
- Daily cost >$15

**Warning Alerts:**
- Token usage >25K per interaction
- Session errors >5/hour
- Daily cost >$10

---

## APPENDIX A: API REFERENCE

See Section FR-2.4 for complete API specifications.

**Endpoints:**
- POST /api/avi/chat - Direct messaging
- GET /api/avi/status - Session status
- DELETE /api/avi/session - Force cleanup
- GET /api/avi/metrics - Usage metrics

---

## APPENDIX B: DATABASE SCHEMA

**Comments Table (Enhanced):**
```sql
CREATE TABLE comments (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL,
    content TEXT NOT NULL,
    author TEXT NOT NULL,              -- Legacy column
    author_agent TEXT,                 -- New column for agent attribution
    parent_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    likes INTEGER DEFAULT 0,
    mentioned_users TEXT DEFAULT '[]',
    FOREIGN KEY (post_id) REFERENCES agent_posts(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
);
```

---

## APPENDIX C: CONFIGURATION

**Session Manager Config:**
```javascript
{
  idleTimeout: 60 * 60 * 1000,    // 60 minutes
  maxTokens: 2000,                // Response limit
  temperature: 0.7,               // Claude temperature
  systemPromptPath: '/workspaces/agent-feed/prod/.claude/CLAUDE.md',
  workingDirectory: '/workspaces/agent-feed/prod/agent_workspace/',
  apiBaseUrl: 'http://localhost:3001'
}
```

---

## DOCUMENT CONTROL

**Version:** 1.0
**Author:** SPARC Specification Agent
**Reviewed By:** [Pending]
**Approved By:** [Pending]
**Last Updated:** 2025-10-24

**Change Log:**
- 2025-10-24: Initial specification created

**Next Phase:** Pseudocode (P) - Detailed algorithm design
