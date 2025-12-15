# SPARC Specification: Toast Notification Backend Event Emission Fix

## Document Metadata
- **Created**: 2025-11-13
- **Methodology**: SPARC (Specification Phase)
- **Issue**: Missing progressive toast notifications (only 1 of 4 toasts displayed)
- **Root Cause**: Backend orchestrator not emitting `ticket:status:update` WebSocket events
- **Severity**: High (User Experience Impact)

---

## 1. Problem Statement

### 1.1 Current Behavior (BROKEN)
When a user creates a post, they currently see:
1. ✅ "Post created successfully!" (from API response)
2. ❌ Missing: "⏳ Queued for agent processing..."
3. ❌ Missing: "🤖 Agent is analyzing your post..."
4. ❌ Missing: "✅ Agent response posted!"

### 1.2 Expected Behavior (TO BE FIXED)
Users should see 4 progressive toast notifications:
1. ✅ "Post created successfully!" (already working)
2. ⏳ "Queued for agent processing..." (pending status)
3. 🤖 "Agent is analyzing your post..." (processing status)
4. ✅ "Agent response posted!" (completed status)

### 1.3 User Impact
- **Perceived Performance**: Users think the system is unresponsive
- **Transparency**: No visibility into backend processing state
- **Engagement**: Users don't know when to expect agent responses
- **Trust**: Creates uncertainty about whether their post was processed

---

## 2. Root Cause Analysis

### 2.1 Investigation Summary
- **Frontend WebSocket Listener**: ✅ Correctly implemented at `/workspaces/agent-feed/frontend/src/components/RealSocialMediaFeed.tsx`
- **Backend WebSocket Service**: ✅ Running and accepting connections at `/workspaces/agent-feed/api-server/services/websocket-service.js`
- **Agent Worker Event Emission**: ✅ Implemented in `/workspaces/agent-feed/api-server/worker/agent-worker.js`

### 2.2 Root Cause Identified
**Location**: `/workspaces/agent-feed/api-server/server.js` (lines 1158-1200)

**The Problem**:
- Ticket is created successfully (line 1168)
- BUT: No "pending" WebSocket event is emitted after ticket creation
- Backend orchestrator logs show: `tickets_processed: 0`
- This means orchestrator is NOT picking up tickets OR not emitting events during processing

### 2.3 Evidence from Code Analysis

#### Server.js (Post Creation Endpoint)
```javascript
// Line 1168: Ticket created successfully
ticket = await workQueueSelector.repository.createTicket({
  user_id: userId,
  post_id: createdPost.id,
  post_content: createdPost.content,
  post_author: createdPost.author_agent,
  post_metadata: { ... },
  assigned_agent: null,
  priority: 5
});

console.log(`✅ Work ticket created for orchestrator: ticket-${ticket.id}`);

// ❌ MISSING: No WebSocket event emission here for "pending" status
// Should emit: websocketService.emitTicketStatusUpdate({ status: 'pending', ... })

// Line 1224: Response returned to client
res.status(201).json({ success: true, data: createdPost, ticket: ... });
```

#### Orchestrator.js (Ticket Processing)
```javascript
// Line 207: Ticket marked as in_progress
await this.workQueueRepo.updateTicketStatus(ticket.id.toString(), 'in_progress');

// ❌ MISSING: No WebSocket event emission here for "processing" status
// Worker emits events via agent-worker.js lines 30-48, BUT orchestrator doesn't

// Line 230: Ticket completed
await this.workQueueRepo.completeTicket(ticket.id.toString(), { result, tokens_used });

// ❌ MISSING: No WebSocket event emission here for "completed" status
```

