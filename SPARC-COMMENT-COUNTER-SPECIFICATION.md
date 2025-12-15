# SPARC Specification: Comment Counter Display Issue

**SPARC Phase**: Specification
**Issue ID**: COMMENT-COUNTER-001
**Created**: 2025-10-24
**Status**: Analysis Complete - Ready for Implementation
**Priority**: HIGH - User-facing display issue

---

## Executive Summary

**Problem**: Comment counters are not displaying on the frontend despite:
- Comments existing in the database (verified)
- Database triggers working correctly (engagement.comments = 1 confirmed)
- Backend API returning correct data (engagement JSON contains comments count)

**Root Cause**: Frontend mapping issue - React component is looking for `post.comments` but API returns `post.engagement.comments`.

**Impact**: Users cannot see comment counts on posts, reducing engagement visibility and UX quality.

---

## 1. Current System Architecture Analysis

### 1.1 Database Layer ✅ WORKING

**Schema: `agent_posts` table**
```sql
CREATE TABLE agent_posts (
    id TEXT PRIMARY KEY,
    title TEXT,
    content TEXT,
    authorAgent TEXT,
    publishedAt DATETIME,
    metadata TEXT,               -- JSON
    engagement TEXT,            -- JSON: {"comments": N, "likes": N, "shares": N, "views": N}
    created_at DATETIME,
    last_activity_at DATETIME
);
```

**Schema: `comments` table**
```sql
CREATE TABLE comments (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL,
    content TEXT NOT NULL,
    author TEXT NOT NULL,
    author_agent TEXT,
    parent_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    likes INTEGER DEFAULT 0,
    mentioned_users TEXT DEFAULT '[]',
    FOREIGN KEY (post_id) REFERENCES agent_posts(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
);
```

**Triggers: Comment Count Automation** ✅ VERIFIED WORKING
```sql
-- Trigger: update_comment_count_insert
CREATE TRIGGER IF NOT EXISTS update_comment_count_insert
AFTER INSERT ON comments
BEGIN
    UPDATE agent_posts
    SET engagement = json_set(
        engagement,
        '$.comments',
        (SELECT COUNT(*) FROM comments WHERE post_id = NEW.post_id)
    )
    WHERE id = NEW.post_id;
END;

-- Trigger: update_comment_count_delete
CREATE TRIGGER IF NOT EXISTS update_comment_count_delete
AFTER DELETE ON comments
BEGIN
    UPDATE agent_posts
    SET engagement = json_set(
        engagement,
        '$.comments',
        (SELECT COUNT(*) FROM comments WHERE post_id = OLD.post_id)
    )
    WHERE id = OLD.post_id;
END;
```

**Verification Results:**
```bash
# Database shows correct engagement data:
sqlite> SELECT id, json_extract(engagement, '$.comments') FROM agent_posts LIMIT 3;
post-1761317277425 | 1
post-1761287985919 | 1
post-1761288063230 | 0
```

---

### 1.2 Backend API Layer ✅ WORKING

**Endpoint: GET /api/v1/agent-posts**

**Implementation**: `/workspaces/agent-feed/api-server/server.js` (lines 800-1100)

**Actual Response Structure:**
```json
{
  "success": true,
  "data": [
    {
      "id": "post-1761317277425",
      "title": "Example Post",
      "content": "Post content...",
      "authorAgent": "user-agent",
      "publishedAt": "2025-10-24T14:47:57.425Z",
      "engagement": "{\"comments\":1,\"likes\":0,\"shares\":0,\"views\":0}",  // ⚠️ STRING not OBJECT
      "created_at": "2025-10-24 14:47:57",
      "last_activity_at": "2025-10-24 14:52:09"
    }
  ],
  "meta": {
    "total": 3,
    "limit": 20,
    "offset": 0
  }
}
```

**Critical Finding**: The `engagement` field is returned as a **JSON STRING**, not a parsed object!

---

### 1.3 Frontend Layer ❌ BROKEN - ROOT CAUSE IDENTIFIED

**Component**: `RealSocialMediaFeed.tsx` (line 1003)

**Current Implementation (BROKEN):**
```typescript
// Line 1003:
<span className="text-sm font-medium">{post.comments || 0}</span>
```

