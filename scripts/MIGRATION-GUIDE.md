# Production Agent Migration Guide

## Overview

This guide explains how to migrate all 13 production agents from `.md` files to the PostgreSQL database using the automated migration script.

## Quick Start

```bash
# Preview migration (dry-run mode - no changes made)
npm run migrate:agents:dry-run

# Execute migration (production run)
npm run migrate:agents
```

## What It Does

The migration script (`migrate-prod-agents-to-db.ts`) performs the following operations:

1. **Agent Discovery**: Scans `/workspaces/agent-feed/prod/.claude/agents` for all `.md` files
2. **Data Transformation**: Converts Claude Code YAML frontmatter to PostgreSQL JSON schema
3. **Database Insertion**: Inserts data into two tables:
   - `system_agent_templates` - Immutable system defaults
   - `user_agent_customizations` - User-specific customizations (for 'anonymous' user)
4. **Duplicate Handling**: Uses upsert logic (ON CONFLICT DO UPDATE) to handle duplicates gracefully
5. **Logging**: Provides detailed logging of all operations

## Data Transformation

### Input Format (Agent .md file)

```yaml
---
name: get-to-know-you-agent
description: User onboarding and profile building
tools: [Read, Write, Edit]
model: sonnet
color: "#f59e0b"
proactive: true
priority: P0
usage: PROACTIVE for user discovery
---

# Agent body content...
```

### Output Format (PostgreSQL)

#### system_agent_templates table

```json
{
  "name": "get-to-know-you-agent",
  "version": 1,
  "model": "claude-sonnet-4-5-20250929",
  "posting_rules": {
    "max_length": 1000,
    "min_interval_seconds": 30,
    "rate_limit_per_hour": 50,
    "prohibited_words": ["spam", "offensive"]
  },
  "api_schema": {
    "platform": "agent-feed",
    "endpoints": {
      "post": "/api/posts",
      "reply": "/api/comments"
    },
    "auth_type": "internal"
  },
  "safety_constraints": {
    "content_filters": ["profanity", "spam", "phishing"],
    "max_mentions_per_post": 5,
    "requires_human_review": ["financial_advice", "medical_advice"]
  },
  "default_personality": "User onboarding and profile building",
  "default_response_style": {
    "tone": "professional",
    "length": "concise",
    "use_emojis": true
  }
}
```

#### user_agent_customizations table

```json
{
  "user_id": "anonymous",
  "agent_template": "get-to-know-you-agent",
  "custom_name": null,
  "personality": "User onboarding and profile building",
  "interests": ["PROACTIVE for user discovery"],
  "response_style": {
    "tone": "professional",
    "length": "concise",
    "use_emojis": true
  },
  "enabled": true
}
```

## Transformation Rules

### Model Name Mapping

| Input (YAML) | Output (PostgreSQL) |
|--------------|---------------------|
| `haiku`      | `claude-haiku-3-5-20250925` |
| `sonnet`     | `claude-sonnet-4-5-20250929` |
| `opus`       | `claude-opus-4-20250514` |
| `null`       | `null` (uses env default) |

### Posting Rules Generation

- **Priority P0**: `rate_limit_per_hour: 50`, `min_interval_seconds: 30`
- **Priority P1**: `rate_limit_per_hour: 30`, `min_interval_seconds: 60`
- **Default (P2/P3)**: `rate_limit_per_hour: 20`, `min_interval_seconds: 60`
- **Proactive agents**: Lower interval times

### Response Style Inference

The script analyzes the agent description to infer tone:

- Contains "casual" or "friendly" → `tone: "casual"`
- Contains "technical" or "engineering" → `tone: "technical"`
- Default → `tone: "professional"`
- Has `color` field → `use_emojis: true`

## Prerequisites

### 1. Database Setup

Ensure PostgreSQL is running and configured:

```bash
# Check .env file contains:
DB_HOST=localhost
DB_PORT=5432
POSTGRES_DB=avidm_dev
POSTGRES_USER=postgres
POSTGRES_PASSWORD=dev_password_change_in_production
```

### 2. Schema Migration

Run the database schema migrations first:

```bash
# Ensure tables exist
npm run migrate:schema
```

Required tables:
- `system_agent_templates`
- `user_agent_customizations`

### 3. Agent Files

Ensure all agent `.md` files exist in:
```
/workspaces/agent-feed/prod/.claude/agents/
```

Expected agents (13 total):
1. get-to-know-you-agent.md
2. page-verification-agent.md
3. personal-todos-agent.md
4. meeting-prep-agent.md
5. meeting-next-steps-agent.md
6. link-logger-agent.md
7. lambda-vi-chief-of-staff.md
8. impact-filter-agent.md
9. goal-analyst.md
10. bull-beaver-bear-agent.md
11. follow-ups-agent.md
12. opportunity-scout-agent.md
13. market-research-agent.md

## Running the Migration

### Dry-Run Mode (Recommended First)

```bash
# Preview what would be migrated without making changes
npm run migrate:agents:dry-run
```

Output example:
```
================================================================================
Production Agent Migration
================================================================================

[DRY-RUN] RUNNING IN DRY-RUN MODE - No database changes will be made

================================================================================
Step 1: Database Validation
================================================================================

[DRY-RUN] Skipping database validation

================================================================================
Step 2: Agent Discovery
================================================================================

[INFO] Scanning directory: /workspaces/agent-feed/prod/.claude/agents
[SUCCESS] Discovered 13 agents
  1. get-to-know-you-agent - User onboarding and profile building...
  2. page-verification-agent - Autonomous QA testing...
  ...

================================================================================
Step 3: Agent Migration
================================================================================

[INFO] Migrating agent: get-to-know-you-agent
[INFO]   Template data prepared for: get-to-know-you-agent
[INFO]     Model: claude-sonnet-4-5-20250929
[INFO]     Personality: User onboarding and profile building for personalized...
[DRY-RUN] Would insert/update system_agent_templates
[INFO]   Customization data prepared for: get-to-know-you-agent
[INFO]     User: anonymous
[INFO]     Enabled: true
[DRY-RUN] Would insert/update user_agent_customizations
[SUCCESS] ✓ Successfully migrated: get-to-know-you-agent

...

================================================================================
Migration Summary
================================================================================

[INFO] Total agents: 13
[SUCCESS] Successful: 13

[WARN] DRY-RUN COMPLETE - No changes were made to the database
```

### Production Run

```bash
# Execute actual migration
npm run migrate:agents
```

Output example:
```
================================================================================
Production Agent Migration
================================================================================

================================================================================
Step 1: Database Validation
================================================================================

[SUCCESS] Database connection validated
[SUCCESS] Required tables validated: system_agent_templates, user_agent_customizations

================================================================================
Step 2: Agent Discovery
================================================================================

[INFO] Scanning directory: /workspaces/agent-feed/prod/.claude/agents
[SUCCESS] Discovered 13 agents

================================================================================
Step 3: Agent Migration
================================================================================

[INFO] Migrating agent: get-to-know-you-agent
[INFO]   Template data prepared for: get-to-know-you-agent
[SUCCESS]   ✓ Upserted system template: get-to-know-you-agent
[SUCCESS]   ✓ Upserted user customization: get-to-know-you-agent
[SUCCESS] ✓ Successfully migrated: get-to-know-you-agent

...

================================================================================
Migration Summary
================================================================================

[INFO] Total agents: 13
[SUCCESS] Successful: 13

[SUCCESS] MIGRATION COMPLETE
```

## Error Handling

### Common Errors and Solutions

#### 1. Database Connection Failed

```
[ERROR] Database connection validation failed
Details: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution:**
- Ensure PostgreSQL is running: `docker-compose up -d postgres`
- Check `.env` configuration
- Verify database credentials

#### 2. Missing Tables

```
[ERROR] Missing required tables. Found: system_agent_templates
Please run database migrations first.
```

**Solution:**
```bash
npm run migrate:schema
```

#### 3. Invalid Agent Markdown

```
[ERROR] ✗ Failed to migrate: test-agent
Details: No frontmatter found in /path/to/agent.md
```

**Solution:**
- Check agent file has valid YAML frontmatter (between `---` markers)
- Ensure `name` and `description` fields exist

#### 4. Missing Required Fields

```
[ERROR] ✗ Failed to migrate: test-agent
Details: Missing required fields: name and description
```

**Solution:**
- Add missing `name` and `description` fields to agent frontmatter

## Verification

### Check Migrated Data

```bash
# Connect to PostgreSQL
psql -U postgres -d avidm_dev

