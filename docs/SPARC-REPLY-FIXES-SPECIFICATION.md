# SPARC Specification: Reply Processing Pills & Agent Routing

**Document Version**: 1.0.0
**Date**: 2025-11-14
**Phase**: Specification
**Status**: Ready for Pseudocode Phase

---

## Executive Summary

This specification addresses two critical user-facing bugs in the comment reply system:

1. **Processing Pills Missing**: Reply buttons lack visual feedback during submission
2. **Agent Routing Broken**: Replies to agent comments route to wrong agents

Both fixes must maintain 100% compatibility with existing functionality while providing seamless user experience.

---

## 1. Problem Statement

### 1.1 User Pain Points

**Issue #1: Invisible Processing State**
- User clicks "Post Reply" button
- No visual feedback for 1-2 seconds
- User uncertain if action registered
- Risk of double-submission
- Inconsistent with top-level comment UX

**Issue #2: Conversation Thread Breaks**
- User replies to Avi's comment
- Different agent responds (or none)
- Conversational context lost
- User confused about agent identity
- Multi-turn conversations impossible

### 1.2 Business Impact

- **User Trust**: Lack of feedback signals broken functionality
- **Engagement**: Broken routing disrupts natural conversation flow
- **Retention**: Users abandon incomplete interactions
- **Brand**: Inconsistent UX damages product perception

---

## 2. Functional Requirements

### 2.1 Processing Pills for Replies (FR-001)

#### FR-001.1: Visual Feedback State
**Priority**: CRITICAL
**Description**: Reply buttons must provide real-time processing feedback

**Acceptance Criteria**:
- [ ] Reply button shows spinner icon (Loader2 component) during submission
- [ ] Button text changes from "Post Reply" to "Posting..." during submission
- [ ] Button is disabled during submission
- [ ] Reply textarea is disabled during submission
- [ ] Spinner and text revert to default after success/error
- [ ] State changes are visually instant (<50ms perceived delay)

**Edge Cases**:
- Multiple replies to same comment submitted simultaneously
- Network latency >5 seconds
- Submission failure (network error, validation error)
- User navigates away during submission
- Component unmounts during submission

#### FR-001.2: State Management
**Priority**: CRITICAL
**Description**: Processing state must be managed at correct component level

**Requirements**:
- CommentThread receives callback prop: `onProcessingChange(commentId: string, isProcessing: boolean)`
- Parent component (RealSocialMediaFeed) maintains `processingComments: Set<string>`
- State updates are synchronous within React render cycle
- Temp IDs follow format: `temp-reply-${Date.now()}-${Math.random().toString(36)}`
- Temp IDs are globally unique across all posts/comments

**State Flow**:
```
User clicks "Post Reply"
→ CommentThread calls onProcessingChange(commentId, true)
→ Parent adds commentId to processingComments Set
→ Re-render shows spinner/disabled state
→ API call completes
→ CommentThread calls onProcessingChange(commentId, false)
→ Parent removes commentId from processingComments Set
→ Re-render shows normal state + new reply
```

#### FR-001.3: Error Handling
**Priority**: HIGH
**Description**: Processing state must clear on all error conditions

**Error Scenarios**:
1. **Network Failure**: API unreachable, timeout
   - Action: Clear processing state, show error toast, re-enable form
2. **Validation Error**: Missing content, invalid characters
   - Action: Clear processing state, show inline error, keep form open
3. **Server Error**: 500, 503, database issues
   - Action: Clear processing state, show error toast, re-enable form
4. **Concurrent Submission**: Race condition with multiple clicks
   - Action: Debounce clicks, ignore duplicates
5. **Component Unmount**: User navigates during submission
   - Action: Cancel API call, cleanup state

**Error Message Requirements**:
- Toast notifications for network/server errors
- Inline validation errors near form field
- Clear, actionable error text (no technical jargon)
- Retry option for transient failures

### 2.2 Agent Response Routing (FR-002)

#### FR-002.1: Parent Comment Agent Detection
**Priority**: CRITICAL
**Description**: System must route replies based on parent comment's agent

**Requirements**:
- Orchestrator checks `parent_comment_id` BEFORE other routing logic
- New database method: `getCommentById(commentId): Comment | null`
- Method returns comment with `author_agent` field
- Agent routing uses parent comment's `author_agent` if exists
- Falls back to parent post routing only if parent comment has no agent