**Problem**: The code assumes `post.comments` exists as a top-level property, but the actual data structure is:
- API returns: `post.engagement = "{\"comments\":1,\"likes\":0}"`  (JSON string)
- Component expects: `post.comments` (number)

**Expected vs Actual Data Flow:**

```
❌ CURRENT (BROKEN):
API → post.engagement (string) → Frontend reads post.comments → undefined → displays 0

✅ EXPECTED (FIX):
API → post.engagement (string) → Parse JSON → post.engagement.comments (number) → displays 1
```

---

## 2. Requirements Specification

### 2.1 Functional Requirements

**FR-001: Comment Counter Display**
- **Priority**: HIGH
- **Description**: Display accurate comment count on all post cards
- **Acceptance Criteria**:
  - [ ] Comment count displays correctly for posts with 0 comments
  - [ ] Comment count displays correctly for posts with 1+ comments
  - [ ] Comment count updates immediately after new comment creation
  - [ ] Comment count is visible in both collapsed and expanded post views
  - [ ] No console errors or warnings related to comment display

**FR-002: Data Parsing**
- **Priority**: HIGH
- **Description**: Correctly parse engagement JSON from API responses
- **Acceptance Criteria**:
  - [ ] Frontend parses `post.engagement` string into object
  - [ ] Parsing handles missing or null engagement data gracefully
  - [ ] Parsing preserves all engagement metrics (comments, likes, shares, views)
  - [ ] Parsing occurs before React component renders

**FR-003: Real-time Updates**
- **Priority**: MEDIUM
- **Description**: Comment count updates via WebSocket when comments are added
- **Acceptance Criteria**:
  - [ ] WebSocket updates trigger engagement data refresh
  - [ ] UI updates without full page reload
  - [ ] Optimistic UI updates confirmed by server response
  - [ ] Failed updates revert to previous state

---

### 2.2 Non-Functional Requirements

**NFR-001: Performance**
- **Requirement**: Comment counter must render within 50ms of post data load
- **Measurement**: Chrome DevTools Performance tab
- **Acceptance**: No additional API calls required for counter display

**NFR-002: Reliability**
- **Requirement**: 100% accuracy between database count and displayed count
- **Measurement**: Automated E2E test comparing DB query to UI element
- **Acceptance**: Zero mismatches in 100 consecutive test runs

**NFR-003: Maintainability**
- **Requirement**: Parsing logic must be reusable for other JSON fields
- **Measurement**: Code review checklist
- **Acceptance**: Single utility function handles all JSON parsing

---

## 3. Technical Specification

### 3.1 Backend API Changes

**Status**: ✅ NO CHANGES REQUIRED

The backend is working correctly. The engagement data is properly stored and returned.

**Optional Enhancement (Post-Fix):**
Consider parsing JSON fields before sending to frontend:
```javascript
// api-server/server.js - Optional improvement
const posts = rawPosts.map(post => ({
  ...post,
  engagement: typeof post.engagement === 'string'
    ? JSON.parse(post.engagement)
    : post.engagement,
  metadata: typeof post.metadata === 'string'
    ? JSON.parse(post.metadata)
    : post.metadata
}));
```

---

### 3.2 Frontend Changes (REQUIRED)

#### 3.2.1 Parse Engagement Data in API Service

**File**: `/workspaces/agent-feed/frontend/src/services/api.ts`

**Location**: `getAgentPosts()` method (line 370)

**Current Code:**
```typescript
async getAgentPosts(limit = 50, offset = 0): Promise<any> {
  const response = await this.request<any>(`/v1/agent-posts?${params}`, {}, false);

  return {
    success: true,
    data: response.data,  // ⚠️ Raw data with string engagement
    total: response.total
  };
}
```

**Required Fix:**
```typescript
async getAgentPosts(limit = 50, offset = 0): Promise<any> {
  const response = await this.request<any>(`/v1/agent-posts?${params}`, {}, false);

  // Parse JSON strings in response data
  const parsedData = response.data?.map(post => ({
    ...post,
    engagement: this.parseJSONField(post.engagement, {
      comments: 0,
      likes: 0,
      shares: 0,
      views: 0
    }),
    metadata: this.parseJSONField(post.metadata, {})
  })) || [];

  return {
    success: true,
    data: parsedData,
    total: response.total
  };
}

/**
 * Safely parse JSON field with fallback
 * @param field - String to parse or object to return
 * @param fallback - Default value if parsing fails
 */
private parseJSONField<T>(field: string | T, fallback: T): T {
  if (!field) return fallback;
  if (typeof field === 'object') return field;

  try {
    return JSON.parse(field as string);
  } catch (error) {
    console.warn('Failed to parse JSON field:', field, error);
    return fallback;
  }
}
```

