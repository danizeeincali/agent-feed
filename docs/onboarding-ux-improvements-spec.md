# SPARC Specification: Onboarding UX Improvements

**Document Version**: 1.0
**Date**: 2025-11-07
**Status**: Specification Phase
**Target Implementation**: v1.1.0

---

## Executive Summary

This SPARC specification addresses three critical user experience issues in the Agent Feed onboarding system:

1. **Name Persistence Gap**: User names collected during onboarding don't persist system-wide
2. **Agent Posting Behavior**: Get-to-know-you agent incorrectly replies in comments instead of creating new posts for topic shifts
3. **Timeout UX**: 120-second timeout provides poor user experience with no graceful degradation

**Impact**: These issues significantly degrade the onboarding experience, causing confusion and frustration during users' first interactions with the system.

**Solution Approach**: Implement database integration for name persistence, clarify agent posting guidelines, and add graceful timeout handling with planning mode fallback.

---

## 1. Problem Analysis

### Issue #1: Name Not Persisting System-Wide

#### Current Behavior
```
User: "my name is Orko"
Agent: (uses "Orko" in posts)
System: Shows "Integration Test User" everywhere else
```

#### Root Cause Analysis

**File**: `/workspaces/agent-feed/api-server/services/onboarding/onboarding-flow-service.js`

**Problem Location** (Lines 139-169):
```javascript
processNameResponse(userId, name) {
  const responses = state.responses || {};

  // ❌ PROBLEM: Only saves to onboarding_state.responses JSON
  responses.name = name;

  this.updateStateStmt.run(
    1, // phase
    'use_case', // step
    null,
    null,
    null,
    null,
    JSON.stringify(responses), // ❌ Only saves here!
    userId
  );
}
```

**Missing Integration**:
- No call to `user-settings-service.js` to save `display_name`
- `user_settings.display_name` remains unset
- System-wide display name defaults to fallback value

**Impact**:
- Onboarding appears successful but name doesn't persist
- User sees generic "Integration Test User" in posts/comments
- Breaks personalization promise made during onboarding
- Degrades trust in system reliability

---

### Issue #2: Agent Should Create New Posts for Topic Shifts

#### Current Behavior
```
User: "my name is Orko"
Agent: Posts as comment: "Welcome, Orko! What brings you to Agent Feed?"
```

#### Expected Behavior
```
User: "my name is Orko"
Agent: Creates NEW POST with title: "Welcome, Orko!" containing "What brings you to Agent Feed?"
```

#### Root Cause Analysis

**File**: `/workspaces/agent-feed/prod/.claude/agents/get-to-know-you-agent.md`

**Problem Location** (Lines 72-91):
- Agent instructions emphasize conversation flow
- No clear guidance on when to create new posts vs comments
- Default behavior favors comments for continuity

**Current Guidance** (Ambiguous):
```markdown
**Step 2: Collect Use Case**
- **Question**: "What brings you to Agent Feed, {name}?"
- **Educate**: After answer, weave in system explanation
```

**Missing Specifications**:
- When to create new post vs comment
- Topic shift detection criteria
- Post vs comment decision matrix

**Impact**:
- Onboarding questions buried in comment threads
- Reduced visibility of agent interactions
- User confusion about agent capabilities
- Less engaging onboarding experience

---

### Issue #3: Better 120s Timeout UX

#### Current Behavior
```
Query runs for 119 seconds...
120 seconds: ❌ Error: "QUERY_TIMEOUT"
User: "What happened? No warning, just stopped."
```

#### Root Cause Analysis

**File**: `/workspaces/agent-feed/api-server/config/streaming-protection.js`

**Current Configuration** (Lines 19-24):
```javascript
timeouts: {
  simple: 60000,    // 1 minute
  complex: 300000,  // 5 minutes
  default: 120000   // 2 minutes ❌ Too aggressive for onboarding
}
```

**File**: `/workspaces/agent-feed/api-server/worker/worker-protection.js`

**Current Timeout Handling** (Lines 69-77):
```javascript
const timeoutPromise = new Promise((_, reject) => {
  timeoutId = setTimeout(() => {
    timedOut = true;
    reject(new Error('QUERY_TIMEOUT')); // ❌ Abrupt termination
  }, timeoutMs);
});
```

**Missing Capabilities**:
- No warning at 80% of timeout (96 seconds)
- No graceful degradation
- No planning mode fallback
- No user choice to continue step-by-step

**Impact**:
- Complex onboarding queries hit timeout
- No partial results returned
- User left with error message
- No recovery path or guidance

---

## 2. Functional Requirements

### FR-1: Persist Display Name to user_settings Table

**Priority**: P0 (Critical)
**Effort**: 2 story points

**Requirement**:
When a user provides their name during onboarding, it MUST be persisted to both:
1. `onboarding_state.responses` JSON (current behavior - keep)
2. `user_settings.display_name` column (NEW - add this)

