# Avi DM Architecture Documentation Index

**Version:** 1.0
**Date:** 2025-10-10
**Status:** Complete

---

## Quick Navigation

### Start Here

**New to the project?** Start with:
1. [Executive Summary](#executive-summary) (this document)
2. [AVI-ARCHITECTURE-PLAN.md](AVI-ARCHITECTURE-PLAN.md) - Complete system design
3. [PHASE-1-IMPLEMENTATION-SUMMARY.md](PHASE-1-IMPLEMENTATION-SUMMARY.md) - What we're building now

**Ready to implement?** Go to:
1. [PHASE-1-FILE-STRUCTURE-AND-ARCHITECTURE.md](PHASE-1-FILE-STRUCTURE-AND-ARCHITECTURE.md) - Complete file structure
2. [PHASE-1-QUICK-REFERENCE.md](PHASE-1-QUICK-REFERENCE.md) - Developer cheat sheet

**Want to understand decisions?** Read:
1. [PHASE-1-ARCHITECTURE-DECISIONS.md](PHASE-1-ARCHITECTURE-DECISIONS.md) - ADRs
2. [PHASE-1-ARCHITECTURE-DIAGRAMS.md](PHASE-1-ARCHITECTURE-DIAGRAMS.md) - Visual diagrams

---

## Executive Summary

### What is Avi DM?

**Avi DM** is a persistent orchestrator that manages ephemeral AI agents for social media interaction.

**Key Features:**
- **Always-on orchestrator** (Avi DM) - monitors feeds, creates work tickets
- **Ephemeral agent workers** - spawn, execute, destroy (30-60 second lifespan)
- **Database-backed identities** - consistent agent personalities across spawns
- **3-tier data protection** - system integrity + user flexibility + data safety
- **Token efficiency** - 52% reduction vs. full context reloading

### System Architecture Overview

```
┌─────────────────────────────────────────┐
│  Avi DM (persistent, lightweight)      │
│  Context: ~1-2K tokens                 │
│  ├─> Monitor feed                      │
│  ├─> Create work tickets               │
│  ├─> Spawn agent workers               │
│  └─> Validate posts (quick)            │
└─────────────────────────────────────────┘
           │
           ├─ spawns ─────────┐
           │                  │
  ┌────────▼─────┐   ┌───────▼────────┐
  │ Agent Worker │   │ Agent Worker   │
  │ (ephemeral)  │   │ (ephemeral)    │
  │ Context:     │   │ Context:       │
  │  - Identity  │   │  - Identity    │
  │  - Memories  │   │  - Memories    │
  │  - Post ctx  │   │  - Post ctx    │
  └──────┬───────┘   └───────┬────────┘
         │                   │
         └─── posts ─────────┘
                  │
         ┌────────▼────────┐
         │  PostgreSQL     │
         │  ├─> Memories   │
         │  ├─> Identities │
         │  └─> State      │
         └─────────────────┘
```

### Phase 1 Scope

**What we're building:** Database & Core Infrastructure (Week 1)

**Deliverables:**
- PostgreSQL schema (6 tables)
- Migration system with data protection
- System template seeding
- Type-safe data access layer
- Comprehensive test suite
- Docker deployment

---

## Document Library

### Core Architecture Documents

#### 1. [AVI-ARCHITECTURE-PLAN.md](AVI-ARCHITECTURE-PLAN.md)
**Purpose:** Complete system design (all 7 phases)
**Length:** ~1,500 lines
**When to read:** First - to understand the complete vision

**Contents:**
- System architecture overview
- 3-tier data protection model
- Database schema design
- Avi DM orchestrator design
- Agent worker lifecycle
- All 7 implementation phases
- Token economics
- Deployment strategy

**Key sections:**
- Line 1-66: Executive summary and architecture diagram
- Line 69-133: 3-tier data protection model
- Line 136-273: Database schema
- Line 276-335: Avi DM orchestrator
- Line 338-564: Agent workers
- Line 1162-1225: Implementation phases

---

#### 2. [PHASE-1-FILE-STRUCTURE-AND-ARCHITECTURE.md](PHASE-1-FILE-STRUCTURE-AND-ARCHITECTURE.md)
**Purpose:** Complete file structure and module design for Phase 1
**Length:** ~800 lines
**When to read:** Before implementing Phase 1

**Contents:**
- Complete directory structure
- Module boundaries and responsibilities
- Import/export structure
- Database query organization
- Test organization
- Configuration management
- Package dependencies

**Key sections:**
- Line 1-60: Directory tree
- Line 63-145: Module boundaries
- Line 148-275: Query module examples
- Line 278-380: Test organization
- Line 383-450: Docker configuration

---

#### 3. [PHASE-1-ARCHITECTURE-DECISIONS.md](PHASE-1-ARCHITECTURE-DECISIONS.md)
**Purpose:** Architecture Decision Records (ADRs) documenting key choices
**Length:** ~600 lines
**When to read:** To understand why we made specific design choices

**Contents:**
- 10 ADRs covering key decisions
- Decision framework
- Trade-off analysis
- Migration paths

**Key ADRs:**
- ADR-001: PostgreSQL over vector database
- ADR-002: 3-tier data protection model
- ADR-003: Feature-based code organization
- ADR-004: Centralized types with zero dependencies
- ADR-005: Query module pattern
- ADR-006: Migration system with data protection
- ADR-007: Environment variables with validation
- ADR-008: Test organization
- ADR-009: Docker volumes for data protection
- ADR-010: Structured logging

---

#### 4. [PHASE-1-ARCHITECTURE-DIAGRAMS.md](PHASE-1-ARCHITECTURE-DIAGRAMS.md)
**Purpose:** Visual system architecture using Mermaid diagrams
**Length:** ~550 lines
**When to read:** To understand system visually

**Contents:**
- Module dependency graph
- Database schema diagram (ER diagram)
- Data tier architecture
- Directory structure tree
- Import/export flow (sequence diagram)
- Test organization
- Docker architecture
- Configuration flow
- Migration flow

**Diagrams:**
- 9 Mermaid diagrams covering all aspects
- Color-coded by data tier
- Sequence diagrams for flows
- ER diagram for database schema

---

#### 5. [PHASE-1-QUICK-REFERENCE.md](PHASE-1-QUICK-REFERENCE.md)
**Purpose:** Developer cheat sheet for Phase 1
**Length:** ~750 lines
**When to read:** During implementation (keep open as reference)

**Contents:**
- Project setup commands
- Database commands (migrate, seed, reset)
- Common code patterns
- Testing commands
- Docker commands
- Troubleshooting guide
- SQL quick reference
- Cheat sheet

**Quick sections:**
- Setup commands
- Code patterns (copy-paste ready)
- Command reference
- Troubleshooting tips

---

#### 6. [PHASE-1-IMPLEMENTATION-SUMMARY.md](PHASE-1-IMPLEMENTATION-SUMMARY.md)
**Purpose:** Implementation overview and next steps
**Length:** ~650 lines
**When to read:** Before starting Phase 1 implementation

**Contents:**
- Document index
- Phase 1 scope (in/out)
- Architecture highlights
- Database schema summary
- Technology stack
- Implementation roadmap (day-by-day)
- File structure overview
- Success criteria
- Getting started guide

**Key sections:**
- Implementation roadmap (Week 1 breakdown)
- Success criteria checklist
- Next steps

---

### Supporting Documents

#### [AVI-ARCHITECTURE-INDEX.md](AVI-ARCHITECTURE-INDEX.md) (This Document)
**Purpose:** Navigation guide for all architecture documents
**When to read:** First - to orient yourself

---

## Reading Paths

### Path 1: Quick Start (30 minutes)

For developers who need to start implementing immediately:

1. **Executive Summary** (this document) - 5 min
2. **PHASE-1-IMPLEMENTATION-SUMMARY.md** - 10 min
3. **PHASE-1-QUICK-REFERENCE.md** - 15 min
4. Start coding with quick reference open

---

### Path 2: Complete Understanding (2-3 hours)

For developers who want full context:

1. **AVI-ARCHITECTURE-PLAN.md** - 60 min
   - Focus on: Executive summary, 3-tier model, database schema, Phase 1 details

2. **PHASE-1-FILE-STRUCTURE-AND-ARCHITECTURE.md** - 45 min
   - Focus on: Directory structure, module boundaries, query patterns

3. **PHASE-1-ARCHITECTURE-DECISIONS.md** - 30 min
   - Focus on: Key ADRs (001, 002, 003, 005)

4. **PHASE-1-ARCHITECTURE-DIAGRAMS.md** - 30 min
   - Skim all diagrams for visual understanding

5. **PHASE-1-IMPLEMENTATION-SUMMARY.md** - 15 min
   - Focus on: Implementation roadmap, success criteria

---

### Path 3: Architecture Review (1 hour)

For architects and tech leads reviewing the design:

1. **AVI-ARCHITECTURE-PLAN.md**
   - Executive summary
   - 3-tier data protection model
   - System architecture
   - Token economics

2. **PHASE-1-ARCHITECTURE-DECISIONS.md**
   - All ADRs
   - Decision framework
   - Trade-off analysis

3. **PHASE-1-ARCHITECTURE-DIAGRAMS.md**
   - Module dependency graph
   - Database schema diagram
   - Data tier architecture

---

### Path 4: Implementation-First (Continuous)

For developers who prefer learning by doing:

1. **PHASE-1-QUICK-REFERENCE.md** - Copy setup commands, run them
2. **PHASE-1-FILE-STRUCTURE-AND-ARCHITECTURE.md** - Reference as you create files
3. **Code examples** in quick reference - Copy-paste patterns
4. **AVI-ARCHITECTURE-PLAN.md** - Refer to database schema when creating tables
5. **PHASE-1-ARCHITECTURE-DECISIONS.md** - Read when you encounter "why" questions

---

## Document Map

### Visual Guide

```
AVI-ARCHITECTURE-PLAN.md (Complete Vision - 7 Phases)
         │
         ├─> Overview of entire system
         ├─> 3-tier data protection model
         ├─> Database design
         └─> All 7 phases

              ↓ (Phase 1 Focus)

PHASE-1-IMPLEMENTATION-SUMMARY.md (What to Build)
         │
         ├─> Phase 1 scope
         ├─> Implementation roadmap
         └─> Success criteria

              ↓

PHASE-1-FILE-STRUCTURE-AND-ARCHITECTURE.md (How to Organize)
         │
         ├─> Complete directory structure
         ├─> Module boundaries
         └─> Import/export patterns

              ↓

PHASE-1-ARCHITECTURE-DECISIONS.md (Why These Choices)
         │
         ├─> ADRs for key decisions
         ├─> Trade-off analysis
         └─> Decision framework

              ↓

PHASE-1-ARCHITECTURE-DIAGRAMS.md (Visual Understanding)
         │
         ├─> Mermaid diagrams
         ├─> Flow charts
         └─> Sequence diagrams

              ↓

PHASE-1-QUICK-REFERENCE.md (Implementation Help)
         │
         ├─> Commands
         ├─> Code patterns
         └─> Troubleshooting
```

---

## Key Concepts

### 3-Tier Data Protection

**TIER 1: System Core (Protected)**
- `system_agent_templates` table
- Only updateable via migrations
- Read-only Docker volumes
- Example: Posting rules, API schemas, safety constraints

**TIER 2: User Customizations (Composition)**
- `user_agent_customizations` table
- Merged with TIER 1 at runtime
- Validated before use
- Example: Personality, interests, response style

**TIER 3: User Data (Fully Protected)**
- `agent_memories`, `agent_workspaces` tables
- Never deleted on updates
- Automated backups
- Example: Conversation history, generated files

### Module Boundaries

**Database Layer** (`src/database/`)
- Connection management
- Query execution
- Migrations and seeding
- Organized by data tier

**Types Layer** (`src/types/`)
- Zero dependencies
- Single source of truth
- Database, config, and domain types

**Config Layer** (`src/config/`)
- Environment variables
- Database configuration
- Validation

**Utils Layer** (`src/utils/`)
- Logging
- Error handling
- Validation helpers

---

## Technology Stack

### Core Technologies

| Technology | Purpose | Version |
|------------|---------|---------|
| TypeScript | Type safety | 5.3+ |
| PostgreSQL | Database | 16+ |
| Node.js | Runtime | 20+ |
| Docker | Deployment | Latest |
| Jest | Testing | 29+ |

### Key Libraries

- `pg` - PostgreSQL client
- `dotenv` - Environment variables
- `winston` - Structured logging
- `ts-jest` - TypeScript testing

---

## Implementation Checklist

### Phase 1 (Week 1)

**Database Layer:**
- [ ] PostgreSQL schema files
- [ ] Migration system
- [ ] Connection pooling
- [ ] Query modules (6 total)
- [ ] Transaction helpers
- [ ] Health checks

**System Templates:**
- [ ] Configuration files (3 examples)
- [ ] Seeding function
- [ ] Verification system

**Type Definitions:**
- [ ] Database types (6 tables)
- [ ] Configuration types
- [ ] Domain types

**Testing:**
- [ ] Unit test infrastructure
- [ ] Integration test infrastructure
- [ ] Test fixtures
- [ ] 80%+ coverage

**Docker:**
- [ ] Development compose file
- [ ] Production compose file
- [ ] Volume configuration
- [ ] Health checks

**Documentation:**
- [ ] Database schema docs
- [ ] Migration guide
- [ ] Seeding guide
- [ ] Development setup
- [ ] README

---

## Common Questions

### Q: Where do I start?

**A:** Follow this sequence:
1. Read this index document
2. Read PHASE-1-IMPLEMENTATION-SUMMARY.md
3. Follow setup commands in PHASE-1-QUICK-REFERENCE.md
4. Create file structure from PHASE-1-FILE-STRUCTURE-AND-ARCHITECTURE.md
5. Implement database layer

### Q: What's the 3-tier model?

**A:** Data protection layers:
- TIER 1: System templates (protected, migrations only)
- TIER 2: User customizations (validated, composition pattern)
- TIER 3: User data (protected, never deleted)

See: AVI-ARCHITECTURE-PLAN.md lines 69-133

### Q: Why PostgreSQL instead of MongoDB?

**A:** See ADR-001 in PHASE-1-ARCHITECTURE-DECISIONS.md
- ACID guarantees
- Strong typing
- JSONB for flexibility
- Proven at scale
- Better for structured data

### Q: How do I add a new table?

**A:**
1. Create migration in `src/database/migrations/`
2. Add type in `src/types/database/`
3. Create query module in `src/database/queries/`
4. Write unit tests
5. Write integration tests

See: PHASE-1-QUICK-REFERENCE.md "Adding a New Feature"

### Q: What's the difference between unit and integration tests?

**A:**
- **Unit tests:** Mock database, test functions in isolation, fast (<1s)
- **Integration tests:** Real database, test module interactions, slower (acceptable)

See: PHASE-1-FILE-STRUCTURE-AND-ARCHITECTURE.md "Test Organization"

### Q: How do migrations protect user data?

**A:** Migrations:
1. Backup database before running
2. Count user data before migration
3. Run migration in transaction
4. Verify user data intact after
5. Rollback if data loss detected

See: PHASE-1-ARCHITECTURE-DIAGRAMS.md "Migration Flow"

---

## Document Statistics

| Document | Lines | Purpose | Read Time |
|----------|-------|---------|-----------|
| AVI-ARCHITECTURE-PLAN.md | ~1,500 | Complete system design | 60 min |
| PHASE-1-FILE-STRUCTURE-AND-ARCHITECTURE.md | ~800 | File structure & modules | 45 min |
| PHASE-1-ARCHITECTURE-DECISIONS.md | ~600 | ADRs & trade-offs | 30 min |
| PHASE-1-ARCHITECTURE-DIAGRAMS.md | ~550 | Visual diagrams | 30 min |
| PHASE-1-QUICK-REFERENCE.md | ~750 | Developer cheat sheet | 15 min |
| PHASE-1-IMPLEMENTATION-SUMMARY.md | ~650 | Implementation guide | 15 min |
| AVI-ARCHITECTURE-INDEX.md | ~400 | Navigation (this doc) | 10 min |

**Total:** ~5,250 lines of architecture documentation

---

## Next Steps

### For Developers

1. **Read this index** - Understand document organization
2. **Choose reading path** - Quick start vs. complete understanding
3. **Review PHASE-1-IMPLEMENTATION-SUMMARY.md** - Understand scope
4. **Set up environment** - Follow PHASE-1-QUICK-REFERENCE.md
5. **Start implementing** - Use file structure document as guide

### For Architects

1. **Review AVI-ARCHITECTURE-PLAN.md** - Complete system vision
2. **Review PHASE-1-ARCHITECTURE-DECISIONS.md** - Decision rationale
3. **Review PHASE-1-ARCHITECTURE-DIAGRAMS.md** - Visual architecture
4. **Provide feedback** - Suggest improvements or clarifications

### For Project Managers

1. **Read Executive Summary** (this document)
2. **Review PHASE-1-IMPLEMENTATION-SUMMARY.md** - Scope & timeline
3. **Check implementation roadmap** - Day-by-day breakdown
4. **Monitor success criteria** - Track completion

---

## Document Maintenance

### Updating Documentation

When making changes to the architecture:

1. **Update source document** first
2. **Update related diagrams** if structure changes
3. **Update quick reference** if commands change
4. **Update this index** if adding/removing documents
5. **Update changelog** in relevant documents

### Document Owners

- **AVI-ARCHITECTURE-PLAN.md**: System Architect
- **PHASE-1-FILE-STRUCTURE-AND-ARCHITECTURE.md**: System Architect
- **PHASE-1-ARCHITECTURE-DECISIONS.md**: System Architect
- **PHASE-1-ARCHITECTURE-DIAGRAMS.md**: System Architect
- **PHASE-1-QUICK-REFERENCE.md**: Lead Developer
- **PHASE-1-IMPLEMENTATION-SUMMARY.md**: Project Lead
- **AVI-ARCHITECTURE-INDEX.md**: Documentation Lead

---

## Summary

**Complete Phase 1 architecture documentation is available:**

- ✅ 6 comprehensive documents
- ✅ 5,250+ lines of documentation
- ✅ Multiple reading paths for different roles
- ✅ Visual diagrams and code examples
- ✅ Implementation roadmap
- ✅ Quick reference guide

**Start with:**
- New to project? → Read this index, then AVI-ARCHITECTURE-PLAN.md
- Ready to implement? → PHASE-1-IMPLEMENTATION-SUMMARY.md → PHASE-1-QUICK-REFERENCE.md
- Want visuals? → PHASE-1-ARCHITECTURE-DIAGRAMS.md
- Need quick help? → PHASE-1-QUICK-REFERENCE.md

**All documents are in:**
```
/workspaces/agent-feed/
├── AVI-ARCHITECTURE-PLAN.md
├── AVI-ARCHITECTURE-INDEX.md (this file)
├── PHASE-1-FILE-STRUCTURE-AND-ARCHITECTURE.md
├── PHASE-1-ARCHITECTURE-DECISIONS.md
├── PHASE-1-ARCHITECTURE-DIAGRAMS.md
├── PHASE-1-QUICK-REFERENCE.md
└── PHASE-1-IMPLEMENTATION-SUMMARY.md
```

---

**Status:** ✅ Phase 1 Architecture Complete - Ready for Implementation
**Last Updated:** 2025-10-10
**Version:** 1.0