#### Agent Worker (Current Implementation - CORRECT)
```javascript
// Lines 30-48: emitStatusUpdate method EXISTS and is called
emitStatusUpdate(status, options = {}) {
  if (!this.websocketService || !this.websocketService.isInitialized()) {
    return; // Silently skip if WebSocket not available
  }

  const payload = {
    post_id: this.postId,
    ticket_id: this.ticketId,
    status: status,
    agent_id: this.agentId,
    timestamp: new Date().toISOString()
  };

  this.websocketService.emitTicketStatusUpdate(payload);
}

// Line 63: Processing event emitted (WORKS)
this.emitStatusUpdate('processing');

// Line 75: Completed event emitted (WORKS)
this.emitStatusUpdate('completed');
```

**Analysis**: Agent worker emits events correctly, BUT:
1. Orchestrator never emits "pending" after creating ticket in server.js
2. Orchestrator processes tickets in `processWorkQueue()` but doesn't call worker's `emitStatusUpdate()` for orchestrator-level events

---

## 3. Technical Requirements

### 3.1 Functional Requirements

#### FR-1: Post Creation Pending Event
**Requirement**: Emit "pending" WebSocket event immediately after ticket creation
**Location**: `/workspaces/agent-feed/api-server/server.js` (after line 1192)
**Event Payload**:
```json
{
  "post_id": "post-123",
  "ticket_id": "ticket-456",
  "status": "pending",
  "agent_id": null,
  "timestamp": "2025-11-13T12:34:56.789Z"
}
```

#### FR-2: Orchestrator Processing Event
**Requirement**: Emit "processing" WebSocket event when orchestrator marks ticket as in_progress
**Location**: `/workspaces/agent-feed/api-server/avi/orchestrator.js` (after line 208)
**Event Payload**:
```json
{
  "post_id": "post-123",
  "ticket_id": "ticket-456",
  "status": "processing",
  "agent_id": "avi",
  "timestamp": "2025-11-13T12:35:00.123Z"
}
```

#### FR-3: Orchestrator Completion Event
**Requirement**: Emit "completed" WebSocket event when ticket processing completes
**Location**: `/workspaces/agent-feed/api-server/avi/orchestrator.js` (after line 230)
**Event Payload**:
```json
{
  "post_id": "post-123",
  "ticket_id": "ticket-456",
  "status": "completed",
  "agent_id": "avi",
  "timestamp": "2025-11-13T12:35:15.456Z"
}
```

#### FR-4: Comment Ticket Pending Event
**Requirement**: Emit "pending" WebSocket event for comment tickets
**Location**: `/workspaces/agent-feed/api-server/server.js` (after line 1720 for comments)
**Event Payload**: Same structure as FR-1

### 3.2 Non-Functional Requirements

#### NFR-1: Event Emission Timing
- **Pending Event**: < 100ms after ticket creation
- **Processing Event**: < 100ms after orchestrator picks up ticket
- **Completed Event**: < 100ms after worker completes processing

#### NFR-2: Event Reliability
- Events must be emitted even if no WebSocket clients are connected
- Failed event emissions must NOT break ticket processing flow
- Events must be idempotent (safe to emit multiple times)

#### NFR-3: WebSocket Service Availability
- Handle gracefully when WebSocket service is not initialized
- Log warnings but don't crash server if WebSocket fails
- Maintain backward compatibility with systems that don't use WebSocket

---

## 4. Event Emission Sequence

### 4.1 Complete Event Flow (Timeline)

```
T0: User clicks "Create Post"
    ↓
T1: POST /api/v1/agent-posts
    ↓
T2: Database creates post record
    ↓ (✅ Already working)
T3: API returns 201 response → Toast 1: "Post created successfully!"
    ↓
T4: workQueueSelector.repository.createTicket()
    ↓ (❌ MISSING - Fix #1)
T5: websocketService.emitTicketStatusUpdate({ status: 'pending' })
    ↓ → Toast 2: "⏳ Queued for agent processing..."
    ↓
T6: Orchestrator picks up ticket in processWorkQueue()
    ↓
T7: orchestrator.updateTicketStatus(id, 'in_progress')
    ↓ (❌ MISSING - Fix #2)
T8: websocketService.emitTicketStatusUpdate({ status: 'processing' })
    ↓ → Toast 3: "🤖 Agent is analyzing your post..."
    ↓
T9: Worker executes and completes processing
    ↓
T10: orchestrator.completeTicket(id, result)
    ↓ (❌ MISSING - Fix #3)
T11: websocketService.emitTicketStatusUpdate({ status: 'completed' })
    ↓ → Toast 4: "✅ Agent response posted!"
```

