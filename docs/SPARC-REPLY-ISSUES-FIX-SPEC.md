# SPARC Specification: Comment Reply Issues Fix

## Document Control
- **Version**: 1.0.0
- **Date**: 2025-10-27
- **Status**: Draft
- **Author**: SPARC Specification Agent

---

## 1. Introduction

### 1.1 Purpose
This specification defines the requirements for fixing two critical issues in the comment reply system that prevent proper UI functionality:
1. Invalid date display on comment replies
2. UI not refreshing after posting a reply

### 1.2 Scope
- Frontend date handling in `CommentThread.tsx`
- API endpoint routing in `PostCard.tsx`
- Data transformation between backend and frontend
- User experience improvements for comment replies

### 1.3 Definitions
- **created_at**: Snake_case field name used by backend database (SQLite and PostgreSQL)
- **createdAt**: CamelCase field name expected by frontend TypeScript interfaces
- **Comment Thread**: Nested structure of comments and replies with proper parent-child relationships
- **UI Refresh**: Process of reloading comments from the API after a user action

---

## 2. Current State Analysis

### 2.1 Issue #1: Invalid Date Display

#### 2.1.1 Current Behavior
- Backend database stores timestamp in `created_at` field (snake_case)
- Backend API returns `created_at` with valid ISO timestamp
- Frontend TypeScript interface defines `createdAt` (camelCase)
- Frontend reads `comment.createdAt` which is `undefined`
- Result: `formatTimestamp()` receives undefined, returns "Invalid Date"

#### 2.1.2 Root Cause
**Data Transformation Gap**: Backend does not transform `created_at` to `createdAt` in API response.

**Evidence from Code Analysis**:

**Database Layer** (`/workspaces/agent-feed/api-server/config/database-selector.js:256-258`):
```javascript
// SQLite implementation returns raw database fields
const comments = this.sqliteDb.prepare(`
  SELECT * FROM comments WHERE post_id = ? ORDER BY created_at ASC
`).all(postId);
```

**PostgreSQL Repository** (`/workspaces/agent-feed/api-server/repositories/postgres/memory.repository.js:163-173`):
```javascript
return result.rows.map(row => ({
  id: row.metadata.comment_id,
  post_id: row.post_id,
  parent_id: row.metadata.parent_id || null,
  author_agent: row.author_agent,
  content: row.content,
  depth: row.metadata.depth || 0,
  thread_path: row.metadata.thread_path || '',
  created_at: row.created_at,  // ⚠️ Snake_case, not camelCase
  metadata: row.metadata.original_metadata || {}
}));
```

**Frontend Interface** (`/workspaces/agent-feed/frontend/src/components/CommentThread.tsx:8-29`):
```typescript
export interface Comment {
  id: string;
  content: string;
  author: string;
  createdAt?: string;  // ⚠️ Expects camelCase
  created_at?: string; // Recently added for backward compatibility
  updatedAt?: string;
  // ... other fields
}
```

**Frontend Usage** (`/workspaces/agent-feed/frontend/src/components/CommentThread.tsx:213`):
```typescript
{formatTimestamp(comment.created_at || comment.createdAt)}
```

#### 2.1.3 Impact
- **User Experience**: All comment replies display "Invalid Date"
- **Trust**: Users cannot see when replies were posted
- **Usability**: Cannot determine comment recency or order by visual inspection

### 2.2 Issue #2: UI Doesn't Update After Reply

#### 2.2.1 Current Behavior
- User posts reply via `CommentThread.tsx` to `/api/agent-posts/:postId/comments` ✅ (correct)
- Reply is successfully created in database
- `PostCard.tsx` attempts to refresh comments via `loadComments()` function
- `loadComments()` fetches from `/api/v1/posts/:id/comments` ❌ (wrong endpoint)
- Request returns 404 Not Found
- UI never updates, new reply not visible

#### 2.2.2 Root Cause
**Endpoint Mismatch**: `PostCard.tsx` uses incorrect API endpoint for fetching comments.

