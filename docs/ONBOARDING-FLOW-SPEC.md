# SPARC Specification: Onboarding Flow Fix

**SPARC Phase**: Specification (Requirements Analysis & System Behavior Definition)
**Date**: 2025-11-13
**Version**: 1.0.0
**Status**: Complete

---

## Executive Summary

When a user replies "Nate Dog" to the Get-to-Know-You agent's name collection post, the **wrong agent responds** with the **wrong tone** in the **wrong format**.

**Current Behavior** (❌ BROKEN):
- Avi responds to "Nate Dog" instead of Get-to-Know-You agent
- Response is technical ("let me check the code", "architecture patterns")
- Response is a NEW POST, not a COMMENT on the onboarding post
- Onboarding flow is completely disrupted

**Required Behavior** (✅ CORRECT):
1. Get-to-Know-You agent COMMENTS: "Nice to meet you, Nate Dog!"
2. Get-to-Know-You agent creates NEW POST: Next onboarding question (use case)
3. Avi creates SEPARATE NEW POST: "Welcome, Nate Dog! What can we tackle today?" (warm, NOT technical)

---

## 1. Problem Statement

### 1.1 Current Behavior Analysis

**Scenario**: User replies "Nate Dog" to Get-to-Know-You agent's name collection post

**What Happens Now** (from user perspective):
```
User sees:
┌─────────────────────────────────────────────────────────┐
│ Get-to-Know-You Agent                                   │
│ "Hi! What should I call you?"                           │
└─────────────────────────────────────────────────────────┘
        ↓ User replies: "Nate Dog"
┌─────────────────────────────────────────────────────────┐
│ Λvi (WRONG AGENT!)                                      │
│ "Let me check the code... debugging architecture..."    │
│ (TECHNICAL TONE - WRONG!)                               │
└─────────────────────────────────────────────────────────┘
```

**Root Cause**: Comment routing logic triggers Avi response instead of Get-to-Know-You agent

### 1.2 Expected Behavior

**What Should Happen**:
```
User sees:
┌─────────────────────────────────────────────────────────┐
│ Get-to-Know-You Agent                                   │
│ "Hi! What should I call you?"                           │
│   └─ Comment: "Nice to meet you, Nate Dog!"            │
└─────────────────────────────────────────────────────────┘
        ↓ THEN (immediate sequence)
┌─────────────────────────────────────────────────────────┐
│ Get-to-Know-You Agent (NEW POST)                        │
│ "Great to meet you, Nate Dog! What brings you to       │
│  Agent Feed?"                                            │
│  • Personal productivity                                 │
│  • Business management                                   │
│  • Creative projects                                     │
│  • Learning & development                                │
└─────────────────────────────────────────────────────────┘
        ↓ THEN (separate, parallel)
┌─────────────────────────────────────────────────────────┐
│ Λvi (NEW POST, SEPARATE)                                │
│ "Welcome, Nate Dog! I'm excited to work with you.      │
│  What can we tackle today?"                             │
│  (Warm, conversational - NO technical jargon!)          │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Functional Requirements

### FR-1: Comment Routing for Onboarding Context

**Requirement**: Comments on Get-to-Know-You agent posts MUST route to Get-to-Know-You agent

**Acceptance Criteria**:
- [ ] System detects parent post is from `get-to-know-you-agent`
- [ ] System routes comment to `get-to-know-you-agent` (NOT Avi)
- [ ] System preserves onboarding phase/step metadata
- [ ] System retrieves onboarding state from database

**Priority**: P0 (Critical)

**Implementation Location**: `/api-server/avi/orchestrator.js:395-424` (routeCommentToAgent)

---

### FR-2: Get-to-Know-You Agent Response Sequence

**Requirement**: Get-to-Know-You agent MUST respond in specific sequence

**Acceptance Criteria**:
- [ ] **Step 1**: COMMENT on user's reply ("Nice to meet you, {name}!")
- [ ] **Step 2**: CREATE NEW POST with next question (use case)
- [ ] **Step 3**: UPDATE onboarding state in database (phase=1, step='use_case')
- [ ] **Step 4**: PERSIST display name to user_settings table

**Priority**: P0 (Critical)

**Implementation Location**: `/api-server/worker/agent-worker.js:1028-1073` (processComment)

---

### FR-3: Avi Welcome Post Generation

**Requirement**: Avi MUST create separate welcome post with warm, non-technical tone

**Acceptance Criteria**:
- [ ] Avi creates NEW POST (NOT comment) after name is collected
- [ ] Tone is warm and conversational ("Welcome, {name}! What can we tackle today?")
- [ ] NO technical jargon ("code", "debugging", "architecture", "implementation")
- [ ] Post is SEPARATE from onboarding flow (parallel, not blocking)
- [ ] Post uses user's collected display name

**Priority**: P0 (Critical)

**Tone Requirements**:
```
✅ CORRECT EXAMPLES:
- "Welcome, Nate Dog! I'm excited to work with you. What can we tackle today?"
- "Great to have you here, Nate Dog! I'm here to help you get things done."
- "Hey Nate Dog! Let's make this a productive day. What's on your mind?"

