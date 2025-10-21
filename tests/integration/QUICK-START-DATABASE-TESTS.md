# Quick Start - Database Selector Column Name Tests

## TL;DR

**Status**: 🔴 Tests FAILING (as expected - TDD Red phase)
**Issue**: Database returns `snake_case` columns, frontend expects `camelCase`
**Fix**: Replace `SELECT *` with explicit column aliases

## Run Tests

```bash
# Run the test suite
npm test -- tests/integration/database-selector-column-names.test.js

# Expected: 7/17 tests failing
```

## Current Failures

```
❌ Should return posts ordered by publishedAt descending
❌ Should return posts with correct camelCase column names
❌ Should return posts with correct data types
❌ Should return publishedAt as valid ISO 8601 date string
❌ Should retrieve post by ID with correct column names
❌ Should retrieve created post with correct column names
❌ Should return posts with camelCase columns from API
```

## The Fix

Edit `/workspaces/agent-feed/backend/services/database-selector.js`:

### Fix 1: getAllPosts()

Replace line 40-46:
```javascript
// BEFORE (BROKEN)
const query = `
  SELECT * FROM posts
  ORDER BY published_at DESC
`;
```

With:
```javascript
// AFTER (FIXED)
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
```

### Fix 2: getPostById()

Replace line 62:
```javascript
// BEFORE (BROKEN)
const query = `SELECT * FROM posts WHERE id = ?`;
```

With:
```javascript
// AFTER (FIXED)
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
  WHERE id = ?
`;
```

## Verify Fix

```bash
# Run tests again
npm test -- tests/integration/database-selector-column-names.test.js

# Expected: 17/17 tests PASSING ✅
```

## Files

- **Test File**: `/workspaces/agent-feed/tests/integration/database-selector-column-names.test.js`
- **Code Under Test**: `/workspaces/agent-feed/backend/services/database-selector.js`
- **API Server**: `/workspaces/agent-feed/backend/server.js`
- **Database**: `/workspaces/agent-feed/data/agent-pages.db`

## Test Coverage

✅ 17 comprehensive tests covering:
- Query execution without errors
- Column name transformation (snake_case → camelCase)
- Data ordering by publishedAt
- Single post retrieval
- Post creation
- API endpoint integration
- Error handling and edge cases

## TDD Workflow

1. 🔴 **RED**: Tests written and failing ← YOU ARE HERE
2. 🟢 **GREEN**: Apply the fix above, tests pass
3. 🔵 **REFACTOR**: Extract column mapping to constant (optional)

---

**Quick Action**: Copy the "AFTER (FIXED)" SQL queries into the database-selector.js file, then re-run tests.
