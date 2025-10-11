# Phase 1: Architecture Decision Records (ADRs)
## Avi DM - Database & Core Infrastructure

**Version:** 1.0
**Date:** 2025-10-10
**Status:** Accepted

---

## ADR-001: Use PostgreSQL with JSONB Instead of Vector Database

**Date:** 2025-10-10
**Status:** Accepted
**Deciders:** System Architect

### Context

For agent memory storage and retrieval, we need to decide between:
1. PostgreSQL with JSONB + GIN indexes
2. Dedicated vector database (Pinecone, Weaviate, etc.)
3. PostgreSQL with pgvector extension

### Decision

**Use PostgreSQL with JSONB and GIN indexes** for memory storage and retrieval.

### Rationale

**Advantages:**
- **Simpler infrastructure** - Single database instead of two systems
- **Proven reliability** - PostgreSQL is battle-tested with excellent tooling
- **Cost effective** - No vector embedding API calls or separate service costs
- **Fast enough** - JSONB + GIN indexes handle tag-based retrieval efficiently
- **Operational simplicity** - One database to backup, monitor, and maintain
- **Transaction support** - ACID guarantees across all data

**Trade-offs:**
- Less sophisticated semantic search (acceptable for MVP)
- No automatic similarity scoring (can add later if needed)

### Consequences

**Positive:**
- Reduced operational complexity
- Lower infrastructure costs
- Faster development (no vector embedding pipeline)
- Easier local development

**Negative:**
- Limited to tag-based and recency-based retrieval
- May need to migrate to vectors if semantic search becomes critical

**Migration Path:**
- Can add pgvector extension later without schema changes
- JSONB metadata already supports semantic tags

---

## ADR-002: Implement 3-Tier Data Protection Model

**Date:** 2025-10-10
**Status:** Accepted
**Deciders:** System Architect

### Context

Need to balance:
- System integrity (posting rules, API schemas cannot be user-modified)
- User flexibility (personality, interests should be customizable)
- Data ownership (user data must survive app updates)

### Decision

**Implement a 3-tier data protection model:**

**TIER 1: System Core (Immutable)**
- System agent templates
- Posting rules, API schemas, safety constraints
- Only updateable via code deployments

**TIER 2: User Customizations (Composition Pattern)**
- User personality overrides
- Interests, response styles
- Merged with system templates at runtime

**TIER 3: User Data (Fully Protected)**
- Agent memories
- Workspaces
- Never deleted on updates

### Rationale

**Security Benefits:**
- Users cannot bypass platform rate limits
- API schemas remain consistent
- Safety constraints are enforced

**Flexibility Benefits:**
- Users can personalize agents
- Customizations persist across updates
- Clear upgrade path

**Data Protection:**
- User data survives all app updates
- Clear ownership boundaries
- Automated backup separation

### Implementation

```typescript
// Runtime composition
const agentContext = {
  // TIER 1: Protected (from template)
  model: template.model,
  posting_rules: template.posting_rules,
  api_schema: template.api_schema,
  safety_constraints: template.safety_constraints,

  // TIER 2: Customizable (user overrides)
  personality: custom?.personality || template.default_personality,
  interests: custom?.interests || [],
  response_style: custom?.response_style || template.default_response_style
};
```

### Consequences

**Positive:**
- Clear security boundaries
- User trust (data is protected)
- Safe customization
- Predictable updates

**Negative:**
- More complex composition logic
- Validation required on customizations
- Documentation needed for users

---

## ADR-003: Organize Code by Feature/Layer, Not File Type

**Date:** 2025-10-10
**Status:** Accepted
**Deciders:** System Architect

### Context

Two common organizational patterns:
1. **By file type**: `models/`, `controllers/`, `services/`
2. **By feature**: `database/`, `agents/`, `avi/`

### Decision

**Organize by feature/layer** with clear module boundaries.

### Rationale

**Advantages:**
- Related code stays together
- Easier navigation ("where's the database code?" → "in database/")
- Clear module boundaries
- Better encapsulation
- Easier to extract into microservices later

**Structure:**
```
src/
├── database/      # All database code
├── agents/        # All agent worker code
├── avi/           # All orchestrator code
├── types/         # All type definitions
├── config/        # All configuration
└── utils/         # Shared utilities
```

### Consequences

**Positive:**
- Intuitive navigation
- Clear ownership
- Easy to locate functionality
- Module boundaries enforced

**Negative:**
- Deeper nesting in some cases
- Need to maintain index.ts exports

---

## ADR-004: Centralize Types with Zero Dependencies

**Date:** 2025-10-10
**Status:** Accepted
**Deciders:** System Architect

### Context

TypeScript types can live:
1. Next to implementation files
2. In a centralized `types/` directory
3. Mixed approach