**Routing Priority**:
```
1. Parent Comment Agent (author_agent from parent comment)
   ↓ (if null)
2. Parent Post Agent (author_agent from post)
   ↓ (if null)
3. @mention Detection (scan comment text)
   ↓ (if none)
4. Keyword Matching (existing logic)
   ↓ (if no match)
5. Default Agent (Avi)
```

#### FR-002.2: Deep Threading Support
**Priority**: HIGH
**Description**: Multi-level reply chains must maintain agent context

**Requirements**:
- Reply to reply traverses up to find first non-null `author_agent`
- Maximum traversal depth: 10 levels (prevent infinite loops)
- Cache parent comment data to avoid repeated DB queries
- Maintain conversational context across thread depth

**Example Scenarios**:

**Scenario 1: Direct Agent Reply**
```
Post (author: user123, author_agent: null)
└─ Comment (author: Avi, author_agent: "avi")
   └─ Reply (author: user123) → ROUTES TO: avi ✓
```

**Scenario 2: Deep Threading**
```
Post (author: user123, author_agent: null)
└─ Comment (author: GetToKnowYou, author_agent: "get-to-know-you")
   └─ Reply (author: user123)
      └─ Reply (author: GetToKnowYou)
         └─ Reply (author: user123) → ROUTES TO: get-to-know-you ✓
```

**Scenario 3: User-to-User Reply**
```
Post (author: user123, author_agent: null)
└─ Comment (author: user456, author_agent: null)
   └─ Reply (author: user123) → ROUTES TO: keyword matching OR default ✓
```

#### FR-002.3: Fallback Logic
**Priority**: MEDIUM
**Description**: Graceful degradation when agent detection fails

**Fallback Chain**:
1. Parent comment `author_agent` → Use directly
2. Parent post `author_agent` → Use directly
3. @mention in comment text → Extract agent name
4. Keyword matching → Use existing patterns
5. Default agent → Avi (last resort)

**@Mention Detection**:
- Pattern: `@([a-zA-Z0-9-]+)`
- Extract first mention
- Validate against known agent list
- Case-insensitive matching
- Ignore mentions in code blocks

**Keyword Patterns** (existing):
- "question" → Get-to-Know-You agent
- "recommendation", "suggest" → Recommendation agent
- "favorite", "like", "love" → Interest agent
- Default → Avi

#### FR-002.4: Error Handling
**Priority**: HIGH
**Description**: Routing failures must not block comment submission

**Error Scenarios**:
1. **Parent Comment Not Found**: Database query returns null
   - Action: Fall back to parent post routing
   - Log: Warning level
2. **Invalid Agent Name**: `author_agent` not in agent registry
   - Action: Fall back to keyword matching
   - Log: Error level
3. **Database Connection Error**: Query fails
   - Action: Use default agent (Avi)
   - Log: Critical level
4. **Circular Reference**: Comment references itself as parent
   - Action: Break loop, use post routing
   - Log: Error level

---

## 3. Non-Functional Requirements

### 3.1 Performance (NFR-001)

**NFR-001.1: Response Time**
- Reply button state change: <50ms perceived delay
- Agent routing decision: <100ms
- Database query (getCommentById): <50ms
- End-to-end reply submission: <2000ms (p95)

**NFR-001.2: Scalability**
- Support 100 concurrent reply submissions
- Handle reply threads up to 10 levels deep
- No memory leaks from processing state management
- Efficient Set operations for processingComments

**NFR-001.3: Database Impact**
- Single query per reply (getCommentById)
- Indexed lookup by comment ID
- No N+1 query problems
- Query result caching (optional optimization)

### 3.2 Reliability (NFR-002)

**NFR-002.1: State Consistency**
- Processing state ALWAYS clears after operation
- No orphaned "processing" states
- Race conditions handled via debouncing
- State updates are atomic

**NFR-002.2: Error Recovery**
- Network failures don't corrupt UI state
- Component unmount cleanup prevents memory leaks
- Retry logic for transient failures
- Error boundaries prevent app crashes

**NFR-002.3: Data Integrity**
- Agent routing is deterministic (same inputs → same output)
- Parent comment relationships maintained in DB
- Comment IDs are unique and immutable
- No lost replies due to state management bugs

### 3.3 Usability (NFR-003)

**NFR-003.1: Visual Feedback**
- Spinner animation smooth (60fps)
- Button state transitions obvious
- Disabled state visually distinct
- No layout shift during state changes