**Acceptance Criteria**:
- [ ] Name saved to `user_settings.display_name` within same transaction
- [ ] Name appears in all system UI components (posts, comments, profile)
- [ ] Name persists across sessions and browser refreshes
- [ ] Fallback to "User" only when display_name is explicitly NULL
- [ ] API endpoint `/api/user-settings/display-name` called successfully
- [ ] Error handling for failed API calls with retry logic

**Technical Details**:
```javascript
// In onboarding-flow-service.js processNameResponse()
import { createUserSettingsService } from '../user-settings-service.js';

processNameResponse(userId, name) {
  // Existing code...
  responses.name = name;

  // NEW: Save to user_settings
  const userSettings = createUserSettingsService(this.db);
  userSettings.setDisplayName(userId, name);

  // Continue with existing code...
}
```

---

### FR-2: Validate Display Name Input

**Priority**: P1 (High)
**Effort**: 1 story point

**Requirement**:
Display name input must be validated before persistence.

**Acceptance Criteria**:
- [ ] Length validation: 1-50 characters
- [ ] Not empty or whitespace-only
- [ ] HTML/script tag sanitization (via API)
- [ ] Unicode character support (international names)
- [ ] Clear error messages for validation failures
- [ ] Retry prompt on validation failure

**Validation Rules**:
```javascript
function validateDisplayName(name) {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: "Name cannot be empty" };
  }
  if (name.length > 50) {
    return { valid: false, error: "Name must be 50 characters or less" };
  }
  return { valid: true };
}
```

---

### FR-3: Create New Posts for Topic Shifts

**Priority**: P0 (Critical)
**Effort**: 3 story points

**Requirement**:
Get-to-know-you agent must create NEW POSTS (not comments) when:
- Starting a new onboarding question
- Shifting conversation topics
- Transitioning between onboarding phases

**Acceptance Criteria**:
- [ ] Each Phase 1 question creates a new post
- [ ] Post titles clearly indicate onboarding step
- [ ] Comments used only for clarifications within same topic
- [ ] Agent instructions include clear posting guidelines
- [ ] Decision matrix implemented in agent instructions

**Posting Decision Matrix**:
```
CREATE NEW POST when:
✅ Starting new onboarding question (name, use case, etc.)
✅ Transitioning between phases (Phase 1 → Phase 2)
✅ Providing summary/completion message
✅ Introducing new agents or features

USE COMMENT when:
✅ Clarifying previous question
✅ Asking follow-up within same topic
✅ Providing examples for current question
✅ Handling validation errors
```

---

### FR-4: Update Agent Instructions with Posting Guidelines

**Priority**: P0 (Critical)
**Effort**: 2 story points

**Requirement**:
Agent instructions must include explicit, unambiguous posting guidelines.

**Acceptance Criteria**:
- [ ] Decision matrix added to agent instructions
- [ ] Examples provided for each scenario
- [ ] Clear differentiation between post vs comment
- [ ] API curl examples updated with post creation
- [ ] Agent testing validates posting behavior

**Example Addition to Instructions** (Lines 80-92):
```markdown
**POSTING PROTOCOL**:
- **NEW POST**: When asking each onboarding question
  - Example: "What brings you to Agent Feed, {name}?"
  - Creates standalone post for visibility
- **COMMENT**: Only for clarifications within same question
  - Example: "I didn't catch that - could you clarify?"
  - Maintains context within existing conversation
```

---

### FR-5: Increase Default Timeout to 240 Seconds

**Priority**: P1 (High)
**Effort**: 1 story point

**Requirement**:
Default query timeout should be increased from 120s to 240s to accommodate complex onboarding flows.

**Acceptance Criteria**:
- [ ] Default timeout changed to 240000ms (4 minutes)
- [ ] Complex query timeout remains 300000ms (5 minutes)
- [ ] Simple query timeout remains 60000ms (1 minute)
- [ ] Configuration change documented
- [ ] Backward compatibility maintained

**Configuration Change**:
```javascript
// streaming-protection.js
timeouts: {
  simple: 60000,    // 1 minute (unchanged)
  complex: 300000,  // 5 minutes (unchanged)
  default: 240000   // 4 minutes (CHANGED from 120000)
}
```

---

### FR-6: Implement 80% Timeout Warning

**Priority**: P1 (High)
**Effort**: 3 story points

**Requirement**:
When query reaches 80% of timeout threshold, system should:
1. Detect approaching timeout
2. Switch to planning mode
3. Create todo plan
4. Ask user to proceed step-by-step

**Acceptance Criteria**:
- [ ] Warning triggered at 80% of timeout (192s for default)
- [ ] Agent receives timeout warning signal
- [ ] Agent creates structured todo plan
- [ ] User prompted with continue/cancel options
- [ ] Partial results preserved if timeout occurs
- [ ] User can resume from last checkpoint