**Impact**: All API calls that return posts will automatically have parsed engagement data.

---

#### 3.2.2 Update Component to Use Correct Property

**File**: `/workspaces/agent-feed/frontend/src/components/RealSocialMediaFeed.tsx`

**Location**: Line 1003 (Comment counter display)

**Current Code (BROKEN):**
```typescript
<span className="text-sm font-medium">{post.comments || 0}</span>
```

**Required Fix:**
```typescript
<span className="text-sm font-medium">
  {post.engagement?.comments ?? 0}
</span>
```

**Explanation:**
- `post.engagement?.comments` - Access nested property with optional chaining
- `?? 0` - Nullish coalescing operator (only fallback if null/undefined, not if 0)
- More explicit than `|| 0` which would hide legitimate zero counts

---

#### 3.2.3 Ensure Optimistic Updates Work

**File**: `/workspaces/agent-feed/frontend/src/components/RealSocialMediaFeed.tsx`

**Location**: `handleNewComment()` method (line 524)

**Current Code:**
```typescript
const handleNewComment = async (postId: string, content: string) => {
  // ... comment creation logic ...

  // Update engagement count optimistically
  setPosts(current =>
    current.map(post =>
      post.id === postId
        ? {
            ...post,
            engagement: {
              ...post.engagement,
              comments: (post.engagement?.comments || 0) + 1  // ✅ Already correct!
            }
          }
        : post
    )
  );
};
```

**Status**: ✅ NO CHANGES REQUIRED (Already using correct path)

---

### 3.3 Data Flow Specification

**Complete Data Flow (After Fix):**

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 1. DATABASE LAYER                                                       │
│    Table: agent_posts                                                   │
│    engagement: '{"comments":1,"likes":0,"shares":0,"views":0}'         │
│                     ↓                                                    │
│ 2. BACKEND API                                                          │
│    GET /api/v1/agent-posts                                             │
│    Returns: { engagement: "{\"comments\":1,...}" }                      │
│                     ↓                                                    │
│ 3. FRONTEND API SERVICE (api.ts)                                       │
│    parseJSONField() → { engagement: {comments: 1, likes: 0, ...} }     │
│                     ↓                                                    │
│ 4. REACT COMPONENT (RealSocialMediaFeed.tsx)                          │
│    Accesses: post.engagement.comments → 1                              │
│                     ↓                                                    │
│ 5. UI DISPLAY                                                           │
│    Shows: "💬 1" (comment icon + count)                                │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Acceptance Criteria

### 4.1 Unit Tests

**Test Suite**: `/workspaces/agent-feed/frontend/src/services/__tests__/api.test.ts`

```typescript
describe('ApiService - JSON Parsing', () => {
  test('should parse engagement string to object', () => {
    const mockPost = {
      id: 'post-123',
      engagement: '{"comments":5,"likes":10,"shares":2,"views":50}'
    };

    const parsed = apiService.parseJSONField(mockPost.engagement, {});

    expect(parsed).toEqual({
      comments: 5,
      likes: 10,
      shares: 2,
      views: 50
    });
  });

  test('should handle null engagement gracefully', () => {
    const mockPost = {
      id: 'post-123',
      engagement: null
    };

    const parsed = apiService.parseJSONField(
      mockPost.engagement,
      { comments: 0, likes: 0, shares: 0, views: 0 }
    );

    expect(parsed.comments).toBe(0);
  });

  test('should handle malformed JSON gracefully', () => {
    const mockPost = {
      id: 'post-123',
      engagement: '{invalid json}'
    };

    const parsed = apiService.parseJSONField(
      mockPost.engagement,
      { comments: 0, likes: 0, shares: 0, views: 0 }
    );

    expect(parsed.comments).toBe(0);
  });
});
```

---

### 4.2 Integration Tests

**Test Suite**: `/workspaces/agent-feed/api-server/tests/integration/comment-counter.test.js`

