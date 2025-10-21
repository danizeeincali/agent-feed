# Search Endpoint TDD - Quick Start Guide

## Run the Tests

```bash
# Navigate to api-server directory
cd /workspaces/agent-feed/api-server

# Run search endpoint tests
npm test -- tests/search-endpoint.test.js

# Run with verbose output
npm test -- tests/search-endpoint.test.js --reporter=verbose

# Run with coverage
npm test -- tests/search-endpoint.test.js --coverage
```

## Test Structure Overview

```
tests/search-endpoint.test.js
├── Part 1: London School TDD (Mocked Collaborators) - 41 tests
│   ├── 1. Basic Search (3 tests)
│   ├── 2. Case-Insensitive (3 tests)
│   ├── 3. Empty Query (3 tests)
│   ├── 4. Search Scope (4 tests)
│   ├── 5. Partial Matching (4 tests)
│   ├── 6. Pagination (6 tests)
│   ├── 7. Edge Cases (6 tests)
│   ├── 8. Response Format (6 tests)
│   └── 9. Error Handling (4 tests)
│
└── Part 2: Real Database Integration - 11 tests
    ├── Real Search Functionality (10 tests)
    └── Performance Considerations (1 test)
```

## Key Test Examples

### Example 1: Basic Search
```javascript
it('should search and return matching posts', async () => {
  const response = await request(app)
    .get('/api/agent-posts?search=TDD')
    .expect(200);

  expect(response.body.success).toBe(true);
  expect(response.body.data).toHaveLength(1);
});
```

### Example 2: Case-Insensitive
```javascript
it('should find posts regardless of query case', async () => {
  const response = await request(app)
    .get('/api/agent-posts?search=javascript')
    .expect(200);

  expect(response.body.data).toHaveLength(1);
});
```

### Example 3: Pagination
```javascript
it('should respect limit parameter with search', async () => {
  const response = await request(app)
    .get('/api/agent-posts?search=Test&limit=5')
    .expect(200);

  expect(response.body.data).toHaveLength(5);
  expect(response.body.pagination.limit).toBe(5);
});
```

### Example 4: SQL Injection Prevention
```javascript
it('should prevent SQL injection attempts', async () => {
  const response = await request(app)
    .get('/api/agent-posts?search=' + encodeURIComponent("'; DROP TABLE agent_posts; --"))
    .expect(200);

  expect(response.body.success).toBe(true);
  // Should not crash or drop table
});
```

## Implementation Needed (GREEN Phase)

### 1. Add searchPosts() to database-selector.js

```javascript
async searchPosts(userId = 'anonymous', options = {}) {
  const { query, limit = 20, offset = 0, sortBy = 'publishedAt', sortOrder = 'DESC' } = options;

  if (this.usePostgres) {
    return await memoryRepo.searchPosts(userId, options);
  } else {
    const searchPattern = `%${query}%`;

    const countResult = this.sqliteDb.prepare(`
      SELECT COUNT(*) as total FROM agent_posts
      WHERE title LIKE ? COLLATE NOCASE
         OR content LIKE ? COLLATE NOCASE
         OR authorAgent LIKE ? COLLATE NOCASE
    `).get(searchPattern, searchPattern, searchPattern);

    const posts = this.sqliteDb.prepare(`
      SELECT * FROM agent_posts
      WHERE title LIKE ? COLLATE NOCASE
         OR content LIKE ? COLLATE NOCASE
         OR authorAgent LIKE ? COLLATE NOCASE
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT ? OFFSET ?
    `).all(searchPattern, searchPattern, searchPattern, limit, offset);

    return { posts, total: countResult.total };
  }
}
```

### 2. Update server.js endpoint