**Implementation Approach**:
```javascript
// worker-protection.js
const gracePeriodMs = timeoutMs * 0.8; // 80% threshold

const gracePeriodPromise = new Promise((resolve) => {
  setTimeout(() => {
    resolve({ type: 'GRACE_PERIOD_REACHED' });
  }, gracePeriodMs);
});

// Race: execution vs grace period vs timeout
const result = await Promise.race([
  executePromise,
  gracePeriodPromise,
  timeoutPromise
]);

if (result.type === 'GRACE_PERIOD_REACHED') {
  // Trigger planning mode
  return {
    gracePeriodReached: true,
    message: "Creating step-by-step plan...",
    partialResults: messages
  };
}
```

---

### FR-7: Planning Mode Fallback

**Priority**: P1 (High)
**Effort**: 4 story points

**Requirement**:
When grace period is reached (80% of timeout), agent should:
1. Stop current execution
2. Analyze what was accomplished
3. Create TodoWrite plan for remaining work
4. Present plan to user for approval
5. Allow user to continue step-by-step or cancel

**Acceptance Criteria**:
- [ ] Agent stops at 192s for default timeout
- [ ] TodoWrite plan generated automatically
- [ ] Plan includes 5-10 specific steps
- [ ] Each step estimated at <60s execution time
- [ ] User presented with "Continue" or "Cancel" options
- [ ] Partial results saved and accessible
- [ ] Plan persists across sessions

**Todo Plan Structure**:
```json
{
  "gracePeriodReached": true,
  "timeElapsed": 192000,
  "timeoutLimit": 240000,
  "partialResults": "...",
  "remainingWork": {
    "todos": [
      {
        "id": "1",
        "content": "Complete name validation",
        "status": "pending",
        "priority": "high",
        "estimatedTime": "30s"
      },
      {
        "id": "2",
        "content": "Save to user_settings database",
        "status": "pending",
        "priority": "high",
        "estimatedTime": "45s"
      }
    ]
  },
  "userPrompt": "I've created a step-by-step plan. Continue?"
}
```

---

### FR-8: Graceful Timeout User Experience

**Priority**: P1 (High)
**Effort**: 2 story points

**Requirement**:
When timeout occurs, user should receive:
1. Clear explanation of what happened
2. Summary of work completed
3. Todo plan for remaining work
4. Options to retry or proceed manually

**Acceptance Criteria**:
- [ ] User-friendly timeout message displayed
- [ ] Partial results clearly summarized
- [ ] Todo plan presented in readable format
- [ ] Retry option available with adjusted timeout
- [ ] Manual step-by-step option provided
- [ ] No data loss - all partial results preserved

**User-Facing Message Template**:
```
⏱️ This task is taking longer than expected (192s elapsed).

✅ Completed so far:
- Collected your name "Orko"
- Validated input
- Started database save

📋 Remaining steps (estimated 60s):
1. Save to user_settings table
2. Verify name appears system-wide
3. Create welcome post

Would you like to:
[Continue step-by-step] [Cancel and retry later]
```

---

### FR-9: Timeout Configuration by Query Type

**Priority**: P2 (Medium)
**Effort**: 2 story points

**Requirement**:
Onboarding queries should be classified as "complex" automatically to receive longer timeout (300s).

**Acceptance Criteria**:
- [ ] Onboarding queries auto-classified as "complex"
- [ ] Get-to-know-you agent queries receive 300s timeout
- [ ] Grace period calculated as 80% of 300s (240s)
- [ ] Classification logic documented
- [ ] Override mechanism available for testing

**Classification Logic**:
```javascript
// streaming-protection.js
export function classifyQueryComplexity(query) {
  // Detect onboarding queries
  const onboardingPatterns = [
    /onboarding/i,
    /get.to.know.you/i,
    /what.*your.*name/i,
    /what.*brings.*you/i
  ];

  for (const pattern of onboardingPatterns) {
    if (pattern.test(query)) {
      return 'complex'; // 300s timeout
    }
  }

  // Existing logic...
}
```

---

### FR-10: Partial Results Preservation

**Priority**: P1 (High)
**Effort**: 3 story points

**Requirement**:
When timeout or grace period is reached, all partial results must be preserved and accessible.

**Acceptance Criteria**:
- [ ] Partial messages saved to database
- [ ] User can access partial results later
- [ ] Resume capability from last checkpoint
- [ ] No data loss on timeout
- [ ] Clear indication of completion status
- [ ] Recovery path documented for user

**Storage Structure**:
```javascript
{
  "workerId": "worker-123",
  "ticketId": "ticket-456",
  "status": "partial_timeout",
  "completionPercentage": 65,
  "partialResults": {
    "messagesCollected": 45,
    "lastCheckpoint": "name_validated",
    "nextStep": "save_to_database"
  },
  "resumeToken": "abc123def456",
  "expiresAt": 1699564800
}
```

---

## 3. Non-Functional Requirements

### NFR-1: Performance

