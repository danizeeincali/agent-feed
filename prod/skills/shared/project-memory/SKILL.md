---
name: Project Memory
description: Project context and history management including decision logs, context retention, knowledge graphs, and relationship mapping
version: "1.0.0"
category: shared
_protected: false
_allowed_agents: ["meta-agent", "personal-todos-agent", "meeting-next-steps-agent"]
_last_updated: "2025-10-18"
---

# Project Memory Skill

## Purpose

Provides comprehensive frameworks for capturing, organizing, and retrieving project context, history, decisions, and relationships. Enables institutional knowledge retention and continuity across sessions, team members, and time periods.

## When to Use This Skill

- Capturing important project decisions
- Documenting context for future reference
- Building institutional knowledge
- Onboarding new team members
- Resuming work after interruptions
- Understanding project history
- Mapping relationships and dependencies

## Core Frameworks

### 1. Decision Log Framework

**Decision Record Structure**:
```markdown
# Decision Record: [DR-###] [Short Title]

**Date:** 2025-10-18
**Status:** Proposed | Accepted | Rejected | Superseded | Deprecated
**Deciders:** [List of decision makers]
**Related:** [Links to related decisions]

## Context

What is the issue we're facing? What factors are driving this decision?

Example:
Our current priority system (P1-P5) isn't providing enough differentiation
between priority levels. Users struggle to meaningfully prioritize tasks,
and everything tends to cluster around P2-P3 priorities.

## Decision

What is the change we're making?

Example:
We will adopt a Fibonacci-based IMPACT priority framework (0,1,2,3,5,8)
that combines base priority with urgency and business impact multipliers.

## Consequences

What are the positive and negative outcomes of this decision?

### Positive
- More meaningful priority differentiation
- Natural resistance to priority inflation
- Clearer communication of importance
- Better task sorting and organization

### Negative
- Breaking change requiring user migration
- Learning curve for new system
- Need to update all documentation
- Temporary confusion during transition

### Neutral
- Requires new UI components
- Changes API response format
- Affects existing integrations

## Alternatives Considered

What other options did we evaluate?

### Alternative 1: Linear scale (1-10)
**Pros:** Simple, familiar
**Cons:** Too granular, encourages over-analysis
**Why not chosen:** Doesn't solve core problem of clustering

### Alternative 2: T-shirt sizes (XS-XL)
**Pros:** Quick to understand
**Cons:** Too informal, lacks precision
**Why not chosen:** Not suitable for professional context

### Alternative 3: MoSCoW (Must/Should/Could/Won't)
**Pros:** Good for feature planning
**Cons:** Not granular enough for task management
**Why not chosen:** Wrong tool for this use case

## Implementation Notes

How will this be implemented?

- Phase 1: Add new field alongside old (dual-write)
- Phase 2: Migrate existing data
- Phase 3: Update UI and API
- Phase 4: Deprecate old format (90-day sunset)

## Review Schedule

When should this decision be reviewed?

- **Initial review:** 2025-11-18 (30 days)
- **Major review:** 2026-01-18 (Quarterly)
- **Next evaluation:** After 3 months of user data

## References

- User research: /docs/research/priority-study.md
- Technical spec: /docs/specs/fibonacci-priorities.md
- Original issue: #456
- Related decisions: DR-012 (Task management v2)

---

**Decision made:** 2025-10-18
**Last updated:** 2025-10-18
```

**Decision Categories**:
```
ARCHITECTURAL DECISIONS:
  - Technology choices
  - System design patterns
  - Integration approaches
  - Infrastructure decisions

PRODUCT DECISIONS:
  - Feature prioritization
  - User experience choices
  - Scope decisions
  - Market positioning

PROCESS DECISIONS:
  - Development workflows
  - Team practices
  - Quality standards
  - Communication patterns

BUSINESS DECISIONS:
  - Pricing models
  - Partnership choices
  - Resource allocation
  - Strategic direction
```

### 2. Context Capture Framework