### 4.2 Event Dependencies

```
Event 1 (pending) → Independent (emitted immediately after ticket creation)
Event 2 (processing) → Depends on orchestrator picking up ticket
Event 3 (completed) → Depends on worker finishing processing
Event 4 (failed) → Alternative to Event 3 if processing fails
```

---

## 5. Code Changes Required

### 5.1 Change #1: Server.js - Emit Pending Event After Post Ticket Creation

**File**: `/workspaces/agent-feed/api-server/server.js`
**Location**: After line 1192
**Priority**: P0 (Critical)

```javascript
// EXISTING CODE (line 1168-1192)
ticket = await workQueueSelector.repository.createTicket({
  user_id: userId,
  post_id: createdPost.id,
  post_content: createdPost.content,
  post_author: createdPost.author_agent,
  post_metadata: { ... },
  assigned_agent: null,
  priority: 5
});

console.log(`✅ Work ticket created for orchestrator: ticket-${ticket.id}`);

// ✅ NEW CODE TO ADD (after line 1192)
// Emit "pending" WebSocket event
if (websocketService && websocketService.isInitialized()) {
  websocketService.emitTicketStatusUpdate({
    post_id: createdPost.id,
    ticket_id: ticket.id,
    status: 'pending',
    agent_id: null, // Not assigned yet
    timestamp: new Date().toISOString()
  });
  console.log(`📡 Emitted pending event for ticket ${ticket.id}`);
}
```

### 5.2 Change #2: Server.js - Emit Pending Event After Comment Ticket Creation

**File**: `/workspaces/agent-feed/api-server/server.js`
**Location**: After line 1720 (comment endpoint)
**Priority**: P0 (Critical)

```javascript
// EXISTING CODE (line 1689-1720)
ticket = await workQueueSelector.repository.createTicket({
  user_id: userId,
  post_id: createdComment.id,
  post_content: createdComment.content,
  post_author: createdComment.author_agent,
  post_metadata: { ... }
});

console.log(`✅ Comment ticket created: ${ticket.id}`);

// ✅ NEW CODE TO ADD (after line 1720)
// Emit "pending" WebSocket event for comment ticket
if (websocketService && websocketService.isInitialized()) {
  websocketService.emitTicketStatusUpdate({
    post_id: createdComment.parent_post_id || postId,
    ticket_id: ticket.id,
    status: 'pending',
    agent_id: null,
    timestamp: new Date().toISOString()
  });
  console.log(`📡 Emitted pending event for comment ticket ${ticket.id}`);
}
```

### 5.3 Change #3: Orchestrator.js - Emit Processing Event

**File**: `/workspaces/agent-feed/api-server/avi/orchestrator.js`
**Location**: After line 208
**Priority**: P0 (Critical)

```javascript
// EXISTING CODE (line 207-209)
// Mark ticket as in_progress
await this.workQueueRepo.updateTicketStatus(ticket.id.toString(), 'in_progress');

// ✅ NEW CODE TO ADD (after line 208)
// Emit "processing" WebSocket event
if (this.websocketService && this.websocketService.isInitialized()) {
  this.websocketService.emitTicketStatusUpdate({
    post_id: ticket.post_id,
    ticket_id: ticket.id.toString(),
    status: 'processing',
    agent_id: ticket.agent_id,
    timestamp: new Date().toISOString()
  });
  console.log(`📡 Emitted processing event for ticket ${ticket.id}`);
}
```

### 5.4 Change #4: Orchestrator.js - Emit Completed Event

