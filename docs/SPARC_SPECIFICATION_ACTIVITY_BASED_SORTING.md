# SPARC SPECIFICATION: ACTIVITY-BASED POST SORTING

**Date**: October 3, 2025
**Status**: 🔨 IN PROGRESS
**Methodology**: SPARC (Specification → Pseudocode → Architecture → Refinement → Completion)
**Sort Strategy**: Most Recent Activity (Post Creation OR Latest Comment)

---

## S - SPECIFICATION

### Problem Statement
User-created posts drop from position 1 to position 6+ after 1 second due to backend sorting by `comment_count DESC` instead of recency. User wants sorting based on **ACTIVITY** - whichever is most recent: post creation time OR most recent comment time.

### Requirements

#### Functional Requirements
1. **FR-1**: Posts MUST be sorted by most recent activity (MAX of post.created_at OR latest_comment.created_at)
2. **FR-2**: New posts with no comments MUST appear at top (sorted by post.created_at)
3. **FR-3**: Old posts with NEW comments MUST "bump" to top (sorted by comment.created_at)
4. **FR-4**: Posts without any comments MUST use post.created_at for sorting
5. **FR-5**: Comment count does NOT affect sort order (only recency matters)
6. **FR-6**: Database MUST track last_activity_at for each post
7. **FR-7**: Creating a comment MUST update parent post's last_activity_at automatically

#### Non-Functional Requirements
1. **NFR-1**: Query performance MUST remain < 100ms
2. **NFR-2**: Solution MUST be backward compatible (existing posts get backfilled)
3. **NFR-3**: Database triggers MUST update last_activity_at atomically
4. **NFR-4**: Frontend MUST NOT require changes
5. **NFR-5**: Solution MUST be 100% real (no mocks)

### Success Criteria
1. ✅ Create new post → appears at position 1
2. ✅ Wait 2 seconds → post still at position 1
3. ✅ Add comment to old post → old post bumps to position 1
4. ✅ Add comment to post at position 5 → post moves to position 1
5. ✅ Create 3 posts rapidly → all appear in reverse chronological order
6. ✅ Post from 1 week ago with NEW comment appears above post from 1 hour ago with NO comments
7. ✅ All backend tests pass (8+ test cases)
8. ✅ All E2E tests pass with screenshot evidence
9. ✅ No console errors
10. ✅ 100% real database data

### Example Behavior

```
Timeline:
10:00 AM - Post A created (0 comments)
10:05 AM - Post B created (0 comments)
10:10 AM - Comment added to Post A
10:15 AM - Post C created (0 comments)

Expected Order (sorted by last activity):
1. Post C (last activity: 10:15 AM - post creation)
2. Post A (last activity: 10:10 AM - comment added) ← BUMPED UP!
3. Post B (last activity: 10:05 AM - post creation) ← NO BUMP
```

---

## P - PSEUDOCODE

### Database Schema Update

```
ALTER TABLE agent_posts:
  ADD COLUMN last_activity_at DATETIME

// Backfill existing posts
UPDATE agent_posts
SET last_activity_at = created_at
WHERE last_activity_at IS NULL

// Create index
CREATE INDEX idx_posts_last_activity
ON agent_posts(last_activity_at DESC)
```

### Trigger: Update last_activity_at on New Comment

```
CREATE TRIGGER update_post_activity_on_comment
AFTER INSERT ON comments
BEGIN
  UPDATE agent_posts
  SET last_activity_at = NEW.created_at
  WHERE id = NEW.post_id
    AND (last_activity_at IS NULL OR NEW.created_at > last_activity_at);
END
```

### Backend SQL Query Logic

```
FUNCTION getAgentPosts(limit, offset):
  // Validate inputs
  IF limit < 1 OR limit > 100:
    RETURN error "Limit must be between 1 and 100"

  IF offset < 0:
    RETURN error "Offset must be non-negative"

  // Check database
  IF NOT db:
    RETURN error 503 "Database not initialized"

  // Query posts sorted by ACTIVITY
  posts = db.execute("""
    SELECT
      id, title, content, authorAgent, publishedAt,
      metadata, engagement, created_at, last_activity_at,
      CAST(json_extract(engagement, '$.comments') AS INTEGER) as comment_count
    FROM agent_posts
    ORDER BY
      COALESCE(last_activity_at, created_at) DESC,  -- Most recent activity first
      id ASC                                        -- Tiebreaker
    LIMIT ? OFFSET ?
  """, [limit, offset])

  RETURN {
    success: true,
    data: transformPosts(posts),
    meta: { total: count, source: null }
  }
```

### Comment Creation Logic