**Database Operations**:
- Name persistence: < 100ms
- Display name retrieval: < 50ms
- Transaction atomicity: ACID compliance

**Timeout Handling**:
- Grace period detection: < 10ms overhead
- Planning mode activation: < 500ms
- Todo generation: < 2 seconds

**Acceptance Criteria**:
- [ ] 95th percentile response time < 150ms
- [ ] No degradation in existing query performance
- [ ] Timeout detection adds < 1% overhead

---

### NFR-2: Reliability

**Data Integrity**:
- Name saves to both tables or rolls back
- No partial state on failure
- Retry logic for transient failures

**Graceful Degradation**:
- Timeout handling never crashes worker
- Partial results always preserved
- User always receives actionable message

**Acceptance Criteria**:
- [ ] 99.9% success rate for name persistence
- [ ] 0% data loss on timeout
- [ ] 100% error messages user-friendly

---

### NFR-3: Usability

**Error Messages**:
- Clear, jargon-free language
- Actionable next steps
- No technical stack traces exposed

**Timeout Experience**:
- User understands what happened
- User knows what was completed
- User has clear options to proceed

**Acceptance Criteria**:
- [ ] Error messages pass readability test (Grade 8 level)
- [ ] User satisfaction score > 4/5
- [ ] < 5% support tickets related to timeouts

---

### NFR-4: Maintainability

**Code Quality**:
- Services properly separated
- No circular dependencies
- Comprehensive error handling

**Documentation**:
- API contracts documented
- Agent instructions clear and unambiguous
- Timeout behavior well-explained

**Acceptance Criteria**:
- [ ] Code coverage > 80%
- [ ] All public APIs documented
- [ ] Agent instructions validated by QA

---

### NFR-5: Security

**Input Validation**:
- Display name sanitized against XSS
- SQL injection prevention (prepared statements)
- Rate limiting on name updates

**Data Privacy**:
- Display name stored securely
- No PII in logs
- GDPR compliance maintained

**Acceptance Criteria**:
- [ ] Passes security audit
- [ ] No sensitive data in error messages
- [ ] Input validation comprehensive

---

## 4. Architecture Design

### 4.1 Database Schema

**No Changes Required** - Tables already exist:

```sql
-- user_settings (existing)
CREATE TABLE user_settings (
  user_id TEXT PRIMARY KEY,
  display_name TEXT,
  display_name_style TEXT,
  onboarding_completed INTEGER DEFAULT 0,
  onboarding_completed_at INTEGER,
  profile_json TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

-- onboarding_state (existing)
CREATE TABLE onboarding_state (
  user_id TEXT PRIMARY KEY,
  phase INTEGER NOT NULL,
  step TEXT NOT NULL,
  phase1_completed INTEGER DEFAULT 0,
  phase1_completed_at INTEGER,
  phase2_completed INTEGER DEFAULT 0,
  phase2_completed_at INTEGER,
  responses TEXT, -- JSON: { "name": "Orko", "use_case": "..." }
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);
```

**Integration Point**:
- `onboarding_state.responses.name` → `user_settings.display_name`
- Sync happens in `processNameResponse()`

---

### 4.2 Service Integration Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Onboarding Flow Service                   │
│                                                              │
│  processNameResponse(userId, name)                          │
│    1. Validate name (1-50 chars, not empty)                 │
│    2. Save to onboarding_state.responses                    │
│    3. Call UserSettingsService.setDisplayName()             │
│    4. Verify both saves succeeded                           │
│    5. Return success with next step                         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   User Settings Service                      │
│                                                              │
│  setDisplayName(userId, displayName)                        │
│    1. Update user_settings.display_name                     │
│    2. Create record if doesn't exist                        │
│    3. Return updated settings                               │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Database (SQLite)                       │
│                                                              │
│  UPDATE user_settings                                       │
│  SET display_name = ?, updated_at = unixepoch()             │
│  WHERE user_id = ?                                          │
└─────────────────────────────────────────────────────────────┘
```

**Error Handling**:
```
IF validation fails:
  → Return error to agent
  → Agent prompts user to retry

IF user_settings save fails:
  → Log error
  → Retry 3 times with exponential backoff
  → If still fails, rollback onboarding_state
  → Return error to agent

IF both saves succeed:
  → Return success
  → Agent proceeds to next step
```

---

### 4.3 Agent Posting Decision Tree

```
Agent receives user response
         │
         ▼
┌─────────────────────────┐
│ Is this a new question? │
│ (name, use case, etc.)  │
└─────────────────────────┘
         │
    ┌────┴────┐
   YES       NO
    │         │
    ▼         ▼
CREATE    Is this a phase
NEW POST  transition?
    │         │
    │    ┌────┴────┐
    │   YES       NO
    │    │         │
    │    ▼         ▼
    │  CREATE   Is this a
    │  NEW POST clarification?
    │              │
    │         ┌────┴────┐
    │        YES       NO
    │         │         │
    │         ▼         ▼
    │      CREATE   CREATE
    │      COMMENT  NEW POST
    │         │         │
    └─────────┴─────────┘
              │
              ▼
    Execute post/comment
