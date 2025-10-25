# SPARC Badge Real-Time Update Fix - Pseudocode

## Problem Statement

**Root Cause**: Field name mismatch between WebSocket event handler and UI component
- Hook's optimistic update sets: `post.ticketStatus` (camelCase)
- Badge component expects: `post.ticket_status` (snake_case object)
- Result: Badge never receives update, shows stale data

**Current Flawed Approach** (Lines 83-107 in useTicketUpdates.js):
```
// PROBLEMATIC: Manual cache manipulation with wrong field name
queryClient.setQueryData(['posts'], (oldData) => {
  return oldData.map(post =>
    post.id === postId
      ? { ...post, ticketStatus: status }  // WRONG FIELD NAME
      : post
  )
})
```

**Solution Philosophy**:
- Remove complex optimistic updates
- Rely on React Query's cache invalidation
- Let server be source of truth
- Simplify code, eliminate field name mismatches

---

## Algorithm 1: WebSocket Event Handler

```
ALGORITHM: HandleTicketStatusUpdate
INPUT:
  - websocketMessage: {
      event: "ticket_status_update",
      data: {
        ticket_id: string,
        post_id: string (optional),
        agent_id: string,
        status: enum["pending", "processing", "completed", "failed"],
        timestamp: ISO8601 string,
        error_message: string (optional)
      }
    }
  - queryClient: ReactQueryClient instance
  - showNotifications: boolean (user preference)

OUTPUT: void (side effects: cache invalidation, toast notifications)

CONSTANTS:
  DEBOUNCE_DELAY = 100ms  // Prevent invalidation storms
  NOTIFICATION_DURATION = 3000ms

BEGIN
  // Phase 1: Validate Input
  LOG.debug("Ticket update received", {
    ticket_id: websocketMessage.data.ticket_id,
    post_id: websocketMessage.data.post_id,
    status: websocketMessage.data.status,
    timestamp: websocketMessage.data.timestamp
  })

  IF websocketMessage.data is null OR websocketMessage.data.status is null THEN
    LOG.warn("Invalid ticket update message", websocketMessage)
    RETURN early
  END IF

  // Phase 2: Extract Data
  ticketId ← websocketMessage.data.ticket_id
  postId ← websocketMessage.data.post_id
  status ← websocketMessage.data.status
  errorMessage ← websocketMessage.data.error_message
  agentId ← websocketMessage.data.agent_id

  // Phase 3: User Notifications
  // Show toast based on status type
  IF showNotifications is true THEN
    CASE status OF
      "completed":
        toast.success(
          "Intelligence extraction complete",
          {
            duration: NOTIFICATION_DURATION,
            icon: "✓",
            metadata: { ticket_id: ticketId, post_id: postId }
          }
        )

      "failed":
        message ← errorMessage OR "Extraction failed"
        toast.error(
          message,
          {
            duration: NOTIFICATION_DURATION,
            icon: "✗",
            metadata: { ticket_id: ticketId, error: errorMessage }
          }
        )

      "processing":
        toast.info(
          "Processing content...",
          {
            duration: NOTIFICATION_DURATION,
            icon: "⟳",
            metadata: { ticket_id: ticketId, agent_id: agentId }
          }
        )

      "pending":
        // No notification for pending state
        SKIP
    END CASE
  END IF

  // Phase 4: Cache Invalidation Strategy
  // CRITICAL: We do NOT manually update cache
  // Instead, we invalidate and let React Query refetch

  // Sub-strategy A: Invalidate global posts list
  queryClient.invalidateQueries({
    queryKey: ["posts"],
    exact: false,  // Include all variations (with filters, etc.)
    refetchType: "active"  // Only refetch if component is mounted
  })

  // Sub-strategy B: Invalidate specific post if post_id exists
  IF postId is not null AND postId is not empty THEN
    queryClient.invalidateQueries({
      queryKey: ["post", postId],
      exact: true,
      refetchType: "active"
    })
  END IF

  // Sub-strategy C: Invalidate ticket-specific queries
  queryClient.invalidateQueries({
    queryKey: ["ticket", ticketId],
    exact: true,
    refetchType: "active"
  })

  LOG.debug("Cache invalidated", {
    queries_invalidated: ["posts", "post:" + postId, "ticket:" + ticketId],
    will_refetch: "active queries only"
  })

  // Phase 5: Automatic Refetch
  // React Query automatically refetches invalidated queries
  // that are currently being observed by mounted components
  //
  // Server response will have correct structure:
  // {
  //   id: post_id,
  //   ticket_status: {
  //     status: "completed",
  //     ticket_id: ticketId,
  //     updated_at: timestamp
  //   }
  // }
  //
  // Badge will re-render with fresh data
  // No field name mismatch possible

END
```

