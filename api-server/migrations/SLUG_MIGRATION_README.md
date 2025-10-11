# PostgreSQL Slug Migration for Agent Templates

This migration adds a `slug` column to the `system_agent_templates` table and generates unique, URL-friendly slugs for all existing agent templates.

## Overview

**Migration File**: `/workspaces/agent-feed/api-server/migrations/add-slugs-to-agents.js`

**Target Table**: `system_agent_templates`

**Changes**:
- Adds `slug` column (VARCHAR(255), NOT NULL, UNIQUE)
- Generates slugs from agent template names
- Handles duplicate slugs by appending numeric suffixes (-2, -3, etc.)
- Creates unique constraint and index for performance
- Fully idempotent (safe to run multiple times)

## Quick Start

### Run Migration

```bash
cd /workspaces/agent-feed/api-server
node migrations/add-slugs-to-agents.js
```

### Rollback Migration (Optional)

```bash
node migrations/add-slugs-to-agents.js --rollback
```

### Test Slug Generation

```bash
node migrations/test-slug-migration.js
```

## Slug Generation Rules

The migration generates slugs using the following logic:

1. **Convert to lowercase**: `BackendDeveloper` → `backenddeveloper`
2. **Replace non-alphanumeric with hyphens**: `API Integrator` → `api-integrator`
3. **Remove consecutive hyphens**: `Multiple---Hyphens` → `multiple-hyphens`
4. **Trim hyphens from edges**: `---agent---` → `agent`
5. **Handle empty results**: `!!!` → `untitled`

### Examples

| Agent Name | Generated Slug |
|------------|----------------|
| `BackendDeveloper` | `backenddeveloper` |
| `API Integrator` | `api-integrator` |
| `creative-writer` | `creative-writer` |
| `Test@Agent#123` | `test-agent-123` |
| `agent-feedback-agent` | `agent-feedback-agent` |

### Duplicate Handling

If a slug already exists, the migration automatically appends a numeric suffix:

```
creative-writer     → creative-writer
creative-writer (2) → creative-writer-2
creative-writer (3) → creative-writer-3
```

## Migration Steps

The migration performs these steps in a transaction:

1. **Check if slug column exists** - Skip if already migrated
2. **Add slug column** - Initially nullable
3. **Fetch all agent templates** - Get existing records
4. **Generate unique slugs** - Process each agent template
5. **Set NOT NULL constraint** - Ensure data integrity
6. **Add unique constraint** - Prevent duplicate slugs
7. **Create index** - Optimize slug queries
8. **Verify migration** - Validate all slugs are unique and not null

## Verification

After running the migration, verify the results:

```bash
# Check table structure
PGPASSWORD=$POSTGRES_PASSWORD psql -h $DB_HOST -U $POSTGRES_USER -d $POSTGRES_DB \
  -c "\d system_agent_templates"

# View generated slugs
PGPASSWORD=$POSTGRES_PASSWORD psql -h $DB_HOST -U $POSTGRES_USER -d $POSTGRES_DB \
  -c "SELECT name, slug FROM system_agent_templates ORDER BY name LIMIT 20;"

# Verify uniqueness
PGPASSWORD=$POSTGRES_PASSWORD psql -h $DB_HOST -U $POSTGRES_USER -d $POSTGRES_DB \
  -c "SELECT COUNT(*) as total, COUNT(DISTINCT slug) as unique_slugs FROM system_agent_templates;"
```

## Safety Features

### Idempotency

The migration is **fully idempotent** and safe to run multiple times:

- Checks if slug column already exists
- Checks if agents already have slugs
- Skips processing for agents with existing slugs
- Gracefully handles existing constraints and indexes

### Transaction Safety

- Wrapped in PostgreSQL transaction (BEGIN/COMMIT)
- Automatic ROLLBACK on any error
- No partial state if migration fails

### Error Handling

The migration validates:
- All agents have non-null slugs
- All slugs are unique
- Database connection is successful
- All SQL operations complete without errors

## Database Schema

### Before Migration