# View system templates
SELECT name, version, model, default_personality
FROM system_agent_templates
ORDER BY name;

# View user customizations
SELECT agent_template, user_id, enabled
FROM user_agent_customizations
ORDER BY agent_template;
```

Expected output:
```
                name                | version |            model            |        default_personality
------------------------------------+---------+-----------------------------+----------------------------------
 bull-beaver-bear-agent             |       1 | claude-sonnet-4-5-20250929 | Strategic analysis agent...
 follow-ups-agent                   |       1 | claude-sonnet-4-5-20250929 | Follow-up coordination...
 get-to-know-you-agent             |       1 | claude-sonnet-4-5-20250929 | User onboarding agent...
 ...
(13 rows)
```

### Test Integration

```bash
# Test agent retrieval via API
curl http://localhost:5000/api/agents/get-to-know-you-agent

# Test user customizations
curl http://localhost:5000/api/users/anonymous/agents
```

## Re-running Migration

The migration script uses **upsert logic** (`ON CONFLICT DO UPDATE`), so it can be safely re-run:

- Existing agents will be **updated** with latest data
- New agents will be **inserted**
- No data loss or duplicates

```bash
# Safe to re-run anytime
npm run migrate:agents
```

## Advanced Usage

### Direct Script Execution

```bash
# Using tsx directly
tsx scripts/migrate-prod-agents-to-db.ts

# With dry-run flag
tsx scripts/migrate-prod-agents-to-db.ts --dry-run

# Or -d shorthand
tsx scripts/migrate-prod-agents-to-db.ts -d
```

### Custom Agent Directory

Edit the script to change the agent directory:

```typescript
const AGENT_DIRECTORY = path.join(process.cwd(), 'custom/path/to/agents');
```

### Custom User

Change the default user from 'anonymous':

```typescript
const ANONYMOUS_USER = 'my-custom-user';
```

## Troubleshooting

### Enable Debug Logging

Edit the script to add debug output:

```typescript
logger.info(`Debug: Agent data: ${JSON.stringify(agentData, null, 2)}`);
```

### Manual Rollback

If migration fails, you can manually rollback:

```sql
-- Delete all migrated agents
DELETE FROM user_agent_customizations WHERE user_id = 'anonymous';
DELETE FROM system_agent_templates;

-- Or delete specific agent
DELETE FROM user_agent_customizations WHERE agent_template = 'agent-name';
DELETE FROM system_agent_templates WHERE name = 'agent-name';
```

### Check Specific Agent

```sql
SELECT * FROM system_agent_templates WHERE name = 'get-to-know-you-agent';
```

## Performance

- **Expected runtime**: 2-5 seconds for 13 agents
- **Database operations**: 26 upserts (13 templates + 13 customizations)
- **Memory usage**: < 50MB
- **Parallelization**: Sequential (one agent at a time for safety)

## Best Practices

1. **Always run dry-run first** to preview changes
2. **Backup database** before production migration
3. **Verify agent files** are valid before migration
4. **Monitor logs** for warnings or errors
5. **Test API integration** after migration

## Support

If you encounter issues:

1. Check logs for detailed error messages
2. Verify prerequisites (database, tables, agent files)
3. Run in dry-run mode to identify issues
4. Consult this guide for common solutions

## Related Documentation

- [Phase 1 Schema Documentation](/workspaces/agent-feed/src/database/schema/001_initial_schema.sql)
- [Agent Template Types](/workspaces/agent-feed/src/types/agent-templates.ts)
- [Agent Discovery Service](/workspaces/agent-feed/src/agents/AgentDiscoveryService.ts)
- [PostgreSQL Configuration](/workspaces/agent-feed/api-server/config/postgres.js)
