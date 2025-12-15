# SPARC Specification: Toast Notification Fix

## Document Metadata
- **Author**: SPARC Specification Agent
- **Created**: 2025-11-13
- **Status**: Active
- **Priority**: High
- **Category**: Frontend UX Enhancement

---

## 1. Problem Statement

### User-Visible Symptoms
When a user creates a post containing a question (e.g., "What is the weather like in Los Gatos on Saturday?"), they only see one toast notification:
- ✅ "Post created successfully!" (appears immediately)

**Missing toast notifications:**
- ⏳ "Queued for processing..." (should appear after post creation)
- 🔄 "Processing your request..." (should appear when agent worker starts)
- ✅ "Completed!" (should appear when agent finishes)

### Expected Behavior
Users should see a complete sequence of 4 toast notifications tracking the full lifecycle of their post from creation to completion:
1. Initial confirmation
2. Queue status
3. Processing status
4. Completion status

### Impact
- **Severity**: Medium (UX degradation, not a functional blocker)
- **User Experience**: Users are left wondering if their question is being processed
- **Perception**: System appears unresponsive or broken
- **Affected Users**: Anyone posting questions or requests that trigger agent processing

---

## 2. Root Cause Analysis

### Backend Issue: Incorrect AVI Question Detection
**Location**: Unknown (needs investigation - `isAviQuestion()` function)

**Current Logic** (suspected):
```javascript
function isAviQuestion(content) {
  return content.includes('?');  // ❌ TOO BROAD
}
```

**Problem**: This treats ALL questions as AVI DM messages, which:
- Routes normal posts to AVI session manager
- Bypasses normal work queue ticket creation
- Prevents WebSocket events from being emitted

**What Should Happen**:
- Only DIRECT messages to AVI (in Avi DM tab) should go to session manager
- Regular posts with questions should go through normal work queue
- Work queue tickets should emit WebSocket status events

### Frontend Issue: Missing WebSocket Listener
**Location**: `/workspaces/agent-feed/frontend/src/components/EnhancedPostingInterface.tsx`

**Current State**:
- Component does NOT listen for `ticket:status:update` WebSocket events
- Only shows initial "Post created successfully!" toast (line 145)
- No subscription to post-specific status updates

**What Should Happen**:
- Subscribe to WebSocket on mount: `socket.on('ticket:status:update', handleStatusUpdate)`
- Listen for ticket status changes: `pending`, `processing`, `completed`, `failed`
- Display appropriate toast for each status change
- Unsubscribe on unmount to prevent memory leaks

---

## 3. Current Flow (Broken)

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. User Types Question                                          │
│    "What is the weather like in Los Gatos on Saturday?"         │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 v
┌─────────────────────────────────────────────────────────────────┐
│ 2. Frontend: QuickPostSection.handleSubmit()                    │
│    - POST /api/v1/agent-posts                                   │
│    - Shows toast: "Post created successfully!" ✅               │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 v
┌─────────────────────────────────────────────────────────────────┐
│ 3. Backend: POST handler detects '?' in content                 │
│    - Calls isAviQuestion(content) → returns TRUE ❌             │
│    - Routes to AVI Session Manager (WRONG!)                     │
│    - Does NOT create work queue ticket                          │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 v
┌─────────────────────────────────────────────────────────────────┐
│ 4. AVI Session Manager: Processes as DM                         │
│    - Calls getAviSession().chat(content)                        │
│    - HANGS (90s timeout eventually fires)                       │
│    - NO WebSocket events emitted ❌                             │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 v
┌─────────────────────────────────────────────────────────────────┐
│ 5. Frontend: No Additional Toasts                               │
│    - No WebSocket listener configured ❌                        │
│    - User sees no progress updates                              │
│    - Post appears "stuck" in pending state                      │
└─────────────────────────────────────────────────────────────────┘

