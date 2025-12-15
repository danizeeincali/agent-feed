# Phase 1: File Structure and Module Architecture
## Avi DM - Database & Core Infrastructure

**Version:** 1.0
**Date:** 2025-10-10
**Phase:** Phase 1 (Week 1)
**Status:** Architecture Design Complete

---

## Executive Summary

This document defines the complete file structure, module organization, and architectural boundaries for Phase 1 of the Avi DM project. Phase 1 focuses on establishing the foundation:

- **3-tier database schema** (System, User Customizations, User Data)
- **Database connection layer** with pooling and health checks
- **Migration system** with data protection
- **System template seeding** from configuration files
- **TypeScript type definitions** for all data models
- **Test infrastructure** (unit + integration)
- **Docker deployment** with volume protection

---

## Complete Directory Structure

```
/workspaces/agent-feed/
├── avi-dm/                                 # NEW: Avi DM application root
│   ├── src/
│   │   ├── database/                       # Database layer
│   │   │   ├── schema/
│   │   │   │   ├── schema.sql             # Complete database schema
│   │   │   │   ├── indexes.sql            # Performance indexes
│   │   │   │   └── constraints.sql        # Constraints and checks
│   │   │   ├── migrations/
│   │   │   │   ├── 001_initial_schema.sql
│   │   │   │   ├── 002_add_indexes.sql
│   │   │   │   ├── 003_add_user_protection.sql
│   │   │   │   └── migration-runner.ts    # Migration orchestrator
│   │   │   ├── seeds/
│   │   │   │   ├── seed-system-templates.ts
│   │   │   │   ├── seed-dev-data.ts       # Dev environment only
│   │   │   │   └── verify-seeding.ts      # Seed verification
│   │   │   ├── queries/
│   │   │   │   ├── system-templates.ts    # TIER 1 queries
│   │   │   │   ├── user-customizations.ts # TIER 2 queries
│   │   │   │   ├── agent-memories.ts      # TIER 3 queries
│   │   │   │   ├── agent-workspaces.ts    # TIER 3 queries
│   │   │   │   ├── avi-state.ts           # Orchestrator state
│   │   │   │   └── error-log.ts           # Error tracking
│   │   │   ├── connection.ts              # Connection pool manager
│   │   │   ├── transaction.ts             # Transaction helpers
│   │   │   ├── health-check.ts            # DB health monitoring
│   │   │   └── index.ts                   # Database module exports
│   │   │
│   │   ├── types/                          # TypeScript type definitions
│   │   │   ├── database/
│   │   │   │   ├── system-agent-template.ts
│   │   │   │   ├── user-agent-customization.ts
│   │   │   │   ├── agent-memory.ts
│   │   │   │   ├── agent-workspace.ts
│   │   │   │   ├── avi-state.ts
│   │   │   │   └── error-log.ts
│   │   │   ├── config/
│   │   │   │   ├── system-template-config.ts
│   │   │   │   ├── posting-rules.ts
│   │   │   │   ├── api-schema.ts
│   │   │   │   └── safety-constraints.ts
│   │   │   ├── agent/
│   │   │   │   ├── agent-context.ts
│   │   │   │   ├── work-ticket.ts
│   │   │   │   └── validation-result.ts
│   │   │   └── index.ts                   # Type exports
│   │   │
│   │   ├── config/                         # Configuration management
│   │   │   ├── env.ts                     # Environment variable loader
│   │   │   ├── database-config.ts         # DB connection config
│   │   │   ├── validation.ts              # Config validation
│   │   │   └── index.ts                   # Config exports
│   │   │
│   │   ├── utils/                          # Utility functions
│   │   │   ├── logger.ts                  # Structured logging
│   │   │   ├── error-handler.ts           # Error utilities
│   │   │   ├── validation.ts              # Input validation
│   │   │   └── index.ts                   # Utils exports
│   │   │
│   │   ├── monitoring/                     # Health & metrics (minimal for Phase 1)
│   │   │   ├── health-monitor.ts          # Basic health checks
│   │   │   └── index.ts
│   │   │
│   │   └── index.ts                        # Main application entry (Phase 2+)
│   │
│   ├── config/
│   │   └── system/                         # TIER 1: Protected system config
│   │       ├── agent-templates/
│   │       │   ├── tech-guru.json         # Example template
│   │       │   ├── creative-writer.json   # Example template
│   │       │   └── data-analyst.json      # Example template
│   │       └── posting-rules.json         # Global posting rules
│   │
│   ├── tests/                              # Test suite
│   │   ├── unit/
│   │   │   ├── database/
│   │   │   │   ├── connection.test.ts
│   │   │   │   ├── queries/
│   │   │   │   │   ├── system-templates.test.ts
│   │   │   │   │   ├── user-customizations.test.ts
│   │   │   │   │   └── agent-memories.test.ts
│   │   │   │   ├── transaction.test.ts
│   │   │   │   └── health-check.test.ts
│   │   │   ├── config/
│   │   │   │   ├── env.test.ts
│   │   │   │   └── validation.test.ts
│   │   │   └── utils/
│   │   │       ├── logger.test.ts
│   │   │       └── validation.test.ts
│   │   │
│   │   ├── integration/
│   │   │   ├── database/
│   │   │   │   ├── migration.test.ts      # Migration system tests
│   │   │   │   ├── seeding.test.ts        # Template seeding tests
│   │   │   │   ├── tier-protection.test.ts # Data protection tests
│   │   │   │   └── connection-pooling.test.ts
│   │   │   └── setup/
│   │   │       ├── test-database.ts       # Test DB setup
│   │   │       └── cleanup.ts             # Test cleanup
│   │   │
│   │   ├── fixtures/
│   │   │   ├── system-templates/          # Test template fixtures
│   │   │   │   └── test-template.json
│   │   │   └── database/
│   │   │       ├── test-schema.sql
│   │   │       └── test-data.sql
│   │   │
│   │   ├── helpers/
│   │   │   ├── db-test-helper.ts          # Database test utilities
│   │   │   ├── mock-factory.ts            # Mock data generators
│   │   │   └── assertion-helpers.ts       # Custom assertions
│   │   │
│   │   └── setup/
│   │       ├── jest.setup.ts              # Jest configuration
│   │       ├── teardown.ts                # Test teardown
│   │       └── global-setup.ts            # Global test setup
│   │
│   ├── docker/
│   │   ├── Dockerfile                      # Production container
│   │   ├── Dockerfile.dev                  # Development container
│   │   ├── docker-compose.yml              # Full stack
│   │   ├── docker-compose.dev.yml          # Dev environment
│   │   ├── init-db.sh                      # DB initialization script
│   │   └── healthcheck.sh                  # Container health check
│   │
│   ├── scripts/
│   │   ├── db-migrate.ts                   # CLI migration runner
│   │   ├── db-seed.ts                      # CLI seeding runner
│   │   ├── db-reset.ts                     # Reset database (dev only)
│   │   ├── verify-setup.ts                 # Verify installation
│   │   └── backup-user-data.sh             # User data backup script
│   │
│   ├── docs/
│   │   ├── database-schema.md              # Schema documentation
│   │   ├── migration-guide.md              # Migration instructions
│   │   ├── seeding-guide.md                # Template seeding guide
│   │   ├── development-setup.md            # Dev environment setup
│   │   └── testing-guide.md                # Testing instructions
│   │
│   ├── .env.example                        # Environment template
│   ├── .gitignore                          # Git ignore rules
│   ├── package.json                        # Node dependencies
│   ├── tsconfig.json                       # TypeScript config
│   ├── jest.config.ts                      # Jest configuration
│   ├── README.md                           # Project overview
│   └── CHANGELOG.md                        # Version history
│
└── data/                                   # TIER 3: User data (Docker volumes)
    ├── postgres/                           # PostgreSQL data directory
    └── backups/                            # Automated backups
        └── user-data/                      # User data backups only
```