---

## Algorithm 2: Debounced Cache Invalidation

**Why Needed**: Prevent invalidation storms when multiple rapid updates arrive

```
ALGORITHM: DebouncedInvalidation
INPUT:
  - queryKey: string or array
  - debounceDelay: number (milliseconds)

STATE:
  - pendingInvalidations: Map<queryKey, timeoutId>

BEGIN
  // Check if invalidation is already pending for this key
  IF pendingInvalidations.has(queryKey) THEN
    // Clear existing timeout
    clearTimeout(pendingInvalidations.get(queryKey))
  END IF

  // Schedule new invalidation
  timeoutId ← setTimeout(() => {
    queryClient.invalidateQueries({
      queryKey: queryKey,
      refetchType: "active"
    })

    // Remove from pending map
    pendingInvalidations.delete(queryKey)

    LOG.debug("Debounced invalidation executed", { queryKey })
  }, debounceDelay)

  // Store timeout ID
  pendingInvalidations.set(queryKey, timeoutId)

  LOG.debug("Invalidation scheduled", {
    queryKey: queryKey,
    delay: debounceDelay
  })
END
```

---

## Algorithm 3: WebSocket Connection Management

```
ALGORITHM: ManageWebSocketConnection
INPUT:
  - socketUrl: string
  - reconnectAttempts: number (max retry count)
  - reconnectDelay: number (base delay in ms)

STATE:
  - socket: WebSocket instance or null
  - isConnected: boolean
  - reconnectCount: number
  - reconnectTimer: timeoutId or null

CONSTANTS:
  MAX_RECONNECT_ATTEMPTS = 5
  BASE_RECONNECT_DELAY = 1000ms
  MAX_RECONNECT_DELAY = 30000ms

BEGIN
  FUNCTION connect():
    BEGIN
      IF socket is not null AND socket.readyState is OPEN THEN
        LOG.warn("Already connected")
        RETURN
      END IF

      TRY
        socket ← new WebSocket(socketUrl)

        socket.onopen ← () => {
          LOG.info("WebSocket connected")
          isConnected ← true
          reconnectCount ← 0

          // Invalidate all posts to get latest data
          queryClient.invalidateQueries({
            queryKey: ["posts"],
            refetchType: "active"
          })
        }

        socket.onmessage ← (event) => {
          message ← JSON.parse(event.data)

          IF message.event === "ticket_status_update" THEN
            HandleTicketStatusUpdate(message, queryClient, showNotifications)
          END IF
        }

        socket.onerror ← (error) => {
          LOG.error("WebSocket error", error)
        }

        socket.onclose ← () => {
          LOG.warn("WebSocket disconnected")
          isConnected ← false

          // Attempt reconnection with exponential backoff
          scheduleReconnect()
        }

      CATCH error
        LOG.error("Failed to create WebSocket", error)
        scheduleReconnect()
      END TRY
    END

  FUNCTION scheduleReconnect():
    BEGIN
      IF reconnectCount >= MAX_RECONNECT_ATTEMPTS THEN
        LOG.error("Max reconnect attempts reached")
        toast.error("Lost connection to server")
        RETURN
      END IF

      // Exponential backoff: delay = baseDelay * 2^attempts
      delay ← MIN(
        BASE_RECONNECT_DELAY * (2 ^ reconnectCount),
        MAX_RECONNECT_DELAY
      )

      LOG.info("Scheduling reconnect", {
        attempt: reconnectCount + 1,
        delay: delay
      })

      reconnectTimer ← setTimeout(() => {
        reconnectCount ← reconnectCount + 1
        connect()
      }, delay)
    END

  FUNCTION disconnect():
    BEGIN
      IF reconnectTimer is not null THEN
        clearTimeout(reconnectTimer)
        reconnectTimer ← null
      END IF

      IF socket is not null THEN
        socket.close()
        socket ← null
      END IF

      isConnected ← false
      reconnectCount ← 0
    END

  // Initialize connection
  connect()

  // Return cleanup function
  RETURN disconnect
END
```

---

## Data Structure: Server Response Format