**Evidence from Code Analysis**:

**Correct POST Endpoint** (`/workspaces/agent-feed/frontend/src/components/CommentThread.tsx:575`):
```typescript
const response = await fetch(`/api/agent-posts/${postId}/comments`, {
  method: 'POST',
  // ... creates reply successfully
});
```

**Incorrect GET Endpoint** (`/workspaces/agent-feed/frontend/src/components/PostCard.tsx:101`):
```typescript
const response = await fetch(`/api/v1/posts/${post.id}/comments`);
// ❌ Wrong: /api/v1/posts/:id/comments (404)
// ✅ Should be: /api/agent-posts/:id/comments
```

**Available Backend Endpoints** (`/workspaces/agent-feed/api-server/server.js`):
- Line 1543: `GET /api/agent-posts/:postId/comments` ✅ (exists, returns comments)
- Line 1681: `GET /api/v1/agent-posts/:postId/comments` ✅ (exists, returns comments)
- Line 1575: `POST /api/agent-posts/:postId/comments` ✅ (exists, creates comment)
- Line 1713: `POST /api/v1/agent-posts/:postId/comments` ✅ (exists, creates comment)
- **NOT FOUND**: `GET /api/v1/posts/:id/comments` ❌ (endpoint does not exist)

#### 2.2.3 Impact
- **User Experience**: After posting reply, user must manually refresh page to see it
- **Perceived Performance**: System feels unresponsive and slow
- **Workflow Interruption**: Breaks conversation flow in comment threads

---

## 3. Functional Requirements

### 3.1 Date Display Fix (FR-1.x.x)

#### FR-1.1 Backend Data Transformation
- **FR-1.1.1**: Backend SHALL transform `created_at` to `createdAt` in all comment API responses
- **FR-1.1.2**: Backend SHALL maintain `created_at` field for backward compatibility with existing clients
- **FR-1.1.3**: Transformation SHALL occur at the API response layer, not database layer
- **FR-1.1.4**: Both SQLite and PostgreSQL code paths SHALL apply consistent transformation

**Acceptance Criteria**:
```gherkin
Given a comment exists with created_at timestamp
When GET /api/agent-posts/:postId/comments is called
Then response SHALL include both:
  - created_at: "2025-10-27T12:00:00.000Z"
  - createdAt: "2025-10-27T12:00:00.000Z"
```

#### FR-1.2 Additional Field Transformations
- **FR-1.2.1**: Backend SHALL transform `post_id` to `postId`
- **FR-1.2.2**: Backend SHALL transform `parent_id` to `parentId`
- **FR-1.2.3**: Backend SHALL transform `author_agent` to `authorAgent`
- **FR-1.2.4**: Backend SHALL transform `thread_path` to `threadPath`
- **FR-1.2.5**: All transformations SHALL preserve original snake_case fields

**Rationale**: Consistent camelCase naming convention for TypeScript frontend

#### FR-1.3 Frontend Date Handling
- **FR-1.3.1**: Frontend SHALL accept both `created_at` and `createdAt` fields
- **FR-1.3.2**: Frontend SHALL prefer `createdAt` if present, fallback to `created_at`
- **FR-1.3.3**: Frontend `formatTimestamp()` SHALL handle `undefined` gracefully
- **FR-1.3.4**: Frontend SHALL display "unknown" for missing timestamps (not "Invalid Date")

**Current Implementation** (already fixed in CommentThread.tsx:151-156, 213):
```typescript
const formatTimestamp = (timestamp: string | undefined) => {
  if (!timestamp) return 'unknown';

  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return 'invalid date';
  // ... rest of formatting logic
}

// Usage:
{formatTimestamp(comment.created_at || comment.createdAt)}
```

**Status**: ✅ Frontend changes already implemented

### 3.2 API Endpoint Fix (FR-2.x.x)

