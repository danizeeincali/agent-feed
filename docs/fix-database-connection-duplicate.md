# Fix Implementation: Database Connection Duplication

## Problem Statement
Two separate Database instances are created for the same database file, causing the FirstTimeSetupService to fail with "no such table: hemingway_bridges" error.

## Solution
Consolidate to a single database instance managed by `database-selector.js`.

---

## Implementation Steps

### Step 1: Modify server.js

**Current Code (lines 63-70):**
```javascript
let db;
try {
  db = new Database(DB_PATH);
  db.pragma('foreign_keys = ON');
  console.log('✅ Token analytics database connected:', DB_PATH);
} catch (error) {
  console.error('❌ Token analytics database error:', error);
}
```

**New Code:**
```javascript
// Initialize database selector FIRST (must be before db usage)
await dbSelector.initialize();

// Get database instance from selector (single source of truth)
const dbConnections = dbSelector.getRawConnections();
const db = dbConnections.db;

if (!db) {
  console.error('❌ Failed to get database connection from dbSelector');
  console.error('⚠️  Database selector mode:', process.env.USE_POSTGRES === 'true' ? 'PostgreSQL' : 'SQLite');
  // Don't exit - some features may still work
}

// Enable foreign keys if we got a SQLite instance
if (db) {
  try {
    db.pragma('foreign_keys = ON');
    console.log('✅ Token analytics database connected via dbSelector');

    // Verify critical tables exist
    const criticalTables = ['hemingway_bridges', 'user_settings', 'agent_posts'];
    const existingTables = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name IN (${criticalTables.map(() => '?').join(',')})
    `).all(...criticalTables);

    if (existingTables.length === criticalTables.length) {
      console.log('✅ All critical tables verified:', existingTables.map(t => t.name).join(', '));
    } else {
      const missing = criticalTables.filter(t => !existingTables.find(e => e.name === t));
      console.warn('⚠️  Missing tables:', missing.join(', '));
      console.warn('⚠️  Run migrations to create missing tables');
    }
  } catch (error) {
    console.error('❌ Database verification error:', error);
  }
}
```

**Changes Required:**
1. Move line 90 `await dbSelector.initialize()` to BEFORE line 63
2. Replace lines 63-70 with new code above
3. Remove the old `db = new Database(DB_PATH)` statement

### Step 2: Update Line Order

**Current Order:**
```javascript
Line 63:  let db;
Line 64:  try {
Line 65:    db = new Database(DB_PATH);
...
Line 90:  await dbSelector.initialize();
```

**New Order:**
```javascript
Line 63:  // Initialize database selector FIRST
Line 64:  await dbSelector.initialize();
Line 65:
Line 66:  // Get database from selector (single instance)
Line 67:  const dbConnections = dbSelector.getRawConnections();
Line 68:  let db = dbConnections.db;
...
// Remove old line 90 dbSelector.initialize() call
```

### Step 3: Update agentPagesDb Connection

**Current Code (lines 72-80):**
```javascript
let agentPagesDb;
try {
  agentPagesDb = new Database(AGENT_PAGES_DB_PATH);
  agentPagesDb.pragma('foreign_keys = ON');
  console.log('✅ Agent pages database connected:', AGENT_PAGES_DB_PATH);
} catch (error) {
  console.error('❌ Agent pages database error:', error);
}
```

**New Code:**
```javascript
// Get agent pages database from selector (single instance)
let agentPagesDb = dbConnections.agentPagesDb;

if (agentPagesDb) {
  try {
    agentPagesDb.pragma('foreign_keys = ON');
    console.log('✅ Agent pages database connected via dbSelector');
  } catch (error) {
    console.error('❌ Agent pages database error:', error);
  }
}
```

### Step 4: Remove Duplicate Line 90

**Current:**
```javascript
// Line 90
await dbSelector.initialize();
```

**Action:** DELETE this line (already called earlier)

---

## Complete Code Diff

```diff
--- a/api-server/server.js
+++ b/api-server/server.js
@@ -60,21 +60,42 @@ const DB_PATH = join(__dirname, '../database.db');
 const AGENT_PAGES_DB_PATH = join(__dirname, '../data/agent-pages.db');
 const AGENT_PAGES_DIR = join(__dirname, '../data/agent-pages');

+// Initialize database selector FIRST (must be before db usage)
+await dbSelector.initialize();
+
+// Get database instances from selector (single source of truth)
+const dbConnections = dbSelector.getRawConnections();
 let db;
+let agentPagesDb;
+
 try {
-  db = new Database(DB_PATH);
-  db.pragma('foreign_keys = ON');
-  console.log('✅ Token analytics database connected:', DB_PATH);
+  db = dbConnections.db;
+  agentPagesDb = dbConnections.agentPagesDb;
+
+  if (!db) {
+    throw new Error('Database connection not available from selector');
+  }
+
+  // Enable foreign keys for SQLite
+  db.pragma('foreign_keys = ON');
+  console.log('✅ Token analytics database connected via dbSelector');
+
+  // Verify critical tables exist
+  const criticalTables = ['hemingway_bridges', 'user_settings', 'agent_posts'];
+  const existingTables = db.prepare(`
+    SELECT name FROM sqlite_master
+    WHERE type='table' AND name IN (${criticalTables.map(() => '?').join(',')})
+  `).all(...criticalTables);
+
+  if (existingTables.length === criticalTables.length) {
+    console.log('✅ All critical tables verified:', existingTables.map(t => t.name).join(', '));
+  }
 } catch (error) {
-  console.error('❌ Token analytics database error:', error);
+  console.error('❌ Database initialization error:', error);
 }

-// Connect to agent pages database
-let agentPagesDb;
-try {
-  agentPagesDb = new Database(AGENT_PAGES_DB_PATH);
+// Enable foreign keys for agent pages database
+if (agentPagesDb) {
   agentPagesDb.pragma('foreign_keys = ON');
   console.log('✅ Agent pages database connected:', AGENT_PAGES_DB_PATH);
 } catch (error) {
@@ -87,9 +108,6 @@ console.log('✅ Proactive agent work queue initialized (SQLite for proactive a
 // Track file watcher for cleanup
 let fileWatcher = null;

-// Initialize database selector (PostgreSQL or SQLite based on environment)
-await dbSelector.initialize();
-
 // Initialize work queue selector (must be called after database connections are established)
 workQueueSelector.initialize(db);
 console.log('✅ Work queue selector initialized');
```

---

## Testing the Fix

### Test 1: Database Connection
```bash
# Start server and check logs
npm start

# Expected output:
# ✅ SQLite connections established
# ✅ Token analytics database connected via dbSelector
# ✅ All critical tables verified: hemingway_bridges, user_settings, agent_posts
# ✅ System initialization routes ready
```

### Test 2: System Initialization
```bash
# Test the initialization endpoint
curl -X POST http://localhost:3001/api/system/initialize \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user","confirmReset":true}'

# Expected: Success response (no table errors)
```

### Test 3: Verify Single Instance
Add temporary logging to verify single instance:

```javascript
// In server.js after getting db
console.log('Server db instance ID:', db.constructor.name, db);

// In first-time-setup-service.js constructor
console.log('Service db instance ID:', database.constructor.name, database);

// They should log the same instance
```

---

## Rollback Plan

If the fix causes issues:

1. **Revert server.js changes**
   ```bash
   git checkout HEAD -- api-server/server.js
   ```

2. **Quick fix alternative**: Add table check in FirstTimeSetupService
   ```javascript
   // first-time-setup-service.js line 26
   initializeStatements() {
     try {
       // Verify table exists first
       const tableCheck = this.db.prepare(`
         SELECT name FROM sqlite_master WHERE name='hemingway_bridges'
       `).get();

       if (!tableCheck) {
         throw new Error('hemingway_bridges table not found. Database may not be initialized.');
       }

       // Continue with normal initialization...
     }
   }
   ```

---

## Post-Implementation Checklist

- [ ] Server starts without errors
- [ ] No "no such table" errors in logs
- [ ] POST /api/system/initialize works
- [ ] All routes using `db` work correctly
- [ ] Tests pass
- [ ] No duplicate database instances created
- [ ] Foreign keys enabled on all connections
- [ ] Critical tables verified at startup

---

## Additional Improvements

### Add Database Health Check Endpoint

```javascript
// In system-initialization.js
router.get('/database/health', async (req, res) => {
  try {
    const criticalTables = ['hemingway_bridges', 'user_settings', 'agent_posts'];
    const existingTables = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name IN (${criticalTables.map(() => '?').join(',')})
    `).all(...criticalTables);

    const missing = criticalTables.filter(t => !existingTables.find(e => e.name === t));

    res.json({
      healthy: missing.length === 0,
      criticalTables,
      existingTables: existingTables.map(t => t.name),
      missingTables: missing,
      databaseMode: process.env.USE_POSTGRES === 'true' ? 'PostgreSQL' : 'SQLite'
    });
  } catch (error) {
    res.status(500).json({
      healthy: false,
      error: error.message
    });
  }
});
```

### Add Startup Validation

```javascript
// In server.js after database initialization
async function validateDatabaseSchema(db) {
  const requiredTables = [
    'hemingway_bridges',
    'user_settings',
    'agent_posts',
    'onboarding_state',
    'agent_introductions'
  ];

  const existing = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type='table' AND name IN (${requiredTables.map(() => '?').join(',')})
  `).all(...requiredTables);

  const missing = requiredTables.filter(t => !existing.find(e => e.name === t));

  if (missing.length > 0) {
    console.error('❌ Missing required tables:', missing);
    console.error('⚠️  Run migrations before starting server');
    return false;
  }

  return true;
}

// Call after database connection
if (db && !await validateDatabaseSchema(db)) {
  console.error('❌ Database schema validation failed');
  // Optionally exit or continue with warnings
}
```

---

## Success Metrics

The fix is successful when:

1. ✅ Server starts with single database instance
2. ✅ No "no such table: hemingway_bridges" errors
3. ✅ FirstTimeSetupService initializes successfully
4. ✅ All system initialization endpoints work
5. ✅ Database operations are consistent across all services
6. ✅ Tests pass without modifications

---

## Timeline

- **Diagnosis**: 15 minutes ✅ (Complete)
- **Fix Implementation**: 10 minutes
- **Testing**: 15 minutes
- **Documentation**: 10 minutes
- **Total**: ~50 minutes