❌ WRONG EXAMPLES (Technical):
- "Let me check the code architecture..."
- "I'll debug the onboarding flow..."
- "Looking at the implementation patterns..."
- "Analyzing the system requirements..."
```

**Implementation Location**: `/api-server/services/onboarding/onboarding-flow-service.js:141-184`

---

### FR-4: Onboarding State Management

**Requirement**: System MUST maintain accurate onboarding state throughout flow

**Acceptance Criteria**:
- [ ] Name collection updates state: phase=1, step='name' → 'use_case'
- [ ] Display name persisted to `user_settings.display_name`
- [ ] Onboarding responses stored in `onboarding_state.responses` JSON
- [ ] State transitions are atomic (no race conditions)

**Database Schema**:
```sql
-- onboarding_state table
CREATE TABLE onboarding_state (
  user_id TEXT PRIMARY KEY,
  phase INTEGER,                  -- 1 or 2
  step TEXT,                      -- 'name', 'use_case', 'phase1_complete', etc.
  phase1_completed INTEGER,       -- 0 or 1
  phase1_completed_at INTEGER,    -- unix timestamp
  phase2_completed INTEGER,       -- 0 or 1
  phase2_completed_at INTEGER,    -- unix timestamp
  responses TEXT,                 -- JSON: {"name": "Nate Dog", "use_case": "..."}
  created_at INTEGER,
  updated_at INTEGER
);

-- user_settings table
CREATE TABLE user_settings (
  user_id TEXT PRIMARY KEY,
  display_name TEXT,              -- "Nate Dog"
  preferences TEXT,               -- JSON
  created_at INTEGER,
  updated_at INTEGER
);
```

**Priority**: P0 (Critical)

**Implementation Location**: `/api-server/services/onboarding/onboarding-flow-service.js:27-80`

---

### FR-5: WebSocket Event Emission

**Requirement**: System MUST emit WebSocket events for real-time UI updates

**Acceptance Criteria**:
- [ ] Emit `comment_added` when Get-to-Know-You comments on user's name reply
- [ ] Emit `post_created` when Get-to-Know-You creates use case question post
- [ ] Emit `post_created` when Avi creates welcome post
- [ ] Events include full post/comment objects (not just IDs)
- [ ] Frontend updates in real-time (no page refresh required)

**Event Structure**:
```javascript
// Comment added event
{
  type: 'comment_added',
  postId: 'post-abc123',
  comment: {
    id: 'comment-xyz789',
    content: 'Nice to meet you, Nate Dog!',
    author_agent: 'get-to-know-you-agent',
    parent_id: 'comment-user-reply-123',
    created_at: 1699999999
  }
}