```javascript
describe('Comment Counter Integration', () => {
  test('should display correct count after comment creation', async () => {
    // 1. Create post
    const postResponse = await request(app)
      .post('/api/v1/agent-posts')
      .send({ title: 'Test Post', content: 'Content' });

    const postId = postResponse.body.data.id;

    // 2. Verify initial count is 0
    let posts = await request(app).get('/api/v1/agent-posts');
    let post = posts.body.data.find(p => p.id === postId);
    let engagement = JSON.parse(post.engagement);
    expect(engagement.comments).toBe(0);

    // 3. Create comment
    await request(app)
      .post(`/api/agent-posts/${postId}/comments`)
      .send({ content: 'Test comment', author: 'TestUser' });

    // 4. Verify count incremented to 1
    posts = await request(app).get('/api/v1/agent-posts');
    post = posts.body.data.find(p => p.id === postId);
    engagement = JSON.parse(post.engagement);
    expect(engagement.comments).toBe(1);

    // 5. Verify database trigger worked
    const dbCount = db.prepare(
      'SELECT COUNT(*) as count FROM comments WHERE post_id = ?'
    ).get(postId).count;

    expect(engagement.comments).toBe(dbCount);
  });
});
```

---

### 4.3 E2E Tests

**Test Suite**: `/workspaces/agent-feed/tests/e2e/comment-counter.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Comment Counter Display', () => {
  test('should show correct comment count on post card', async ({ page }) => {
    // Navigate to feed
    await page.goto('http://localhost:5173');

    // Find first post with comments > 0
    const postCard = page.locator('[data-testid="post-card"]').first();

    // Verify comment counter is visible
    const commentButton = postCard.locator('button:has-text("Comments")');
    await expect(commentButton).toBeVisible();

    // Extract displayed count
    const displayedCount = await commentButton
      .locator('span.text-sm')
      .textContent();

    // Get actual count from API
    const response = await page.request.get('http://localhost:3001/api/v1/agent-posts');
    const data = await response.json();
    const firstPost = data.data[0];
    const actualCount = JSON.parse(firstPost.engagement).comments;

    // Verify counts match
    expect(parseInt(displayedCount)).toBe(actualCount);
  });

  test('should update counter after adding comment', async ({ page }) => {
    await page.goto('http://localhost:5173');

    // Click comments button to expand
    const postCard = page.locator('[data-testid="post-card"]').first();
    const commentButton = postCard.locator('button:has-text("Comments")');
    const initialCount = await commentButton.locator('span').textContent();

    await commentButton.click();

    // Add new comment
    await postCard.locator('button:has-text("Add Comment")').click();
    await postCard.locator('textarea').fill('E2E test comment');
    await postCard.locator('button:has-text("Post Comment")').click();

    // Wait for update
    await page.waitForTimeout(1000);

    // Verify counter incremented
    const newCount = await commentButton.locator('span').textContent();
    expect(parseInt(newCount)).toBe(parseInt(initialCount) + 1);
  });
});
```

---

## 5. Edge Cases & Error Handling

### 5.1 Edge Cases to Test

| Case | Input | Expected Output | Test Status |
|------|-------|----------------|-------------|
| No comments | `engagement: {"comments":0}` | Display "0" | ⬜ TODO |
| Single comment | `engagement: {"comments":1}` | Display "1" | ⬜ TODO |
| Many comments | `engagement: {"comments":999}` | Display "999" | ⬜ TODO |
| Null engagement | `engagement: null` | Display "0" (fallback) | ⬜ TODO |
| Undefined engagement | `engagement: undefined` | Display "0" (fallback) | ⬜ TODO |
| Malformed JSON | `engagement: "{bad json"` | Display "0" + console warning | ⬜ TODO |
| Missing comments key | `engagement: {"likes":5}` | Display "0" (default) | ⬜ TODO |
| Negative count (corruption) | `engagement: {"comments":-1}` | Display "0" + log error | ⬜ TODO |
| String count | `engagement: {"comments":"5"}` | Parse to number: 5 | ⬜ TODO |

---

### 5.2 Error Handling Requirements

**EH-001: Parsing Failures**
```typescript
private parseJSONField<T>(field: string | T, fallback: T): T {
  try {
    return JSON.parse(field as string);
  } catch (error) {
    console.warn('⚠️ JSON parse failed:', {
      field: field?.toString().slice(0, 100),
      error: error.message,
      fallback
    });

    // Log to monitoring service (future enhancement)
    // analytics.trackError('json_parse_failure', { field, error });

    return fallback;
  }
}
```

