# SPARC Specification: Badge Real-Time Update Fix

## Document Information

**Version:** 1.0.0
**Created:** 2025-10-24
**Status:** Draft
**Priority:** High
**Category:** Bug Fix / Performance Enhancement
**Estimated Effort:** 2 hours

---

## Executive Summary

Badge status indicators do not update in real-time when WebSocket events arrive. Users must manually refresh the page to see updated badge status (pending -> processing -> completed). This creates a poor user experience and defeats the purpose of real-time WebSocket updates.

**Root Cause:** Field name mismatch between WebSocket hook cache update (camelCase `ticketStatus`) and badge component reader (snake_case `ticket_status`).

**Impact:** High - Affects all proactive agent workflows (link-logger, content-analyzer, etc.)

**Solution Complexity:** Low - Single field name alignment in cache update logic

---

## 1. Functional Requirements

### FR-001: Real-Time Badge Updates
**Priority:** Critical
**Description:** Badge must update in real-time when WebSocket `ticket:status:update` event is received, without requiring page refresh.

**Acceptance Criteria:**
- Badge status changes from "pending" to "processing" within 500ms of WebSocket event
- Badge status changes from "processing" to "completed" within 500ms of WebSocket event
- Badge status changes reflect immediately in UI without API refetch
- User does not need to refresh page to see status updates

**Measurement:**
- Time from WebSocket event received to badge visual update: < 500ms
- Success rate: 100% of status updates trigger badge re-render

---

### FR-002: Correct Status Display
**Priority:** Critical
**Description:** Badge must show correct status matching server state for all ticket lifecycle stages.

**Acceptance Criteria:**
- Badge displays "pending" status with amber styling when ticket awaiting worker
- Badge displays "processing" status with blue styling and spinning icon when worker active
- Badge displays "completed" status with green styling when worker finished successfully
- Badge displays "failed" status with red styling when worker encountered error

**Validation:**
- Status values match enum: `'pending' | 'processing' | 'completed' | 'failed'`
- Visual styling matches STATUS_CONFIG in TicketStatusBadge.jsx
- Icon animations work correctly (spinning loader for processing)

---

### FR-003: Toast Notifications (Preserve Existing)
**Priority:** Medium
**Description:** Toast notifications must continue working as currently implemented (already functional).

**Acceptance Criteria:**
- Success toast shown on completed status
- Error toast shown on failed status
- Info toast shown on processing status
- Toast notifications independent of badge updates

**Note:** No changes required - validation only

---

### FR-004: Data Consistency
**Priority:** Critical
**Description:** Badge data must remain consistent with server state, preventing cache drift.

**Acceptance Criteria:**
- Cache invalidation triggers after cache update (dual strategy)
- Server refetch confirms WebSocket update accuracy
- No stale data displayed after status transitions
- Race conditions handled (late events discarded)

**Technical Validation:**
- React Query cache shows snake_case `ticket_status` field
- API response structure preserved in cache
- `queryClient.invalidateQueries(['posts'])` called after cache update

---

### FR-005: Status Transition Handling
**Priority:** High
**Description:** Badge must handle all valid status transitions in ticket lifecycle.

**Valid Transitions:**
```
pending -> processing -> completed
pending -> processing -> failed
pending -> failed (timeout/spawn error)
```

**Acceptance Criteria:**
- All valid transitions update badge correctly
- Invalid transitions logged but don't break UI
- Partial transitions handled (e.g., missed "processing" event)
- Status can only move forward (no completed -> pending)

**Edge Cases:**
- Multiple rapid status changes (debounced by React)
- Out-of-order events (timestamp validation)
- Duplicate events (idempotent updates)

---

### FR-006: Multi-Agent Support
**Priority:** High
**Description:** Badge must work for all proactive agents with ticket-based workflows.

**Supported Agents:**
- link-logger (primary use case)
- content-analyzer (future)
- sentiment-analyzer (future)
- Any agent using ticket-based processing

**Acceptance Criteria:**
- Agent name displayed correctly in badge
- Multiple tickets for same post show aggregated status
- Agent-specific styling/icons (if configured)

---

### FR-007: Interactive Posts (No Tickets)
**Priority:** Medium
**Description:** Interactive posts without tickets must not show badge (preserve current behavior).

**Acceptance Criteria:**
- Badge only renders when `post.ticket_status.total > 0`
- No badge shown for tier-2 agent posts (posts_as_self: true)
- No badge shown for manual user posts (future feature)
- Conditional rendering logic unchanged

