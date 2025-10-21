# createPost Fix - Quick Reference

## What Was Fixed

**File:** `/workspaces/agent-feed/api-server/config/database-selector.js`
**Method:** `createPost` (lines 208-243)
**Issue:** Used wrong column names (snake_case instead of camelCase)

## The Fix (One-Liner)

Changed SQL INSERT from snake_case columns to camelCase columns matching actual database schema.

## Before vs After

### BEFORE (BROKEN)
```javascript
// ❌ WRONG - These columns don't exist
INSERT INTO agent_posts (id, author_agent, content, title, tags, published_at)
VALUES (?, ?, ?, ?, ?, datetime('now'))
```

### AFTER (FIXED)
```javascript
// ✅ CORRECT - Uses actual camelCase columns
INSERT INTO agent_posts (id, authorAgent, content, title, publishedAt, metadata, engagement)
VALUES (?, ?, ?, ?, ?, ?, ?)
```

## Key Changes

| Change | Before | After |
|--------|--------|-------|
| Column 1 | `author_agent` | `authorAgent` ✅ |
| Column 2 | `published_at` | `publishedAt` ✅ |
| Column 3 | `tags` | `metadata` ✅ |
| Column 4 | (missing) | `engagement` ✅ |
| Timestamp | `datetime('now')` | `new Date().toISOString()` ✅ |
| Tags storage | Separate column | Inside metadata JSON ✅ |

## Database Schema

```sql
-- Actual agent_posts table columns (camelCase)
id              TEXT PRIMARY KEY
authorAgent     TEXT NOT NULL     -- NOT author_agent
content         TEXT NOT NULL
title           TEXT NOT NULL
publishedAt     TEXT NOT NULL     -- NOT published_at (ISO 8601)
metadata        TEXT NOT NULL     -- JSON with tags array
engagement      TEXT NOT NULL     -- JSON with metrics
created_at      DATETIME
last_activity_at DATETIME
```

## How It Works Now

### 1. Request comes in (snake_case is OK)
```javascript
{
  "author_agent": "Avi",
  "content": "Post content",
  "tags": ["productivity"]
}
```

### 2. createPost merges metadata
```javascript
const metadata = {
  ...(postData.metadata || {}),
  tags: postData.tags || []
};
```

### 3. INSERT uses camelCase columns
```javascript
insert.run(
  postId,
  postData.author_agent,  // → authorAgent column
  postData.content,       // → content column
  postData.title || '',   // → title column
  new Date().toISOString(), // → publishedAt column
  JSON.stringify(metadata),  // → metadata column
  JSON.stringify({ comments: 0, likes: 0, shares: 0, views: 0 }) // → engagement column
);
```

### 4. Post stored correctly
```javascript
{
  "id": "post-123",
  "authorAgent": "Avi",         // camelCase ✅
  "publishedAt": "2025-10-21T04:17:05.938Z",  // ISO 8601 ✅
  "metadata": "{\"tags\":[\"productivity\"]}",  // JSON ✅
  "engagement": "{\"comments\":0,...}"  // JSON ✅
}
```

## Test Coverage

✅ **12 Integration Tests** - All passing
✅ **1 Manual Test** - Validated end-to-end
✅ **Schema Compliance** - Matches SPARC spec

## Validation Commands

```bash
# Run integration tests
npm test -- tests/integration/createPost-fix-validation.test.js

# Run manual functional test
node tests/manual/test-createPost-fix.js

# Check database schema
sqlite3 /workspaces/agent-feed/database.db "PRAGMA table_info(agent_posts);"
```

## Important Notes

1. **API Compatibility:** No changes needed for API clients - they can still use snake_case `author_agent` in requests
2. **Database Storage:** All data stored with camelCase column names
3. **Tags Location:** Tags moved from separate column to `metadata.tags` JSON path
4. **Timestamp Format:** Now uses ISO 8601 instead of SQLite datetime
5. **Engagement Init:** Auto-initializes engagement metrics to zero

## Quick Checklist

- [x] ✅ SQL uses camelCase columns (authorAgent, publishedAt)
- [x] ✅ Tags stored in metadata.tags
- [x] ✅ Engagement initialized correctly
- [x] ✅ ISO 8601 timestamps
- [x] ✅ All tests passing
- [x] ✅ Backward compatible with API

## Files to Review

- **Implementation:** `/workspaces/agent-feed/api-server/config/database-selector.js` (lines 208-243)
- **Tests:** `/workspaces/agent-feed/tests/integration/createPost-fix-validation.test.js`
- **Manual Test:** `/workspaces/agent-feed/tests/manual/test-createPost-fix.js`
- **Full Summary:** `/workspaces/agent-feed/CREATEPOST-FIX-SUMMARY.md`

## Status

🟢 **COMPLETE** - All tests passing, production ready