**NFR-003.2: Accessibility**
- Button disabled state announced to screen readers
- ARIA live regions for processing state
- Keyboard navigation preserved during processing
- Focus management on form submission

**NFR-003.3: Consistency**
- Reply button behavior matches top-level comment button
- Error messages follow app-wide patterns
- Agent routing logic consistent across comment types
- Visual design matches existing UI components

### 3.4 Security (NFR-004)

**NFR-004.1: Input Validation**
- Comment content sanitized before display
- SQL injection prevention in getCommentById
- XSS prevention in agent name extraction
- Rate limiting on reply submissions

**NFR-004.2: Authorization**
- User can only reply to visible comments
- Agent routing cannot be manipulated client-side
- Session validation on every reply
- CSRF protection enabled

---

## 4. Technical Constraints

### 4.1 Technology Stack

**Frontend**:
- React 18+ (hooks-based)
- TypeScript 5+
- Lucide React icons (Loader2)
- Existing toast notification system

**Backend**:
- Node.js orchestrator
- SQLite database
- Existing work queue system
- WebSocket for real-time updates

### 4.2 Compatibility Requirements

**Must Not Break**:
- Top-level "Add Comment" processing pills (already working)
- Atomic claiming system (existing fix)
- Onboarding name flow (existing fix)
- Comment counter real-time updates (existing fix)
- isAviQuestion detection (existing fix)

**Regression Test Requirements**:
- All 4 existing fix tests must pass
- No changes to non-reply codepaths
- Backward compatibility with existing comments
- No breaking changes to database schema

### 4.3 Database Schema

**Existing Structure** (no changes needed):
```sql
CREATE TABLE comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  parent_comment_id TEXT, -- NULL for top-level, comment ID for replies
  content TEXT NOT NULL,
  author TEXT NOT NULL,
  author_agent TEXT, -- Agent identifier or NULL for human users
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id),
  FOREIGN KEY (parent_comment_id) REFERENCES comments(id)
);

CREATE INDEX idx_comments_parent ON comments(parent_comment_id);
CREATE INDEX idx_comments_post ON comments(post_id);
```

**Required Indexes** (verify exists):
- `idx_comments_parent` for fast parent lookups
- `idx_comments_post` for thread loading

---

## 5. Use Cases

### 5.1 UC-001: User Replies to Agent Comment

**Actor**: Authenticated User
**Preconditions**:
- User is logged in
- Agent has posted a comment on user's post
- Reply form is visible

**Main Flow**:
1. User clicks reply icon next to agent's comment
2. Reply form expands with textarea and "Post Reply" button
3. User types reply text: "Thanks for the suggestion!"
4. User clicks "Post Reply" button
5. System shows spinner icon and "Posting..." text
6. Button and textarea become disabled
7. System sends API request to backend
8. Backend routes to parent comment's agent (Get-to-Know-You)
9. Comment saved to database with parent_comment_id
10. Work queue task created for Get-to-Know-You agent
11. Frontend receives success response
12. Processing state clears (button returns to normal)
13. New reply appears in thread
14. Form collapses
15. User sees real-time agent response notification

**Postconditions**:
- Reply stored in database
- Agent work task queued
- Processing state cleared
- UI updated with new reply

**Exceptions**:
- **3a**: User leaves textarea empty → Validation error, no API call
- **7a**: Network timeout → Clear processing state, show error toast
- **8a**: Parent comment not found → Fall back to post routing
- **9a**: Database error → Return 500, clear processing state, show error

### 5.2 UC-002: User Replies to Deep Thread

**Actor**: Authenticated User
**Preconditions**:
- Existing reply chain 3+ levels deep
- Last reply is from an agent

**Main Flow**:
1. User clicks reply on 3rd-level agent comment
2. Form expands
3. User types and submits reply
4. System traverses parent chain: level 3 → level 2 → level 1
5. Finds first non-null `author_agent` (at level 1)
6. Routes to that agent
7. Reply successfully posted
8. Agent responds in context

**Postconditions**:
- Correct agent routes response
- Thread context maintained

### 5.3 UC-003: Rapid Multiple Replies

**Actor**: Authenticated User
**Preconditions**:
- Multiple reply forms open simultaneously

**Main Flow**:
1. User opens reply forms for 3 different comments
2. User types in all 3 forms
3. User rapidly clicks all 3 "Post Reply" buttons
4. System debounces each button (300ms)
5. All 3 buttons show processing state
6. API calls sent sequentially or in parallel
7. Each reply completes independently
8. Processing states clear individually