---

## Module Boundaries and Responsibilities

### 1. Database Module (`src/database/`)

**Purpose:** Centralized database access layer with connection pooling, query builders, and health monitoring.

**Responsibilities:**
- PostgreSQL connection management
- Connection pooling and health checks
- Query execution and transaction handling
- Migration system orchestration
- Template seeding and verification

**Public API:**
```typescript
// src/database/index.ts
export { getConnection, closeConnection, healthCheck } from './connection';
export { runMigrations, rollbackMigration } from './migrations/migration-runner';
export { seedSystemTemplates } from './seeds/seed-system-templates';
export { withTransaction } from './transaction';

// Query modules (grouped by data tier)
export * as SystemTemplateQueries from './queries/system-templates';
export * as UserCustomizationQueries from './queries/user-customizations';
export * as AgentMemoryQueries from './queries/agent-memories';
export * as AgentWorkspaceQueries from './queries/agent-workspaces';
export * as AviStateQueries from './queries/avi-state';
export * as ErrorLogQueries from './queries/error-log';
```

**Dependencies:**
- `pg` (PostgreSQL client)
- `src/types` (type definitions)
- `src/utils/logger` (logging)
- `src/config` (database configuration)

**Import Rules:**
- ✅ Can import from: `types/`, `utils/`, `config/`
- ❌ Cannot import from: `monitoring/` (circular dependency prevention)