**Session Context Template**:
```markdown
# Session Context: [Date] - [Topic]

## Session Metadata
- **Date:** 2025-10-18
- **Duration:** 2 hours
- **Participants:** Agent Name, User
- **Project:** Task Management System
- **Phase:** Development - Feature Implementation

## What We Worked On

High-level summary of session activities:
- Implemented Fibonacci priority framework
- Updated task sorting algorithm
- Created migration scripts for existing data
- Wrote unit tests for new priority calculation

## Key Decisions Made

Quick-reference decision list:
1. Use Fibonacci scale (0,1,2,3,5,8) over linear scale
2. Include urgency multiplier based on due date
3. Migrate data in phases with 90-day overlap
4. Keep old priority field for backward compatibility

## Important Context for Future

What should I remember next session?
- Priority calculation formula: base × urgency × impact
- Migration currently in Phase 1 (dual-write)
- Need to monitor user feedback on new system
- Performance optimization needed for large task lists

## Open Questions

What needs to be resolved?
- How to handle tasks without due dates in urgency calculation?
- Should we allow custom priority scales per user?
- What happens to API v1 clients after sunset?

## Next Steps

What to do in next session:
1. Complete Phase 2 migration (estimated 2 hours)
2. Update API documentation
3. Create user guide for new priority system
4. Run performance benchmarks on task sorting

## Files Changed

For quick reference:
- `/api/models/task.model.ts`
- `/api/services/priority.service.ts`
- `/api/migrations/add-fibonacci-priority.ts`
- `/tests/unit/priority-calculation.test.ts`

## Links and References

- Decision Record: DR-045
- Technical Spec: /docs/specs/fibonacci-priorities.md
- User Story: TASK-456
- Related Sessions: 2025-10-15 (Initial planning)

---

**Session Status:** Completed
**Confidence in Progress:** 🟢 High
**Ready for Next Session:** ✅ Yes
```

**Quick Context Resume**:
```markdown
# Quick Resume: [Project Name]

## Where We Are (30-second summary)

Currently implementing Fibonacci priority framework. Phase 1 (dual-write)
complete. Migration scripts ready. Next: Phase 2 data migration.

## What's Working
✅ New priority calculation logic
✅ Unit tests passing
✅ Dual-write operational

## What's Blocked
⚠️ Waiting on: User feedback from beta testers
⚠️ Decision needed: Custom priority scales per user?

## Immediate Next Actions
1. Run Phase 2 migration (2 hours)
2. Update API docs (1 hour)
3. Monitor for issues (ongoing)

## Key Files
- Priority logic: `/api/services/priority.service.ts`
- Migration: `/api/migrations/add-fibonacci-priority.ts`
- Tests: `/tests/unit/priority-calculation.test.ts`

---
**Last Updated:** 2025-10-18 16:30
**Next Session:** Scheduled for 2025-10-19 09:00
```

### 3. Knowledge Graph Framework

**Relationship Mapping**:
```
PROJECT KNOWLEDGE GRAPH:

[Task Management System]
  │
  ├─ Components
  │   ├─ [Priority System] ──────────► [Fibonacci Framework]
  │   │   └─ Related to ───────────► [User Research: DR-045]
  │   ├─ [Task API]
  │   │   ├─ Depends on ───────────► [Database Schema]
  │   │   └─ Used by ──────────────► [Mobile App, Web App]
  │   └─ [Notification System]
  │       └─ Triggers ──────────────► [Email Service]
  │
  ├─ Decisions
  │   ├─ [DR-045: Fibonacci Priorities]
  │   │   ├─ Supersedes ───────────► [DR-012: Linear Priorities]
  │   │   └─ Influences ───────────► [UI Redesign: DR-046]
  │   └─ [DR-046: Priority UI Redesign]
  │       └─ Implements ───────────► [DR-045]
  │
  ├─ People
  │   ├─ [Product Owner] ──────────► Owns: Priority Framework
  │   ├─ [Lead Developer] ─────────► Implements: Task API
  │   └─ [UX Designer] ────────────► Designs: Priority UI
  │
  └─ External Dependencies
      ├─ [PostgreSQL] ─────────────► Database
      ├─ [SendGrid] ───────────────► Email delivery
      └─ [Stripe] ─────────────────► Payment processing

RELATIONSHIP TYPES:
  ──────► Dependency
  ═══════► Influence
  ┄┄┄┄┄┄► Related to
  ━━━━━━► Supersedes
```

**Entity Relationships**:
```yaml
entities:
  - id: fibonacci-framework
    type: feature
    status: in-development
    relationships:
      supersedes: [linear-priority-system]
      implements: [DR-045]
      affects: [task-api, task-ui, mobile-app]
      researched_in: [user-study-2025-09]
      documented_in: [fibonacci-priorities-spec]
      tested_in: [priority-unit-tests]

  - id: DR-045
    type: decision
    status: accepted
    relationships:
      decides_on: [fibonacci-framework]
      alternatives: [linear-scale, tshirt-sizes, moscow]
      influences: [DR-046, DR-047]
      created_by: [meta-agent]
      reviewed_by: [product-owner, tech-lead]

  - id: task-api
    type: component
    status: active
    relationships:
      depends_on: [database-schema, auth-service]
      consumed_by: [web-app, mobile-app, api-clients]
      implements: [rest-api-spec]
      tested_by: [api-integration-tests]
```