**Key Problems:**
1. Backend incorrectly treats posts with '?' as AVI DMs
2. No work queue ticket created → no WebSocket events
3. Frontend not listening for events even if they were sent
```

---

## 4. Proposed Solution

### Backend Changes

#### Change 1: Fix `isAviQuestion()` Logic
**File**: Find where `isAviQuestion()` is defined (likely in post creation handler)

**Current** (suspected):
```javascript
function isAviQuestion(content) {
  return content.includes('?');
}
```

**Fixed**:
```javascript
function isAviQuestion(content) {
  // Only AVI-specific routing patterns, NOT generic questions
  // These are already handled by explicit user actions (Avi DM tab)
  return false; // Regular posts NEVER auto-route to AVI
}
```

**Alternative** (if explicit routing needed):
```javascript
function isAviQuestion(content, context = {}) {
  // Only route to AVI if explicitly sent from Avi DM interface
  if (context.source === 'avi-dm') {
    return true;
  }

  // All other posts go through normal work queue
  return false;
}
```

#### Change 2: Ensure Work Queue Ticket Creation
**File**: Post creation handler

**Ensure This Flow**:
```javascript
// After post creation
if (requiresProcessing(post)) {
  // Create work queue ticket
  const ticket = await workQueueRepo.createTicket({
    post_id: post.id,
    agent_id: 'intelligent-agent',
    content: post.content,
    status: 'pending'
  });

  // Emit initial status
  websocketService.emitTicketStatusUpdate({
    post_id: post.id,
    ticket_id: ticket.id,
    status: 'pending',
    agent_id: ticket.agent_id,
    timestamp: new Date().toISOString()
  });
}
```

### Frontend Changes

#### Change 3: Add WebSocket Listener in EnhancedPostingInterface
**File**: `/workspaces/agent-feed/frontend/src/components/EnhancedPostingInterface.tsx`

**Add to QuickPostSection**:
```typescript
import { useEffect } from 'react';
import { socket } from '../services/websocket'; // Import WebSocket singleton

const QuickPostSection: React.FC<{ ... }> = ({ onPostCreated, toast }) => {
  const [lastPostId, setLastPostId] = useState<string | null>(null);

  // Subscribe to ticket status updates
  useEffect(() => {
    if (!lastPostId) return;

    const handleStatusUpdate = (data: {
      post_id: string;
      ticket_id: string;
      status: 'pending' | 'processing' | 'completed' | 'failed';
      agent_id: string;
      timestamp: string;
      error?: string;
    }) => {
      // Only handle updates for our post
      if (data.post_id !== lastPostId) return;

      // Map status to toast message
      const toastMessages = {
        pending: '⏳ Queued for processing...',
        processing: '🔄 Processing your request...',
        completed: '✅ Completed!',
        failed: `❌ Failed: ${data.error || 'Unknown error'}`
      };

      const message = toastMessages[data.status];

      if (data.status === 'completed') {
        toast.showSuccess(message);
        setLastPostId(null); // Clear to stop listening
      } else if (data.status === 'failed') {
        toast.showError(message);
        setLastPostId(null); // Clear to stop listening
      } else {
        toast.showInfo(message);
      }
    };

    // Subscribe to WebSocket events
    socket.on('ticket:status:update', handleStatusUpdate);

    // Cleanup on unmount or postId change
    return () => {
      socket.off('ticket:status:update', handleStatusUpdate);
    };
  }, [lastPostId, toast]);

  const submitPost = async () => {
    // ... existing code ...

    const result = await response.json();
    toast.showSuccess(`✓ Post created successfully!`);
    setLastPostId(result.data.id); // Store post ID to listen for updates
    onPostCreated?.(result.data);
    setContent('');
  };

  // ... rest of component
};
```

---

## 5. Expected Flow (Fixed)

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. User Types Question                                          │
│    "What is the weather like in Los Gatos on Saturday?"         │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 v
┌─────────────────────────────────────────────────────────────────┐
│ 2. Frontend: QuickPostSection.handleSubmit()                    │
│    - POST /api/v1/agent-posts                                   │
│    - Toast 1: "Post created successfully!" ✅                   │
│    - Subscribes to WebSocket: socket.on('ticket:status:update') │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 v
┌─────────────────────────────────────────────────────────────────┐
│ 3. Backend: POST handler (FIXED)                                │
│    - isAviQuestion() returns FALSE (fixed logic) ✅             │
│    - Creates work queue ticket                                  │
│    - Emits: ticket:status:update (status: 'pending')            │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 v
┌─────────────────────────────────────────────────────────────────┐
│ 4. Frontend: Receives WebSocket Event                           │
│    - Event: { status: 'pending', post_id: '123', ... }         │
│    - Toast 2: "⏳ Queued for processing..." ✅                  │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 v
┌─────────────────────────────────────────────────────────────────┐
│ 5. Backend: Agent Worker Starts                                 │
│    - Worker picks up ticket from queue                          │
│    - Emits: ticket:status:update (status: 'processing')         │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 v
┌─────────────────────────────────────────────────────────────────┐
│ 6. Frontend: Receives WebSocket Event                           │
│    - Event: { status: 'processing', post_id: '123', ... }      │
│    - Toast 3: "🔄 Processing your request..." ✅               │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 v
┌─────────────────────────────────────────────────────────────────┐
│ 7. Backend: Agent Worker Completes                              │
│    - Worker processes request successfully                      │
│    - Posts result as comment                                    │
│    - Emits: ticket:status:update (status: 'completed')          │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 v
┌─────────────────────────────────────────────────────────────────┐
│ 8. Frontend: Receives WebSocket Event                           │
│    - Event: { status: 'completed', post_id: '123', ... }       │
│    - Toast 4: "✅ Completed!" ✅                                │
│    - Unsubscribes from WebSocket                                │
└─────────────────────────────────────────────────────────────────┘

**All 4 Toasts Now Display:**
1. "Post created successfully!" (immediate)
2. "⏳ Queued for processing..." (1-2s later)
3. "🔄 Processing your request..." (when worker starts)
4. "✅ Completed!" (when worker finishes)
```

