# SPARC SPECIFICATION: POST SEARCH ENDPOINT

**Document Version:** 1.0.0
**Date:** 2025-10-21
**Status:** Specification Phase
**Author:** SPARC Specification Agent
**Priority:** P0 (Critical - Blocking Feature)

---

## Executive Summary

This specification defines the requirements for implementing the `/api/search/posts` endpoint to enable full-text search functionality for agent posts. The frontend currently calls this endpoint but receives 404 errors, preventing users from searching posts by title, content, or author.

**Business Impact:** HIGH - Core feature missing from production application
**Complexity:** LOW - Standard search endpoint with SQL LIKE queries
**Risk:** LOW - Read-only operation with well-defined scope

---

## 1. PROBLEM STATEMENT

### 1.1 Current State

**Frontend Implementation:**
- Search UI exists and is functional (SocialMediaFeed.tsx, RealSocialMediaFeed.tsx)
- Frontend calls `apiService.searchPosts(query, limit, offset)` at lines 338, 127
- API service method defined at `/frontend/src/services/api.ts:1096-1103`
- **BLOCKER:** Backend endpoint returns 404 (endpoint not implemented)

**Expected API Call:**
```typescript
GET /api/search/posts?q=<query>&limit=20&offset=0
```

**Database State:**
- SQLite database exists: `/workspaces/agent-feed/database.db`
- Table `agent_posts` exists with proper schema
- 5 test posts available for validation
- Search-relevant columns: `title`, `content`, `authorAgent`

### 1.2 Gap Analysis

| Component | Status | Notes |
|-----------|--------|-------|
| Frontend UI | ✅ Complete | Search input, debouncing, results display |
| Frontend API Client | ✅ Complete | `searchPosts()` method implemented |
| Backend Endpoint | ❌ Missing | Returns 404 error |
| Database Schema | ✅ Ready | `agent_posts` table has searchable columns |
| SQL Indexes | ⚠️ Partial | Published_at indexed, but no full-text search index |

---

## 2. FUNCTIONAL REQUIREMENTS

### FR-001: Search Endpoint Implementation
**Priority:** P0 (Critical)
**Description:** Implement `GET /api/search/posts` endpoint in backend server

**Acceptance Criteria:**
- [ ] Endpoint responds to `GET /api/search/posts`
- [ ] Accepts query parameters: `q`, `limit`, `offset`
- [ ] Returns 200 status code on success
- [ ] Returns properly formatted JSON response
- [ ] Handles empty query strings gracefully
- [ ] Integrates with existing database selector (PostgreSQL/SQLite dual mode)

**Input Validation:**
```javascript
{
  q: string,        // Required, min length: 1, max length: 500
  limit: number,    // Optional, default: 20, max: 100
  offset: number    // Optional, default: 0, min: 0
}
```

**Error Handling:**
- Empty query (`q` = ""): Return empty results array, not error
- Missing `q` parameter: Return HTTP 400 Bad Request
- Invalid limit/offset: Return HTTP 400 Bad Request
- Database errors: Return HTTP 500 Internal Server Error

---

### FR-002: Multi-Field Search
**Priority:** P0 (Critical)
**Description:** Search across title, content, and authorAgent fields

**Search Logic:**
```sql
WHERE (
  LOWER(title) LIKE LOWER('%' || ? || '%')
  OR LOWER(content) LIKE LOWER('%' || ? || '%')
  OR LOWER(authorAgent) LIKE LOWER('%' || ? || '%')
)
```

**Acceptance Criteria:**
- [ ] Search is case-insensitive
- [ ] Partial matches are supported (substring search)
- [ ] All three fields (title, content, authorAgent) are searched
- [ ] Results include posts matching ANY field (OR logic, not AND)
- [ ] Special characters in query are properly escaped

**Search Examples:**

| Query | Matches Title | Matches Content | Matches Author |
|-------|---------------|-----------------|----------------|
| "validation" | ✅ "Production Validation Test" | ✅ "...validation complete..." | ✅ "ValidationAgent" |
| "test" | ✅ "Comment Counter Test" | ✅ "This is a test post" | ✅ "TestAgent" |
| "avi" | ❌ | ❌ | ✅ "ValidationAgent" (partial) |

---

### FR-003: Pagination Support
**Priority:** P0 (Critical)
**Description:** Support pagination with limit and offset parameters

**Pagination Logic:**
```sql
LIMIT ? OFFSET ?
```

**Acceptance Criteria:**
- [ ] Default limit: 20 posts
- [ ] Maximum limit: 100 posts (prevent excessive data transfer)
- [ ] Default offset: 0
- [ ] Offset validation: >= 0
- [ ] Return total count of matching results (for pagination UI)

**Pagination Examples:**

