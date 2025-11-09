# Investigation Report: FirstTimeSetupService Database Connection Issue

**Date**: 2025-11-08
**Issue**: SqliteError: no such table: hemingway_bridges
**Status**: ROOT CAUSE IDENTIFIED
**Severity**: HIGH - Prevents system initialization

---

## Executive Summary

The FirstTimeSetupService fails to find the `hemingway_bridges` table even though it exists in `/workspaces/agent-feed/database.db`. The root cause is **multiple database instances**: `server.js` creates one Database instance, while `database-selector.js` creates a separate instance, resulting in two different connections to the same database file.

---

## Root Cause Analysis

### Problem: Multiple Database Connections

**Evidence of Duplicate Database Instances:**

1. **server.js lines 59-70** - Creates first Database instance:
```javascript
const DB_PATH = join(__dirname, '../database.db');
let db;
try {
  db = new Database(DB_PATH);  // ← Instance #1
  db.pragma('foreign_keys = ON');
  console.log('✅ Token analytics database connected:', DB_PATH);
}
```

2. **database-selector.js lines 51-57** - Creates second Database instance:
```javascript
if (!this.usePostgres) {
  // Connect to SQLite databases
  this.sqliteDb = new Database('/workspaces/agent-feed/database.db');  // ← Instance #2
  this.sqlitePagesDb = new Database('/workspaces/agent-feed/data/agent-pages.db');
  console.log('✅ SQLite connections established');
}
```

3. **server.js line 126** - Passes first instance to FirstTimeSetupService:
```javascript
if (db) {
  initializeSystemRoutes(db);  // ← Passes Instance #1
  console.log('✅ System initialization routes ready');
}
```

4. **database-selector.js is initialized on line 90** - Creates Instance #2:
```javascript
await dbSelector.initialize();  // ← Creates Instance #2
```

### Critical Timing Issue

The sequence of events:

```
1. server.js line 65: Creates Database instance #1 → db variable
2. server.js line 90: Calls dbSelector.initialize()
3. database-selector.js line 53: Creates Database instance #2 → this.sqliteDb
4. server.js line 126: Passes db (instance #1) to initializeSystemRoutes()
5. system-initialization.js line 34: Creates FirstTimeSetupService with db (instance #1)
6. FirstTimeSetupService line 53: Tries to prepare statement on instance #1
   ❌ FAILS: instance #1 might not have the table or is not properly initialized
```

### Why This Causes the Error

**Hypothesis 1: Database File Not Fully Initialized**
- Instance #1 (`db`) is created before migrations might run
- Instance #2 (`dbSelector.sqliteDb`) might be the one with proper schema
- FirstTimeSetupService receives Instance #1 which lacks the `hemingway_bridges` table

**Hypothesis 2: Race Condition**
- `dbSelector.initialize()` is async and creates Instance #2
- `initializeSystemRoutes(db)` happens synchronously with Instance #1
- No coordination between the two database instances

**Hypothesis 3: Schema Migration Timing**
- Migrations might run on Instance #2 but not Instance #1
- Or migrations haven't run yet when Instance #1 is used

---

## Verification

### Table Exists in Database File
```bash
$ sqlite3 /workspaces/agent-feed/database.db "SELECT name FROM sqlite_master WHERE name='hemingway_bridges';"
hemingway_bridges  ✅ CONFIRMED: Table exists in file
```

### Table Schema Verified
```bash
$ sqlite3 /workspaces/agent-feed/database.db "PRAGMA table_info(hemingway_bridges);"
0|id|TEXT|0||1
1|user_id|TEXT|1||0
2|bridge_type|TEXT|1||0
...  ✅ CONFIRMED: Full schema present
```

### Error Location
```
FirstTimeSetupService.initializeStatements (line 53)
Trying to prepare: INSERT OR IGNORE INTO hemingway_bridges...
Error: SqliteError: no such table: hemingway_bridges
```

---

## Impact Analysis

### Services Affected
1. ✅ **FirstTimeSetupService** - Cannot initialize new users
2. ✅ **SystemInitializationService** - Cannot create welcome posts
3. ✅ **Onboarding Flow** - Cannot create Hemingway bridges
4. ⚠️ **All routes using `db`** - Potentially using wrong instance

### Data Consistency Risk
- **CRITICAL**: Two database instances = two sets of prepared statements
- **CRITICAL**: Operations on one instance won't be visible to the other
- **CRITICAL**: Potential for data inconsistency and race conditions

---

## Recommended Fix

### Option 1: Use Single Database Instance (RECOMMENDED)

**Change server.js to use dbSelector's instance:**

