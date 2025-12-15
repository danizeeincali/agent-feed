# SPARC Specification: Real-Time Comment Counter Fix

## Document Control
- **Version**: 1.0.0
- **Created**: 2025-11-13
- **Status**: Specification Phase
- **Priority**: High
- **Complexity**: Low (2-line fix)

---

## 1. Problem Statement

### 1.1 Issue Description
Comment counters in the RealSocialMediaFeed component do not update in real-time when agents post comments. Users must navigate away and return to the page to see the updated comment count.

### 1.2 User Impact
- **Severity**: Medium
- **Affected Users**: All users viewing the social media feed
- **Frequency**: Every comment posted by agents
- **Workaround**: Manual page navigation required

### 1.3 Business Impact
- Poor user experience (stale data)
- Perceived system lag/unreliability
- Reduced engagement (users don't see activity)
- Inconsistent behavior across components

---

## 2. Root Cause Analysis

### 2.1 Event Name Mismatch

**Backend Emission** (CORRECT):
```javascript
// api-server/services/websocket-service.js
socket.emit('comment:created', {
  postId: comment.post_id,
  commentCount: newCount
});
```

**Frontend Listener** (INCORRECT):
```typescript
// frontend/src/components/RealSocialMediaFeed.tsx (lines ~464, ~470)
apiService.on('comment_created', (data) => {  // ❌ Wrong event name
  // Handler never fires
});
```

**Working Reference** (CORRECT):
```typescript
// frontend/src/components/PostCard.tsx
apiService.on('comment:created', (data) => {  // ✅ Correct event name
  // Handler fires successfully
});
```

### 2.2 Why PostCard Works But RealSocialMediaFeed Doesn't

| Component | Event Name | Status | Result |
|-----------|------------|--------|--------|
| PostCard | `comment:created` | ✅ Matches backend | Updates work |
| RealSocialMediaFeed | `comment_created` | ❌ Mismatched | Updates fail |

**Key Insight**: PostCard uses colon notation (`:`), RealSocialMediaFeed uses underscore (`_`). The backend only emits with colons.

### 2.3 Current Flow Breakdown

```
┌─────────────────────────────────────────────────────────────┐
│ CURRENT FLOW (BROKEN)                                        │
├─────────────────────────────────────────────────────────────┤
│ 1. Agent posts comment                                       │
│    └─> POST /api/posts/:postId/comments                     │
│                                                              │
│ 2. Backend processes comment                                │
│    └─> Database updated ✅                                   │
│    └─> Comment count incremented ✅                          │
│                                                              │
│ 3. Backend emits WebSocket event                            │
│    └─> socket.emit('comment:created', {...}) ✅             │
│                                                              │
│ 4. Frontend listener registered                             │
│    └─> apiService.on('comment_created', handler) ❌         │
│    └─> Event name mismatch: colon vs underscore            │
│                                                              │
│ 5. Handler never executes                                   │
│    └─> Counter remains at old value                         │
│    └─> UI shows stale data                                  │
│                                                              │
│ 6. User navigates away and returns                          │
│    └─> Page reloads                                         │
│    └─> Fresh data fetched from API                          │
│    └─> Counter now shows correct value ✅                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Event Name Standardization

### 3.1 Established Standard
The codebase uses **colon notation** (`:`) for WebSocket events:
- `comment:created`
- `post:created`
- `post:liked`
- `post:deleted`

### 3.2 Event Payload Structure

```typescript
interface CommentCreatedEvent {
  postId: string;           // UUID of the post
  commentCount: number;     // New total comment count
  comment?: {               // Optional full comment data
    id: string;
    content: string;
    author_id: string;
    created_at: string;
  };
}
```

**Example Payload**:
```json
{
  "postId": "550e8400-e29b-41d4-a716-446655440000",
  "commentCount": 42,
  "comment": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "content": "Great post!",
    "author_id": "agent-001",
    "created_at": "2025-11-13T10:30:00Z"
  }
}
```

### 3.3 All Comment-Related Events

| Event Name | Purpose | Status |
|------------|---------|--------|
| `comment:created` | New comment added | ✅ Standardized |
| `comment:updated` | Comment edited | ✅ Standardized |
| `comment:deleted` | Comment removed | ✅ Standardized |

---

## 4. Code Changes Required

### 4.1 File: `/frontend/src/components/RealSocialMediaFeed.tsx`

**Location**: Lines ~464 and ~470

**Change #1** (Line ~464):
```typescript
// ❌ BEFORE
apiService.on('comment_created', (data: { postId: string; commentCount: number }) => {

// ✅ AFTER
apiService.on('comment:created', (data: { postId: string; commentCount: number }) => {
```

**Change #2** (Line ~470):
```typescript
// ❌ BEFORE
return () => apiService.off('comment_created');

// ✅ AFTER
return () => apiService.off('comment:created');
```

### 4.2 Complete Code Block (Reference)

```typescript
// Real-time comment counter updates
useEffect(() => {
  const handleCommentCreated = (data: { postId: string; commentCount: number }) => {
    setPosts(prevPosts =>
      prevPosts.map(post =>
        post.id === data.postId
          ? { ...post, comment_count: data.commentCount }
          : post
      )
    );
  };

  // ✅ FIXED: Use colon notation to match backend emission
  apiService.on('comment:created', handleCommentCreated);

  return () => {
    // ✅ FIXED: Use colon notation for cleanup
    apiService.off('comment:created', handleCommentCreated);
  };
}, []);
```

### 4.3 No Backend Changes Required

The backend is **already correct**:
- ✅ Uses `comment:created` event name
- ✅ Emits correct payload structure
- ✅ Broadcasts to all connected clients
- ✅ Includes both postId and commentCount

---

## 5. Testing Strategy

### 5.1 Unit Tests

**Test File**: `/frontend/src/components/__tests__/RealSocialMediaFeed.counter.test.tsx`

```typescript
describe('RealSocialMediaFeed - Comment Counter Updates', () => {
  it('should update comment count when comment:created event fires', () => {
    // Given: Component mounted with posts
    // When: comment:created event emitted
    // Then: Comment count incremented in UI
  });

  it('should register event listener with correct event name', () => {
    // Verify apiService.on called with 'comment:created'
  });

  it('should cleanup event listener on unmount', () => {
    // Verify apiService.off called with 'comment:created'
  });

  it('should handle multiple rapid comment events', () => {
    // Simulate 5 rapid comment:created events
    // Verify count increments correctly each time
  });

  it('should not update count for wrong postId', () => {
    // Emit event for different post
    // Verify current post unchanged
  });
});
```

### 5.2 Integration Tests

**Test File**: `/tests/integration/comment-counter-realtime.test.js`

```javascript
describe('Comment Counter Real-Time Integration', () => {
  it('should update counter immediately when agent posts comment', async () => {
    // 1. Load feed with post (count: 0)
    // 2. Agent posts comment via API
    // 3. Verify counter updates to 1 within 500ms
    // 4. No page reload required
  });

  it('should broadcast to all connected clients', async () => {
    // 1. Open feed in 3 browser tabs
    // 2. Agent posts comment
    // 3. Verify all 3 tabs update simultaneously
  });

  it('should maintain accuracy across multiple comments', async () => {
    // 1. Initial count: 5
    // 2. Agent posts 3 comments rapidly
    // 3. Verify final count: 8
    // 4. No missed updates
  });
});
```

### 5.3 E2E Tests (Playwright)

**Test File**: `/tests/playwright/comment-counter-realtime.spec.ts`

```typescript
test('comment counter updates in real-time', async ({ page }) => {
  // Navigate to feed
  await page.goto('/');

  // Get initial count
  const initialCount = await page.locator('[data-testid="comment-count-post-1"]').textContent();

  // Trigger comment via agent (API call or automation)
  await triggerAgentComment('post-1');

  // Verify count updates without reload
  await expect(page.locator('[data-testid="comment-count-post-1"]'))
    .toHaveText(`${parseInt(initialCount) + 1} comments`, { timeout: 2000 });

  // Verify no page reload occurred
  expect(await page.evaluate(() => window.performance.navigation.type)).toBe(0);
});
```

### 5.4 Manual Testing Checklist

- [ ] Load feed with posts that have comments
- [ ] Note initial comment count (e.g., "5 comments")
- [ ] Trigger agent to post comment via orchestrator
- [ ] **Verify counter updates immediately** (no refresh)
- [ ] Counter should show "6 comments" within 1 second
- [ ] Open feed in multiple browser tabs
- [ ] Post comment in one tab
- [ ] **Verify all tabs update simultaneously**
- [ ] Test with rapid comments (3-5 in quick succession)
- [ ] **Verify counter accuracy** (no missed or duplicate counts)
- [ ] Test with comment deletion (if implemented)
- [ ] Verify counter decrements correctly

---

## 6. Success Criteria

### 6.1 Functional Requirements

| ID | Requirement | Acceptance Criteria | Status |
|----|-------------|---------------------|--------|
| FR-1 | Real-time counter updates | Counter updates within 1 second of comment creation | 🔴 Failing |
| FR-2 | No page reload required | Counter updates without navigation | 🔴 Failing |
| FR-3 | Multi-client broadcast | All connected clients see update | 🔴 Failing |
| FR-4 | Counter accuracy | Count matches database value | ✅ Passing |
| FR-5 | Event cleanup | No memory leaks on unmount | ✅ Passing |

### 6.2 Non-Functional Requirements

| ID | Requirement | Measurement | Target |
|----|-------------|-------------|--------|
| NFR-1 | Update latency | Time from event to UI update | < 500ms |
| NFR-2 | Event reliability | % of events received | 100% |
| NFR-3 | Performance impact | CPU/memory increase | < 5% |
| NFR-4 | Backward compatibility | No regression in other features | 100% |

### 6.3 Definition of Done

- ✅ Code changes implemented (2 lines modified)
- ✅ Unit tests passing (5+ test cases)
- ✅ Integration tests passing
- ✅ E2E tests passing
- ✅ Manual testing completed
- ✅ No console errors or warnings
- ✅ Event listener cleanup verified
- ✅ Multi-client testing successful
- ✅ Code review completed
- ✅ Documentation updated

---

## 7. Implementation Plan

### 7.1 Estimated Effort
- **Code Changes**: 5 minutes
- **Testing**: 30 minutes
- **Documentation**: 15 minutes
- **Total**: ~50 minutes

### 7.2 Risk Assessment
- **Technical Risk**: 🟢 Low (simple string replacement)
- **Testing Risk**: 🟢 Low (existing tests can be adapted)
- **Deployment Risk**: 🟢 Low (frontend-only change)

### 7.3 Rollback Plan
If issues arise, revert the 2-line change:
```bash
git revert <commit-hash>
npm run build
npm run deploy
```

### 7.4 Sequence Diagram

```
Agent           Backend API      WebSocket       RealSocialMediaFeed
  |                 |                |                    |
  |-- POST /comment |                |                    |
  |                 |                |                    |
  |                 |-- DB INSERT -->|                    |
  |                 |                |                    |
  |                 |-- emit('comment:created') -------->|
  |                 |                |                    |
  |                 |                |    Update State    |
  |                 |                |    ✅ Counter++    |
  |                 |                |                    |
  |<--- 201 Created |                |                    |
  |                 |                |                    |
```

---

## 8. Constraints & Dependencies

### 8.1 Technical Constraints
- Must maintain existing event payload structure
- Cannot break PostCard component behavior
- Must support multiple simultaneous listeners
- Event cleanup required on component unmount

### 8.2 Dependencies
- **WebSocket Service**: Must continue emitting `comment:created`
- **API Service**: Must correctly proxy WebSocket events
- **Database**: Comment count must remain accurate
- **React**: useEffect cleanup must fire on unmount

### 8.3 Assumptions
- Backend WebSocket service is stable
- Event payload structure won't change
- Multiple clients can connect simultaneously
- Browser supports WebSocket protocol

---

## 9. Edge Cases & Error Handling

### 9.1 Edge Cases

| Scenario | Expected Behavior | Current Status |
|----------|-------------------|----------------|
| Rapid comments (5 in 1 second) | All counts update correctly | 🔴 Not updating |
| Comment on deleted post | Gracefully ignore event | ✅ Already handled |
| Network interruption | Reconnect and sync on restore | ✅ Already handled |
| Multiple tabs open | All tabs update simultaneously | 🔴 Not updating |
| Component unmounted mid-event | Cleanup prevents memory leak | ✅ Already handled |

### 9.2 Error Scenarios

**Scenario 1**: WebSocket disconnected during comment
- **Handling**: API service auto-reconnects
- **User Impact**: Brief delay, then updates resume
- **No Code Change Required**: Already handled by apiService

**Scenario 2**: Invalid event payload
- **Handling**: TypeScript validation, ignore malformed events
- **User Impact**: None (invalid events discarded)
- **No Code Change Required**: TypeScript types provide validation

**Scenario 3**: PostId mismatch
- **Handling**: State update skipped (map returns unchanged post)
- **User Impact**: None (only relevant post updates)
- **No Code Change Required**: Already handled correctly

---

## 10. Validation Checklist

### 10.1 Pre-Implementation
- [x] Root cause identified (event name mismatch)
- [x] Solution validated (string replacement)
- [x] Backend confirmed correct (`comment:created`)
- [x] PostCard reference confirmed working
- [x] Event payload structure documented

### 10.2 Implementation
- [ ] Line ~464 updated (`on` listener)
- [ ] Line ~470 updated (`off` cleanup)
- [ ] No other code changes required
- [ ] TypeScript compilation successful
- [ ] ESLint/Prettier checks pass

### 10.3 Testing
- [ ] Unit tests written and passing
- [ ] Integration tests written and passing
- [ ] E2E tests written and passing
- [ ] Manual testing completed
- [ ] Multi-client testing completed

### 10.4 Deployment
- [ ] Code review approved
- [ ] CI/CD pipeline passing
- [ ] Staging deployment successful
- [ ] Production deployment successful
- [ ] Monitoring shows no errors

---

## 11. Monitoring & Metrics

### 11.1 Key Metrics to Track

```yaml
metrics:
  performance:
    - name: "Comment Event Latency"
      description: "Time from backend emit to frontend state update"
      target: "< 500ms"
      alert_threshold: "> 2s"

    - name: "Event Delivery Rate"
      description: "% of comment:created events received"
      target: "100%"
      alert_threshold: "< 95%"

  reliability:
    - name: "Counter Accuracy"
      description: "% match between UI count and DB count"
      target: "100%"
      alert_threshold: "< 98%"

    - name: "WebSocket Connection Uptime"
      description: "% time WebSocket connected"
      target: "> 99%"
      alert_threshold: "< 95%"
```

### 11.2 Logging Strategy

```typescript
// Add debug logging (development only)
if (process.env.NODE_ENV === 'development') {
  apiService.on('comment:created', (data) => {
    console.debug('[RealSocialMediaFeed] comment:created event received', {
      postId: data.postId,
      newCount: data.commentCount,
      timestamp: new Date().toISOString()
    });
  });
}
```

---

## 12. Related Issues & Documentation

### 12.1 Related Components
- **PostCard.tsx**: Reference implementation (working correctly)
- **apiService.ts**: WebSocket event proxy
- **websocket-service.js**: Backend event emission
- **orchestrator.js**: Agent comment creation

### 12.2 Related Events
- `post:created` - New post published
- `post:liked` - Post received like
- `post:deleted` - Post removed
- `comment:updated` - Comment edited
- `comment:deleted` - Comment removed

### 12.3 Documentation Updates Required
- [ ] Update `docs/WEBSOCKET-EVENTS.md` with event naming convention
- [ ] Update `docs/COMPONENT-API.md` with RealSocialMediaFeed events
- [ ] Update `docs/TROUBLESHOOTING.md` with event mismatch section

---

## 13. Appendix

### 13.1 Event Naming Convention (Established Standard)

```
Pattern: <entity>:<action>
Examples:
  - comment:created
  - comment:updated
  - comment:deleted
  - post:created
  - post:liked
  - user:followed

❌ AVOID:
  - comment_created (underscore)
  - commentCreated (camelCase)
  - COMMENT_CREATED (UPPER_CASE)
```

### 13.2 Full File Context

**File**: `/frontend/src/components/RealSocialMediaFeed.tsx`

**Lines 460-475** (approximate):
```typescript
// Real-time comment counter updates
useEffect(() => {
  const handleCommentCreated = (data: { postId: string; commentCount: number }) => {
    setPosts(prevPosts =>
      prevPosts.map(post =>
        post.id === data.postId
          ? { ...post, comment_count: data.commentCount }
          : post
      )
    );
  };

  apiService.on('comment_created', handleCommentCreated); // ❌ LINE 464

  return () => {
    apiService.off('comment_created', handleCommentCreated); // ❌ LINE 470
  };
}, []);
```

### 13.3 Testing Event Emission (Backend)

To manually test backend emission:
```bash
# Terminal 1: Start backend
npm run dev:backend

# Terminal 2: Monitor WebSocket events
npx wscat -c ws://localhost:3001

# Terminal 3: Trigger comment
curl -X POST http://localhost:3001/api/posts/<post-id>/comments \
  -H "Content-Type: application/json" \
  -d '{"content": "Test comment", "author_id": "test-agent"}'

# Expected in Terminal 2:
# < {"event":"comment:created","data":{"postId":"...","commentCount":1}}
```

---

## 14. Sign-Off

### 14.1 Specification Approval

- [ ] **Technical Lead**: Specification reviewed and approved
- [ ] **Product Owner**: Requirements validated
- [ ] **QA Lead**: Testing strategy approved
- [ ] **Developer**: Implementation approach confirmed

### 14.2 Change Authorization

This specification authorizes:
- ✅ Modification of `/frontend/src/components/RealSocialMediaFeed.tsx` (2 lines)
- ✅ Creation of unit tests
- ✅ Creation of integration tests
- ✅ Creation of E2E tests
- ❌ No backend changes required
- ❌ No database schema changes required
- ❌ No API contract changes required

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-11-13 | SPARC Specification Agent | Initial specification created |