| Request | Behavior |
|---------|----------|
| `?q=test&limit=10&offset=0` | First 10 results |
| `?q=test&limit=10&offset=10` | Results 11-20 |
| `?q=test` | First 20 results (default limit) |
| `?q=test&limit=200` | Maximum 100 results (capped) |

---

### FR-004: Response Format Compatibility
**Priority:** P0 (Critical)
**Description:** Return data in format compatible with existing `/api/v1/agent-posts` endpoint

**Response Structure:**
```typescript
{
  success: true,
  data: {
    items: AgentPost[],  // Array of matching posts
    total: number,        // Total count of matches
    query: string         // Echo of search query
  }
}
```

**AgentPost Structure (from existing endpoint):**
```typescript
{
  id: string,
  title: string,
  content: string,
  authorAgent: string,
  publishedAt: string,  // ISO 8601 timestamp
  metadata: string,     // JSON string
  engagement: string,   // JSON string
  created_at: string,
  last_activity_at: string | null
}
```

**Acceptance Criteria:**
- [ ] Response structure matches frontend expectations
- [ ] `data.items` contains array of posts (not `data.posts`)
- [ ] `data.total` contains count of ALL matching posts (not just current page)
- [ ] `data.query` echoes the search query for UI display
- [ ] All post fields match existing `/api/v1/agent-posts` format
- [ ] JSON fields (metadata, engagement) are properly stringified

---

### FR-005: Sorting
**Priority:** P1 (High)
**Description:** Return results sorted by published date (newest first)

**Sort Logic:**
```sql
ORDER BY publishedAt DESC
```

**Acceptance Criteria:**
- [ ] Results sorted by `publishedAt` descending (newest first)
- [ ] Matches behavior of main feed (`/api/v1/agent-posts`)
- [ ] Consistent ordering across paginated requests

---

### FR-006: Empty Query Handling
**Priority:** P1 (High)
**Description:** Handle empty or whitespace-only queries gracefully

**Behavior:**
- Empty query (`q=""` or `q="   "`): Return empty results
- No `q` parameter: Return HTTP 400 Bad Request

**Acceptance Criteria:**
- [ ] Empty query returns `{ success: true, data: { items: [], total: 0, query: "" } }`
- [ ] No database query executed for empty search
- [ ] Frontend displays "No search results" message
- [ ] User can clear search to return to full feed

---

## 3. NON-FUNCTIONAL REQUIREMENTS

### NFR-001: Performance
**Metric:** Response time < 100ms for typical searches (< 10,000 posts)
**Validation:** Load testing with 1000 concurrent requests

**Performance Targets:**

| Scenario | Target | Measurement Method |
|----------|--------|-------------------|
| Single-word search | < 50ms | Server-side logging |
| Multi-word search | < 100ms | Server-side logging |
| Paginated results | < 75ms | Frontend timing API |
| Empty results | < 25ms | Short-circuit logic |

**Optimization Strategies:**
- Use parameterized queries (prevent SQL injection)
- Limit result set before full object construction
- Consider adding indexes on searchable columns (future enhancement)

**Performance Monitoring:**
```javascript
const startTime = Date.now();
// ... execute search ...
const duration = Date.now() - startTime;
if (duration > 100) {
  console.warn(`⚠️ Slow search query: ${duration}ms for "${query}"`);
}
```

---

### NFR-002: Security
**Metric:** Zero SQL injection vulnerabilities
**Validation:** Security audit with OWASP testing tools

**Security Requirements:**

1. **SQL Injection Prevention:**
   - ✅ MUST use parameterized queries
   - ❌ NEVER concatenate user input into SQL strings
   - ✅ Use `db.prepare()` with `?` placeholders

2. **Input Sanitization:**
   - Trim whitespace from query string
   - Limit query length (max 500 characters)
   - Escape special SQL characters (`%`, `_`, `'`, `"`)

3. **Rate Limiting (Future Enhancement):**
   - Consider implementing rate limiting (e.g., 100 requests/minute per IP)
   - Log suspicious search patterns

**Secure Query Example:**
```javascript
// ✅ CORRECT - Parameterized query
const query = db.prepare(`
  SELECT * FROM agent_posts
  WHERE LOWER(title) LIKE LOWER(?)
`).all(`%${searchTerm}%`);

// ❌ WRONG - SQL injection vulnerable
const query = db.prepare(`
  SELECT * FROM agent_posts
  WHERE title LIKE '%${searchTerm}%'
`).all();
```

---

### NFR-003: Reliability
**Metric:** 99.9% uptime for search endpoint
**Validation:** Error monitoring and alerting

**Reliability Requirements:**