```
DATA STRUCTURE: PostWithTicketStatus

// What the server returns after cache invalidation
Post {
  id: string (UUID),
  content: string,
  author: string,
  created_at: timestamp,
  updated_at: timestamp,
  url: string (optional),

  // CRITICAL: Server uses snake_case
  ticket_status: TicketStatus or null
}

TicketStatus {
  ticket_id: string (UUID),
  status: enum["pending", "processing", "completed", "failed"],
  created_at: timestamp,
  updated_at: timestamp,
  error_message: string (optional),
  agent_id: string (optional)
}

// Badge component expects this exact structure
COMPONENT TicketStatusBadge EXPECTS:
  post.ticket_status: TicketStatus or null

  IF post.ticket_status is null:
    RENDER nothing
  ELSE:
    RENDER badge based on post.ticket_status.status
  END IF
```

---

## Complexity Analysis

### Time Complexity

**HandleTicketStatusUpdate**:
- Validation: O(1)
- Toast notification: O(1)
- Cache invalidation: O(1) - React Query handles internally
- Total: O(1)

**DebouncedInvalidation**:
- Map lookup: O(1)
- Timeout management: O(1)
- Total: O(1)

**Cache Refetch** (React Query internal):
- Query lookup: O(1) - hash map
- Network request: O(n) where n = network latency
- Cache update: O(m) where m = number of posts
- Component re-render: O(k) where k = affected components
- Total: O(m + k) but async, non-blocking

### Space Complexity

**Hook State**:
- WebSocket connection: O(1)
- Pending invalidations map: O(p) where p = unique query keys
- Total: O(p), typically p < 10

**React Query Cache**:
- Posts cache: O(n) where n = number of posts
- Individual post caches: O(n)
- Total: O(n)

---

## Why Remove Optimistic Updates

### Problem 1: Field Name Mismatch
```
// Current code (WRONG):
setQueryData(['posts'], (oldData) =>
  oldData.map(post =>
    post.id === postId
      ? { ...post, ticketStatus: status }  // camelCase
      : post
  )
)

// Badge expects:
post.ticket_status.status  // snake_case object
```

### Problem 2: Incomplete Data
```
// Optimistic update only sets status string:
{ ticketStatus: "completed" }

// But server returns full object:
{
  ticket_status: {
    ticket_id: "uuid",
    status: "completed",
    updated_at: "2025-10-24T10:30:00Z",
    agent_id: "agent-123"
  }
}
```

### Problem 3: Race Conditions
```
SCENARIO: Multiple rapid updates
  t=0ms:  Update 1 arrives (status: "pending")
  t=10ms: Update 2 arrives (status: "processing")
  t=20ms: Server refetch for Update 1 completes
  t=30ms: Server refetch for Update 2 completes

  Problem: Updates may arrive out of order
  Solution: Server timestamp is authoritative
```

### Problem 4: Cache Inconsistency
```
SCENARIO: Optimistic update + server update conflict
  1. WebSocket: status = "processing"
  2. Optimistic update: cache shows "processing"
  3. Server refetch: status = "completed" (finished quickly)
  4. Cache now has two conflicting states

  Solution: Skip optimistic updates, trust server
```

---

## Edge Cases and Handling

### Edge Case 1: Rapid Sequential Updates
```
PROBLEM:
  Updates arrive faster than React Query can refetch

SOLUTION:
  Debounce invalidations (Algorithm 2)

  t=0ms:   Update arrives, schedule invalidation for t=100ms
  t=50ms:  Update arrives, cancel previous, schedule for t=150ms
  t=120ms: Update arrives, cancel previous, schedule for t=220ms
  t=220ms: Final invalidation executes, gets latest state
```

### Edge Case 2: Post ID Missing
```
SCENARIO:
  WebSocket message has ticket_id but no post_id
  (Possible if ticket created before post saved)

HANDLING:
  IF postId is null OR postId is empty THEN
    // Only invalidate global posts list
    invalidateQueries(["posts"])

    // Skip specific post invalidation
    SKIP invalidateQueries(["post", postId])
  END IF

  Server refetch will match by ticket_id on backend
```

### Edge Case 3: WebSocket Disconnection During Processing
```
SCENARIO:
  1. Ticket starts processing
  2. WebSocket disconnects
  3. Processing completes (no update received)
  4. User sees stale "processing" badge

SOLUTION:
  When WebSocket reconnects:
    INVALIDATE all queries ["posts"]
    Server returns current state
    Badge updates to "completed"

  Additional: Implement polling fallback
    EVERY 30 seconds:
      IF ticket.status IN ["pending", "processing"] THEN
        invalidateQueries(["post", post.id])
      END IF
```

### Edge Case 4: Component Unmounted
```
SCENARIO:
  Update arrives but post component is unmounted

HANDLING:
  React Query handles automatically:
    invalidateQueries({ refetchType: "active" })

  Only active (mounted) queries refetch
  Inactive queries marked stale, refetch on next mount

  No memory leaks, no unnecessary requests
```