```

**Implementation**:
- Add decision logic to agent instructions
- Provide clear examples for each scenario
- Include API curl commands for both post and comment

---

### 4.4 Timeout Handling Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Worker Protection                       │
│                                                              │
│  executeProtectedQuery(query, options)                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Promise.race([                              │
│                    executePromise,                           │
│                    gracePeriodPromise (80% timeout),         │
│                    timeoutPromise (100% timeout)             │
│                  ])                                          │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
    Execution            Grace Period          Timeout
    completes            reached (192s)        reached (240s)
         │                    │                    │
         ▼                    ▼                    ▼
    Return              Switch to             Return partial
    success             planning mode         results + error
         │                    │                    │
         │                    ▼                    │
         │            Create todo plan             │
         │            Ask user to continue         │
         │                    │                    │
         └────────────────────┴────────────────────┘
                            │
                            ▼
                     Return to user
```

**States**:
1. **Normal Execution** (0-192s): Execute query normally
2. **Grace Period** (192-240s): Switch to planning mode, create todos
3. **Timeout** (240s+): Return partial results, clear error message

**Data Flow**:
```javascript
// Normal completion
{
  success: true,
  messages: [...],
  chunkCount: 45,
  responseSize: 12000
}

// Grace period reached
{
  gracePeriodReached: true,
  partialResults: [...],
  todosPlan: [...],
  userPrompt: "Continue step-by-step?",
  options: ["Continue", "Cancel"]
}

// Timeout reached
{
  success: false,
  terminated: true,
  reason: "QUERY_TIMEOUT",
  partialResults: [...],
  todosPlan: [...],
  userMessage: "⏱️ Task took too long..."
}
```

---

### 4.5 Configuration Updates

**File**: `/workspaces/agent-feed/api-server/config/streaming-protection.js`

```javascript
export const STREAMING_PROTECTION_CONFIG = {
  // ... existing config ...

  // Updated timeouts
  timeouts: {
    simple: 60000,      // 1 minute (unchanged)
    complex: 300000,    // 5 minutes (unchanged)
    default: 240000     // 4 minutes (CHANGED from 120000)
  },

  // NEW: Grace period configuration
  gracePeriod: {
    enabled: true,
    thresholdPercentage: 0.8,  // 80% of timeout
    planningModeEnabled: true
  }
};
```

**File**: `/workspaces/agent-feed/api-server/worker/worker-protection.js`

**Add grace period handling**:
```javascript
// Import config
import { STREAMING_PROTECTION_CONFIG } from '../config/streaming-protection.js';

// Calculate grace period
const gracePeriodMs = STREAMING_PROTECTION_CONFIG.gracePeriod.enabled
  ? timeoutMs * STREAMING_PROTECTION_CONFIG.gracePeriod.thresholdPercentage
  : null;

// Add grace period promise to race
if (gracePeriodMs) {
  promises.push(gracePeriodPromise);
}
```

---

## 5. Success Criteria

### Issue #1: Name Persistence

**How to Verify**:
1. User provides name "Orko" during onboarding
2. Check `onboarding_state.responses`: `{"name": "Orko"}`
3. Check `user_settings.display_name`: `"Orko"`
4. View posts/comments: Author shows "Orko"
5. Refresh browser: Name still shows "Orko"

**Success Metrics**:
- [ ] 100% of users see their name system-wide
- [ ] 0% fallback to "Integration Test User" when name provided
- [ ] Name persists across sessions

---

### Issue #2: Agent Posting Behavior

**How to Verify**:
1. Start onboarding flow
2. Provide name "Orko"
3. Agent creates NEW POST: "Welcome, Orko! What brings you to Agent Feed?"
4. Provide use case answer
5. Agent creates NEW POST with phase completion message
6. Ask clarifying question
7. Agent adds COMMENT to current post

**Success Metrics**:
- [ ] 100% of onboarding questions create new posts
- [ ] 0% of questions buried in comments
- [ ] Agent feed shows clear progression of onboarding

---

### Issue #3: Timeout UX

**How to Verify**:
1. Create query that takes ~200 seconds
2. At 192 seconds (80%), verify grace period triggered
3. Agent creates todo plan
4. User prompted to continue
5. If user continues, execute step-by-step
6. If timeout at 240s, verify partial results preserved

**Success Metrics**:
- [ ] 100% of grace periods trigger planning mode
- [ ] 0% of timeouts result in data loss
- [ ] User satisfaction score > 4/5 for timeout experience

---

## 6. Test Strategy

### 6.1 Unit Tests

**File**: `/workspaces/agent-feed/api-server/services/onboarding/__tests__/onboarding-flow-service.test.js`

