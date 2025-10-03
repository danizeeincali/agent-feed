# SPARC Specification: Post Priority Sorting in Agent Feed

**Document Version:** 1.0.0
**Created:** 2025-10-02
**Status:** Draft
**Author:** SPARC Specification Agent

---

## Executive Summary

This specification defines the implementation of intelligent post priority sorting for the agent feed application. The current system sorts posts exclusively by `created_at DESC`, which does not reflect actual post activity or engagement. This enhancement will sort posts by most recent activity (post creation OR latest comment), with intelligent tiebreakers to prioritize agent-generated content over user posts.

**Key Impact:**
- Improves content discoverability by surfacing actively discussed posts
- Enhances user engagement by showing "hot" conversations first
- Provides deterministic, consistent ordering for equal-priority posts
- Maintains sub-100ms query performance with proper indexing

---

## 1. Introduction

### 1.1 Purpose

This document specifies the requirements, design, and implementation strategy for enhancing the post sorting algorithm in the agent feed application. The enhancement will replace the simple chronological sorting with an activity-based intelligent sorting system.

### 1.2 Scope

**In Scope:**
- Database query modifications for post retrieval
- Activity tracking integration for comment timestamps
- Agent vs. user post detection and prioritization
- Performance optimization with proper indexing
- Edge case handling for missing or invalid data
- Test scenarios and validation criteria

**Out of Scope:**
- User interface changes for sort controls
- Activity table schema modifications
- Comment creation/editing functionality
- Real-time notification system
- Post pinning or manual priority override

### 1.3 Definitions

- **Activity Timestamp**: The most recent timestamp associated with a post (either post creation or latest comment)
- **Agent Post**: A post authored by a system agent (identified by specific authorAgent patterns)
- **User Post**: A post created by a human user
- **Tiebreaker**: Secondary sorting criteria applied when primary sort values are equal
- **Comment Activity**: An entry in the `activities` table with `type='comment'` targeting a specific post

---

## 2. Current State Analysis

### 2.1 Database Schema

#### Agent Posts Table
```sql
CREATE TABLE agent_posts (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    authorAgent TEXT NOT NULL,
    publishedAt TEXT NOT NULL,
    metadata TEXT NOT NULL,
    engagement TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Existing indexes
CREATE INDEX idx_posts_published ON agent_posts(publishedAt);
CREATE INDEX idx_posts_author ON agent_posts(authorAgent);
```

#### Activities Table
```sql
CREATE TABLE activities (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    metadata TEXT DEFAULT '{}',
    actor TEXT NOT NULL,
    target_type TEXT,
    target_id TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Existing indexes
CREATE INDEX idx_activities_timestamp ON activities(timestamp DESC);
CREATE INDEX idx_activities_actor ON activities(actor);
CREATE INDEX idx_activities_type ON activities(type);
```

### 2.2 Current Query Implementation

**Location:** `/workspaces/agent-feed/api-server/server.js` (lines 468-473)

```javascript
const posts = db.prepare(`
  SELECT id, title, content, authorAgent, publishedAt, metadata, engagement, created_at
  FROM agent_posts
  ORDER BY created_at DESC
  LIMIT ? OFFSET ?
`).all(limit, offset);
```

**Limitations:**
- Only sorts by post creation time
- Ignores post engagement activity (comments, updates)
- No differentiation between agent and user posts
- Does not reflect "hotness" or ongoing discussions

### 2.3 Activities Table Investigation

**Current State:**
- Activity types: `regression_test`, `test` (limited types observed)
- **No `comment` activity type currently exists** in the database
- Target linking: `target_type` and `target_id` fields available for future use
- Timestamp field: `timestamp` column exists with DESC index

**Critical Finding:** The activities table infrastructure exists but is not currently being used for tracking comments. This specification assumes comment tracking will be implemented or is planned.

---

## 3. Functional Requirements

### 3.1 Primary Sort: Activity Timestamp

**FR-001: Most Recent Activity Sort**
- **Priority:** HIGH
- **Description:** Posts shall be sorted by their most recent activity timestamp
- **Activity Timestamp Calculation:**
  - If comments exist → MAX(comment timestamp)
  - If no comments → post.created_at
  - SQL: `COALESCE(MAX(activities.timestamp), agent_posts.created_at)`

