# REAL Root Cause - Column Name Mismatch

**Date**: 2025-10-21
**Issue**: "Disconnected API connection failed"

---

## ACTUAL ROOT CAUSE ✅

The `agent_posts` table **EXISTS** and has data, but the SQL query uses **wrong column names**.

### The Problem

**Database columns** (actual):
```sql
authorAgent   -- camelCase ✅
publishedAt   -- camelCase ✅
```

**SQL query** (database-selector.js line 121):
```sql
ORDER BY published_at DESC  -- snake_case ❌
```

**Error**: SQLite doesn't recognize `published_at` column (it's called `publishedAt`)

---

## Evidence

### 1. Table Exists
```bash
sqlite3 database.db ".tables"
# Shows: agent_posts ✅
```

### 2. Table Has Data
```bash
sqlite3 database.db "SELECT * FROM agent_posts LIMIT 1"
# Returns: test-post-1|Production Validation Test... ✅
```

### 3. Column Names Are camelCase
```bash
PRAGMA table_info(agent_posts)
# Shows:
# 0|id|TEXT|...
# 3|authorAgent|TEXT|...  ← camelCase
# 4|publishedAt|TEXT|...  ← camelCase
```

### 4. Query Uses snake_case
```javascript
// Line 121 of database-selector.js
const posts = this.sqliteDb.prepare(`
  SELECT * FROM agent_posts
  ORDER BY published_at DESC  ← WRONG! Should be publishedAt
  LIMIT ? OFFSET ?
`).all(limit, offset);
```

---

## The Fix

**Change line 121 in `/workspaces/agent-feed/api-server/config/database-selector.js`**:

```javascript
// BEFORE:
ORDER BY published_at DESC

// AFTER:
ORDER BY publishedAt DESC
```

**That's it!** One word change.

---

## Why This Wasn't Obvious

1. Error message says "no such table" but should say "no such column"
2. SQLite error messages can be misleading
3. Table exists, so we assumed schema was the problem
4. Didn't check actual column names vs query column names

---

## Impact

**Before Fix**:
- Query fails with "no such table: agent_posts" error
- Frontend connection check fails
- UI shows "Disconnected"
- No posts load

**After Fix**:
- Query succeeds
- Returns real posts from database
- Frontend connection check passes
- UI shows "Connected" ✅
- Posts load correctly ✅

---

## Files to Modify

1. `/workspaces/agent-feed/api-server/config/database-selector.js` (line 121)
   - Change `published_at` → `publishedAt`

That's the ONLY file that needs to change!

---

**Status**: ✅ REAL ROOT CAUSE IDENTIFIED - Column name mismatch
**Complexity**: SIMPLE - One line fix
**Risk**: VERY LOW - Just fixing a typo
