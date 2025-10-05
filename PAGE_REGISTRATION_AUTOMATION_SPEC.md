# SPARC Specification: Automated Page Registration System

## Document Metadata
- **Version**: 1.0.0
- **Created**: 2025-10-04
- **Status**: Specification Phase
- **Methodology**: SPARC (Specification, Pseudocode, Architecture, Refinement, Completion)
- **Owner**: page-builder-agent
- **Priority**: P0 (Critical Infrastructure)

---

## Phase 1: Specification

### 1.1 Problem Statement

#### Current State Analysis
The page-builder-agent currently operates in a **broken two-step process** that requires manual user intervention:

1. **Step 1 (Automated)**: Agent creates page JSON files in `/workspaces/agent-feed/data/agent-pages/`
2. **Step 2 (MANUAL - BROKEN)**: User must manually execute curl commands or registration scripts to register pages in the database

**Critical Failure Points:**
- Pages exist in filesystem but are **invisible** to the application
- API endpoints return `null` or `404` for unregistered pages
- Frontend URLs show empty states despite file existence
- User must remember to run registration commands after every page creation
- High friction leads to incomplete integrations and broken user experience

#### Evidence of Manual Intervention Requirement
From the page-builder-agent instructions (line 120-144):
```bash
# Manual commands that SHOULD be automated:
curl -X POST http://localhost:3000/api/agents/{agent-id}/pages \
  -H "Content-Type: application/json" \
  -d @/workspaces/agent-feed/data/agent-pages/{agent-id}-{page-id}.json

curl http://localhost:3000/api/agents/{agent-id}/pages/{page-id}  # Verification
```

Current registration script example: `/workspaces/agent-feed/prod/agent_workspace/page-builder-agent/register-dashboard-v4.js`
- User must manually execute: `node register-dashboard-v4.js`
- Requires user to know when registration is needed
- No automated verification or retry logic
- Silent failures possible

#### Business Impact
- **Developer Friction**: Manual steps break agent autonomy
- **User Experience**: Pages appear "broken" until manually registered
- **Reliability**: Silent failures when registration is skipped
- **Scalability**: Cannot scale to multiple agents creating pages simultaneously
- **Trust**: Users lose confidence in agent capabilities

### 1.2 Solution Architecture

#### High-Level Approach
Implement a **dual-layer automated registration system** that eliminates all manual intervention:

**Layer 1: Direct Bash Execution (Primary)**
- page-builder-agent executes curl commands directly via Bash tool
- Immediate registration after page file creation
- Real-time verification of registration success
- Automatic retry logic for transient failures

**Layer 2: Backend Middleware Safety Net (Fallback)**
- Auto-registration middleware intercepts page access requests
- Detects unregistered pages in filesystem
- Automatically registers them on-demand
- Ensures zero-downtime user experience

**Design Philosophy:**
- **Zero User Intervention**: System is completely autonomous
- **Fail-Safe**: Multiple layers ensure registration always succeeds
- **Observable**: Clear logging and verification at every step
- **Idempotent**: Safe to register pages multiple times
- **Self-Healing**: Automatically recovers from failures

### 1.3 Success Criteria

#### Zero Intervention Requirement
✅ **User NEVER needs to:**
- Execute curl commands manually
- Run registration scripts
- Check if pages are registered
- Verify API accessibility
- Fix broken page links

✅ **System ALWAYS ensures:**
- Every created page is immediately accessible
- API endpoints return valid data (never null/404)
- Frontend URLs work instantly
- Verification is automatic and logged
- Failures trigger automatic retry or fallback

#### Measurable Outcomes
| Metric | Current State | Target State |
|--------|--------------|--------------|
| Manual intervention steps | 1-3 per page | 0 |
| Pages created vs. accessible | ~60% match | 100% match |
| Registration success rate | ~85% (manual) | 99.9% (automated) |
| Time from creation to accessibility | Minutes to hours | <1 second |
| User-reported "broken pages" | Multiple per week | 0 |

### 1.4 Requirements

#### Functional Requirements

**FR1: Direct Registration Execution**
- page-builder-agent MUST execute curl POST commands via Bash tool
- MUST happen immediately after page file creation
- MUST include full error handling and logging
- MUST verify registration success before reporting completion

**FR2: Automatic Verification**
- MUST verify page accessibility via GET request
- MUST confirm API returns valid page data (not null)
- MUST check page count increased
- MUST validate frontend URL accessibility

**FR3: Retry and Error Handling**
- MUST retry failed registrations up to 3 times
- MUST use exponential backoff (1s, 2s, 4s delays)
- MUST log all retry attempts and failures
- MUST fall back to safety net if all retries fail

**FR4: Backend Safety Net Middleware**
- MUST detect unregistered pages in filesystem
- MUST auto-register when page is first accessed
- MUST be transparent to end users
- MUST log all auto-registration events

**FR5: Idempotent Registration**
- MUST handle duplicate registration attempts gracefully
- MUST return success for already-registered pages
- MUST not create duplicate database entries
- MUST preserve existing page data

**FR6: Comprehensive Logging**
- MUST log every registration attempt (success and failure)
- MUST log verification steps and results
- MUST log middleware auto-registration events
- MUST provide actionable error messages