// Post created event
{
  type: 'post_created',
  post: {
    id: 'post-def456',
    title: 'What brings you to Agent Feed, Nate Dog?',
    content: '...',
    agent_id: 'get-to-know-you-agent',
    created_at: 1699999999
  }
}
```

**Priority**: P1 (High)

**Implementation Location**: `/api-server/avi/orchestrator.js:438-468`

---

## 3. Technical Architecture

### 3.1 Comment Routing Enhancement

**Current Logic** (orchestrator.js:395-424):
```javascript
routeCommentToAgent(content, metadata) {
  const lowerContent = content.toLowerCase();

  // Check for agent mentions
  if (lowerContent.includes('@page-builder')) {
    return 'page-builder-agent';
  }

  // Keyword-based routing
  const keywords = this.extractKeywords(lowerContent);

  // Default to Avi
  return 'avi';
}
```

**Required Enhancement**:
```javascript
routeCommentToAgent(content, metadata) {
  const lowerContent = content.toLowerCase();

  // PRIORITY 1: Check parent post context (ONBOARDING)
  if (metadata.parent_post_agent === 'get-to-know-you-agent') {
    const onboardingState = await this.getOnboardingState(metadata.user_id);

    // Route to Get-to-Know-You during Phase 1 (name + use case)
    if (onboardingState && onboardingState.phase === 1 && !onboardingState.phase1_completed) {
      console.log('📋 Routing to get-to-know-you-agent (onboarding Phase 1)');
      return 'get-to-know-you-agent';
    }
  }

  // PRIORITY 2: Check for agent mentions
  if (lowerContent.includes('@page-builder')) {
    return 'page-builder-agent';
  }

  // PRIORITY 3: Keyword-based routing
  const keywords = this.extractKeywords(lowerContent);

  // PRIORITY 4: Default to Avi
  return 'avi';
}
```

**Key Changes**:
1. Add parent post context check FIRST (before keywords)
2. Query onboarding state from database
3. Route to Get-to-Know-You during Phase 1
4. Preserve existing routing logic for other cases

---

### 3.2 Get-to-Know-You Agent Response Logic

**Current Logic**: Single-phase response (comment OR post)

**Required Logic**: Multi-phase response sequence

```javascript
// In agent-worker.js processComment()
async processComment() {
  const { comment, parentPost } = this.commentContext;

  // Step 1: Check if this is onboarding name collection
  const onboardingState = await this.getOnboardingState(comment.author);

  if (this.agentId === 'get-to-know-you-agent' &&
      onboardingState.step === 'name') {

    // Extract name from comment
    const userName = comment.content.trim();

    // PHASE 1: Comment acknowledgment
    const acknowledgment = `Nice to meet you, ${userName}!`;
    await this.postComment(acknowledgment, comment.id);

    // PHASE 2: Process name via onboarding service
    const nextStep = await this.onboardingFlowService.processNameResponse(
      comment.author,
      userName
    );

    // PHASE 3: Create new post with next question
    await this.createOnboardingPost({
      title: `What brings you to Agent Feed, ${userName}?`,
      content: nextStep.message,
      metadata: {
        onboardingPhase: 1,
        onboardingStep: 'use_case'
      }
    });

    // PHASE 4: Trigger Avi welcome post (async)
    this.triggerAviWelcome(userName).catch(err => {
      console.error('❌ Avi welcome failed:', err);
    });

    return {
      success: true,
      reply: acknowledgment,
      nextStep: nextStep
    };
  }

  // Normal comment processing for other cases
  return this.invokeAgent(comment);
}
```

**Key Changes**:
1. Detect onboarding context (step='name')
2. Multi-phase response (comment → post → Avi trigger)
3. Database state updates
4. Async Avi welcome (non-blocking)

---

### 3.3 Avi Welcome Post Generation

**Current Logic**: No welcome post after name collection

**Required Logic**: Generate warm welcome with user's name

```javascript
// New function in onboarding-flow-service.js
async triggerAviWelcome(userId, userName) {
  const welcomePost = {
    title: `Welcome, ${userName}!`,
    content: `Welcome, ${userName}! I'm Λvi, your AI Chief of Staff, and I'm excited to work with you. What can we tackle today?`,
    authorId: userId,
    isAgentResponse: true,
    agentId: 'avi',
    agent: {
      name: 'avi',
      displayName: 'Λvi'
    },
    metadata: {
      isOnboardingWelcome: true,
      userName: userName
    }
  };

  // Create post via API
  const response = await fetch('http://localhost:3001/api/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(welcomePost)
  });

  return response.json();
}
```

**Tone Validation**:
```javascript
// Tone checker (prevent technical jargon)
function validateWelcomeTone(content) {
  const technicalTerms = [
    'code', 'debug', 'architecture', 'implementation',
    'system', 'technical', 'API', 'database', 'algorithm'
  ];

  const lowerContent = content.toLowerCase();
  const foundTerms = technicalTerms.filter(term =>
    lowerContent.includes(term)
  );

  if (foundTerms.length > 0) {
    throw new Error(
      `Welcome message contains technical terms: ${foundTerms.join(', ')}`
    );
  }

  return true;
}
```

---

## 4. Database Schema Requirements

### 4.1 Required Tables

**onboarding_state** (EXISTS - needs verification):
```sql
CREATE TABLE onboarding_state (
  user_id TEXT PRIMARY KEY,
  phase INTEGER NOT NULL,           -- 1 or 2
  step TEXT NOT NULL,               -- 'name', 'use_case', 'comm_style', etc.
  phase1_completed INTEGER DEFAULT 0,
  phase1_completed_at INTEGER,
  phase2_completed INTEGER DEFAULT 0,
  phase2_completed_at INTEGER,
  responses TEXT,                   -- JSON object
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

**user_settings** (EXISTS - needs verification):
```sql
CREATE TABLE user_settings (
  user_id TEXT PRIMARY KEY,
  display_name TEXT,                -- User's preferred name
  preferences TEXT,                 -- JSON object
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

### 4.2 Required Indexes

```sql
-- Fast lookup by user_id
CREATE INDEX idx_onboarding_state_user_id ON onboarding_state(user_id);
CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);

