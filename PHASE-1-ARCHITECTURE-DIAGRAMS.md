# Phase 1: Architecture Diagrams
## Avi DM - Visual System Architecture

**Version:** 1.0
**Date:** 2025-10-10
**Status:** Documentation

---

## Table of Contents

1. [Module Dependency Graph](#module-dependency-graph)
2. [Database Schema Diagram](#database-schema-diagram)
3. [Data Tier Architecture](#data-tier-architecture)
4. [Directory Structure Tree](#directory-structure-tree)
5. [Import/Export Flow](#importexport-flow)
6. [Test Organization](#test-organization)
7. [Docker Architecture](#docker-architecture)

---

## Module Dependency Graph

```mermaid
graph TB
    subgraph "Application Entry"
        Main[index.ts]
    end

    subgraph "Database Layer"
        Connection[connection.ts]
        Transaction[transaction.ts]
        Health[health-check.ts]
        Migration[migration-runner.ts]
        Seeding[seed-system-templates.ts]

        subgraph "Query Modules"
            QueryT1[system-templates.ts<br/>TIER 1]
            QueryT2[user-customizations.ts<br/>TIER 2]
            QueryT3A[agent-memories.ts<br/>TIER 3]
            QueryT3B[agent-workspaces.ts<br/>TIER 3]
            QueryState[avi-state.ts]
            QueryError[error-log.ts]
        end
    end

    subgraph "Types Layer"
        DBTypes[database/types]
        ConfigTypes[config/types]
        AgentTypes[agent/types]
    end

    subgraph "Configuration Layer"
        Env[env.ts]
        DBConfig[database-config.ts]
        Validation[validation.ts]
    end

    subgraph "Utils Layer"
        Logger[logger.ts]
        ErrorHandler[error-handler.ts]
        InputValidation[validation.ts]
    end

    subgraph "Monitoring Layer"
        HealthMonitor[health-monitor.ts]
    end

    Main --> Connection
    Main --> Migration
    Main --> Seeding

    Connection --> DBConfig
    Connection --> Logger
    Connection --> DBTypes

    QueryT1 --> Connection
    QueryT2 --> Connection
    QueryT3A --> Connection
    QueryT3B --> Connection
    QueryState --> Connection
    QueryError --> Connection

    QueryT1 --> DBTypes
    QueryT2 --> DBTypes
    QueryT3A --> DBTypes

    Migration --> Connection
    Seeding --> Connection
    Seeding --> QueryT1

    Env --> InputValidation
    DBConfig --> Env
    DBConfig --> ConfigTypes

    HealthMonitor --> Connection
    HealthMonitor --> Health
    HealthMonitor --> Logger

    Transaction --> Connection
    Health --> Connection

    style Main fill:#e1f5ff
    style QueryT1 fill:#ffe1e1
    style QueryT2 fill:#fff4e1
    style QueryT3A fill:#e1ffe1
    style QueryT3B fill:#e1ffe1
    style DBTypes fill:#f0f0f0
```

**Legend:**
- 🔴 Red: TIER 1 (System)
- 🟡 Yellow: TIER 2 (User Customizations)
- 🟢 Green: TIER 3 (User Data)
- ⚪ Gray: Types (no dependencies)

---

## Database Schema Diagram

```mermaid
erDiagram
    system_agent_templates ||--o{ user_agent_customizations : "template"
    system_agent_templates {
        varchar name PK "Primary Key"
        int version
        varchar model "Claude model (nullable)"
        jsonb posting_rules "Rate limits, format"
        jsonb api_schema "Platform API"
        jsonb safety_constraints "Content filters"
        text default_personality
        jsonb default_response_style
        timestamp created_at
        timestamp updated_at
    }

    user_agent_customizations {
        serial id PK
        varchar user_id
        varchar agent_template FK "References system template"
        varchar custom_name
        text personality "User override"
        jsonb interests
        jsonb response_style
        bool enabled
        timestamp created_at
        timestamp updated_at
    }

    agent_memories {
        serial id PK
        varchar user_id
        varchar agent_name
        varchar post_id
        text content
        jsonb metadata "Tags, topics"
        timestamp created_at
    }

    agent_workspaces {
        serial id PK
        varchar user_id
        varchar agent_name
        text file_path
        bytea content
        jsonb metadata
        timestamp created_at
        timestamp updated_at
    }

    avi_state {
        int id PK "Always 1"
        varchar last_feed_position
        jsonb pending_tickets
        int context_size
        timestamp last_restart
        int uptime_seconds
    }

    error_log {
        serial id PK
        varchar agent_name
        varchar error_type
        text error_message
        jsonb context
        int retry_count
        bool resolved
        timestamp created_at
    }
```

**Indexes:**
```sql
-- TIER 2: User customizations lookup
CREATE INDEX idx_user_customizations_user_template
  ON user_agent_customizations(user_id, agent_template);

-- TIER 3: Memory retrieval
CREATE INDEX idx_agent_memories_user_agent_recency
  ON agent_memories(user_id, agent_name, created_at DESC);

CREATE INDEX idx_agent_memories_metadata
  ON agent_memories USING GIN(metadata);

-- TIER 3: Workspace lookup
CREATE INDEX idx_agent_workspaces_user_agent
  ON agent_workspaces(user_id, agent_name);

-- Error tracking
CREATE INDEX idx_error_log_unresolved
  ON error_log(resolved, created_at DESC);
```

---

## Data Tier Architecture

```mermaid
graph TB
    subgraph "TIER 1: System Core (Protected)"
        direction TB
        Templates[system_agent_templates]
        ConfigFiles[config/system/agent-templates/*.json]

        Templates -.-> |Seeded from| ConfigFiles

        style Templates fill:#ffe1e1
        style ConfigFiles fill:#ffe1e1
    end

    subgraph "TIER 2: User Customizations (Composition)"
        direction TB
        Customizations[user_agent_customizations]
        RuntimeComposition[Runtime Agent Context]

        Customizations --> RuntimeComposition
        Templates --> RuntimeComposition

        style Customizations fill:#fff4e1
        style RuntimeComposition fill:#fff4e1
    end

    subgraph "TIER 3: User Data (Fully Protected)"
        direction TB
        Memories[agent_memories]
        Workspaces[agent_workspaces]
        Backups[Automated Backups]

        Memories --> Backups
        Workspaces --> Backups

        style Memories fill:#e1ffe1
        style Workspaces fill:#e1ffe1
        style Backups fill:#e1ffe1
    end

    RuntimeComposition -.-> |Generates| Memories

    Note1[Never user-editable<br/>Only via migrations]
    Note2[User editable<br/>Validated at runtime]
    Note3[User owned<br/>Survives all updates]

    Templates -.-> Note1
    Customizations -.-> Note2
    Memories -.-> Note3
```

---

## Directory Structure Tree

```mermaid
graph TB
    Root[avi-dm/]

    Root --> Src[src/]
    Root --> Config[config/]
    Root --> Tests[tests/]
    Root --> Docker[docker/]
    Root --> Scripts[scripts/]
    Root --> Docs[docs/]

    Src --> Database[database/]
    Src --> Types[types/]
    Src --> ConfigMod[config/]
    Src --> Utils[utils/]
    Src --> Monitoring[monitoring/]

    Database --> Schema[schema/]
    Database --> Migrations[migrations/]
    Database --> Seeds[seeds/]
    Database --> Queries[queries/]

    Queries --> QT1[system-templates.ts]
    Queries --> QT2[user-customizations.ts]
    Queries --> QT3A[agent-memories.ts]
    Queries --> QT3B[agent-workspaces.ts]

    Types --> DBTypes[database/]
    Types --> ConfigTypes[config/]
    Types --> AgentTypes[agent/]

    Config --> System[system/]
    System --> Templates[agent-templates/]

    Tests --> Unit[unit/]
    Tests --> Integration[integration/]
    Tests --> Fixtures[fixtures/]

    style Root fill:#e1f5ff
    style Database fill:#ffe1e1
    style Types fill:#f0f0f0
    style Queries fill:#fff4e1
    style Tests fill:#e1ffe1
```

---

## Import/Export Flow

```mermaid
sequenceDiagram
    participant App as Application
    participant DB as Database Module
    participant Queries as Query Modules
    participant Pool as Connection Pool
    participant PG as PostgreSQL

    Note over App,PG: Initialization Phase
    App->>DB: import { getConnection }
    App->>DB: getConnection()
    DB->>Pool: Create connection pool
    Pool->>PG: Establish connections
    PG-->>Pool: Connections ready
    Pool-->>DB: Pool ready
    DB-->>App: Connection pool

    Note over App,PG: Query Execution Phase
    App->>DB: import { SystemTemplateQueries }
    App->>Queries: SystemTemplateQueries.getSystemTemplate(pool, 'tech-guru')
    Queries->>Pool: pool.query(sql, params)
    Pool->>PG: Execute SQL
    PG-->>Pool: Result rows
    Pool-->>Queries: Query result
    Queries-->>App: SystemAgentTemplate | null

    Note over App,PG: Transaction Phase
    App->>DB: withTransaction(callback)
    DB->>Pool: BEGIN
    Pool->>PG: BEGIN TRANSACTION
    App->>Queries: Multiple queries...
    Queries->>Pool: Queries within transaction
    DB->>Pool: COMMIT
    Pool->>PG: COMMIT TRANSACTION
    PG-->>Pool: Transaction committed
    Pool-->>DB: Success
    DB-->>App: Transaction complete
```

---

## Test Organization

```mermaid
graph TB
    subgraph "Test Suite"
        TestRunner[Jest Test Runner]
    end

    subgraph "Unit Tests (Fast, Isolated)"
        direction TB
        UnitDB[database/]
        UnitConfig[config/]
        UnitUtils[utils/]

        UnitDB --> UnitConn[connection.test.ts<br/>Mock pool]
        UnitDB --> UnitQueries[queries/*.test.ts<br/>Mock queries]
        UnitConfig --> UnitEnv[env.test.ts<br/>Mock env vars]
        UnitUtils --> UnitLogger[logger.test.ts<br/>Mock logger]
    end

    subgraph "Integration Tests (Real DB)"
        direction TB
        IntDB[database/]

        IntDB --> IntMigration[migration.test.ts<br/>Real PostgreSQL]
        IntDB --> IntSeeding[seeding.test.ts<br/>Real PostgreSQL]
        IntDB --> IntProtection[tier-protection.test.ts<br/>Real PostgreSQL]
    end

    subgraph "Test Infrastructure"
        direction TB
        Setup[test-database.ts<br/>Create test DB]
        Cleanup[cleanup.ts<br/>Drop test DB]
        Fixtures[fixtures/<br/>Test data]
    end

    TestRunner --> UnitDB
    TestRunner --> UnitConfig
    TestRunner --> UnitUtils
    TestRunner --> IntDB

    IntDB --> Setup
    IntDB --> Cleanup
    IntDB --> Fixtures

    style UnitDB fill:#e1f5ff
    style IntDB fill:#fff4e1
    style Setup fill:#e1ffe1
    style Cleanup fill:#ffe1e1
```

**Test Execution Order:**
```mermaid
sequenceDiagram
    participant Jest as Jest Runner
    participant Global as Global Setup
    participant Unit as Unit Tests
    participant TestDB as Test Database
    participant Integration as Integration Tests
    participant Teardown as Global Teardown

    Jest->>Global: globalSetup()
    Global->>TestDB: Create test database
    TestDB-->>Global: Database ready
    Global-->>Jest: Setup complete

    Note over Jest,Teardown: Run Tests
    Jest->>Unit: Run unit tests (parallel)
    Unit-->>Jest: All passed

    Jest->>Integration: Run integration tests
    Integration->>TestDB: Create test tables
    Integration->>TestDB: Insert test data
    Integration->>TestDB: Run queries
    TestDB-->>Integration: Results
    Integration->>TestDB: Cleanup test data
    Integration-->>Jest: All passed

    Jest->>Teardown: globalTeardown()
    Teardown->>TestDB: Drop test database
    TestDB-->>Teardown: Dropped
    Teardown-->>Jest: Teardown complete
```

---

## Docker Architecture

```mermaid
graph TB
    subgraph "Development Environment"
        direction TB
        DevCompose[docker-compose.dev.yml]

        DevCompose --> DevDB[PostgreSQL Container]
        DevCompose --> DevApp[App Container<br/>Hot Reload]

        DevVolumes[Volumes]
        DevVolumes --> DevSrc[./src:/app/src:ro]
        DevVolumes --> DevConfig[./config:/app/config:ro]
        DevVolumes --> DevPostgres[postgres_dev_data:/var/lib/postgresql/data]

        DevDB --> DevPostgres
        DevApp --> DevSrc
        DevApp --> DevConfig
    end

    subgraph "Production Environment"
        direction TB
        ProdCompose[docker-compose.yml]

        ProdCompose --> ProdDB[PostgreSQL Container]
        ProdCompose --> ProdApp[App Container<br/>Built Image]

        ProdVolumes[Volumes]
        ProdVolumes --> ProdSystem[./config/system:/app/config/system:ro]
        ProdVolumes --> ProdPostgres[postgres_data:/var/lib/postgresql/data]
        ProdVolumes --> ProdBackup[./data/backups:/backups]

        ProdDB --> ProdPostgres
        ProdApp --> ProdSystem
        ProdDB --> ProdBackup
    end

    style DevDB fill:#e1f5ff
    style ProdDB fill:#ffe1e1
    style DevSrc fill:#fff4e1
    style ProdSystem fill:#ffe1e1
    style ProdPostgres fill:#e1ffe1
    style ProdBackup fill:#e1ffe1
```

**Container Lifecycle:**
```mermaid
sequenceDiagram
    participant Docker as Docker Compose
    participant DB as PostgreSQL Container
    participant App as App Container
    participant Health as Health Checks

    Note over Docker,Health: Startup Phase
    Docker->>DB: Start PostgreSQL
    DB->>DB: Initialize database
    DB->>Health: Expose health endpoint
    Health->>DB: Check: pg_isready
    DB-->>Health: Healthy

    Docker->>App: Start App (depends_on DB)
    App->>DB: Connect to database
    DB-->>App: Connection established
    App->>App: Run migrations
    App->>App: Seed system templates
    App->>Health: Expose health endpoint
    Health->>App: Check: /health
    App-->>Health: Healthy

    Note over Docker,Health: Running Phase
    loop Every 30 seconds
        Health->>DB: Check health
        DB-->>Health: Healthy
        Health->>App: Check health
        App-->>Health: Healthy
    end

    Note over Docker,Health: Shutdown Phase
    Docker->>App: Stop (SIGTERM)
    App->>DB: Close connections
    DB-->>App: Connections closed
    App->>Docker: Graceful shutdown
    Docker->>DB: Stop (SIGTERM)
    DB->>Docker: Shutdown complete
```

---

## Configuration Flow

```mermaid
graph LR
    subgraph "Environment"
        EnvFile[.env]
        SystemVars[System Environment]
    end

    subgraph "Configuration Loading"
        EnvLoader[env.ts]
        Validator[validation.ts]
        Config[EnvConfig Object]
    end

    subgraph "Configuration Consumers"
        DBConfig[database-config.ts]
        ModelConfig[Model Selection]
        HealthConfig[Health Checks]
    end

    EnvFile --> EnvLoader
    SystemVars --> EnvLoader
    EnvLoader --> Validator
    Validator --> Config

    Config --> DBConfig
    Config --> ModelConfig
    Config --> HealthConfig

    DBConfig --> Pool[Connection Pool]
    ModelConfig --> AgentSpawn[Agent Worker Spawning]
    HealthConfig --> Monitor[Health Monitor]

    style EnvFile fill:#e1f5ff
    style Config fill:#fff4e1
    style Pool fill:#e1ffe1
```

---

## Migration Flow

```mermaid
sequenceDiagram
    participant CLI as Migration CLI
    participant Runner as Migration Runner
    participant DB as Database
    participant Verify as Verification
    participant Backup as Backup System

    CLI->>Runner: Run migrations
    Runner->>DB: Check migration history table

    alt First time
        Runner->>DB: Create migration_history table
    end

    Runner->>DB: Get applied migrations
    DB-->>Runner: List of applied migrations

    Runner->>Runner: Find pending migrations

    loop Each pending migration
        Runner->>Backup: Backup database
        Backup-->>Runner: Backup complete

        Runner->>DB: BEGIN TRANSACTION

        Runner->>Verify: Count user data before
        Verify->>DB: SELECT COUNT(*) FROM agent_memories
        DB-->>Verify: count_before
        Verify-->>Runner: count_before

        Runner->>DB: Execute migration
        DB-->>Runner: Migration complete

        Runner->>Verify: Count user data after
        Verify->>DB: SELECT COUNT(*) FROM agent_memories
        DB-->>Verify: count_after
        Verify-->>Runner: count_after

        alt Data loss detected
            Runner->>DB: ROLLBACK
            Runner->>Backup: Restore from backup
            Runner-->>CLI: Error: Data loss prevented
        else Data intact
            Runner->>DB: Insert into migration_history
            Runner->>DB: COMMIT
        end
    end

    Runner-->>CLI: All migrations complete
```

---

## Summary

**Architecture Characteristics:**

| Aspect | Approach | Benefit |
|--------|----------|---------|
| **Module Organization** | Feature-based layers | Clear boundaries, easy navigation |
| **Data Protection** | 3-tier model | Security + flexibility |
| **Database Access** | Query module pattern | Full SQL control, clear tiers |
| **Type Safety** | Centralized types, zero deps | No circular dependencies |
| **Testing** | Separate unit/integration | Fast feedback, comprehensive coverage |
| **Configuration** | Validated env vars | Fail fast, type-safe |
| **Deployment** | Docker with protected volumes | Data persistence, system protection |

---

**Related Documents:**
- Architecture Plan: `/workspaces/agent-feed/AVI-ARCHITECTURE-PLAN.md`
- File Structure: `/workspaces/agent-feed/PHASE-1-FILE-STRUCTURE-AND-ARCHITECTURE.md`
- Architecture Decisions: `/workspaces/agent-feed/PHASE-1-ARCHITECTURE-DECISIONS.md`