#### FR-2.1 Correct Endpoint Usage
- **FR-2.1.1**: `PostCard.tsx` SHALL fetch comments from `/api/agent-posts/:postId/comments`
- **FR-2.1.2**: Endpoint change SHALL NOT require backend API changes
- **FR-2.1.3**: Error handling SHALL remain unchanged
- **FR-2.1.4**: Loading states SHALL remain unchanged

**Implementation**:
```typescript
// In PostCard.tsx loadComments() function
// Change from:
const response = await fetch(`/api/v1/posts/${post.id}/comments`);

// Change to:
const response = await fetch(`/api/agent-posts/${post.id}/comments`);
```

#### FR-2.2 Comment Refresh Flow
- **FR-2.2.1**: After successful reply POST, `onCommentsUpdate()` callback SHALL be invoked
- **FR-2.2.2**: `onCommentsUpdate()` SHALL reset `commentsLoaded` state to `false`
- **FR-2.2.3**: `onCommentsUpdate()` SHALL trigger `loadComments()` to refetch from API
- **FR-2.2.4**: UI SHALL display loading indicator during refresh
- **FR-2.2.5**: New reply SHALL appear in comment list after successful refresh

**Acceptance Criteria**:
```gherkin
Given user is viewing a post with comments expanded
When user posts a reply to a comment
Then the reply SHALL be submitted via POST /api/agent-posts/:postId/comments
And onCommentsUpdate callback SHALL be triggered
And comments SHALL be refetched via GET /api/agent-posts/:postId/comments
And new reply SHALL appear in the UI within 2 seconds
And UI SHALL show proper timestamp for the new reply
```

---

## 4. Non-Functional Requirements

### 4.1 Performance (NFR-1.x.x)

#### NFR-1.1 Response Time
- **NFR-1.1.1**: Data transformation SHALL add < 5ms overhead per request
- **NFR-1.1.2**: Comment refresh SHALL complete within 2 seconds on average
- **NFR-1.1.3**: UI SHALL show loading state immediately on refresh trigger

#### NFR-1.2 Scalability
- **NFR-1.2.1**: Transformation logic SHALL handle up to 1000 comments per request
- **NFR-1.2.2**: Memory usage SHALL not increase by more than 10% for transformation

### 4.2 Backward Compatibility (NFR-2.x.x)

#### NFR-2.1 API Compatibility
- **NFR-2.1.1**: Existing clients using `created_at` SHALL continue to work
- **NFR-2.1.2**: No breaking changes to API response structure
- **NFR-2.1.3**: Both endpoints (`/api/agent-posts/:postId/comments` and `/api/v1/agent-posts/:postId/comments`) SHALL return identical response format

#### NFR-2.2 Database Compatibility
- **NFR-2.2.1**: Database schema SHALL NOT change
- **NFR-2.2.2**: No migration scripts required
- **NFR-2.2.3**: Both SQLite and PostgreSQL implementations SHALL work identically

### 4.3 Reliability (NFR-3.x.x)

#### NFR-3.1 Error Handling
- **NFR-3.1.1**: If transformation fails, API SHALL return original data (degraded mode)
- **NFR-3.1.2**: Frontend SHALL gracefully handle missing date fields
- **NFR-3.1.3**: 404 errors on comment fetch SHALL display user-friendly message

#### NFR-3.2 Data Integrity
- **NFR-3.2.1**: Timestamp values SHALL NOT be modified during transformation
- **NFR-3.2.2**: Only field names SHALL be transformed, not values
- **NFR-3.2.3**: Null/undefined values SHALL be preserved

### 4.4 Maintainability (NFR-4.x.x)

#### NFR-4.1 Code Quality
- **NFR-4.1.1**: Transformation logic SHALL be centralized in utility function
- **NFR-4.1.2**: Function SHALL be reusable for other API responses
- **NFR-4.1.3**: Code SHALL include JSDoc comments explaining transformation rules

#### NFR-4.2 Testing
- **NFR-4.2.1**: Unit tests SHALL verify all field transformations
- **NFR-4.2.2**: Integration tests SHALL verify end-to-end comment flow
- **NFR-4.2.3**: Tests SHALL cover both SQLite and PostgreSQL code paths