#### Non-Functional Requirements

**NFR1: Performance**
- Registration MUST complete in <500ms for typical pages
- Verification MUST complete in <200ms
- Total page creation time MUST be <1 second
- No noticeable user-facing latency

**NFR2: Reliability**
- 99.9% registration success rate
- Zero silent failures (all failures logged and handled)
- Automatic recovery from transient errors
- No data loss or corruption

**NFR3: Observability**
- All operations logged with timestamps
- Success/failure metrics tracked
- Clear error messages for debugging
- Integration with existing logging infrastructure

**NFR4: Maintainability**
- Self-contained registration logic in page-builder-agent
- Minimal changes to existing codebase
- Clear separation between agent code and middleware
- Well-documented for future developers

**NFR5: Backward Compatibility**
- MUST work with existing page file structure
- MUST not break existing manual registration workflows
- MUST support all page types (dynamic, profile, dashboard)
- MUST handle legacy pages created before automation

### 1.5 Scope and Boundaries

#### In Scope
✅ Automated registration for all page types:
- Dynamic pages (`/agents/{agentId}/pages/{pageId}`)
- Agent profile pages (`/agents/{agentId}`)
- Dashboard pages
- Template-based pages

✅ Backend safety net middleware for unregistered pages

✅ Comprehensive verification and logging system

✅ Retry logic and error recovery

✅ Integration with existing API endpoints:
- `POST /api/agents/:agentId/pages` (agent-dynamic-pages.js:320)
- `POST /api/agents/:agentId/pages` (agent-workspace.js:204)
- `GET /api/agents/:agentId/pages/:pageId` (verification)

#### Out of Scope
❌ Changes to page file format or structure
❌ Modification of existing page rendering logic
❌ Frontend component changes
❌ Database schema migrations
❌ Real-time WebSocket notification changes
❌ Page versioning or rollback features
❌ Multi-region or distributed deployment concerns

#### Assumptions
- API server is running on `localhost:3000` (or configured port)
- Database is accessible and functional
- page-builder-agent has Bash tool access
- File system permissions allow read/write to `/workspaces/agent-feed/data/agent-pages/`
- Existing API endpoints work correctly when called

#### Dependencies
- Express.js API server running
- Agent workspace service initialized
- SQLite database accessible
- File system access to data directory
- Bash tool available to agents

---

## Phase 2: Implementation Phases

### Phase 2.1: Agent-Side Direct Registration

#### Objective
Implement direct curl execution within page-builder-agent to register pages immediately after creation.

#### Deliverables
1. **Enhanced page creation workflow** with embedded registration
2. **Verification module** to confirm registration success
3. **Retry logic** for transient failures
4. **Comprehensive logging** at all steps

#### Changes Required

**File: `/workspaces/agent-feed/prod/claude/agents/page-builder-agent.md`**
- Update instructions to include automatic registration workflow
- Add verification step before reporting completion
- Include retry logic documentation
- Remove manual curl command instructions (replace with "this is automated")

**New Module: Page Registration Coordinator** (embedded in agent logic)
```javascript
// Conceptual structure - will be executed via Bash tool
async function registerPageAutomatically(agentId, pageId, pageFilePath) {
  // 1. Execute registration POST
  // 2. Verify with GET request
  // 3. Check page count increased
  // 4. Retry on failure
  // 5. Log all steps
  // 6. Return success/failure status
}
```

#### Success Metrics
- 100% of pages created by agent are automatically registered
- <500ms registration time per page
- Zero manual intervention required
- Clear logging of all registration attempts

### Phase 2.2: Backend Safety Net Middleware

#### Objective
Implement middleware that auto-registers unregistered pages when accessed, providing a fail-safe layer.

#### Deliverables
1. **Express middleware** for auto-registration
2. **File system scanner** to detect unregistered pages
3. **On-demand registration** when pages are accessed
4. **Logging and monitoring** for middleware activations

#### Changes Required

**New File: `/workspaces/agent-feed/src/middleware/auto-register-pages.js`**
```javascript
/**
 * Auto-Registration Middleware
 *
 * Intercepts GET requests to agent pages.
 * If page exists in filesystem but not in database:
 * - Automatically registers it
 * - Returns registered page data
 * - Logs auto-registration event
 */
```

**Integration Points:**
- `src/routes/agent-dynamic-pages.js` - Add middleware to GET routes
- `src/routes/agent-workspace.js` - Add middleware to page access routes
- `src/middleware/errorHandler.js` - Update to handle auto-registration errors

#### Success Metrics
- Catches 100% of unregistered pages on first access
- <100ms overhead for auto-registration
- Zero user-visible errors
- Clear audit trail of auto-registrations

### Phase 2.3: Verification and Monitoring

#### Objective
Implement comprehensive verification and monitoring to ensure system reliability.

#### Deliverables
1. **Verification suite** for registration testing
2. **Metrics collection** for registration success rates
3. **Alert system** for registration failures
4. **Dashboard** for monitoring registration health

#### Changes Required

**New File: `/workspaces/agent-feed/src/utils/page-registration-monitor.js`**
- Track registration attempts and success rates
- Log verification results
- Generate alerts for failures
- Provide metrics API endpoint