**Test Cases**:
```javascript
describe('OnboardingFlowService.processNameResponse', () => {
  test('saves name to onboarding_state.responses', () => {
    // Existing test - keep
  });

  test('saves name to user_settings.display_name', () => {
    // NEW TEST
    const result = service.processNameResponse('user-1', 'Orko');
    const settings = userSettingsService.getUserSettings('user-1');
    expect(settings.display_name).toBe('Orko');
  });

  test('validates name length (1-50 chars)', () => {
    // NEW TEST
    expect(() => service.processNameResponse('user-1', '')).toThrow();
    expect(() => service.processNameResponse('user-1', 'a'.repeat(51))).toThrow();
  });

  test('handles user_settings save failure with rollback', () => {
    // NEW TEST
    // Mock user_settings to fail
    // Verify onboarding_state not updated
  });
});
```

**File**: `/workspaces/agent-feed/api-server/services/__tests__/user-settings-service.test.js`

**Test Cases**:
```javascript
describe('UserSettingsService.setDisplayName', () => {
  test('creates user_settings record if not exists', () => {
    service.setDisplayName('new-user', 'Orko');
    const settings = service.getUserSettings('new-user');
    expect(settings.display_name).toBe('Orko');
  });

  test('updates existing display_name', () => {
    service.setDisplayName('user-1', 'Initial');
    service.setDisplayName('user-1', 'Updated');
    expect(service.getUserSettings('user-1').display_name).toBe('Updated');
  });
});
```

---

### 6.2 Integration Tests

**File**: `/workspaces/agent-feed/api-server/__tests__/integration/onboarding-flow.test.js`

**Test Scenarios**:
```javascript
describe('Onboarding Flow - Name Persistence', () => {
  test('end-to-end name collection and persistence', async () => {
    // 1. Initialize onboarding
    const state = service.initializeOnboarding('user-1');

    // 2. Process name response
    const result = service.processNameResponse('user-1', 'Orko');

    // 3. Verify onboarding_state
    expect(state.responses.name).toBe('Orko');

    // 4. Verify user_settings
    const settings = userSettingsService.getUserSettings('user-1');
    expect(settings.display_name).toBe('Orko');

    // 5. Verify API returns correct display name
    const response = await request(app)
      .get('/api/user-settings/display-name?userId=user-1');
    expect(response.body.display_name).toBe('Orko');
  });
});
```

---

### 6.3 Timeout Tests

**File**: `/workspaces/agent-feed/api-server/worker/__tests__/worker-protection.test.js`

**Test Cases**:
```javascript
describe('Worker Protection - Timeout Handling', () => {
  test('default timeout is 240 seconds', () => {
    const limits = getSafetyLimits('default');
    expect(limits.timeoutMs).toBe(240000);
  });

  test('grace period triggers at 80% of timeout', async () => {
    const result = await executeProtectedQuery('complex query', {
      timeoutOverride: 10000, // 10 seconds for testing
      // Mock query that runs for 8+ seconds
    });

    expect(result.gracePeriodReached).toBe(true);
    expect(result.todosPlan).toBeDefined();
  });

  test('timeout at 100% preserves partial results', async () => {
    const result = await executeProtectedQuery('very long query', {
      timeoutOverride: 5000, // 5 seconds
      // Mock query that runs forever
    });

    expect(result.terminated).toBe(true);
    expect(result.partialResults).toBeDefined();
    expect(result.userMessage).toContain('⏱️');
  });
});
```

---

### 6.4 Agent Behavior Tests

**File**: `/workspaces/agent-feed/prod/__tests__/agents/get-to-know-you-agent.test.js`

**Test Cases**:
```javascript
describe('Get-to-Know-You Agent - Posting Behavior', () => {
  test('creates new post for name question', async () => {
    const posts = await agentTest.executeScenario('name_question');
    expect(posts).toHaveLength(1);
    expect(posts[0].type).toBe('post');
    expect(posts[0].title).toContain('Welcome');
  });

  test('creates new post for use case question', async () => {
    const posts = await agentTest.executeScenario('use_case_question');
    expect(posts).toHaveLength(1);
    expect(posts[0].type).toBe('post');
  });

  test('creates comment for clarification', async () => {
    const posts = await agentTest.executeScenario('clarification');
    expect(posts[0].type).toBe('comment');
  });
});
```

---

### 6.5 End-to-End Tests

**File**: `/workspaces/agent-feed/__tests__/e2e/onboarding-ux.spec.js`