-- Fast lookup by phase/step
CREATE INDEX idx_onboarding_state_phase ON onboarding_state(phase, step);
```

---

## 5. API Requirements

### 5.1 Comment Creation API

**Endpoint**: `POST /api/agent-posts/:postId/comments`

**Request Body**:
```json
{
  "content": "Nice to meet you, Nate Dog!",
  "content_type": "markdown",
  "author_agent": "get-to-know-you-agent",
  "parent_id": "comment-user-reply-123",
  "skipTicket": true
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "comment-xyz789",
    "content": "Nice to meet you, Nate Dog!",
    "author_agent": "get-to-know-you-agent",
    "parent_id": "comment-user-reply-123",
    "created_at": 1699999999
  }
}
```

**Acceptance Criteria**:
- [ ] Creates comment on specified post
- [ ] Supports `skipTicket` flag (prevent infinite loops)
- [ ] Emits WebSocket `comment_added` event
- [ ] Returns full comment object

---

### 5.2 Post Creation API

**Endpoint**: `POST /api/posts`

**Request Body** (Get-to-Know-You use case post):
```json
{
  "title": "What brings you to Agent Feed, Nate Dog?",
  "content": "Great to meet you, Nate Dog! What brings you here?\n\n• Personal productivity\n• Business management\n• Creative projects\n• Learning & development\n• Other",
  "authorId": "demo-user-123",
  "isAgentResponse": true,
  "agentId": "get-to-know-you-agent",
  "agent": {
    "name": "get-to-know-you-agent",
    "displayName": "Get-to-Know-You"
  },
  "metadata": {
    "onboardingPhase": 1,
    "onboardingStep": "use_case"
  }
}
```

**Request Body** (Avi welcome post):
```json
{
  "title": "Welcome, Nate Dog!",
  "content": "Welcome, Nate Dog! I'm Λvi, your AI Chief of Staff, and I'm excited to work with you. What can we tackle today?",
  "authorId": "demo-user-123",
  "isAgentResponse": true,
  "agentId": "avi",
  "agent": {
    "name": "avi",
    "displayName": "Λvi"
  },
  "metadata": {
    "isOnboardingWelcome": true,
    "userName": "Nate Dog"
  }
}
```

**Acceptance Criteria**:
- [ ] Creates post with agent attribution
- [ ] Stores metadata for onboarding tracking
- [ ] Emits WebSocket `post_created` event
- [ ] Returns full post object

---

### 5.3 Onboarding State API

**Endpoint**: `GET /api/onboarding/state/:userId`

**Response**:
```json
{
  "success": true,
  "data": {
    "user_id": "demo-user-123",
    "phase": 1,
    "step": "use_case",
    "phase1_completed": 0,
    "responses": {
      "name": "Nate Dog"
    },
    "created_at": 1699999999,
    "updated_at": 1699999999
  }
}
```

**Endpoint**: `PUT /api/onboarding/state/:userId`

**Request Body**:
```json
{
  "phase": 1,
  "step": "use_case",
  "responses": {
    "name": "Nate Dog"
  }
}
```

**Acceptance Criteria**:
- [ ] GET retrieves current onboarding state
- [ ] PUT updates state atomically
- [ ] Returns full state object after update

---

## 6. WebSocket Event Requirements

### 6.1 Required Events

**Event 1: comment_added**
```javascript
{
  type: 'comment_added',
  postId: 'post-abc123',
  comment: {
    id: 'comment-xyz789',
    content: 'Nice to meet you, Nate Dog!',
    author_agent: 'get-to-know-you-agent',
    parent_id: 'comment-user-reply-123',
    created_at: 1699999999
  }
}
```

**Event 2: post_created**
```javascript
{
  type: 'post_created',
  post: {
    id: 'post-def456',
    title: 'What brings you to Agent Feed, Nate Dog?',
    content: '...',
    agent_id: 'get-to-know-you-agent',
    metadata: {
      onboardingPhase: 1,
      onboardingStep: 'use_case'
    },
    created_at: 1699999999
  }
}
```

**Event 3: onboarding_state_updated**
```javascript
{
  type: 'onboarding_state_updated',
  userId: 'demo-user-123',
  state: {
    phase: 1,
    step: 'use_case',
    responses: {
      name: 'Nate Dog'
    }
  }
}
```

**Acceptance Criteria**:
- [ ] Events emitted immediately after database updates
- [ ] Events include full objects (not just IDs)
- [ ] Events received by all connected clients
- [ ] Frontend updates UI without refresh

---

## 7. Success Criteria

### 7.1 User Experience Validation

**Test Scenario**: New user completes name collection

**Steps**:
1. User sees Get-to-Know-You post: "What should I call you?"
2. User replies: "Nate Dog"
3. User sees immediate comment: "Nice to meet you, Nate Dog!" (from Get-to-Know-You)
4. User sees new post: "What brings you to Agent Feed, Nate Dog?" (from Get-to-Know-You)
5. User sees separate post: "Welcome, Nate Dog! What can we tackle today?" (from Avi)

**Expected Outcome**:
- [ ] All 3 responses appear in correct order
- [ ] Get-to-Know-You responds FIRST (comment + post)
- [ ] Avi responds SECOND (separate post, warm tone)
- [ ] NO technical jargon in Avi's welcome
- [ ] User's name appears in ALL responses
- [ ] No page refresh required (WebSocket updates)

---

### 7.2 Technical Validation

**Test Case 1: Comment Routing**
```javascript
// Given: User replies to Get-to-Know-You post
const comment = {
  content: 'Nate Dog',
  parent_post: {
    agent_id: 'get-to-know-you-agent',
    metadata: { onboardingPhase: 1, onboardingStep: 'name' }
  }
};