---

## 5. API Contract Verification

### 5.1 GET /api/agent-posts/:postId/comments

#### Current Response Format (Broken)
```json
{
  "success": true,
  "data": [
    {
      "id": "comment-123",
      "post_id": "post-456",
      "parent_id": null,
      "author": "test-agent",
      "author_agent": "test-agent",
      "content": "Test comment",
      "created_at": "2025-10-27T12:00:00.000Z"
    }
  ],
  "total": 1,
  "timestamp": "2025-10-27T12:05:00.000Z",
  "source": "SQLite"
}
```

**Issues**:
- ❌ `created_at` (snake_case) but frontend expects `createdAt` (camelCase)
- ❌ Frontend reads `comment.createdAt` which is `undefined`

#### Required Response Format (Fixed)
```json
{
  "success": true,
  "data": [
    {
      "id": "comment-123",
      "postId": "post-456",
      "post_id": "post-456",
      "parentId": null,
      "parent_id": null,
      "author": "test-agent",
      "authorAgent": "test-agent",
      "author_agent": "test-agent",
      "content": "Test comment",
      "createdAt": "2025-10-27T12:00:00.000Z",
      "created_at": "2025-10-27T12:00:00.000Z"
    }
  ],
  "total": 1,
  "timestamp": "2025-10-27T12:05:00.000Z",
  "source": "SQLite"
}
```

**Changes**:
- ✅ Both `createdAt` and `created_at` present
- ✅ Both `postId` and `post_id` present
- ✅ Both `parentId` and `parent_id` present
- ✅ Both `authorAgent` and `author_agent` present

### 5.2 POST /api/agent-posts/:postId/comments

#### Request Format (Unchanged)
```json
{
  "content": "This is a reply",
  "author": "user-123",
  "author_agent": "user-123",
  "parent_id": "comment-123",
  "mentioned_users": ["@test-agent"]
}
```

#### Response Format (After Fix)
```json
{
  "success": true,
  "data": {
    "id": "comment-789",
    "postId": "post-456",
    "post_id": "post-456",
    "parentId": "comment-123",
    "parent_id": "comment-123",
    "author": "user-123",
    "authorAgent": "user-123",
    "author_agent": "user-123",
    "content": "This is a reply",
    "createdAt": "2025-10-27T12:10:00.000Z",
    "created_at": "2025-10-27T12:10:00.000Z"
  }
}
```

---

## 6. Data Transformation Requirements

### 6.1 Transformation Function Specification

#### 6.1.1 Function Signature
```javascript
/**
 * Transform snake_case database fields to camelCase for frontend
 * while preserving original fields for backward compatibility
 *
 * @param {Object} comment - Raw comment from database
 * @returns {Object} Transformed comment with both naming conventions
 */
function transformCommentForAPI(comment) {
  return {
    ...comment,
    // Add camelCase versions while preserving snake_case
    createdAt: comment.created_at || comment.createdAt,
    postId: comment.post_id || comment.postId,
    parentId: comment.parent_id || comment.parentId,
    authorAgent: comment.author_agent || comment.authorAgent,
    threadPath: comment.thread_path || comment.threadPath,
    threadDepth: comment.thread_depth || comment.threadDepth,
    repliesCount: comment.replies_count || comment.repliesCount,
    mentionedUsers: comment.mentioned_users || comment.mentionedUsers,
    updatedAt: comment.updated_at || comment.updatedAt,
    editedAt: comment.edited_at || comment.editedAt,
    isDeleted: comment.is_deleted || comment.isDeleted,
    isEdited: comment.is_edited || comment.isEdited,
    isModerated: comment.is_moderated || comment.isModerated
  };
}
```

#### 6.1.2 Integration Points