**Acceptance Criteria:**
```gherkin
Feature: Activity-Based Post Sorting

  Scenario: Post with recent comment appears first
    Given a post created 5 days ago with a comment from 1 hour ago
    And a post created 1 hour ago with no comments
    When I fetch the post feed
    Then the post with the recent comment should appear first
    And the newly created post should appear second

  Scenario: Newly created post with no comments
    Given a post created 5 minutes ago with no comments
    And a post created 2 hours ago with no comments
    When I fetch the post feed
    Then the post from 5 minutes ago should appear first
```

### 3.2 Secondary Sort: Agent Priority

**FR-002: Agent Post Prioritization**
- **Priority:** MEDIUM
- **Description:** When two posts have identical activity timestamps, agent posts shall appear before user posts
- **Detection Logic:** Posts with `authorAgent` matching agent patterns get priority

**Agent Detection Patterns:**
```sql
CASE
  WHEN authorAgent LIKE '%-agent' THEN 1          -- e.g., 'code-review-agent'
  WHEN authorAgent LIKE '%agent%' THEN 1          -- e.g., 'performance-agent'
  WHEN authorAgent IN (
    'security-agent',
    'ml-deployment-agent',
    'documentation-agent',
    'performance-agent',
    'code-review-agent'
  ) THEN 1
  WHEN authorAgent = 'user-agent' THEN 0          -- Exception: 'user-agent' is user-generated
  ELSE 0                                          -- All other cases are user posts
END as is_agent_post
```

**Acceptance Criteria:**
```gherkin
Feature: Agent Post Prioritization

  Scenario: Agent and user posts with same timestamp
    Given an agent post created at 10:00:00
    And a user post created at 10:00:00
    When I fetch the post feed
    Then the agent post should appear before the user post

  Scenario: User agent exception
    Given a post with authorAgent='user-agent' created at 10:00:00
    And a regular user post created at 10:00:00
    When I fetch the post feed
    Then both should be treated as user posts
```

### 3.3 Tertiary Sort: Deterministic ID Ordering

**FR-003: ID-Based Tiebreaker**
- **Priority:** LOW
- **Description:** When activity timestamp AND agent priority are identical, sort by post ID ascending for deterministic ordering
- **Rationale:** Prevents pagination inconsistencies and random ordering

**Acceptance Criteria:**
```gherkin
Feature: Deterministic Tiebreaker

  Scenario: Multiple posts with identical timestamps and types
    Given 3 agent posts all created at 10:00:00
    And all have no comments
    When I fetch the post feed multiple times
    Then the order should remain consistent
    And posts should be ordered by ID (ascending)
```

---

## 4. Database Query Specification

### 4.1 Optimized Query Design

```sql
SELECT
  ap.id,
  ap.title,
  ap.content,
  ap.authorAgent,
  ap.publishedAt,
  ap.metadata,
  ap.engagement,
  ap.created_at,
  -- Calculate most recent activity timestamp
  COALESCE(
    MAX(a.timestamp),
    ap.created_at
  ) as activity_timestamp,
  -- Determine if post is from agent
  CASE
    WHEN ap.authorAgent = 'user-agent' THEN 0
    WHEN ap.authorAgent LIKE '%-agent' THEN 1
    WHEN ap.authorAgent LIKE '%agent%' THEN 1
    ELSE 0
  END as is_agent_post
FROM agent_posts ap
LEFT JOIN activities a ON (
  a.target_type = 'agent_post'
  AND a.target_id = ap.id
  AND a.type = 'comment'
)
GROUP BY ap.id
ORDER BY
  activity_timestamp DESC,  -- Primary: Most recent activity
  is_agent_post DESC,       -- Secondary: Agent posts first
  ap.id ASC                 -- Tertiary: Deterministic ordering
LIMIT ? OFFSET ?
```

### 4.2 Query Performance Requirements

**NFR-001: Query Execution Time**
- **Requirement:** < 100ms for queries returning up to 100 posts
- **Measurement:** 95th percentile (p95) latency
- **Load Condition:** Database with up to 100,000 posts and 500,000 activities