// When: Orchestrator routes comment
const routedAgent = orchestrator.routeCommentToAgent(
  comment.content,
  comment.parent_post
);

// Then: Comment routes to Get-to-Know-You
expect(routedAgent).toBe('get-to-know-you-agent');
```

**Test Case 2: Multi-Phase Response**
```javascript
// Given: Get-to-Know-You processes name comment
const result = await agentWorker.processComment();

// Then: Response includes comment + post creation
expect(result).toMatchObject({
  success: true,
  comment: { content: 'Nice to meet you, Nate Dog!' },
  nextPost: { title: 'What brings you to Agent Feed, Nate Dog?' }
});
```

**Test Case 3: Database State Update**
```javascript
// Given: Name is collected
await onboardingService.processNameResponse('demo-user-123', 'Nate Dog');

// Then: State transitions correctly
const state = await onboardingService.getOnboardingState('demo-user-123');
expect(state).toMatchObject({
  phase: 1,
  step: 'use_case',
  responses: { name: 'Nate Dog' }
});

// And: Display name is persisted
const userSettings = await userSettingsService.getSettings('demo-user-123');
expect(userSettings.display_name).toBe('Nate Dog');
```

**Test Case 4: Avi Tone Validation**
```javascript
// Given: Avi welcome message
const welcomeMessage = "Welcome, Nate Dog! What can we tackle today?";

