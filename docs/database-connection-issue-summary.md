# Database Connection Issue - Executive Summary

**Date**: 2025-11-08
**Issue**: FirstTimeSetupService cannot find hemingway_bridges table
**Severity**: HIGH
**Status**: ROOT CAUSE IDENTIFIED - FIX READY

---

## The Problem in 30 Seconds

The application creates **TWO separate database connections** to the same `database.db` file:
- Instance #1: Created in `server.js` line 65
- Instance #2: Created in `database-selector.js` line 53

FirstTimeSetupService receives Instance #1, which may not have the table or proper initialization, causing the error.

---

## Root Cause

**Duplicate Database Instances:**

```javascript
// server.js (line 65) - Instance #1
db = new Database(DB_PATH);

// database-selector.js (line 53) - Instance #2
this.sqliteDb = new Database('/workspaces/agent-feed/database.db');

// server.js (line 126) - Uses Instance #1
initializeSystemRoutes(db);  // ← Gets wrong instance!
```

**Why This Breaks:**
- Two instances = Two separate connections
- No shared state between connections
- Table may exist in file but not visible to wrong instance
- Race condition: initialization order matters

---

## Evidence

✅ **Table EXISTS in database file:**
```bash
$ sqlite3 /workspaces/agent-feed/database.db "SELECT name FROM sqlite_master WHERE name='hemingway_bridges';"
hemingway_bridges
```

❌ **But FirstTimeSetupService can't see it:**
```
SqliteError: no such table: hemingway_bridges
  at FirstTimeSetupService.initializeStatements (line 53)
```

---

## The Fix (Simple)

**Replace lines 63-90 in server.js:**

```javascript
// OLD: Creates separate instance
let db;
try {
  db = new Database(DB_PATH);  // ❌ Duplicate instance!
  db.pragma('foreign_keys = ON');
}
// ... later ...
await dbSelector.initialize();  // ❌ Creates another instance!

// NEW: Use single instance from dbSelector
await dbSelector.initialize();  // ✅ Create ONE instance first
const { db, agentPagesDb } = dbSelector.getRawConnections();  // ✅ Get it
if (db) {
  db.pragma('foreign_keys = ON');  // ✅ Use it
  console.log('✅ Database connected via dbSelector');
}
```

**That's it!** Remove duplicate Database creation, use dbSelector's instance everywhere.

---

## Impact

**Broken Services:**
- ❌ FirstTimeSetupService (cannot initialize new users)
- ❌ SystemInitializationService (cannot create welcome posts)
- ❌ Onboarding flow (cannot create Hemingway bridges)
- ⚠️ Any service using the wrong `db` instance

**Fixed After Patch:**
- ✅ Single database instance
- ✅ All services see same state
- ✅ No race conditions
- ✅ Proper initialization order

---

## Implementation Steps

1. **Modify server.js** (5 minutes)
   - Move `await dbSelector.initialize()` to line 63
   - Remove `db = new Database(DB_PATH)`
   - Get `db` from `dbSelector.getRawConnections().db`

2. **Test** (5 minutes)
   ```bash
   npm start
   # Should see: ✅ Database connected via dbSelector

   curl -X POST http://localhost:3001/api/system/initialize \
     -H "Content-Type: application/json" \
     -d '{"userId":"test-user","confirmReset":true}'
   # Should succeed without "no such table" error
   ```

3. **Verify** (2 minutes)
   - Check logs for single database connection
   - No duplicate instance warnings
   - All endpoints work

---

## Files Changed

- ✏️ `/workspaces/agent-feed/api-server/server.js` (lines 63-90)
  - Remove duplicate Database instantiation
  - Use dbSelector.getRawConnections()

That's the only file that needs changes!

---

## Testing Checklist

After applying fix:

- [ ] Server starts without errors
- [ ] No "no such table: hemingway_bridges" errors
- [ ] POST /api/system/initialize succeeds
- [ ] Logs show single database instance
- [ ] All critical tables verified at startup
- [ ] Existing tests pass

---

## Detailed Documentation

For complete analysis and implementation details, see:

1. **Investigation Report**: `/workspaces/agent-feed/docs/investigation-hemingway-bridges-database-error.md`
   - Full root cause analysis
   - Timeline of events
   - Verification steps

2. **Fix Implementation**: `/workspaces/agent-feed/docs/fix-database-connection-duplicate.md`
   - Complete code diff
   - Testing procedures
   - Rollback plan

---

## Recommendation

**Apply the fix immediately.** This is a critical bug that prevents:
- New user onboarding
- System initialization
- Welcome post creation
- Hemingway bridge functionality

The fix is low-risk (consolidates to single instance) and takes ~10 minutes to implement and test.

---

## Questions?

- **Q: Why not just fix FirstTimeSetupService?**
  A: Band-aid. The real issue is duplicate instances affecting all services.

- **Q: Is this safe?**
  A: Yes. We're removing redundancy, not changing functionality.

- **Q: What if it breaks something?**
  A: Rollback is instant: `git checkout HEAD -- api-server/server.js`

- **Q: Why did this happen?**
  A: Natural evolution - dbSelector was added later, but old db instance wasn't removed.

---

**TL;DR**: Two database instances instead of one. Fix: Use dbSelector's instance everywhere. 10-minute fix for critical bug.