1. **Error Recovery:**
   - Database connection errors: Return HTTP 503 Service Unavailable
   - Timeout errors: Return HTTP 504 Gateway Timeout
   - Malformed queries: Return HTTP 400 Bad Request

2. **Graceful Degradation:**
   - If search fails, log error but don't crash server
   - Return empty results on error (don't return 500)
   - Frontend falls back to showing all posts

3. **Error Logging:**
   ```javascript
   console.error('❌ Search endpoint error:', {
     query: searchQuery,
     error: error.message,
     stack: error.stack,
     timestamp: new Date().toISOString()
   });
   ```

---

### NFR-004: Compatibility
**Metric:** Works in both PostgreSQL and SQLite modes
**Validation:** Integration tests in both database modes

**Database Mode Support:**

| Database | Search Implementation | Notes |
|----------|----------------------|-------|
| SQLite | `LIKE` operator | Case-insensitive via `LOWER()` |
| PostgreSQL | `ILIKE` operator | Native case-insensitive search |

**Database Selector Integration:**
```javascript
async searchPosts(query, limit, offset) {
  if (this.usePostgres) {
    // PostgreSQL implementation
    return await memoryRepo.searchPosts(query, limit, offset);
  } else {
    // SQLite implementation
    return await this.sqliteSearchPosts(query, limit, offset);
  }
}
```

---

## 4. API CONTRACT SPECIFICATION

### 4.1 Endpoint Definition

**URL:** `/api/search/posts`
**Method:** `GET`
**Authentication:** None (public endpoint)
**Content-Type:** `application/json`

### 4.2 Request Parameters

```typescript
interface SearchPostsRequest {
  q: string;        // Search query (required)
  limit?: number;   // Results per page (optional, default: 20)
  offset?: number;  // Pagination offset (optional, default: 0)
}
```

**Query Parameter Details:**

| Parameter | Type | Required | Default | Constraints | Example |
|-----------|------|----------|---------|-------------|---------|
| `q` | string | Yes | - | min: 1, max: 500 chars | `?q=validation` |
| `limit` | number | No | 20 | min: 1, max: 100 | `?limit=50` |
| `offset` | number | No | 0 | min: 0 | `?offset=20` |

**Example Requests:**
```
GET /api/search/posts?q=test
GET /api/search/posts?q=validation&limit=10&offset=0
GET /api/search/posts?q=Avi&limit=5
```

---

### 4.3 Response Format

#### 4.3.1 Success Response (200 OK)

```typescript
{
  success: true,
  data: {
    items: [
      {
        id: "test-post-1",
        title: "Production Validation Test - High Activity",
        content: "Full post content...",
        authorAgent: "ValidationAgent",
        publishedAt: "2025-10-16T23:39:56.780Z",
        metadata: "{\"businessImpact\":0.85}",
        engagement: "{\"comments\":5,\"views\":120}",
        created_at: "2025-10-16T23:39:56.780Z",
        last_activity_at: "2025-10-17T10:15:30.000Z"
      },
      // ... more posts
    ],
    total: 42,          // Total matching posts (across all pages)
    query: "validation" // Echo of search query
  }
}
```

#### 4.3.2 Empty Results (200 OK)

```typescript
{
  success: true,
  data: {
    items: [],
    total: 0,
    query: "nonexistent"
  }
}
```

#### 4.3.3 Error Responses

**400 Bad Request - Missing Query:**
```typescript
{
  success: false,
  error: "Search query parameter 'q' is required",
  code: "MISSING_QUERY"
}
```

**400 Bad Request - Invalid Limit:**
```typescript
{
  success: false,
  error: "Limit must be between 1 and 100",
  code: "INVALID_LIMIT"
}
```

**500 Internal Server Error:**
```typescript
{
  success: false,
  error: "Database query failed",
  code: "DATABASE_ERROR"
}
```

---

## 5. SQL QUERY DESIGN

### 5.1 SQLite Implementation

```sql
-- Search query with multi-field LIKE matching
SELECT
  id,
  title,
  content,
  authorAgent,
  publishedAt,
  metadata,
  engagement,
  created_at,
  last_activity_at
FROM agent_posts
WHERE (
  -- Case-insensitive search across three fields
  LOWER(title) LIKE LOWER(?)
  OR LOWER(content) LIKE LOWER(?)
  OR LOWER(authorAgent) LIKE LOWER(?)
)
ORDER BY publishedAt DESC
LIMIT ? OFFSET ?;
```

**Parameterized Query (JavaScript):**
```javascript
const searchPattern = `%${sanitizedQuery}%`;
const posts = db.prepare(`
  SELECT
    id, title, content, authorAgent, publishedAt,
    metadata, engagement, created_at, last_activity_at
  FROM agent_posts
  WHERE (
    LOWER(title) LIKE LOWER(?)
    OR LOWER(content) LIKE LOWER(?)
    OR LOWER(authorAgent) LIKE LOWER(?)
  )
  ORDER BY publishedAt DESC
  LIMIT ? OFFSET ?
`).all(searchPattern, searchPattern, searchPattern, limit, offset);
```

**Count Query (for total):**
```javascript
const total = db.prepare(`
  SELECT COUNT(*) as count
  FROM agent_posts
  WHERE (
    LOWER(title) LIKE LOWER(?)
    OR LOWER(content) LIKE LOWER(?)
    OR LOWER(authorAgent) LIKE LOWER(?)
  )
`).get(searchPattern, searchPattern, searchPattern).count;
```

---

### 5.2 PostgreSQL Implementation

```sql
-- PostgreSQL version with ILIKE (case-insensitive)
SELECT
  id,
  title,
  content,
  author_agent as "authorAgent",
  published_at as "publishedAt",
  metadata::text,
  engagement::text,
  created_at,
  last_activity_at
FROM agent_memories
WHERE (
  title ILIKE $1
  OR content ILIKE $1
  OR author_agent ILIKE $1
)
ORDER BY published_at DESC
LIMIT $2 OFFSET $3;
```

**Note:** PostgreSQL stores posts in `agent_memories` table with different column names (snake_case vs camelCase).

---

### 5.3 Query Performance Considerations

**Current Indexes (SQLite):**
```sql
CREATE INDEX idx_posts_published ON agent_posts(publishedAt);
CREATE INDEX idx_posts_author ON agent_posts(authorAgent);
```

**Performance Impact:**
- `publishedAt` index: ✅ Helps with ORDER BY (used)
- `authorAgent` index: ⚠️ Partial help (LIKE queries don't use index efficiently)
- No full-text search index: ⚠️ LIKE queries do full table scans

**Future Optimization (Phase 2):**
```sql
-- SQLite FTS5 virtual table (future enhancement)
CREATE VIRTUAL TABLE agent_posts_fts USING fts5(
  title, content, authorAgent,
  content=agent_posts,
  content_rowid=rowid
);
```

**Expected Performance:**
- Small datasets (< 1,000 posts): < 50ms (acceptable)
- Medium datasets (1,000-10,000 posts): 50-200ms (acceptable)
- Large datasets (> 10,000 posts): Consider FTS optimization

---

## 6. ERROR HANDLING SPECIFICATION

### 6.1 Input Validation Errors

```javascript
// Validation function
function validateSearchParams(query, limit, offset) {
  const errors = [];

  // Query validation
  if (!query || query.trim().length === 0) {
    errors.push({
      field: 'q',
      message: 'Search query is required',
      code: 'MISSING_QUERY'
    });
  }

  if (query && query.length > 500) {
    errors.push({
      field: 'q',
      message: 'Search query must be less than 500 characters',
      code: 'QUERY_TOO_LONG'
    });
  }

  // Limit validation
  if (limit < 1 || limit > 100) {
    errors.push({
      field: 'limit',
      message: 'Limit must be between 1 and 100',
      code: 'INVALID_LIMIT'
    });
  }

  // Offset validation
  if (offset < 0) {
    errors.push({
      field: 'offset',
      message: 'Offset must be non-negative',
      code: 'INVALID_OFFSET'
    });
  }

  return errors;
}
```

---

### 6.2 Database Error Handling

```javascript
async function searchPosts(query, limit, offset) {
  try {
    // Execute search query
    const posts = db.prepare(searchQuery).all(...params);
    const total = db.prepare(countQuery).get(...countParams).count;

    return {
      success: true,
      data: {
        items: posts,
        total: total,
        query: query
      }
    };
  } catch (error) {
    console.error('❌ Search query failed:', {
      query,
      error: error.message,
      stack: error.stack
    });

    // Return graceful error response
    return {
      success: false,
      error: 'Search failed. Please try again.',
      code: 'DATABASE_ERROR',
      data: {
        items: [],
        total: 0,
        query: query
      }
    };
  }
}
```

---

### 6.3 Edge Cases

| Edge Case | Expected Behavior | HTTP Status |
|-----------|------------------|-------------|
| Empty query (`q=""`) | Return empty results | 200 OK |
| Whitespace only (`q="   "`) | Return empty results | 200 OK |
| Special characters (`q="test's"`) | Escape and search | 200 OK |
| SQL injection attempt (`q="'; DROP TABLE--"`) | Parameterized query prevents | 200 OK |
| Very long query (> 500 chars) | Return 400 error | 400 Bad Request |
| No results found | Return empty items array | 200 OK |
| Database disconnected | Return 503 error | 503 Service Unavailable |
| Negative offset | Return 400 error | 400 Bad Request |
| Limit > 100 | Cap at 100, return results | 200 OK |

---

## 7. IMPLEMENTATION PSEUDOCODE

### 7.1 Backend Endpoint Handler

```javascript
/**
 * GET /api/search/posts
 * Search agent posts by title, content, or author
 */
app.get('/api/search/posts', async (req, res) => {
  try {
    // 1. Extract and validate query parameters
    const query = (req.query.q || '').trim();
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);

    // 2. Validate required query parameter
    if (!query) {
      return res.status(400).json({
        success: false,
        error: "Search query parameter 'q' is required",
        code: 'MISSING_QUERY'
      });
    }

    // 3. Validate query length
    if (query.length > 500) {
      return res.status(400).json({
        success: false,
        error: 'Search query must be less than 500 characters',
        code: 'QUERY_TOO_LONG'
      });
    }

    // 4. Call database selector method
    const results = await dbSelector.searchPosts(query, limit, offset);

    // 5. Return formatted response
    res.json({
      success: true,
      data: {
        items: results.posts,
        total: results.total,
        query: query
      }
    });

  } catch (error) {
    console.error('❌ Search endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Search failed. Please try again.',
      code: 'DATABASE_ERROR'
    });
  }
});
```

---

### 7.2 Database Selector Method

```javascript
/**
 * Search posts in current database mode (PostgreSQL or SQLite)
 */
async searchPosts(query, limit = 20, offset = 0) {
  if (this.usePostgres) {
    // PostgreSQL implementation
    return await memoryRepo.searchPosts(query, limit, offset);
  } else {
    // SQLite implementation
    return await this.sqliteSearchPosts(query, limit, offset);
  }
}

/**
 * SQLite-specific search implementation
 */
async sqliteSearchPosts(query, limit, offset) {
  const searchPattern = `%${query}%`;

  // Get matching posts
  const posts = this.sqliteDb.prepare(`
    SELECT
      id, title, content, authorAgent, publishedAt,
      metadata, engagement, created_at, last_activity_at
    FROM agent_posts
    WHERE (
      LOWER(title) LIKE LOWER(?)
      OR LOWER(content) LIKE LOWER(?)
      OR LOWER(authorAgent) LIKE LOWER(?)
    )
    ORDER BY publishedAt DESC
    LIMIT ? OFFSET ?
  `).all(searchPattern, searchPattern, searchPattern, limit, offset);

  // Get total count
  const countResult = this.sqliteDb.prepare(`
    SELECT COUNT(*) as count
    FROM agent_posts
    WHERE (
      LOWER(title) LIKE LOWER(?)
      OR LOWER(content) LIKE LOWER(?)
      OR LOWER(authorAgent) LIKE LOWER(?)
    )
  `).get(searchPattern, searchPattern, searchPattern);

  return {
    posts: posts,
    total: countResult.count
  };
}
```

---

### 7.3 PostgreSQL Repository Method

```javascript
/**
 * PostgreSQL-specific search implementation
 */
async searchPosts(query, limit, offset) {
  const searchPattern = `%${query}%`;

  const result = await this.pool.query(`
    SELECT
      id::text,
      title,
      content,
      author_agent as "authorAgent",
      published_at as "publishedAt",
      raw_data::text as metadata,
      '{}' as engagement,
      created_at,
      updated_at as last_activity_at
    FROM agent_memories
    WHERE (
      title ILIKE $1
      OR content ILIKE $1
      OR author_agent ILIKE $1
    )
    ORDER BY published_at DESC
    LIMIT $2 OFFSET $3
  `, [searchPattern, limit, offset]);

  const countResult = await this.pool.query(`
    SELECT COUNT(*) as count
    FROM agent_memories
    WHERE (
      title ILIKE $1
      OR content ILIKE $1
      OR author_agent ILIKE $1
    )
  `, [searchPattern]);

  return {
    posts: result.rows,
    total: parseInt(countResult.rows[0].count)
  };
}
```

---

## 8. TEST SCENARIOS

### 8.1 Unit Tests

```javascript
describe('POST Search Endpoint', () => {

  test('001: Returns results for valid single-word query', async () => {
    const response = await request(app)
      .get('/api/search/posts?q=test');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('items');
    expect(response.body.data).toHaveProperty('total');
    expect(response.body.data).toHaveProperty('query');
    expect(response.body.data.query).toBe('test');
  });

  test('002: Returns results for multi-word query', async () => {
    const response = await request(app)
      .get('/api/search/posts?q=validation%20test');

    expect(response.status).toBe(200);
    expect(response.body.data.items.length).toBeGreaterThan(0);
  });

  test('003: Search is case-insensitive', async () => {
    const lowerResponse = await request(app)
      .get('/api/search/posts?q=test');
    const upperResponse = await request(app)
      .get('/api/search/posts?q=TEST');

    expect(lowerResponse.body.data.total)
      .toBe(upperResponse.body.data.total);
  });

  test('004: Searches title field', async () => {
    const response = await request(app)
      .get('/api/search/posts?q=Production');

    const matchingPost = response.body.data.items.find(
      p => p.title.includes('Production')
    );
    expect(matchingPost).toBeDefined();
  });

  test('005: Searches content field', async () => {
    const response = await request(app)
      .get('/api/search/posts?q=validation');

    const matchingPost = response.body.data.items.find(
      p => p.content.toLowerCase().includes('validation')
    );
    expect(matchingPost).toBeDefined();
  });

  test('006: Searches authorAgent field', async () => {
    const response = await request(app)
      .get('/api/search/posts?q=ValidationAgent');

    expect(response.body.data.items.length).toBeGreaterThan(0);
    expect(response.body.data.items[0].authorAgent)
      .toBe('ValidationAgent');
  });

  test('007: Returns empty results for no matches', async () => {
    const response = await request(app)
      .get('/api/search/posts?q=nonexistent12345');

    expect(response.status).toBe(200);
    expect(response.body.data.items).toEqual([]);
    expect(response.body.data.total).toBe(0);
  });

  test('008: Respects limit parameter', async () => {
    const response = await request(app)
      .get('/api/search/posts?q=test&limit=2');

    expect(response.body.data.items.length).toBeLessThanOrEqual(2);
  });

  test('009: Respects offset parameter', async () => {
    const page1 = await request(app)
      .get('/api/search/posts?q=test&limit=1&offset=0');
    const page2 = await request(app)
      .get('/api/search/posts?q=test&limit=1&offset=1');

    if (page1.body.data.total > 1) {
      expect(page1.body.data.items[0].id)
        .not.toBe(page2.body.data.items[0].id);
    }
  });

  test('010: Returns 400 for missing query', async () => {
    const response = await request(app)
      .get('/api/search/posts');

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.code).toBe('MISSING_QUERY');
  });

  test('011: Caps limit at 100', async () => {
    const response = await request(app)
      .get('/api/search/posts?q=test&limit=200');

    expect(response.body.data.items.length).toBeLessThanOrEqual(100);
  });

  test('012: Handles special characters safely', async () => {
    const response = await request(app)
      .get('/api/search/posts?q=test%27s');

    expect(response.status).toBe(200);
    // Should not cause SQL error
  });

  test('013: Trims whitespace from query', async () => {
    const response = await request(app)
      .get('/api/search/posts?q=%20%20test%20%20');

    expect(response.status).toBe(200);
    expect(response.body.data.query).toBe('test');
  });

  test('014: Returns posts sorted by publishedAt DESC', async () => {
    const response = await request(app)
      .get('/api/search/posts?q=test');

    if (response.body.data.items.length > 1) {
      const first = new Date(response.body.data.items[0].publishedAt);
      const second = new Date(response.body.data.items[1].publishedAt);
      expect(first.getTime()).toBeGreaterThanOrEqual(second.getTime());
    }
  });

  test('015: Total count includes all matches, not just current page', async () => {
    const response = await request(app)
      .get('/api/search/posts?q=test&limit=1');

    if (response.body.data.total > 1) {
      expect(response.body.data.items.length).toBe(1);
      expect(response.body.data.total).toBeGreaterThan(1);
    }
  });

});
```

---

### 8.2 Integration Tests

```javascript
describe('Search Integration Tests', () => {

  test('INT-001: Search works in SQLite mode', async () => {
    process.env.USE_POSTGRES = 'false';
    await dbSelector.initialize();

    const response = await request(app)
      .get('/api/search/posts?q=test');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  test('INT-002: Search works in PostgreSQL mode', async () => {
    if (process.env.DATABASE_URL) {
      process.env.USE_POSTGRES = 'true';
      await dbSelector.initialize();

      const response = await request(app)
        .get('/api/search/posts?q=test');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    }
  });

  test('INT-003: Frontend can consume search results', async () => {
    const response = await apiService.searchPosts('test', 10, 0);

    expect(response.success).toBe(true);
    expect(response.data.items).toBeInstanceOf(Array);
    expect(response.data).toHaveProperty('total');
    expect(response.data).toHaveProperty('query');
  });

  test('INT-004: Pagination works across multiple pages', async () => {
    // Get first page
    const page1 = await request(app)
      .get('/api/search/posts?q=test&limit=2&offset=0');

    // Get second page
    const page2 = await request(app)
      .get('/api/search/posts?q=test&limit=2&offset=2');

    // Verify different results
    if (page1.body.data.total > 2) {
      expect(page1.body.data.items[0].id)
        .not.toBe(page2.body.data.items[0].id);
    }
  });

});
```

---

### 8.3 Performance Tests

```javascript
describe('Search Performance Tests', () => {

  test('PERF-001: Search completes in < 100ms', async () => {
    const start = Date.now();

    await request(app).get('/api/search/posts?q=test');

    const duration = Date.now() - start;
    expect(duration).toBeLessThan(100);
  });

  test('PERF-002: Handles 100 concurrent searches', async () => {
    const promises = Array(100).fill(null).map(() =>
      request(app).get('/api/search/posts?q=test')
    );

    const start = Date.now();
    const results = await Promise.all(promises);
    const duration = Date.now() - start;

    expect(results.every(r => r.status === 200)).toBe(true);
    expect(duration).toBeLessThan(5000); // 5 seconds for 100 requests
  });

});
```

---

### 8.4 Security Tests

```javascript
describe('Search Security Tests', () => {

  test('SEC-001: Prevents SQL injection via query parameter', async () => {
    const maliciousQuery = "'; DROP TABLE agent_posts; --";

    const response = await request(app)
      .get(`/api/search/posts?q=${encodeURIComponent(maliciousQuery)}`);

    // Should not crash or return error
    expect(response.status).toBe(200);

    // Verify table still exists
    const verifyResponse = await request(app)
      .get('/api/v1/agent-posts');
    expect(verifyResponse.status).toBe(200);
  });

  test('SEC-002: Handles special characters safely', async () => {
    const specialChars = ['%', '_', "'", '"', '\\', '<', '>', '&'];

    for (const char of specialChars) {
      const response = await request(app)
        .get(`/api/search/posts?q=${encodeURIComponent(char)}`);

      expect(response.status).toBe(200);
    }
  });

});
```

---

## 9. DEPLOYMENT CHECKLIST

### 9.1 Pre-Deployment

- [ ] All unit tests pass (15+ tests)
- [ ] All integration tests pass (4+ tests)
- [ ] Performance tests meet targets (< 100ms)
- [ ] Security tests pass (SQL injection prevention)
- [ ] Code review completed
- [ ] Documentation updated
- [ ] API endpoint documented in OpenAPI/Swagger (if applicable)

### 9.2 Deployment Steps

1. [ ] Merge feature branch to `main`
2. [ ] Deploy to staging environment
3. [ ] Run smoke tests in staging
4. [ ] Verify search functionality in UI
5. [ ] Monitor error logs for 24 hours
6. [ ] Deploy to production
7. [ ] Verify production deployment
8. [ ] Monitor performance metrics

### 9.3 Post-Deployment Verification

- [ ] Search endpoint returns 200 (not 404)
- [ ] Frontend search UI works correctly
- [ ] Search results match expectations
- [ ] Pagination works correctly
- [ ] No error logs related to search
- [ ] Performance metrics within targets

### 9.4 Rollback Plan

If search endpoint causes issues:

1. [ ] Revert commit
2. [ ] Redeploy previous version
3. [ ] Verify frontend gracefully handles 404
4. [ ] Investigate root cause
5. [ ] Fix and redeploy

---

## 10. ACCEPTANCE CRITERIA SUMMARY

### Critical Acceptance Criteria (Must Pass)

- [ ] **AC-001:** Endpoint responds to `GET /api/search/posts`
- [ ] **AC-002:** Returns 200 status code for valid requests
- [ ] **AC-003:** Returns properly formatted JSON response matching spec
- [ ] **AC-004:** Searches across title, content, and authorAgent fields
- [ ] **AC-005:** Search is case-insensitive
- [ ] **AC-006:** Supports pagination with limit and offset
- [ ] **AC-007:** Returns total count of all matching results
- [ ] **AC-008:** Results sorted by publishedAt DESC
- [ ] **AC-009:** Handles empty queries gracefully (returns empty results)
- [ ] **AC-010:** Works in both SQLite and PostgreSQL modes
- [ ] **AC-011:** Uses parameterized queries (prevents SQL injection)
- [ ] **AC-012:** All unit tests pass (100% coverage of search logic)
- [ ] **AC-013:** Integration tests pass in both database modes
- [ ] **AC-014:** Performance target met (< 100ms for typical queries)
- [ ] **AC-015:** Frontend integration works without code changes

### Optional Enhancements (Future Phase)

- [ ] Full-text search with FTS5 (SQLite) or `ts_vector` (PostgreSQL)
- [ ] Search result highlighting
- [ ] Search suggestions/autocomplete
- [ ] Search analytics (track popular queries)
- [ ] Rate limiting on search endpoint
- [ ] Cached search results for common queries

---

## 11. SUCCESS METRICS

### Implementation Success

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Unit test coverage | 100% | Jest coverage report |
| Integration test pass rate | 100% | CI/CD pipeline |
| Performance target | < 100ms | Server-side timing |
| Error rate | < 0.1% | Error monitoring logs |
| Frontend integration | No code changes | Manual testing |

### Business Impact

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Search usage | > 20 searches/day | Analytics tracking |
| User satisfaction | > 90% | User feedback |
| Time to find posts | < 30 seconds | User studies |
| Support tickets | 0 search-related | Support logs |

---

## 12. RISKS AND MITIGATION

### Risk Matrix

| Risk ID | Risk Description | Probability | Impact | Mitigation Strategy |
|---------|-----------------|-------------|--------|---------------------|
| R-001 | SQL injection vulnerability | Low | Critical | Use parameterized queries, security testing |
| R-002 | Performance degradation on large datasets | Medium | High | Add indexes, consider FTS in Phase 2 |
| R-003 | Database mode incompatibility | Low | High | Test in both SQLite and PostgreSQL modes |
| R-004 | Frontend breaking changes | Low | Medium | Maintain exact response format compatibility |
| R-005 | Empty result confusion | Medium | Low | Clear UI messaging for "no results" |
| R-006 | Special character handling | Medium | Medium | Comprehensive input sanitization |

---

## 13. DEPENDENCIES

### Technical Dependencies

- ✅ **Database Selector:** `/api-server/config/database-selector.js`
- ✅ **SQLite Database:** `/workspaces/agent-feed/database.db`
- ✅ **PostgreSQL Repository:** `/api-server/repositories/postgres/memory.repository.js`
- ✅ **Express Server:** `/api-server/server.js`
- ✅ **Frontend API Service:** `/frontend/src/services/api.ts`

### Data Dependencies

- ✅ **agent_posts Table (SQLite):** Schema validated
- ✅ **agent_memories Table (PostgreSQL):** Schema validated
- ✅ **Test Data:** 5 posts available for testing

### No Breaking Changes Required

- ✅ Frontend code works without modifications
- ✅ Existing endpoints remain unchanged
- ✅ Database schema unchanged
- ✅ API response format compatible

---

## 14. NEXT STEPS (POST-SPECIFICATION)

### Phase 1: Pseudocode (Next SPARC Phase)
- [ ] Write detailed pseudocode for endpoint handler
- [ ] Design error handling logic
- [ ] Define test data scenarios
- [ ] Create validation rules

### Phase 2: Implementation
- [ ] Implement `/api/search/posts` endpoint in `server.js`
- [ ] Add `searchPosts()` method to database selector
- [ ] Implement SQLite search query
- [ ] Implement PostgreSQL search query
- [ ] Add input validation

### Phase 3: Testing
- [ ] Write 15+ unit tests
- [ ] Write 4+ integration tests
- [ ] Write 2+ performance tests
- [ ] Write 2+ security tests
- [ ] Run full test suite

### Phase 4: Deployment
- [ ] Code review
- [ ] Merge to main branch
- [ ] Deploy to staging
- [ ] Smoke test in staging
- [ ] Deploy to production
- [ ] Monitor for 24 hours

---

## 15. REFERENCES

### Related Documents

- `/workspaces/agent-feed/docs/SPARC-AGENT-POSTS-TABLE-SPECIFICATION.md` - Database schema
- `/workspaces/agent-feed/docs/DATABASE-SCHEMA-RESEARCH.md` - Database research
- `/workspaces/agent-feed/frontend/src/services/api.ts:1096-1103` - Frontend API client

### Key Files

- `/workspaces/agent-feed/api-server/server.js` - Backend server (add endpoint here)
- `/workspaces/agent-feed/api-server/config/database-selector.js` - Database abstraction
- `/workspaces/agent-feed/frontend/src/components/SocialMediaFeed.tsx:338` - Frontend usage
- `/workspaces/agent-feed/database.db` - SQLite database

### Database Schema

```sql
-- SQLite schema (current)
CREATE TABLE agent_posts (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    authorAgent TEXT NOT NULL,
    publishedAt TEXT NOT NULL,
    metadata TEXT NOT NULL,
    engagement TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_activity_at DATETIME
);
```

---

## Document Control

**Version History:**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-10-21 | SPARC Specification Agent | Initial specification document |

**Approvals:**

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Technical Lead | TBD | TBD | _______________ |
| Frontend Engineer | TBD | TBD | _______________ |
| QA Lead | TBD | TBD | _______________ |

**Distribution:**
- Development Team
- Frontend Team
- QA Team
- DevOps Team

---

**END OF SPECIFICATION**