```javascript
app.get('/api/agent-posts', async (req, res) => {
  try {
    const { limit = 20, offset = 0, search = '', sortBy = 'publishedAt', sortOrder = 'DESC' } = req.query;
    const userId = req.query.userId || 'anonymous';

    const parsedLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
    const parsedOffset = Math.max(parseInt(offset) || 0, 0);
    const sanitizedSearch = search.trim();

    let posts, total;

    if (sanitizedSearch && sanitizedSearch.length > 0) {
      const result = await dbSelector.searchPosts(userId, {
        query: sanitizedSearch,
        limit: parsedLimit,
        offset: parsedOffset,
        sortBy,
        sortOrder
      });
      posts = result.posts || [];
      total = result.total || 0;
    } else {
      posts = await dbSelector.getAllPosts(userId, {
        limit: parsedLimit,
        offset: parsedOffset
      });
      total = posts.length;
    }

    res.json({
      success: true,
      data: posts,
      pagination: { limit: parsedLimit, offset: parsedOffset, total },
      search: sanitizedSearch || null
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch agent posts',
      details: error.message
    });
  }
});
```

## Test Database Setup

The tests automatically create an in-memory SQLite database with:

```sql
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

### Test Data
5 sample posts are seeded:
1. "Introduction to TDD" by CodeMaster
2. "JavaScript Best Practices" by JSExpert
3. "Python for Data Science" by DataBot
4. "Advanced Testing Strategies" by TestGuru
5. "CodeMaster Tips and Tricks" by CodeMaster

## Expected Test Results

```
✓ GET /api/agent-posts?search=query - London School TDD (41 tests)
  ✓ 1. Basic Search - Returns Matching Posts (3 tests)
  ✓ 2. Case-Insensitive Search (3 tests)
  ✓ 3. Empty Query Returns All Posts (3 tests)
  ✓ 4. Search Scope - Searches Multiple Fields (4 tests)
  ✓ 5. Partial Word Matching (4 tests)
  ✓ 6. Pagination with Search (6 tests)
  ✓ 7. Edge Cases (6 tests)
  ✓ 8. Response Format Matches /api/agent-posts (6 tests)
  ✓ 9. Error Handling (4 tests)

✓ GET /api/agent-posts?search=query - Real Database Integration (11 tests)
  ✓ Real Search Functionality (10 tests)
  ✓ Performance Considerations (1 test)

Test Files  1 passed (1)
     Tests  52 passed (52)
  Duration  329ms
```

## Debugging Failed Tests

### If tests fail, check:

1. **Database connection**:
   ```javascript
   console.log('DB connected:', db);
   ```

2. **Search parameters**:
   ```javascript
   console.log('Search query:', sanitizedSearch);
   console.log('Limit:', parsedLimit, 'Offset:', parsedOffset);
   ```

3. **SQL query**:
   ```javascript
   console.log('Executing query:', query);
   console.log('With params:', searchPattern);
   ```

4. **Response format**:
   ```javascript
   console.log('Response:', JSON.stringify(response.body, null, 2));
   ```

## Common Issues

### Issue: "Cannot find module 'express'"
**Solution**: Run `npm install` in api-server directory

### Issue: "Database locked"
**Solution**: Tests use in-memory DB (`:memory:`), so this shouldn't happen. Check if multiple test processes are running.

### Issue: "Mock function not called"
**Solution**: Verify the endpoint is using the mocked collaborator. Check the test setup in `beforeEach()`.

## Test Coverage

Run with coverage to see detailed metrics:

```bash
npm test -- tests/search-endpoint.test.js --coverage
```

Expected coverage:
- **Statements**: 100%
- **Branches**: 100%
- **Functions**: 100%
- **Lines**: 100%

## Next Steps After Tests Pass

1. ✅ Verify tests pass with real database
2. ✅ Test with production data
3. ✅ Add search to frontend UI
4. ✅ Implement FTS5 for better performance
5. ✅ Add search analytics

---

**Quick Commands Summary**:

```bash
# Run tests
npm test -- tests/search-endpoint.test.js

# Watch mode (re-run on file changes)
npm test -- tests/search-endpoint.test.js --watch

# Run single test
npm test -- tests/search-endpoint.test.js -t "should search and return matching posts"

# Run tests matching pattern
npm test -- tests/search-endpoint.test.js -t "pagination"
```
