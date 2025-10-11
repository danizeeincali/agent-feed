# PostgreSQL Slug Migration - Summary

## Overview

Successfully created a PostgreSQL migration to add a `slug` column to the `system_agent_templates` table. The migration has been tested and verified to work correctly with your database.

## Files Created

### 1. Main Migration Script
**Path**: `/workspaces/agent-feed/api-server/migrations/add-slugs-to-agents.js`

**Purpose**: Adds slug column to PostgreSQL `system_agent_templates` table

**Features**:
- ✅ Adds slug column (VARCHAR 255, NOT NULL, UNIQUE)
- ✅ Generates slugs from agent names (lowercase, hyphenated)
- ✅ Handles duplicate slugs by appending -2, -3, etc.
- ✅ Adds unique constraint and index
- ✅ Fully idempotent (safe to run multiple times)
- ✅ Transaction-safe with automatic rollback on errors
- ✅ Includes rollback functionality

**Usage**:
```bash
# Run migration
node /workspaces/agent-feed/api-server/migrations/add-slugs-to-agents.js

# Rollback migration
node /workspaces/agent-feed/api-server/migrations/add-slugs-to-agents.js --rollback
```

### 2. Test Suite
**Path**: `/workspaces/agent-feed/api-server/migrations/test-slug-migration.js`

**Purpose**: Tests slug generation logic with edge cases

**Test Cases**:
- ✅ CamelCase conversion
- ✅ Special character handling
- ✅ Multiple spaces normalization
- ✅ Leading/trailing hyphens removal
- ✅ Empty string handling
- ✅ Special-only characters

**Usage**:
```bash
node /workspaces/agent-feed/api-server/migrations/test-slug-migration.js
```

### 3. Usage Examples
**Path**: `/workspaces/agent-feed/api-server/migrations/example-slug-usage.js`

**Purpose**: Demonstrates how to query agents by slug

**Examples**:
- Query agent by slug
- Get user customizations with slug
- List all agents with slugs
- Build URL-friendly routes
- Search agents by partial slug match

**Usage**:
```bash
node /workspaces/agent-feed/api-server/migrations/example-slug-usage.js
```

### 4. Documentation
**Path**: `/workspaces/agent-feed/api-server/migrations/SLUG_MIGRATION_README.md`

**Purpose**: Comprehensive documentation for the migration

**Contents**:
- Quick start guide
- Slug generation rules
- Migration steps
- Verification instructions
- Safety features
- Database schema changes
- Troubleshooting guide

## Migration Results

### Execution Summary

```
✅ Migration completed successfully
📊 Total agent templates: 23
🔑 Unique slugs: 23
⚠️  Null slugs: 0
```

### Database Schema Changes

**Before**:
```sql
CREATE TABLE system_agent_templates (
  name VARCHAR(50) PRIMARY KEY,
  version INTEGER NOT NULL,
  -- ... other columns
);
```

**After**:
```sql
CREATE TABLE system_agent_templates (
  name VARCHAR(50) PRIMARY KEY,
  version INTEGER NOT NULL,
  slug VARCHAR(255) NOT NULL,  -- NEW COLUMN
  -- ... other columns
  CONSTRAINT system_agent_templates_slug_key UNIQUE (slug)
);

CREATE INDEX idx_system_agent_templates_slug ON system_agent_templates(slug);
```

### Sample Slugs Generated

| Agent Name | Generated Slug |
|------------|----------------|
| `BackendDeveloper` | `backenddeveloper` |
| `APIIntegrator` | `apiintegrator` |
| `DatabaseManager` | `databasemanager` |
| `agent-feedback-agent` | `agent-feedback-agent` |
| `creative-writer` | `creative-writer` |
| `data-analyst` | `data-analyst` |

## Code Snippets

### 1. Slug Generation Logic

```javascript
/**
 * Generate slug from agent name
 * Converts to lowercase, replaces non-alphanumeric with hyphens
 */
function generateSlug(name) {
  if (!name) return 'untitled';

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')  // Replace non-alphanumeric with hyphens
    .replace(/-+/g, '-')           // Remove consecutive hyphens
    .replace(/^-|-$/g, '');        // Trim hyphens from edges

  return slug || 'untitled';
}
```

### 2. Duplicate Handling

```javascript
/**
 * Find unique slug by appending number suffix if needed
 */
async function findUniqueSlug(client, baseSlug, excludeName = null) {
  let slug = baseSlug;
  let counter = 2;

  while (true) {
    const result = await client.query(
      'SELECT COUNT(*) as count FROM system_agent_templates WHERE slug = $1 AND name != $2',
      [slug, excludeName]
    );

    if (parseInt(result.rows[0].count) === 0) {
      return slug;
    }

    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}
```

### 3. Query Agent by Slug