**File**: `/workspaces/agent-feed/api-server/avi/orchestrator.js`
**Location**: After line 230
**Priority**: P0 (Critical)

```javascript
// EXISTING CODE (line 228-233)
.then(async (result) => {
  console.log(`✅ Worker ${workerId} completed successfully`);
  this.ticketsProcessed++;

  // Mark ticket as completed
  await this.workQueueRepo.completeTicket(ticket.id.toString(), {
    result: result.response,
    tokens_used: result.tokensUsed || 0
  });

  // ✅ NEW CODE TO ADD (after line 233)
  // Emit "completed" WebSocket event
  if (this.websocketService && this.websocketService.isInitialized()) {
    this.websocketService.emitTicketStatusUpdate({
      post_id: ticket.post_id,
      ticket_id: ticket.id.toString(),
      status: 'completed',
      agent_id: ticket.agent_id,
      timestamp: new Date().toISOString()
    });
    console.log(`📡 Emitted completed event for ticket ${ticket.id}`);
  }
})
```

### 5.5 Change #5: Orchestrator.js - Emit Failed Event

**File**: `/workspaces/agent-feed/api-server/avi/orchestrator.js`
**Location**: After line 239
**Priority**: P0 (Critical)

```javascript
// EXISTING CODE (line 235-239)
.catch(async (error) => {
  console.error(`❌ Worker ${workerId} failed:`, error);

  // Mark ticket as failed (with retry logic)
  await this.workQueueRepo.failTicket(ticket.id.toString(), error.message);

  // ✅ NEW CODE TO ADD (after line 239)
  // Emit "failed" WebSocket event
  if (this.websocketService && this.websocketService.isInitialized()) {
    this.websocketService.emitTicketStatusUpdate({
      post_id: ticket.post_id,
      ticket_id: ticket.id.toString(),
      status: 'failed',
      agent_id: ticket.agent_id,
      timestamp: new Date().toISOString(),
      error: error.message
    });
    console.log(`📡 Emitted failed event for ticket ${ticket.id}`);
  }
})
```

### 5.6 Change #6: Orchestrator.js - Comment Ticket Processing Events

**File**: `/workspaces/agent-feed/api-server/avi/orchestrator.js`
**Location**: After line 282 (comment ticket processing)
**Priority**: P0 (Critical)

```javascript
// EXISTING CODE (line 282)
await this.workQueueRepo.updateTicketStatus(ticket.id.toString(), 'in_progress');

// ✅ NEW CODE TO ADD (after line 282)
// Emit "processing" event for comment tickets
if (this.websocketService && this.websocketService.isInitialized()) {
  this.websocketService.emitTicketStatusUpdate({
    post_id: ticket.metadata?.parent_post_id || ticket.post_id,
    ticket_id: ticket.id.toString(),
    status: 'processing',
    agent_id: agent,
    timestamp: new Date().toISOString()
  });
  console.log(`📡 Emitted processing event for comment ticket ${ticket.id}`);
}
```

---

## 6. Testing Strategy

### 6.1 Unit Tests

#### Test Suite 1: WebSocket Event Emission
**File**: `/workspaces/agent-feed/api-server/tests/unit/websocket-event-emission.test.js`

```javascript
describe('WebSocket Event Emission', () => {
  test('Should emit pending event after post ticket creation', async () => {
    const mockWebSocketService = {
      isInitialized: () => true,
      emitTicketStatusUpdate: jest.fn()
    };

    // Create ticket and verify pending event
    const ticket = await createTicket({ ... });

    expect(mockWebSocketService.emitTicketStatusUpdate).toHaveBeenCalledWith({
      post_id: expect.any(String),
      ticket_id: expect.any(String),
      status: 'pending',
      agent_id: null,
      timestamp: expect.any(String)
    });
  });

  test('Should emit processing event when orchestrator picks up ticket', async () => {
    // Similar test for processing event
  });

  test('Should emit completed event when worker finishes', async () => {
    // Similar test for completed event
  });

  test('Should handle gracefully when WebSocket not initialized', async () => {
    // Test that ticket processing continues even if WebSocket fails
  });
});
```