**Validation:**
```jsx
{post.ticket_status && post.ticket_status.total > 0 && (
  <TicketStatusBadge ... />
)}
```

---

## 2. Non-Functional Requirements

### NFR-001: Performance
**Priority:** Critical

| Metric | Target | Measurement |
|--------|--------|-------------|
| Badge update latency | < 500ms | Time from WebSocket event to DOM update |
| Memory leak prevention | 0 leaks | WebSocket listener cleanup on unmount |
| Cache update efficiency | No unnecessary re-renders | React DevTools profiler |
| Bundle size impact | +0 KB | No new dependencies |

**Constraints:**
- No blocking operations during cache update
- Cache updates must be synchronous (no async state drift)
- React Query cache mutations must be immutable

---

### NFR-002: Reliability
**Priority:** High

**Uptime:** 99.9% badge accuracy (matches server state)

**Error Handling:**
- WebSocket disconnection: Badge shows last known state
- Invalid event payload: Logged, badge unchanged
- Missing post_id: Event ignored gracefully
- Malformed status value: Badge hidden, error logged

**Recovery:**
- Auto-reconnect on WebSocket disconnect
- Cache invalidation ensures eventual consistency
- Manual refresh always shows correct state

---

### NFR-003: Browser Compatibility
**Priority:** Medium

**Supported Browsers:**
- Chrome/Edge 90+ (primary)
- Firefox 88+
- Safari 14+

**Testing:**
- WebSocket support required (all modern browsers)
- React 18 concurrent rendering compatible
- No IE11 support needed

---

### NFR-004: Accessibility
**Priority:** Medium

**ARIA Requirements:**
- Badge has `role="status"` (existing)
- Badge has `aria-label` with status description (existing)
- Badge has `aria-live="polite"` for screen readers (existing)
- Status changes announced to assistive tech

**Visual:**
- Color contrast ratio 4.5:1 minimum (existing)
- Status distinguishable without color (icons used)

---

## 3. Technical Specification

### 3.1 Root Cause Analysis

**Current Behavior:**
```javascript
// useTicketUpdates.js line 94 (INCORRECT)
ticketStatus: data.status,  // camelCase
```

**Badge Component Reads:**
```jsx
// RealSocialMediaFeed.tsx line 891 (EXPECTS snake_case)
{post.ticket_status && post.ticket_status.total > 0 && (
  <TicketStatusBadge
    status={getOverallStatus(post.ticket_status)}
    ...
  />
)}
```

**Problem:** Cache update sets `post.ticketStatus` but component reads `post.ticket_status`

---

### 3.2 Solution Design

**Option 1: Fix Cache Update (RECOMMENDED)**
```javascript
// useTicketUpdates.js - Update to snake_case
ticket_status: {
  summary: {
    total: 1,
    pending: data.status === 'pending' ? 1 : 0,
    processing: data.status === 'processing' ? 1 : 0,
    completed: data.status === 'completed' ? 1 : 0,
    failed: data.status === 'failed' ? 1 : 0,
    agents: [data.agent_id]
  },
  has_tickets: true
}
```

**Pros:**
- Matches API response structure
- No component changes needed
- Consistent with backend naming
- Works with existing TypeScript types

**Cons:**
- Slightly more complex cache update logic

---

**Option 2: Fix Badge Component (NOT RECOMMENDED)**
```jsx
// Change component to read camelCase
{post.ticketStatus && ...}
```

**Cons:**
- Breaks API contract
- Requires type changes
- Inconsistent with server response
- May break other components reading ticket_status

---

### 3.3 API Contracts

#### WebSocket Event Structure
```typescript
interface TicketStatusUpdateEvent {
  post_id: string;           // Post identifier
  ticket_id: string;         // Ticket identifier
  status: 'pending' | 'processing' | 'completed' | 'failed';
  agent_id: string;          // e.g., "link-logger-agent"
  timestamp: string;         // ISO 8601 format
  error?: string;            // Present when status === 'failed'
}
```

**Example:**
```json
{
  "post_id": "cm4ac4mnx000008l32rjx0jxh",
  "ticket_id": "cm4ac4mo0000108l3abc123",
  "status": "processing",
  "agent_id": "link-logger-agent",
  "timestamp": "2025-10-24T10:30:45.123Z",
  "error": null
}
```

---