---

### 2. Types Module (`src/types/`)

**Purpose:** Centralized TypeScript type definitions for all data models, configurations, and domain objects.

**Responsibilities:**
- Database table types
- Configuration file types
- Domain model types
- API contract types
- Validation schemas

**Public API:**
```typescript
// src/types/index.ts
export * from './database/system-agent-template';
export * from './database/user-agent-customization';
export * from './database/agent-memory';
export * from './database/agent-workspace';
export * from './database/avi-state';
export * from './database/error-log';

export * from './config/system-template-config';
export * from './config/posting-rules';
export * from './config/api-schema';
export * from './config/safety-constraints';

export * from './agent/agent-context';
export * from './agent/work-ticket';
export * from './agent/validation-result';
```

**Dependencies:**
- None (pure types, zero runtime dependencies)

**Import Rules:**
- ✅ Can be imported by: Any module
- ❌ Cannot import: Anything (types only)

---

### 3. Config Module (`src/config/`)

**Purpose:** Environment variable loading, validation, and configuration management.

**Responsibilities:**
- Load and validate environment variables
- Provide type-safe configuration objects
- Database connection configuration
- Model selection defaults

**Public API:**
```typescript
// src/config/index.ts
export { getEnvConfig, validateEnvConfig } from './env';
export { getDatabaseConfig } from './database-config';
export { getAviModel, getAgentModel } from './models';
```

**Example Configuration:**
```typescript
// src/config/env.ts
export interface EnvConfig {
  // Database
  DATABASE_URL: string;
  DB_POOL_MIN: number;
  DB_POOL_MAX: number;

  // Claude Models
  AGENT_MODEL: string;  // Default: claude-sonnet-4-5-20250929
  AVI_MODEL: string;    // Default: claude-sonnet-4-5-20250929

  // Anthropic API
  ANTHROPIC_API_KEY: string;

  // Environment
  NODE_ENV: 'development' | 'production' | 'test';
  LOG_LEVEL: string;

  // Health checks
  HEALTH_CHECK_INTERVAL: number;
  AVI_CONTEXT_LIMIT: number;
}
```

**Dependencies:**
- `dotenv` (environment loading)
- `src/types` (type definitions)

**Import Rules:**
- ✅ Can import from: `types/`, `utils/logger`
- ❌ Cannot import from: `database/` (circular dependency)

---

### 4. Utils Module (`src/utils/`)

**Purpose:** Reusable utility functions for logging, error handling, and validation.

**Responsibilities:**
- Structured logging
- Error formatting and handling
- Input validation
- Common utilities

**Public API:**
```typescript
// src/utils/index.ts
export { logger } from './logger';
export { formatError, isRetryableError } from './error-handler';
export { validateInput, sanitizeInput } from './validation';
```

**Logger Example:**
```typescript
// src/utils/logger.ts
export const logger = {
  info: (message: string, meta?: object) => void;
  warn: (message: string, meta?: object) => void;
  error: (message: string, error?: Error, meta?: object) => void;
  debug: (message: string, meta?: object) => void;
};
```

**Dependencies:**
- None (or minimal external logging library)

**Import Rules:**
- ✅ Can import from: `types/`
- ✅ Can be imported by: Any module

---

### 5. Monitoring Module (`src/monitoring/`)

**Purpose:** Basic health checks and monitoring (minimal for Phase 1).

**Responsibilities:**
- Database health checks
- Basic metrics collection
- Health check endpoint logic