**Postconditions**:
- All 3 replies posted successfully
- No race conditions
- No orphaned processing states

### 5.4 UC-004: Network Failure During Reply

**Actor**: Authenticated User
**Preconditions**:
- User on slow/unstable network

**Main Flow**:
1. User submits reply
2. Processing state activates
3. API request times out after 5 seconds
4. System catches timeout error
5. Processing state clears
6. Error toast shown: "Network error. Please try again."
7. Form remains open with user's text preserved
8. Button re-enabled

**Postconditions**:
- No orphaned processing state
- User data not lost
- Clear error feedback

---

## 6. Data Models

### 6.1 Frontend State Models

**RealSocialMediaFeed State**:
```typescript
interface FeedState {
  posts: Post[];
  processingComments: Set<string>; // Set of comment IDs currently processing
  // ... existing state
}
```

**Processing State API**:
```typescript
const handleProcessingChange = (commentId: string, isProcessing: boolean) => {
  setProcessingComments(prev => {
    const next = new Set(prev);
    if (isProcessing) {
      next.add(commentId);
    } else {
      next.delete(commentId);
    }
    return next;
  });
};
```

**CommentThread Props**:
```typescript
interface CommentThreadProps {
  comment: Comment;
  postId: string;
  currentUser: string;
  onAddReply: (postId: string, parentCommentId: string, content: string) => Promise<void>;
  onProcessingChange: (commentId: string, isProcessing: boolean) => void; // NEW
  processingComments: Set<string>; // NEW
  // ... existing props
}
```

### 6.2 Backend Data Models

**Comment Model** (existing, no changes):
```typescript
interface Comment {
  id: string; // UUID or unique identifier
  post_id: string;
  parent_comment_id: string | null; // NULL for top-level, comment ID for replies
  content: string;
  author: string; // Username
  author_agent: string | null; // Agent identifier (e.g., "avi", "get-to-know-you")
  created_at: string; // ISO timestamp
}
```

**Work Task Model** (existing):
```typescript
interface WorkTask {
  id: string;
  agent_type: string; // Routed agent
  task_type: 'respond_to_comment';
  payload: {
    comment_id: string;
    post_id: string;
    parent_comment_id: string | null;
    comment_content: string;
    author: string;
  };
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
}
```

### 6.3 API Contracts

**POST /api/comments/reply**:
```typescript
// Request
{
  post_id: string;
  parent_comment_id: string; // Required for replies
  content: string;
  author: string;
}

// Response (Success)
{
  success: true;
  comment: Comment;
  routed_agent: string; // For debugging
}

// Response (Error)
{
  success: false;
  error: string;
  code: 'VALIDATION_ERROR' | 'NETWORK_ERROR' | 'SERVER_ERROR' | 'ROUTING_ERROR';
}
```

**GET /api/comments/:commentId** (NEW):
```typescript
// Response
{
  success: true;
  comment: Comment | null;
}
```

---

## 7. Edge Cases & Error Scenarios

### 7.1 Processing State Edge Cases

**EC-001: Double Click on Reply Button**
- **Scenario**: User clicks "Post Reply" twice rapidly
- **Expected**: First click disables button, second click ignored
- **Implementation**: Debounce with 300ms delay + disabled state check

**EC-002: Component Unmount During Processing**
- **Scenario**: User navigates away while reply is posting
- **Expected**: API call cancelled, no memory leaks, state cleaned up
- **Implementation**: Cleanup function in useEffect, AbortController for fetch

**EC-003: Concurrent Replies to Same Comment**
- **Scenario**: Two users reply to same comment simultaneously
- **Expected**: Both replies succeed, no race condition, correct ordering
- **Implementation**: Database handles concurrency, optimistic UI updates

**EC-004: Parent Comment Deleted During Reply**
- **Scenario**: Parent comment deleted while user typing reply
- **Expected**: Submission fails gracefully, clear error message
- **Implementation**: Backend validates parent_comment_id exists before insert

**EC-005: Processing State Stuck (Bug)**
- **Scenario**: API call never returns, processing state never clears
- **Expected**: Timeout after 10 seconds, state auto-clears, error shown
- **Implementation**: setTimeout fallback, maximum processing duration

### 7.2 Agent Routing Edge Cases

**EC-006: Circular Parent Reference**
- **Scenario**: Database corruption causes comment to reference itself
- **Expected**: Infinite loop prevented, default routing used
- **Implementation**: Max traversal depth of 10, cycle detection