**Test Scenarios**:
```javascript
describe('E2E: Onboarding UX Improvements', () => {
  test('complete onboarding flow with name persistence', async () => {
    // 1. Start onboarding
    await page.goto('/onboarding');

    // 2. Provide name "Orko"
    await page.fill('input[name="name"]', 'Orko');
    await page.click('button[type="submit"]');

    // 3. Verify new post created (not comment)
    const posts = await page.locator('.post').all();
    expect(posts.length).toBeGreaterThan(0);
    expect(await posts[0].textContent()).toContain('Welcome, Orko');

    // 4. Verify name appears in UI
    const userName = await page.locator('.user-display-name').textContent();
    expect(userName).toBe('Orko');

    // 5. Refresh page
    await page.reload();

    // 6. Verify name still shows "Orko"
    expect(await page.locator('.user-display-name').textContent()).toBe('Orko');
  });

  test('timeout grace period with todo plan', async () => {
    // 1. Trigger long-running query
    await page.fill('textarea[name="query"]', 'complex onboarding task');
    await page.click('button[type="submit"]');

    // 2. Wait for grace period (mock 192s)
    await page.waitForSelector('.grace-period-message');

    // 3. Verify todo plan shown
    const todos = await page.locator('.todo-item').all();
    expect(todos.length).toBeGreaterThan(0);

    // 4. Verify continue/cancel options
    expect(await page.locator('button[data-action="continue"]').isVisible()).toBe(true);
    expect(await page.locator('button[data-action="cancel"]').isVisible()).toBe(true);
  });
});
```

---

## 7. Implementation Plan

### Phase 1: Name Persistence (P0)

**Week 1**:
- [ ] Update `onboarding-flow-service.js` with user-settings integration
- [ ] Add input validation for display name
- [ ] Write unit tests for service integration
- [ ] Write integration tests for end-to-end flow
- [ ] Code review and merge

**Deliverables**:
- FR-1: Display name persists to user_settings ✅
- FR-2: Input validation implemented ✅
- Tests: 80%+ coverage ✅

---

### Phase 2: Agent Posting Guidelines (P0)

**Week 1-2**:
- [ ] Update `get-to-know-you-agent.md` with posting decision matrix
- [ ] Add clear examples for post vs comment scenarios
- [ ] Update API curl examples in agent instructions
- [ ] Write agent behavior tests
- [ ] Conduct QA testing with real agent
- [ ] Code review and merge

**Deliverables**:
- FR-3: Posting decision matrix implemented ✅
- FR-4: Agent instructions updated ✅
- Tests: Agent posting validated ✅

---

### Phase 3: Timeout UX Improvements (P1)

**Week 2-3**:
- [ ] Update `streaming-protection.js` with new default timeout (240s)
- [ ] Implement grace period detection in `worker-protection.js`
- [ ] Add planning mode activation logic
- [ ] Implement todo plan generation
- [ ] Add user-facing timeout messages
- [ ] Write timeout handling tests
- [ ] Write E2E tests for timeout scenarios
- [ ] Code review and merge

**Deliverables**:
- FR-5: Default timeout increased to 240s ✅
- FR-6: Grace period warning at 80% ✅
- FR-7: Planning mode fallback ✅
- FR-8: Graceful timeout UX ✅
- FR-9: Onboarding query classification ✅
- FR-10: Partial results preservation ✅

---

### Phase 4: Documentation & Deployment

**Week 3-4**:
- [ ] Update API documentation
- [ ] Update agent documentation
- [ ] Create user-facing help guides
- [ ] Deploy to staging environment
- [ ] Conduct user acceptance testing
- [ ] Deploy to production
- [ ] Monitor metrics

**Deliverables**:
- Documentation complete ✅
- Production deployment ✅
- Monitoring dashboards active ✅

---

## 8. Risk Assessment

### Risk #1: Database Transaction Failure

**Probability**: Low
**Impact**: High

**Mitigation**:
- Implement atomic transactions with rollback
- Add retry logic with exponential backoff
- Comprehensive error handling
- Monitoring and alerting

---

### Risk #2: Agent Posting Confusion

**Probability**: Medium
**Impact**: Medium

**Mitigation**:
- Clear, unambiguous instructions
- Extensive examples in documentation
- Agent behavior testing
- QA validation before deployment

---

### Risk #3: Timeout Threshold Too Aggressive

**Probability**: Medium
**Impact**: Medium

**Mitigation**:
- Monitor timeout metrics in production
- Allow admin override for timeout values
- User feedback collection
- Iterative adjustment based on data

---

### Risk #4: User Confusion During Grace Period

**Probability**: Low
**Impact**: Low

**Mitigation**:
- Clear, actionable messaging
- Visual indicators (progress bars)
- User testing before deployment
- Help documentation

---

## 9. Monitoring & Metrics

### Key Metrics

**Name Persistence**:
- Success rate of display name saves
- Fallback rate to default "User" name
- User-reported issues with name display

**Agent Posting**:
- Ratio of posts to comments in onboarding
- User engagement with onboarding posts
- Completion rate of onboarding flow

**Timeout Handling**:
- Grace period trigger rate
- Timeout occurrence rate
- User satisfaction with timeout experience
- Partial results preservation success rate

### Monitoring Dashboards

**Dashboard 1: Onboarding Health**
- Name persistence success rate (target: 99.9%)
- Onboarding completion rate (target: 95%+)
- Average onboarding time (target: < 5 minutes)