**Public API:**
```typescript
// src/monitoring/index.ts
export { HealthMonitor } from './health-monitor';
export { checkDatabaseHealth } from './health-monitor';
```

**Dependencies:**
- `src/database` (health check queries)
- `src/utils/logger` (logging)

**Import Rules:**
- ✅ Can import from: `database/`, `utils/`, `types/`

---

## Database Query Module Structure

Each query module follows a consistent pattern:

### Example: `src/database/queries/system-templates.ts`

```typescript
import { Pool } from 'pg';
import { SystemAgentTemplate } from '../../types/database/system-agent-template';

/**
 * Get system template by name (TIER 1)
 */
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

/**
 * Get all system templates (TIER 1)
 */
export async function getAllSystemTemplates(
  pool: Pool
): Promise<SystemAgentTemplate[]> {
  const result = await pool.query(
    'SELECT * FROM system_agent_templates ORDER BY name'
  );
  return result.rows;
}

/**
 * Upsert system template (migration only)
 */
export async function upsertSystemTemplate(
  pool: Pool,
  template: Omit<SystemAgentTemplate, 'created_at' | 'updated_at'>
): Promise<void> {
  await pool.query(
    `INSERT INTO system_agent_templates
     (name, version, model, posting_rules, api_schema, safety_constraints,
      default_personality, default_response_style)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (name) DO UPDATE SET
       version = EXCLUDED.version,
       model = EXCLUDED.model,
       posting_rules = EXCLUDED.posting_rules,
       api_schema = EXCLUDED.api_schema,
       safety_constraints = EXCLUDED.safety_constraints,
       default_personality = EXCLUDED.default_personality,
       default_response_style = EXCLUDED.default_response_style,
       updated_at = NOW()`,
    [
      template.name,
      template.version,
      template.model,
      JSON.stringify(template.posting_rules),
      JSON.stringify(template.api_schema),
      JSON.stringify(template.safety_constraints),
      template.default_personality,
      JSON.stringify(template.default_response_style)
    ]
  );
}
```

---

## Configuration File Structure

### System Template Example

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
  "default_personality": "You are Tech Guru, an enthusiastic technology expert who shares insights on AI, software engineering, and emerging tech trends. You're knowledgeable but approachable, using clear explanations without unnecessary jargon.",
  "default_response_style": {
    "tone": "professional",
    "length": "concise",
    "use_emojis": false
  }
}
```

---

## Test Organization

### Unit Tests

**Location:** `tests/unit/`

**Purpose:** Test individual functions and modules in isolation.

**Structure:**
```
tests/unit/
├── database/
│   ├── connection.test.ts          # Connection pool tests
│   ├── queries/
│   │   └── system-templates.test.ts # Query function tests
│   └── transaction.test.ts         # Transaction helper tests
├── config/
│   └── env.test.ts                 # Config validation tests
└── utils/
    └── logger.test.ts              # Logger tests
```

**Example Test:**
```typescript
// tests/unit/database/queries/system-templates.test.ts
import { Pool } from 'pg';
import { getSystemTemplate } from '../../../src/database/queries/system-templates';

describe('SystemTemplateQueries', () => {
  let mockPool: jest.Mocked<Pool>;

  beforeEach(() => {
    mockPool = {
      query: jest.fn(),
    } as any;
  });

  describe('getSystemTemplate', () => {
    it('should return template when found', async () => {
      const mockTemplate = {
        name: 'tech-guru',
        version: 1,
        model: null,
        // ... other fields
      };

      mockPool.query.mockResolvedValue({
        rows: [mockTemplate],
      } as any);

      const result = await getSystemTemplate(mockPool, 'tech-guru');

      expect(result).toEqual(mockTemplate);
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM system_agent_templates WHERE name = $1',
        ['tech-guru']
      );
    });

    it('should return null when not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] } as any);

      const result = await getSystemTemplate(mockPool, 'nonexistent');

      expect(result).toBeNull();
    });
  });
});
```

---

### Integration Tests

**Location:** `tests/integration/`

**Purpose:** Test interactions between modules with real database.

**Structure:**
```
tests/integration/
├── database/
│   ├── migration.test.ts           # Migration system
│   ├── seeding.test.ts             # Template seeding
│   ├── tier-protection.test.ts     # Data protection
│   └── connection-pooling.test.ts  # Connection management
└── setup/
    ├── test-database.ts            # Test DB creation
    └── cleanup.ts                  # Test cleanup