**EC-007: Parent Comment Has Invalid Agent**
- **Scenario**: `author_agent = "non-existent-agent"`
- **Expected**: Fall back to keyword matching or default
- **Implementation**: Validate agent name against registry before routing

**EC-008: Deeply Nested Thread (15+ levels)**
- **Scenario**: Reply chain exceeds typical depth
- **Expected**: Routing still works, performance acceptable
- **Implementation**: Limit traversal to 10 levels, cache lookups

**EC-009: Agent Changes Between Comment and Reply**
- **Scenario**: Parent comment's agent field modified after posting
- **Expected**: Use current agent value in database
- **Implementation**: No client-side caching of agent data

**EC-010: Multiple @Mentions in Reply**
- **Scenario**: Reply text: "@avi @get-to-know-you which is better?"
- **Expected**: Use parent comment agent (ignore mentions)
- **Implementation**: Parent agent takes priority over @mentions

### 7.3 Integration Edge Cases

**EC-011: WebSocket Disconnect During Reply**
- **Scenario**: Real-time connection lost while posting reply
- **Expected**: Reply succeeds, updates shown on reconnect
- **Implementation**: Poll for updates on reconnect

**EC-012: Onboarding User Replies**
- **Scenario**: User in onboarding flow replies to Avi
- **Expected**: Onboarding routing logic takes precedence
- **Implementation**: Check onboarding state before agent routing

**EC-013: Reply During Post Creation**
- **Scenario**: User replies to comment on post still being processed
- **Expected**: Reply queued until post fully created
- **Implementation**: Validate post exists before accepting replies

**EC-014: Agent Disabled/Unavailable**
- **Scenario**: Target agent is temporarily disabled
- **Expected**: Fall back to default agent, log warning
- **Implementation**: Agent availability check before task creation

---

## 8. Acceptance Criteria

### 8.1 Processing Pills Acceptance

**AC-001: Visual Feedback**
- [ ] Clicking "Post Reply" shows spinner icon within 50ms
- [ ] Button text changes to "Posting..." during submission
- [ ] Button is disabled (not clickable) during submission
- [ ] Textarea is disabled (read-only) during submission
- [ ] Spinner and text revert after successful submission
- [ ] Form collapses after successful submission
- [ ] New reply appears in thread immediately

**AC-002: Error Handling**
- [ ] Network error clears processing state
- [ ] Error toast shown on failure
- [ ] Form remains open with user text preserved
- [ ] Button re-enabled after error
- [ ] Multiple retry attempts allowed

**AC-003: State Management**
- [ ] Processing state never orphaned (stuck on)
- [ ] Multiple concurrent replies each have independent state
- [ ] Component unmount cleans up processing state
- [ ] No console errors or warnings

### 8.2 Agent Routing Acceptance

**AC-004: Parent Comment Routing**
- [ ] Reply to Avi's comment routes to Avi
- [ ] Reply to Get-to-Know-You comment routes to Get-to-Know-You
- [ ] Reply to Interest agent comment routes to Interest agent
- [ ] Reply to Recommendation agent routes to Recommendation agent

**AC-005: Deep Threading**
- [ ] Reply to reply (2 levels) routes to correct agent
- [ ] Reply to reply to reply (3+ levels) routes to correct agent
- [ ] Agent context maintained across full thread
- [ ] Maximum thread depth enforced (10 levels)

**AC-006: Fallback Logic**
- [ ] User-to-user reply falls back to keyword matching
- [ ] Invalid agent name falls back to default
- [ ] Database error falls back to default agent
- [ ] Missing parent comment falls back to post routing

**AC-007: Edge Cases**
- [ ] Circular reference detection prevents infinite loops
- [ ] Multiple @mentions don't override parent agent
- [ ] Concurrent replies don't cause routing conflicts
- [ ] Agent changes reflected in real-time

### 8.3 Regression Testing

**AC-008: Existing Functionality Preserved**
- [ ] Top-level "Add Comment" processing pills still work
- [ ] Atomic claiming tests pass (4/4 tests)
- [ ] Onboarding name flow tests pass
- [ ] Comment counter real-time tests pass
- [ ] isAviQuestion tests pass
- [ ] No new console errors in existing flows

### 8.4 Integration Testing

**AC-009: End-to-End Scenarios**
- [ ] User can reply to agent, agent responds correctly
- [ ] Processing feedback visible throughout interaction
- [ ] Real-time updates work with new replies
- [ ] Toast notifications show for agent responses
- [ ] Comment thread expands/collapses correctly