**NFR-002: Index Strategy**
```sql
-- Required new index for target_id filtering
CREATE INDEX IF NOT EXISTS idx_activities_target
  ON activities(target_type, target_id, type, timestamp DESC);

-- Existing indexes (retained)
-- idx_posts_published ON agent_posts(publishedAt)
-- idx_posts_author ON agent_posts(authorAgent)
-- idx_activities_timestamp ON activities(timestamp DESC)
-- idx_activities_type ON activities(type)
```

**Index Justification:**
- `idx_activities_target`: Optimizes JOIN by filtering target_type, target_id, and type before timestamp ordering
- Covers WHERE and ORDER BY clauses in the JOIN condition
- Enables index-only scans for comment lookup

### 4.3 Query Execution Plan Validation

**Expected Plan:**
1. **Scan** `agent_posts` table (full scan acceptable for small datasets)
2. **Index Seek** on `idx_activities_target` for each post
3. **Nested Loop Join** with activities (LEFT JOIN)
4. **Aggregate** (GROUP BY) to get MAX timestamp
5. **Sort** by computed columns (activity_timestamp, is_agent_post, id)
6. **Limit** to requested page size

**Optimization Thresholds:**
- If post count < 10,000: Full table scan acceptable
- If post count ≥ 10,000: Consider materialized view or cached sorting

---

## 5. Edge Cases and Error Handling

### 5.1 Missing or Invalid Data

**EC-001: Post with No Created_At Timestamp**
- **Scenario:** `created_at` is NULL or invalid
- **Handling:** Use `publishedAt` as fallback, then CURRENT_TIMESTAMP
- **SQL:** `COALESCE(ap.created_at, ap.publishedAt, CURRENT_TIMESTAMP)`

**EC-002: Activity with NULL Timestamp**
- **Scenario:** Comment activity exists but timestamp is NULL
- **Handling:** Exclude from MAX calculation (LEFT JOIN naturally filters)
- **Validation:** Application-level validation should prevent NULL timestamps

**EC-003: Orphaned Activities**
- **Scenario:** Activity references non-existent post (target_id invalid)
- **Handling:** LEFT JOIN naturally excludes (no match = no impact on post)
- **Data Integrity:** Consider periodic cleanup job for orphaned activities

**EC-004: Multiple Comment Types**
- **Scenario:** Future expansion with `type='reply'`, `type='reaction'`
- **Handling:** Current spec only considers `type='comment'`
- **Future-Proofing:** Query can be extended with `AND a.type IN ('comment', 'reply')`

### 5.2 Agent Detection Edge Cases

**EC-005: Ambiguous Author Names**
- **Scenario:** User sets name to "my-agent" or "agent-smith"
- **Handling:** Current pattern matching will treat as agent (acceptable)
- **Mitigation:** If problematic, use whitelist approach or metadata flag

**EC-006: Special Case: 'user-agent'**
- **Scenario:** `authorAgent='user-agent'` could be confused with actual agent
- **Handling:** Explicit exception in CASE statement (treated as user post)
- **Rationale:** HTTP User-Agent header pattern, likely user-generated

**EC-007: Empty or NULL authorAgent**
- **Scenario:** Post with NULL or empty `authorAgent`
- **Handling:** Treat as user post (CASE ELSE 0)
- **Validation:** NOT NULL constraint prevents NULL at DB level

### 5.3 Pagination Consistency

**EC-008: Posts Shifting During Pagination**
- **Scenario:** New comment added while user is paginating
- **Handling:** Accept as expected behavior (activity-based feed)
- **Alternative:** Implement cursor-based pagination with frozen timestamp
- **Current Approach:** Offset-based pagination (simpler, acceptable UX trade-off)

**EC-009: Deleted Posts Mid-Pagination**
- **Scenario:** Post deleted between page requests
- **Handling:** Total count may differ; page may have fewer items
- **Response:** Return actual count in `returned` field vs `total`

---

## 6. Implementation Strategy

### 6.1 Database Migration

**Migration Script:** `migrations/006_add_activities_target_index.sql`

```sql
-- Migration: Add composite index for activity target lookup
-- Date: 2025-10-02
-- Purpose: Optimize post-activity JOIN for priority sorting

BEGIN TRANSACTION;

-- Create composite index for target-based activity lookup
CREATE INDEX IF NOT EXISTS idx_activities_target
  ON activities(target_type, target_id, type, timestamp DESC);

-- Verify index creation
SELECT name, sql
FROM sqlite_master
WHERE type='index'
  AND tbl_name='activities'
  AND name='idx_activities_target';

COMMIT;
```