### 4. Timeline and History Tracking

**Project Timeline**:
```
PROJECT TIMELINE: Task Management System

2025-09
├─ 09-01: Project kickoff
├─ 09-15: User research completed
├─ 09-20: Initial architecture designed
└─ 09-30: Phase 1 development started

2025-10
├─ 10-05: Basic CRUD operations completed
├─ 10-10: Authentication implemented
├─ 10-15: Priority system v1 (linear) deployed
├─ 10-18: Decision to switch to Fibonacci priorities (DR-045)
├─ 10-19: Fibonacci framework implementation started ← WE ARE HERE
├─ 10-25: [PLANNED] Migration Phase 2 complete
└─ 10-31: [PLANNED] Beta release with new priorities

2025-11
├─ 11-15: [PLANNED] User feedback analysis
└─ 11-30: [PLANNED] Public launch

KEY MILESTONES:
✅ M1: Core functionality (Oct 5)
✅ M2: Authentication system (Oct 10)
✅ M3: Priority v1 deployed (Oct 15)
🔄 M4: Fibonacci priorities (Oct 31)
📅 M5: Beta release (Nov 15)
📅 M6: Public launch (Nov 30)
```

**Change History**:
```markdown
# Change History: Priority System

## v2.0.0 - Fibonacci Framework (2025-10-18) 🔄 IN PROGRESS
- Introduced Fibonacci priority scale (0,1,2,3,5,8)
- Added urgency multiplier calculation
- Implemented business impact factor
- Created migration path from v1

### Related
- Decision: DR-045
- Issue: #456
- Pull Requests: #789, #790

## v1.1.0 - Priority Enhancements (2025-10-15)
- Added priority sorting to task lists
- Improved priority visualization in UI
- Fixed priority persistence bug

### Related
- Issue: #432
- Pull Request: #765

## v1.0.0 - Initial Priority System (2025-10-10)
- Implemented linear priority scale (P1-P5)
- Basic priority assignment UI
- Priority filtering in task views

### Related
- Issue: #401
- Pull Request: #723

## Historical Context
The priority system evolved from user feedback indicating that linear
priorities weren't providing enough differentiation. The move to
Fibonacci scale reflects research showing users need clearer gaps
between priority levels to make meaningful decisions.
```

### 5. Onboarding Documentation

**New Team Member Guide**:
```markdown
# Welcome to Task Management System

## Quick Start (15 minutes)

### What We're Building
AI-powered task management system that helps users prioritize effectively
using Fibonacci-based IMPACT framework.

### Current Status
- ✅ Core CRUD operations complete
- ✅ Authentication working
- 🔄 Migrating to Fibonacci priorities (in progress)
- 📅 Beta launch planned for Nov 15

### Key Concepts

**Fibonacci Priority Framework:**
Our unique prioritization system using Fibonacci scale (0,1,2,3,5,8)
combined with urgency and impact multipliers.

**IMPACT Score:**
Calculated as: Base Priority × Urgency Multiplier × Business Impact
Results in final score used for task sorting.

### Architecture Overview

```
┌─────────────┐
│   Web App   │◄──────┐
└─────────────┘       │
                      │
┌─────────────┐       │
│ Mobile App  │◄──────┤
└─────────────┘       │
                      ▼
                 ┌────────┐
                 │Task API│
                 └────────┘
                      │
                      ▼
                 ┌──────────┐
                 │PostgreSQL│
                 └──────────┘
```

### Important Files

**Core Logic:**
- `/api/models/task.model.ts` - Task data structure
- `/api/services/priority.service.ts` - Priority calculation
- `/api/controllers/tasks.controller.ts` - API endpoints

**Frontend:**
- `/web/components/TaskList.tsx` - Main task view
- `/web/components/PrioritySelector.tsx` - Priority UI
- `/web/hooks/useTasks.ts` - Task data management

**Tests:**
- `/tests/unit/priority-calculation.test.ts`
- `/tests/integration/task-api.test.ts`
- `/tests/e2e/task-management.spec.ts`

### Key Decisions

Must-read decision records:
- DR-045: Fibonacci Priority Framework (current work)
- DR-030: PostgreSQL over MongoDB
- DR-018: React + TypeScript for frontend

### Who's Who

- **Product Owner:** Defines features and priorities
- **Tech Lead:** Architecture and technical decisions
- **Frontend Dev:** Web and mobile UI
- **Backend Dev:** API and database
- **QA:** Testing and quality assurance

### Communication

- **Daily standup:** 9:00 AM
- **Sprint planning:** Mondays 10:00 AM
- **Retro:** Fridays 4:00 PM
- **Slack:** #task-management-dev
- **Docs:** /docs in repository

### First Tasks

1. Set up local development environment (see /docs/setup.md)
2. Read decision records: DR-045, DR-030, DR-018
3. Run test suite and verify all passing
4. Review current sprint board
5. Pair with teammate on small task

### Questions?

Ask in #task-management-dev or ping Tech Lead directly.

---

**Welcome aboard! We're glad to have you on the team.**
```