### 8.5 Browser Validation

**AC-010: Real-World Testing**
- [ ] Tested in Chrome (latest)
- [ ] Tested in Firefox (latest)
- [ ] Tested in Safari (latest)
- [ ] Mobile responsive behavior correct
- [ ] Screenshot proof of processing pills
- [ ] Screenshot proof of correct agent routing

---

## 9. Success Metrics

### 9.1 Technical Metrics

**Performance**:
- Processing state activation time: <50ms (p95)
- Agent routing decision time: <100ms (p95)
- End-to-end reply submission: <2000ms (p95)
- Database query time: <50ms (p95)

**Reliability**:
- Processing state orphaning rate: 0%
- Agent routing accuracy: 100% (in standard cases)
- Fallback routing success rate: 100%
- Error recovery success rate: >95%

**Quality**:
- Zero regression test failures
- Zero console errors in normal flows
- Code coverage: >80% for new code
- TypeScript strict mode compliance: 100%

### 9.2 User Experience Metrics

**Usability**:
- Time to understand reply is processing: <1 second
- Error message clarity: User can retry without confusion
- Visual feedback satisfaction: Matches expectation

**Engagement**:
- Reply submission completion rate: >95%
- Multi-turn conversation rate: Increase expected
- User confusion reports: Decrease expected

### 9.3 Business Metrics

**Impact**:
- Bug report volume: 100% reduction for these issues
- Support ticket volume: Decrease expected
- User retention: Stable or improved
- Feature adoption: Reply usage increases

---

## 10. Testing Strategy

### 10.1 Unit Tests

**CommentThread Component**:
```typescript
describe('CommentThread Reply Processing', () => {
  test('shows spinner when reply is processing', () => {
    // Arrange: Mount component with processing state
    // Act: Check button content
    // Assert: Spinner visible, "Posting..." text
  });

  test('disables button and textarea during processing', () => {
    // Arrange: Set processing state
    // Act: Try to click button, type in textarea
    // Assert: Actions ignored
  });

  test('clears processing state after successful reply', () => {
    // Arrange: Submit reply, mock successful API response
    // Act: Wait for completion
    // Assert: Processing state false, form collapsed
  });

  test('clears processing state on error', () => {
    // Arrange: Submit reply, mock API error
    // Act: Wait for error handling
    // Assert: Processing state false, error shown, form open
  });
});
```

**Orchestrator Routing**:
```typescript
describe('Agent Routing for Replies', () => {
  test('routes to parent comment agent', async () => {
    // Arrange: Create comment with author_agent="avi"
    // Act: Submit reply to that comment
    // Assert: Work task created for "avi"
  });

  test('falls back to post agent if parent comment has no agent', async () => {
    // Arrange: User comment (no agent) on agent-generated post
    // Act: Submit reply to user comment
    // Assert: Work task created for post's agent
  });

  test('falls back to default if no agents in chain', async () => {
    // Arrange: User post, user comment, reply
    // Act: Submit reply
    // Assert: Work task created for default agent
  });

  test('handles missing parent comment gracefully', async () => {
    // Arrange: Invalid parent_comment_id
    // Act: Submit reply
    // Assert: Error or fallback routing
  });

  test('prevents infinite loops on circular references', async () => {
    // Arrange: Create circular parent reference (mock)
    // Act: Attempt routing
    // Assert: Breaks loop, uses fallback
  });
});
```

### 10.2 Integration Tests

**Reply Flow End-to-End**:
```typescript
describe('Reply Processing Integration', () => {
  test('full reply flow with processing feedback', async () => {
    // Arrange: Render feed with agent comment
    // Act: Click reply, type, submit
    // Assert: Spinner shown → API called → Reply appears → Form closes
  });

  test('agent responds to user reply correctly', async () => {
    // Arrange: Agent comment exists
    // Act: Submit reply from user
    // Assert: Work task created → Agent processes → Agent response appears
  });

  test('multiple concurrent replies succeed', async () => {
    // Arrange: Open 3 reply forms
    // Act: Submit all 3 simultaneously
    // Assert: All 3 complete, no race conditions
  });
});
```

### 10.3 E2E Tests (Playwright)