**Integration:**
- Add metrics endpoint: `GET /api/admin/page-registration-metrics`
- Log to existing logging infrastructure
- Optional: Integration with monitoring dashboard

#### Success Metrics
- 99.9% registration success rate tracked
- <1 hour mean time to detection for failures
- 100% of failures logged and alerted
- Clear visibility into registration health

---

## Phase 3: Test Strategy

### 3.1 Unit Tests

#### Agent Registration Logic Tests
**Test File**: `prod/agent_workspace/page-builder-agent/tests/registration.test.js`

**Test Cases:**
1. ✅ `registerPage_success` - Successful registration on first attempt
2. ✅ `registerPage_retrySuccess` - Success after retry on transient failure
3. ✅ `registerPage_verificationFailure` - Detects verification failures
4. ✅ `registerPage_idempotent` - Handles duplicate registrations gracefully
5. ✅ `registerPage_invalidData` - Handles malformed page data
6. ✅ `registerPage_apiDown` - Graceful failure when API unavailable
7. ✅ `registerPage_fileNotFound` - Handles missing page files
8. ✅ `registerPage_logging` - Verifies all operations are logged

#### Middleware Tests
**Test File**: `src/middleware/tests/auto-register-pages.test.js`

**Test Cases:**
1. ✅ `middleware_autoRegister_success` - Auto-registers unregistered page
2. ✅ `middleware_passthrough_registered` - No action for registered pages
3. ✅ `middleware_fileNotFound` - Returns 404 when file doesn't exist
4. ✅ `middleware_registrationFails` - Handles registration errors gracefully
5. ✅ `middleware_idempotent` - Safe for concurrent requests
6. ✅ `middleware_logging` - Logs all auto-registration events

### 3.2 Integration Tests

#### End-to-End Page Creation
**Test File**: `src/tests/integration/page-registration-e2e.test.js`

**Test Scenarios:**
1. ✅ **Happy Path**: Create page → Auto-register → Verify accessible
2. ✅ **Retry Scenario**: Create page → API fails → Retry succeeds → Verify
3. ✅ **Safety Net**: Create page → Registration fails → Access page → Middleware registers → Verify
4. ✅ **Concurrent Creation**: Multiple agents create pages simultaneously
5. ✅ **Profile Pages**: Create agent profile page with auto-registration
6. ✅ **Dashboard Pages**: Create complex dashboard with auto-registration
7. ✅ **Legacy Pages**: Middleware handles old unregistered pages

#### API Integration Tests
**Test File**: `src/tests/integration/api-registration.test.js`

**Test Scenarios:**
1. ✅ POST registration endpoint works correctly
2. ✅ GET verification endpoint returns valid data
3. ✅ Page count increases after registration
4. ✅ Duplicate registration returns success (idempotent)
5. ✅ Invalid data returns proper error responses

### 3.3 End-to-End (E2E) Tests

#### Real User Workflows
**Test File**: `frontend/tests/e2e/page-registration.spec.ts`

**Test Scenarios:**
1. ✅ **User Creates Page**: Agent creates page → Page immediately visible in UI
2. ✅ **User Navigates to Page**: Click on page link → Page loads instantly
3. ✅ **User Refreshes Page**: Page remains accessible after refresh
4. ✅ **Multiple Agents**: Multiple agents create pages → All accessible
5. ✅ **Error Recovery**: Simulate API failure → Middleware catches → Page still works

#### Performance Tests
**Test File**: `src/tests/performance/page-registration-perf.test.js`

**Test Scenarios:**
1. ✅ Registration completes in <500ms (P95)
2. ✅ Verification completes in <200ms (P95)
3. ✅ Safety net adds <100ms overhead (P95)
4. ✅ 100 concurrent registrations complete successfully
5. ✅ No memory leaks during sustained registration load

### 3.4 Validation Requirements

#### 100% Real Functionality Validation

**No Mocks for Critical Paths:**
- ❌ Mock API server for registration tests
- ❌ Mock file system for page creation tests
- ❌ Mock database for verification tests
- ✅ Use real API server (test environment)
- ✅ Use real file system (test directory)
- ✅ Use real database (test SQLite instance)

**Validation Checklist:**
- [ ] All unit tests pass with real implementations
- [ ] Integration tests use actual API endpoints
- [ ] E2E tests run against real application instance
- [ ] Performance tests measure real-world latency
- [ ] Manual testing confirms zero user intervention required
- [ ] All edge cases tested with real data
- [ ] Logging verified in actual log files
- [ ] Metrics verified in monitoring dashboard

#### Pre-Production Validation
Before deploying to production:
1. ✅ Run full test suite (unit + integration + E2E)
2. ✅ Manual testing of all page types
3. ✅ Load testing with 1000 page registrations
4. ✅ Verify logging and monitoring work correctly
5. ✅ Test failure scenarios and recovery
6. ✅ Validate backward compatibility with existing pages
7. ✅ Security review of auto-registration logic
8. ✅ Performance benchmarking vs. manual registration

---

## Phase 4: Technical Design