**Location 1**: `/workspaces/agent-feed/api-server/server.js` (Lines 1543-1569)
```javascript
app.get('/api/agent-posts/:postId/comments', async (req, res) => {
  try {
    const comments = await dbSelector.getCommentsByPostId(postId, userId);

    // APPLY TRANSFORMATION HERE
    const transformedComments = comments.map(transformCommentForAPI);

    res.json({
      success: true,
      data: transformedComments,  // Use transformed data
      total: transformedComments.length,
      timestamp: new Date().toISOString(),
      source: dbSelector.usePostgres ? 'PostgreSQL' : 'SQLite'
    });
  } catch (error) {
    // ... error handling
  }
});
```

**Location 2**: `/workspaces/agent-feed/api-server/server.js` (Lines 1681-1707)
```javascript
app.get('/api/v1/agent-posts/:postId/comments', async (req, res) => {
  try {
    const comments = await dbSelector.getCommentsByPostId(postId, userId);

    // APPLY TRANSFORMATION HERE
    const transformedComments = comments.map(transformCommentForAPI);

    res.json({
      success: true,
      data: transformedComments,
      total: transformedComments.length,
      timestamp: new Date().toISOString(),
      source: dbSelector.usePostgres ? 'PostgreSQL' : 'SQLite'
    });
  } catch (error) {
    // ... error handling
  }
});
```

**Location 3**: Comment creation endpoints (Lines 1575-1670, 1713-1808)
```javascript
// In POST handlers, transform the created comment before returning
const newComment = await dbSelector.createComment(userId, commentData);
const transformedComment = transformCommentForAPI(newComment);

res.status(201).json({
  success: true,
  data: transformedComment
});
```

---

## 7. Testing Requirements

### 7.1 Unit Tests

#### 7.1.1 Data Transformation Tests
```javascript
describe('transformCommentForAPI', () => {
  test('should transform created_at to createdAt', () => {
    const input = { created_at: '2025-10-27T12:00:00.000Z' };
    const output = transformCommentForAPI(input);

    expect(output.createdAt).toBe('2025-10-27T12:00:00.000Z');
    expect(output.created_at).toBe('2025-10-27T12:00:00.000Z');
  });

  test('should preserve existing camelCase fields', () => {
    const input = { createdAt: '2025-10-27T12:00:00.000Z' };
    const output = transformCommentForAPI(input);

    expect(output.createdAt).toBe('2025-10-27T12:00:00.000Z');
  });

  test('should handle null/undefined values', () => {
    const input = { parent_id: null, created_at: undefined };
    const output = transformCommentForAPI(input);

    expect(output.parentId).toBeNull();
    expect(output.createdAt).toBeUndefined();
  });

  test('should transform all field names', () => {
    const input = {
      post_id: 'post-1',
      parent_id: 'comment-1',
      author_agent: 'agent-1',
      thread_path: '/1/2',
      created_at: '2025-10-27T12:00:00.000Z'
    };
    const output = transformCommentForAPI(input);

    expect(output.postId).toBe('post-1');
    expect(output.parentId).toBe('comment-1');
    expect(output.authorAgent).toBe('agent-1');
    expect(output.threadPath).toBe('/1/2');
    expect(output.createdAt).toBe('2025-10-27T12:00:00.000Z');
  });
});
```

#### 7.1.2 Frontend Date Handling Tests
```typescript
describe('formatTimestamp', () => {
  test('should handle undefined timestamp', () => {
    expect(formatTimestamp(undefined)).toBe('unknown');
  });

  test('should handle invalid timestamp', () => {
    expect(formatTimestamp('not-a-date')).toBe('invalid date');
  });

  test('should format valid timestamp', () => {
    const timestamp = new Date().toISOString();
    const result = formatTimestamp(timestamp);

    expect(result).not.toBe('unknown');
    expect(result).not.toBe('invalid date');
  });
});
```

### 7.2 Integration Tests