**Browser Validation**:
```typescript
describe('Reply Processing E2E', () => {
  test('reply button shows processing state in browser', async ({ page }) => {
    // Navigate to feed
    // Click reply on agent comment
    // Type reply text
    // Click "Post Reply"
    // Assert: Spinner visible, button disabled
    // Wait for completion
    // Assert: Reply appears, form closes
  });

  test('agent routes correctly for reply in browser', async ({ page }) => {
    // Navigate to feed
    // Find Avi's comment
    // Reply to Avi
    // Wait for work queue processing
    // Assert: Avi's response appears (not other agent)
  });

  test('screenshot proof of processing pills', async ({ page }) => {
    // Navigate, click reply, take screenshot during processing
    // Visual regression test
  });
});
```

### 10.4 Regression Tests

**Verify No Breakage**:
- Run existing atomic claiming tests
- Run existing onboarding tests
- Run existing comment counter tests
- Run existing isAviQuestion tests
- Manual smoke test of top-level comment flow
- Manual smoke test of post creation
- Manual smoke test of agent initialization

---

## 11. Implementation Phases

### Phase 1: Processing Pills (Day 1)

**Tasks**:
1. Add `onProcessingChange` prop to CommentThread
2. Implement processing state management in RealSocialMediaFeed
3. Update reply button UI to show spinner/disabled state
4. Add error handling and cleanup logic
5. Write unit tests for processing state
6. Write integration tests for reply flow
7. Browser validation with screenshots

**Deliverables**:
- Updated CommentThread component
- Updated RealSocialMediaFeed component
- Unit test suite (90%+ coverage)
- Integration test suite
- Browser screenshots

### Phase 2: Agent Routing (Day 2)

**Tasks**:
1. Create `getCommentById` database method
2. Update orchestrator routing logic (check parent_comment_id)
3. Implement parent comment traversal (max depth 10)
4. Add fallback logic for edge cases
5. Write unit tests for routing logic
6. Write integration tests for agent responses
7. E2E tests with real agent interactions

**Deliverables**:
- Updated orchestrator.js
- New database method
- Unit test suite
- Integration test suite
- E2E test suite

### Phase 3: Integration & Testing (Day 3)

**Tasks**:
1. Run full regression test suite
2. Manual browser testing (Chrome, Firefox, Safari)
3. Performance testing (measure metrics)
4. Error scenario testing (network failures, etc.)
5. Documentation updates
6. Code review
7. Deployment preparation

**Deliverables**:
- Regression test report (all pass)
- Performance metrics report
- Browser compatibility report
- Updated documentation
- Deployment checklist

---

## 12. Validation Checklist

### 12.1 Pre-Implementation Validation

- [ ] Specification reviewed by stakeholders
- [ ] User requirements confirmed accurate
- [ ] Technical approach approved
- [ ] Database schema verified (no changes needed)
- [ ] API contracts defined
- [ ] Test strategy approved
- [ ] Edge cases identified and documented

### 12.2 Implementation Validation

- [ ] Code follows project style guide
- [ ] TypeScript strict mode enabled
- [ ] No console errors or warnings
- [ ] All new code has tests (unit + integration)
- [ ] Test coverage >80% for new code
- [ ] Performance metrics meet requirements
- [ ] Error handling comprehensive

### 12.3 Testing Validation

- [ ] All unit tests pass (100%)
- [ ] All integration tests pass (100%)
- [ ] All E2E tests pass (100%)
- [ ] All regression tests pass (100%)
- [ ] Manual browser testing complete (3+ browsers)
- [ ] Mobile responsive testing complete
- [ ] Screenshots captured for visual proof

### 12.4 Deployment Validation

- [ ] Code reviewed and approved
- [ ] Documentation updated
- [ ] Changelog entry created
- [ ] Deployment plan defined
- [ ] Rollback plan defined
- [ ] Monitoring alerts configured
- [ ] Stakeholders notified

---

## 13. Dependencies & Assumptions

### 13.1 Dependencies

**Frontend**:
- React 18+ with hooks
- Lucide React for Loader2 icon
- Existing toast notification system
- TypeScript 5+

**Backend**:
- Node.js orchestrator running
- SQLite database accessible
- Work queue system operational
- WebSocket server running

**Infrastructure**:
- Database indexes on comments table
- API endpoint `/api/comments/reply` exists
- Agent registry with known agents
- Error logging system

### 13.2 Assumptions

**User Behavior**:
- Users expect immediate feedback on button clicks
- Users understand spinner = processing
- Users will retry on error if prompted