### Decision

**Centralize all types in `src/types/` with zero runtime dependencies.**

### Rationale

**Advantages:**
- No circular dependencies possible
- Single source of truth
- Types can be imported anywhere
- Easy to generate documentation
- Clear separation of data models from logic

**Structure:**
```
src/types/
├── database/       # Database table types
├── config/         # Configuration types
├── agent/          # Domain types
└── index.ts        # Barrel export
```

### Consequences

**Positive:**
- Zero circular dependency issues
- Clear type contracts
- Easy to share types across modules
- Documentation generation

**Negative:**
- Types separated from implementation
- Need to maintain parallel structure

**Mitigation:**
- Use consistent naming (e.g., `SystemAgentTemplate` type for `system_agent_templates` table)
- Document relationships in type comments

---

## ADR-005: Use Query Module Pattern for Database Access

**Date:** 2025-10-10
**Status:** Accepted
**Deciders:** System Architect

### Context

Database access patterns:
1. **ORM** (Prisma, TypeORM)
2. **Query Builder** (Knex)
3. **Raw SQL with organized modules**

### Decision

**Use raw SQL with organized query modules** grouped by data tier.

### Rationale

**Advantages:**
- Full SQL control (PostgreSQL-specific features)
- No ORM abstraction overhead
- Easier performance optimization
- Clear data tier boundaries
- Simple to test (mock pool.query)

**Structure:**
```typescript
// src/database/queries/system-templates.ts
export async function getSystemTemplate(pool: Pool, name: string) {
  const result = await pool.query(
    'SELECT * FROM system_agent_templates WHERE name = $1',
    [name]
  );
  return result.rows[0] || null;
}
```

**Grouped by tier:**
- `system-templates.ts` (TIER 1)
- `user-customizations.ts` (TIER 2)
- `agent-memories.ts` (TIER 3)

### Consequences

**Positive:**
- Maximum performance control
- No ORM learning curve
- Direct PostgreSQL feature access
- Easy to audit data access
- Clear tier boundaries

**Negative:**
- More boilerplate
- Manual type mapping
- No automatic migrations

**Mitigation:**
- Use consistent query patterns
- Provide query helpers
- Centralize type mapping

---

## ADR-006: Implement Migration System with Data Protection

**Date:** 2025-10-10
**Status:** Accepted
**Deciders:** System Architect

### Context

Database migrations need to:
- Version schema changes
- Protect user data during updates
- Provide rollback capability
- Verify data integrity

### Decision

**Implement custom migration system with data protection verification.**

### Rationale

**Migration Pattern:**
```typescript
class Migration {
  async up(pool: Pool): Promise<void>;
  async down(pool: Pool): Promise<void>;
  async verify(pool: Pool): Promise<void>;
}
```

**Protection Guarantees:**
1. Never modify TIER 3 data
2. Verify data counts before/after
3. Automated backups before migrations
4. Rollback capability

**Example:**
```typescript
async verify(pool: Pool) {
  const before = await pool.query(
    'SELECT COUNT(*) FROM agent_memories'
  );

  // ... run migration ...

  const after = await pool.query(
    'SELECT COUNT(*) FROM agent_memories'
  );

  if (before.rows[0].count !== after.rows[0].count) {
    throw new Error('Data loss detected during migration');
  }
}
```

### Consequences

**Positive:**
- Data loss prevention
- Audit trail
- Confidence in updates
- Rollback capability

**Negative:**
- More complex migrations
- Longer migration times
- Verification overhead

---

## ADR-007: Use Environment Variables with Validation

**Date:** 2025-10-10
**Status:** Accepted
**Deciders:** System Architect

### Context

Configuration can come from:
1. Environment variables
2. Configuration files
3. Database settings
4. Mixed approach

### Decision

**Use environment variables with strict validation on startup.**

### Rationale

**12-Factor App Compliance:**
- Environment-specific configuration
- No secrets in code
- Easy deployment

**Validation Strategy:**
```typescript
export function validateEnvConfig(): EnvConfig {
  const required = ['DATABASE_URL', 'ANTHROPIC_API_KEY'];

  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  return {
    DATABASE_URL: process.env.DATABASE_URL!,
    AGENT_MODEL: process.env.AGENT_MODEL || 'claude-sonnet-4-5-20250929',
    // ...
  };
}
```

**Fail Fast:**
- Validate on startup
- Type-safe access
- Clear error messages

### Consequences

**Positive:**
- Environment separation
- Secure credential management
- Deployment flexibility
- Clear configuration errors

**Negative:**
- Environment variable proliferation
- Need .env.example documentation

---

## ADR-008: Test Organization: Unit vs Integration

**Date:** 2025-10-10
**Status:** Accepted
**Deciders:** System Architect

### Context