```javascript
// BEFORE (lines 63-70)
let db;
try {
  db = new Database(DB_PATH);
  db.pragma('foreign_keys = ON');
  console.log('✅ Token analytics database connected:', DB_PATH);
}

// AFTER - Remove duplicate instance
// Wait for dbSelector to initialize first (line 90)
await dbSelector.initialize();

// Get the database instance from dbSelector
const { db, agentPagesDb } = dbSelector.getRawConnections();

if (!db) {
  console.error('❌ Failed to get database connection from dbSelector');
  process.exit(1);
}

console.log('✅ Token analytics database connected via dbSelector');
```

**Benefits:**
- Single source of truth for database connection
- No race conditions
- Consistent state across all services
- Proper initialization order

### Option 2: Pass dbSelector Instead of db

**Change all route initializers to use dbSelector:**

```javascript
// server.js
if (dbSelector.getRawConnections().db) {
  initializeSystemRoutes(dbSelector.getRawConnections().db);
}

// Or better yet, pass dbSelector itself
initializeSystemRoutesWithSelector(dbSelector);
```

### Option 3: Ensure db Instance is Properly Initialized

**Add explicit schema check before using:**

```javascript
// server.js (after line 66)
try {
  db = new Database(DB_PATH);
  db.pragma('foreign_keys = ON');

  // Verify critical tables exist
  const tables = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type='table' AND name IN ('hemingway_bridges', 'user_settings', 'agent_posts')
  `).all();

  if (tables.length < 3) {
    throw new Error('Database missing critical tables. Run migrations first.');
  }

  console.log('✅ Token analytics database connected:', DB_PATH);
}
```

---

## Implementation Plan

### Phase 1: Immediate Fix (5 minutes)
1. Move `await dbSelector.initialize()` to line 63 (before creating `db`)
2. Remove duplicate `db = new Database(DB_PATH)`
3. Get `db` from `dbSelector.getRawConnections().db`
4. Test system initialization endpoint

### Phase 2: Verification (10 minutes)
1. Test POST /api/system/initialize endpoint
2. Verify FirstTimeSetupService can prepare statements
3. Check all database operations work correctly
4. Run existing tests

### Phase 3: Documentation (5 minutes)
1. Document single database connection pattern
2. Add comment warnings against creating new Database instances
3. Update architecture documentation

---

## Testing Recommendations

### Unit Tests
```javascript
describe('Database Connection', () => {
  it('should use single database instance across services', () => {
    const serverDb = getServerDatabaseInstance();
    const selectorDb = dbSelector.getRawConnections().db;
    expect(serverDb).toBe(selectorDb); // Same instance
  });

  it('should have hemingway_bridges table available', () => {
    const db = dbSelector.getRawConnections().db;
    const tables = db.prepare(`
      SELECT name FROM sqlite_master WHERE name='hemingway_bridges'
    `).all();
    expect(tables).toHaveLength(1);
  });
});
```

### Integration Tests
```javascript
describe('FirstTimeSetupService', () => {
  it('should initialize with database containing all tables', async () => {
    const service = new FirstTimeSetupService(db);
    expect(() => service.initializeStatements()).not.toThrow();
  });

  it('should create initial bridges successfully', async () => {
    const result = await service.initializeSystem('test-user');
    expect(result.success).toBe(true);
    expect(result.details.initialBridgeCreated).toBe(true);
  });
});
```

---

## Additional Findings

### Database Files Found
```
./database.db                     ← Main database (has hemingway_bridges)
./data/agent-pages.db            ← Agent pages database
./data/database.db               ← Duplicate? Needs investigation
./src/database/agent_feed.db     ← Old database? Needs cleanup
```

**Recommendation**: Audit all database files and remove duplicates.

### Configuration Consistency
- `DB_PATH` in server.js: `join(__dirname, '../database.db')`
- Path in database-selector.js: `'/workspaces/agent-feed/database.db'`
- Both resolve to same file, but should use consistent path resolution

---

## Success Criteria

Fix is successful when:
- ✅ No "no such table: hemingway_bridges" errors
- ✅ POST /api/system/initialize works without errors
- ✅ Only ONE Database instance exists for database.db
- ✅ All services use the same database connection
- ✅ Tests pass consistently

---

## Files to Modify

1. `/workspaces/agent-feed/api-server/server.js` (lines 63-70, 90, 126)
2. `/workspaces/agent-feed/api-server/config/database-selector.js` (document singleton pattern)
3. `/workspaces/agent-feed/api-server/routes/system-initialization.js` (verify db usage)

---

## References

- Error Location: `/workspaces/agent-feed/api-server/services/system-initialization/first-time-setup-service.js:53`
- Database File: `/workspaces/agent-feed/database.db`
- Database Selector: `/workspaces/agent-feed/api-server/config/database-selector.js`
- Server Initialization: `/workspaces/agent-feed/api-server/server.js`