### 6. Search and Retrieval Patterns

**Memory Search Index**:
```
SEARCHABLE FIELDS:

DECISIONS:
  - Title, description, keywords
  - Decision maker names
  - Dates (creation, review, update)
  - Status (proposed, accepted, etc.)
  - Related decisions, projects, people

CONTEXT:
  - Session summaries
  - Key decisions made
  - Important findings
  - Open questions
  - Next steps

ENTITIES:
  - Names (projects, features, people)
  - Relationships (depends on, influences)
  - Status (active, deprecated, planned)
  - Tags and categories

TIMELINE:
  - Date ranges
  - Milestones
  - Version history
  - Change events
```

**Search Examples**:
```
SEARCH: "priority system decisions"
RESULTS:
  1. DR-045: Fibonacci Priority Framework (2025-10-18)
  2. DR-012: Linear Priority System v1 (2025-09-30)
  3. Session: Priority UI Design Discussion (2025-10-16)

SEARCH: "who decided on fibonacci priorities"
RESULTS:
  - Decision: DR-045
  - Deciders: Product Owner, Tech Lead, Meta Agent
  - Date: 2025-10-18
  - Alternatives considered: Linear scale, T-shirt sizes

SEARCH: "what changed in october 2025"
RESULTS:
  - Oct 5: CRUD operations completed
  - Oct 10: Authentication deployed
  - Oct 15: Priority v1 launched
  - Oct 18: Decision to adopt Fibonacci (DR-045)

SEARCH: "migrations in progress"
RESULTS:
  - Fibonacci Priority Migration (Phase 1 complete, Phase 2 pending)
  - Estimated completion: Oct 25, 2025
  - Files: /api/migrations/add-fibonacci-priority.ts
```

## Best Practices

### For Decision Logs:
1. **Record All Significant Decisions**: Don't wait, capture immediately
2. **Include Alternatives**: Show what wasn't chosen and why
3. **Document Consequences**: Both positive and negative impacts
4. **Link Related Decisions**: Build decision history
5. **Review Periodically**: Decisions can be superseded

### For Context Retention:
1. **Capture at End of Session**: While context is fresh
2. **Focus on Future Value**: What will help next session?
3. **Include Quick Resume**: 30-second summary for fast recovery
4. **Link to Artifacts**: Connect to files, decisions, issues
5. **Note Open Questions**: Track what needs resolution

### For Knowledge Graphs:
1. **Map Relationships**: Connect entities explicitly
2. **Track Dependencies**: Know what affects what
3. **Document Ownership**: Who's responsible for what
4. **Update Regularly**: Keep graph current
5. **Visualize When Helpful**: Diagrams aid understanding

### For Onboarding:
1. **Start with Why**: Context before details
2. **Progressive Disclosure**: Essential → advanced information
3. **Provide Quick Wins**: First task on day one
4. **Link Resources**: Connect to deeper documentation
5. **Assign Buddy**: Pairing accelerates learning

## Integration with Other Skills

- **task-management**: Link tasks to project context
- **documentation-standards**: Follow doc standards for memory
- **goal-frameworks**: Track goal context and history
- **update-protocols**: Document update decisions
- **meeting-coordination**: Capture meeting decisions

## Success Metrics

- **Context Recovery Time**: <5 minutes to resume work
- **Onboarding Speed**: New members productive within 1 day
- **Decision Clarity**: 100% of major decisions documented
- **Search Effectiveness**: Find needed context within 2 minutes
- **Knowledge Retention**: Zero repeated mistakes from lost context
- **Session Continuity**: Smooth transitions between sessions

## References

- [decision-record-templates.md](decision-record-templates.md) - ADR templates
- [context-capture-guide.md](context-capture-guide.md) - Context documentation
- [knowledge-graph-tools.md](knowledge-graph-tools.md) - Relationship mapping
- [onboarding-checklists.md](onboarding-checklists.md) - New member guides
- [memory-search-guide.md](memory-search-guide.md) - Search and retrieval

---

**Remember**: Your project memory is your institutional intelligence. Capture decisions systematically, document context thoroughly, map relationships clearly, and make knowledge searchable. A well-maintained project memory prevents repeated mistakes, accelerates onboarding, and enables informed decision-making. The time you invest in memory today saves multiples of time tomorrow.