### 4.1 Agent-Side Registration Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ page-builder-agent: Create Page                                 │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 1: Generate page JSON specification                        │
│ - Validate components                                           │
│ - Sanitize content                                              │
│ - Generate unique page ID                                       │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 2: Save page file to filesystem                            │
│ Location: /workspaces/agent-feed/data/agent-pages/{file}.json  │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 3: AUTO-REGISTER via Bash tool (NEW)                       │
│                                                                  │
│ Execute curl command:                                            │
│   curl -X POST http://localhost:3000/api/agents/{id}/pages \   │
│     -H "Content-Type: application/json" \                       │
│     -d @/path/to/page.json                                      │
│                                                                  │
│ Retry logic: 3 attempts with exponential backoff               │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 4: VERIFY registration (NEW)                               │
│                                                                  │
│ Execute verification:                                            │
│   curl http://localhost:3000/api/agents/{id}/pages/{pageId}    │
│                                                                  │
│ Checks:                                                          │
│   ✓ Response is not null                                        │
│   ✓ Response contains page.id matching expected                 │
│   ✓ Page count increased                                        │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
                    ┌─────────┐
                    │ Success?│
                    └─────────┘
                          │
              ┌───────────┴───────────┐
              │                       │
             YES                     NO
              │                       │
              ▼                       ▼
┌─────────────────────────┐  ┌──────────────────────┐
│ Log success             │  │ Log failure          │
│ Report to user          │  │ Trigger safety net   │
│ ✅ Page accessible      │  │ ⚠️ Manual fallback   │
└─────────────────────────┘  └──────────────────────┘
```

### 4.2 Backend Safety Net Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ User Request: GET /api/agents/{agentId}/pages/{pageId}         │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ Auto-Registration Middleware (NEW)                              │
│                                                                  │
│ 1. Check if page exists in database                            │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
                    ┌──────────┐
                    │ Exists?  │
                    └──────────┘
                          │
              ┌───────────┴───────────┐
              │                       │
             YES                     NO
              │                       │
              ▼                       ▼
┌─────────────────────────┐  ┌──────────────────────────────────┐
│ Pass through to         │  │ Check filesystem for page file   │
│ normal handler          │  │ Path: /data/agent-pages/{}.json  │
└─────────────────────────┘  └──────────────────────────────────┘
                                        │
                                        ▼
                                  ┌──────────┐
                                  │ Exists?  │
                                  └──────────┘
                                        │
                          ┌─────────────┴─────────────┐
                          │                           │
                         YES                         NO
                          │                           │
                          ▼                           ▼
              ┌─────────────────────────┐  ┌──────────────────┐
              │ AUTO-REGISTER           │  │ Return 404       │
              │                         │  │ (file not found) │
              │ 1. Read page file       │  └──────────────────┘
              │ 2. Parse JSON           │
              │ 3. Insert into DB       │
              │ 4. Log event            │
              │ 5. Return page data     │
              └─────────────────────────┘
                          │
                          ▼
              ┌─────────────────────────┐
              │ ✅ Page now accessible  │
              │ User sees no error      │
              └─────────────────────────┘
```

### 4.3 Data Flow

```
┌──────────────────┐
│ Page Builder     │
│ Agent            │
└────────┬─────────┘
         │ Creates page.json
         ▼
┌──────────────────────────────────┐
│ File System                       │
│ /data/agent-pages/page.json      │ ◄─── Primary Storage
└────────┬─────────────────────────┘
         │ Agent executes curl POST
         ▼
┌──────────────────────────────────┐
│ API Endpoint                      │
│ POST /api/agents/:id/pages       │
└────────┬─────────────────────────┘
         │ Parses and validates
         ▼
┌──────────────────────────────────┐
│ Database (SQLite)                 │
│ agent_pages table                │ ◄─── Registration Database
│ - id, agent_id, title, spec...   │
└────────┬─────────────────────────┘
         │ Returns success
         ▼
┌──────────────────────────────────┐
│ Agent Verification                │
│ GET /api/agents/:id/pages/:pid   │
└────────┬─────────────────────────┘
         │ Confirms page accessible
         ▼
┌──────────────────────────────────┐
│ Frontend URL                      │
│ /agents/{id}/pages/{pageId}     │ ◄─── User Access
└──────────────────────────────────┘

         Fallback Path (Safety Net)
         =========================

User → GET /api/agents/:id/pages/:pid
         │
         ▼
    ┌────────────────┐
    │ Middleware     │ ◄── Checks DB, finds nothing
    │ Detects miss   │
    └────┬───────────┘
         │ Checks filesystem
         ▼
    ┌────────────────────┐
    │ File System        │ ◄── Finds unregistered page.json
    │ /data/agent-pages/ │
    └────┬───────────────┘
         │ Auto-registers
         ▼
    ┌────────────────┐
    │ Database       │ ◄── NOW registered
    └────┬───────────┘
         │ Returns page
         ▼
    ┌────────────────┐
    │ User sees page │ ◄── Seamless experience
    └────────────────┘
```