#### API Response Structure (GET /api/v1/agent-posts?includeTickets=true)
```typescript
interface AgentPost {
  id: string;
  content: string;
  authorAgent: string;
  // ... other fields

  // Ticket status (snake_case)
  ticket_status?: {
    summary: TicketStatusData;
    has_tickets: boolean;
  };
}

interface TicketStatusData {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  agents: string[];
}
```

**Example:**
```json
{
  "id": "cm4ac4mnx000008l32rjx0jxh",
  "content": "Check this out: https://example.com",
  "ticket_status": {
    "summary": {
      "total": 1,
      "pending": 0,
      "processing": 1,
      "completed": 0,
      "failed": 0,
      "agents": ["link-logger-agent"]
    },
    "has_tickets": true
  }
}
```

---

#### React Query Cache Structure
```typescript
// Must match API response structure
queryClient.setQueryData(['posts'], (oldData) => {
  // Update post.ticket_status (snake_case)
  return posts.map(post => {
    if (post.id === data.post_id) {
      return {
        ...post,
        ticket_status: {
          summary: {
            total: 1,
            pending: data.status === 'pending' ? 1 : 0,
            processing: data.status === 'processing' ? 1 : 0,
            completed: data.status === 'completed' ? 1 : 0,
            failed: data.status === 'failed' ? 1 : 0,
            agents: [data.agent_id]
          },
          has_tickets: true
        }
      };
    }
    return post;
  });
});
```

---

### 3.4 Implementation Plan

#### File: `/workspaces/agent-feed/frontend/src/hooks/useTicketUpdates.js`

**Lines to Change: 83-135**

**Current Code (BROKEN):**
```javascript
// Lines 83-103
queryClient.setQueryData(['posts'], (oldData) => {
  if (!oldData) return oldData;

  if (Array.isArray(oldData)) {
    return oldData.map(post => {
      if (post.id === data.post_id) {
        return {
          ...post,
          ticketUpdated: Date.now(),
          ticketStatus: data.status,  // ❌ WRONG - camelCase
          lastTicketEvent: {
            ticket_id: data.ticket_id,
            agent_id: data.agent_id,
            status: data.status,
            timestamp: data.timestamp,
            error: data.error || null
          }
        };
      }
      return post;
    });
  }
  // ... paginated structure
});
```

**Fixed Code:**
```javascript
// Lines 83-145 (UPDATED)
queryClient.setQueryData(['posts'], (oldData) => {
  if (!oldData) return oldData;

  if (Array.isArray(oldData)) {
    return oldData.map(post => {
      if (post.id === data.post_id) {
        return {
          ...post,
          // Update ticket_status to match API structure (snake_case)
          ticket_status: {
            summary: {
              total: 1,
              pending: data.status === 'pending' ? 1 : 0,
              processing: data.status === 'processing' ? 1 : 0,
              completed: data.status === 'completed' ? 1 : 0,
              failed: data.status === 'failed' ? 1 : 0,
              agents: [data.agent_id]
            },
            has_tickets: true
          },
          // Debug metadata (not used by components)
          _ticketUpdated: Date.now(),
          _lastTicketEvent: {
            ticket_id: data.ticket_id,
            agent_id: data.agent_id,
            status: data.status,
            timestamp: data.timestamp,
            error: data.error || null
          }
        };
      }
      return post;
    });
  }

  // Handle paginated data structure
  if (oldData.pages) {
    return {
      ...oldData,
      pages: oldData.pages.map(page => ({
        ...page,
        data: page.data?.map(post => {
          if (post.id === data.post_id) {
            return {
              ...post,
              ticket_status: {
                summary: {
                  total: 1,
                  pending: data.status === 'pending' ? 1 : 0,
                  processing: data.status === 'processing' ? 1 : 0,
                  completed: data.status === 'completed' ? 1 : 0,
                  failed: data.status === 'failed' ? 1 : 0,
                  agents: [data.agent_id]
                },
                has_tickets: true
              },
              _ticketUpdated: Date.now(),
              _lastTicketEvent: {
                ticket_id: data.ticket_id,
                agent_id: data.agent_id,
                status: data.status,
                timestamp: data.timestamp,
                error: data.error || null
              }
            };
          }
          return post;
        })
      }))
    };
  }

  return oldData;
});
```

---

### 3.5 Edge Cases to Handle

#### Edge Case 1: Multiple Tickets Per Post
**Scenario:** Post has multiple tickets from different agents

**Current Implementation:** Single ticket assumed
**Required:** Aggregate multiple ticket statuses