### Edge Case 5: Multiple Tabs Open
```
SCENARIO:
  User has app open in two browser tabs
  Update arrives in Tab 1

HANDLING:
  Tab 1: Receives WebSocket update, invalidates cache
  Tab 2: No WebSocket connection (browser limitation)

SOLUTION A (Current):
  Each tab has own WebSocket connection
  Both receive updates independently

SOLUTION B (Future):
  Use BroadcastChannel API:
    Tab 1 receives update
    Tab 1 broadcasts to other tabs
    Tab 2 invalidates cache
```

### Edge Case 6: Ticket Update for Filtered-Out Post
```
SCENARIO:
  User viewing filtered feed (e.g., "only completed")
  Update arrives for post not in current view

HANDLING:
  invalidateQueries(["posts"]) invalidates all variants

  IF post matches new filter THEN
    Appears in feed after refetch
  ELSE
    Refetch returns same filtered set
  END IF

  Minimal overhead, correct behavior
```

---

## Migration Strategy

### Step 1: Remove Problematic Code
```
DELETE lines 83-107 in /workspaces/agent-feed/frontend/src/hooks/useTicketUpdates.js

// Remove this entire block:
queryClient.setQueryData(['posts'], (oldData) => {
  if (!Array.isArray(oldData)) return oldData;
  return oldData.map(post =>
    post.id === postId
      ? { ...post, ticketStatus: status }
      : post
  );
});
```

### Step 2: Simplify Event Handler
```
REPLACE with:

// Simple, correct cache invalidation
queryClient.invalidateQueries({
  queryKey: ['posts'],
  exact: false,
  refetchType: 'active'
});

if (postId) {
  queryClient.invalidateQueries({
    queryKey: ['post', postId],
    exact: true,
    refetchType: 'active'
  });
}
```

### Step 3: Verify Server Response
```
ENSURE server endpoint returns correct structure:

GET /api/posts
RETURNS: Post[] where each Post has:
{
  id: string,
  content: string,
  ticket_status: {
    status: enum,
    ticket_id: string,
    updated_at: timestamp
  } or null
}
```

### Step 4: Test Badge Rendering
```
TEST CASE 1: New post with URL
  1. Create post with URL
  2. Verify badge shows "pending"
  3. Wait for processing
  4. Verify badge updates to "processing"
  5. Wait for completion
  6. Verify badge updates to "completed"

TEST CASE 2: Rapid updates
  1. Create multiple posts with URLs
  2. Verify all badges update correctly
  3. Check no console errors

TEST CASE 3: Reconnection
  1. Disconnect WebSocket
  2. Update ticket on server
  3. Reconnect WebSocket
  4. Verify badge shows correct state
```

---

## Success Metrics

### Functional Requirements
- [ ] Badge displays correct status immediately after WebSocket update
- [ ] No field name mismatch errors in console
- [ ] Status changes: pending -> processing -> completed work correctly
- [ ] Error states display properly
- [ ] Multiple rapid updates handled without race conditions

### Performance Requirements
- [ ] Cache invalidation completes in < 10ms
- [ ] Server refetch completes in < 500ms (normal network)
- [ ] No unnecessary refetches (debouncing works)
- [ ] Memory usage stable (no leaks from event handlers)

### Reliability Requirements
- [ ] WebSocket reconnection after disconnect
- [ ] Graceful handling of malformed messages
- [ ] Works with multiple browser tabs
- [ ] Handles posts without tickets correctly
- [ ] Updates persist after page refresh

---

## Implementation Checklist

1. [ ] Read current useTicketUpdates.js implementation
2. [ ] Delete lines 83-107 (optimistic update block)
3. [ ] Add cache invalidation calls
4. [ ] Add debouncing logic
5. [ ] Verify server endpoint response format
6. [ ] Update TypeScript types if needed
7. [ ] Write unit tests for event handler
8. [ ] Write integration test for WebSocket flow
9. [ ] Test with Playwright E2E
10. [ ] Verify in production with real URLs

---

## References

- Current implementation: `/workspaces/agent-feed/frontend/src/hooks/useTicketUpdates.js`
- Badge component: `/workspaces/agent-feed/frontend/src/components/TicketStatusBadge.jsx`
- Server endpoint: `/workspaces/agent-feed/api-server/routes/posts.js`
- WebSocket service: `/workspaces/agent-feed/api-server/services/websocket-service.js`
- React Query docs: https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation
