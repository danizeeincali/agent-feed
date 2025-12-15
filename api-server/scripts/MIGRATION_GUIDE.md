# Agent Slugs Migration Guide

## Overview

This guide explains how to use the database migration script that adds slug columns to the agents table and populates them with SEO-friendly slugs.

## Quick Start

### 1. Preview Changes (Dry Run)

Before making any changes, preview what the migration will do:

```bash
cd /workspaces/agent-feed/api-server
node scripts/add-agent-slugs.cjs --dry-run
```

This will show you:
- All agents that will be updated
- The slugs that will be generated
- Any duplicate handling that will occur

### 2. Run Migration

Once you're satisfied with the preview, run the migration:

```bash
node scripts/add-agent-slugs.cjs
```

The script will:
1. ✓ Create a backup of your database
2. ✓ Add a slug column to the agents table
3. ✓ Generate slugs for all existing agents
4. ✓ Handle duplicate slugs by appending numbers
5. ✓ Add NOT NULL constraint and unique index
6. ✓ Verify all slugs are valid and unique

## What the Migration Does

### Slug Generation Logic

The migration converts agent names to URL-friendly slugs:

1. **Convert to lowercase**: "Test Agent" → "test agent"
2. **Replace non-alphanumeric with hyphens**: "test agent" → "test-agent"
3. **Remove consecutive hyphens**: "test---agent" → "test-agent"
4. **Trim edge hyphens**: "-test-agent-" → "test-agent"

### Example Transformations

| Agent Name | Generated Slug |
|------------|----------------|
| Personal Todos Agent | personal-todos-agent |
| Workflow Test Agent | workflow-test-agent |
| API Integrator | api-integrator |
| Test-Agent_123 | test-agent-123 |
| DB Reconnect Agent | db-reconnect-agent |

### Handling Duplicates

If two agents would generate the same slug, the migration automatically appends a number:

```
"Test Agent" → test-agent
"Test Agent" (duplicate) → test-agent-1
"Test Agent" (another) → test-agent-2
```

## Database Schema Changes

### Before Migration

```sql
CREATE TABLE agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### After Migration

```sql
CREATE TABLE agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  slug TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_agents_slug ON agents(slug);
```

## Safety Features

### Automatic Backup

The script automatically creates a timestamped backup before making any changes:

```
/workspaces/agent-feed/data/agent-pages.backup-<timestamp>.db
```

### Transaction Safety

All changes are wrapped in a transaction. If any step fails, all changes are rolled back automatically.

### Verification

After migration, the script verifies:
- All agents have slugs
- All slugs are unique
- No null or empty slugs exist

## Checking Migration Status

### Check if Already Applied

If you run the script on a database that already has slugs, it will detect this and show the existing slugs:

```bash
node scripts/add-agent-slugs.cjs
```

Output:
```
✓ Slug column already exists!

First 10 agents with slugs:
----------------------------------------------------------------------
  Personal Todos Agent → personal-todos-agent
  Workflow Test Agent → workflow-test-agent
  ...

Migration already applied. Nothing to do.
```

### View Current Slugs

Query the database directly:

```bash
sqlite3 /workspaces/agent-feed/data/agent-pages.db \
  "SELECT name, slug FROM agents ORDER BY name"
```

### Check Schema

```bash
sqlite3 /workspaces/agent-feed/data/agent-pages.db ".schema agents"
```

## Troubleshooting

### Migration Fails

1. **Check backup exists**: Backups are created at `/workspaces/agent-feed/data/agent-pages.backup-*.db`
2. **Restore from backup** if needed:
   ```bash
   cp /workspaces/agent-feed/data/agent-pages.backup-*.db \
      /workspaces/agent-feed/data/agent-pages.db
   ```

### Database Locked Error

Ensure no other processes are accessing the database:

```bash
lsof /workspaces/agent-feed/data/agent-pages.db
```

### Slug Conflicts

The migration automatically handles duplicates. If you see errors about unique constraint violations, check for:
- Null or empty agent names
- Special characters that can't be converted
- Very long names (slugs are capped at reasonable length)

## Manual Rollback

If you need to manually rollback the migration:

```sql
-- Connect to database
sqlite3 /workspaces/agent-feed/data/agent-pages.db

-- Drop index
DROP INDEX IF EXISTS idx_agents_slug;

-- Recreate table without slug
CREATE TABLE agents_new (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Copy data (excluding slug)
INSERT INTO agents_new (id, name, description, created_at, updated_at)
SELECT id, name, description, created_at, updated_at
FROM agents;

-- Replace table
DROP TABLE agents;
ALTER TABLE agents_new RENAME TO agents;

-- Recreate trigger
CREATE TRIGGER trigger_agents_updated_at
  AFTER UPDATE ON agents
  BEGIN
    UPDATE agents SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;
```

## Using Slugs in Your Application

After migration, you can query agents by slug:

```javascript
// Before (by ID)
const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(agentId);

// After (by slug)
const agent = db.prepare('SELECT * FROM agents WHERE slug = ?').get('test-agent');
```

### Benefits of Slugs

1. **SEO-friendly URLs**: `/agents/test-agent` instead of `/agents/abc-123-def`
2. **Human-readable**: Easy to understand and remember
3. **Shareable**: Clean URLs for sharing
4. **API routing**: Better REST API design

### Example API Routes

```javascript
// GET /api/agents/:slug
app.get('/api/agents/:slug', (req, res) => {
  const agent = db.prepare('SELECT * FROM agents WHERE slug = ?')
    .get(req.params.slug);

  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  res.json(agent);
});
```

## Files Created/Modified

### Created Files

1. `/workspaces/agent-feed/api-server/scripts/add-agent-slugs.cjs` - Standalone migration script
2. `/workspaces/agent-feed/api-server/migrations/003_add_agent_slugs.cjs` - Migration manager version
3. `/workspaces/agent-feed/api-server/migrations/README.md` - Migration system documentation
4. `/workspaces/agent-feed/api-server/scripts/MIGRATION_GUIDE.md` - This guide

### Modified Files

1. `/workspaces/agent-feed/api-server/migrations/index.cjs` - Added migration 003

## Next Steps

After running this migration:

1. ✓ Update your API routes to support slug-based lookups
2. ✓ Update frontend to use slugs in URLs
3. ✓ Add slug generation for new agents
4. ✓ Consider adding slug validation on create/update

## Support

If you encounter any issues:

1. Check the backup was created successfully
2. Review the migration output for error messages
3. Use `--dry-run` to preview changes before applying
4. Check existing slugs with SQL queries
5. Restore from backup if needed