**Solution (Future Enhancement):**
```javascript
// Merge with existing ticket_status instead of replacing
ticket_status: {
  summary: {
    total: (post.ticket_status?.summary?.total || 0) + 1,
    pending: calculatePending(existingTickets, newStatus),
    processing: calculateProcessing(existingTickets, newStatus),
    completed: calculateCompleted(existingTickets, newStatus),
    failed: calculateFailed(existingTickets, newStatus),
    agents: [...new Set([...existingAgents, data.agent_id])]
  },
  has_tickets: true
}
```

**Priority:** Low (current system only creates 1 ticket per post)

---

#### Edge Case 2: Out-of-Order Events
**Scenario:** WebSocket events arrive out of order (network delay)

**Example:**
```
Event 1: status="completed", timestamp="2025-10-24T10:31:00Z"
Event 2: status="processing", timestamp="2025-10-24T10:30:00Z" (arrives late)
```

**Solution (Future Enhancement):**
```javascript
// Only update if event is newer than last known event
if (post._lastTicketEvent?.timestamp &&
    data.timestamp < post._lastTicketEvent.timestamp) {
  console.warn('Ignoring out-of-order event:', data);
  return post; // Don't update
}
```

**Priority:** Low (rare in production)

---

#### Edge Case 3: WebSocket Reconnection
**Scenario:** WebSocket disconnects and reconnects, missing events

**Current Behavior:** Cache invalidation refetches from API
**Expected:** Badge shows stale data briefly, then corrects on refetch

**Mitigation:**
- `queryClient.invalidateQueries(['posts'])` ensures eventual consistency
- API is source of truth
- No user action required

**Priority:** Medium (handled by existing code)

---

#### Edge Case 4: Post Deleted While Processing
**Scenario:** User deletes post while worker is processing

**Expected Behavior:**
- WebSocket event arrives for non-existent post
- Cache update skips missing post
- No error thrown

**Validation:**
```javascript
if (post.id === data.post_id) {
  // Post found - update it
}
// Post not found - silently skip (already deleted)
```

**Priority:** Low (edge case)

---

#### Edge Case 5: Invalid Status Value
**Scenario:** WebSocket sends invalid status value

**Example:**
```json
{
  "status": "unknown"  // Invalid
}
```

**Solution:**
```javascript
const VALID_STATUSES = ['pending', 'processing', 'completed', 'failed'];

if (!VALID_STATUSES.includes(data.status)) {
  console.error('Invalid ticket status:', data.status, data);
  return post; // Don't update
}
```

**Priority:** Medium (data validation)

---

## 4. Success Criteria

### 4.1 Functional Success

**Must Pass:**
- [ ] Badge updates from "pending" to "processing" without page refresh
- [ ] Badge updates from "processing" to "completed" without page refresh
- [ ] Badge shows correct agent name from WebSocket event
- [ ] Badge shows correct status color (amber/blue/green/red)
- [ ] Badge icon animates correctly (spinner for processing)
- [ ] Toast notifications still work independently
- [ ] No badge shown for posts without tickets

**Validation Method:** Manual testing + E2E test

---

### 4.2 Performance Success

**Must Pass:**
- [ ] Badge update latency < 500ms (measured in browser DevTools)
- [ ] No memory leaks after 100 WebSocket events (Chrome Memory Profiler)
- [ ] No unnecessary re-renders (React DevTools Profiler < 2 renders per event)
- [ ] WebSocket listeners cleaned up on component unmount

**Validation Method:** Performance profiling

---

### 4.3 Data Consistency Success

**Must Pass:**
- [ ] Cache structure matches API response structure
- [ ] API refetch after cache update shows same data
- [ ] No cache drift after 10 status updates
- [ ] TypeScript types match runtime data structure

**Validation Method:** Integration test + type checking

---

### 4.4 Regression Prevention

**Must Pass:**
- [ ] Existing posts without tickets render correctly
- [ ] Existing WebSocket events still trigger cache invalidation
- [ ] Existing toast notifications still appear
- [ ] No console errors during normal operation
- [ ] No TypeScript compilation errors

**Validation Method:** Regression test suite

---

## 5. Test Plan

### 5.1 Unit Tests

**File:** `/workspaces/agent-feed/frontend/src/hooks/__tests__/useTicketUpdates.test.js`

**Test Cases:**