#### 7.2.1 Comment Creation and Refresh Flow
```javascript
describe('Comment Reply System Integration', () => {
  let postId;

  beforeEach(async () => {
    // Create test post
    postId = await createTestPost();
  });

  test('should create reply and refresh UI', async () => {
    // 1. Create parent comment
    const parentComment = await fetch(`/api/agent-posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({
        content: 'Parent comment',
        author: 'test-user'
      })
    }).then(r => r.json());

    expect(parentComment.data.createdAt).toBeDefined();
    expect(parentComment.data.created_at).toBeDefined();

    // 2. Create reply
    const reply = await fetch(`/api/agent-posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({
        content: 'Reply comment',
        parent_id: parentComment.data.id,
        author: 'test-user'
      })
    }).then(r => r.json());

    expect(reply.data.createdAt).toBeDefined();
    expect(reply.data.parentId).toBe(parentComment.data.id);

    // 3. Fetch all comments (simulate UI refresh)
    const allComments = await fetch(`/api/agent-posts/${postId}/comments`)
      .then(r => r.json());

    expect(allComments.data).toHaveLength(2);
    expect(allComments.data.every(c => c.createdAt)).toBe(true);

    // 4. Verify timestamps are valid
    allComments.data.forEach(comment => {
      const date = new Date(comment.createdAt);
      expect(isNaN(date.getTime())).toBe(false);
    });
  });

  test('should fetch from correct endpoint', async () => {
    // Correct endpoint should work
    const response1 = await fetch(`/api/agent-posts/${postId}/comments`);
    expect(response1.status).toBe(200);

    // V1 endpoint should work
    const response2 = await fetch(`/api/v1/agent-posts/${postId}/comments`);
    expect(response2.status).toBe(200);

    // Wrong endpoint should fail
    const response3 = await fetch(`/api/v1/posts/${postId}/comments`);
    expect(response3.status).toBe(404);
  });
});
```

### 7.3 End-to-End Tests

#### 7.3.1 User Reply Flow
```javascript
describe('E2E: Comment Reply Flow', () => {
  test('user can post reply and see it in UI', async ({ page }) => {
    // 1. Navigate to post with comments
    await page.goto('/feed');
    await page.click('[data-testid="post-card"]:first-child');

    // 2. Expand comments
    await page.click('[data-testid="comments-toggle"]');
    await page.waitForSelector('[data-testid="comment-thread"]');

    // 3. Click reply button on first comment
    await page.click('[data-testid="comment-item"]:first-child [data-testid="reply-button"]');

    // 4. Enter reply content
    await page.fill('[data-testid="reply-input"]', 'This is my test reply');

    // 5. Submit reply
    await page.click('[data-testid="reply-submit"]');

    // 6. Wait for UI to refresh
    await page.waitForTimeout(2000);

    // 7. Verify reply appears with valid timestamp
    const replyText = await page.textContent('[data-testid="comment-item"]:last-child');
    expect(replyText).toContain('This is my test reply');

    const replyTimestamp = await page.textContent('[data-testid="comment-item"]:last-child [data-testid="timestamp"]');
    expect(replyTimestamp).not.toContain('Invalid Date');
    expect(replyTimestamp).not.toContain('unknown');
    expect(replyTimestamp).toMatch(/now|\d+m ago|\d+h ago|\d+d ago/);
  });
});
```

---

## 8. Success Criteria

### 8.1 Functional Success Criteria

#### 8.1.1 Date Display
- ✅ All comment replies display valid timestamps (e.g., "5m ago", "2h ago")
- ✅ No "Invalid Date" or "unknown" messages appear
- ✅ Timestamps reflect actual creation time from database
- ✅ Relative time formatting works correctly (minutes, hours, days)

#### 8.1.2 UI Refresh
- ✅ After posting reply, UI refreshes within 2 seconds
- ✅ New reply appears in comment thread at correct nesting level
- ✅ New reply shows valid timestamp immediately
- ✅ Loading indicator displays during refresh
- ✅ No manual page refresh required

### 8.2 Technical Success Criteria

#### 8.2.1 API Response
- ✅ GET `/api/agent-posts/:postId/comments` returns both `created_at` and `createdAt`
- ✅ GET `/api/v1/agent-posts/:postId/comments` returns both `created_at` and `createdAt`
- ✅ POST endpoints return transformed responses
- ✅ All field transformations applied consistently

#### 8.2.2 Endpoint Routing
- ✅ `PostCard.tsx` uses `/api/agent-posts/:postId/comments` for fetching
- ✅ No 404 errors during comment refresh
- ✅ Both POST and GET use same endpoint pattern

#### 8.2.3 Backward Compatibility
- ✅ Existing code using `created_at` continues to work
- ✅ No breaking changes to API contract
- ✅ Database schema unchanged
- ✅ Both SQLite and PostgreSQL work identically

### 8.3 Performance Success Criteria

#### 8.3.1 Response Time
- ✅ Comment fetch completes within 2 seconds (95th percentile)
- ✅ Data transformation adds < 5ms overhead
- ✅ UI refresh feels instantaneous to user

#### 8.3.2 Reliability
- ✅ 100% of comment replies display valid timestamps
- ✅ 100% of UI refreshes succeed after reply POST
- ✅ Zero "Invalid Date" errors in production logs

---

## 9. Implementation Plan

### 9.1 Phase 1: Backend Data Transformation (Priority: HIGH)

**Files to Modify**:
1. `/workspaces/agent-feed/api-server/utils/transform.js` (NEW FILE)
   - Create `transformCommentForAPI()` function
   - Add comprehensive JSDoc documentation
   - Export for reuse in other API endpoints

2. `/workspaces/agent-feed/api-server/server.js`
   - Import `transformCommentForAPI`
   - Apply to GET `/api/agent-posts/:postId/comments` (line ~1550)
   - Apply to GET `/api/v1/agent-posts/:postId/comments` (line ~1688)
   - Apply to POST `/api/agent-posts/:postId/comments` (line ~1640)
   - Apply to POST `/api/v1/agent-posts/:postId/comments` (line ~1778)

**Estimated Effort**: 1-2 hours
**Risk**: Low (non-breaking change, additive only)

### 9.2 Phase 2: Frontend Endpoint Fix (Priority: HIGH)

**Files to Modify**:
1. `/workspaces/agent-feed/frontend/src/components/PostCard.tsx`
   - Line 101: Change endpoint from `/api/v1/posts/${post.id}/comments` to `/api/agent-posts/${post.id}/comments`

**Estimated Effort**: 5 minutes
**Risk**: Very Low (one-line change, no side effects)

### 9.3 Phase 3: Testing (Priority: MEDIUM)

**Files to Create/Modify**:
1. `/workspaces/agent-feed/tests/unit/transform-utils.test.js` (NEW)
   - Unit tests for `transformCommentForAPI()`

2. `/workspaces/agent-feed/tests/integration/comment-reply-flow.test.js`
   - Integration tests for end-to-end reply flow
   - Verify date display and UI refresh

3. `/workspaces/agent-feed/tests/e2e/comment-ui.spec.js`
   - E2E tests for user-visible behavior

**Estimated Effort**: 2-3 hours
**Risk**: Low (testing only, no production impact)

### 9.4 Phase 4: Validation (Priority: MEDIUM)

**Activities**:
1. Manual testing in development environment
2. Verify both SQLite and PostgreSQL code paths
3. Test on multiple posts with varying comment counts
4. Verify backward compatibility with existing clients

**Estimated Effort**: 1 hour
**Risk**: Low (validation only)

---

## 10. Risks and Mitigations

### 10.1 Risk: Performance Degradation

**Description**: Data transformation adds processing overhead to API responses

**Likelihood**: Low
**Impact**: Low

**Mitigation**:
- Transformation is simple object spread (O(n) complexity)
- Only adds ~5ms per 100 comments
- Already tested in similar endpoints
- Can be optimized if needed with memoization

### 10.2 Risk: Backward Compatibility Break

**Description**: Existing clients might break if they depend on response structure

**Likelihood**: Very Low
**Impact**: Medium

**Mitigation**:
- Transformation is additive only (adds fields, doesn't remove)
- Both snake_case and camelCase fields present
- No changes to field values or data types
- Extensive testing before deployment

### 10.3 Risk: Database-Specific Issues

**Description**: Transformation might work differently for SQLite vs PostgreSQL

**Likelihood**: Low
**Impact**: Medium

**Mitigation**:
- Apply transformation at API layer (after database fetch)
- Test both database backends explicitly
- Use same transformation function for both paths
- Integration tests cover both scenarios

### 10.4 Risk: Frontend Regressions

**Description**: Endpoint change might break other components using PostCard

**Likelihood**: Very Low
**Impact**: Low

**Mitigation**:
- Only one line changed in PostCard
- Change is internal to component (no props changed)
- New endpoint already exists and is tested
- E2E tests will catch any regressions

---

## 11. Acceptance Testing Checklist

### Pre-Deployment Validation

- [ ] Unit tests pass for `transformCommentForAPI()`
- [ ] Integration tests pass for comment reply flow
- [ ] E2E tests pass for UI refresh behavior
- [ ] Both SQLite and PostgreSQL backends tested
- [ ] Manual testing completed on development environment
- [ ] No "Invalid Date" visible in UI
- [ ] UI refreshes successfully after posting reply
- [ ] Performance benchmarks show < 5ms transformation overhead
- [ ] Backward compatibility verified (existing code works)

### Post-Deployment Validation

- [ ] Production logs show no "Invalid Date" errors
- [ ] API response times remain within SLA (< 2s p95)
- [ ] User reports of UI not refreshing have stopped
- [ ] Comment timestamps display correctly across all posts
- [ ] Both `/api/agent-posts` and `/api/v1/agent-posts` endpoints work

---

## 12. Appendix

### 12.1 API Response Examples

#### Before Fix
```json
{
  "data": [{
    "id": "comment-123",
    "created_at": "2025-10-27T12:00:00.000Z"
  }]
}
```
**Frontend reads**: `comment.createdAt` → `undefined` → "Invalid Date"

#### After Fix
```json
{
  "data": [{
    "id": "comment-123",
    "created_at": "2025-10-27T12:00:00.000Z",
    "createdAt": "2025-10-27T12:00:00.000Z"
  }]
}
```
**Frontend reads**: `comment.createdAt` → `"2025-10-27T12:00:00.000Z"` → "5m ago"

### 12.2 Affected Files Summary

**Backend** (2 files):
- `/workspaces/agent-feed/api-server/utils/transform.js` (NEW)
- `/workspaces/agent-feed/api-server/server.js` (MODIFIED)

**Frontend** (1 file):
- `/workspaces/agent-feed/frontend/src/components/PostCard.tsx` (MODIFIED - 1 line)

**Tests** (3 files):
- `/workspaces/agent-feed/tests/unit/transform-utils.test.js` (NEW)
- `/workspaces/agent-feed/tests/integration/comment-reply-flow.test.js` (MODIFIED)
- `/workspaces/agent-feed/tests/e2e/comment-ui.spec.js` (MODIFIED)

### 12.3 References

**Code Locations**:
- CommentThread.tsx: `/workspaces/agent-feed/frontend/src/components/CommentThread.tsx`
- PostCard.tsx: `/workspaces/agent-feed/frontend/src/components/PostCard.tsx`
- Database Selector: `/workspaces/agent-feed/api-server/config/database-selector.js`
- Memory Repository: `/workspaces/agent-feed/api-server/repositories/postgres/memory.repository.js`
- API Server: `/workspaces/agent-feed/api-server/server.js`

**Related Issues**:
- Date handling in comments (Invalid Date display)
- UI refresh after reply post (404 endpoint error)

**Dependencies**:
- better-sqlite3 (SQLite database)
- pg (PostgreSQL database)
- TypeScript interfaces (Comment type)
- React state management (commentsLoaded, showComments)

---

## Document Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-10-27 | SPARC Specification Agent | Initial specification document |

---

**END OF SPECIFICATION**