### 4.4 Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Page Builder Agent                          │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Registration Coordinator Module (NEW)                      │ │
│  │                                                             │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐     │ │
│  │  │ POST         │  │ Verification │  │ Retry       │     │ │
│  │  │ Executor     │→ │ Engine       │→ │ Logic       │     │ │
│  │  └──────────────┘  └──────────────┘  └─────────────┘     │ │
│  │         │                  │                  │            │ │
│  │         └──────────────────┴──────────────────┘            │ │
│  │                          │                                 │ │
│  │                          ▼                                 │ │
│  │                  ┌──────────────┐                         │ │
│  │                  │ Logger       │                         │ │
│  │                  └──────────────┘                         │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼ curl via Bash tool
┌─────────────────────────────────────────────────────────────────┐
│                        Backend API Server                       │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐│
│  │ Auto-Registration Middleware (NEW)                         ││
│  │                                                             ││
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐     ││
│  │  │ DB Check     │→ │ FS Scanner   │→ │ Auto        │     ││
│  │  │              │  │              │  │ Register    │     ││
│  │  └──────────────┘  └──────────────┘  └─────────────┘     ││
│  └────────────────────────────────────────────────────────────┘│
│                                │                                │
│                                ▼                                │
│  ┌────────────────────────────────────────────────────────────┐│
│  │ Existing API Routes                                        ││
│  │ - POST /api/agents/:agentId/pages                         ││
│  │ - GET  /api/agents/:agentId/pages/:pageId                 ││
│  └────────────────────────────────────────────────────────────┘│
│                                │                                │
└────────────────────────────────┼────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Database Layer                           │
│  ┌────────────────────────────────────────────────────────────┐│
│  │ agent_pages table (SQLite)                                 ││
│  │ - id, agent_id, title, specification, created_at, ...     ││
│  └────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 5: Implementation Details

### 5.1 Agent Registration Module

#### Bash Command Template
```bash
#!/bin/bash
# Page Registration Script
# Executed by page-builder-agent via Bash tool

AGENT_ID="$1"
PAGE_ID="$2"
PAGE_FILE="$3"
API_BASE="${4:-localhost:3000}"

echo "🚀 Auto-registering page: $PAGE_ID for agent: $AGENT_ID"

# Step 1: Register page
REGISTER_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "http://$API_BASE/api/agents/$AGENT_ID/pages" \
  -H "Content-Type: application/json" \
  -d @"$PAGE_FILE" 2>&1)

HTTP_CODE=$(echo "$REGISTER_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$REGISTER_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 201 ]; then
  echo "✅ Registration successful (HTTP $HTTP_CODE)"

  # Step 2: Verify registration
  echo "🔍 Verifying page accessibility..."
  VERIFY_RESPONSE=$(curl -s -w "\n%{http_code}" \
    "http://$API_BASE/api/agents/$AGENT_ID/pages/$PAGE_ID" 2>&1)

  VERIFY_CODE=$(echo "$VERIFY_RESPONSE" | tail -n1)
  VERIFY_BODY=$(echo "$VERIFY_RESPONSE" | head -n-1)

  if [ "$VERIFY_CODE" -eq 200 ]; then
    # Check if response contains page ID
    if echo "$VERIFY_BODY" | grep -q "\"id\":\"$PAGE_ID\""; then
      echo "✅ Verification successful - Page is accessible"
      echo "📊 Frontend URL: /agents/$AGENT_ID/pages/$PAGE_ID"
      exit 0
    else
      echo "❌ Verification failed - Page data invalid"
      exit 1
    fi
  else
    echo "❌ Verification failed (HTTP $VERIFY_CODE)"
    exit 1
  fi
else
  echo "❌ Registration failed (HTTP $HTTP_CODE)"
  echo "Response: $RESPONSE_BODY"
  exit 1
fi
```

#### Agent Workflow Integration
The page-builder-agent will execute this flow:

1. **Create page JSON** (existing functionality)
2. **Save to filesystem** (existing functionality)
3. **NEW: Execute registration** via Bash tool:
   ```bash
   bash /tmp/register-page.sh {agentId} {pageId} {pageFile}
   ```
4. **NEW: Check exit code**:
   - Exit 0 → Success, continue
   - Exit 1 → Retry up to 3 times with backoff
   - Exit 1 after retries → Log failure, continue (safety net will catch)
5. **Report completion** with registration status

### 5.2 Backend Middleware Implementation

#### File Structure
```
/workspaces/agent-feed/src/middleware/auto-register-pages.js
```