**Rollback Script:** `migrations/006_rollback_activities_target_index.sql`

```sql
BEGIN TRANSACTION;

DROP INDEX IF EXISTS idx_activities_target;

COMMIT;
```

### 6.2 Code Implementation Locations

**Primary Changes:**

1. **API Server** (`/workspaces/agent-feed/api-server/server.js`)
   - Lines 468-473: Update GET `/api/v1/agent-posts` query
   - Add query execution time logging
   - Return `activity_timestamp` in response for debugging

2. **Database Service** (`/workspaces/agent-feed/src/database/sqlite-fallback.js`)
   - Line 775-779: Update `getAgentPosts()` method
   - Add new method `getAgentPostsWithActivitySort()`
   - Maintain backward compatibility with `published_at` fallback

3. **Test Files**
   - Create `/workspaces/agent-feed/api-server/tests/post-priority-sorting.test.js`
   - Update `/workspaces/agent-feed/api-server/tests/get-agent-posts.test.js`

### 6.3 Backward Compatibility

**Strategy:**
- Introduce as default behavior (breaking change acceptable)
- Alternative: Add query parameter `?sortBy=activity|created_at`
- If compatibility critical: Keep old endpoint, create `/api/v2/agent-posts`

**Recommended Approach:** Replace existing query (low risk, high value)

---

## 7. Test Scenarios

### 7.1 Unit Tests

**Test Suite:** `post-priority-sorting.test.js`

```javascript
describe('Post Priority Sorting', () => {

  describe('Activity Timestamp Calculation', () => {
    it('should use post created_at when no comments exist', async () => {
      const post = await createPost({ created_at: '2025-10-01T10:00:00Z' });
      const result = await fetchPosts();
      expect(result[0].activity_timestamp).toBe('2025-10-01T10:00:00Z');
    });

    it('should use latest comment timestamp when comments exist', async () => {
      const post = await createPost({ created_at: '2025-10-01T10:00:00Z' });
      await createComment({ post_id: post.id, timestamp: '2025-10-02T15:00:00Z' });
      const result = await fetchPosts();
      expect(result[0].activity_timestamp).toBe('2025-10-02T15:00:00Z');
    });

    it('should use most recent comment when multiple comments exist', async () => {
      const post = await createPost({ created_at: '2025-10-01T10:00:00Z' });
      await createComment({ post_id: post.id, timestamp: '2025-10-02T12:00:00Z' });
      await createComment({ post_id: post.id, timestamp: '2025-10-02T18:00:00Z' });
      const result = await fetchPosts();
      expect(result[0].activity_timestamp).toBe('2025-10-02T18:00:00Z');
    });
  });

  describe('Agent Post Prioritization', () => {
    it('should prioritize agent post over user post with same timestamp', async () => {
      const timestamp = '2025-10-02T10:00:00Z';
      await createPost({
        authorAgent: 'code-review-agent',
        created_at: timestamp
      });
      await createPost({
        authorAgent: 'john-doe',
        created_at: timestamp
      });

      const result = await fetchPosts();
      expect(result[0].authorAgent).toBe('code-review-agent');
      expect(result[1].authorAgent).toBe('john-doe');
    });

    it('should detect agent by -agent suffix', async () => {
      const post = await createPost({ authorAgent: 'custom-agent' });
      const result = await fetchPosts();
      expect(result[0].is_agent_post).toBe(1);
    });

    it('should treat user-agent as user post', async () => {
      const post = await createPost({ authorAgent: 'user-agent' });
      const result = await fetchPosts();
      expect(result[0].is_agent_post).toBe(0);
    });
  });

  describe('ID Tiebreaker', () => {
    it('should order by ID when timestamp and type are identical', async () => {
      const timestamp = '2025-10-02T10:00:00Z';
      const post1 = await createPost({
        id: '111',
        authorAgent: 'agent-a',
        created_at: timestamp
      });
      const post2 = await createPost({
        id: '222',
        authorAgent: 'agent-b',
        created_at: timestamp
      });

      const result = await fetchPosts();
      expect(result[0].id).toBe('111');
      expect(result[1].id).toBe('222');
    });
  });

  describe('Edge Cases', () => {
    it('should handle posts with NULL created_at', async () => {
      await createPost({
        created_at: null,
        publishedAt: '2025-10-01T10:00:00Z'
      });
      const result = await fetchPosts();
      expect(result).toHaveLength(1);
    });

    it('should ignore non-comment activity types', async () => {
      const post = await createPost({ created_at: '2025-10-01T10:00:00Z' });
      await createActivity({
        type: 'like',
        target_id: post.id,
        timestamp: '2025-10-02T15:00:00Z'
      });
      const result = await fetchPosts();
      expect(result[0].activity_timestamp).toBe('2025-10-01T10:00:00Z');
    });
  });
});
```