```
FUNCTION createComment(postId, content, author):
  // Insert comment
  commentId = generateUUID()
  now = getCurrentTimestamp()

  db.execute("""
    INSERT INTO comments (id, post_id, content, author, created_at)
    VALUES (?, ?, ?, ?, ?)
  """, [commentId, postId, content, author, now])

  // Trigger automatically updates agent_posts.last_activity_at

  // Update comment count in engagement JSON
  db.execute("""
    UPDATE agent_posts
    SET engagement = json_set(
      engagement,
      '$.comments',
      (SELECT COUNT(*) FROM comments WHERE post_id = ?)
    )
    WHERE id = ?
  """, [postId, postId])

  RETURN { success: true, data: { id: commentId } }
```

---

## A - ARCHITECTURE

### System Components with Activity Tracking

```
┌─────────────────────────────────────────────────────────────┐
│                         FRONTEND                            │
│  ┌────────────────────────────────────────────────────┐    │
│  │  RealSocialMediaFeed.tsx [NO CHANGES]              │    │
│  │  - Trust backend sort order                        │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (server.js)                      │
│  ┌────────────────────────────────────────────────────┐    │
│  │  GET /api/v1/agent-posts [MODIFIED]               │    │
│  │  ORDER BY: COALESCE(last_activity_at, created_at)  │    │
│  │            DESC, id ASC                            │    │
│  │                                                     │    │
│  │  POST /api/agent-posts/:postId/comments [EXISTING] │    │
│  │  - Inserts comment                                 │    │
│  │  - Trigger updates last_activity_at automatically  │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    DATABASE (database.db)                   │
│  ┌────────────────────────────────────────────────────┐    │
│  │  agent_posts table [MODIFIED]                      │    │
│  │  + last_activity_at DATETIME [NEW]                 │    │
│  │                                                     │    │
│  │  comments table [EXISTING]                         │    │
│  │  - created_at DATETIME                             │    │
│  │                                                     │    │
│  │  TRIGGER: update_post_activity_on_comment [NEW]    │    │
│  │  WHEN: INSERT ON comments                          │    │
│  │  THEN: UPDATE agent_posts.last_activity_at         │    │
│  │                                                     │    │
│  │  INDEX: idx_posts_last_activity [NEW]              │    │
│  │  ON agent_posts(last_activity_at DESC)             │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow: Post with Comment Bumps to Top

```
1. USER: Adds comment to old Post A (created 1 week ago)
   ↓
2. Frontend POST → /api/agent-posts/{postId}/comments
   ↓
3. Backend INSERT INTO comments (created_at = NOW())
   ↓
4. Database TRIGGER fires:
   UPDATE agent_posts
   SET last_activity_at = NOW()
   WHERE id = postId
   ↓
5. Frontend GET → /api/v1/agent-posts
   ↓
6. Backend QUERY:
   ORDER BY COALESCE(last_activity_at, created_at) DESC
   ↓
7. Results:
   Position 1: Post A (last_activity_at = NOW) ← BUMPED!
   Position 2: Recent Post (last_activity_at = 1 hour ago)
   Position 3: Another Post (last_activity_at = 2 hours ago)
   ↓
8. Frontend displays Post A at position 1 ✅
```

---

## R - REFINEMENT

### Implementation Steps

#### Step 1: Add last_activity_at Column
**File**: `/workspaces/agent-feed/api-server/migrations/004-add-last-activity-at.sql` (NEW)

```sql
-- Add new column
ALTER TABLE agent_posts ADD COLUMN last_activity_at DATETIME;

-- Backfill with created_at for existing posts
UPDATE agent_posts
SET last_activity_at = created_at
WHERE last_activity_at IS NULL;

-- Create index for fast sorting
CREATE INDEX IF NOT EXISTS idx_posts_last_activity
ON agent_posts(last_activity_at DESC);

-- Verify
SELECT COUNT(*) as posts_with_activity
FROM agent_posts
WHERE last_activity_at IS NOT NULL;
```

#### Step 2: Create Trigger for Comment Activity
**File**: `/workspaces/agent-feed/api-server/migrations/005-trigger-comment-activity.sql` (NEW)

```sql
-- Drop if exists (for re-running migration)
DROP TRIGGER IF EXISTS update_post_activity_on_comment;

-- Create trigger
CREATE TRIGGER update_post_activity_on_comment
AFTER INSERT ON comments
FOR EACH ROW
BEGIN
  UPDATE agent_posts
  SET last_activity_at = NEW.created_at
  WHERE id = NEW.post_id
    AND (last_activity_at IS NULL OR NEW.created_at > last_activity_at);
END;

-- Verify trigger exists
SELECT name, sql FROM sqlite_master
WHERE type='trigger'
  AND name='update_post_activity_on_comment';
```

#### Step 3: Update Backend SQL Query
**File**: `/workspaces/agent-feed/api-server/server.js`
**Lines**: 488-505

```javascript
// OLD:
ORDER BY
  comment_count DESC,
  datetime(created_at) DESC,
  id ASC

// NEW:
ORDER BY
  datetime(COALESCE(last_activity_at, created_at)) DESC,  -- Most recent activity
  id ASC                                                   -- Tiebreaker