```javascript
describe('useTicketUpdates - Badge Fix', () => {
  test('should update ticket_status with snake_case field name', () => {
    // Setup: Mock queryClient and socket
    // Action: Trigger ticket:status:update event
    // Assert: Cache has ticket_status (not ticketStatus)
  });

  test('should update ticket_status.summary with correct structure', () => {
    // Assert: summary.total, summary.pending, etc. exist
  });

  test('should update ticket_status.has_tickets to true', () => {
    // Assert: has_tickets flag set
  });

  test('should set correct status counts (processing=1, others=0)', () => {
    // Assert: Only one status counter is 1
  });

  test('should include agent in ticket_status.summary.agents array', () => {
    // Assert: agents array contains agent_id from event
  });

  test('should handle paginated data structure', () => {
    // Assert: Nested page.data structure updated correctly
  });
});
```

---

### 5.2 Integration Tests

**File:** `/workspaces/agent-feed/tests/integration/badge-realtime.test.js`

**Test Cases:**

```javascript
describe('Badge Real-Time Updates', () => {
  test('should update badge when WebSocket event received', async () => {
    // 1. Create post with URL
    // 2. Wait for ticket created
    // 3. Connect WebSocket client
    // 4. Simulate ticket:status:update event
    // 5. Assert: Badge data in cache matches event
  });

  test('should handle pending -> processing -> completed transition', async () => {
    // Emit 3 events in sequence
    // Assert: Badge data transitions correctly
  });

  test('should not break existing posts without tickets', async () => {
    // Create post without URL
    // Assert: No ticket_status field
  });
});
```

---

### 5.3 E2E Tests

**File:** `/workspaces/agent-feed/tests/e2e/badge-realtime-update.spec.ts`

**Test Cases:**

```typescript
test('badge updates in real-time without refresh', async ({ page }) => {
  // 1. Navigate to feed
  // 2. Create post with URL: "Check this: https://example.com"
  // 3. Wait for badge to appear with "pending" status
  // 4. Wait for badge to change to "processing" (blue, spinning)
  // 5. Wait for badge to change to "completed" (green, checkmark)
  // 6. Assert: No page refresh occurred
  // 7. Screenshot: Save final state
});

test('badge shows correct agent name', async ({ page }) => {
  // Assert: Badge text contains "link-logger"
});

test('badge not shown for posts without tickets', async ({ page }) => {
  // Create post without URL
  // Assert: No badge visible
});
```

---

### 5.4 Manual Test Script

**Prerequisites:**
- API server running: `cd api-server && npm start`
- Frontend running: `cd frontend && npm run dev`
- Browser DevTools open (Network, Console tabs)

**Steps:**

1. **Test Real-Time Update**
   ```
   1. Open http://localhost:3000
   2. Open DevTools > Network > WS (WebSocket filter)
   3. Create post: "Check this out: https://github.com/anthropics/anthropic-sdk-typescript"
   4. Observe:
      - Badge appears immediately (amber, "Waiting for link-logger")
      - WebSocket event received (ticket:status:update, status: "processing")
      - Badge updates to blue with spinner ("link-logger analyzing...")
      - WebSocket event received (ticket:status:update, status: "completed")
      - Badge updates to green with checkmark ("Analyzed by link-logger")
   5. Result: PASS if all updates happen without refresh
   ```

2. **Test Data Consistency**
   ```
   1. After badge shows "completed", open DevTools > Console
   2. Run: localStorage.clear(); location.reload();
   3. Wait for page reload
   4. Observe: Badge still shows "completed" (from API)
   5. Result: PASS if badge state persists after cache clear
   ```

3. **Test Edge Case: Multiple Posts**
   ```
   1. Create 3 posts with URLs rapidly
   2. Observe: Each badge updates independently
   3. Result: PASS if no badge shows wrong status
   ```

4. **Test Edge Case: No Tickets**
   ```
   1. Create post without URL: "Hello world"
   2. Observe: No badge visible
   3. Result: PASS if badge correctly hidden
   ```

---

## 6. Rollout Plan

### Phase 1: Development (2 hours)
- [ ] Update `useTicketUpdates.js` cache logic (30 min)
- [ ] Add TypeScript type validation (15 min)
- [ ] Write unit tests (30 min)
- [ ] Manual testing (45 min)

### Phase 2: Code Review (30 min)
- [ ] Self-review code changes
- [ ] Check for unintended side effects
- [ ] Verify no TypeScript errors
- [ ] Verify no ESLint warnings

### Phase 3: Integration Testing (1 hour)
- [ ] Run full E2E test suite
- [ ] Test on Chrome, Firefox, Safari
- [ ] Performance profiling
- [ ] Accessibility validation

### Phase 4: Deployment (15 min)
- [ ] Merge to main branch
- [ ] Deploy to staging environment
- [ ] Smoke test on staging
- [ ] Deploy to production