**EH-002: Missing Data Graceful Degradation**
```typescript
// Display component should never crash
<span className="text-sm font-medium">
  {post.engagement?.comments ?? 0}
</span>
```

**EH-003: WebSocket Update Failures**
```typescript
// Fallback to polling if WebSocket fails
if (!wsConnection || wsConnection.readyState !== WebSocket.OPEN) {
  console.warn('WebSocket unavailable, using polling fallback');
  setInterval(() => loadPosts(0, false), 30000); // Refresh every 30s
}
```

---

## 6. Implementation Plan

### Phase 1: Core Fix (1-2 hours)
1. ✅ Add `parseJSONField()` utility to API service
2. ✅ Update `getAgentPosts()` to parse engagement data
3. ✅ Update `getFilteredPosts()` to parse engagement data
4. ✅ Update comment counter display in `RealSocialMediaFeed.tsx`
5. ✅ Verify fix with manual testing

### Phase 2: Testing (2-3 hours)
1. ⬜ Write unit tests for JSON parsing
2. ⬜ Write integration tests for comment counter
3. ⬜ Write E2E tests for UI display
4. ⬜ Run full test suite
5. ⬜ Fix any failing tests

### Phase 3: Edge Cases (1 hour)
1. ⬜ Test all edge cases from table above
2. ⬜ Add error logging for parse failures
3. ⬜ Document known limitations

### Phase 4: Documentation (30 minutes)
1. ⬜ Update API documentation
2. ⬜ Update component documentation
3. ⬜ Create troubleshooting guide

---

## 7. Verification Checklist

### Pre-Implementation Verification
- [x] Database triggers working correctly
- [x] Backend API returning correct data
- [x] Root cause identified (frontend mapping)
- [x] Solution approach validated

### Post-Implementation Verification
- [ ] Comment counter displays correctly for all posts
- [ ] New comments increment counter immediately
- [ ] No console errors or warnings
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All E2E tests pass
- [ ] Manual QA approval
- [ ] Performance benchmarks met (<50ms render)

---

## 8. Rollback Plan

**If fix causes issues:**

1. **Immediate Rollback:**
   ```bash
   git revert <commit-hash>
   npm run build
   pm2 restart frontend
   ```

2. **Temporary Workaround:**
   ```typescript
   // Display static "View Comments" text instead of count
   <button>View Comments</button>
   ```

3. **Database Integrity Check:**
   ```sql
   SELECT COUNT(*) FROM agent_posts WHERE engagement IS NULL;
   SELECT COUNT(*) FROM agent_posts WHERE engagement NOT LIKE '%comments%';
   ```

---

## 9. Success Metrics

**Definition of Done:**
- [ ] Comment counters display accurately on 100% of posts
- [ ] Zero console errors related to comment display
- [ ] All automated tests passing
- [ ] Performance regression < 5% (baseline: 120ms post load)
- [ ] User acceptance testing complete
- [ ] Production validation report filed

**KPIs:**
- **Accuracy**: 100% match between DB count and UI display
- **Performance**: < 50ms additional parsing overhead
- **Reliability**: Zero crashes or errors in 1000+ post loads
- **User Satisfaction**: No reported issues for 7 days post-deployment

---

## 10. Dependencies & Constraints

### Dependencies
- **No external dependencies required** - Fix uses existing code
- React 18+ (already installed)
- TypeScript 5+ (already installed)

### Constraints
- **Backward Compatibility**: Must not break existing API consumers
- **Performance**: Cannot add > 100ms to page load time
- **No Database Changes**: Must work with existing schema
- **No Breaking Changes**: Existing tests must continue to pass

---

## 11. Risk Analysis

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Breaking change to API consumers | Low | High | Add parsing at API service level, not API endpoint |
| Performance degradation | Low | Medium | Benchmark before/after, use memoization if needed |
| Edge case bugs | Medium | Low | Comprehensive test coverage for all edge cases |
| WebSocket update conflicts | Low | Medium | Implement optimistic UI with server confirmation |
| JSON parsing exceptions | Low | Low | Try-catch with fallback values |

---

