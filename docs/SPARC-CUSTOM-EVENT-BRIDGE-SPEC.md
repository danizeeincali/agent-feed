# SPARC Specification: Custom Event Bridge Pattern

## Document Information

**Project:** Agent Feed - WebSocket State Synchronization
**Phase:** SPARC Specification
**Solution:** Option B - Custom Event Bridge Pattern
**Created:** 2025-10-24
**Status:** Specification Complete

## 1. Executive Summary

### 1.1 Purpose

This specification defines the implementation of a Custom Event Bridge pattern to synchronize WebSocket ticket status updates with the RealSocialMediaFeed component's state management system.

### 1.2 Problem Statement

Current architecture has a state synchronization mismatch:
- **useTicketUpdates hook**: Invalidates React Query cache on WebSocket events
- **RealSocialMediaFeed component**: Uses useState for state management (NOT React Query)
- **Result**: WebSocket updates don't trigger badge re-renders in the UI

### 1.3 Solution Overview

Implement a browser-native Custom Event bridge:
1. useTicketUpdates emits custom DOM event when WebSocket message arrives
2. RealSocialMediaFeed listens for custom event
3. Event handler triggers loadPosts() refetch
4. Fresh data updates component state, badge re-renders

### 1.4 Success Criteria

- Badge updates without page refresh (< 500ms total latency)
- No memory leaks (proper cleanup on unmount)
- Existing functionality preserved (filter, search, pagination, toast)
- No console errors or warnings

## 2. Functional Requirements

### FR-001: Custom Event Emission
**Priority:** HIGH
**Description:** useTicketUpdates hook shall emit browser custom event when WebSocket ticket update arrives

**Acceptance Criteria:**
- Event name: `ticket-status-updated`
- Event dispatched on window object
- Event emitted AFTER React Query cache invalidation
- Event includes ticket data payload

**Test Cases:**
```javascript
test('emits custom event on WebSocket message', () => {
  const eventSpy = jest.fn();
  window.addEventListener('ticket-status-updated', eventSpy);

  // Simulate WebSocket message
  mockSocket.emit('ticket-status-update', ticketData);

  expect(eventSpy).toHaveBeenCalledTimes(1);
  expect(eventSpy.mock.calls[0][0].detail).toMatchObject({
    postId: ticketData.post_id,
    status: ticketData.status,
    agentId: ticketData.agent_id
  });
});
```

### FR-002: Event Payload Structure
**Priority:** HIGH
**Description:** Custom event shall include structured ticket data in detail property

**Data Schema:**
```typescript
interface TicketStatusEventDetail {
  postId: string;           // Database post ID
  status: string;           // 'pending' | 'processing' | 'complete' | 'error'
  agentId: string;          // Agent identifier
  ticketId?: string;        // Optional ticket ID
  timestamp: number;        // Event timestamp (Date.now())
  metadata?: {              // Optional metadata
    processingTime?: number;
    errorMessage?: string;
  };
}
```

**Acceptance Criteria:**
- All required fields present
- postId matches ticket.post_id from WebSocket
- status is valid enum value
- timestamp is current Unix timestamp
- Event is CustomEvent with detail property

**Validation:**
```javascript
test('event payload has correct structure', () => {
  const event = new CustomEvent('ticket-status-updated', {
    detail: {
      postId: '123',
      status: 'processing',
      agentId: 'agent-456',
      timestamp: Date.now()
    }
  });

  expect(event.detail.postId).toBe('123');
  expect(event.detail.status).toBe('processing');
  expect(event.detail.agentId).toBe('agent-456');
  expect(typeof event.detail.timestamp).toBe('number');
});
```

### FR-003: Event Listener Registration
**Priority:** HIGH
**Description:** RealSocialMediaFeed component shall register event listener on mount

**Implementation Location:**
- File: `/workspaces/agent-feed/frontend/src/components/RealSocialMediaFeed.tsx`
- Hook: useEffect with empty dependency array

**Acceptance Criteria:**
- Listener registered in useEffect on component mount
- Listener attached to window object
- Listener callback is stable (useCallback)
- No duplicate listeners registered

**Code Pattern:**
```typescript
useEffect(() => {
  const handleTicketUpdate = (event: CustomEvent<TicketStatusEventDetail>) => {
    console.log('[Event Bridge] Ticket update received:', event.detail);
    // Trigger refetch
  };

  window.addEventListener('ticket-status-updated', handleTicketUpdate as EventListener);

  return () => {
    window.removeEventListener('ticket-status-updated', handleTicketUpdate as EventListener);
  };
}, []);
```

### FR-004: Refetch on Event
**Priority:** HIGH
**Description:** Event listener shall trigger loadPosts() to refetch data from API

**Flow:**
1. Custom event received
2. Event handler validates payload
3. Call existing loadPosts() function
4. loadPosts() fetches from /api/posts
5. State updated with fresh data
6. Badge re-renders automatically

**Acceptance Criteria:**
- loadPosts() called on every valid event
- Invalid events logged but don't crash
- Refetch respects current filters (search, sort)
- Loading state managed during refetch

**Debouncing:**
- Multiple rapid events (< 300ms apart) debounced
- Only last event triggers refetch
- Prevents API hammering

**Implementation:**
```typescript
const debouncedRefetch = useMemo(
  () => debounce(() => loadPosts(), 300),
  [loadPosts]
);

const handleTicketUpdate = useCallback((event: CustomEvent) => {
  const { postId, status } = event.detail;

  if (!postId || !status) {
    console.warn('[Event Bridge] Invalid event payload:', event.detail);
    return;
  }

  console.log(`[Event Bridge] Refetching posts for ${postId} - ${status}`);
  debouncedRefetch();
}, [debouncedRefetch]);
```

### FR-005: Cleanup on Unmount
**Priority:** HIGH
**Description:** Event listener shall be removed on component unmount to prevent memory leaks

**Acceptance Criteria:**
- removeEventListener called in useEffect cleanup
- Same function reference used for add/remove
- No event listeners remain after unmount
- No "Can't perform state update on unmounted component" warnings

**Test Strategy:**
```javascript
test('cleans up event listener on unmount', () => {
  const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
  const { unmount } = render(<RealSocialMediaFeed />);

  unmount();

  expect(removeEventListenerSpy).toHaveBeenCalledWith(
    'ticket-status-updated',
    expect.any(Function)
  );
});
```

### FR-006: Badge Update Without Refresh
**Priority:** HIGH
**Description:** TicketStatusBadge shall update when post data changes, without full page refresh

**Mechanism:**
- loadPosts() updates posts state
- posts state change triggers re-render
- TicketStatusBadge receives updated post prop
- Badge displays new status