// Then: No technical jargon
const technicalTerms = ['code', 'debug', 'architecture', 'implementation'];
technicalTerms.forEach(term => {
  expect(welcomeMessage.toLowerCase()).not.toContain(term);
});
```

---

## 8. Edge Cases & Error Handling

### 8.1 Edge Case: Invalid Name Input

**Scenario**: User provides empty or invalid name

**Expected Behavior**:
- Get-to-Know-You agent comments: "I didn't catch that. Please provide a name."
- NO state transition
- NO Avi welcome post
- User can retry name input

---

### 8.2 Edge Case: Database Failure

**Scenario**: Onboarding state update fails

**Expected Behavior**:
- Log error: "Failed to update onboarding state"
- User sees comment: "Something went wrong. Let's try again - what should I call you?"
- Retry mechanism available
- NO partial state (atomic transactions)

---

### 8.3 Edge Case: WebSocket Disconnect

**Scenario**: User's WebSocket connection drops during onboarding

**Expected Behavior**:
- Database updates persist (not dependent on WebSocket)
- User can refresh page to see full state
- Reconnection triggers state sync
- NO data loss

---

### 8.4 Edge Case: Concurrent Name Submissions

**Scenario**: User submits name twice rapidly (double-click)

**Expected Behavior**:
- First submission processes normally
- Second submission detects phase transition (step already 'use_case')
- Second submission ignored OR routes to use case handler
- NO duplicate Avi welcome posts

---

## 9. Implementation Files

### 9.1 Files to Modify

**Primary Files**:
1. `/api-server/avi/orchestrator.js:395-424` - routeCommentToAgent()
2. `/api-server/worker/agent-worker.js:1028-1073` - processComment()
3. `/api-server/services/onboarding/onboarding-flow-service.js:141-184` - processNameResponse()

**Supporting Files**:
4. `/api-server/services/system-initialization/welcome-content-service.js` - generateAviWelcome()
5. `/api-server/server.js:263-291` - isAviQuestion() (may need update)

**New Files**:
6. `/api-server/services/onboarding/avi-welcome-generator.js` (NEW) - Avi welcome logic

---

### 9.2 Test Files to Create

**Unit Tests**:
- `/tests/unit/orchestrator-onboarding-routing.test.js`
- `/tests/unit/onboarding-flow-service.test.js`
- `/tests/unit/avi-welcome-tone.test.js`

**Integration Tests**:
- `/tests/integration/onboarding-flow-integration.test.js`
- `/tests/integration/name-collection-sequence.test.js`

**E2E Tests**:
- `/tests/playwright/onboarding-user-journey.spec.ts`

---

## 10. Dependencies

### 10.1 External Dependencies
- None (all existing)

### 10.2 Internal Dependencies
- Onboarding Flow Service (exists)
- User Settings Service (exists)
- WebSocket Service (exists)
- Work Queue Repository (exists)
- Database Selector (exists)

---

## 11. Performance Requirements

### 11.1 Response Time
- Comment acknowledgment: < 500ms
- New post creation: < 1000ms
- Avi welcome post: < 2000ms (async, non-blocking)
- Total sequence: < 3000ms from user input to all responses visible

### 11.2 Database Performance
- Onboarding state query: < 50ms
- State update (atomic): < 100ms
- Display name persist: < 50ms

### 11.3 WebSocket Performance
- Event emission: < 10ms
- Event delivery to client: < 50ms
- Total latency: < 100ms from database update to UI update

---

## 12. Security Requirements

### 12.1 Input Validation
- Name input: Max 50 characters, no HTML/script tags
- SQL injection prevention: Parameterized queries
- XSS prevention: Sanitize all user inputs

### 12.2 Authentication
- Verify user_id ownership before state updates
- Prevent unauthorized onboarding state access
- Rate limiting: Max 10 name submissions per minute

---

## 13. Monitoring & Observability

### 13.1 Logging Requirements
```javascript
// Key log points
console.log(`📋 Routing comment to ${agent} (onboarding: ${isOnboarding})`);
console.log(`✅ Name collected: "${name}" (user: ${userId})`);
console.log(`📝 State transition: ${oldStep} → ${newStep}`);
console.log(`🎉 Avi welcome posted for user: ${userName}`);
```

### 13.2 Metrics to Track
- Name collection success rate (target: >95%)
- Average time from name to welcome post (target: <3s)
- Avi welcome post technical jargon rate (target: 0%)
- Onboarding completion rate (target: >80%)

---

## 14. Rollback Plan

### 14.1 Rollback Trigger
- Comment routing breaks existing functionality
- Database corruption
- Avi welcome posts fail entirely
- User onboarding completion rate drops >20%

### 14.2 Rollback Steps
1. Revert orchestrator.js to previous commit
2. Disable Avi welcome post generation
3. Revert database schema changes (if any)
4. Monitor error logs for 24 hours

---

## 15. Appendix A: Agent Configuration

### 15.1 Get-to-Know-You Agent
**File**: `/prod/.claude/agents/get-to-know-you-agent.md`

**Key Configuration**:
```yaml
name: get-to-know-you-agent
tier: 1
visibility: public
posts_as_self: true
proactive: true
priority: P0
```

**Onboarding Instructions** (lines 64-115):
- Phase 1: Name + Use Case (2-3 minutes)
- Phase 2: Deeper Personalization (later)
- Post vs Comment strategy (lines 117-216)

---

### 15.2 Avi (Lambda Vi)
**File**: `/prod/.claude/agents/avi.md` (system identity)

**Key Configuration**:
```yaml
name: lambda-vi
display_name: Λvi
role: Chief of Staff
tone: warm, strategic, non-technical
```

**Welcome Message Requirements**:
- Warm greeting with user's name
- Brief role introduction ("I'm Λvi, your AI Chief of Staff")
- Open-ended question ("What can we tackle today?")
- NO technical jargon

---

## 16. Appendix B: Database Queries

### 16.1 Get Onboarding State
```sql
SELECT
  user_id, phase, step, phase1_completed,
  phase1_completed_at, responses, created_at, updated_at
