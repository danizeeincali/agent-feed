# Database Migrations

This directory contains database migration scripts for the Agent Feed API server.

## Migration System Overview

The migration system uses a version-based approach to manage database schema changes:

- Each migration has a unique version number (001, 002, 003, etc.)
- Migrations are applied in order and tracked in the `schema_versions` table
- Migrations can be rolled back using the `down()` function
- All migrations run within transactions for safety

## Available Migrations

### 001_initial_schema.js
Creates the initial agents and agent_pages tables.

### 002_migrate_json_pages.js
Migrates JSON-based agent pages to the database.

### 003_add_agent_slugs.js
Adds slug column to agents table and populates it with generated slugs from agent names.

**Features:**
- Generates SEO-friendly slugs (lowercase, hyphenated)
- Handles duplicate slugs by appending number suffixes
- Adds unique constraint on slug column
- Validates all slugs are unique and non-null

## Running Migrations

### Run All Pending Migrations

```bash
cd /workspaces/agent-feed/api-server
node scripts/run-migration.js
```

### Check Current Schema Version

```bash
node scripts/run-migration.js --version
```

### View Migration History

```bash
node scripts/run-migration.js --history
```

### Help

```bash
node scripts/run-migration.js --help
```

## Migration 003: Add Agent Slugs

This migration specifically:

1. **Adds slug column** to the agents table
2. **Generates slugs** from existing agent names using the following logic:
   - Converts to lowercase
   - Replaces non-alphanumeric characters with hyphens
   - Removes consecutive hyphens
   - Trims hyphens from edges

3. **Handles duplicates** by appending number suffixes:
   - "Test Agent" → "test-agent"
   - "Test Agent" (duplicate) → "test-agent-1"
   - "Test Agent" (another) → "test-agent-2"

4. **Adds constraints**:
   - Makes slug column NOT NULL
   - Adds unique index on slug column

5. **Verifies** the migration by checking:
   - All agents have slugs
   - All slugs are unique
   - No null slugs exist

## Example Slug Generation

| Agent Name | Generated Slug |
|------------|----------------|
| Personal Todos Agent | personal-todos-agent |
| Workflow Test Agent | workflow-test-agent |
| Recovery-Test Agent | recovery-test-agent |
| DB Reconnect Agent | db-reconnect-agent |
| Test Agent | test-agent |
| Test Agent (duplicate) | test-agent-1 |

## Database Schema After Migration 003

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

CREATE TRIGGER trigger_agents_updated_at
  AFTER UPDATE ON agents
  BEGIN
    UPDATE agents SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;
```

## Creating New Migrations

1. Create a new file: `00X_migration_name.js`
2. Use this template:

```javascript
module.exports = {
  version: X,
  description: 'Description of what this migration does',

  up(db) {
    // Migration logic here
    db.exec(`
      -- SQL statements
    `);
  },

  down(db) {
    // Rollback logic here
    db.exec(`
      -- Reverse the migration
    `);
  }
};
```

3. Add to `/workspaces/agent-feed/api-server/migrations/index.js`:

```javascript
const migrationX = require('./00X_migration_name');

this.migrations = [
  migration001,
  migration002,
  migration003,
  migrationX  // Add your migration here
];
```

## Rollback Migrations

To rollback a migration manually:

```javascript
const dbConnection = require('../config/database');
const migration003 = require('./003_add_agent_slugs');

const db = dbConnection.getDb();
migration003.down(db);
```

## Safety Features

- **Transactions**: All migrations run in transactions (automatic rollback on error)
- **Version tracking**: Prevents running the same migration twice
- **Validation**: Each migration includes verification steps
- **Error handling**: Clear error messages and stack traces
- **Idempotency**: Migrations check state before making changes

## Troubleshooting

### Migration fails with "table already exists"

The migration may have partially completed. Check the schema_versions table:

```bash
sqlite3 /workspaces/agent-feed/data/agent-pages.db "SELECT * FROM schema_versions"
```

### Slug conflicts after migration

The migration automatically handles duplicates. If you see an error, check for:
- Null agent names
- Very long agent names (slug > 255 chars)
- Special characters that can't be converted

### Database locked error

Ensure no other processes are using the database:

```bash
lsof /workspaces/agent-feed/data/agent-pages.db
```

## Database Backup

Always backup before running migrations:

```bash
cp /workspaces/agent-feed/data/agent-pages.db /workspaces/agent-feed/data/agent-pages.db.backup
```

Or use the built-in backup function:

```javascript
const dbConnection = require('../config/database');
dbConnection.backup('/workspaces/agent-feed/data/agent-pages.db.backup');
```