```

**Example Test:**
```typescript
// tests/integration/database/seeding.test.ts
import { Pool } from 'pg';
import { seedSystemTemplates } from '../../../src/database/seeds/seed-system-templates';
import { getAllSystemTemplates } from '../../../src/database/queries/system-templates';
import { createTestDatabase, cleanupTestDatabase } from '../setup/test-database';

describe('Template Seeding Integration', () => {
  let pool: Pool;

  beforeAll(async () => {
    pool = await createTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase(pool);
  });

  it('should seed system templates from config files', async () => {
    // Seed templates
    await seedSystemTemplates(pool, './config/system/agent-templates');

    // Verify templates were created
    const templates = await getAllSystemTemplates(pool);

    expect(templates.length).toBeGreaterThan(0);
    expect(templates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'tech-guru' }),
        expect.objectContaining({ name: 'creative-writer' }),
        expect.objectContaining({ name: 'data-analyst' })
      ])
    );
  });

  it('should update templates on re-seeding', async () => {
    // First seed
    await seedSystemTemplates(pool, './config/system/agent-templates');

    // Get initial version
    const before = await getAllSystemTemplates(pool);

    // Modify a template config (simulated)
    // Re-seed
    await seedSystemTemplates(pool, './config/system/agent-templates');

    // Verify idempotence
    const after = await getAllSystemTemplates(pool);
    expect(after.length).toBe(before.length);
  });
});
```

---

## Import/Export Structure

### Barrel Exports Pattern

Each module uses index files for clean exports:

```typescript
// src/database/index.ts
export { getConnection, closeConnection, healthCheck } from './connection';
export { runMigrations, rollbackMigration } from './migrations/migration-runner';
export { seedSystemTemplates } from './seeds/seed-system-templates';
export { withTransaction } from './transaction';

// Query modules
export * as SystemTemplateQueries from './queries/system-templates';
export * as UserCustomizationQueries from './queries/user-customizations';
export * as AgentMemoryQueries from './queries/agent-memories';
```

### Usage Example

```typescript
// Consumer code
import {
  getConnection,
  SystemTemplateQueries,
  UserCustomizationQueries
} from '../database';

async function loadAgentContext(userId: string, agentType: string) {
  const pool = await getConnection();

  // TIER 1: Load system template
  const template = await SystemTemplateQueries.getSystemTemplate(pool, agentType);

  // TIER 2: Load user customizations
  const custom = await UserCustomizationQueries.getUserCustomization(
    pool,
    userId,
    agentType
  );

  return { template, custom };
}
```

---

## Environment Variables

### `.env.example`

```bash
# Database Configuration
DATABASE_URL=postgresql://postgres:password@localhost:5432/avidm
DB_POOL_MIN=2
DB_POOL_MAX=10
DB_IDLE_TIMEOUT_MS=30000
DB_CONNECTION_TIMEOUT_MS=2000

# Claude Models
AGENT_MODEL=claude-sonnet-4-5-20250929
AVI_MODEL=claude-sonnet-4-5-20250929

# Anthropic API
ANTHROPIC_API_KEY=sk-ant-api03-...

# Platform API (for Phase 2+)
PLATFORM_API_KEY=your-platform-api-key

# Environment
NODE_ENV=development
LOG_LEVEL=info

# Health Monitoring
HEALTH_CHECK_INTERVAL=30000
AVI_CONTEXT_LIMIT=50000

# Retry Configuration
RETRY_MAX_ATTEMPTS=3
RETRY_BACKOFF_MS=5000,30000,120000