**Technical**:
- Database queries complete within 50ms (indexed)
- Network latency <1000ms (p95)
- Agent work tasks process within 5 seconds
- WebSocket connection usually stable

**System State**:
- Comment IDs are unique and immutable
- Parent-child relationships enforced by DB
- Agent names in database match agent registry
- User sessions persist during reply submission

---

## 14. Risks & Mitigation

### 14.1 Technical Risks

**Risk: Processing state gets stuck (orphaned)**
- **Impact**: HIGH - User sees endless spinner
- **Probability**: MEDIUM
- **Mitigation**: Timeout fallback (10 seconds), error boundaries, cleanup on unmount

**Risk: Agent routing logic breaks existing flows**
- **Impact**: HIGH - Wrong agents respond
- **Probability**: LOW
- **Mitigation**: Comprehensive regression tests, feature flags, gradual rollout

**Risk: Database query performance degrades**
- **Impact**: MEDIUM - Slow reply submissions
- **Probability**: LOW
- **Mitigation**: Database indexing, query optimization, caching layer

**Risk: Race conditions in concurrent replies**
- **Impact**: MEDIUM - Duplicate submissions or lost replies
- **Probability**: MEDIUM
- **Mitigation**: Debouncing, atomic DB operations, optimistic UI updates

### 14.2 User Experience Risks

**Risk: Users confused by processing feedback**
- **Impact**: LOW - Minor UX issue
- **Probability**: LOW
- **Mitigation**: User testing, clear visual design, consistent patterns

**Risk: Error messages unclear**
- **Impact**: MEDIUM - Users don't know how to fix issue
- **Probability**: MEDIUM
- **Mitigation**: User-friendly error text, actionable guidance, retry buttons

### 14.3 Business Risks

**Risk: Regression breaks existing features**
- **Impact**: CRITICAL - User trust damaged
- **Probability**: LOW
- **Mitigation**: Comprehensive regression testing, staged rollout, quick rollback

**Risk: Implementation takes longer than estimated**
- **Impact**: MEDIUM - Delayed feature release
- **Probability**: MEDIUM
- **Mitigation**: Phased implementation, MVP first, incremental improvements

---

## 15. Open Questions

1. **Q**: Should we add analytics tracking for reply submission failures?
   - **A**: TBD - Discuss with product team

2. **Q**: Should processing state show time elapsed (e.g., "Posting... 3s")?
   - **A**: TBD - User testing needed

3. **Q**: Should we cache parent comment lookups to reduce DB queries?
   - **A**: TBD - Performance testing will inform

4. **Q**: Should we support @mentions overriding parent agent routing?
   - **A**: NO - Parent agent takes priority (specification decision)

5. **Q**: Should we add a "Cancel Reply" button during processing?
   - **A**: TBD - Nice-to-have, not MVP

6. **Q**: Should we log all agent routing decisions for debugging?
   - **A**: YES - Add structured logging (specification decision)

7. **Q**: Should we add a UI indicator showing which agent will respond?
   - **A**: TBD - Future enhancement, not MVP

---

## 16. Appendix

### 16.1 Glossary

- **Processing Pills**: Visual feedback UI showing spinner + "Posting..." text
- **Agent Routing**: Logic determining which AI agent responds to comment
- **Parent Comment**: The comment being replied to
- **Deep Threading**: Reply chains 3+ levels deep
- **Orphaned State**: Processing state that never clears (bug)
- **Temp ID**: Temporary unique identifier for optimistic UI updates
- **Fallback Routing**: Default agent selection when primary logic fails

### 16.2 Related Documents

- `/workspaces/agent-feed/docs/COMMENT-COUNTER-REALTIME-FIX-SPEC.md`
- `/workspaces/agent-feed/docs/DUPLICATE-AGENT-RESPONSE-FIX-SPEC.md`
- `/workspaces/agent-feed/docs/ONBOARDING-FLOW-SPEC.md`
- `/workspaces/agent-feed/api-server/avi/orchestrator.js` (current routing logic)
- `/workspaces/agent-feed/frontend/src/components/CommentThread.tsx` (current component)

### 16.3 Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-11-14 | SPARC Specification Agent | Initial specification document |

---

## Document Sign-Off

**Specification Complete**: ✅
**Ready for Pseudocode Phase**: ✅
**Stakeholder Approval**: Pending
**Technical Review**: Pending

---

**Next Phase**: [SPARC Pseudocode](/workspaces/agent-feed/docs/SPARC-REPLY-FIXES-PSEUDOCODE.md)
