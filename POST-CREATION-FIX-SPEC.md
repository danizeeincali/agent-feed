# SPARC Specification: Post Creation Bug Fix

## Document Information

| Property | Value |
|----------|-------|
| Document ID | SPEC-001 |
| Version | 1.0.0 |
| Status | Draft |
| Created | 2025-10-21 |
| Author | SPARC Specification Agent |
| Priority | Critical |

## 1. Executive Summary

### 1.1 Purpose
Fix critical bug in post creation functionality where SQL INSERT statement uses incorrect column names (snake_case) that don't match the database schema (camelCase), causing all post creation attempts to fail.

### 1.2 Scope
- Fix SQL column name mismatch in database-selector.js
- Add missing required columns (metadata, engagement)
- Remove non-existent column (tags)
- Implement data transformation layer
- Maintain frontend API compatibility
- Add comprehensive error handling

### 1.3 Impact
- **Severity**: Critical - Complete failure of post creation
- **Users Affected**: All agents attempting to create posts
- **Business Impact**: Core functionality blocked
- **Technical Debt**: Schema/code inconsistency

## 2. Problem Definition

### 2.1 Current Behavior

**Error Message**:
```
table agent_posts has no column named author_agent
```

**Location**:
- File: `/workspaces/agent-feed/api-server/config/database-selector.js`
- Line: 214

**Current Broken SQL**:
```sql
INSERT INTO agent_posts (id, author_agent, content, title, tags, published_at)
VALUES (?, ?, ?, ?, ?, datetime('now'))
```

### 2.2 Root Cause Analysis

#### Primary Issues:
1. **Column Name Mismatch**: SQL uses snake_case, schema uses camelCase
   - `author_agent` → should be `authorAgent`
   - `published_at` → should be `publishedAt`

2. **Missing Required Columns**:
   - `metadata` (TEXT NOT NULL)
   - `engagement` (TEXT NOT NULL)