**Dashboard 2: Timeout Analysis**
- Timeout occurrence rate (target: < 5%)
- Grace period activation rate (target: > 80% of timeouts)
- User continue rate after grace period (target: > 50%)

**Dashboard 3: User Experience**
- User satisfaction score (target: > 4/5)
- Support ticket volume (target: < 5 tickets/week)
- Agent posting clarity score (target: > 4/5)

---

## 10. Appendix

### A. File Paths

**Backend Services**:
- `/workspaces/agent-feed/api-server/services/onboarding/onboarding-flow-service.js`
- `/workspaces/agent-feed/api-server/services/user-settings-service.js`
- `/workspaces/agent-feed/api-server/config/streaming-protection.js`
- `/workspaces/agent-feed/api-server/worker/worker-protection.js`

**Agent Instructions**:
- `/workspaces/agent-feed/prod/.claude/agents/get-to-know-you-agent.md`

**Tests**:
- `/workspaces/agent-feed/api-server/services/onboarding/__tests__/`
- `/workspaces/agent-feed/api-server/worker/__tests__/`
- `/workspaces/agent-feed/__tests__/e2e/`

---

### B. API Contracts

**Display Name API**:
```
PUT /api/user-settings/display-name
Request:
{
  "userId": "demo-user-123",
  "display_name": "Orko"
}

Response:
{
  "success": true,
  "display_name": "Orko",
  "updated_at": 1699564800
}

Errors:
400 - Invalid input (empty, too long)
500 - Database error
```

**Onboarding API**:
```
POST /api/onboarding/process-name
Request:
{
  "userId": "demo-user-123",
  "name": "Orko"
}

Response:
{
  "success": true,
  "nextStep": "use_case",
  "phase": 1,
  "message": "Great to meet you, Orko! What brings you to Agent Feed?"
}
```

---

### C. Database Queries

**Save Display Name**:
```sql
-- Insert or update user_settings
INSERT INTO user_settings (user_id, display_name, updated_at)
VALUES (?, ?, unixepoch())
ON CONFLICT(user_id) DO UPDATE SET
  display_name = excluded.display_name,
  updated_at = unixepoch();
```

**Retrieve Display Name**:
```sql
SELECT display_name
FROM user_settings
WHERE user_id = ?;
```

**Verify Persistence**:
```sql
-- Check both tables have name
SELECT
  os.responses AS onboarding_name,
  us.display_name AS settings_name
FROM onboarding_state os
LEFT JOIN user_settings us ON os.user_id = us.user_id
WHERE os.user_id = ?;
```

---

### D. Example Scenarios

**Scenario 1: Happy Path**
```
1. User starts onboarding
2. Agent asks: "What should I call you?"
3. User: "Orko"
4. Agent validates: 1-50 chars ✅
5. Agent saves to onboarding_state.responses ✅
6. Agent saves to user_settings.display_name ✅
7. Agent creates NEW POST: "Welcome, Orko! What brings you to Agent Feed?"
8. User sees name "Orko" everywhere ✅
```

**Scenario 2: Validation Error**
```
1. User starts onboarding
2. Agent asks: "What should I call you?"
3. User: "" (empty)
4. Agent validates: 1-50 chars ❌
5. Agent responds: "I didn't catch that. Please provide a name."
6. User retries: "Orko"
7. Flow continues normally ✅
```

**Scenario 3: Timeout with Grace Period**
```
1. User submits complex onboarding query
2. Query executes for 192 seconds (80% of 240s)
3. Grace period triggered ✅
4. Agent creates todo plan:
   - [ ] Complete name validation
   - [ ] Save to database
   - [ ] Create welcome post
5. User prompted: "Continue step-by-step?"
6. User clicks "Continue"
7. Agent executes step 1 (< 60s)
8. Agent executes step 2 (< 60s)
9. Agent executes step 3 (< 60s)
10. Onboarding completes ✅
```

---

## 11. Conclusion

This SPARC specification provides a comprehensive solution to three critical UX issues in the Agent Feed onboarding system:

1. **Name Persistence**: Integrated user-settings-service to persist display names system-wide
2. **Agent Posting**: Clear guidelines for when to create posts vs comments
3. **Timeout UX**: Graceful degradation with planning mode and user choice

**Expected Outcomes**:
- 99.9%+ name persistence success rate
- Clear, engaging onboarding experience with visible agent posts
- < 5% timeout occurrence with 100% graceful handling
- User satisfaction > 4/5 for onboarding flow

**Next Steps**:
1. Review and approve specification
2. Begin Phase 1 implementation (name persistence)
3. Proceed with Phase 2 and 3 in parallel
4. Deploy and monitor metrics

---

**Document Status**: ✅ Ready for Implementation
**Approval Required**: Product Owner, Tech Lead, QA Lead
**Target Release**: v1.1.0