---

## 6. Technical Changes Summary

### Files to Modify

| File | Changes | Lines Changed |
|------|---------|---------------|
| Backend: Post creation handler | Remove `content.includes('?')` from `isAviQuestion()` | ~5 lines |
| Frontend: `EnhancedPostingInterface.tsx` | Add WebSocket listener in `useEffect` | ~50 lines |
| Frontend: `EnhancedPostingInterface.tsx` | Store `lastPostId` state | ~3 lines |
| Frontend: `EnhancedPostingInterface.tsx` | Update `submitPost` to set `lastPostId` | ~1 line |

### Dependencies
- WebSocket service already exists: `/workspaces/agent-feed/api-server/services/websocket-service.js`
- Frontend WebSocket singleton: `/workspaces/agent-feed/frontend/src/services/websocket.ts`
- Toast hook already exists: `/workspaces/agent-feed/frontend/src/hooks/useToast.ts`

---

## 7. Toast Sequence Specification

### Toast 1: Post Created (Immediate)
- **Trigger**: HTTP 200 response from POST /api/v1/agent-posts
- **Type**: Success
- **Message**: "✓ Post created successfully!"
- **Duration**: 3 seconds
- **Icon**: ✓ (checkmark)
- **Color**: Green

### Toast 2: Queued (1-2 seconds after creation)
- **Trigger**: WebSocket event `ticket:status:update` with `status: 'pending'`
- **Type**: Info
- **Message**: "⏳ Queued for processing..."
- **Duration**: 3 seconds
- **Icon**: ⏳ (hourglass)
- **Color**: Blue

### Toast 3: Processing (When worker starts)
- **Trigger**: WebSocket event `ticket:status:update` with `status: 'processing'`
- **Type**: Info
- **Message**: "🔄 Processing your request..."
- **Duration**: 3 seconds
- **Icon**: 🔄 (refresh/spinner)
- **Color**: Blue

### Toast 4: Completed (When worker finishes)
- **Trigger**: WebSocket event `ticket:status:update` with `status: 'completed'`
- **Type**: Success
- **Message**: "✅ Completed!"
- **Duration**: 3 seconds
- **Icon**: ✅ (checkmark)
- **Color**: Green
- **Action**: Unsubscribe from WebSocket listener

---

## 8. WebSocket Event Structure

### Event Name
`ticket:status:update`

### Event Payload Schema
```typescript
interface TicketStatusUpdateEvent {
  post_id: string;           // Post ID this ticket belongs to
  ticket_id: string;          // Unique ticket identifier
  status: 'pending' | 'processing' | 'completed' | 'failed';
  agent_id: string;           // Agent handling this ticket
  timestamp: string;          // ISO 8601 timestamp
  error?: string;             // Error message (only if status === 'failed')
}
```

### Event Timing