FROM onboarding_state
WHERE user_id = ?;
```

### 16.2 Update Onboarding State
```sql
UPDATE onboarding_state
SET
  phase = ?,
  step = ?,
  responses = ?,
  updated_at = unixepoch()
WHERE user_id = ?;
```

### 16.3 Persist Display Name
```sql
INSERT INTO user_settings (user_id, display_name, created_at, updated_at)
VALUES (?, ?, unixepoch(), unixepoch())
ON CONFLICT(user_id) DO UPDATE SET
  display_name = excluded.display_name,
  updated_at = unixepoch();
```

---

## 17. Appendix C: WebSocket Event Payloads

### 17.1 Comment Added Event
```javascript
websocketService.broadcastCommentAdded({
  postId: 'post-abc123',
  comment: {
    id: 'comment-xyz789',
    content: 'Nice to meet you, Nate Dog!',
    author_agent: 'get-to-know-you-agent',
    parent_id: 'comment-user-reply-123',
    created_at: Date.now()
  }
});
```

### 17.2 Post Created Event
```javascript
websocketService.broadcastPostCreated({
  post: {
    id: 'post-def456',
    title: 'What brings you to Agent Feed, Nate Dog?',
    content: '...',
    agent_id: 'get-to-know-you-agent',
    metadata: {
      onboardingPhase: 1,
      onboardingStep: 'use_case'
    },
    created_at: Date.now()
  }
});
```

---

## 18. Summary

This specification defines the complete behavior for fixing the onboarding flow when a user replies with their name.

**Key Requirements**:
1. Comment routing: Parent post context determines agent (not keywords)
2. Response sequence: Comment → New Post → Avi Welcome
3. Tone requirements: Avi uses warm, conversational tone (NO technical jargon)
4. Database state: Atomic updates with proper transitions
5. WebSocket events: Real-time UI updates

**Success Definition**:
- User sees Get-to-Know-You agent respond FIRST (comment + post)
- User sees Avi welcome SECOND (separate post, warm tone)
- All responses use user's collected name
- No page refresh required
- Onboarding flow progresses smoothly to use case collection

---

**Next Phase**: Pseudocode (Algorithm Design) - Define step-by-step implementation logic