```javascript
import postgresManager from '../config/postgres.js';

// Get agent by slug
async function getAgentBySlug(slug, userId = 'anonymous') {
  const query = `
    SELECT
      sat.name,
      sat.slug,
      sat.version,
      sat.model,
      sat.default_personality,
      uac.custom_name,
      uac.enabled
    FROM system_agent_templates sat
    LEFT JOIN user_agent_customizations uac
      ON sat.name = uac.agent_template AND uac.user_id = $1
    WHERE sat.slug = $2
  `;

  const result = await postgresManager.query(query, [userId, slug]);
  return result.rows[0] || null;
}
```

### 4. Build URL-Friendly Routes

```javascript
// Example: Building API routes with slugs
const agent = await getAgentBySlug('backenddeveloper');

const routes = {
  api: `/api/agents/${agent.slug}`,
  profile: `/agents/${agent.slug}/profile`,
  feed: `/agents/${agent.slug}/feed`
};

console.log(routes);
// Output:
// {
//   api: '/api/agents/backenddeveloper',
//   profile: '/agents/backenddeveloper/profile',
//   feed: '/agents/backenddeveloper/feed'
// }
```

## Integration with Agent Repository

To integrate slugs with your existing agent repository, add this method to `/workspaces/agent-feed/api-server/repositories/postgres/agent.repository.js`:

```javascript
/**
 * Get a single agent by slug
 * @param {string} slug - Agent slug
 * @param {string} userId - User ID
 * @returns {Promise<object|null>} Agent configuration or null
 */
async getAgentBySlug(slug, userId = 'anonymous') {
  const query = `
    SELECT
      uac.id,
      sat.name,
      sat.slug,
      COALESCE(uac.custom_name, sat.name) as display_name,
      COALESCE(uac.personality, sat.default_personality) as description,
      COALESCE(uac.personality, sat.default_personality) as system_prompt,
      sat.posting_rules,
      sat.api_schema,
      sat.safety_constraints,
      sat.default_response_style,
      uac.interests,
      COALESCE(uac.enabled, true) as enabled,
      COALESCE(uac.created_at, sat.created_at) as created_at,
      COALESCE(uac.updated_at, sat.updated_at) as updated_at
    FROM system_agent_templates sat
    LEFT JOIN user_agent_customizations uac
      ON sat.name = uac.agent_template AND uac.user_id = $1
    WHERE sat.slug = $2
  `;

  const result = await postgresManager.query(query, [userId, slug]);

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    display_name: row.display_name || row.name,
    description: row.description,
    system_prompt: row.system_prompt,
    avatar_color: this.generateAvatarColor(row.name),
    capabilities: row.interests || [],
    status: row.enabled ? 'active' : 'inactive',
    created_at: row.created_at,
    updated_at: row.updated_at,
    posting_rules: row.posting_rules,
    api_schema: row.api_schema,
    safety_constraints: row.safety_constraints,
    response_style: row.default_response_style
  };
}
```

## Verification

### Check Database Structure

```bash
PGPASSWORD=dev_password_change_in_production psql -h localhost -U postgres -d avidm_dev \
  -c "\d system_agent_templates"
```

### View Generated Slugs

```bash
PGPASSWORD=dev_password_change_in_production psql -h localhost -U postgres -d avidm_dev \
  -c "SELECT name, slug FROM system_agent_templates ORDER BY name;"
```

### Verify Uniqueness

```bash
PGPASSWORD=dev_password_change_in_production psql -h localhost -U postgres -d avidm_dev \
  -c "SELECT COUNT(*) as total, COUNT(DISTINCT slug) as unique_slugs FROM system_agent_templates;"
```

## Next Steps

1. **Update API Routes**: Add slug-based endpoints to your API routes
   ```javascript
   // Example: Add to server.js or routes/agents.js
   app.get('/api/agents/:slug', async (req, res) => {
     const agent = await agentRepository.getAgentBySlug(req.params.slug);
     if (!agent) {
       return res.status(404).json({ error: 'Agent not found' });
     }
     res.json(agent);
   });
   ```

2. **Update Frontend Routes**: Use slugs in frontend URLs
   ```javascript
   // Example: React Router
   <Route path="/agents/:slug" component={AgentProfile} />
   ```

3. **Update Documentation**: Document slug-based endpoints in API docs

4. **Add Tests**: Write integration tests for slug-based queries

## Rollback Instructions

If you need to rollback the migration:

```bash
# Rollback (removes slug column)
node /workspaces/agent-feed/api-server/migrations/add-slugs-to-agents.js --rollback
```

**Warning**: This will permanently delete all slug data.

## Performance

The migration adds an index on the slug column for optimal query performance:

- **Slug lookups**: O(log n) with B-tree index
- **Unique constraint**: Enforced at database level
- **No application-level validation needed**

## Support

For questions or issues:
1. Review `/workspaces/agent-feed/api-server/migrations/SLUG_MIGRATION_README.md`
2. Check the test suite results
3. Verify database connection settings in `.env`
4. Contact the backend development team

## Status

✅ **Migration Complete**
- All 23 agent templates have unique slugs
- Database schema updated successfully
- Unique constraint and index in place
- Migration verified and tested