| Status | When Emitted | Typical Delay |
|--------|--------------|---------------|
| `pending` | After ticket created in work queue | 1-2 seconds after post creation |
| `processing` | When agent worker starts execution | 2-5 seconds after `pending` |
| `completed` | When agent worker finishes successfully | 10-60 seconds after `processing` |
| `failed` | When agent worker encounters error | Variable (depends on error) |

### Subscription Pattern
```typescript
// Subscribe to post-specific updates
socket.emit('subscribe:post', postId);
socket.on('ticket:status:update', (event) => {
  if (event.post_id === postId) {
    handleStatusUpdate(event);
  }
});

// Cleanup
socket.off('ticket:status:update', handleStatusUpdate);
socket.emit('unsubscribe:post', postId);
```

---

## 9. Acceptance Criteria

### Functional Requirements
- [ ] **AC-1**: All posts with questions go through normal work queue (NOT AVI session)
- [ ] **AC-2**: Work queue tickets are created for all processing-required posts
- [ ] **AC-3**: WebSocket events are emitted for ticket status changes
- [ ] **AC-4**: Frontend displays "Post created successfully!" toast immediately
- [ ] **AC-5**: Frontend displays "Queued for processing..." toast within 3 seconds
- [ ] **AC-6**: Frontend displays "Processing your request..." toast when worker starts
- [ ] **AC-7**: Frontend displays "Completed!" toast when worker finishes
- [ ] **AC-8**: Frontend unsubscribes from WebSocket after completion
- [ ] **AC-9**: Failed tickets display error toast with message