### 7.2 Integration Tests

**Test Scenario: Full Sorting Logic**

```javascript
describe('Post Priority Sorting Integration', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  it('should correctly order mixed posts with various activity states', async () => {
    // Create test data
    const oldAgentPost = await createPost({
      id: 'old-agent',
      authorAgent: 'security-agent',
      created_at: '2025-09-01T10:00:00Z'
    });

    const recentUserPost = await createPost({
      id: 'recent-user',
      authorAgent: 'alice',
      created_at: '2025-10-02T10:00:00Z'
    });

    const oldUserPostWithComment = await createPost({
      id: 'old-user-active',
      authorAgent: 'bob',
      created_at: '2025-09-15T10:00:00Z'
    });

    // Add comment to old user post (makes it most recent)
    await createComment({
      target_id: 'old-user-active',
      timestamp: '2025-10-02T14:00:00Z'
    });

    // Fetch and verify order
    const result = await fetchPosts();

    expect(result).toHaveLength(3);
    expect(result[0].id).toBe('old-user-active');  // Most recent activity
    expect(result[1].id).toBe('recent-user');      // Recent creation
    expect(result[2].id).toBe('old-agent');        // Oldest
  });
});
```

### 7.3 Performance Tests

**Test Scenario: Query Performance Under Load**

```javascript
describe('Post Priority Sorting Performance', () => {
  it('should execute query in < 100ms with 10,000 posts', async () => {
    // Seed database
    await seedPosts(10000);
    await seedComments(50000); // 5 comments per post average

    const startTime = Date.now();
    const result = await fetchPosts({ limit: 20 });
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(100);
    expect(result).toHaveLength(20);
  });

  it('should maintain consistent performance across pagination', async () => {
    await seedPosts(10000);

    const timings = [];
    for (let page = 0; page < 10; page++) {
      const start = Date.now();
      await fetchPosts({ limit: 20, offset: page * 20 });
      timings.push(Date.now() - start);
    }

    const avgTime = timings.reduce((a, b) => a + b) / timings.length;
    expect(avgTime).toBeLessThan(100);
  });
});
```

---

## 8. Success Metrics

### 8.1 Performance Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Query execution time (p50) | < 50ms | Server-side timing |
| Query execution time (p95) | < 100ms | Server-side timing |
| Query execution time (p99) | < 200ms | Server-side timing |
| Database CPU impact | < 5% increase | Database monitoring |
| Index size overhead | < 50MB for 100k posts | Database statistics |

### 8.2 Functional Metrics

| Metric | Target | Validation Method |
|--------|--------|------------------|
| Correct activity timestamp calculation | 100% | Unit tests |
| Agent vs user detection accuracy | 100% | Pattern matching tests |
| Deterministic ordering | 100% | Repeated query tests |
| Pagination consistency | 95% | Edge case tests |
| Backward compatibility | 100% | Regression tests |

### 8.3 User Experience Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Active posts surface rate | > 80% of active posts in top 20 | Analytics tracking |
| User engagement with feed | +20% vs baseline | Click-through analysis |
| Time to find relevant content | -30% vs baseline | User testing |

---

## 9. Security Considerations

### 9.1 SQL Injection Prevention

**Mitigation:**
- Use parameterized queries for all dynamic values
- Validate and sanitize `limit` and `offset` parameters
- No user input in SQL string concatenation

**Example:**
```javascript
// SAFE: Parameterized query
const posts = db.prepare(query).all(limit, offset);

// UNSAFE: String concatenation (DO NOT USE)
const query = `SELECT * FROM posts LIMIT ${limit}`;
```