**Acceptance Criteria:**
- Badge updates within 500ms of WebSocket event
- No page refresh required
- No flickering or visual glitches
- Status transitions smooth (pending → processing → complete)

**Visual Validation:**
- Playwright E2E test captures screenshots
- Before/after status comparison
- Verify badge color changes

### FR-007: Toast Notifications Preserved
**Priority:** MEDIUM
**Description:** Existing toast notification system shall continue working unchanged

**Scope:**
- useTicketUpdates already shows toasts
- Event bridge is ADDITIONAL functionality
- Toasts continue appearing on status changes

**Acceptance Criteria:**
- Toast appears on ticket status update
- Event emission does NOT interfere with toast
- Toast message matches status
- No duplicate toasts

**Non-Goal:**
- No changes to toast logic
- No additional toast features

### FR-008: Existing Functionality Preserved
**Priority:** HIGH
**Description:** Filter, search, pagination, and all existing features shall work identically

**Regression Testing Required:**
- Search by keyword
- Filter by status
- Sort by date/popularity
- Pagination navigation
- Post creation
- Comment submission
- Like/unlike posts

**Acceptance Criteria:**
- All existing E2E tests pass
- No new console errors
- No performance degradation
- No visual regressions

**Test Suite:**
- Run full Playwright E2E suite
- Run full Jest unit test suite
- Manual smoke testing checklist

## 3. Non-Functional Requirements

### NFR-001: Performance
**Category:** Performance
**Description:** Event bridge shall add minimal latency to ticket update flow

**Metrics:**
- Event dispatch: < 5ms
- Event handler execution: < 10ms
- loadPosts() API call: 100-300ms (existing)
- Total badge update: < 500ms (acceptable for real-time feel)

**Measurement:**
```javascript
const startTime = performance.now();
window.dispatchEvent(customEvent);
const dispatchTime = performance.now() - startTime;
expect(dispatchTime).toBeLessThan(5);
```

**Performance Budget:**
```
Event Creation:     ~1ms
Event Dispatch:     ~2ms
Event Propagation:  ~1ms
Handler Execution:  ~5ms
Debounce Wait:      300ms
API Fetch:          100-300ms
State Update:       ~10ms
Re-render:          ~20ms
-----------------------------------
Total:              420-640ms
Target:             < 500ms (p95)
```

### NFR-002: Memory Safety
**Category:** Resource Management
**Description:** Implementation shall not leak memory or event listeners

**Requirements:**
- Maximum 1 event listener per component instance
- All listeners removed on unmount
- No closure memory leaks
- No zombie event handlers

**Validation:**
- Chrome DevTools Memory Profiler
- Mount/unmount component 100 times
- Check event listener count (should be 0)
- Check memory heap (should be stable)

**Acceptance:**
- Event listener count returns to baseline after unmount
- Memory usage stable after 100 mount/unmount cycles

### NFR-003: Error Resilience
**Category:** Reliability
**Description:** System shall gracefully handle errors and edge cases

**Error Scenarios:**
1. Invalid event payload (missing fields)
2. API fetch failure during refetch
3. Component unmounted during API call
4. WebSocket disconnection/reconnection
5. Rapid event flooding (> 10/second)

**Handling Strategy:**
```javascript
try {
  const { postId, status } = event.detail;

  if (!postId || !status) {
    console.warn('[Event Bridge] Invalid payload');
    return;
  }

  await loadPosts();
} catch (error) {
  console.error('[Event Bridge] Refetch failed:', error);
  // Don't show error to user - silent degradation
  // Next WebSocket event will retry
}
```

**Acceptance:**
- No uncaught exceptions
- Errors logged to console
- System continues functioning after error
- User experience not disrupted

### NFR-004: Browser Compatibility
**Category:** Compatibility
**Description:** Implementation shall work in all supported browsers

**Supported Browsers:**
- Chrome 90+ (primary)
- Firefox 88+ (secondary)
- Safari 14+ (secondary)
- Edge 90+ (secondary)

**Browser APIs Used:**
- CustomEvent (IE11+, all modern browsers)
- window.addEventListener (universal)
- window.dispatchEvent (universal)

**Polyfills:**
- Not required (all APIs widely supported)

**Testing:**
- Playwright cross-browser testing
- Manual testing in Safari

### NFR-005: Developer Experience
**Category:** Maintainability
**Description:** Code shall be clear, documented, and easy to debug

**Requirements:**
- Console logs for debugging (development only)
- TypeScript types for event payload
- JSDoc comments on public functions
- Clear variable naming

**Logging Strategy:**
```javascript
if (process.env.NODE_ENV === 'development') {
  console.log('[Event Bridge] Event emitted:', detail);
  console.log('[Event Bridge] Refetch triggered');
  console.log('[Event Bridge] Posts updated:', posts.length);
}
```

**Documentation:**
- Inline comments explaining event bridge
- Architecture diagram in spec
- Example usage in code comments

## 4. Constraints

### 4.1 Technical Constraints

**TC-001: Must Not Break Existing Code**
- RealSocialMediaFeed.tsx has complex state management
- Search, filter, pagination logic must remain unchanged
- Only ADD event listener, don't modify existing logic

**TC-002: Must Use Existing loadPosts()**
- Don't duplicate data fetching logic
- Reuse existing /api/posts endpoint
- Respect existing error handling

**TC-003: TypeScript Compatibility**
- Component is .tsx file (TypeScript)
- Must provide proper type definitions
- No `any` types without justification

### 4.2 Business Constraints

**BC-001: No User-Facing Changes**
- Event bridge is internal implementation
- User sees badge update (same as before, but working)
- No new UI elements or interactions

**BC-002: Backward Compatibility**
- Must work with existing WebSocket server
- Must work with existing API responses
- No database schema changes required

### 4.3 Time Constraints

**TM-001: Implementation Timeline**
- Specification: 1 hour (this document)
- Implementation: 2 hours (hook + component)
- Testing: 2 hours (unit + E2E)
- Validation: 1 hour (manual testing)
- Total: ~6 hours (single developer)

## 5. Architecture

### 5.1 System Context