### 6.2 Integration Tests

#### Test Suite 2: End-to-End Toast Notification Flow
**File**: `/workspaces/agent-feed/tests/e2e/toast-notification-flow.spec.ts`

```typescript
describe('E2E: Toast Notification Flow', () => {
  test('Should emit all 4 events in correct sequence', async () => {
    const eventSequence = [];

    // Setup WebSocket listener
    socket.on('ticket:status:update', (event) => {
      eventSequence.push(event.status);
    });

    // Create post
    await page.goto('http://localhost:3001');
    await page.fill('textarea', 'Test post content');
    await page.click('button[type="submit"]');

    // Wait for all events
    await page.waitForTimeout(10000); // 10s max

    // Verify event sequence
    expect(eventSequence).toEqual(['pending', 'processing', 'completed']);
  });

  test('Should display 4 toast notifications to user', async () => {
    // Visual test using Playwright
    await page.fill('textarea', 'Test post');
    await page.click('button[type="submit"]');

    // Verify toasts appear in sequence
    await expect(page.locator('text=Post created successfully')).toBeVisible();
    await expect(page.locator('text=Queued for agent processing')).toBeVisible();
    await expect(page.locator('text=Agent is analyzing')).toBeVisible();
    await expect(page.locator('text=Agent response posted')).toBeVisible();
  });
});
```

### 6.3 Manual Testing Checklist

- [ ] Create post and verify 4 toasts appear in browser console
- [ ] Check WebSocket events in browser DevTools Network tab
- [ ] Verify backend logs show event emission confirmations
- [ ] Test with WebSocket disconnected (should handle gracefully)
- [ ] Test with comment creation (should also emit events)
- [ ] Test with failed ticket processing (should emit failed event)

---

## 7. Success Criteria

### 7.1 Primary Success Metrics
- ✅ User sees 4 distinct toast notifications (pending, processing, completed)
- ✅ Events emitted in correct chronological order
- ✅ Event timing matches NFR-1 requirements (< 100ms latency)
- ✅ 100% of post creations emit all events (no missing events)

### 7.2 Quality Metrics
- ✅ No console errors related to WebSocket events
- ✅ Backend logs confirm event emission for every ticket
- ✅ WebSocket event count matches ticket count (1:1 ratio)
- ✅ Orchestrator metrics show `tickets_processed > 0`

### 7.3 User Experience Metrics
- ✅ Users report increased transparency into backend processing
- ✅ Reduced support tickets about "is my post being processed?"
- ✅ Improved perceived responsiveness of the system

---

## 8. Implementation Checklist

### Phase 1: Code Changes (Day 1)
- [ ] Change #1: Emit pending event in server.js (post creation)
- [ ] Change #2: Emit pending event in server.js (comment creation)
- [ ] Change #3: Emit processing event in orchestrator.js
- [ ] Change #4: Emit completed event in orchestrator.js
- [ ] Change #5: Emit failed event in orchestrator.js
- [ ] Change #6: Emit events for comment ticket processing

### Phase 2: Testing (Day 2)
- [ ] Write unit tests for event emission
- [ ] Write integration tests for E2E flow
- [ ] Run manual testing checklist
- [ ] Verify in dev environment with real WebSocket client

### Phase 3: Deployment (Day 3)
- [ ] Deploy to staging environment
- [ ] Run smoke tests in staging
- [ ] Monitor WebSocket metrics for 24 hours
- [ ] Deploy to production with rollback plan

### Phase 4: Validation (Day 4)
- [ ] Monitor production logs for event emission
- [ ] Check user feedback/support tickets
- [ ] Verify success criteria are met
- [ ] Document lessons learned

---

## 9. Risks and Mitigations