# Agent Configuration
MAX_AGENT_WORKERS=10
```

---

## Package Dependencies

### `package.json` (Phase 1)

```json
{
  "name": "avi-dm",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:unit": "jest tests/unit",
    "test:integration": "jest tests/integration",
    "test:coverage": "jest --coverage",
    "db:migrate": "tsx scripts/db-migrate.ts",
    "db:seed": "tsx scripts/db-seed.ts",
    "db:reset": "tsx scripts/db-reset.ts",
    "lint": "eslint src tests",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "pg": "^8.11.3",
    "dotenv": "^16.4.5",
    "winston": "^3.11.0"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "@types/pg": "^8.11.0",
    "@types/jest": "^29.5.11",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.1",
    "tsx": "^4.7.0",
    "typescript": "^5.3.3",
    "eslint": "^8.56.0",
    "@typescript-eslint/parser": "^6.19.0",
    "@typescript-eslint/eslint-plugin": "^6.19.0"
  }
}
```

---

## TypeScript Configuration

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@database/*": ["./src/database/*"],
      "@types/*": ["./src/types/*"],
      "@config/*": ["./src/config/*"],
      "@utils/*": ["./src/utils/*"],
      "@monitoring/*": ["./src/monitoring/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

---

## Jest Configuration

### `jest.config.ts`

```typescript
import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests', '<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
    '!src/types/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  moduleNameMapper: {
    '^@database/(.*)$': '<rootDir>/src/database/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@monitoring/(.*)$': '<rootDir>/src/monitoring/$1'
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.setup.ts'],
  globalSetup: '<rootDir>/tests/setup/global-setup.ts',
  globalTeardown: '<rootDir>/tests/setup/teardown.ts'
};

export default config;
```

---

## Docker Configuration

### `docker-compose.yml` (Development)

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: avidm-postgres-dev
    environment:
      POSTGRES_DB: avidm_dev
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: dev_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_dev_data:/var/lib/postgresql/data
      - ./avi-dm/src/database/schema:/docker-entrypoint-initdb.d:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  app:
    build:
      context: ./avi-dm
      dockerfile: docker/Dockerfile.dev
    container_name: avidm-app-dev
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://postgres:dev_password@postgres:5432/avidm_dev
      LOG_LEVEL: debug
    volumes:
      - ./avi-dm/src:/app/src:ro
      - ./avi-dm/config:/app/config:ro
      - ./avi-dm/tests:/app/tests:ro
    depends_on:
      postgres:
        condition: service_healthy
    command: npm run dev

volumes:
  postgres_dev_data:
```

---

## Key Design Decisions

### 1. Module Organization

**Decision:** Organize by feature/layer, not by file type.

**Rationale:**
- Related code stays together
- Easier to locate functionality
- Clear module boundaries
- Better encapsulation

### 2. Query Organization

**Decision:** Separate query modules by data tier (TIER 1, 2, 3).

**Rationale:**
- Enforces 3-tier data protection model
- Clear separation of concerns
- Easy to audit data access patterns
- Prevents accidental cross-tier modifications

### 3. Type Definitions

**Decision:** Centralize all types in `src/types/` with zero dependencies.

**Rationale:**
- No circular dependencies
- Types can be imported anywhere
- Single source of truth
- Easy to generate documentation

### 4. Test Organization

**Decision:** Mirror source structure in `tests/unit/`, separate `tests/integration/`.

**Rationale:**
- Easy to find corresponding tests
- Clear separation of test types
- Integration tests can use shared setup
- Unit tests remain fast and isolated

### 5. Configuration Management

**Decision:** Validate all environment variables on startup.

**Rationale:**
- Fail fast on misconfiguration
- Type-safe configuration access
- Clear error messages
- Prevents runtime surprises

---

## Migration Strategy

### Running Migrations

```bash
# Development
npm run db:migrate

# Production
NODE_ENV=production npm run db:migrate
```

### Migration Files