## 12. Future Enhancements (Post-Fix)

### Enhancement 1: Backend JSON Parsing
Move JSON parsing to backend to simplify frontend logic:
```javascript
// api-server/server.js
app.get('/api/v1/agent-posts', (req, res) => {
  const posts = db.prepare('SELECT * FROM agent_posts').all();

  const parsed = posts.map(post => ({
    ...post,
    engagement: JSON.parse(post.engagement || '{}'),
    metadata: JSON.parse(post.metadata || '{}')
  }));

  res.json({ success: true, data: parsed });
});
```

### Enhancement 2: Real-time Counter Animation
Add smooth number transitions when counter updates:
```typescript
import { useSpring, animated } from 'react-spring';

const AnimatedCounter = ({ value }) => {
  const props = useSpring({ number: value, from: { number: 0 } });
  return <animated.span>{props.number.to(n => n.toFixed(0))}</animated.span>;
};
```

### Enhancement 3: Comment Counter Breakdown
Show reply counts separately from root comments:
```typescript
<div className="comment-stats">
  <span>{rootComments} comments</span>
  {replyCount > 0 && <span className="text-gray-500">({replyCount} replies)</span>}
</div>
```

---

## Appendix A: Related Files

### Core Files Modified
- `/workspaces/agent-feed/frontend/src/services/api.ts` - JSON parsing logic
- `/workspaces/agent-feed/frontend/src/components/RealSocialMediaFeed.tsx` - Display logic

### Supporting Files (No Changes)
- `/workspaces/agent-feed/api-server/server.js` - Backend API endpoints
- `/workspaces/agent-feed/api-server/config/database-selector.js` - Database queries
- `/workspaces/agent-feed/api-server/create-comments-table.sql` - Database schema
- `/workspaces/agent-feed/api-server/migrations/005-trigger-comment-activity.sql` - Triggers

### Test Files (To Be Created)
- `/workspaces/agent-feed/frontend/src/services/__tests__/api.test.ts`
- `/workspaces/agent-feed/api-server/tests/integration/comment-counter.test.js`
- `/workspaces/agent-feed/tests/e2e/comment-counter.spec.ts`

---

## Appendix B: SQL Verification Queries

```sql
-- Verify engagement data structure
SELECT id, engagement FROM agent_posts LIMIT 5;

-- Check comment counts match database
SELECT
  p.id,
  json_extract(p.engagement, '$.comments') as engagement_count,
  COUNT(c.id) as actual_count,
  CASE
    WHEN json_extract(p.engagement, '$.comments') = COUNT(c.id) THEN '✅ MATCH'
    ELSE '❌ MISMATCH'
  END as status
FROM agent_posts p
LEFT JOIN comments c ON c.post_id = p.id
GROUP BY p.id;

-- Find posts with mismatched counts
SELECT
  p.id,
  p.title,
  json_extract(p.engagement, '$.comments') as recorded_count,
  COUNT(c.id) as actual_count
FROM agent_posts p
LEFT JOIN comments c ON c.post_id = p.id
GROUP BY p.id
HAVING recorded_count != actual_count;
```

---

## Appendix C: API Response Examples

**Example 1: Post with Comments**
```json
{
  "id": "post-1761317277425",
  "title": "Sample Post",
  "engagement": "{\"comments\":5,\"likes\":10,\"shares\":2,\"views\":50}"
}
```

**Example 2: Post without Comments**
```json
{
  "id": "post-1761288063230",
  "title": "New Post",
  "engagement": "{\"comments\":0,\"likes\":0,\"shares\":0,\"views\":0}"
}
```

**Example 3: Post with Null Engagement**
```json
{
  "id": "post-old-123",
  "title": "Legacy Post",
  "engagement": null
}
```

---

## Document Control

**Version History:**
- v1.0 (2025-10-24): Initial specification - Problem analysis complete
- v1.1 (TBD): Post-implementation updates
- v1.2 (TBD): Production validation results

**Approvals Required:**
- [ ] Technical Lead
- [ ] Frontend Team Lead
- [ ] QA Team Lead
- [ ] Product Owner

**Next Steps:**
1. Review this specification with team
2. Get approval to proceed with implementation
3. Create tickets in issue tracker
4. Assign to frontend developer
5. Schedule implementation sprint

---

**End of Specification Document**
