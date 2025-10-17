# SPARC Specification: Protected Agent Fields Architecture (Hybrid Approach)

**Version**: 1.0.0
**Date**: 2025-10-17
**Status**: Draft for Implementation
**Architecture**: Option 3 - Hybrid (Markdown + Protected Sidecar)

---

## Executive Summary

This specification defines a hybrid protection architecture for Claude Code agent configurations that maintains full backward compatibility while adding OS-level security protection for critical system fields. The architecture uses standard `.md` agent files with optional `.protected.yaml` sidecars, enabling incremental migration without breaking changes.

**Key Design Principle**: Protect what matters (API rules, resource limits, security policies) without disrupting what works (existing agent format and workflows).

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Functional Requirements](#2-functional-requirements)
3. [Non-Functional Requirements](#3-non-functional-requirements)
4. [Use Cases and User Stories](#4-use-cases-and-user-stories)
5. [System Architecture](#5-system-architecture)
6. [Data Flow Diagrams](#6-data-flow-diagrams)
7. [API Contracts](#7-api-contracts)
8. [Security Model](#8-security-model)
9. [Migration Strategy](#9-migration-strategy)
10. [Edge Cases and Error Handling](#10-edge-cases-and-error-handling)
11. [Acceptance Criteria](#11-acceptance-criteria)
12. [Implementation Phases](#12-implementation-phases)

---

## 1. System Overview

### 1.1 Purpose

Establish a protection mechanism for critical agent configuration fields (API endpoints, resource limits, security policies) while maintaining full user customizability for agent personality, behavior, and preferences.

### 1.2 Current State

**Agent Format**: Markdown files with YAML frontmatter
```
/prod/.claude/agents/
├── meta-agent.md
├── strategic-planner-agent.md
└── page-builder-agent.md
```

**Example Current Agent** (`meta-agent.md`):
```markdown
---
name: meta-agent
description: Generates new agent configurations
tools: [Bash, Glob, Grep, Read, Edit, Write]
model: sonnet
color: "#374151"
proactive: true
priority: P2
---

# Meta Agent - Production Agent Generator
Your sole purpose is to act as an expert agent architect...
```

### 1.3 Target State

**Hybrid Architecture**: Standard `.md` agents + optional `.protected.yaml` sidecars
```
/prod/.claude/agents/
├── meta-agent.md
├── strategic-planner-agent.md
└── .system/
    └── strategic-planner.protected.yaml
```

### 1.4 Scope

**In Scope**:
- Agent configuration loader with sidecar support
- Protected config validator with integrity checking
- OS-level file protection for `.system/` directory
- Config merge logic (protected overrides user fields)
- Tampering detection and automatic restoration
- Incremental migration tooling
- Backward compatibility for agents without sidecars

**Out of Scope**:
- UI/frontend changes (Phase 5 only)
- Runtime agent execution changes
- Agent communication protocol changes
- API endpoint implementation changes

---

## 2. Functional Requirements

### FR-001: Agent Config Loader with Sidecar Support

**Priority**: P0 (Critical)
**Description**: System shall load agent configurations from `.md` files and optionally merge protected config from `.protected.yaml` sidecars.

**Acceptance Criteria**:
- System loads standard `.md` agent files with YAML frontmatter
- System detects `_protected_config_source` field in frontmatter
- System loads protected sidecar from `.system/` directory when referenced
- System loads agents without sidecars normally (backward compatible)
- Load operation completes in <100ms (cached)
- Load operation completes in <500ms (uncached)

**Example**:
```typescript
const config = await agentLoader.loadAgent('strategic-planner');
// Returns merged config if sidecar exists, plain config otherwise
```

---

### FR-002: Integrity Validation

**Priority**: P0 (Critical)
**Description**: System shall verify protected config integrity using SHA-256 checksums to detect tampering.

**Acceptance Criteria**:
- System computes SHA-256 hash of protected config content
- System compares computed hash with stored `checksum` field
- System throws `SecurityError` on hash mismatch
- System logs integrity check results (success/failure)
- System supports hash verification for all protected configs
- Hash computation excludes metadata fields (`_metadata`, `checksum`)

**Example**:
```yaml
# strategic-planner.protected.yaml
version: "1.0.0"
checksum: "sha256:a3b5c7d9e1f2g4h6i8j0k2l4m6n8o0p2q4r6s8t0u2v4w6x8y0z2"
agent_id: "strategic-planner"
permissions:
  api_endpoints:
    - path: "/api/posts"
```

---

### FR-003: Permission Enforcement (OS-Level)

**Priority**: P0 (Critical)
**Description**: System shall enforce OS-level file permissions to prevent unauthorized modification of protected configs.

**Acceptance Criteria**:
- `.system/` directory has 555 permissions (read + execute only)
- `*.protected.yaml` files have 444 permissions (read-only)
- System verifies permissions on startup
- System logs permission verification results
- System alerts admin if permissions are incorrect
- System can restore correct permissions (with elevated privileges)

**Example**:
```bash
# Expected permissions
drwxr-xr-x  .system/
-r--r--r--  strategic-planner.protected.yaml
```

---

### FR-004: Config Merge Logic

**Priority**: P0 (Critical)
**Description**: System shall merge protected config with agent config, with protected fields taking precedence for security-critical settings.

**Acceptance Criteria**:
- Protected config fields override agent frontmatter fields
- User-editable fields from agent config remain intact
- Merged config includes both user and protected fields
- Merge preserves agent body (Markdown content)
- Merge operation is deterministic and testable
- Merge handles missing protected fields gracefully

**Merge Rules**:
```typescript
const mergedConfig = {
  // User fields (from agent.md frontmatter)
  name: agentConfig.name,
  description: agentConfig.description,
  color: agentConfig.color,

  // Protected fields (from .protected.yaml)
  _protected: protectedConfig,
  _permissions: protectedConfig.permissions,
  _resource_limits: protectedConfig.permissions?.resource_limits,

  // Body content (from agent.md)
  _body: agentConfig._body
};
```

---

### FR-005: Backward Compatibility

**Priority**: P0 (Critical)
**Description**: System shall continue loading agents without protected sidecars normally, ensuring zero breaking changes.

**Acceptance Criteria**:
- Agents without `_protected_config_source` field load successfully
- Agents without sidecars return frontmatter + body as-is
- No errors or warnings for agents without protection
- Performance identical for agents without sidecars
- Existing agent workflows continue unchanged

---

### FR-006: Tampering Detection

**Priority**: P1 (High)
**Description**: System shall monitor `.system/` directory for unauthorized modifications and alert administrators.

**Acceptance Criteria**:
- File watcher monitors `.system/` directory for changes
- System detects file modifications, creations, deletions
- System logs security alerts with full context
- System triggers admin notification on tampering
- System continues monitoring after alerts
- Watcher restarts automatically on crash

**Alert Format**:
```typescript
{
  timestamp: "2025-10-17T14:32:00Z",
  severity: "CRITICAL",
  event: "PROTECTED_CONFIG_MODIFIED",
  file: ".system/strategic-planner.protected.yaml",
  action: "RESTORE_FROM_BACKUP",
  admin_notified: true
}
```

---

### FR-007: Rollback Support

**Priority**: P1 (High)
**Description**: System shall automatically restore protected configs from backups when tampering is detected.

**Acceptance Criteria**:
- System creates backup before each protected config update
- Backup includes timestamp and version metadata
- System restores from latest valid backup on tampering
- Restore operation completes in <5 seconds
- System verifies restored config integrity
- System logs restore operations

**Backup Structure**:
```
/prod/backups/agent-configs/
└── strategic-planner/
    ├── 1729172400000.protected.yaml
    ├── 1729258800000.protected.yaml
    └── 1729345200000.protected.yaml
```

---

### FR-008: Config Caching

**Priority**: P2 (Medium)
**Description**: System shall cache validated agent configs in memory for performance.

**Acceptance Criteria**:
- Cache stores merged configs keyed by agent name
- Cache invalidated on agent file changes
- Cache invalidated on protected config changes
- Cache hit rate >90% in typical usage
- Cache memory usage <50MB for 50 agents
- Cache supports manual invalidation/reload

---

### FR-009: Migration Tooling

**Priority**: P1 (High)
**Description**: System shall provide CLI tools for adding protection to existing agents incrementally.

**Acceptance Criteria**:
- CLI command to add protection to single agent
- CLI command to migrate all agents (with confirmation)
- Migration creates backups before modification
- Migration validates protected config schema
- Migration updates agent frontmatter reference
- Migration supports dry-run mode

**CLI Examples**:
```bash
# Add protection to single agent
npm run protect-agent strategic-planner

# Migrate all agents (interactive)
npm run migrate-all-agents

# Dry run
npm run protect-agent strategic-planner --dry-run
```

---

## 3. Non-Functional Requirements

### NFR-001: Performance

**Load Time**:
- Cached config load: <100ms (p95)
- Uncached config load: <500ms (p95)
- Integrity verification: <50ms per config
- Config merge: <10ms per config

**Throughput**:
- Support 50+ agents with minimal overhead
- Cache hit rate: >90%
- Memory usage: <50MB for 50 agents
- File watcher: <1% CPU usage

**Benchmarks**:
```typescript
Performance.mark('agent-load-start');
await agentLoader.loadAgent('strategic-planner');
Performance.mark('agent-load-end');
const duration = Performance.measure('agent-load', 'agent-load-start', 'agent-load-end');
assert(duration.duration < 100); // Cached
```

---

### NFR-002: Security

**File Protection**:
- OS-level permissions enforced (555 for `.system/`, 444 for configs)
- SHA-256 integrity verification for all protected configs
- Automatic tampering detection and restoration
- Admin-only write access to protected configs

**Attack Resistance**:
- Resistant to direct file modification
- Resistant to permission escalation
- Resistant to race conditions (atomic writes)
- Resistant to replay attacks (version tracking)

**Security Audit**:
- All security events logged with full context
- Logs tamper-proof (append-only)
- Admin alerts on security violations
- Compliance with security best practices

---

### NFR-003: Reliability

**Uptime**: 99.9% availability for config loading
**Error Recovery**: Automatic restoration from backups
**Data Integrity**: Zero data loss on tampering or crashes
**Monitoring**: Real-time health checks and alerts

**Failure Modes**:
- Missing sidecar: Load agent without protection (graceful degradation)
- Corrupt sidecar: Restore from backup
- Invalid checksum: Restore from backup
- Permission error: Alert admin, attempt auto-fix

---

### NFR-004: Maintainability

**Code Quality**:
- TypeScript with strict type checking
- Test coverage: >90% for core logic
- Documentation: API docs + inline comments
- Linting: ESLint + Prettier

**Architecture**:
- Clear separation of concerns (loader, validator, manager)
- Dependency injection for testability
- Interface-based design for extensibility
- Modular file structure (<500 lines per file)

---

### NFR-005: Scalability

**Agent Scale**: Support 100+ agents without performance degradation
**Sidecar Scale**: Support 50+ protected configs concurrently
**Backup Scale**: Maintain 30 days of backups per agent
**Monitoring Scale**: Handle 1000+ security events per day

---

## 4. Use Cases and User Stories

### UC-001: Load Agent Without Protection

**Actor**: Agent System
**Preconditions**: Agent exists without protected sidecar
**Flow**:
1. System receives request to load `page-builder-agent`
2. System reads `/prod/.claude/agents/page-builder-agent.md`
3. System parses YAML frontmatter
4. System checks for `_protected_config_source` field
5. Field not found - agent has no protection
6. System returns config with frontmatter + body

**Postconditions**: Agent loaded successfully without protection
**Exceptions**: None (graceful backward compatibility)

---

### UC-002: Load Agent With Protection

**Actor**: Agent System
**Preconditions**: Agent has protected sidecar configured
**Flow**:
1. System receives request to load `strategic-planner`
2. System reads `/prod/.claude/agents/strategic-planner-agent.md`
3. System parses YAML frontmatter
4. System finds `_protected_config_source: ".system/strategic-planner.protected.yaml"`
5. System loads protected sidecar from `.system/` directory
6. System verifies sidecar integrity (SHA-256 checksum)
7. System merges configs (protected overrides security fields)
8. System returns merged config

**Postconditions**: Agent loaded with protection enforced
**Exceptions**:
- Invalid checksum → Restore from backup, log security alert
- Missing sidecar → Load agent without protection, log warning
- Corrupt YAML → Restore from backup, log error

---

### UC-003: Detect Tampering

**Actor**: File Watcher Service
**Preconditions**: File watcher monitoring `.system/` directory
**Flow**:
1. File watcher detects modification to `strategic-planner.protected.yaml`
2. System verifies modification was authorized (checks permissions)
3. Modification unauthorized - tampering detected
4. System logs security alert with full context
5. System sends admin notification (email/Slack/webhook)
6. System restores config from latest backup
7. System verifies restored config integrity
8. System reloads agent with restored config

**Postconditions**: Tampering detected, config restored, admin notified
**Exceptions**:
- Backup missing → Alert admin, require manual restoration
- Restore fails → Lock agent, require admin intervention

---

### UC-004: Update Protected Config

**Actor**: System Administrator
**Preconditions**: Admin has system privileges
**Flow**:
1. Admin calls `protectedConfigManager.updateProtectedConfig()`
2. System verifies admin privileges
3. System loads current protected config
4. System creates backup with timestamp
5. System applies updates to config
6. System computes new SHA-256 checksum
7. System increments version number
8. System writes config atomically (temp file + rename)
9. System sets read-only permissions (444)
10. System reloads agent with new config

**Postconditions**: Protected config updated, backup created, agent reloaded
**Exceptions**:
- Privilege verification fails → Throw `SecurityError`
- Backup creation fails → Abort update
- Write fails → Restore from backup

---

### UC-005: Migrate Agent to Protected

**Actor**: Developer/System Administrator
**Preconditions**: Agent exists without protection
**Flow**:
1. Admin runs `npm run protect-agent strategic-planner`
2. System creates backup of current agent file
3. System creates `.system/` directory if missing
4. System extracts protected fields from agent frontmatter
5. System generates protected sidecar YAML
6. System computes integrity checksum
7. System writes sidecar to `.system/strategic-planner.protected.yaml`
8. System sets permissions (444)
9. System adds `_protected_config_source` to agent frontmatter
10. System validates migration success

**Postconditions**: Agent migrated to protected architecture
**Exceptions**:
- No protected fields found → Skip migration, log info
- Permission error → Alert admin, provide manual steps
- Validation fails → Rollback migration

---

### UC-006: Rollback Failed Update

**Actor**: Protected Config Manager
**Preconditions**: Protected config update failed
**Flow**:
1. Update operation detects failure
2. System logs rollback event
3. System identifies latest valid backup
4. System verifies backup integrity
5. System restores backup to `.system/` directory
6. System sets correct permissions
7. System reloads agent with restored config
8. System notifies admin of rollback

**Postconditions**: Config restored to last known good state
**Exceptions**:
- No valid backup → Alert admin, lock agent
- Restore fails → Lock agent, require manual intervention

---

## 5. System Architecture

### 5.1 High-Level Architecture (ASCII Diagram)

```
┌─────────────────────────────────────────────────────────────────┐
│                        Agent System                             │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Protected Agent Loader                       │  │
│  │                                                           │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │  │
│  │  │   Config    │  │   Validator  │  │  Merge Engine  │  │  │
│  │  │   Cache     │  │   (SHA-256)  │  │   (Override)   │  │  │
│  │  └─────────────┘  └──────────────┘  └────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │            Protected Config Manager                       │  │
│  │                                                           │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │  │
│  │  │   Backup    │  │   Updater    │  │  Permission    │  │  │
│  │  │   System    │  │  (Atomic)    │  │   Enforcer     │  │  │
│  │  └─────────────┘  └──────────────┘  └────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              File Watcher Service                         │  │
│  │                                                           │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │  │
│  │  │  Monitor    │  │   Tamper     │  │   Restore      │  │  │
│  │  │  .system/   │  │   Detector   │  │   Engine       │  │  │
│  │  └─────────────┘  └──────────────┘  └────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    File System Layer                            │
│                                                                 │
│  /prod/.claude/agents/                                         │
│  ├── strategic-planner-agent.md        (644 - User Editable)  │
│  ├── meta-agent.md                     (644 - User Editable)  │
│  └── .system/                          (555 - Read+Execute)   │
│      └── strategic-planner.protected.yaml  (444 - Read-Only)  │
│                                                                 │
│  /prod/backups/agent-configs/                                  │
│  └── strategic-planner/                                        │
│      ├── 1729172400000.protected.yaml                          │
│      └── 1729258800000.protected.yaml                          │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                   AgentConfigValidator                          │
├─────────────────────────────────────────────────────────────────┤
│ - loadAgentMarkdown(name): AgentConfig                         │
│ - loadProtectedSidecar(path): ProtectedConfig                  │
│ - verifyIntegrity(config): boolean                             │
│ - mergeConfigs(agent, protected): MergedConfig                 │
│ - validateAgentConfig(name): ValidationResult                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  ProtectedAgentLoader                           │
├─────────────────────────────────────────────────────────────────┤
│ - configCache: Map<string, AgentConfig>                        │
│ - validator: AgentConfigValidator                              │
│ - loadAgent(name): AgentConfig                                 │
│ - reloadAgent(name): void                                      │
│ - clearCache(name?): void                                      │
│ - watchForChanges(): void                                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                ProtectedConfigManager                           │
├─────────────────────────────────────────────────────────────────┤
│ - backupProtectedConfig(name, config): void                    │
│ - updateProtectedConfig(name, updates): void                   │
│ - rollbackProtectedConfig(name, version?): void                │
│ - verifyPermissions(path): boolean                             │
│ - hasSystemPrivileges(): boolean                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   AgentConfigMigrator                           │
├─────────────────────────────────────────────────────────────────┤
│ - addProtectionToAgent(name, config): void                     │
│ - migrateAllAgents(): void                                     │
│ - extractProtectedFields(frontmatter): ProtectedConfig         │
│ - addSidecarReference(name): void                              │
│ - validateMigration(name): boolean                             │
└─────────────────────────────────────────────────────────────────┘
```

### 5.3 Directory Structure

```
/workspaces/agent-feed/
├── prod/
│   ├── .claude/
│   │   └── agents/
│   │       ├── meta-agent.md                    # Standard agent (no protection)
│   │       ├── strategic-planner-agent.md       # Agent with protection
│   │       └── .system/                         # Protected configs (555)
│   │           ├── .gitkeep
│   │           └── strategic-planner.protected.yaml  # Protected sidecar (444)
│   │
│   ├── backups/
│   │   └── agent-configs/
│   │       └── strategic-planner/
│   │           ├── 1729172400000.protected.yaml
│   │           └── 1729258800000.protected.yaml
│   │
│   └── agent_workspace/
│       └── strategic-planner/
│           ├── outputs/
│           └── logs/
│
├── src/
│   ├── config/
│   │   ├── schemas/
│   │   │   ├── protected-config.schema.ts      # Protected config TypeScript interface
│   │   │   └── user-config.schema.ts           # User config TypeScript interface
│   │   ├── validators/
│   │   │   ├── protected-config.validator.ts   # Protected config validation
│   │   │   └── user-config.validator.ts        # User config validation
│   │   ├── agent-config-validator.ts           # Main validator
│   │   ├── protected-agent-loader.ts           # Loader with cache
│   │   ├── protected-config-manager.ts         # Update/backup manager
│   │   └── agent-config-migrator.ts            # Migration tooling
│   │
│   └── services/
│       └── file-watcher.service.ts             # Tampering detection
│
└── docs/
    ├── SPARC-PROTECTED-AGENT-FIELDS-SPEC.md   # This document
    └── PROTECTED-FIELDS.md                     # Field documentation
```

---

## 6. Data Flow Diagrams

### 6.1 Agent Load Flow (With Protection)

```
┌──────────┐
│  Client  │
└─────┬────┘
      │
      │ loadAgent("strategic-planner")
      ▼
┌─────────────────────┐
│ ProtectedAgentLoader│
└─────┬───────────────┘
      │
      │ 1. Check cache
      ▼
┌─────────────────────┐
│   Config Cache      │ ─── Cache Hit? ───┐
└─────┬───────────────┘                   │
      │ Cache Miss                        │
      │                                   │
      │ 2. Load agent.md                  │
      ▼                                   │
┌─────────────────────┐                   │
│   File System       │                   │
│ strategic-planner-  │                   │
│   agent.md          │                   │
└─────┬───────────────┘                   │
      │                                   │
      │ 3. Parse frontmatter              │
      ▼                                   │
┌─────────────────────┐                   │
│ YAML Parser         │                   │
└─────┬───────────────┘                   │
      │                                   │
      │ 4. Check for _protected_config_source
      ▼                                   │
┌─────────────────────┐                   │
│ Has sidecar?        │                   │
└─────┬───────────────┘                   │
      │ Yes                               │
      │                                   │
      │ 5. Load protected sidecar         │
      ▼                                   │
┌─────────────────────┐                   │
│   File System       │                   │
│ .system/strategic-  │                   │
│ planner.protected.  │                   │
│   yaml              │                   │
└─────┬───────────────┘                   │
      │                                   │
      │ 6. Parse YAML                     │
      ▼                                   │
┌─────────────────────┐                   │
│ YAML Parser         │                   │
└─────┬───────────────┘                   │
      │                                   │
      │ 7. Verify integrity               │
      ▼                                   │
┌─────────────────────┐                   │
│ SHA-256 Validator   │                   │
└─────┬───────────────┘                   │
      │ Valid?                            │
      │ Yes                               │
      │                                   │
      │ 8. Merge configs                  │
      ▼                                   │
┌─────────────────────┐                   │
│  Merge Engine       │                   │
│ (protected overrides│                   │
│  security fields)   │                   │
└─────┬───────────────┘                   │
      │                                   │
      │ 9. Cache result                   │
      ▼                                   │
┌─────────────────────┐                   │
│   Config Cache      │ ◄─────────────────┘
└─────┬───────────────┘
      │
      │ 10. Return merged config
      ▼
┌──────────┐
│  Client  │
└──────────┘
```

### 6.2 Tampering Detection Flow

```
┌──────────────────┐
│  File Watcher    │
│  (fs.watch)      │
└────────┬─────────┘
         │
         │ Detects change event
         ▼
┌──────────────────┐
│ File Modified:   │
│ strategic-planner│
│ .protected.yaml  │
└────────┬─────────┘
         │
         │ 1. Load modified file
         ▼
┌──────────────────┐
│  File System     │
└────────┬─────────┘
         │
         │ 2. Parse YAML
         ▼
┌──────────────────┐
│  YAML Parser     │
└────────┬─────────┘
         │
         │ 3. Verify integrity
         ▼
┌──────────────────┐
│ SHA-256 Validator│
└────────┬─────────┘
         │
         │ Checksum invalid?
         │ YES (TAMPERING DETECTED)
         │
         ├──────────────────────────┐
         │                          │
         │ 4a. Log security alert   │ 4b. Notify admin
         ▼                          ▼
┌──────────────────┐      ┌──────────────────┐
│  Security Logger │      │  Admin Alert     │
│  (append-only)   │      │  (email/webhook) │
└──────────────────┘      └──────────────────┘
         │
         │ 5. Restore from backup
         ▼
┌──────────────────┐
│  Backup System   │
└────────┬─────────┘
         │
         │ 6. Find latest valid backup
         ▼
┌──────────────────┐
│ /prod/backups/   │
│ agent-configs/   │
│ strategic-planner│
│ /1729258800000.  │
│ protected.yaml   │
└────────┬─────────┘
         │
         │ 7. Restore file atomically
         ▼
┌──────────────────┐
│  File System     │
│ (temp + rename)  │
└────────┬─────────┘
         │
         │ 8. Verify restored integrity
         ▼
┌──────────────────┐
│ SHA-256 Validator│
└────────┬─────────┘
         │ Valid?
         │ YES
         │
         │ 9. Reload agent
         ▼
┌──────────────────┐
│ ProtectedAgent   │
│ Loader           │
└────────┬─────────┘
         │
         │ 10. Clear cache, reload config
         ▼
┌──────────────────┐
│  Agent Reloaded  │
│  with Restored   │
│  Config          │
└──────────────────┘
```

### 6.3 Update Protected Config Flow

```
┌──────────────────┐
│  System Admin    │
└────────┬─────────┘
         │
         │ updateProtectedConfig(name, updates)
         ▼
┌──────────────────┐
│ ProtectedConfig  │
│   Manager        │
└────────┬─────────┘
         │
         │ 1. Verify admin privileges
         ▼
┌──────────────────┐
│ Privilege Check  │
└────────┬─────────┘
         │ Authorized?
         │ YES
         │
         │ 2. Load current config
         ▼
┌──────────────────┐
│  File System     │
│ .system/strategic│
│ -planner.        │
│ protected.yaml   │
└────────┬─────────┘
         │
         │ 3. Create backup
         ▼
┌──────────────────┐
│  Backup System   │
└────────┬─────────┘
         │
         │ 4. Write backup with timestamp
         ▼
┌──────────────────┐
│ /prod/backups/   │
│ agent-configs/   │
│ strategic-planner│
│ /1729345200000.  │
│ protected.yaml   │
└──────────────────┘
         │
         │ 5. Apply updates
         ▼
┌──────────────────┐
│  Merge Updates   │
│  with Current    │
│  Config          │
└────────┬─────────┘
         │
         │ 6. Compute new checksum
         ▼
┌──────────────────┐
│ SHA-256 Hash     │
│ Generator        │
└────────┬─────────┘
         │
         │ 7. Increment version
         ▼
┌──────────────────┐
│ Version Manager  │
│ (1.0.0 → 1.1.0)  │
└────────┬─────────┘
         │
         │ 8. Write atomically
         ▼
┌──────────────────┐
│  Temp File       │
│ .system/strategic│
│ -planner.        │
│ protected.yaml.  │
│ tmp              │
└────────┬─────────┘
         │
         │ 9. Rename (atomic operation)
         ▼
┌──────────────────┐
│  File System     │
│ .system/strategic│
│ -planner.        │
│ protected.yaml   │
└────────┬─────────┘
         │
         │ 10. Set permissions (444)
         ▼
┌──────────────────┐
│ Permission       │
│ Enforcer         │
└────────┬─────────┘
         │
         │ 11. Reload agent
         ▼
┌──────────────────┐
│ ProtectedAgent   │
│ Loader           │
└────────┬─────────┘
         │
         │ 12. Return success
         ▼
┌──────────────────┐
│  System Admin    │
└──────────────────┘
```

---

## 7. API Contracts

### 7.1 AgentConfigValidator

```typescript
interface AgentConfigValidator {
  /**
   * Validates and loads agent configuration with optional protected sidecar
   * @param agentName - Name of agent (e.g., "strategic-planner")
   * @returns Validation result with merged or plain config
   * @throws SecurityError if integrity check fails
   */
  validateAgentConfig(agentName: string): Promise<ValidationResult>;

  /**
   * Loads agent markdown file and parses frontmatter
   * @param agentName - Name of agent
   * @returns Agent config with frontmatter and body
   * @throws Error if file not found or parse fails
   */
  loadAgentMarkdown(agentName: string): Promise<AgentConfig>;

  /**
   * Loads protected sidecar YAML file
   * @param relativePath - Path relative to agents directory
   * @returns Protected config object
   * @throws Error if file not found or parse fails
   */
  loadProtectedSidecar(relativePath: string): Promise<ProtectedConfig>;

  /**
   * Verifies protected config integrity using SHA-256
   * @param config - Protected config to verify
   * @returns True if integrity check passes
   */
  verifyProtectedConfigIntegrity(config: ProtectedConfig): boolean;

  /**
   * Merges agent config with protected config
   * @param agent - Agent config from .md file
   * @param protected - Protected config from sidecar
   * @returns Merged config with protected fields taking precedence
   */
  mergeConfigs(agent: AgentConfig, protected: ProtectedConfig): AgentConfig;
}

interface ValidationResult {
  valid: boolean;
  config: AgentConfig;
  protected?: ProtectedConfig;
  errors?: string[];
}

interface AgentConfig {
  name: string;
  description: string;
  tools: string[];
  model: 'haiku' | 'sonnet' | 'opus';
  color: string;
  proactive?: boolean;
  priority?: string;
  _protected_config_source?: string;
  _protected?: ProtectedConfig;
  _permissions?: ProtectedPermissions;
  _resource_limits?: ResourceLimits;
  _body: string;
  [key: string]: any;
}

interface ProtectedConfig {
  version: string;
  checksum: string;
  agent_id: string;
  permissions: ProtectedPermissions;
  _metadata?: {
    hash: string;
    updated_at: string;
    version: string;
  };
}

interface ProtectedPermissions {
  api_endpoints?: ApiEndpoint[];
  workspace?: WorkspaceConfig;
  tool_permissions?: ToolPermissions;
  resource_limits?: ResourceLimits;
  posting_rules?: PostingRules;
  security?: SecurityConfig;
  [key: string]: any;
}
```

### 7.2 ProtectedAgentLoader

```typescript
interface ProtectedAgentLoader {
  /**
   * Loads agent with caching and sidecar support
   * @param agentName - Name of agent
   * @returns Agent config (merged if sidecar exists)
   * @throws SecurityError if integrity check fails
   */
  loadAgent(agentName: string): Promise<AgentConfig>;

  /**
   * Reloads agent, clearing cache
   * @param agentName - Name of agent
   */
  reloadAgent(agentName: string): Promise<void>;

  /**
   * Clears config cache for specific agent or all agents
   * @param agentName - Optional agent name (clears all if omitted)
   */
  clearCache(agentName?: string): void;

  /**
   * Starts file watcher for agent directory
   */
  watchForChanges(): void;

  /**
   * Stops file watcher
   */
  stopWatching(): void;

  /**
   * Gets cache statistics
   * @returns Cache hit rate, size, etc.
   */
  getCacheStats(): CacheStats;
}

interface CacheStats {
  hitRate: number;
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  cacheSize: number;
  memoryUsage: number;
}
```

### 7.3 ProtectedConfigManager

```typescript
interface ProtectedConfigManager {
  /**
   * Updates protected config (admin only)
   * @param agentName - Name of agent
   * @param updates - Partial config updates
   * @throws SecurityError if caller lacks privileges
   * @throws Error if backup or write fails
   */
  updateProtectedConfig(
    agentName: string,
    updates: Partial<ProtectedConfig>
  ): Promise<void>;

  /**
   * Rolls back to previous version
   * @param agentName - Name of agent
   * @param version - Optional specific version (defaults to latest)
   * @throws Error if backup not found or restore fails
   */
  rollbackProtectedConfig(
    agentName: string,
    version?: string
  ): Promise<void>;

  /**
   * Creates backup of protected config
   * @param agentName - Name of agent
   * @param config - Config to backup
   */
  backupProtectedConfig(
    agentName: string,
    config: ProtectedConfig
  ): Promise<void>;

  /**
   * Verifies file permissions are correct
   * @param path - Path to verify
   * @returns True if permissions are correct
   */
  verifyPermissions(path: string): boolean;

  /**
   * Checks if caller has system privileges
   * @returns True if caller is authorized
   */
  hasSystemPrivileges(): boolean;

  /**
   * Lists all backups for an agent
   * @param agentName - Name of agent
   * @returns Array of backup metadata
   */
  listBackups(agentName: string): Promise<BackupMetadata[]>;
}

interface BackupMetadata {
  timestamp: number;
  version: string;
  path: string;
  size: number;
  checksum: string;
}
```

### 7.4 AgentConfigMigrator

```typescript
interface AgentConfigMigrator {
  /**
   * Adds protection to specific agent (incremental migration)
   * @param agentName - Name of agent
   * @param protectedConfig - Protected config to add
   * @throws Error if migration fails
   */
  addProtectionToAgent(
    agentName: string,
    protectedConfig: ProtectedConfig
  ): Promise<void>;

  /**
   * Migrates all agents at once (use with caution)
   * @param dryRun - If true, simulates migration without writing
   * @returns Migration report
   */
  migrateAllAgents(dryRun?: boolean): Promise<MigrationReport>;

  /**
   * Extracts protected fields from agent frontmatter
   * @param frontmatter - Agent frontmatter object
   * @returns Protected config with extracted fields
   */
  extractProtectedFields(frontmatter: any): ProtectedConfig;

  /**
   * Adds sidecar reference to agent frontmatter
   * @param agentName - Name of agent
   */
  addSidecarReference(agentName: string): Promise<void>;

  /**
   * Validates migration was successful
   * @param agentName - Name of agent
   * @returns True if validation passes
   */
  validateMigration(agentName: string): Promise<boolean>;

  /**
   * Discovers all agent files
   * @returns Array of agent file paths
   */
  discoverAgents(): Promise<string[]>;
}

interface MigrationReport {
  totalAgents: number;
  migratedAgents: number;
  skippedAgents: number;
  failedAgents: number;
  errors: MigrationError[];
  dryRun: boolean;
}

interface MigrationError {
  agentName: string;
  error: string;
  phase: 'backup' | 'extract' | 'write' | 'validate';
}
```

---

## 8. Security Model

### 8.1 Protected Fields Classification

**Protected Fields** (System-Controlled - Cannot be edited by users):
```yaml
api_endpoints:           # Which APIs agent can access
api_methods:             # HTTP methods allowed (GET, POST, etc.)
api_rate_limits:         # Request throttling rules
system_boundaries:       # Directory access restrictions
security_policies:       # Authentication/authorization rules
tool_permissions:        # Which tools agent can use
resource_limits:         # Memory, CPU, storage caps
posting_rules:           # When/how to post outcomes
workspace_path:          # Where agent can write files
forbidden_operations:    # Blacklisted operations
```

**User-Editable Fields** (Can be modified by users):
```yaml
name:                    # Agent display name
description:             # Agent purpose description
personality:             # Tone, style, communication preferences
specialization:          # Domain expertise
custom_instructions:     # Task-specific guidance
priority_preferences:    # How agent prioritizes work
notification_preferences:# When to notify user
autonomous_mode:         # Level of autonomy
color:                   # UI color theme
proactive:               # Proactive behavior flag
```

### 8.2 Threat Model

**Threats**:
1. **Direct File Modification**: User modifies `.protected.yaml` directly
2. **Permission Escalation**: User attempts to gain write access to `.system/`
3. **Frontmatter Override**: User adds protected fields to agent frontmatter
4. **Race Condition**: Concurrent modification during update
5. **Backup Tampering**: User modifies backup files
6. **Replay Attack**: User restores old version to bypass restrictions

**Mitigations**:
1. **OS-Level Permissions**: 444 (read-only) for `.protected.yaml`, 555 for `.system/`
2. **Privilege Verification**: System privilege check before any write operation
3. **Merge Precedence**: Protected config always overrides frontmatter fields
4. **Atomic Writes**: Temp file + rename for consistency
5. **Backup Protection**: Backups stored in protected directory
6. **Version Tracking**: Monotonic version increments prevent replay

### 8.3 Integrity Verification

**SHA-256 Checksum Algorithm**:
```typescript
function computeChecksum(config: ProtectedConfig): string {
  // Exclude metadata fields from hash computation
  const { checksum, _metadata, ...hashableContent } = config;

  // Normalize JSON (sorted keys, no whitespace)
  const normalized = JSON.stringify(hashableContent, Object.keys(hashableContent).sort());

  // Compute SHA-256 hash
  const hash = crypto.createHash('sha256').update(normalized).digest('hex');

  return `sha256:${hash}`;
}

function verifyIntegrity(config: ProtectedConfig): boolean {
  const storedHash = config.checksum?.replace('sha256:', '');
  const computedHash = computeChecksum(config).replace('sha256:', '');

  return storedHash === computedHash;
}
```

**Example Protected Config with Checksum**:
```yaml
version: "1.0.0"
checksum: "sha256:a3b5c7d9e1f2g4h6i8j0k2l4m6n8o0p2q4r6s8t0u2v4w6x8y0z2"
agent_id: "strategic-planner"
permissions:
  api_endpoints:
    - path: "/api/posts"
      methods: ["GET", "POST"]
      rate_limit: "10/minute"
  workspace:
    root: "/prod/agent_workspace/agents/strategic-planner"
    max_storage: "1GB"
  tool_permissions:
    allowed: ["Read", "Write", "Bash", "Grep", "Glob"]
    forbidden: ["KillShell"]
```

### 8.4 File Permissions Model

```bash
# Directory permissions
drwxr-xr-x  /prod/.claude/agents/          # 755 - User can modify agents
drwxr-xr-x  /prod/.claude/agents/.system/  # 555 - Read + execute only

# File permissions
-rw-r--r--  strategic-planner-agent.md     # 644 - User can edit agent
-r--r--r--  strategic-planner.protected.yaml  # 444 - Read-only

# Backup permissions
drwx------  /prod/backups/agent-configs/   # 700 - Admin only
-rw-------  1729172400000.protected.yaml   # 600 - Admin only
```

**Permission Enforcement**:
```typescript
async function enforcePermissions(): Promise<void> {
  // Set .system/ directory permissions
  await fs.promises.chmod('/prod/.claude/agents/.system', 0o555);

  // Set all .protected.yaml files to read-only
  const protectedFiles = await glob('.system/*.protected.yaml');
  for (const file of protectedFiles) {
    await fs.promises.chmod(file, 0o444);
  }

  // Verify permissions
  const systemStat = await fs.promises.stat('.system');
  const expectedMode = 0o555;
  if ((systemStat.mode & 0o777) !== expectedMode) {
    throw new SecurityError('Incorrect .system/ directory permissions');
  }
}
```

### 8.5 Audit Logging

**Security Event Log Format**:
```typescript
interface SecurityEvent {
  timestamp: string;        // ISO 8601 timestamp
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  event: string;            // Event type (e.g., "PROTECTED_CONFIG_MODIFIED")
  actor: string;            // Who performed action
  resource: string;         // Affected resource (file path)
  action: string;           // Action taken (e.g., "RESTORE_FROM_BACKUP")
  metadata: Record<string, any>;  // Additional context
  admin_notified: boolean;  // Whether admin was alerted
}
```

**Example Security Log Entries**:
```json
{
  "timestamp": "2025-10-17T14:32:00Z",
  "severity": "CRITICAL",
  "event": "PROTECTED_CONFIG_MODIFIED",
  "actor": "system",
  "resource": ".system/strategic-planner.protected.yaml",
  "action": "RESTORE_FROM_BACKUP",
  "metadata": {
    "original_checksum": "sha256:abc123...",
    "restored_checksum": "sha256:def456...",
    "backup_timestamp": 1729258800000
  },
  "admin_notified": true
}
```

---

## 9. Migration Strategy

### 9.1 Migration Phases

**Phase 1: Infrastructure Setup** (Non-Breaking)
- Create `.system/` directory with proper permissions
- Implement loader, validator, manager classes
- Add file watcher service
- No changes to existing agents

**Phase 2: Incremental Agent Migration** (Non-Breaking)
- Identify agents requiring protection (e.g., meta-agent, system agents)
- Generate protected sidecars for high-priority agents
- Add `_protected_config_source` references to agent frontmatter
- Test protected agents in production
- Agents without sidecars continue working normally

**Phase 3: Full Deployment** (Non-Breaking)
- Migrate remaining agents as needed
- Monitor tampering detection
- Optimize cache performance
- Continue supporting agents without protection

### 9.2 Migration CLI Commands

```bash
# Add protection to single agent
npm run protect-agent <agent-name> [--dry-run] [--force]

# Example: Protect strategic-planner agent
npm run protect-agent strategic-planner

# Dry run (simulate without writing)
npm run protect-agent strategic-planner --dry-run

# Migrate all agents (interactive with confirmation)
npm run migrate-all-agents [--dry-run]

# List agents and protection status
npm run list-agents-protection

# Validate migration for agent
npm run validate-migration <agent-name>

# Rollback agent to pre-migration state
npm run rollback-migration <agent-name>
```

### 9.3 Migration Checklist (Per Agent)

**Pre-Migration**:
- [ ] Backup agent `.md` file
- [ ] Identify protected fields in frontmatter
- [ ] Validate protected fields against schema
- [ ] Confirm agent has no custom protection logic

**Migration**:
- [ ] Extract protected fields from frontmatter
- [ ] Generate protected sidecar YAML
- [ ] Compute integrity checksum
- [ ] Write sidecar to `.system/` directory
- [ ] Set file permissions (444)
- [ ] Add `_protected_config_source` to frontmatter
- [ ] Write updated agent `.md` file

**Post-Migration**:
- [ ] Validate migration success
- [ ] Test agent loading with sidecar
- [ ] Verify integrity check passes
- [ ] Confirm merge logic works correctly
- [ ] Test agent functionality unchanged
- [ ] Monitor logs for errors

### 9.4 Rollback Procedure

**Automatic Rollback** (Triggered by integrity failure):
```typescript
async function autoRollback(agentName: string): Promise<void> {
  logger.info(`Auto-rollback triggered for ${agentName}`);

  // Find latest valid backup
  const backups = await listBackups(agentName);
  const latestBackup = backups.sort((a, b) => b.timestamp - a.timestamp)[0];

  if (!latestBackup) {
    throw new Error(`No backup found for ${agentName}`);
  }

  // Restore backup
  await restoreBackup(agentName, latestBackup);

  // Verify restored config
  const restored = await loadProtectedConfig(agentName);
  if (!verifyIntegrity(restored)) {
    throw new Error('Restored config failed integrity check');
  }

  // Reload agent
  await agentLoader.reloadAgent(agentName);

  logger.info(`Auto-rollback completed for ${agentName}`);
}
```

**Manual Rollback** (Triggered by admin):
```bash
# Rollback to latest backup
npm run rollback-protected-config strategic-planner

# Rollback to specific version
npm run rollback-protected-config strategic-planner --version 1.0.0

# Rollback migration entirely (remove sidecar)
npm run rollback-migration strategic-planner
```

---

## 10. Edge Cases and Error Handling

### 10.1 Missing Sidecar

**Scenario**: Agent frontmatter references sidecar, but sidecar file not found

**Handling**:
```typescript
async function loadProtectedSidecar(relativePath: string): Promise<ProtectedConfig | null> {
  const fullPath = path.join('/prod/.claude/agents', relativePath);

  try {
    const content = await fs.promises.readFile(fullPath, 'utf-8');
    return yaml.parse(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      logger.warn(`Protected sidecar not found: ${fullPath}`);
      logger.warn('Loading agent without protection');
      return null;  // Graceful degradation
    }
    throw error;  // Re-throw other errors
  }
}
```

**Expected Behavior**: Load agent without protection, log warning

---

### 10.2 Corrupt Sidecar YAML

**Scenario**: Sidecar exists but contains invalid YAML

**Handling**:
```typescript
async function loadProtectedSidecar(relativePath: string): Promise<ProtectedConfig> {
  const fullPath = path.join('/prod/.claude/agents', relativePath);
  const content = await fs.promises.readFile(fullPath, 'utf-8');

  try {
    return yaml.parse(content);
  } catch (error) {
    logger.error(`Invalid YAML in protected sidecar: ${fullPath}`);
    logger.error(error.message);

    // Attempt to restore from backup
    const agentName = extractAgentName(relativePath);
    await autoRollback(agentName);

    // Retry after restore
    const restoredContent = await fs.promises.readFile(fullPath, 'utf-8');
    return yaml.parse(restoredContent);
  }
}
```

**Expected Behavior**: Restore from backup, retry load

---

### 10.3 Checksum Mismatch

**Scenario**: Sidecar loaded successfully but checksum verification fails

**Handling**:
```typescript
function verifyProtectedConfigIntegrity(config: ProtectedConfig): boolean {
  const computedHash = computeChecksum(config);
  const storedHash = config.checksum;

  if (computedHash !== storedHash) {
    logger.error('Checksum mismatch detected');
    logger.error(`Stored: ${storedHash}`);
    logger.error(`Computed: ${computedHash}`);

    // Trigger security alert
    securityLogger.critical({
      event: 'INTEGRITY_VIOLATION',
      resource: config.agent_id,
      action: 'AUTO_ROLLBACK'
    });

    // Trigger automatic rollback
    throw new SecurityError('Protected config integrity check failed');
  }

  return true;
}
```

**Expected Behavior**: Throw `SecurityError`, trigger auto-rollback

---

### 10.4 Permission Error

**Scenario**: System cannot read `.system/` directory or sidecar files

**Handling**:
```typescript
async function loadProtectedSidecar(relativePath: string): Promise<ProtectedConfig> {
  const fullPath = path.join('/prod/.claude/agents', relativePath);

  try {
    const content = await fs.promises.readFile(fullPath, 'utf-8');
    return yaml.parse(content);
  } catch (error) {
    if (error.code === 'EACCES') {
      logger.error('Permission denied reading protected sidecar');
      logger.error(`Path: ${fullPath}`);

      // Alert admin
      await notifyAdmin({
        severity: 'CRITICAL',
        message: 'Cannot read protected config - permission error',
        resource: fullPath,
        action: 'MANUAL_INTERVENTION_REQUIRED'
      });

      // Attempt to fix permissions (requires elevated privileges)
      try {
        await fs.promises.chmod(fullPath, 0o444);
        logger.info('Permissions restored automatically');

        // Retry read
        const content = await fs.promises.readFile(fullPath, 'utf-8');
        return yaml.parse(content);
      } catch (fixError) {
        logger.error('Cannot restore permissions - manual intervention required');
        throw new SecurityError('Protected config inaccessible');
      }
    }
    throw error;
  }
}
```

**Expected Behavior**: Attempt auto-fix, alert admin, require manual intervention if auto-fix fails

---

### 10.5 Concurrent Modification

**Scenario**: Multiple processes attempt to modify protected config simultaneously

**Handling**:
```typescript
async function updateProtectedConfig(
  agentName: string,
  updates: Partial<ProtectedConfig>
): Promise<void> {
  // Acquire file lock
  const lockPath = `/tmp/agent-config-lock-${agentName}`;
  const lockFd = await fs.promises.open(lockPath, 'wx');

  try {
    // Critical section - only one process can execute
    const current = await loadProtectedConfig(agentName);
    await backupProtectedConfig(agentName, current);
    const updated = { ...current, ...updates };
    updated._metadata = {
      hash: computeChecksum(updated),
      updated_at: new Date().toISOString(),
      version: incrementVersion(current._metadata?.version)
    };
    await writeProtectedConfig(agentName, updated);
  } finally {
    // Release lock
    await lockFd.close();
    await fs.promises.unlink(lockPath);
  }
}
```

**Expected Behavior**: File lock prevents concurrent writes, operations serialized

---

### 10.6 No Valid Backup

**Scenario**: Auto-rollback triggered but no backups exist

**Handling**:
```typescript
async function autoRollback(agentName: string): Promise<void> {
  const backups = await listBackups(agentName);

  if (backups.length === 0) {
    logger.error(`No backups found for ${agentName}`);

    // Lock agent to prevent further use
    await lockAgent(agentName);

    // Alert admin
    await notifyAdmin({
      severity: 'CRITICAL',
      message: 'Agent locked - no valid backup for restoration',
      resource: agentName,
      action: 'MANUAL_RESTORATION_REQUIRED'
    });

    throw new Error('No backup available for restoration');
  }

  // Continue with rollback using latest backup
  const latestBackup = backups.sort((a, b) => b.timestamp - a.timestamp)[0];
  await restoreBackup(agentName, latestBackup);
}
```

**Expected Behavior**: Lock agent, alert admin, require manual restoration

---

### 10.7 Cache Poisoning

**Scenario**: Cached config becomes stale after sidecar modification

**Handling**:
```typescript
function watchForChanges(): void {
  const watcher = fs.watch('/prod/.claude/agents', { recursive: true });

  watcher.on('change', (eventType, filename) => {
    if (filename.endsWith('-agent.md')) {
      // Agent file changed - invalidate cache
      const agentName = extractAgentName(filename);
      logger.info(`Agent file changed: ${agentName} - clearing cache`);
      configCache.delete(agentName);
    }

    if (filename.includes('.system/') && filename.endsWith('.protected.yaml')) {
      // Protected config changed - invalidate cache and investigate
      const agentName = extractAgentName(filename);
      logger.warn(`Protected config changed: ${agentName} - clearing cache`);
      configCache.delete(agentName);

      // Check if change was authorized
      // If unauthorized, trigger tampering detection
      detectTampering(filename);
    }
  });
}
```

**Expected Behavior**: Cache automatically invalidated on file changes

---

## 11. Acceptance Criteria

### 11.1 Functional Acceptance

- [ ] **AC-F-001**: System loads agents without sidecars normally (backward compatible)
- [ ] **AC-F-002**: System loads agents with sidecars and merges configs correctly
- [ ] **AC-F-003**: Protected fields override agent frontmatter fields
- [ ] **AC-F-004**: User-editable fields remain intact after merge
- [ ] **AC-F-005**: SHA-256 integrity verification detects tampering
- [ ] **AC-F-006**: File watcher detects sidecar modifications
- [ ] **AC-F-007**: Auto-rollback restores from backup on tampering
- [ ] **AC-F-008**: Config cache improves load performance (>90% hit rate)
- [ ] **AC-F-009**: Migration CLI tools add protection incrementally
- [ ] **AC-F-010**: OS-level permissions prevent unauthorized writes

### 11.2 Performance Acceptance

- [ ] **AC-P-001**: Cached config load <100ms (p95)
- [ ] **AC-P-002**: Uncached config load <500ms (p95)
- [ ] **AC-P-003**: Integrity verification <50ms per config
- [ ] **AC-P-004**: Config merge <10ms per config
- [ ] **AC-P-005**: File watcher CPU usage <1%
- [ ] **AC-P-006**: Cache memory usage <50MB for 50 agents
- [ ] **AC-P-007**: Backup creation <100ms
- [ ] **AC-P-008**: Restore from backup <5 seconds

### 11.3 Security Acceptance

- [ ] **AC-S-001**: `.system/` directory has 555 permissions
- [ ] **AC-S-002**: `*.protected.yaml` files have 444 permissions
- [ ] **AC-S-003**: Tampering triggers security alert
- [ ] **AC-S-004**: Tampering triggers admin notification
- [ ] **AC-S-005**: All security events logged with full context
- [ ] **AC-S-006**: Logs are append-only and tamper-proof
- [ ] **AC-S-007**: Only system-privileged calls can update configs
- [ ] **AC-S-008**: Atomic writes prevent race conditions
- [ ] **AC-S-009**: Version tracking prevents replay attacks
- [ ] **AC-S-010**: Backups stored in protected directory

### 11.4 Reliability Acceptance

- [ ] **AC-R-001**: Missing sidecar handled gracefully (no crash)
- [ ] **AC-R-002**: Corrupt YAML triggers auto-restore
- [ ] **AC-R-003**: Checksum mismatch triggers auto-rollback
- [ ] **AC-R-004**: Permission errors alert admin
- [ ] **AC-R-005**: Concurrent modifications serialized with locks
- [ ] **AC-R-006**: No valid backup locks agent and alerts admin
- [ ] **AC-R-007**: Cache invalidated on file changes
- [ ] **AC-R-008**: File watcher restarts on crash
- [ ] **AC-R-009**: Backup retention: 30 days minimum
- [ ] **AC-R-010**: Zero data loss on system failure

### 11.5 Maintainability Acceptance

- [ ] **AC-M-001**: TypeScript strict mode enabled
- [ ] **AC-M-002**: Test coverage >90% for core logic
- [ ] **AC-M-003**: API documentation complete
- [ ] **AC-M-004**: Inline comments for complex logic
- [ ] **AC-M-005**: ESLint passes with zero warnings
- [ ] **AC-M-006**: Prettier formatting enforced
- [ ] **AC-M-007**: No files exceed 500 lines
- [ ] **AC-M-008**: Interfaces documented with JSDoc
- [ ] **AC-M-009**: Migration guide complete
- [ ] **AC-M-010**: Troubleshooting guide complete

---

## 12. Implementation Phases

### Phase 1: Schema Definition and Infrastructure

**Duration**: 1 week
**Status**: Not Started
**Dependencies**: None

**Tasks**:
1. Define TypeScript interfaces (`ProtectedConfig`, `AgentConfig`, etc.)
2. Create validation schemas (Zod or similar)
3. Document all protected fields in `/docs/PROTECTED-FIELDS.md`
4. Create `.system/` directory with proper permissions
5. Set up test fixtures and examples

**Deliverables**:
- `/src/config/schemas/protected-config.schema.ts`
- `/src/config/schemas/user-config.schema.ts`
- `/docs/PROTECTED-FIELDS.md`
- `/prod/.claude/agents/.system/` (directory created)

**Acceptance Criteria**:
- [ ] TypeScript interfaces defined and exported
- [ ] Validation schemas created and tested
- [ ] Example configs validate successfully
- [ ] Documentation complete and reviewed
- [ ] `.system/` directory exists with 555 permissions

---

### Phase 2: Core Loader and Validator

**Duration**: 2 weeks
**Status**: Not Started
**Dependencies**: Phase 1

**Tasks**:
1. Implement `AgentConfigValidator` class
2. Implement `ProtectedAgentLoader` class
3. Add SHA-256 integrity checking
4. Add config merge logic
5. Add config caching
6. Write unit tests (>90% coverage)

**Deliverables**:
- `/src/config/agent-config-validator.ts`
- `/src/config/protected-agent-loader.ts`
- `/src/config/__tests__/validator.test.ts`
- `/src/config/__tests__/loader.test.ts`

**Acceptance Criteria**:
- [ ] Agents without sidecars load correctly
- [ ] Agents with sidecars load and merge correctly
- [ ] Integrity verification detects tampering
- [ ] Cache improves performance (>90% hit rate)
- [ ] Unit tests pass with >90% coverage
- [ ] Load time <100ms (cached), <500ms (uncached)

---

### Phase 3: Protection and Monitoring

**Duration**: 2 weeks
**Status**: Not Started
**Dependencies**: Phase 2

**Tasks**:
1. Implement `ProtectedConfigManager` class
2. Add file watcher service for tampering detection
3. Implement backup system
4. Implement auto-rollback mechanism
5. Add security logging and alerts
6. Write integration tests

**Deliverables**:
- `/src/config/protected-config-manager.ts`
- `/src/services/file-watcher.service.ts`
- `/src/services/security-logger.service.ts`
- `/src/config/__tests__/manager.test.ts`
- `/src/services/__tests__/watcher.test.ts`

**Acceptance Criteria**:
- [ ] File watcher detects sidecar modifications
- [ ] Tampering triggers security alert
- [ ] Auto-rollback restores from backup
- [ ] Backups created before updates
- [ ] Security events logged with full context
- [ ] Admin notifications sent on critical events
- [ ] Integration tests pass

---

### Phase 4: Migration Tooling

**Duration**: 1 week
**Status**: Not Started
**Dependencies**: Phase 3

**Tasks**:
1. Implement `AgentConfigMigrator` class
2. Create CLI commands for migration
3. Add dry-run support
4. Add validation and rollback
5. Write migration guide
6. Test migration on sample agents

**Deliverables**:
- `/src/config/agent-config-migrator.ts`
- `/scripts/protect-agent.ts`
- `/scripts/migrate-all-agents.ts`
- `/docs/MIGRATION-GUIDE.md`

**Acceptance Criteria**:
- [ ] Single agent migration works correctly
- [ ] Bulk migration works with confirmation
- [ ] Dry-run mode simulates without writing
- [ ] Validation detects migration errors
- [ ] Rollback restores pre-migration state
- [ ] Migration guide complete and tested

---

### Phase 5: Production Deployment

**Duration**: 1 week
**Status**: Not Started
**Dependencies**: Phase 4

**Tasks**:
1. Migrate high-priority agents (meta-agent, system agents)
2. Monitor production logs for errors
3. Optimize cache performance
4. Tune file watcher
5. Create runbooks for ops team
6. Train team on migration and troubleshooting

**Deliverables**:
- Protected sidecars for 5+ critical agents
- Production monitoring dashboard
- Runbooks for common scenarios
- Training documentation

**Acceptance Criteria**:
- [ ] Critical agents migrated successfully
- [ ] Zero production incidents
- [ ] Cache hit rate >90%
- [ ] File watcher CPU <1%
- [ ] Ops team trained
- [ ] Monitoring alerts configured

---

### Phase 6: UI Integration (Optional)

**Duration**: 2 weeks
**Status**: Not Started
**Dependencies**: Phase 5

**Tasks**:
1. Update agent config editor UI
2. Add read-only indicators for protected fields
3. Add tooltips and help text
4. Prevent protected field edits
5. Create admin UI for config updates (optional)
6. Write frontend tests

**Deliverables**:
- Updated frontend components
- Admin panel (optional)
- Frontend tests

**Acceptance Criteria**:
- [ ] User-editable fields have working edit controls
- [ ] Protected fields shown as read-only with 🔒 indicator
- [ ] Tooltips explain protection status
- [ ] UI prevents editing protected fields
- [ ] Changes save successfully for user-editable fields
- [ ] Protected fields remain unchanged after user edits

---

## Appendix A: Example Protected Config

```yaml
# /prod/.claude/agents/.system/strategic-planner.protected.yaml

version: "1.0.0"
checksum: "sha256:a3b5c7d9e1f2g4h6i8j0k2l4m6n8o0p2q4r6s8t0u2v4w6x8y0z2"
agent_id: "strategic-planner"

permissions:
  # API Access Control
  api_endpoints:
    - path: "/api/posts"
      methods: ["GET", "POST"]
      rate_limit: "10/minute"
      authentication: "required"

    - path: "/api/posts/:id/comments"
      methods: ["GET", "POST"]
      rate_limit: "20/minute"
      authentication: "required"

    - path: "/api/work-queue"
      methods: ["GET"]
      rate_limit: "60/minute"
      authentication: "required"

  # Workspace Restrictions
  workspace:
    root: "/workspaces/agent-feed/prod/agent_workspace"
    subdirectory: "agents/strategic-planner"
    max_storage: "1GB"
    allowed_paths:
      - "/workspaces/agent-feed/prod/agent_workspace/agents/strategic-planner/**"
      - "/workspaces/agent-feed/prod/agent_workspace/shared/**"
    forbidden_paths:
      - "/workspaces/agent-feed/prod/system_instructions/**"
      - "/workspaces/agent-feed/src/**"
      - "/workspaces/agent-feed/api-server/**"

  # Tool Permissions
  tool_permissions:
    allowed:
      - "Read"
      - "Write"
      - "Edit"
      - "Bash"
      - "Grep"
      - "Glob"
    forbidden:
      - "KillShell"

  # Resource Limits
  resource_limits:
    max_memory: "512MB"
    max_cpu_percent: 50
    max_execution_time: "300s"
    max_concurrent_tasks: 3

  # Posting Rules
  posting_rules:
    auto_post_outcomes: true
    post_threshold: "completed_task"  # never | completed_task | significant_outcome | always
    default_post_type: "reply"         # reply | new_post | auto

  # Security Policies
  security:
    sandbox_enabled: true
    network_access: "api_only"         # none | api_only | restricted | full
    file_operations: "workspace_only"  # none | workspace_only | restricted | full

_metadata:
  created_at: "2025-10-17T14:00:00Z"
  updated_at: "2025-10-17T14:00:00Z"
  version: "1.0.0"
  hash: "sha256:a3b5c7d9e1f2g4h6i8j0k2l4m6n8o0p2q4r6s8t0u2v4w6x8y0z2"
```

---

## Appendix B: Example Agent with Sidecar Reference

```markdown
---
name: strategic-planner
description: Strategic planning and goal analysis specialist
tools: [Read, Write, Edit, Bash, Grep, Glob]
model: sonnet
color: "#3B82F6"
proactive: true
priority: P1
_protected_config_source: ".system/strategic-planner.protected.yaml"
---

# Strategic Planner Agent

## Purpose

You are a strategic planning specialist focused on long-term goal analysis, roadmap creation, and business impact assessment.

## Working Directory

Your working directory is `/workspaces/agent-feed/prod/agent_workspace/strategic-planner/`.

## Instructions

When invoked, follow these steps:
1. Analyze user request for strategic planning needs
2. Review existing strategic documents in workspace
3. Develop actionable recommendations
4. Create structured roadmaps and timelines
5. Document strategic decisions and rationales

**Best Practices**:
- Focus on long-term business value
- Consider resource constraints
- Prioritize based on IMPACT framework
- Document decision rationales
- Communicate clearly and concisely
```

---

## Appendix C: TypeScript Type Definitions

```typescript
// /src/config/schemas/protected-config.schema.ts

import { z } from 'zod';

export const ApiEndpointSchema = z.object({
  path: z.string(),
  methods: z.array(z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH'])),
  rate_limit: z.string().optional(),
  authentication: z.enum(['required', 'optional', 'none']).optional()
});

export const WorkspaceConfigSchema = z.object({
  root: z.string(),
  subdirectory: z.string().optional(),
  max_storage: z.string().optional(),
  allowed_paths: z.array(z.string()).optional(),
  forbidden_paths: z.array(z.string()).optional()
});

export const ToolPermissionsSchema = z.object({
  allowed: z.array(z.string()),
  forbidden: z.array(z.string()).optional()
});

export const ResourceLimitsSchema = z.object({
  max_memory: z.string().optional(),
  max_cpu_percent: z.number().min(0).max(100).optional(),
  max_execution_time: z.string().optional(),
  max_concurrent_tasks: z.number().min(1).optional()
});

export const PostingRulesSchema = z.object({
  auto_post_outcomes: z.boolean(),
  post_threshold: z.enum(['never', 'completed_task', 'significant_outcome', 'always']),
  default_post_type: z.enum(['reply', 'new_post', 'auto'])
});

export const SecurityConfigSchema = z.object({
  sandbox_enabled: z.boolean(),
  network_access: z.enum(['none', 'api_only', 'restricted', 'full']),
  file_operations: z.enum(['none', 'workspace_only', 'restricted', 'full'])
});

export const ProtectedPermissionsSchema = z.object({
  api_endpoints: z.array(ApiEndpointSchema).optional(),
  workspace: WorkspaceConfigSchema.optional(),
  tool_permissions: ToolPermissionsSchema.optional(),
  resource_limits: ResourceLimitsSchema.optional(),
  posting_rules: PostingRulesSchema.optional(),
  security: SecurityConfigSchema.optional()
});

export const ProtectedConfigSchema = z.object({
  version: z.string(),
  checksum: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  agent_id: z.string(),
  permissions: ProtectedPermissionsSchema,
  _metadata: z.object({
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    version: z.string().optional(),
    hash: z.string().optional()
  }).optional()
});

export type ProtectedConfig = z.infer<typeof ProtectedConfigSchema>;
export type ApiEndpoint = z.infer<typeof ApiEndpointSchema>;
export type WorkspaceConfig = z.infer<typeof WorkspaceConfigSchema>;
export type ToolPermissions = z.infer<typeof ToolPermissionsSchema>;
export type ResourceLimits = z.infer<typeof ResourceLimitsSchema>;
export type PostingRules = z.infer<typeof PostingRulesSchema>;
export type SecurityConfig = z.infer<typeof SecurityConfigSchema>;
export type ProtectedPermissions = z.infer<typeof ProtectedPermissionsSchema>;
```

---

## Appendix D: Security Checklist

**Pre-Deployment Security Checklist**:

- [ ] **File Permissions**
  - [ ] `.system/` directory has 555 permissions
  - [ ] All `*.protected.yaml` files have 444 permissions
  - [ ] Backup directory has 700 permissions (admin only)

- [ ] **Integrity Verification**
  - [ ] SHA-256 checksums computed correctly
  - [ ] Checksum verification enabled for all configs
  - [ ] Metadata fields excluded from hash computation

- [ ] **Access Control**
  - [ ] System privilege verification implemented
  - [ ] Admin authentication required for updates
  - [ ] Unauthorized access attempts logged

- [ ] **Monitoring**
  - [ ] File watcher monitoring `.system/` directory
  - [ ] Security events logged with full context
  - [ ] Admin alerts configured and tested

- [ ] **Backup and Recovery**
  - [ ] Backups created before each update
  - [ ] Backup retention policy: 30 days minimum
  - [ ] Auto-rollback tested and verified

- [ ] **Audit Trail**
  - [ ] All config changes logged
  - [ ] Logs are append-only and tamper-proof
  - [ ] Log retention policy: 90 days minimum

- [ ] **Testing**
  - [ ] Unit tests: >90% coverage
  - [ ] Integration tests pass
  - [ ] Security tests (tampering, replay, etc.) pass
  - [ ] Performance benchmarks met

---

## Document Revision History

| Version | Date       | Author | Changes                          |
|---------|------------|--------|----------------------------------|
| 1.0.0   | 2025-10-17 | SPARC  | Initial specification document   |

---

**END OF SPECIFICATION**