```
┌─────────────────────────────────────────────────────────┐
│                     Browser Environment                  │
│                                                          │
│  ┌──────────────────┐         ┌────────────────────┐   │
│  │  WebSocket       │         │   REST API         │   │
│  │  Connection      │         │   /api/posts       │   │
│  └────────┬─────────┘         └─────────┬──────────┘   │
│           │                              │              │
│           │ ticket-status-update         │ GET/POST     │
│           ▼                              ▼              │
│  ┌────────────────────────────────────────────────┐    │
│  │         useTicketUpdates Hook                  │    │
│  │  - Receives WebSocket messages                 │    │
│  │  - Invalidates React Query cache               │    │
│  │  - Shows toast notifications                   │    │
│  │  - [NEW] Emits custom event                    │    │
│  └──────────────────┬─────────────────────────────┘    │
│                     │                                   │
│                     │ window.dispatchEvent()            │
│                     │ (ticket-status-updated)           │
│                     ▼                                   │
│  ┌────────────────────────────────────────────────┐    │
│  │         Custom Event Bridge                    │    │
│  │         (Browser Event System)                 │    │
│  └──────────────────┬─────────────────────────────┘    │
│                     │                                   │
│                     │ addEventListener()                │
│                     ▼                                   │
│  ┌────────────────────────────────────────────────┐    │
│  │      RealSocialMediaFeed Component             │    │
│  │  - Listens for custom event                    │    │
│  │  - Calls loadPosts() on event                  │    │
│  │  - Updates posts state                         │    │
│  │  - Re-renders with fresh data                  │    │
│  └──────────────────┬─────────────────────────────┘    │
│                     │                                   │
│                     │ props.post.ticketStatus           │
│                     ▼                                   │
│  ┌────────────────────────────────────────────────┐    │
│  │       TicketStatusBadge Component              │    │
│  │  - Displays current status                     │    │
│  │  - Updates when post prop changes              │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 5.2 Event Flow Sequence

```
WebSocket Server          useTicketUpdates         Event Bridge        RealSocialMediaFeed      API Server
      │                         │                       │                      │                    │
      │ ticket-status-update    │                       │                      │                    │
      │────────────────────────>│                       │                      │                    │
      │                         │                       │                      │                    │
      │                         │ Invalidate RQ cache   │                      │                    │
      │                         │──────────────┐        │                      │                    │
      │                         │              │        │                      │                    │
      │                         │<─────────────┘        │                      │                    │
      │                         │                       │                      │                    │
      │                         │ Show toast            │                      │                    │
      │                         │──────────────┐        │                      │                    │
      │                         │              │        │                      │                    │
      │                         │<─────────────┘        │                      │                    │
      │                         │                       │                      │                    │
      │                         │ dispatchEvent()       │                      │                    │
      │                         │──────────────────────>│                      │                    │
      │                         │                       │                      │                    │
      │                         │                       │ 'ticket-status-      │                    │
      │                         │                       │  updated' event      │                    │
      │                         │                       │─────────────────────>│                    │
      │                         │                       │                      │                    │
      │                         │                       │                      │ Validate payload   │
      │                         │                       │                      │─────────┐          │
      │                         │                       │                      │         │          │
      │                         │                       │                      │<────────┘          │
      │                         │                       │                      │                    │
      │                         │                       │                      │ Debounce check     │
      │                         │                       │                      │─────────┐          │
      │                         │                       │                      │         │          │
      │                         │                       │                      │<────────┘          │
      │                         │                       │                      │                    │
      │                         │                       │                      │ loadPosts()        │
      │                         │                       │                      │───────────────────>│
      │                         │                       │                      │                    │
      │                         │                       │                      │    Fresh posts     │
      │                         │                       │                      │<───────────────────│
      │                         │                       │                      │                    │
      │                         │                       │                      │ setPosts(data)     │
      │                         │                       │                      │─────────┐          │
      │                         │                       │                      │         │          │
      │                         │                       │                      │<────────┘          │
      │                         │                       │                      │                    │
      │                         │                       │                      │ Re-render          │
      │                         │                       │                      │─────────┐          │
      │                         │                       │                      │         │          │
      │                         │                       │                      │<────────┘          │
      │                         │                       │                      │                    │
```

### 5.3 Component Modifications

#### 5.3.1 useTicketUpdates Hook

**File:** `/workspaces/agent-feed/frontend/src/hooks/useTicketUpdates.js`

**Current Implementation:**
```javascript
useEffect(() => {
  const handleTicketUpdate = (data) => {
    queryClient.invalidateQueries(['posts']);
    toast.success(`Ticket ${data.status}`);
  };

  socket.on('ticket-status-update', handleTicketUpdate);

  return () => {
    socket.off('ticket-status-update', handleTicketUpdate);
  };
}, [queryClient]);
```

**NEW Implementation:**
```javascript
useEffect(() => {
  const handleTicketUpdate = (data) => {
    // Existing functionality
    queryClient.invalidateQueries(['posts']);
    toast.success(`Ticket ${data.status}`);

    // NEW: Emit custom event
    const customEvent = new CustomEvent('ticket-status-updated', {
      detail: {
        postId: data.post_id,
        status: data.status,
        agentId: data.agent_id,
        ticketId: data.ticket_id,
        timestamp: Date.now(),
        metadata: {
          processingTime: data.processing_time,
          errorMessage: data.error
        }
      }
    });

    window.dispatchEvent(customEvent);

    if (process.env.NODE_ENV === 'development') {
      console.log('[Event Bridge] Event emitted:', customEvent.detail);
    }
  };

  socket.on('ticket-status-update', handleTicketUpdate);

  return () => {
    socket.off('ticket-status-update', handleTicketUpdate);
  };
}, [queryClient]);
```

**Changes:**
- ADD custom event creation after existing logic
- ADD window.dispatchEvent() call
- ADD development logging
- PRESERVE all existing functionality

#### 5.3.2 RealSocialMediaFeed Component

**File:** `/workspaces/agent-feed/frontend/src/components/RealSocialMediaFeed.tsx`

**NEW Event Listener:**
```typescript
// Add near top of component with other hooks
const loadPostsRef = useRef(loadPosts);

useEffect(() => {
  loadPostsRef.current = loadPosts;
}, [loadPosts]);

// Debounced refetch function
const debouncedRefetch = useMemo(
  () =>
    debounce(() => {
      if (loadPostsRef.current) {
        loadPostsRef.current();
      }
    }, 300),
  []
);

