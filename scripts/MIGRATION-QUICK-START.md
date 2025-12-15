# Agent Migration Quick Start

## TL;DR

```bash
# 1. Preview migration (safe - no changes)
npm run migrate:agents:dry-run

# 2. Execute migration (production)
npm run migrate:agents
```

## What It Does

Migrates all 13 production agents from `.md` files → PostgreSQL database:
- ✅ Reads from: `/workspaces/agent-feed/prod/.claude/agents/*.md`
- ✅ Writes to: `system_agent_templates` + `user_agent_customizations` tables
- ✅ Safe to re-run (upsert logic - no duplicates)

## Prerequisites

```bash
# 1. PostgreSQL running
docker-compose up -d postgres

# 2. Database schema created
npm run migrate:schema

# 3. Check .env has database config
cat .env | grep -E "DB_HOST|POSTGRES"
```

## Expected Results

### Dry-Run Output
```
[INFO] Total agents: 13
[SUCCESS] Successful: 13
[WARN] DRY-RUN COMPLETE - No changes made
```

### Production Output
```
[SUCCESS] Database connection validated
[SUCCESS] Required tables validated
[SUCCESS] Discovered 13 agents
[SUCCESS] ✓ Successfully migrated: get-to-know-you-agent
...
[SUCCESS] MIGRATION COMPLETE
```

## Verify Migration

```sql
-- Connect to database
psql -U postgres -d avidm_dev

-- Check templates
SELECT name, model, version FROM system_agent_templates;

-- Check customizations
SELECT agent_template, user_id FROM user_agent_customizations;
```

## Troubleshooting

| Error | Solution |
|-------|----------|
| `Connection refused` | Start PostgreSQL: `docker-compose up -d postgres` |
| `Missing required tables` | Run migrations: `npm run migrate:schema` |
| `No frontmatter found` | Check agent `.md` file format |

## Files Created

- **Script**: `/workspaces/agent-feed/scripts/migrate-prod-agents-to-db.ts`
- **Tests**: `/workspaces/agent-feed/tests/scripts/migrate-prod-agents-to-db.test.ts`
- **Guide**: `/workspaces/agent-feed/scripts/MIGRATION-GUIDE.md`

## Model Mapping

| Agent Model | PostgreSQL Model |
|-------------|------------------|
| `haiku` | `claude-haiku-3-5-20250925` |
| `sonnet` | `claude-sonnet-4-5-20250929` |
| `opus` | `claude-opus-4-20250514` |
| `null` | `null` (uses env default) |

## Safety Features

✅ Dry-run mode for safe testing
✅ Upsert logic (no duplicates)
✅ Parameterized queries (SQL injection protection)
✅ Comprehensive error handling
✅ Detailed logging
✅ Database validation

## Next Steps

After migration:
1. Verify data: `SELECT * FROM system_agent_templates;`
2. Test API: `curl http://localhost:5000/api/agents`
3. Update frontend to use database agents

## Full Documentation

See `/workspaces/agent-feed/scripts/MIGRATION-GUIDE.md` for complete details.