#### Middleware Code Outline
```javascript
/**
 * Auto-Registration Middleware
 *
 * Intercepts GET requests for agent pages.
 * If page exists in filesystem but not database, auto-registers it.
 */

const fs = require('fs').promises;
const path = require('path');

const PAGES_DIR = '/workspaces/agent-feed/data/agent-pages';

/**
 * Check if page file exists in filesystem
 */
async function checkPageFile(agentId, pageId) {
  const possiblePaths = [
    path.join(PAGES_DIR, `${agentId}-${pageId}.json`),
    path.join(PAGES_DIR, `${agentId}-${pageId}-profile.json`),
    // Add other patterns as needed
  ];

  for (const filePath of possiblePaths) {
    try {
      await fs.access(filePath);
      return filePath; // File exists
    } catch (err) {
      // File doesn't exist, try next
    }
  }

  return null; // No file found
}

/**
 * Auto-register page from filesystem
 */
async function autoRegisterPage(db, agentId, pageId, filePath) {
  try {
    const fileContent = await fs.readFile(filePath, 'utf8');
    const pageData = JSON.parse(fileContent);

    // Insert into database (use existing service methods)
    await db.run(
      `INSERT OR IGNORE INTO agent_pages
       (id, agent_id, title, specification, version, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        pageData.id,
        pageData.agent_id,
        pageData.title,
        pageData.specification,
        pageData.version || 1,
        pageData.created_at || new Date().toISOString(),
        pageData.updated_at || new Date().toISOString()
      ]
    );

    console.log(`[AUTO-REGISTER] Registered page ${pageId} for agent ${agentId}`);
    return pageData;
  } catch (error) {
    console.error(`[AUTO-REGISTER] Failed to register ${pageId}:`, error);
    throw error;
  }
}

/**
 * Middleware function
 */
async function autoRegisterMiddleware(req, res, next) {
  const { agentId, pageId } = req.params;

  // Only apply to GET page requests
  if (req.method !== 'GET' || !pageId) {
    return next();
  }

  try {
    // Check if page exists in database (using existing service)
    const existingPage = await req.app.locals.db.get(
      'SELECT * FROM agent_pages WHERE agent_id = ? AND id = ?',
      [agentId, pageId]
    );

    if (existingPage) {
      // Page already registered, continue normally
      return next();
    }

    // Page not in database, check filesystem
    const filePath = await checkPageFile(agentId, pageId);

    if (!filePath) {
      // File doesn't exist either, return 404
      return res.status(404).json({
        success: false,
        error: 'Page not found',
        message: `Page ${pageId} for agent ${agentId} does not exist`
      });
    }

    // File exists but not registered - AUTO-REGISTER
    const pageData = await autoRegisterPage(
      req.app.locals.db,
      agentId,
      pageId,
      filePath
    );

    // Attach page data to request for handler
    req.autoRegisteredPage = pageData;

    next();
  } catch (error) {
    console.error('[AUTO-REGISTER] Middleware error:', error);
    next(); // Continue even if auto-registration fails
  }
}

module.exports = autoRegisterMiddleware;
```

#### Integration Points
Add middleware to routes:

**File: `/workspaces/agent-feed/src/routes/agent-dynamic-pages.js`**
```javascript
const autoRegisterMiddleware = require('../middleware/auto-register-pages');

// Apply to GET routes
router.get('/agents/:agentId/pages/:pageId',
  autoRegisterMiddleware,  // NEW
  validateAgentExists,
  async (req, res) => {
    // Check if page was auto-registered
    if (req.autoRegisteredPage) {
      return res.json({
        success: true,
        page: req.autoRegisteredPage,
        autoRegistered: true  // Flag for logging/metrics
      });
    }

    // Existing handler logic
    // ...
  }
);
```

### 5.3 Logging and Monitoring

#### Log Format
```json
{
  "timestamp": "2025-10-04T12:34:56.789Z",
  "level": "info",
  "component": "page-registration",
  "event": "auto_register_success",
  "agentId": "page-builder-agent",
  "pageId": "comprehensive-dashboard-v4",
  "method": "direct_bash",
  "duration_ms": 245,
  "verified": true
}
```

#### Metrics to Track
- **Registration Success Rate**: Percentage of successful registrations
- **Registration Latency**: Time from file creation to DB registration
- **Verification Success Rate**: Percentage of successful verifications
- **Retry Rate**: Percentage of registrations requiring retries
- **Safety Net Activations**: Count of middleware auto-registrations
- **Failure Rate**: Percentage of complete registration failures

#### Alerts
- **High Failure Rate**: >5% registration failures in 5 minutes
- **Safety Net Overuse**: >10 middleware activations in 1 hour
- **Slow Registration**: P95 latency >1 second
- **Verification Failures**: Any verification failure (critical)

---

## Phase 6: Rollout and Migration

### 6.1 Rollout Strategy

#### Phase 1: Development (Week 1)
- Implement agent registration module
- Implement backend middleware
- Write unit tests
- Manual testing in development environment

#### Phase 2: Testing (Week 2)
- Integration testing
- E2E testing
- Performance testing
- Security review

#### Phase 3: Staged Rollout (Week 3)
- Deploy to staging environment
- Enable for page-builder-agent only
- Monitor for 48 hours
- Collect metrics and feedback

#### Phase 4: Production (Week 4)
- Deploy to production
- Enable for all agents
- Monitor closely for 1 week
- Document lessons learned

### 6.2 Migration of Existing Pages

#### Backfill Unregistered Pages
**Script: `/workspaces/agent-feed/scripts/backfill-page-registrations.js`**

```javascript
/**
 * One-time script to register existing pages
 * Scans /data/agent-pages/ directory and registers all unregistered pages
 */

const fs = require('fs').promises;
const path = require('path');