// Event listener effect
useEffect(() => {
  const handleTicketUpdate = (event: Event) => {
    const customEvent = event as CustomEvent<{
      postId: string;
      status: string;
      agentId: string;
      timestamp: number;
    }>;

    const { postId, status } = customEvent.detail;

    if (!postId || !status) {
      console.warn('[Event Bridge] Invalid event payload:', customEvent.detail);
      return;
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Event Bridge] Ticket update received for post ${postId}: ${status}`);
    }

    // Trigger debounced refetch
    debouncedRefetch();
  };

  window.addEventListener('ticket-status-updated', handleTicketUpdate);

  return () => {
    window.removeEventListener('ticket-status-updated', handleTicketUpdate);
    debouncedRefetch.cancel(); // Cancel pending debounce on unmount
  };
}, [debouncedRefetch]);
```

**Dependencies Required:**
```typescript
import { debounce } from 'lodash'; // or custom debounce
```

**Changes:**
- ADD event listener registration on mount
- ADD debounced refetch to prevent API hammering
- ADD cleanup on unmount
- NO changes to existing loadPosts() logic
- NO changes to state management

### 5.4 Data Flow

```
┌─────────────────────────────────────────────────────────┐
│                    WebSocket Message                     │
│  {                                                       │
│    post_id: "123",                                       │
│    status: "processing",                                 │
│    agent_id: "agent-456",                                │
│    ticket_id: "ticket-789"                               │
│  }                                                       │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Custom Event Detail Payload                 │
│  {                                                       │
│    postId: "123",           // Camel case                │
│    status: "processing",    // Pass through              │
│    agentId: "agent-456",    // Camel case                │
│    ticketId: "ticket-789",  // Camel case                │
│    timestamp: 1698765432000 // NEW: Event time           │
│  }                                                       │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              API Response from /api/posts                │
│  [                                                       │
│    {                                                     │
│      id: "123",                                          │
│      content: "...",                                     │
│      ticketStatus: {                                     │
│        status: "processing",  // UPDATED                 │
│        agentId: "agent-456",  // UPDATED                 │
│        ticketId: "ticket-789" // UPDATED                 │
│      }                                                   │
│    },                                                    │
│    ...                                                   │
│  ]                                                       │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│           Component State (posts array)                  │
│  Updated via setPosts(data)                              │
│  Triggers re-render of all PostCard components           │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│         TicketStatusBadge Re-renders                     │
│  Receives updated post.ticketStatus prop                 │
│  Displays new status color and text                      │
└─────────────────────────────────────────────────────────┘
```

## 6. Edge Cases and Error Handling

### 6.1 Multiple Rapid Events

**Scenario:** WebSocket sends 5 updates in 100ms for same post

**Problem:**
- 5 API calls to loadPosts()
- Race conditions on state updates
- Poor performance

**Solution:**
```typescript
// Debounce refetch with 300ms delay
const debouncedRefetch = useMemo(
  () => debounce(() => loadPosts(), 300),
  [loadPosts]
);

// Only the last event in the burst triggers refetch
handleTicketUpdate() {
  debouncedRefetch(); // Resets timer on each call
}
```

**Expected Behavior:**
- First 4 events: Timer reset, no API call
- 5th event: Timer starts
- After 300ms: Single API call
- Result: 5 events → 1 API call

### 6.2 Component Unmounted During Refetch

**Scenario:** User navigates away while loadPosts() is fetching

**Problem:**
- API call completes after unmount
- setState called on unmounted component
- React warning in console

**Solution:**
```typescript
useEffect(() => {
  let isMounted = true;

  const handleTicketUpdate = async (event) => {
    if (!isMounted) return;

    try {
      await loadPosts();
    } catch (error) {
      if (isMounted) {
        console.error('[Event Bridge] Refetch failed:', error);
      }
    }
  };

  window.addEventListener('ticket-status-updated', handleTicketUpdate);

  return () => {
    isMounted = false;
    window.removeEventListener('ticket-status-updated', handleTicketUpdate);
    debouncedRefetch.cancel();
  };
}, []);
```

**Expected Behavior:**
- Component unmounts → isMounted = false
- API completes → setState not called
- No console warnings

### 6.3 WebSocket Reconnection

**Scenario:** WebSocket disconnects, then reconnects

**Problem:**
- Multiple missed status updates
- Stale data in component state

**Solution:**
```typescript
// In useTicketUpdates
socket.on('connect', () => {
  // Emit reconnect event to trigger full refetch
  const reconnectEvent = new CustomEvent('websocket-reconnected', {
    detail: { timestamp: Date.now() }
  });
  window.dispatchEvent(reconnectEvent);
});

// In RealSocialMediaFeed
useEffect(() => {
  const handleReconnect = () => {
    console.log('[Event Bridge] WebSocket reconnected, refetching all posts');
    loadPosts(); // Full refetch, no debounce
  };

  window.addEventListener('websocket-reconnected', handleReconnect);

  return () => {
    window.removeEventListener('websocket-reconnected', handleReconnect);
  };
}, [loadPosts]);
```

**Expected Behavior:**
- WebSocket reconnects → Full data refetch
- All stale data refreshed
- User sees current state

### 6.4 Event Before Component Mounted

**Scenario:** WebSocket event fires before RealSocialMediaFeed renders

**Problem:**
- Event listener not registered yet
- Event lost

**Solution:**
- **Accept the loss**: This is acceptable
- Component will refetch on mount anyway
- Next event will be caught

**Alternative (if critical):**
```typescript
// Queue events before mount
const eventQueue: CustomEvent[] = [];

window.addEventListener('ticket-status-updated', (e) => {
  eventQueue.push(e as CustomEvent);
});

// In component, process queue on mount
useEffect(() => {
  if (eventQueue.length > 0) {
    console.log(`[Event Bridge] Processing ${eventQueue.length} queued events`);
    eventQueue.forEach(handleTicketUpdate);
    eventQueue.length = 0;
  }
}, []);
```

**Recommendation:** Not needed for MVP, acceptable to miss pre-mount events

### 6.5 Invalid Event Payload

**Scenario:** Event emitted with missing or malformed data

**Problem:**
- postId is undefined
- status is invalid enum

**Solution:**
```typescript
const handleTicketUpdate = (event: CustomEvent) => {
  const { postId, status } = event.detail || {};

  // Validation
  if (!postId) {
    console.warn('[Event Bridge] Missing postId in event:', event.detail);
    return;
  }

  if (!['pending', 'processing', 'complete', 'error'].includes(status)) {
    console.warn('[Event Bridge] Invalid status in event:', status);
    return;
  }

  // Proceed with refetch
  debouncedRefetch();
};
```

**Expected Behavior:**
- Invalid event logged to console
- No refetch triggered
- No crash or exception
- Next valid event works normally

### 6.6 API Fetch Failure

**Scenario:** loadPosts() fails due to network error or 500 response

**Problem:**
- User sees stale data
- No indication of failure

**Solution:**
```typescript
const handleTicketUpdate = async (event: CustomEvent) => {
  try {
    await loadPosts();
    console.log('[Event Bridge] Refetch successful');
  } catch (error) {
    console.error('[Event Bridge] Refetch failed:', error);

    // Silent degradation - don't show error toast
    // Next WebSocket event will retry
    // OR show subtle error indicator
  }
};
```

**Expected Behavior:**
- Error logged to console
- No user-facing error message (silent degradation)
- Next event triggers retry
- Alternative: Show small error badge on affected post

## 7. Testing Strategy

### 7.1 Unit Tests

**File:** `/workspaces/agent-feed/frontend/src/hooks/__tests__/useTicketUpdates.test.js`

**Test Cases:**

```javascript
describe('useTicketUpdates - Custom Event Emission', () => {
  test('emits custom event on WebSocket message', () => {
    const eventSpy = jest.fn();
    window.addEventListener('ticket-status-updated', eventSpy);

    const { result } = renderHook(() => useTicketUpdates());

    // Simulate WebSocket message
    act(() => {
      mockSocket.emit('ticket-status-update', {
        post_id: '123',
        status: 'processing',
        agent_id: 'agent-456'
      });
    });

    expect(eventSpy).toHaveBeenCalledTimes(1);
    expect(eventSpy.mock.calls[0][0].detail).toMatchObject({
      postId: '123',
      status: 'processing',
      agentId: 'agent-456'
    });

    window.removeEventListener('ticket-status-updated', eventSpy);
  });

  test('event includes timestamp', () => {
    const eventSpy = jest.fn();
    window.addEventListener('ticket-status-updated', eventSpy);

    const beforeTime = Date.now();

    act(() => {
      mockSocket.emit('ticket-status-update', {
        post_id: '123',
        status: 'complete',
        agent_id: 'agent-789'
      });
    });

    const afterTime = Date.now();
    const eventTime = eventSpy.mock.calls[0][0].detail.timestamp;

    expect(eventTime).toBeGreaterThanOrEqual(beforeTime);
    expect(eventTime).toBeLessThanOrEqual(afterTime);

    window.removeEventListener('ticket-status-updated', eventSpy);
  });

  test('preserves existing toast notification', () => {
    const toastSpy = jest.spyOn(toast, 'success');

    act(() => {
      mockSocket.emit('ticket-status-update', {
        post_id: '123',
        status: 'complete',
        agent_id: 'agent-456'
      });
    });

    expect(toastSpy).toHaveBeenCalledWith(
      expect.stringContaining('complete')
    );
  });

  test('preserves React Query cache invalidation', () => {
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    act(() => {
      mockSocket.emit('ticket-status-update', {
        post_id: '123',
        status: 'processing',
        agent_id: 'agent-456'
      });
    });

    expect(invalidateSpy).toHaveBeenCalledWith(['posts']);
  });
});
```

**File:** `/workspaces/agent-feed/frontend/src/components/__tests__/RealSocialMediaFeed.test.tsx`

**Test Cases:**

```typescript
describe('RealSocialMediaFeed - Event Listener', () => {
  test('registers event listener on mount', () => {
    const addEventListenerSpy = jest.spyOn(window, 'addEventListener');

    render(<RealSocialMediaFeed />);

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      'ticket-status-updated',
      expect.any(Function)
    );

    addEventListenerSpy.mockRestore();
  });

  test('removes event listener on unmount', () => {
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

    const { unmount } = render(<RealSocialMediaFeed />);

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'ticket-status-updated',
      expect.any(Function)
    );

    removeEventListenerSpy.mockRestore();
  });

  test('calls loadPosts on custom event', async () => {
    const mockLoadPosts = jest.fn().mockResolvedValue([]);

    // Mock the API
    jest.spyOn(api, 'get').mockResolvedValue({ data: [] });

    render(<RealSocialMediaFeed />);

    // Dispatch custom event
    act(() => {
      const event = new CustomEvent('ticket-status-updated', {
        detail: {
          postId: '123',
          status: 'processing',
          agentId: 'agent-456',
          timestamp: Date.now()
        }
      });
      window.dispatchEvent(event);
    });

    // Wait for debounce
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/api/posts');
    }, { timeout: 500 });
  });

  test('debounces multiple rapid events', async () => {
    jest.spyOn(api, 'get').mockResolvedValue({ data: [] });

    render(<RealSocialMediaFeed />);

    // Dispatch 5 events rapidly
    act(() => {
      for (let i = 0; i < 5; i++) {
        const event = new CustomEvent('ticket-status-updated', {
          detail: { postId: `${i}`, status: 'processing', agentId: 'agent-1', timestamp: Date.now() }
        });
        window.dispatchEvent(event);
      }
    });

    // Wait for debounce
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledTimes(1); // Only 1 call despite 5 events
    }, { timeout: 500 });
  });

  test('handles invalid event payload gracefully', () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

    render(<RealSocialMediaFeed />);

    act(() => {
      const event = new CustomEvent('ticket-status-updated', {
        detail: {} // Missing required fields
      });
      window.dispatchEvent(event);
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Invalid event payload')
    );

    consoleSpy.mockRestore();
  });

  test('no memory leak after unmount', async () => {
    const { unmount } = render(<RealSocialMediaFeed />);

    unmount();

    // Dispatch event after unmount
    const event = new CustomEvent('ticket-status-updated', {
      detail: { postId: '123', status: 'complete', agentId: 'agent-1', timestamp: Date.now() }
    });

    // Should not throw or cause warnings
    expect(() => {
      window.dispatchEvent(event);
    }).not.toThrow();
  });
});
```

### 7.2 Integration Tests

**File:** `/workspaces/agent-feed/frontend/src/tests/integration/event-bridge.test.tsx`

```typescript
describe('Custom Event Bridge - Integration', () => {
  test('full flow: WebSocket → Event → Refetch → Update', async () => {
    // Setup
    const mockSocket = new MockSocket();
    const mockPosts = [
      { id: '123', content: 'Test', ticketStatus: { status: 'pending' } }
    ];

    jest.spyOn(api, 'get').mockResolvedValue({ data: mockPosts });

    // Render component
    const { getByText } = render(<RealSocialMediaFeed />);

    // Wait for initial load
    await waitFor(() => {
      expect(getByText('Test')).toBeInTheDocument();
    });

    // Update mock data (simulate status change)
    mockPosts[0].ticketStatus.status = 'processing';

    // Simulate WebSocket message
    act(() => {
      mockSocket.emit('ticket-status-update', {
        post_id: '123',
        status: 'processing',
        agent_id: 'agent-456'
      });
    });

    // Wait for refetch and re-render
    await waitFor(() => {
      const badge = getByText('Processing');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-blue-100'); // Processing color
    }, { timeout: 1000 });
  });

  test('WebSocket reconnection triggers full refetch', async () => {
    const mockSocket = new MockSocket();
    jest.spyOn(api, 'get').mockResolvedValue({ data: [] });

    render(<RealSocialMediaFeed />);

    // Simulate reconnection
    act(() => {
      mockSocket.emit('connect');
    });

    // Should trigger refetch
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/api/posts');
    });
  });
});
```

### 7.3 End-to-End Tests

**File:** `/workspaces/agent-feed/tests/e2e/ticket-status-event-bridge.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Ticket Status Event Bridge', () => {
  test('badge updates without refresh when WebSocket event fires', async ({ page }) => {
    // Navigate to feed
    await page.goto('http://localhost:3000');

    // Wait for feed to load
    await page.waitForSelector('[data-testid="post-card"]');

    // Create a post with URL (triggers ticket creation)
    await page.fill('[data-testid="post-input"]', 'Check out https://example.com');
    await page.click('[data-testid="post-submit"]');

    // Wait for post to appear
    await page.waitForSelector('text=Check out https://example.com');

    // Screenshot: Initial state (pending)
    await page.screenshot({ path: 'tests/screenshots/event-bridge-01-pending.png' });

    // Verify pending badge
    const pendingBadge = page.locator('[data-testid="ticket-badge"]').first();
    await expect(pendingBadge).toHaveText('Pending');

    // Wait for WebSocket event (backend processes ticket)
    // This will trigger the event bridge
    await page.waitForSelector('[data-testid="ticket-badge"]:has-text("Processing")', {
      timeout: 5000
    });

    // Screenshot: After first update (processing)
    await page.screenshot({ path: 'tests/screenshots/event-bridge-02-processing.png' });

    // Verify processing badge without refresh
    const processingBadge = page.locator('[data-testid="ticket-badge"]').first();
    await expect(processingBadge).toHaveText('Processing');
    await expect(processingBadge).toHaveClass(/bg-blue-100/);

    // Wait for completion
    await page.waitForSelector('[data-testid="ticket-badge"]:has-text("Complete")', {
      timeout: 10000
    });

    // Screenshot: Final state (complete)
    await page.screenshot({ path: 'tests/screenshots/event-bridge-03-complete.png' });

    // Verify complete badge
    const completeBadge = page.locator('[data-testid="ticket-badge"]').first();
    await expect(completeBadge).toHaveText('Complete');
    await expect(completeBadge).toHaveClass(/bg-green-100/);

    // Verify NO page refresh occurred (check for specific element that would reset)
    const postInput = page.locator('[data-testid="post-input"]');
    await expect(postInput).toBeVisible(); // Still mounted
  });

  test('existing posts preserve filter/search during update', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Apply search filter
    await page.fill('[data-testid="search-input"]', 'test');
    await page.waitForTimeout(500); // Debounce

    // Count filtered posts
    const initialCount = await page.locator('[data-testid="post-card"]').count();

    // Simulate WebSocket event
    await page.evaluate(() => {
      const event = new CustomEvent('ticket-status-updated', {
        detail: {
          postId: '123',
          status: 'complete',
          agentId: 'agent-1',
          timestamp: Date.now()
        }
      });
      window.dispatchEvent(event);
    });

    // Wait for refetch
    await page.waitForTimeout(500);

    // Verify search still applied
    const searchInput = page.locator('[data-testid="search-input"]');
    await expect(searchInput).toHaveValue('test');

    // Verify post count unchanged (filter preserved)
    const finalCount = await page.locator('[data-testid="post-card"]').count();
    expect(finalCount).toBe(initialCount);
  });

  test('no console errors during event flow', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('http://localhost:3000');

    // Trigger multiple events
    await page.evaluate(() => {
      for (let i = 0; i < 5; i++) {
        const event = new CustomEvent('ticket-status-updated', {
          detail: {
            postId: `${i}`,
            status: 'processing',
            agentId: 'agent-1',
            timestamp: Date.now()
          }
        });
        window.dispatchEvent(event);
      }
    });

    await page.waitForTimeout(1000);

    // Verify no console errors
    expect(consoleErrors).toHaveLength(0);
  });
});
```

### 7.4 Performance Tests

**File:** `/workspaces/agent-feed/frontend/src/tests/performance/event-bridge-performance.test.ts`

```typescript
describe('Event Bridge Performance', () => {
  test('event dispatch takes < 5ms', () => {
    const startTime = performance.now();

    const event = new CustomEvent('ticket-status-updated', {
      detail: {
        postId: '123',
        status: 'processing',
        agentId: 'agent-1',
        timestamp: Date.now()
      }
    });

    window.dispatchEvent(event);

    const endTime = performance.now();
    const duration = endTime - startTime;

    expect(duration).toBeLessThan(5);
  });

  test('debounce prevents API spam', async () => {
    jest.spyOn(api, 'get').mockResolvedValue({ data: [] });

    render(<RealSocialMediaFeed />);

    const startTime = Date.now();

    // Dispatch 100 events
    act(() => {
      for (let i = 0; i < 100; i++) {
        const event = new CustomEvent('ticket-status-updated', {
          detail: { postId: `${i}`, status: 'processing', agentId: 'agent-1', timestamp: Date.now() }
        });
        window.dispatchEvent(event);
      }
    });

    // Wait for debounce
    await waitFor(() => {
      expect(api.get).toHaveBeenCalled();
    }, { timeout: 500 });

    const endTime = Date.now();

    // Should only call API once despite 100 events
    expect(api.get).toHaveBeenCalledTimes(1);

    // Total time should be ~300ms (debounce delay)
    expect(endTime - startTime).toBeLessThan(500);
  });

  test('no memory leak after 100 mount/unmount cycles', () => {
    const initialListenerCount = getEventListeners(window).length;

    for (let i = 0; i < 100; i++) {
      const { unmount } = render(<RealSocialMediaFeed />);
      unmount();
    }

    const finalListenerCount = getEventListeners(window).length;

    expect(finalListenerCount).toBe(initialListenerCount);
  });
});
```

### 7.5 Manual Testing Checklist

```markdown
## Manual Testing Checklist

### Setup
- [ ] Backend server running (port 5001)
- [ ] Frontend dev server running (port 3000)
- [ ] WebSocket connection established
- [ ] Browser DevTools open (Console + Network tabs)

### Test 1: Basic Event Flow
1. [ ] Navigate to http://localhost:3000
2. [ ] Open browser console
3. [ ] Create post with URL: "Check out https://github.com"
4. [ ] Verify post appears immediately
5. [ ] Verify "Pending" badge appears
6. [ ] Watch console for "[Event Bridge] Event emitted" log
7. [ ] Watch console for "[Event Bridge] Refetch triggered" log
8. [ ] Verify badge changes to "Processing" (no refresh)
9. [ ] Wait 5-10 seconds
10. [ ] Verify badge changes to "Complete" (no refresh)
11. [ ] Screenshot final state

**Expected:**
- Badge updates without page refresh
- Console logs show event flow
- No errors in console
- Toast notifications appear

### Test 2: Multiple Rapid Events
1. [ ] Open browser console
2. [ ] Paste this code:
```javascript
for (let i = 0; i < 10; i++) {
  setTimeout(() => {
    const event = new CustomEvent('ticket-status-updated', {
      detail: { postId: '123', status: 'processing', agentId: 'agent-1', timestamp: Date.now() }
    });
    window.dispatchEvent(event);
  }, i * 50);
}
```
3. [ ] Execute code
4. [ ] Watch Network tab for API calls to /api/posts
5. [ ] Verify only 1 API call made (debounce working)

**Expected:**
- 10 events dispatched
- Only 1 API call (debounced)
- No console errors

### Test 3: Unmount Cleanup
1. [ ] Navigate to http://localhost:3000
2. [ ] Open console
3. [ ] Type: `getEventListeners(window)['ticket-status-updated']`
4. [ ] Verify 1 listener present
5. [ ] Navigate away (e.g., to /about)
6. [ ] Type: `getEventListeners(window)['ticket-status-updated']`
7. [ ] Verify 0 listeners present

**Expected:**
- Listener added on mount
- Listener removed on unmount
- No memory leak

### Test 4: Filter Preservation
1. [ ] Navigate to feed
2. [ ] Type "test" in search box
3. [ ] Wait for filtered results
4. [ ] Note number of posts
5. [ ] Dispatch manual event (console):
```javascript
const event = new CustomEvent('ticket-status-updated', {
  detail: { postId: '123', status: 'complete', agentId: 'agent-1', timestamp: Date.now() }
});
window.dispatchEvent(event);
```
6. [ ] Wait for refetch
7. [ ] Verify search box still shows "test"
8. [ ] Verify same number of posts

**Expected:**
- Search filter preserved
- Posts refetched with filter applied
- UI state not reset

### Test 5: Error Handling
1. [ ] Stop backend server
2. [ ] Dispatch event (console):
```javascript
const event = new CustomEvent('ticket-status-updated', {
  detail: { postId: '999', status: 'processing', agentId: 'agent-1', timestamp: Date.now() }
});
window.dispatchEvent(event);
```
3. [ ] Verify error logged to console
4. [ ] Verify no crash or blank page
5. [ ] Restart backend
6. [ ] Dispatch event again
7. [ ] Verify refetch works

**Expected:**
- Graceful error handling
- Error logged to console
- No UI crash
- Recovery after backend restart

### Test 6: Cross-Browser
- [ ] Test in Chrome
- [ ] Test in Firefox
- [ ] Test in Safari
- [ ] Test in Edge

**Expected:**
- Works identically in all browsers
- No browser-specific errors
```

## 8. Implementation Plan

### 8.1 Phase 1: Hook Modification (30 minutes)

**Tasks:**
1. Open `/workspaces/agent-feed/frontend/src/hooks/useTicketUpdates.js`
2. Add custom event creation in WebSocket handler
3. Add window.dispatchEvent() call
4. Add development logging
5. Test event emission in isolation

**Deliverables:**
- Modified useTicketUpdates.js
- Unit tests passing
- Development logs visible in console

**Acceptance:**
- Events emitted on WebSocket messages
- Existing functionality (toast, React Query) still works
- No TypeScript errors
- No console errors

### 8.2 Phase 2: Component Modification (60 minutes)

**Tasks:**
1. Open `/workspaces/agent-feed/frontend/src/components/RealSocialMediaFeed.tsx`
2. Import debounce utility
3. Add useRef for loadPosts
4. Add debounced refetch function
5. Add event listener useEffect
6. Add cleanup logic
7. Test component in isolation

**Deliverables:**
- Modified RealSocialMediaFeed.tsx
- Event listener registered
- Debounce working
- Cleanup verified

**Acceptance:**
- Event listener added/removed correctly
- loadPosts() called on events
- Debounce prevents API spam
- No memory leaks

### 8.3 Phase 3: Integration Testing (45 minutes)

**Tasks:**
1. Start backend + frontend
2. Create post with URL
3. Observe WebSocket → Event → Refetch flow
4. Verify badge updates
5. Test edge cases (rapid events, unmount, errors)
6. Record console logs and screenshots

**Deliverables:**
- Integration working end-to-end
- Screenshots of badge updates
- Console logs showing event flow

**Acceptance:**
- Badge updates without refresh
- No console errors
- Performance acceptable (< 500ms)

### 8.4 Phase 4: Automated Testing (45 minutes)

**Tasks:**
1. Write unit tests for hook
2. Write unit tests for component
3. Write integration test
4. Write E2E Playwright test
5. Run full test suite

**Deliverables:**
- All tests passing
- Test coverage > 80%
- E2E test with screenshots

**Acceptance:**
- Jest tests pass
- Playwright test passes
- No flaky tests
- Good test coverage

### 8.5 Phase 5: Documentation and Validation (30 minutes)

**Tasks:**
1. Update code comments
2. Add JSDoc to functions
3. Create implementation summary
4. Run manual testing checklist
5. Create PR

**Deliverables:**
- Code comments complete
- Implementation summary document
- Manual testing complete
- PR ready for review

**Acceptance:**
- Code well-documented
- All manual tests pass
- PR description clear
- Ready for deployment

## 9. Validation and Acceptance

### 9.1 Functional Validation

**Checklist:**
- [ ] Badge updates without page refresh
- [ ] Updates occur within 500ms of WebSocket event
- [ ] Toast notifications still appear
- [ ] Search filter preserved during update
- [ ] Sort order preserved during update
- [ ] Pagination preserved during update
- [ ] Multiple rapid events debounced (1 API call)
- [ ] No console errors or warnings
- [ ] No React warnings (unmounted component, etc.)

### 9.2 Performance Validation

**Metrics:**
- [ ] Event dispatch < 5ms (measured via Performance API)
- [ ] Total update latency < 500ms p95
- [ ] No memory leaks (heap stable after 100 cycles)
- [ ] No duplicate event listeners
- [ ] Debounce working (10 events → 1 API call)

### 9.3 Regression Validation

**Tests:**
- [ ] All existing Jest tests pass
- [ ] All existing Playwright tests pass
- [ ] Post creation works
- [ ] Comment submission works
- [ ] Like/unlike works
- [ ] Search works
- [ ] Filter works
- [ ] Pagination works
- [ ] Responsive design intact

### 9.4 Browser Compatibility

**Browsers:**
- [ ] Chrome 90+ ✓
- [ ] Firefox 88+ ✓
- [ ] Safari 14+ ✓
- [ ] Edge 90+ ✓

### 9.5 Sign-Off Criteria

**Required for Production:**
1. All functional validation passed
2. All performance metrics met
3. No regression test failures
4. All browsers tested
5. Code review approved
6. Manual testing checklist 100% complete
7. Documentation updated
8. No P0 or P1 bugs

## 10. Rollout Plan

### 10.1 Development Deployment

**Environment:** Local dev
**Steps:**
1. Merge PR to `v1` branch
2. Pull latest code
3. Run `npm install` (if dependencies added)
4. Restart dev servers
5. Smoke test manually

**Rollback:** `git checkout <previous-commit>`

### 10.2 Staging Deployment

**Environment:** Staging server (if exists)
**Steps:**
1. Deploy to staging
2. Run full automated test suite
3. Manual testing checklist
4. Performance monitoring
5. Soak test (24 hours)

**Success Criteria:**
- All tests pass
- No errors in logs
- Performance acceptable
- No user-reported issues

### 10.3 Production Deployment

**Environment:** Production
**Steps:**
1. Create production build: `npm run build`
2. Deploy frontend assets
3. Monitor logs for errors
4. Monitor performance metrics
5. Watch user feedback

**Monitoring:**
- Error rate (should be 0%)
- API latency (should be < 300ms)
- WebSocket connection stability
- User session duration (should not decrease)

**Rollback Plan:**
- If errors > 1%: Immediate rollback
- If latency > 1000ms: Immediate rollback
- If WebSocket disconnects: Investigate, possible rollback

## 11. Future Enhancements

### 11.1 Optimistic Updates

**Description:** Update badge optimistically before API refetch

**Benefit:**
- Instant feedback (0ms perceived latency)
- Better UX

**Implementation:**
```typescript
const handleTicketUpdate = (event: CustomEvent) => {
  const { postId, status } = event.detail;

  // Optimistically update state
  setPosts(prev => prev.map(post =>
    post.id === postId
      ? { ...post, ticketStatus: { status } }
      : post
  ));

  // Then refetch for authoritative data
  debouncedRefetch();
};
```

**Risk:** State mismatch if API returns different data

### 11.2 Event Batching

**Description:** Batch multiple events into single refetch

**Benefit:**
- More efficient API usage
- Better performance under load

**Implementation:**
```typescript
const eventBatch: Set<string> = new Set();

const handleTicketUpdate = (event: CustomEvent) => {
  eventBatch.add(event.detail.postId);

  debouncedRefetch(); // Refetch includes all batched IDs
};
```

### 11.3 Selective Refetch

**Description:** Only refetch affected post, not entire feed

**Benefit:**
- Minimal data transfer
- Faster updates

**Implementation:**
```typescript
const handleTicketUpdate = async (event: CustomEvent) => {
  const { postId } = event.detail;

  // Fetch single post
  const response = await api.get(`/api/posts/${postId}`);

  // Update only that post in state
  setPosts(prev => prev.map(post =>
    post.id === postId ? response.data : post
  ));
};
```

**Requirement:** Backend API endpoint for single post

### 11.4 Event Metrics

**Description:** Track event bridge performance and reliability

**Metrics:**
- Events emitted per minute
- Events received per minute
- Average update latency
- Error rate

**Implementation:**
```typescript
const metrics = {
  eventsEmitted: 0,
  eventsReceived: 0,
  totalLatency: 0,
  errors: 0
};

// Track in event handlers
window.addEventListener('ticket-status-updated', (event) => {
  metrics.eventsReceived++;
  const latency = Date.now() - event.detail.timestamp;
  metrics.totalLatency += latency;
});

// Send to analytics
setInterval(() => {
  analytics.track('event-bridge-metrics', metrics);
}, 60000);
```

## 12. Appendix

### 12.1 Glossary

**Term** | **Definition**
--- | ---
Custom Event | Browser-native event created via `new CustomEvent()`
Event Bridge | Pattern connecting two decoupled systems via events
Debounce | Delay function execution until after rapid calls stop
React Query | Data fetching library (not used in this component)
useState | React hook for local component state
WebSocket | Persistent bidirectional connection for real-time data
Badge | UI element showing ticket processing status

### 12.2 References

**Documentation:**
- [MDN CustomEvent](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent)
- [React useEffect Cleanup](https://react.dev/reference/react/useEffect#cleanup-function)
- [Lodash Debounce](https://lodash.com/docs/#debounce)

**Related Specs:**
- `/workspaces/agent-feed/docs/SPARC-TICKET-LINKING-FIX.md`
- `/workspaces/agent-feed/docs/WEBSOCKET-INTEGRATION-REPORT.md`

### 12.3 Decision Log

**Decision 1: Use CustomEvent vs EventEmitter**
- **Choice:** CustomEvent
- **Reason:** Browser-native, no additional dependencies, TypeScript support
- **Alternatives:** EventEmitter (Node.js pattern), RxJS Subject
- **Trade-offs:** Less powerful than RxJS, but simpler and lighter

**Decision 2: Debounce in Component vs Hook**
- **Choice:** Component
- **Reason:** Keeps hook simple, component controls refetch timing
- **Alternatives:** Debounce in hook before emit
- **Trade-offs:** Component slightly more complex, but more flexible

**Decision 3: Full Refetch vs Selective Update**
- **Choice:** Full refetch
- **Reason:** Simpler, reuses existing loadPosts(), ensures consistency
- **Alternatives:** Fetch single post, optimistic update
- **Trade-offs:** More data transfer, but safer and simpler

**Decision 4: Silent Error vs User Notification**
- **Choice:** Silent error (console log only)
- **Reason:** Next event will retry, no need to alarm user
- **Alternatives:** Show toast error
- **Trade-offs:** User might not notice failure, but avoids error fatigue

### 12.4 Risk Assessment

**Risk** | **Impact** | **Probability** | **Mitigation**
--- | --- | --- | ---
Memory leak from listener | High | Low | Automated cleanup tests, manual verification
Race condition on rapid events | Medium | Medium | Debounce implementation, isMounted check
API failure during refetch | Medium | Low | Error handling, silent degradation
Event before mount | Low | Medium | Accept loss, component refetches on mount anyway
Browser compatibility | Medium | Low | Test in all browsers, use standard APIs
Performance degradation | High | Low | Debounce, performance tests, monitoring

### 12.5 Contact and Support

**Primary Developer:** [Your Name]
**Code Reviewers:** [Team Members]
**Stakeholders:** [Product/Business Contacts]

**Support Channels:**
- Slack: #agent-feed-dev
- GitHub Issues: agent-feed/issues
- Email: dev-team@company.com

---

**Document Version:** 1.0
**Last Updated:** 2025-10-24
**Next Review:** After Phase 1 Implementation