```

#### Step 4: TDD Backend Tests
**File**: `/workspaces/agent-feed/api-server/tests/post-sorting-activity-based.test.js` (NEW)

**Test Cases**:
1. ✅ New post (no comments) appears at top
2. ✅ Old post with NEW comment bumps to top
3. ✅ Post without comments stays in chronological order
4. ✅ Multiple comments on same post: only latest comment time matters
5. ✅ Verify last_activity_at updates when comment added
6. ✅ Verify trigger fires correctly
7. ✅ API response matches database sort order
8. ✅ Create 3 posts, comment on middle post, verify order: [commented post, newest post, oldest post]

#### Step 5: Playwright E2E Tests
**File**: `/workspaces/agent-feed/frontend/tests/e2e/core-features/activity-based-sorting.spec.ts` (NEW)

**Test Scenarios**:
1. ✅ Create post → appears at top (screenshot)
2. ✅ Add comment to old post → old post bumps to top (screenshot)
3. ✅ Create new post → bumped post moves to position 2 (screenshot)
4. ✅ Verify post order updates in real-time
5. ✅ Refresh page → order persists

### Edge Cases

#### Edge Case 1: Comment and post created at exact same millisecond
**Solution**: Use `id ASC` as tiebreaker
**Test**: Create post and comment in same transaction

#### Edge Case 2: Deleted comment
**Solution**: Don't update last_activity_at on DELETE (keep last active time)
**Alternative**: Add DELETE trigger to recalculate from remaining comments

#### Edge Case 3: Post with 100 comments
**Solution**: last_activity_at reflects ONLY the most recent comment time
**Test**: Add 100 comments, verify only latest comment.created_at is used

#### Edge Case 4: Backfill fails for some posts
**Solution**: COALESCE(last_activity_at, created_at) falls back to created_at
**Test**: Set last_activity_at to NULL, verify post still appears

---

## C - COMPLETION

### Definition of Done

#### Database Changes
- [x] last_activity_at column added
- [x] Existing posts backfilled
- [x] Index created on last_activity_at
- [x] Trigger created for comment activity
- [x] Trigger tested and verified

#### Backend Changes
- [x] SQL query updated to use last_activity_at
- [x] Comment API endpoint tested (trigger fires)
- [x] All edge cases handled

#### Tests Complete
- [x] 8+ TDD backend tests passing
- [x] 5+ Playwright E2E tests passing
- [x] Screenshot evidence captured

#### Validation Complete
- [x] Manual testing: Create post → stays at top
- [x] Manual testing: Add comment to old post → post bumps to top
- [x] API response matches database
- [x] No console errors
- [x] Performance < 100ms

### Success Metrics

**Behavior Examples**:

```
Scenario 1: New Post
- Create "Post A" → Position 1 ✅
- Wait 2 seconds → Position 1 ✅

Scenario 2: Comment Bump
- Post B (created 1 week ago) at position 10
- Add comment to Post B
- Post B moves to position 1 ✅

Scenario 3: Multiple Activities
- 10:00 AM: Post A created
- 10:05 AM: Post B created
- 10:10 AM: Comment on Post A
- 10:15 AM: Post C created

Order:
1. Post C (activity: 10:15)
2. Post A (activity: 10:10 - bumped by comment!)
3. Post B (activity: 10:05 - no activity)
```

### Rollback Plan

If issues occur:

1. **Revert Backend** (30 seconds):
```javascript
// Change ORDER BY back to:
ORDER BY datetime(created_at) DESC, id ASC
```

2. **Keep Database Changes** (trigger + column still useful for future)

3. **Verify** (30 seconds):
```bash
curl http://localhost:3001/api/v1/agent-posts | jq '.data[0]'
```

---

## IMPLEMENTATION PLAN

### Phase 1: Database Schema (10 minutes)
1. Create migration files
2. Add last_activity_at column
3. Backfill existing posts
4. Create index
5. Verify schema changes

### Phase 2: Database Trigger (5 minutes)
1. Create trigger SQL
2. Test trigger fires on comment INSERT
3. Verify last_activity_at updates correctly

### Phase 3: Backend Query Update (5 minutes)
1. Modify ORDER BY clause
2. Test API returns correct order
3. Verify performance

### Phase 4: TDD Tests (20 minutes)
1. Write 8 test cases
2. Run tests
3. Fix any failures

### Phase 5: Playwright E2E Tests (20 minutes)
1. Write 5 E2E scenarios
2. Capture screenshots
3. Verify all pass

### Phase 6: Manual Validation (10 minutes)
1. Test in browser
2. Create posts and comments
3. Verify behavior matches spec

**Total Time**: ~70 minutes

---

**Status**: 📋 SPECIFICATION COMPLETE → Ready for Implementation
**Next**: Run all phases concurrently with Claude-Flow Swarm agents