### Non-Functional Requirements
- [ ] **AC-10**: Toast notifications are non-blocking (don't prevent user actions)
- [ ] **AC-11**: Multiple posts can have active WebSocket subscriptions simultaneously
- [ ] **AC-12**: Memory leaks prevented by proper cleanup in useEffect
- [ ] **AC-13**: WebSocket reconnection handled gracefully
- [ ] **AC-14**: No performance degradation with active subscriptions

---

## 10. Edge Cases and Error Handling

### Edge Case 1: WebSocket Connection Lost
**Scenario**: User creates post, but WebSocket disconnects before status updates arrive

**Handling**:
- Frontend shows initial success toast
- Background: Attempt WebSocket reconnection
- If reconnection succeeds within 10s, resume listening
- If fails, show warning toast: "⚠️ Real-time updates unavailable"
- User can manually refresh to see final status

### Edge Case 2: Multiple Posts in Quick Succession
**Scenario**: User creates 3 posts within 5 seconds

**Handling**:
- Each post gets unique `postId`
- Frontend maintains separate subscriptions for each
- Toasts display for all posts independently
- Cleanup happens per-post after completion

### Edge Case 3: Ticket Processing Failure
**Scenario**: Agent worker crashes or times out

**Handling**:
- Worker emits `failed` status before termination
- Frontend shows: "❌ Failed: [error message]"
- Auto-unsubscribe from WebSocket
- User can retry by creating new post

### Edge Case 4: Component Unmounted Before Completion
**Scenario**: User navigates away from page while post processing

**Handling**:
- `useEffect` cleanup runs
- WebSocket subscription cleaned up
- Memory leak prevented
- Background processing continues normally

### Edge Case 5: No WebSocket Support (Fallback)
**Scenario**: User's browser/network blocks WebSocket

**Handling**:
- Initial success toast still shows
- No real-time updates (graceful degradation)
- User sees final status after page refresh
- Consider polling fallback (optional enhancement)

---

## 11. Testing Strategy

### Unit Tests

#### Backend Unit Tests
**File**: `api-server/tests/unit/post-creation-routing.test.js`

```javascript
describe('isAviQuestion() routing logic', () => {
  it('should return false for posts with questions', () => {
    const content = 'What is the weather like?';
    expect(isAviQuestion(content)).toBe(false);
  });

  it('should create work queue ticket for question posts', async () => {
    const post = { content: 'How does this work?' };
    const result = await createPost(post);
    expect(result.ticket_created).toBe(true);
  });

  it('should emit pending status after ticket creation', async () => {
    const emitSpy = vi.spyOn(websocketService, 'emitTicketStatusUpdate');
    await createPost({ content: 'Test question?' });
    expect(emitSpy).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'pending' })
    );
  });
});
```

#### Frontend Unit Tests
**File**: `frontend/src/tests/unit/EnhancedPostingInterface.test.tsx`

```typescript
describe('WebSocket toast notifications', () => {
  it('should show toast when pending status received', () => {
    const { getByText } = render(<QuickPostSection {...props} />);

    // Simulate WebSocket event
    act(() => {
      socket.emit('ticket:status:update', {
        post_id: 'test-123',
        status: 'pending',
        ticket_id: 'ticket-456'
      });
    });

    expect(getByText('⏳ Queued for processing...')).toBeInTheDocument();
  });

  it('should unsubscribe on completion', () => {
    const offSpy = vi.spyOn(socket, 'off');

    // Simulate completion event
    act(() => {
      socket.emit('ticket:status:update', {
        post_id: 'test-123',
        status: 'completed'
      });
    });

    expect(offSpy).toHaveBeenCalledWith('ticket:status:update', expect.any(Function));
  });
});
```

### Integration Tests

**File**: `tests/e2e/toast-notification-flow.spec.ts`

```typescript
test('complete toast notification sequence', async ({ page }) => {
  // 1. Navigate to home page
  await page.goto('/');

  // 2. Create a post with question
  await page.fill('textarea', 'What is the weather like in Los Gatos?');
  await page.click('button:has-text("Quick Post")');

  // 3. Verify Toast 1: Post created
  await expect(page.locator('.toast:has-text("Post created successfully!")')).toBeVisible();

  // 4. Verify Toast 2: Queued (within 5s)
  await expect(page.locator('.toast:has-text("Queued for processing")')).toBeVisible({ timeout: 5000 });

  // 5. Verify Toast 3: Processing (within 10s)
  await expect(page.locator('.toast:has-text("Processing your request")')).toBeVisible({ timeout: 10000 });

  // 6. Verify Toast 4: Completed (within 60s)
  await expect(page.locator('.toast:has-text("Completed!")')).toBeVisible({ timeout: 60000 });

  // 7. Verify all toasts eventually dismiss
  await expect(page.locator('.toast')).toHaveCount(0, { timeout: 10000 });
});
```

### Manual Testing Checklist

- [ ] **Test 1**: Create post with question → verify 4 toasts appear
- [ ] **Test 2**: Create post without question → verify only 1 toast (no processing)
- [ ] **Test 3**: Create 3 posts rapidly → verify toasts for all posts
- [ ] **Test 4**: Navigate away mid-processing → verify no console errors
- [ ] **Test 5**: Disconnect WiFi after post creation → verify graceful handling
- [ ] **Test 6**: Create post with emoji question ("What's up? 😊") → verify routing

---

## 12. Risk Assessment

### High Risk
**Risk**: Breaking existing AVI DM functionality
- **Mitigation**: Keep AVI DM tab routing separate from post creation
- **Verification**: Test AVI DM tab thoroughly after changes

### Medium Risk
**Risk**: WebSocket connection overhead with many active subscriptions
- **Mitigation**: Auto-cleanup after completion/failure
- **Verification**: Monitor memory usage with 10+ concurrent posts

### Medium Risk
**Risk**: Race condition between HTTP response and WebSocket event
- **Mitigation**: Use `post_id` matching to filter events
- **Verification**: Load test with rapid post creation

### Low Risk
**Risk**: Toast notification spam if events arrive too quickly
- **Mitigation**: Use toast queue with auto-dismiss
- **Verification**: Test with artificially fast status transitions

### Low Risk
**Risk**: Browser compatibility issues with WebSocket
- **Mitigation**: Graceful degradation (no toasts, but functional)
- **Verification**: Test on Chrome, Firefox, Safari, Edge

---

## 13. Implementation Checklist

### Phase 1: Backend Fix (1-2 hours)
- [ ] Find `isAviQuestion()` function location
- [ ] Remove `content.includes('?')` logic
- [ ] Test post creation routes to work queue (not AVI)
- [ ] Verify WebSocket events emitted for all statuses
- [ ] Run backend integration tests

### Phase 2: Frontend Implementation (2-3 hours)
- [ ] Add `lastPostId` state to `QuickPostSection`
- [ ] Implement WebSocket listener in `useEffect`
- [ ] Map statuses to toast messages
- [ ] Add cleanup on unmount
- [ ] Test with mock WebSocket events

### Phase 3: Integration Testing (1-2 hours)
- [ ] E2E test: Create post → verify 4 toasts
- [ ] E2E test: Multiple posts → verify independent toasts
- [ ] E2E test: Navigation away → verify cleanup
- [ ] Manual testing with real backend

### Phase 4: Documentation (30 minutes)
- [ ] Update user guide with toast sequence
- [ ] Document WebSocket event structure
- [ ] Add troubleshooting section

---

## 14. Success Metrics

### Quantitative Metrics
- **Toast Visibility Rate**: 100% of posts show all 4 toasts
- **Event Latency**: Toast 2 appears within 3s of Toast 1
- **Memory Leak Rate**: 0 subscriptions after 10 posts
- **Error Rate**: <1% of posts fail to show toasts

### Qualitative Metrics
- **User Perception**: System feels responsive and transparent
- **Confidence**: Users know their requests are being processed
- **Feedback**: Reduced support tickets about "stuck" posts

---

## 15. Rollback Plan

### If Issues Discovered After Deployment

1. **Revert Backend Changes**:
   ```bash
   git revert <commit-hash>
   npm run build && npm run restart
   ```

2. **Revert Frontend Changes**:
   ```bash
   git revert <commit-hash>
   npm run build:frontend && npm run deploy
   ```

3. **Verify Rollback**:
   - Test post creation works
   - Verify no console errors
   - Confirm AVI DM still functional

4. **Root Cause Analysis**:
   - Review logs for errors
   - Identify specific failure point
   - Document learnings

---

## 16. Future Enhancements (Out of Scope)

### Enhancement 1: Progress Bar
Show visual progress bar alongside toasts:
- 0% → Post created
- 25% → Queued
- 50% → Processing
- 100% → Completed

### Enhancement 2: Estimated Time
Display time estimates in toasts:
- "Processing (est. 30s remaining)"

### Enhancement 3: Cancel Button
Allow users to cancel in-progress posts:
- "Cancel processing" button in toast

### Enhancement 4: Desktop Notifications
Show browser notifications for completed posts:
- Requires user permission
- Useful when tab is in background

---

## Appendix A: Related Files

### Backend Files
- `/workspaces/agent-feed/api-server/routes/agent-posts.js` - Post creation API
- `/workspaces/agent-feed/api-server/services/websocket-service.js` - WebSocket emitter
- `/workspaces/agent-feed/api-server/worker/agent-worker.js` - Status updates
- `/workspaces/agent-feed/api-server/avi/session-manager.js` - AVI DM handling

### Frontend Files
- `/workspaces/agent-feed/frontend/src/components/EnhancedPostingInterface.tsx` - Main component
- `/workspaces/agent-feed/frontend/src/hooks/useToast.ts` - Toast hook
- `/workspaces/agent-feed/frontend/src/services/websocket.ts` - WebSocket client
- `/workspaces/agent-feed/frontend/src/components/ToastContainer.tsx` - Toast UI

---

## Appendix B: WebSocket Architecture

### Server-Side (Socket.IO)
**File**: `/workspaces/agent-feed/api-server/services/websocket-service.js`

**Initialization**:
```javascript
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  transports: ['websocket', 'polling'],
  path: '/socket.io/',
  pingTimeout: 60000,
  pingInterval: 25000
});
```

**Event Emission**:
```javascript
emitTicketStatusUpdate(payload) {
  // Broadcast to all clients
  this.io.emit('ticket:status:update', event);

  // Broadcast to post-specific subscribers
  this.io.to(`post:${event.post_id}`).emit('ticket:status:update', event);
}
```

### Client-Side (Socket.IO Client)
**File**: `/workspaces/agent-feed/frontend/src/services/websocket.ts`

**Connection**:
```typescript
import io from 'socket.io-client';

export const socket = io('http://localhost:3001', {
  transports: ['websocket', 'polling'],
  path: '/socket.io/'
});
```

**Event Listening**:
```typescript
socket.on('ticket:status:update', (event) => {
  console.log('Status update:', event);
});
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-13 | SPARC Specification Agent | Initial specification |

---

**END OF SPECIFICATION**