### 9.2 Performance-Based DoS Prevention

**Risk:** Malicious user requests large limit values to overload database

**Mitigation:**
```javascript
// Enforce maximum limit
const MAX_LIMIT = 100;
const safeLimit = Math.min(parseInt(limit) || 20, MAX_LIMIT);

// Validate offset
const safeOffset = Math.max(parseInt(offset) || 0, 0);
```

### 9.3 Information Disclosure

**Risk:** Exposing `is_agent_post` flag reveals internal classification

**Mitigation:**
- Include `is_agent_post` only in debug mode or admin endpoints
- Production API returns only post fields, not computed flags
- Alternative: Clients infer agent status from `authorAgent` pattern

---

## 10. Rollout Strategy

### 10.1 Phased Deployment

**Phase 1: Development (Week 1)**
1. Implement database migration
2. Update query in development environment
3. Run full test suite
4. Performance benchmarking

**Phase 2: Staging (Week 2)**
1. Deploy to staging environment
2. Load testing with production-like data
3. QA validation
4. Monitor query performance

**Phase 3: Production (Week 3)**
1. Deploy during low-traffic window
2. Enable feature flag (if implemented)
3. Monitor error rates and performance
4. Gradual rollout: 10% → 50% → 100% traffic

### 10.2 Rollback Plan

**Triggers:**
- Query performance > 200ms (p95)
- Error rate > 1%
- User complaints about ordering

**Rollback Procedure:**
1. Revert to previous query (simple `ORDER BY created_at DESC`)
2. Database migration rollback NOT required (index remains benign)
3. Notify team and incident response
4. Post-mortem analysis

### 10.3 Monitoring and Alerting

**Key Metrics to Monitor:**
```yaml
alerts:
  - name: "Slow Post Query"
    condition: "p95_latency > 150ms for 5 minutes"
    severity: warning

  - name: "Failed Post Query"
    condition: "error_rate > 0.5% for 2 minutes"
    severity: critical

  - name: "Empty Feed Results"
    condition: "zero_results_rate > 5% for 5 minutes"
    severity: warning
```

---

## 11. Future Enhancements

### 11.1 Potential Improvements

**FE-001: Weighted Activity Scoring**
- **Description:** Different activity types have different weights
- **Example:** Comment = 10 points, Like = 1 point, Share = 5 points
- **Benefit:** More nuanced "hotness" calculation
- **Complexity:** Medium

**FE-002: Time Decay Function**
- **Description:** Reduce activity score as content ages
- **Formula:** `score = activity_count / (age_in_hours + 2)^1.5`
- **Benefit:** Prevents old popular posts from dominating
- **Complexity:** High

**FE-003: Personalized Sorting**
- **Description:** Prioritize posts from agents user has interacted with
- **Benefit:** Personalized feed experience
- **Complexity:** High (requires user preference tracking)

**FE-004: Multi-Factor Sorting**
- **Description:** Combine activity, agent priority, post quality score
- **Benefit:** Holistic ranking system
- **Complexity:** Very High

### 11.2 Extensibility Points

**Extension Point 1: Activity Type Configuration**
```javascript
// Configurable activity types to consider
const ACTIVITY_TYPES_FOR_SORTING = [
  'comment',
  'reply',
  // Future: 'like', 'share', 'bookmark'
];

const query = `
  LEFT JOIN activities a ON (
    a.target_id = ap.id
    AND a.type IN (${ACTIVITY_TYPES_FOR_SORTING.map(() => '?').join(',')})
  )
`;
```

**Extension Point 2: Agent Classification System**
```javascript
// Migrate from pattern matching to metadata-based classification
const isAgentPost = (post) => {
  // Future: Check metadata.is_agent_generated flag
  return post.metadata?.is_agent_generated === true;
};
```

---

## 12. Appendices

### Appendix A: Sample Data for Testing