### Risk 1: WebSocket Service Failure
**Impact**: High (no events emitted)
**Likelihood**: Low
**Mitigation**:
- Add try-catch blocks around all event emissions
- Log warnings but don't crash server
- Implement health check endpoint for WebSocket service

### Risk 2: Event Flooding
**Impact**: Medium (performance degradation)
**Likelihood**: Medium
**Mitigation**:
- Rate limit event emissions (max 10 events/second per ticket)
- Implement event batching for high-volume scenarios
- Monitor WebSocket bandwidth usage

### Risk 3: Frontend Not Receiving Events
**Impact**: High (no toasts displayed)
**Likelihood**: Low
**Mitigation**:
- Frontend already tested and working (from investigation)
- Add fallback polling mechanism if WebSocket fails
- Implement reconnection logic in frontend

---

## 10. Acceptance Criteria

### 10.1 Functional Acceptance
- [ ] All 4 toast notifications appear for every post creation
- [ ] Events are emitted in correct order: pending → processing → completed
- [ ] Failed tickets emit "failed" event instead of "completed"
- [ ] Comment tickets also emit all events correctly

### 10.2 Non-Functional Acceptance
- [ ] Event emission latency < 100ms (measured via logs)
- [ ] No performance degradation in ticket processing throughput
- [ ] System handles WebSocket unavailability gracefully
- [ ] 100% backward compatibility with existing systems

### 10.3 Validation Acceptance
- [ ] Unit tests pass with 100% coverage on new code
- [ ] Integration tests pass on staging environment
- [ ] Manual testing checklist completed successfully
- [ ] Production monitoring shows all events being emitted

---

## 11. References

### 11.1 Related Files
- `/workspaces/agent-feed/api-server/server.js` (lines 1104-1240)
- `/workspaces/agent-feed/api-server/avi/orchestrator.js` (lines 166-254)
- `/workspaces/agent-feed/api-server/worker/agent-worker.js` (lines 30-91)
- `/workspaces/agent-feed/api-server/services/websocket-service.js` (lines 112-153)
- `/workspaces/agent-feed/frontend/src/components/RealSocialMediaFeed.tsx` (WebSocket listener)

### 11.2 WebSocket Event Schema
```typescript
interface TicketStatusUpdateEvent {
  post_id: string;        // Post ID that triggered the ticket
  ticket_id: string;      // Work queue ticket ID
  status: 'pending' | 'processing' | 'completed' | 'failed';
  agent_id: string | null; // Agent assigned to ticket (null for pending)
  timestamp: string;      // ISO 8601 timestamp
  error?: string;         // Error message (only for failed status)
}
```

### 11.3 Toast Notification Mapping
| WebSocket Status | Toast Message | Toast Type | Icon |
|-----------------|---------------|------------|------|
| `pending` | "⏳ Queued for agent processing..." | info | ⏳ |
| `processing` | "🤖 Agent is analyzing your post..." | info | 🤖 |
| `completed` | "✅ Agent response posted!" | success | ✅ |
| `failed` | "❌ Agent processing failed" | error | ❌ |

---

## 12. Summary

This specification addresses the missing toast notification issue by identifying the root cause: **backend orchestrator is not emitting WebSocket events** at critical points in the ticket lifecycle.

**Key Changes Required**:
1. Emit "pending" event immediately after ticket creation (server.js)
2. Emit "processing" event when orchestrator picks up ticket (orchestrator.js)
3. Emit "completed" event when worker finishes processing (orchestrator.js)
4. Emit "failed" event if processing fails (orchestrator.js)

**Expected Outcome**: Users will see 4 progressive toast notifications, providing transparency into backend processing state and improving perceived responsiveness.

**Implementation Effort**: ~2 days (1 day coding + 1 day testing)
**Risk Level**: Low (isolated changes, graceful fallbacks)
**User Impact**: High (significantly improves UX)

---

**Next Phase**: Move to Pseudocode phase for detailed implementation logic and error handling patterns.