### Phase 5: Monitoring (24 hours)
- [ ] Monitor error logs for badge-related issues
- [ ] Monitor WebSocket event delivery rate
- [ ] Collect user feedback
- [ ] Performance metrics comparison

---

## 7. Risks and Mitigation

### Risk 1: Breaking Existing Functionality
**Probability:** Low
**Impact:** High

**Mitigation:**
- Comprehensive regression testing
- Feature flag for gradual rollout (if needed)
- Quick rollback plan (revert commit)

---

### Risk 2: Performance Degradation
**Probability:** Very Low
**Impact:** Medium

**Mitigation:**
- Performance profiling before/after
- Cache update is synchronous (no async overhead)
- No new dependencies added

---

### Risk 3: TypeScript Type Errors
**Probability:** Low
**Impact:** Low

**Mitigation:**
- Existing types already support snake_case `ticket_status`
- Type checking in CI pipeline
- Manual type verification

---

### Risk 4: Cache Invalidation Race Condition
**Probability:** Low
**Impact:** Low

**Scenario:** Cache update and API refetch race

**Mitigation:**
- React Query handles race conditions automatically
- API is always source of truth
- Cache updates are optimistic (non-blocking)

---

## 8. Dependencies

### Internal Dependencies
- React Query v4.x (cache management)
- Socket.IO client v4.x (WebSocket)
- React 18.x (UI rendering)

### External Dependencies
- WebSocket service running on API server
- Ticket creation service
- Agent worker system

### Breaking Changes
**None** - This is a bug fix, not a breaking change

---

## 9. Documentation Updates

### Files to Update

1. **`/workspaces/agent-feed/frontend/src/hooks/useTicketUpdates.README.md`**
   - Update example to show correct cache structure
   - Add note about snake_case field names

2. **`/workspaces/agent-feed/api-server/docs/WEBSOCKET-INTEGRATION.md`**
   - Clarify cache structure expectations
   - Add example of correct cache update

3. **`/workspaces/agent-feed/docs/TICKET-STATUS-BADGE-IMPLEMENTATION-REPORT.md`**
   - Update with fix details
   - Mark real-time update issue as resolved

---

## 10. Validation Checklist

Before marking this specification complete, verify:

- [x] All requirements are testable (clear pass/fail criteria)
- [x] Acceptance criteria are specific and measurable
- [x] Edge cases are documented with solutions
- [x] Performance metrics are defined with targets
- [x] Security requirements are addressed (N/A for this fix)
- [x] API contracts are documented with examples
- [x] Dependencies are identified and validated
- [x] Test plan covers unit, integration, E2E levels
- [x] Rollout plan includes monitoring and rollback
- [x] Documentation updates are identified

---

## 11. Glossary

**Badge:** Visual indicator showing ticket status (TicketStatusBadge component)

**Cache Update:** Optimistic update to React Query cache before API refetch

**Cache Invalidation:** Marking cached data as stale, triggering API refetch

**Snake Case:** Naming convention with underscores (ticket_status)

**Camel Case:** Naming convention with capital letters (ticketStatus)

**Ticket:** Work item created for proactive agent processing

**Proactive Agent:** Agent that processes posts asynchronously (e.g., link-logger)

**WebSocket Event:** Real-time message sent from server to client

**React Query:** Data fetching/caching library used in frontend

---

## 12. Appendix

### A. Related Documents

- `/workspaces/agent-feed/api-server/docs/WEBSOCKET-INTEGRATION.md`
- `/workspaces/agent-feed/frontend/src/hooks/useTicketUpdates.README.md`
- `/workspaces/agent-feed/docs/TICKET-STATUS-BADGE-IMPLEMENTATION-REPORT.md`

### B. Code References

- **Hook:** `/workspaces/agent-feed/frontend/src/hooks/useTicketUpdates.js` (lines 83-135)
- **Badge:** `/workspaces/agent-feed/frontend/src/components/TicketStatusBadge.jsx`
- **Feed:** `/workspaces/agent-feed/frontend/src/components/RealSocialMediaFeed.tsx` (lines 891-896)
- **Types:** `/workspaces/agent-feed/frontend/src/types/api.ts` (lines 86-131)

### C. Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-10-24 | Claude | Initial specification |

---

## Approval

**Status:** Ready for Implementation
**Approval Required:** Technical Lead, QA Lead
**Estimated Completion:** 2025-10-24 EOD

---

**End of Specification**