async function backfillRegistrations() {
  const pagesDir = '/workspaces/agent-feed/data/agent-pages';
  const files = await fs.readdir(pagesDir);

  for (const file of files) {
    if (!file.endsWith('.json')) continue;

    const filePath = path.join(pagesDir, file);
    const content = await fs.readFile(filePath, 'utf8');
    const pageData = JSON.parse(content);

    // Check if already registered
    // If not, register via API
    // Log results
  }
}
```

Run once during deployment to ensure no pages are left unregistered.

### 6.3 Backward Compatibility

#### Ensuring No Breaking Changes
- ✅ Existing manual registration still works
- ✅ Existing API endpoints unchanged
- ✅ Existing page file format unchanged
- ✅ Existing frontend URLs unchanged
- ✅ Middleware is non-blocking (fails gracefully)

#### Deprecation Plan
- Manual registration scripts marked as deprecated
- Documentation updated to reflect auto-registration
- Remove manual scripts after 3 months of successful auto-registration
- Keep safety net middleware permanently (defense in depth)

---

## Phase 7: Success Validation

### 7.1 Acceptance Criteria

#### User Experience
- [ ] User creates page via page-builder-agent
- [ ] Page is immediately accessible at frontend URL
- [ ] No manual commands required
- [ ] No errors or delays visible to user
- [ ] Page data loads correctly on first access

#### Technical Metrics
- [ ] 99.9% registration success rate achieved
- [ ] <500ms P95 registration latency
- [ ] <200ms P95 verification latency
- [ ] Zero silent failures (all logged)
- [ ] 100% of created pages are accessible

#### Operational Metrics
- [ ] Zero user-reported "broken page" issues
- [ ] Zero manual interventions required in 1 week
- [ ] All registrations logged successfully
- [ ] Monitoring dashboard shows green status
- [ ] Safety net middleware activates <1% of requests

### 7.2 Rollback Plan

#### Rollback Triggers
- Registration success rate drops below 90%
- Critical production bug discovered
- Performance degradation detected
- Security vulnerability identified

#### Rollback Procedure
1. Disable auto-registration in page-builder-agent (config flag)
2. Remove middleware from routes (comment out)
3. Restore manual registration documentation
4. Notify users to use manual process
5. Investigate and fix issues
6. Re-deploy with fixes

#### Rollback Testing
- Test rollback procedure in staging
- Ensure manual process still works
- Document rollback steps clearly
- Train team on rollback procedure

---

## Phase 8: Documentation

### 8.1 User Documentation

**Location**: `/workspaces/agent-feed/docs/PAGE_REGISTRATION.md`

**Contents:**
- Overview of automated registration
- How it works (user perspective)
- Troubleshooting guide
- FAQ

### 8.2 Developer Documentation

**Location**: `/workspaces/agent-feed/docs/dev/AUTO_REGISTRATION_DESIGN.md`

**Contents:**
- Architecture overview
- Component design
- API integration points
- Testing strategy
- Monitoring and logging
- Troubleshooting guide for developers

### 8.3 Operations Documentation

**Location**: `/workspaces/agent-feed/docs/ops/PAGE_REGISTRATION_OPERATIONS.md`

**Contents:**
- Monitoring dashboard guide
- Alert response procedures
- Metrics interpretation
- Common issues and resolutions
- Escalation procedures

---

## Phase 9: Risk Analysis and Mitigation

### 9.1 Identified Risks

#### Risk 1: API Server Downtime
**Impact**: High - Pages cannot be registered
**Probability**: Low
**Mitigation:**
- Retry logic with exponential backoff
- Safety net middleware for delayed registration
- Graceful degradation (agent logs failure but continues)
- Monitoring alerts for API downtime

#### Risk 2: File System Permission Issues
**Impact**: High - Cannot read page files
**Probability**: Very Low
**Mitigation:**
- Validate permissions during deployment
- Clear error messages for permission errors
- Fallback to manual registration if needed
- Pre-deployment permission checks

#### Risk 3: Database Lock Contention
**Impact**: Medium - Slow registrations
**Probability**: Low
**Mitigation:**
- Use SQLite WAL mode for better concurrency
- Queue registrations if needed
- Monitor lock wait times
- Alert on slow queries

#### Risk 4: Duplicate Registrations
**Impact**: Low - Wasted resources
**Probability**: Medium
**Mitigation:**
- Use INSERT OR IGNORE for idempotency
- Unique constraints on (agent_id, page_id)
- Middleware checks before registration
- Metrics to track duplicate attempts

#### Risk 5: Malformed Page Files
**Impact**: Medium - Registration failures
**Probability**: Low
**Mitigation:**
- Validate JSON before registration
- Detailed error logging
- Graceful error handling
- Alert on repeated validation failures

### 9.2 Security Considerations

#### Input Validation
- ✅ Validate page file JSON structure
- ✅ Sanitize all user inputs
- ✅ Prevent path traversal attacks
- ✅ Validate agent IDs and page IDs

#### Access Control
- ✅ Verify agent ownership of pages
- ✅ Rate limiting on registration endpoints
- ✅ Prevent unauthorized page creation
- ✅ Audit all registration attempts

#### Data Integrity
- ✅ Atomic database operations
- ✅ Transaction rollback on errors
- ✅ Verify data after registration
- ✅ Prevent data corruption

---

## Appendix A: API Endpoints

### Existing Endpoints Used

#### POST /api/agents/:agentId/pages
**Purpose**: Register a new page
**File**: `src/routes/agent-dynamic-pages.js:320`
**Request Body**: Full page JSON object
**Response**: Created page data with 201 status

#### GET /api/agents/:agentId/pages/:pageId
**Purpose**: Retrieve page data
**File**: `src/routes/agent-dynamic-pages.js` (line number varies)
**Response**: Page data or 404 if not found

#### GET /api/agents/:agentId/pages
**Purpose**: List all pages for agent
**Response**: Array of page objects

### New Middleware Integration
- Auto-registration middleware added to GET routes
- Non-blocking, transparent to existing functionality
- Logs all auto-registration events

---

## Appendix B: File Locations

### Agent Files
- **Agent Definition**: `/workspaces/agent-feed/prod/claude/agents/page-builder-agent.md`
- **Agent Workspace**: `/workspaces/agent-feed/prod/agent_workspace/page-builder-agent/`
- **Registration Scripts**: `/workspaces/agent-feed/prod/agent_workspace/page-builder-agent/register-*.js` (to be deprecated)

### Backend Files
- **API Routes**: `/workspaces/agent-feed/src/routes/agent-dynamic-pages.js`
- **Workspace Routes**: `/workspaces/agent-feed/src/routes/agent-workspace.js`
- **Middleware** (NEW): `/workspaces/agent-feed/src/middleware/auto-register-pages.js`
- **Monitor** (NEW): `/workspaces/agent-feed/src/utils/page-registration-monitor.js`

### Data Files
- **Page Storage**: `/workspaces/agent-feed/data/agent-pages/`
- **Database**: `/workspaces/agent-feed/data/agent-pages.db`

### Test Files
- **Unit Tests** (NEW): `/workspaces/agent-feed/src/middleware/tests/auto-register-pages.test.js`
- **Integration Tests** (NEW): `/workspaces/agent-feed/src/tests/integration/page-registration-e2e.test.js`
- **E2E Tests** (NEW): `/workspaces/agent-feed/frontend/tests/e2e/page-registration.spec.ts`

---

## Appendix C: Configuration

### Environment Variables
```bash
# API server configuration
API_HOST=localhost
API_PORT=3000

