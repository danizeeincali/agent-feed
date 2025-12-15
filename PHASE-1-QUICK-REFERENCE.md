# Phase 1: Quick Reference Guide
## Avi DM - Developer Cheat Sheet

**Version:** 1.0
**Date:** 2025-10-10
**Purpose:** Fast lookup for common Phase 1 tasks

---

## Table of Contents

1. [Project Setup](#project-setup)
2. [Database Commands](#database-commands)
3. [Common Code Patterns](#common-code-patterns)
4. [Testing Commands](#testing-commands)
5. [Docker Commands](#docker-commands)
6. [Troubleshooting](#troubleshooting)

---

## Project Setup

### Initial Setup

```bash
# 1. Navigate to project directory
cd /workspaces/agent-feed/avi-dm

# 2. Install dependencies
npm install

# 3. Copy environment template
cp .env.example .env

# 4. Edit environment variables
# Required: DATABASE_URL, ANTHROPIC_API_KEY
nano .env

# 5. Start PostgreSQL (Docker)
docker-compose -f docker/docker-compose.dev.yml up -d postgres

# 6. Run migrations
npm run db:migrate

# 7. Seed system templates
npm run db:seed

# 8. Verify setup
npm run verify-setup

# 9. Run tests
npm test
```

### Environment Variables (.env)

```bash
# Database
DATABASE_URL=postgresql://postgres:dev_password@localhost:5432/avidm_dev
DB_POOL_MIN=2
DB_POOL_MAX=10

# Claude Models
AGENT_MODEL=claude-sonnet-4-5-20250929
AVI_MODEL=claude-sonnet-4-5-20250929

# Anthropic API
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here

# Environment
NODE_ENV=development
LOG_LEVEL=debug
```

---

## Database Commands

### Migrations

```bash
# Run all pending migrations
npm run db:migrate

# Rollback last migration
npm run db:migrate -- --rollback

# Check migration status
npm run db:migrate -- --status

# Create new migration
npm run db:migrate -- --create add_new_feature
```

### Seeding

```bash
# Seed system templates from config files
npm run db:seed

# Seed dev data (development only)
npm run db:seed -- --dev

# Verify seeding
npm run db:seed -- --verify
```

### Database Reset (Development Only)

```bash
# Drop all tables and re-run migrations
npm run db:reset

# Drop, migrate, and seed
npm run db:reset -- --seed
```

### Direct Database Access

```bash
# Connect to database
psql postgresql://postgres:dev_password@localhost:5432/avidm_dev

# Useful queries
\dt                          # List tables
\d system_agent_templates    # Describe table
SELECT * FROM system_agent_templates;
SELECT COUNT(*) FROM agent_memories;
```

---

## Common Code Patterns

### 1. Database Query

```typescript
// src/database/queries/system-templates.ts
import { Pool } from 'pg';
import { SystemAgentTemplate } from '../../types/database/system-agent-template';

export async function getSystemTemplate(
  pool: Pool,
  name: string
): Promise<SystemAgentTemplate | null> {
  const result = await pool.query(
    'SELECT * FROM system_agent_templates WHERE name = $1',
    [name]
  );
  return result.rows[0] || null;
}
```

**Usage:**
```typescript
import { getConnection, SystemTemplateQueries } from './database';

const pool = await getConnection();
const template = await SystemTemplateQueries.getSystemTemplate(pool, 'tech-guru');
```

---

### 2. Transaction

```typescript
// Using transaction helper
import { withTransaction } from './database';

await withTransaction(async (client) => {
  // All queries here are in a transaction
  await client.query('INSERT INTO ...');
  await client.query('UPDATE ...');
  // Auto-commit on success, auto-rollback on error
});
```

---

### 3. Type Definition

```typescript
// src/types/database/system-agent-template.ts
export interface SystemAgentTemplate {
  name: string;
  version: number;
  model: string | null;
  posting_rules: PostingRules;
  api_schema: ApiSchema;
  safety_constraints: SafetyConstraints;
  default_personality: string;
  default_response_style: ResponseStyle;
  created_at: Date;
  updated_at: Date;
}

export interface PostingRules {
  max_length: number;
  min_interval_seconds: number;
  rate_limit_per_hour: number;
  required_hashtags: string[];
  prohibited_words: string[];
}
```

---

### 4. Configuration Loading

```typescript
// src/config/env.ts
import dotenv from 'dotenv';

dotenv.config();

export interface EnvConfig {
  DATABASE_URL: string;
  AGENT_MODEL: string;
  AVI_MODEL: string;
  ANTHROPIC_API_KEY: string;
  NODE_ENV: 'development' | 'production' | 'test';
  LOG_LEVEL: string;
}

export function getEnvConfig(): EnvConfig {
  // Validate required variables
  const required = ['DATABASE_URL', 'ANTHROPIC_API_KEY'];
  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  return {
    DATABASE_URL: process.env.DATABASE_URL!,
    AGENT_MODEL: process.env.AGENT_MODEL || 'claude-sonnet-4-5-20250929',
    AVI_MODEL: process.env.AVI_MODEL || 'claude-sonnet-4-5-20250929',
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY!,
    NODE_ENV: (process.env.NODE_ENV as any) || 'development',
    LOG_LEVEL: process.env.LOG_LEVEL || 'info'
  };
}
```

---

### 5. Logging

```typescript
// src/utils/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Usage
logger.info('Database connection established', { poolSize: 10 });
logger.error('Query failed', { error: err.message, query: sql });
```

---

### 6. System Template Configuration

```json
// config/system/agent-templates/tech-guru.json
{
  "name": "tech-guru",
  "version": 1,
  "model": null,
  "posting_rules": {
    "max_length": 280,
    "min_interval_seconds": 60,
    "rate_limit_per_hour": 20,
    "required_hashtags": ["#tech"],
    "prohibited_words": ["spam", "scam"]
  },
  "api_schema": {
    "platform": "twitter",
    "endpoints": {
      "post": "/v2/tweets",
      "reply": "/v2/tweets/:id/replies"
    },
    "auth_type": "oauth2"
  },
  "safety_constraints": {
    "content_filters": ["profanity", "harassment"],
    "max_mentions_per_post": 3,
    "requires_human_review": ["financial_advice", "medical_advice"]
  },
  "default_personality": "You are Tech Guru...",
  "default_response_style": {
    "tone": "professional",
    "length": "concise",
    "use_emojis": false
  }
}
```

---

## Testing Commands

### Run Tests

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# Watch mode (auto-rerun on changes)
npm run test:watch

# Coverage report
npm run test:coverage
```

### Test File Examples

**Unit Test:**
```typescript
// tests/unit/database/queries/system-templates.test.ts
import { Pool } from 'pg';
import { getSystemTemplate } from '../../../../src/database/queries/system-templates';

describe('getSystemTemplate', () => {
  let mockPool: jest.Mocked<Pool>;

  beforeEach(() => {
    mockPool = { query: jest.fn() } as any;
  });

  it('should return template when found', async () => {
    const mockTemplate = { name: 'tech-guru', version: 1 };
    mockPool.query.mockResolvedValue({ rows: [mockTemplate] } as any);

    const result = await getSystemTemplate(mockPool, 'tech-guru');

    expect(result).toEqual(mockTemplate);
  });
});
```

**Integration Test:**
```typescript
// tests/integration/database/seeding.test.ts
import { Pool } from 'pg';
import { seedSystemTemplates } from '../../../src/database/seeds/seed-system-templates';
import { createTestDatabase, cleanupTestDatabase } from '../setup/test-database';

describe('Template Seeding', () => {
  let pool: Pool;

  beforeAll(async () => {
    pool = await createTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase(pool);
  });

  it('should seed templates from config files', async () => {
    await seedSystemTemplates(pool, './config/system/agent-templates');

    const result = await pool.query('SELECT COUNT(*) FROM system_agent_templates');
    expect(parseInt(result.rows[0].count)).toBeGreaterThan(0);
  });
});
```

---

## Docker Commands

### Development

```bash
# Start development environment
docker-compose -f docker/docker-compose.dev.yml up -d

# View logs
docker-compose -f docker/docker-compose.dev.yml logs -f

# Stop environment
docker-compose -f docker/docker-compose.dev.yml down

# Rebuild app container
docker-compose -f docker/docker-compose.dev.yml up -d --build app

# Access PostgreSQL container
docker exec -it avidm-postgres-dev psql -U postgres -d avidm_dev

# Access app container
docker exec -it avidm-app-dev sh
```

### Production

```bash
# Build and start production
docker-compose -f docker/docker-compose.yml up -d --build

# View logs
docker-compose -f docker/docker-compose.yml logs -f app

# Stop production
docker-compose -f docker/docker-compose.yml down

# Backup database volume
docker run --rm -v avidm_postgres_data:/data -v $(pwd)/backups:/backup \
  alpine tar czf /backup/postgres-$(date +%Y%m%d).tar.gz -C /data .

# Restore database volume
docker run --rm -v avidm_postgres_data:/data -v $(pwd)/backups:/backup \
  alpine tar xzf /backup/postgres-20251010.tar.gz -C /data
```

---

## Troubleshooting

### Database Connection Issues

**Problem:** Cannot connect to PostgreSQL

```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Check PostgreSQL logs
docker logs avidm-postgres-dev

# Verify connection string
echo $DATABASE_URL

# Test connection manually
psql $DATABASE_URL
```

---

### Migration Failures

**Problem:** Migration fails mid-way

```bash
# Check migration history
psql $DATABASE_URL -c "SELECT * FROM migration_history ORDER BY applied_at DESC;"

# Rollback last migration
npm run db:migrate -- --rollback

# Manual rollback (if needed)
psql $DATABASE_URL -c "DELETE FROM migration_history WHERE version = '003';"
```

---

### Test Database Issues

**Problem:** Tests fail due to database state

```bash
# Drop and recreate test database
psql postgresql://postgres:dev_password@localhost:5432/postgres \
  -c "DROP DATABASE IF EXISTS avidm_test;"

psql postgresql://postgres:dev_password@localhost:5432/postgres \
  -c "CREATE DATABASE avidm_test;"

# Re-run migrations on test database
DATABASE_URL=postgresql://postgres:dev_password@localhost:5432/avidm_test \
  npm run db:migrate
```

---

### Seeding Issues

**Problem:** Templates not loading from config files

```bash
# Check config file syntax
cat config/system/agent-templates/tech-guru.json | python -m json.tool

# Verify file permissions
ls -la config/system/agent-templates/

# Manual seeding with verbose logging
LOG_LEVEL=debug npm run db:seed
```

---

### Docker Volume Issues

**Problem:** Data persists when it shouldn't (or vice versa)

```bash
# List volumes
docker volume ls

# Remove specific volume
docker volume rm avidm_postgres_dev_data

# Remove all unused volumes
docker volume prune

# Inspect volume
docker volume inspect avidm_postgres_dev_data
```

---

## File Locations Quick Reference

| What | Where |
|------|-------|
| Database schema | `src/database/schema/schema.sql` |
| Migrations | `src/database/migrations/` |
| Query modules | `src/database/queries/` |
| Type definitions | `src/types/` |
| System templates | `config/system/agent-templates/` |
| Unit tests | `tests/unit/` |
| Integration tests | `tests/integration/` |
| Environment config | `.env` |
| Docker compose | `docker/docker-compose.yml` |
| Documentation | `docs/` |

---

## SQL Quick Reference

### Common Queries

```sql
-- Get all system templates
SELECT name, version FROM system_agent_templates;

-- Get user customizations
SELECT user_id, agent_template, custom_name, enabled
FROM user_agent_customizations
WHERE user_id = 'user123';

-- Get recent memories for an agent
SELECT agent_name, content, created_at
FROM agent_memories
WHERE user_id = 'user123' AND agent_name = 'tech-guru'
ORDER BY created_at DESC
LIMIT 10;

-- Get error log
SELECT agent_name, error_type, error_message, retry_count, created_at
FROM error_log
WHERE resolved = false
ORDER BY created_at DESC;

-- Get Avi state
SELECT * FROM avi_state WHERE id = 1;

-- Count memories by agent
SELECT agent_name, COUNT(*) as memory_count
FROM agent_memories
GROUP BY agent_name
ORDER BY memory_count DESC;
```

---

## Import Patterns

```typescript
// Database access
import { getConnection, SystemTemplateQueries } from '@database';

// Types
import { SystemAgentTemplate } from '@types/database/system-agent-template';

// Configuration
import { getEnvConfig } from '@config';

// Utilities
import { logger } from '@utils/logger';
```

---

## Data Tier Summary

| Tier | Tables | Access | Protection |
|------|--------|--------|------------|
| **TIER 1** | `system_agent_templates` | Read-only at runtime | Migrations only |
| **TIER 2** | `user_agent_customizations` | User editable | Validated at runtime |
| **TIER 3** | `agent_memories`, `agent_workspaces` | User owned | Never deleted |

---

## Development Workflow

### Adding a New Feature

1. **Create migration**
   ```bash
   npm run db:migrate -- --create add_feature_x
   ```

2. **Define types**
   ```typescript
   // src/types/database/feature-x.ts
   export interface FeatureX { ... }
   ```

3. **Create query module**
   ```typescript
   // src/database/queries/feature-x.ts
   export async function getFeatureX(pool: Pool, id: string) { ... }
   ```

4. **Write unit tests**
   ```typescript
   // tests/unit/database/queries/feature-x.test.ts
   describe('getFeatureX', () => { ... });
   ```

5. **Write integration tests**
   ```typescript
   // tests/integration/database/feature-x.test.ts
   describe('Feature X Integration', () => { ... });
   ```

6. **Update documentation**
   - Update `docs/database-schema.md`
   - Update this quick reference if needed

---

## Performance Tips

### Query Optimization

```sql
-- Use indexes
CREATE INDEX idx_custom ON table_name(column_name);

-- Use EXPLAIN to analyze queries
EXPLAIN ANALYZE SELECT * FROM table_name WHERE ...;

-- Use JSONB operators efficiently
SELECT * FROM table_name WHERE metadata @> '{"key": "value"}';

-- Limit results
SELECT * FROM table_name LIMIT 100;
```

### Connection Pool Configuration

```bash
# .env
DB_POOL_MIN=2          # Minimum connections
DB_POOL_MAX=10         # Maximum connections
DB_IDLE_TIMEOUT_MS=30000   # Close idle connections after 30s
```

---

## Useful Links

- **Architecture Plan:** `/workspaces/agent-feed/AVI-ARCHITECTURE-PLAN.md`
- **File Structure:** `/workspaces/agent-feed/PHASE-1-FILE-STRUCTURE-AND-ARCHITECTURE.md`
- **Architecture Decisions:** `/workspaces/agent-feed/PHASE-1-ARCHITECTURE-DECISIONS.md`
- **Architecture Diagrams:** `/workspaces/agent-feed/PHASE-1-ARCHITECTURE-DIAGRAMS.md`
- **PostgreSQL Docs:** https://www.postgresql.org/docs/16/
- **TypeScript Handbook:** https://www.typescriptlang.org/docs/handbook/

---

**Last Updated:** 2025-10-10
**Maintainer:** Development Team

---

## Cheat Sheet

```bash
# Setup
npm install && cp .env.example .env && npm run db:migrate && npm run db:seed

# Development
docker-compose -f docker/docker-compose.dev.yml up -d
npm run dev

# Testing
npm test              # All tests
npm run test:unit     # Unit only
npm run test:watch    # Watch mode

# Database
npm run db:migrate    # Run migrations
npm run db:seed       # Seed templates
npm run db:reset      # Reset database (dev)

# Docker
docker-compose -f docker/docker-compose.dev.yml up -d   # Start
docker-compose -f docker/docker-compose.dev.yml logs -f # Logs
docker-compose -f docker/docker-compose.dev.yml down    # Stop
```

---

**Need help?** Check the full documentation in the `docs/` directory or review the architecture plan.