```sql
-- migrations/001_initial_schema.sql
BEGIN;

-- TIER 1: System templates
CREATE TABLE system_agent_templates (
  name VARCHAR(50) PRIMARY KEY,
  version INTEGER NOT NULL,
  model VARCHAR(100),
  posting_rules JSONB NOT NULL,
  api_schema JSONB NOT NULL,
  safety_constraints JSONB NOT NULL,
  default_personality TEXT,
  default_response_style JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT system_only CHECK (version > 0)
);

-- TIER 2: User customizations
CREATE TABLE user_agent_customizations (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(100) NOT NULL,
  agent_template VARCHAR(50) REFERENCES system_agent_templates(name),
  custom_name VARCHAR(100),
  personality TEXT,
  interests JSONB,
  response_style JSONB,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, agent_template)
);

-- TIER 3: Agent memories
CREATE TABLE agent_memories (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(100) NOT NULL,
  agent_name VARCHAR(50) NOT NULL,
  post_id VARCHAR(100),
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT no_manual_delete CHECK (created_at IS NOT NULL)
);

-- TIER 3: Agent workspaces
CREATE TABLE agent_workspaces (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(100) NOT NULL,
  agent_name VARCHAR(100) NOT NULL,
  file_path TEXT NOT NULL,
  content BYTEA,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, agent_name, file_path)
);

-- Avi state
CREATE TABLE avi_state (
  id INTEGER PRIMARY KEY DEFAULT 1,
  last_feed_position VARCHAR(100),
  pending_tickets JSONB,
  context_size INTEGER DEFAULT 0,
  last_restart TIMESTAMP,
  uptime_seconds INTEGER DEFAULT 0,
  CONSTRAINT single_row CHECK (id = 1)
);

-- Error log
CREATE TABLE error_log (
  id SERIAL PRIMARY KEY,
  agent_name VARCHAR(50),
  error_type VARCHAR(50),
  error_message TEXT,
  context JSONB,
  retry_count INTEGER DEFAULT 0,
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

COMMIT;
```

---

## Phase 1 Completion Checklist

### Database Layer
- [ ] PostgreSQL schema files created (`schema.sql`, `indexes.sql`, `constraints.sql`)
- [ ] Migration system implemented (`migration-runner.ts`)
- [ ] Connection pooling configured (`connection.ts`)
- [ ] Transaction helpers implemented (`transaction.ts`)
- [ ] Health check system (`health-check.ts`)
- [ ] All query modules implemented (6 modules)

### Type Definitions
- [ ] Database types defined (6 tables)
- [ ] Configuration types defined (4 config types)
- [ ] Domain types defined (3 agent types)

### Configuration
- [ ] Environment variable loader (`env.ts`)
- [ ] Database configuration (`database-config.ts`)
- [ ] Configuration validation (`validation.ts`)

### System Templates
- [ ] Template seed files created (3 examples)
- [ ] Seeding function implemented (`seed-system-templates.ts`)
- [ ] Verification system (`verify-seeding.ts`)

### Testing
- [ ] Unit tests for all query modules (6 modules)
- [ ] Unit tests for configuration
- [ ] Integration tests for migrations
- [ ] Integration tests for seeding
- [ ] Integration tests for data protection
- [ ] Test helpers and fixtures

### Docker
- [ ] Development Dockerfile
- [ ] Production Dockerfile
- [ ] docker-compose.yml (dev)
- [ ] docker-compose.yml (prod)
- [ ] Health check scripts

### Scripts
- [ ] Migration CLI runner
- [ ] Seeding CLI runner
- [ ] Database reset script (dev)
- [ ] Setup verification script
- [ ] Backup script

### Documentation
- [ ] Database schema documentation
- [ ] Migration guide
- [ ] Seeding guide
- [ ] Development setup guide
- [ ] Testing guide
- [ ] README.md

---

## Next Steps (Phase 2)

After Phase 1 completion:

1. **Avi DM Core** - Implement orchestrator loop
2. **Agent Workers** - Implement spawning mechanism
3. **Context Composition** - Implement protected composition
4. **Validation Layer** - Implement post validation
5. **Error Handling** - Implement retry logic

---

## Summary

**Phase 1 establishes:**
- ✅ Complete 3-tier database architecture
- ✅ Type-safe data access layer
- ✅ Protected configuration system
- ✅ Comprehensive test infrastructure
- ✅ Production-ready Docker deployment
- ✅ Data migration and seeding system

**Key Principles:**
- **Data Protection:** 3-tier model enforced at every layer
- **Type Safety:** TypeScript throughout
- **Testability:** Unit + integration tests
- **Modularity:** Clear boundaries and dependencies
- **Documentation:** Every module documented

This architecture provides a solid foundation for building the Avi DM orchestrator and ephemeral agent workers in subsequent phases.

---

**File Locations:**
- Architecture Plan: `/workspaces/agent-feed/AVI-ARCHITECTURE-PLAN.md`
- This Document: `/workspaces/agent-feed/PHASE-1-FILE-STRUCTURE-AND-ARCHITECTURE.md`