3. **Non-existent Column**:
   - `tags` (doesn't exist in schema)

4. **Data Type Mismatch**:
   - `publishedAt` expects TEXT, query uses datetime('now')

#### Contributing Factors:
- Inconsistent naming conventions between frontend and database
- Lack of schema validation
- Missing integration tests
- Frontend sends snake_case, database expects camelCase

### 2.3 Database Schema (Actual)

```sql
CREATE TABLE agent_posts (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    authorAgent TEXT NOT NULL,      -- camelCase
    publishedAt TEXT NOT NULL,       -- camelCase
    metadata TEXT NOT NULL,          -- Missing in INSERT
    engagement TEXT NOT NULL,        -- Missing in INSERT
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_activity_at DATETIME
);
```

## 3. Functional Requirements

### FR-001: Column Name Mapping
**Priority**: Critical
**Description**: Transform frontend snake_case fields to database camelCase columns

**Acceptance Criteria**:
- [ ] `author_agent` from frontend maps to `authorAgent` in database
- [ ] `published_at` from frontend maps to `publishedAt` in database
- [ ] Mapping is case-insensitive and tolerates both formats
- [ ] No data loss during transformation

**Test Scenario**:
```javascript
// Input
const frontendData = {
  author_agent: "avi",
  published_at: "2025-10-21T10:00:00Z"
};

// Expected Output
const dbData = {
  authorAgent: "avi",
  publishedAt: "2025-10-21T10:00:00Z"
};
```

### FR-002: Metadata Column Population
**Priority**: Critical
**Description**: Populate required metadata column with structured JSON

**Acceptance Criteria**:
- [ ] metadata is valid JSON string
- [ ] Contains minimum required fields: source, type, version
- [ ] Defaults populated when not provided
- [ ] Schema version tracked for future migrations

**Default Metadata Structure**:
```json
{
  "source": "agent",
  "type": "standard",
  "version": "1.0",
  "createdBy": "<authorAgent>",
  "tags": [],
  "category": null,
  "isPublic": true
}
```

**Test Scenario**:
```javascript
// Input (minimal)
const input = { author_agent: "avi", content: "test" };

// Expected metadata
const metadata = {
  "source": "agent",
  "type": "standard",
  "version": "1.0",
  "createdBy": "avi",
  "tags": [],
  "category": null,
  "isPublic": true
};
```

### FR-003: Engagement Column Initialization
**Priority**: Critical
**Description**: Initialize engagement column with zero-state metrics

**Acceptance Criteria**:
- [ ] engagement is valid JSON string
- [ ] Contains all metric fields: comments, likes, shares, views
- [ ] All metrics initialize to 0
- [ ] Structure supports future metric additions

**Default Engagement Structure**:
```json
{
  "comments": 0,
  "likes": 0,
  "shares": 0,
  "views": 0
}
```

### FR-004: Tags Column Removal
**Priority**: High
**Description**: Remove tags from SQL INSERT as column doesn't exist

**Acceptance Criteria**:
- [ ] tags removed from INSERT column list
- [ ] tags removed from VALUES placeholder list
- [ ] tags data preserved in metadata.tags array
- [ ] No SQL errors related to tags column

**Migration Path**:
```javascript
// Tags should be stored in metadata
const metadata = {
  tags: input.tags || []  // Preserve tags data
};
```

### FR-005: Timestamp Handling
**Priority**: High
**Description**: Handle publishedAt timestamp in ISO 8601 TEXT format

**Acceptance Criteria**:
- [ ] Accepts ISO 8601 string format
- [ ] Accepts 'now' or null as current timestamp
- [ ] Stores as TEXT in ISO 8601 format
- [ ] Timezone aware (UTC)

**Timestamp Logic**:
```javascript
const publishedAt = input.published_at
  || input.publishedAt
  || new Date().toISOString();
```

## 4. Non-Functional Requirements

### NFR-001: Performance
**Category**: Performance
**Description**: Post creation must complete within acceptable time limits

**Metrics**:
- [ ] INSERT operation completes in <50ms (p95)
- [ ] Total API response time <200ms (p95)
- [ ] No database lock contention
- [ ] Efficient JSON serialization

### NFR-002: Data Integrity
**Category**: Reliability
**Description**: Ensure data consistency and integrity

**Requirements**:
- [ ] All required fields validated before INSERT
- [ ] Atomic transaction support
- [ ] Rollback on failure
- [ ] No partial writes

### NFR-003: Error Handling
**Category**: Reliability
**Description**: Graceful error handling with actionable messages

**Requirements**:
- [ ] Specific error messages for each failure mode
- [ ] Log full context for debugging
- [ ] Don't expose internal schema to frontend
- [ ] Return HTTP 400 for validation errors, 500 for database errors

### NFR-004: Backward Compatibility
**Category**: Compatibility
**Description**: Support existing frontend API contract

**Requirements**:
- [ ] Accept both snake_case and camelCase input
- [ ] Maintain existing response format
- [ ] No breaking changes to API endpoint
- [ ] Frontend requires no changes

### NFR-005: Maintainability
**Category**: Code Quality
**Description**: Code should be maintainable and well-documented

**Requirements**:
- [ ] Clear inline comments for transformation logic
- [ ] Reusable mapping functions
- [ ] Centralized schema definition
- [ ] JSDoc documentation for all functions

## 5. Technical Design

### 5.1 Corrected SQL Query

```sql
INSERT INTO agent_posts (
  id,
  title,
  content,
  authorAgent,
  publishedAt,
  metadata,
  engagement
)
VALUES (?, ?, ?, ?, ?, ?, ?)
```

### 5.2 Data Transformation Layer

```javascript
/**
 * Transform frontend post data to database schema
 * @param {Object} input - Frontend post data (snake_case)
 * @returns {Object} Database-ready post data (camelCase)
 */
function transformPostData(input) {
  // Validate required fields
  if (!input.content || !input.title) {
    throw new Error('Missing required fields: content and title');
  }

  // Extract author (support both formats)
  const authorAgent = input.author_agent || input.authorAgent;
  if (!authorAgent) {
    throw new Error('Missing required field: author_agent');
  }

  // Generate ID
  const id = input.id || generatePostId();

  // Handle timestamp
  const publishedAt = input.published_at
    || input.publishedAt
    || new Date().toISOString();

  // Build metadata
  const metadata = {
    source: input.source || 'agent',
    type: input.type || 'standard',
    version: '1.0',
    createdBy: authorAgent,
    tags: input.tags || [],
    category: input.category || null,
    isPublic: input.isPublic !== false
  };

  // Initialize engagement
  const engagement = {
    comments: 0,
    likes: 0,
    shares: 0,
    views: 0
  };

  return {
    id,
    title: input.title,
    content: input.content,
    authorAgent,
    publishedAt,
    metadata: JSON.stringify(metadata),
    engagement: JSON.stringify(engagement)
  };
}

/**
 * Generate unique post ID
 * @returns {string} UUID-based post ID
 */
function generatePostId() {
  return `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
```

### 5.3 Updated createPost Function

```javascript
async createPost(postData) {
  try {
    // Transform data to match schema
    const dbPost = transformPostData(postData);

    // Execute INSERT
    const query = `
      INSERT INTO agent_posts (
        id,
        title,
        content,
        authorAgent,
        publishedAt,
        metadata,
        engagement
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      dbPost.id,
      dbPost.title,
      dbPost.content,
      dbPost.authorAgent,
      dbPost.publishedAt,
      dbPost.metadata,
      dbPost.engagement
    ];

    await this.db.run(query, params);

    // Return complete post object
    return {
      id: dbPost.id,
      title: dbPost.title,
      content: dbPost.content,
      author_agent: dbPost.authorAgent,  // Frontend format
      published_at: dbPost.publishedAt,   // Frontend format
      metadata: JSON.parse(dbPost.metadata),
      engagement: JSON.parse(dbPost.engagement)
    };

  } catch (error) {
    // Enhanced error logging
    console.error('Post creation failed:', {
      error: error.message,
      input: postData,
      stack: error.stack
    });

    // Specific error handling
    if (error.message.includes('UNIQUE constraint')) {
      throw new Error('Post ID already exists');
    } else if (error.message.includes('NOT NULL constraint')) {
      throw new Error('Missing required fields');
    } else {
      throw new Error(`Database error: ${error.message}`);
    }
  }
}
```

### 5.4 Error Handling Matrix

| Error Type | Condition | HTTP Code | Response |
|------------|-----------|-----------|----------|
| Validation Error | Missing content/title | 400 | `{"error": "Missing required fields"}` |
| Validation Error | Missing author_agent | 400 | `{"error": "Missing author_agent"}` |
| Duplicate ID | UNIQUE constraint | 409 | `{"error": "Post already exists"}` |
| Database Error | Connection failed | 500 | `{"error": "Database unavailable"}` |
| Unknown Error | Unexpected failure | 500 | `{"error": "Internal server error"}` |

## 6. Test Scenarios

### 6.1 Unit Tests

#### Test Case 1: Successful Post Creation
```javascript
describe('createPost - Success Scenarios', () => {
  test('should create post with minimal valid data', async () => {
    const input = {
      title: 'Test Post',
      content: 'Test content',
      author_agent: 'avi'
    };

    const result = await db.createPost(input);

    expect(result.id).toBeDefined();
    expect(result.title).toBe('Test Post');
    expect(result.content).toBe('Test content');
    expect(result.author_agent).toBe('avi');
    expect(result.published_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(result.metadata.source).toBe('agent');
    expect(result.engagement.likes).toBe(0);
  });

  test('should handle camelCase input', async () => {
    const input = {
      title: 'Test',
      content: 'Content',
      authorAgent: 'avi',
      publishedAt: '2025-10-21T10:00:00Z'
    };

    const result = await db.createPost(input);
    expect(result.author_agent).toBe('avi');
    expect(result.published_at).toBe('2025-10-21T10:00:00Z');
  });

  test('should preserve tags in metadata', async () => {
    const input = {
      title: 'Test',
      content: 'Content',
      author_agent: 'avi',
      tags: ['ai', 'testing']
    };

    const result = await db.createPost(input);
    expect(result.metadata.tags).toEqual(['ai', 'testing']);
  });
});
```

#### Test Case 2: Validation Failures
```javascript
describe('createPost - Validation Errors', () => {
  test('should reject missing content', async () => {
    const input = {
      title: 'Test',
      author_agent: 'avi'
    };

    await expect(db.createPost(input))
      .rejects.toThrow('Missing required fields');
  });

  test('should reject missing title', async () => {
    const input = {
      content: 'Test',
      author_agent: 'avi'
    };

    await expect(db.createPost(input))
      .rejects.toThrow('Missing required fields');
  });

  test('should reject missing author_agent', async () => {
    const input = {
      title: 'Test',
      content: 'Content'
    };

    await expect(db.createPost(input))
      .rejects.toThrow('Missing required field: author_agent');
  });
});
```

#### Test Case 3: Column Name Mapping
```javascript
describe('createPost - Column Mapping', () => {
  test('should map snake_case to camelCase', async () => {
    const input = {
      title: 'Test',
      content: 'Content',
      author_agent: 'avi',
      published_at: '2025-10-21T10:00:00Z'
    };

    // Mock database to inspect query
    const spy = jest.spyOn(db.db, 'run');
    await db.createPost(input);

    const query = spy.mock.calls[0][0];
    expect(query).toContain('authorAgent');
    expect(query).toContain('publishedAt');
    expect(query).not.toContain('author_agent');
    expect(query).not.toContain('published_at');
  });
});
```

#### Test Case 4: Default Values
```javascript
describe('createPost - Default Values', () => {
  test('should initialize engagement with zeros', async () => {
    const input = {
      title: 'Test',
      content: 'Content',
      author_agent: 'avi'
    };

    const result = await db.createPost(input);
    expect(result.engagement).toEqual({
      comments: 0,
      likes: 0,
      shares: 0,
      views: 0
    });
  });

  test('should set default metadata', async () => {
    const input = {
      title: 'Test',
      content: 'Content',
      author_agent: 'avi'
    };

    const result = await db.createPost(input);
    expect(result.metadata.source).toBe('agent');
    expect(result.metadata.version).toBe('1.0');
    expect(result.metadata.createdBy).toBe('avi');
  });

  test('should generate publishedAt if not provided', async () => {
    const input = {
      title: 'Test',
      content: 'Content',
      author_agent: 'avi'
    };

    const before = new Date().toISOString();
    const result = await db.createPost(input);
    const after = new Date().toISOString();

    expect(result.published_at).toBeGreaterThanOrEqual(before);
    expect(result.published_at).toBeLessThanOrEqual(after);
  });
});
```

### 6.2 Integration Tests

#### Test Case 5: End-to-End Post Creation
```javascript
describe('createPost - Integration', () => {
  test('should persist post to database', async () => {
    const input = {
      title: 'Integration Test',
      content: 'Full E2E test',
      author_agent: 'avi'
    };

    const created = await db.createPost(input);

    // Verify by reading back
    const retrieved = await db.getPost(created.id);
    expect(retrieved.title).toBe('Integration Test');
    expect(retrieved.authorAgent).toBe('avi');
  });

  test('should handle concurrent post creation', async () => {
    const posts = Array.from({ length: 10 }, (_, i) => ({
      title: `Concurrent Post ${i}`,
      content: `Content ${i}`,
      author_agent: 'avi'
    }));

    const results = await Promise.all(
      posts.map(p => db.createPost(p))
    );

    expect(results).toHaveLength(10);
    expect(new Set(results.map(r => r.id)).size).toBe(10);
  });
});
```

### 6.3 Regression Tests

#### Test Case 6: Backward Compatibility
```javascript
describe('createPost - Backward Compatibility', () => {
  test('should maintain API response format', async () => {
    const input = {
      title: 'Test',
      content: 'Content',
      author_agent: 'avi'
    };

    const result = await db.createPost(input);

    // Frontend expects snake_case
    expect(result).toHaveProperty('author_agent');
    expect(result).toHaveProperty('published_at');
    expect(result).not.toHaveProperty('authorAgent');
    expect(result).not.toHaveProperty('publishedAt');
  });
});
```

## 7. Acceptance Criteria

### 7.1 Core Functionality
- [ ] createPost succeeds with valid minimal input (title, content, author_agent)
- [ ] No SQL errors related to column names
- [ ] All required columns populated
- [ ] Posts retrievable after creation
- [ ] Unique IDs generated for each post

### 7.2 Data Integrity
- [ ] authorAgent correctly stored in database
- [ ] publishedAt stored as ISO 8601 TEXT
- [ ] metadata is valid JSON with required fields
- [ ] engagement initialized with zero metrics
- [ ] tags preserved in metadata.tags

### 7.3 Error Handling
- [ ] Missing required fields return 400 error
- [ ] Error messages are actionable
- [ ] Errors logged with full context
- [ ] No 500 errors for validation failures

### 7.4 Compatibility
- [ ] Frontend can create posts without changes
- [ ] Both snake_case and camelCase input supported
- [ ] Response format matches existing contract
- [ ] No breaking API changes

### 7.5 Performance
- [ ] Post creation completes in <50ms
- [ ] No database lock contention
- [ ] Handles 100 concurrent requests
- [ ] JSON serialization performant

### 7.6 Testing
- [ ] All unit tests pass (100% coverage of new code)
- [ ] Integration tests pass
- [ ] Regression tests pass
- [ ] Manual testing confirms fix

## 8. Implementation Plan

### Phase 1: Code Changes (30 minutes)
1. Update SQL query in database-selector.js:214
2. Implement transformPostData function
3. Add generatePostId function
4. Update createPost error handling

### Phase 2: Testing (45 minutes)
1. Write and run unit tests
2. Write and run integration tests
3. Manual testing with Postman/curl
4. Verify database state

### Phase 3: Validation (15 minutes)
1. Test from frontend
2. Verify Avi can create posts
3. Check database contents
4. Review logs for errors

### Phase 4: Documentation (15 minutes)
1. Update API documentation
2. Add inline code comments
3. Document data transformation logic
4. Update changelog

## 9. Rollback Plan

### If Issues Arise:
1. Revert database-selector.js to previous version
2. Clear any test posts from database
3. Notify team of rollback
4. Document failure mode for analysis

### Rollback Command:
```bash
git checkout HEAD -- api-server/config/database-selector.js
```

## 10. Validation Checklist

### Pre-Implementation
- [ ] Specification reviewed by team
- [ ] Database schema confirmed
- [ ] Frontend API contract documented
- [ ] Test environment prepared

### Post-Implementation
- [ ] All tests passing
- [ ] Code reviewed and approved
- [ ] Manual testing completed
- [ ] Performance metrics acceptable
- [ ] Error handling verified
- [ ] Documentation updated
- [ ] Deployed to test environment
- [ ] Verified in production

## 11. Dependencies

### Code Files
- `/workspaces/agent-feed/api-server/config/database-selector.js` (primary fix)
- `/workspaces/agent-feed/database.db` (schema verification)

### External Systems
- SQLite database
- Frontend posting interface
- Agent system (Avi)

### Tools Required
- SQLite CLI (schema inspection)
- Node.js test runner
- Git (version control)

## 12. Success Metrics

### Quantitative
- 0 SQL errors related to column names
- 100% test coverage on new code
- <50ms p95 latency for createPost
- 0 data integrity issues

### Qualitative
- Avi successfully creates posts
- Frontend developers require no changes
- Code is maintainable and clear
- Error messages are actionable

## 13. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Data loss during migration | Low | High | No schema changes needed |
| Frontend breaks | Low | High | Maintain backward compatibility |
| Performance degradation | Low | Medium | Benchmark before/after |
| New bugs introduced | Medium | Medium | Comprehensive testing |
| Incomplete error handling | Medium | Low | Test all failure modes |

## 14. References

### Related Documents
- Database schema: `/workspaces/agent-feed/database.db`
- Current code: `/workspaces/agent-feed/api-server/config/database-selector.js`
- Previous analysis: Multiple investigation docs in repo

### Standards
- ISO 8601 for timestamps
- JSON for structured data storage
- camelCase for database columns
- snake_case for frontend API (compatibility)

## 15. Appendix

### A. Complete File Diff

**Before** (database-selector.js:214):
```javascript
const query = `
  INSERT INTO agent_posts (id, author_agent, content, title, tags, published_at)
  VALUES (?, ?, ?, ?, ?, datetime('now'))
`;
await this.db.run(query, [id, author, content, title, tags]);
```

**After** (database-selector.js:214):
```javascript
// Transform input data to match schema
const dbPost = transformPostData(postData);

const query = `
  INSERT INTO agent_posts (
    id,
    title,
    content,
    authorAgent,
    publishedAt,
    metadata,
    engagement
  )
  VALUES (?, ?, ?, ?, ?, ?, ?)
`;

await this.db.run(query, [
  dbPost.id,
  dbPost.title,
  dbPost.content,
  dbPost.authorAgent,
  dbPost.publishedAt,
  dbPost.metadata,
  dbPost.engagement
]);
```

### B. SQL Schema Verification Query

```sql
-- Verify column names
PRAGMA table_info(agent_posts);

-- Expected output:
-- 0|id|TEXT|0||1
-- 1|title|TEXT|1||0
-- 2|content|TEXT|1||0
-- 3|authorAgent|TEXT|1||0  <-- camelCase
-- 4|publishedAt|TEXT|1||0  <-- camelCase
-- 5|metadata|TEXT|1||0
-- 6|engagement|TEXT|1||0
-- 7|created_at|DATETIME|0|CURRENT_TIMESTAMP|0
-- 8|last_activity_at|DATETIME|0||0
```

### C. Example API Calls

**Create Post (curl)**:
```bash
curl -X POST http://localhost:3000/api/posts \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Post",
    "content": "This is a test",
    "author_agent": "avi",
    "tags": ["test", "demo"]
  }'
```

**Expected Response**:
```json
{
  "id": "post_1729507200000_abc123",
  "title": "Test Post",
  "content": "This is a test",
  "author_agent": "avi",
  "published_at": "2025-10-21T10:00:00.000Z",
  "metadata": {
    "source": "agent",
    "type": "standard",
    "version": "1.0",
    "createdBy": "avi",
    "tags": ["test", "demo"],
    "category": null,
    "isPublic": true
  },
  "engagement": {
    "comments": 0,
    "likes": 0,
    "shares": 0,
    "views": 0
  }
}
```

---

**End of Specification**

*This specification follows the SPARC methodology and provides a complete blueprint for fixing the post creation bug with comprehensive testing and validation.*
