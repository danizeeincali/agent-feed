# TDD London School - Database Selector Column Names Test Suite

## Test Status: ❌ FAILING (AS EXPECTED)

### Test File
- **Location**: `/workspaces/agent-feed/tests/integration/database-selector-column-names.test.js`
- **Module Under Test**: `/workspaces/agent-feed/backend/services/database-selector.js`
- **Test Approach**: TDD London School (Outside-In, Behavior-Driven)
- **Database**: `/workspaces/agent-feed/data/agent-pages.db` (SQLite)

## Test Results Summary

### Passing Tests (10/17) ✅
1. ✅ Should execute query without column name errors
2. ✅ Should return null for non-existent post ID
3. ✅ Should handle post retrieval without errors
4. ✅ Should create post with correct column mapping
5. ✅ Should return 200 OK from API endpoint
6. ✅ Should successfully query database directly
7. ✅ Should return valid data structure for frontend consumption
8. ✅ Should handle empty result set gracefully
9. ✅ Should handle malformed post IDs
10. ✅ Should validate column name consistency across operations

### Failing Tests (7/17) ❌
1. ❌ Should return posts ordered by publishedAt descending
2. ❌ Should return posts with correct camelCase column names
3. ❌ Should return posts with correct data types
4. ❌ Should return publishedAt as valid ISO 8601 date string
5. ❌ Should retrieve post by ID with correct column names
6. ❌ Should retrieve created post with correct column names
7. ❌ Should return posts with camelCase columns from API
8. ❌ Should return properly ordered posts from API

## Root Cause Analysis

### The Bug
The `getAllPosts()` and `getPostById()` methods use `SELECT *` which returns database column names AS-IS:

```javascript
// Current implementation (BROKEN)
async getAllPosts() {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT * FROM posts
      ORDER BY published_at DESC
    `;
    // Returns: { agent_name, agent_title, published_at, ... }
  });
}
```

### Database Schema
```sql
CREATE TABLE posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_name TEXT NOT NULL,          -- snake_case
  agent_title TEXT NOT NULL,         -- snake_case
  agent_avatar TEXT,
  content TEXT NOT NULL,
  published_at TEXT NOT NULL,        -- snake_case
  likes INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  image_url TEXT,                    -- snake_case
  category TEXT NOT NULL,
  outcomes TEXT
);
```

### Expected Output (Frontend Expects)
```javascript
{
  id: 1,
  agentName: 'Avi',           // camelCase
  agentTitle: 'Digital Marketing Specialist',
  agentAvatar: '/avatars/avi.png',
  content: 'Just launched a new campaign!',
  publishedAt: '2025-10-21T10:00:00Z',  // camelCase
  likes: 42,
  shares: 12,
  comments: 8,
  imageUrl: null,             // camelCase
  category: 'Marketing',
  outcomes: 'Campaign reached 10k impressions'
}
```

### Actual Output (Current)
```javascript
{
  id: 1,
  agent_name: 'Avi',           // snake_case ❌
  agent_title: 'Digital Marketing Specialist',
  agent_avatar: '/avatars/avi.png',
  content: 'Just launched a new campaign!',
  published_at: '2025-10-21T10:00:00Z',  // snake_case ❌
  likes: 42,
  shares: 12,
  comments: 8,
  image_url: null,             // snake_case ❌
  category: 'Marketing',
  outcomes: 'Campaign reached 10k impressions'
}
```

## The Fix Required

Replace `SELECT *` with explicit column aliases:

```javascript
// Fixed implementation (TO BE IMPLEMENTED)
async getAllPosts() {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT
        id,
        agent_name as agentName,
        agent_title as agentTitle,
        agent_avatar as agentAvatar,
        content,
        published_at as publishedAt,
        likes,
        shares,
        comments,
        image_url as imageUrl,
        category,
        outcomes
      FROM posts
      ORDER BY published_at DESC
    `;
    // Returns: { agentName, agentTitle, publishedAt, ... } ✅
  });
}
```

## Test Coverage

### 1. Query Execution Tests
- ✅ Tests that queries execute without errors
- ❌ Tests column name transformation (snake_case → camelCase)
- ❌ Tests data ordering by publishedAt

### 2. Column Name Tests
- ❌ Verifies all columns use camelCase
- ❌ Ensures no snake_case columns exist in results
- ❌ Tests consistency across getAllPosts() and getPostById()

### 3. Data Type Tests
- ❌ Validates publishedAt is a valid ISO 8601 string
- Tests proper data types for all fields

### 4. API Integration Tests
- ✅ Tests /api/agent-posts endpoint returns 200 OK
- ❌ Verifies API returns camelCase column names
- ❌ Tests API response ordering

### 5. Edge Cases
- ✅ Tests empty result sets
- ✅ Tests malformed IDs
- ✅ Tests null handling

## Sample Test Data

The database contains 3 test posts:

1. **Avi** - Digital Marketing Specialist
   - Published: 2025-10-21T10:00:00Z
   - 42 likes, 12 shares, 8 comments

2. **Claude** - AI Assistant
   - Published: 2025-10-21T09:00:00Z
   - 35 likes, 5 shares, 12 comments

3. **Test Agent** - Test Specialist
   - Published: 2025-10-21T08:00:00Z
   - 10 likes, 2 shares, 3 comments

## Next Steps (TDD Red-Green-Refactor)

### Current Stage: 🔴 RED
Tests are written and failing as expected.

### Next Stage: 🟢 GREEN
1. Fix `getAllPosts()` to use column aliases
2. Fix `getPostById()` to use column aliases
3. Run tests - should now PASS
4. Verify API endpoint returns correct data

### Final Stage: 🔵 REFACTOR
1. Extract column mapping to shared constant
2. Add type definitions for Post interface
3. Consider creating a QueryBuilder utility
4. Add performance tests

## Running the Tests

```bash
# Run the test suite
npm test -- tests/integration/database-selector-column-names.test.js

# Watch mode
npm test -- --watch tests/integration/database-selector-column-names.test.js

# With coverage
npm test -- --coverage tests/integration/database-selector-column-names.test.js
```

## Files Created

1. `/workspaces/agent-feed/tests/integration/database-selector-column-names.test.js` (11,953 bytes)
   - 17 comprehensive integration tests
   - Tests against real database
   - No mocks (London School principle)

2. `/workspaces/agent-feed/backend/services/database-selector.js` (3,627 bytes)
   - Module under test
   - Contains the bug (SELECT *)
   - Ready for fix

3. `/workspaces/agent-feed/backend/server.js` (1,512 bytes)
   - Express API for integration testing
   - Endpoints: GET /api/agent-posts, GET /api/agent-posts/:id, POST /api/agent-posts

## TDD London School Principles Applied

1. ✅ **Outside-In Development**: Started with API endpoint tests, worked down to database layer
2. ✅ **Behavior Verification**: Tests verify the interaction between API and database
3. ✅ **Real Integration**: Uses real database, real HTTP requests, NO MOCKS
4. ✅ **Contract Definition**: Tests define the expected contract (camelCase column names)
5. ✅ **Red-Green-Refactor**: Currently in RED phase, ready for GREEN

## Expected Impact

Once fixed, the following will work correctly:
- ✅ Frontend can read posts with camelCase properties
- ✅ API returns consistent naming convention
- ✅ Database queries are properly ordered
- ✅ Type safety improved (correct property names)
- ✅ All 17 tests pass

---

**Test Suite Created**: October 21, 2025
**TDD Approach**: London School (Outside-In)
**Status**: Ready for implementation (RED phase complete)