Test organization strategies:
1. Co-locate tests with source
2. Separate test directory
3. Mixed approach

### Decision

**Separate test directory with clear unit/integration split.**

### Rationale

**Structure:**
```
tests/
├── unit/              # Fast, isolated, mocked
│   └── database/
│       └── queries/
├── integration/       # Slower, real database
│   └── database/
└── fixtures/          # Shared test data
```

**Unit Tests:**
- Mock database connections
- Test individual functions
- Fast execution (<1s total)
- No external dependencies

**Integration Tests:**
- Real PostgreSQL database
- Test module interactions
- Slower execution (acceptable)
- Verify end-to-end flows

### Consequences

**Positive:**
- Clear test types
- Fast unit test feedback
- Comprehensive integration coverage
- Shared test utilities

**Negative:**
- Test code duplication
- Integration test setup complexity

**Mitigation:**
- Shared test helpers
- Docker-based test databases
- Parallel test execution

---

## ADR-009: Use Docker Volumes for Data Protection

**Date:** 2025-10-10
**Status:** Accepted
**Deciders:** System Architect

### Context

Data persistence strategies:
1. Bind mounts
2. Named volumes
3. Anonymous volumes

### Decision

**Use named volumes with read-only bind mounts for system config.**

### Rationale

**Volume Strategy:**
```yaml
volumes:
  # System config (read-only, version controlled)
  - ./config/system:/app/config/system:ro

  # User data (persistent, writable)
  - postgres_data:/var/lib/postgresql/data
  - agent_workspaces:/app/data/workspaces
```

**Protection Guarantees:**
- System templates cannot be modified at runtime (`:ro`)
- User data persists across container rebuilds
- Clear separation of concerns

### Consequences

**Positive:**
- Data survives updates
- System protection enforced
- Docker-native approach
- Easy backup/restore

**Negative:**
- Volume management complexity
- Need backup procedures

---

## ADR-010: Implement Structured Logging

**Date:** 2025-10-10
**Status:** Accepted
**Deciders:** System Architect

### Context

Logging approaches:
1. console.log
2. Structured logging library
3. External logging service

### Decision

**Use structured logging with Winston.**

### Rationale

**Format:**
```typescript
logger.info('Database connection established', {
  poolSize: 10,
  database: 'avidm',
  host: 'localhost'
});
```

**Benefits:**
- Machine-parseable logs
- Contextual metadata
- Log level filtering
- Easy integration with log aggregators

### Consequences

**Positive:**
- Better debugging
- Production monitoring
- Log aggregation ready
- Contextual information

**Negative:**
- Slight learning curve
- More verbose

---

## Summary of Key Decisions

| ADR | Decision | Impact |
|-----|----------|--------|
| 001 | PostgreSQL over vector DB | Simpler infrastructure, fast development |
| 002 | 3-tier data protection | Security + user flexibility |
| 003 | Feature-based organization | Better navigation, clear boundaries |
| 004 | Centralized types | No circular dependencies |
| 005 | Query module pattern | Full SQL control, clear tiers |
| 006 | Protected migrations | Data safety guarantees |
| 007 | Validated env vars | Fail fast, type-safe config |
| 008 | Separate test directories | Clear test types, fast feedback |
| 009 | Docker volume protection | Data persistence, system protection |
| 010 | Structured logging | Better debugging, monitoring |

---

## Decision Framework

When evaluating future architectural decisions, consider:

### 1. Data Protection
- Does this protect TIER 1, 2, 3 boundaries?
- Can user data survive updates?
- Is the upgrade path clear?

### 2. Simplicity
- Does this reduce operational complexity?
- Is it easier to understand and maintain?
- Can new developers onboard quickly?

### 3. Performance
- Does this scale to our needs?
- Are there clear performance characteristics?
- Can we optimize later if needed?

### 4. Testability
- Can we write unit tests easily?
- Is integration testing straightforward?
- Are dependencies mockable?

### 5. Security
- Are system constraints enforceable?
- Can users bypass critical rules?
- Is sensitive data protected?

---

## Revisiting Decisions

These decisions should be revisited if:

1. **Performance issues emerge** (consider vector DB for semantic search)
2. **Scaling beyond single instance** (consider microservices)
3. **Complex querying needs** (consider query builder or ORM)
4. **Team size grows** (consider more code generation)
5. **New requirements conflict** with current architecture

---

**Document Owner:** System Architect
**Last Updated:** 2025-10-10
**Next Review:** After Phase 1 completion

---

**Related Documents:**
- Architecture Plan: `/workspaces/agent-feed/AVI-ARCHITECTURE-PLAN.md`
- File Structure: `/workspaces/agent-feed/PHASE-1-FILE-STRUCTURE-AND-ARCHITECTURE.md`