```sql
CREATE TABLE system_agent_templates (
  name VARCHAR(50) PRIMARY KEY,
  version INTEGER NOT NULL,
  -- ... other columns
);
```

### After Migration

```sql
CREATE TABLE system_agent_templates (
  name VARCHAR(50) PRIMARY KEY,
  version INTEGER NOT NULL,
  slug VARCHAR(255) NOT NULL,
  -- ... other columns
  CONSTRAINT system_agent_templates_slug_key UNIQUE (slug)
);

CREATE INDEX idx_system_agent_templates_slug ON system_agent_templates(slug);
```

## Usage in Application

After migration, you can query agents by slug:

```javascript
import postgresManager from '../config/postgres.js';

// Query by slug
const agent = await postgresManager.query(
  'SELECT * FROM system_agent_templates WHERE slug = $1',
  ['backenddeveloper']
);

// List all slugs
const slugs = await postgresManager.query(
  'SELECT name, slug FROM system_agent_templates ORDER BY slug'
);
```

## Rollback

To rollback the migration (removes slug column):

```bash
node migrations/add-slugs-to-agents.js --rollback
```

**Warning**: This will permanently delete all slug data. Only use in development or if you need to revert the schema change.

## Environment Variables

The migration uses these environment variables from `.env`:

```bash
DB_HOST=localhost
DB_PORT=5432
POSTGRES_DB=avidm_dev
POSTGRES_USER=postgres
POSTGRES_PASSWORD=dev_password_change_in_production
```

## Troubleshooting

### Migration Already Completed

If you see:
```
✅ Migration already completed. All agents have slugs.
```

This is normal - the migration has already run successfully and is skipping re-execution.

### Connection Errors

If you see connection errors:
```
❌ Migration failed: connect ECONNREFUSED
```

**Solutions**:
1. Verify PostgreSQL is running: `pg_isready -h localhost -p 5432`
2. Check environment variables in `.env`
3. Verify database credentials

### Duplicate Slug Errors

If you encounter duplicate slug errors:
```
❌ Slug uniqueness verification failed!
```

The migration should handle this automatically by appending numeric suffixes. If this error occurs, it indicates a bug in the duplicate handling logic.

## Testing

Run the test suite to verify slug generation:

```bash
node migrations/test-slug-migration.js
```

Expected output:
```
✅ All tests passed!
📊 Results: 10 passed, 0 failed
```

## Integration with Repository

Update `agent.repository.js` to use slugs:

```javascript
// Get agent by slug
async getAgentBySlug(slug, userId = 'anonymous') {
  const query = `
    SELECT
      uac.id,
      sat.name,
      sat.slug,
      COALESCE(uac.custom_name, sat.name) as display_name,
      -- ... other fields
    FROM system_agent_templates sat
    LEFT JOIN user_agent_customizations uac
      ON sat.name = uac.agent_template AND uac.user_id = $1
    WHERE sat.slug = $2
  `;

  const result = await postgresManager.query(query, [userId, slug]);
  return result.rows[0] || null;
}
```

## Performance

The migration adds an index on the slug column for optimal query performance:

```sql
CREATE INDEX idx_system_agent_templates_slug ON system_agent_templates(slug);
```

**Query Performance**:
- Slug lookups: O(log n) with B-tree index
- Unique constraint: Enforced at database level
- No application-level validation needed

## Migration History

| Version | Date | Description |
|---------|------|-------------|
| 1.0 | 2025-10-11 | Initial migration - Add slug column to system_agent_templates |

## Related Files

- `/workspaces/agent-feed/api-server/migrations/add-slugs-to-agents.js` - Main migration script
- `/workspaces/agent-feed/api-server/migrations/test-slug-migration.js` - Test suite
- `/workspaces/agent-feed/api-server/repositories/postgres/agent.repository.js` - Agent repository
- `/workspaces/agent-feed/api-server/config/postgres.js` - PostgreSQL connection manager

## Support

For questions or issues with this migration, contact the backend team or open an issue in the project repository.