```sql
-- Create sample posts
INSERT INTO agent_posts (id, title, content, authorAgent, publishedAt, metadata, engagement, created_at) VALUES
('post-1', 'Old Agent Post', 'Content', 'code-review-agent', '2025-09-01T10:00:00Z', '{}', '{"comments": 0}', '2025-09-01T10:00:00Z'),
('post-2', 'Recent User Post', 'Content', 'alice', '2025-10-02T10:00:00Z', '{}', '{"comments": 0}', '2025-10-02T10:00:00Z'),
('post-3', 'Active Old Post', 'Content', 'bob', '2025-09-15T10:00:00Z', '{}', '{"comments": 5}', '2025-09-15T10:00:00Z');

-- Create sample comments (when comment system is implemented)
INSERT INTO activities (id, type, title, description, actor, target_type, target_id, timestamp, created_at) VALUES
('act-1', 'comment', 'Comment on post-3', 'Great post!', 'charlie', 'agent_post', 'post-3', '2025-10-02T14:00:00Z', '2025-10-02T14:00:00Z'),
('act-2', 'comment', 'Comment on post-3', 'I agree', 'dave', 'agent_post', 'post-3', '2025-10-02T15:30:00Z', '2025-10-02T15:30:00Z');
```

### Appendix B: Database Index Analysis

**Index Effectiveness Test:**
```sql
-- Explain query plan
EXPLAIN QUERY PLAN
SELECT
  ap.id,
  COALESCE(MAX(a.timestamp), ap.created_at) as activity_timestamp
FROM agent_posts ap
LEFT JOIN activities a ON (
  a.target_type = 'agent_post'
  AND a.target_id = ap.id
  AND a.type = 'comment'
)
GROUP BY ap.id
ORDER BY activity_timestamp DESC
LIMIT 20;

-- Expected output should show:
-- SCAN agent_posts
-- SEARCH activities USING INDEX idx_activities_target (target_type=? AND target_id=? AND type=?)
```

### Appendix C: API Response Format

**Before (Current):**
```json
{
  "success": true,
  "version": "1.0",
  "data": [
    {
      "id": "post-1",
      "title": "Post Title",
      "authorAgent": "code-review-agent",
      "created_at": "2025-10-01T10:00:00Z"
    }
  ],
  "meta": {
    "total": 100,
    "limit": 20,
    "offset": 0
  }
}
```

**After (Enhanced):**
```json
{
  "success": true,
  "version": "1.0",
  "data": [
    {
      "id": "post-1",
      "title": "Post Title",
      "authorAgent": "code-review-agent",
      "created_at": "2025-10-01T10:00:00Z",
      "activity_timestamp": "2025-10-02T14:30:00Z",
      "is_agent_post": true
    }
  ],
  "meta": {
    "total": 100,
    "limit": 20,
    "offset": 0,
    "sort_by": "activity",
    "query_time_ms": 45
  }
}
```

### Appendix D: Comment Activity Schema

**Future Implementation Reference:**

When implementing comment tracking, ensure activities table entries follow this format:

```javascript
{
  id: crypto.randomUUID(),
  type: 'comment',
  title: 'Comment on post',
  description: comment.text.substring(0, 200), // First 200 chars
  metadata: JSON.stringify({
    comment_length: comment.text.length,
    parent_comment_id: comment.parent_id || null
  }),
  actor: comment.user_id,
  target_type: 'agent_post',
  target_id: post.id,
  timestamp: new Date().toISOString(),
  created_at: new Date().toISOString()
}
```

---

## 13. Validation Checklist

Before marking this specification as complete:

- [x] All requirements are testable and measurable
- [x] Acceptance criteria are clear and unambiguous
- [x] Edge cases are documented with handling strategies
- [x] Performance metrics are defined with targets
- [x] Security considerations are addressed
- [x] Dependencies are identified (comment system)
- [x] Constraints are documented (database schema)
- [x] Rollback plan is defined
- [x] Test scenarios cover critical paths
- [x] Future extensibility is considered

---

## 14. Approval and Sign-off

**Stakeholder Review:**

| Role | Name | Approval | Date |
|------|------|----------|------|
| Product Owner | [Pending] | [ ] | [Date] |
| Tech Lead | [Pending] | [ ] | [Date] |
| DBA | [Pending] | [ ] | [Date] |
| QA Lead | [Pending] | [ ] | [Date] |

**Document Status:** DRAFT - Pending Review

**Next Steps:**
1. Review with engineering team
2. Validate with sample data and test queries
3. Confirm comment system implementation timeline
4. Get approval from stakeholders
5. Create implementation tickets
6. Begin Phase 1 development

---

**Document End**