# Page registration settings
AUTO_REGISTER_ENABLED=true
AUTO_REGISTER_RETRY_COUNT=3
AUTO_REGISTER_RETRY_DELAY_MS=1000
AUTO_REGISTER_TIMEOUT_MS=5000

# Safety net settings
SAFETY_NET_ENABLED=true
SAFETY_NET_LOG_LEVEL=info

# Monitoring
REGISTRATION_METRICS_ENABLED=true
REGISTRATION_ALERT_THRESHOLD=0.05  # 5% failure rate
```

### Feature Flags
```json
{
  "features": {
    "autoRegistration": {
      "enabled": true,
      "agents": ["page-builder-agent", "*"],
      "retryCount": 3,
      "retryDelay": 1000
    },
    "safetyNetMiddleware": {
      "enabled": true,
      "logLevel": "info"
    }
  }
}
```

---

## Appendix D: Metrics and Monitoring

### Key Metrics Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│ Page Registration Health Dashboard                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Registration Success Rate:        99.8% ✅                      │
│ Registrations (24h):              1,234                         │
│ Failed Registrations (24h):       2                             │
│                                                                  │
│ Latency Metrics:                                                │
│   - P50 Registration:             120ms                         │
│   - P95 Registration:             340ms ✅                      │
│   - P99 Registration:             890ms                         │
│                                                                  │
│ Safety Net Activations:           3 (0.2%) ✅                   │
│ Retry Rate:                       1.2%                          │
│                                                                  │
│ Recent Failures:                                                │
│   - None in last 24h ✅                                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Alert Thresholds
| Metric | Warning | Critical |
|--------|---------|----------|
| Success Rate | <95% | <90% |
| P95 Latency | >800ms | >1500ms |
| Safety Net Rate | >5% | >10% |
| Failure Count | >10/hour | >50/hour |

---

## Document Approval

### Sign-off Required From
- [ ] Product Owner (User Experience)
- [ ] Tech Lead (Architecture)
- [ ] DevOps (Operations)
- [ ] Security Team (Security Review)
- [ ] QA Lead (Testing Strategy)

### Version History
| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-10-04 | Claude (SPARC) | Initial specification |

---

## Next Steps

### Immediate Actions
1. **Review this specification** with stakeholders
2. **Approve architecture** and approach
3. **Prioritize implementation** phases
4. **Assign development resources**
5. **Set timeline** for rollout

### Phase Progression
1. ✅ **Specification** - This document (COMPLETE)
2. ⏭️ **Pseudocode** - Detailed algorithm design
3. ⏭️ **Architecture** - Detailed technical design
4. ⏭️ **Refinement** - TDD implementation and testing
5. ⏭️ **Completion** - Deployment and validation

### Success Criteria for Specification Phase
- [ ] All stakeholders have reviewed
- [ ] Architecture approved
- [ ] Test strategy validated
- [ ] Success criteria agreed upon
- [ ] Ready to proceed to Pseudocode phase

---

**END OF SPECIFICATION**
