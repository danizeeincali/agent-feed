# Layer 4: Automated Feedback Loop - Architecture Diagram

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER/AGENT REQUEST                            │
│                     POST /api/agent-pages/...                        │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   VALIDATION MIDDLEWARE                              │
│              (page-validation.js)                                    │
│                                                                      │
│  • Validates component schemas                                       │
│  • Checks required props                                             │
│  • Attaches errors to req.validationErrors                          │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
                    ▼                         ▼
        ┌───────────────────┐    ┌───────────────────┐
        │  VALIDATION PASS  │    │  VALIDATION FAIL  │
        └─────────┬─────────┘    └─────────┬─────────┘
                  │                        │
                  │                        │
                  ▼                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    AGENT-PAGES ROUTE HANDLER                         │
│                     (agent-pages.js)                                 │
│                                                                      │
│  If Success:                  If Failure:                            │
│  • Create page in DB          • Loop through errors                 │
│  • Record success             • Call recordFailure() for each       │
│  • Return 201                 • Return 400 with errors              │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│              FEEDBACK LOOP SERVICE                                   │
│           (feedback-loop.js)                                         │
│                                                                      │
│  recordFailure(pageId, agentId, error)                              │
│  ├─ 1. Insert into validation_failures table                        │
│  ├─ 2. Update performance metrics                                   │
│  ├─ 3. Check for pattern via checkForPattern()                      │
│  └─ 4. If pattern threshold reached → updateAgentInstructions()     │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
                    ▼                         ▼
        ┌───────────────────┐    ┌───────────────────┐
        │  PATTERN DETECTED │    │   NO PATTERN      │
        │   (3+ failures)   │    │   (< 3 failures)  │
        └─────────┬─────────┘    └───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│            AUTO-UPDATE AGENT INSTRUCTIONS                            │
│                                                                      │
│  updateAgentInstructions(pattern)                                    │
│  ├─ 1. Generate context-aware warning                               │
│  ├─ 2. Append to instruction file                                   │
│  ├─ 3. Update memory file                                           │
│  ├─ 4. Record feedback in database                                  │
│  └─ 5. Mark pattern as auto-fix applied                             │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
                    ▼                         ▼
    ┌───────────────────────┐    ┌───────────────────────┐
    │   INSTRUCTION FILE    │    │     MEMORY FILE       │
    │   /instructions/      │    │     /memories/        │
    │   {agentId}.md        │    │ page-builder-         │
    │                       │    │   failures.md         │
    │ • Agent-specific      │    │                       │
    │ • Auto-generated      │    │ • Shared across       │
    │ • Pattern warnings    │    │   agents              │
    │ • Correct examples    │    │ • Historical context  │
    └───────────────────────┘    │ • Pattern catalog     │
                                 └───────────────────────┘
```

## Database Schema Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                          DATABASE                                    │
│                       (database.db)                                  │
│                                                                      │
│  ┌────────────────────────────────────────────────────────┐         │
│  │  validation_failures                                   │         │
│  │  ─────────────────────────────────────────────────────│         │
│  │  • id, page_id, agent_id                              │         │
│  │  • error_type, error_message, error_details           │         │
│  │  • component_type, validation_rule                    │         │
│  │  • page_config, stack_trace                           │         │
│  │  • created_at                                          │         │
│  └───────────────────────┬────────────────────────────────┘         │
│                          │                                           │
│                          │ Analyzed by                               │
│                          │                                           │
│  ┌───────────────────────▼────────────────────────────────┐         │
│  │  failure_patterns                                      │         │
│  │  ─────────────────────────────────────────────────────│         │
│  │  • id, agent_id, pattern_type                         │         │
│  │  • error_signature (normalized)                       │         │
│  │  • occurrence_count                                   │         │
│  │  • first_seen, last_seen                              │         │
│  │  • status (active/resolved/ignored)                   │         │
│  │  • auto_fix_applied, fix_applied_at                   │         │
│  └───────────────────────┬────────────────────────────────┘         │
│                          │                                           │
│                          │ Generates                                 │
│                          │                                           │
│  ┌───────────────────────▼────────────────────────────────┐         │
│  │  agent_feedback                                        │         │
│  │  ─────────────────────────────────────────────────────│         │
│  │  • id, agent_id, pattern_id                           │         │
│  │  • feedback_type (instruction_update/warning)         │         │
│  │  • feedback_content (JSON)                            │         │
│  │  • applied_to_agent (boolean)                         │         │
│  │  • effectiveness_score                                │         │
│  │  • created_at, updated_at                             │         │
│  └────────────────────────────────────────────────────────┘         │
│                                                                      │
│  ┌────────────────────────────────────────────────────────┐         │
│  │  agent_performance_metrics                             │         │
│  │  ─────────────────────────────────────────────────────│         │
│  │  • id, agent_id, date                                 │         │
│  │  • total_attempts, successful_attempts                │         │
│  │  • failed_attempts, validation_failures               │         │
│  │  • auto_fixes_applied, success_rate                   │         │
│  └────────────────────────────────────────────────────────┘         │
└─────────────────────────────────────────────────────────────────────┘
```

## API Routes Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                      FEEDBACK API ROUTES                             │
│                    /api/feedback/...                                 │
│                                                                      │
│  Agent Operations:                                                   │
│  ├─ GET  /agents/:id/metrics      → Agent health & performance      │
│  ├─ GET  /agents/:id/patterns     → Detected patterns list          │
│  ├─ GET  /agents/:id/history      → Failure history (paginated)     │
│  └─ POST /agents/:id/reset        → Reset learning                  │
│                                                                      │
│  System Operations:                                                  │
│  ├─ GET  /report                  → System-wide report              │
│  ├─ GET  /dashboard               → All agents overview             │
│  └─ GET  /stats                   → Overall statistics              │
│                                                                      │
│  Pattern Operations:                                                 │
│  ├─ GET   /patterns/:id           → Pattern details                 │
│  └─ PATCH /patterns/:id           → Update pattern status           │
└─────────────────────────────────────────────────────────────────────┘
```

## Pattern Detection Algorithm

```
┌─────────────────────────────────────────────────────────────────────┐
│                    PATTERN DETECTION FLOW                            │
│                                                                      │
│  Error: "Unknown component type: SidebarNavigation"                 │
│                          │                                           │
│                          ▼                                           │
│              Create Error Signature                                  │
│  ┌──────────────────────────────────────────────────────┐           │
│  │ 1. Normalize message:                                │           │
│  │    "unknown component type: sidebarnavigation"       │           │
│  │                                                      │           │
│  │ 2. Combine with type:                                │           │
│  │    "UNKNOWN_TYPE::unknown component type:            │           │
│  │     sidebarnavigation"                               │           │
│  └──────────────────────┬───────────────────────────────┘           │
│                         │                                            │
│                         ▼                                            │
│              Check Database for Signature                            │
│  ┌──────────────────────────────────────────────────────┐           │
│  │ SELECT * FROM failure_patterns                       │           │
│  │ WHERE agent_id = ? AND error_signature = ?           │           │
│  └──────────────────────┬───────────────────────────────┘           │
│                         │                                            │
│         ┌───────────────┴────────────────┐                          │
│         │                                │                          │
│         ▼                                ▼                          │
│  ┌─────────────┐                 ┌─────────────┐                   │
│  │   EXISTS    │                 │  NOT FOUND  │                   │
│  └──────┬──────┘                 └──────┬──────┘                   │
│         │                               │                           │
│         ▼                               ▼                           │
│  ┌─────────────┐                 ┌─────────────┐                   │
│  │ Increment   │                 │  Create new │                   │
│  │ count + 1   │                 │  count = 1  │                   │
│  └──────┬──────┘                 └──────┬──────┘                   │
│         │                               │                           │
│         └───────────────┬───────────────┘                           │
│                         │                                            │
│                         ▼                                            │
│              Check if count >= 3                                     │
│  ┌──────────────────────────────────────────────────────┐           │
│  │ if (occurrence_count >= PATTERN_THRESHOLD) {         │           │
│  │   updateAgentInstructions(pattern);                  │           │
│  │ }                                                     │           │
│  └──────────────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────────────┘
```

## Health Score Calculation

```
┌─────────────────────────────────────────────────────────────────────┐
│                     HEALTH SCORE ALGORITHM                           │
│                                                                      │
│  Input:                                                              │
│  • success_rate (0.0 - 1.0)                                         │
│  • active_patterns (integer count)                                  │
│                                                                      │
│  Calculation:                                                        │
│  ┌──────────────────────────────────────────────────────┐           │
│  │ score = (success_rate × 100) - (active_patterns × 10)│           │
│  │ score = Math.max(0, Math.min(100, score))           │           │
│  └──────────────────────────────────────────────────────┘           │
│                                                                      │
│  Examples:                                                           │
│  ┌──────────────────────────────────────────────────────┐           │
│  │ 100% success, 0 patterns:                            │           │
│  │   (1.0 × 100) - (0 × 10) = 100                      │           │
│  │                                                      │           │
│  │ 80% success, 2 patterns:                             │           │
│  │   (0.8 × 100) - (2 × 10) = 60                       │           │
│  │                                                      │           │
│  │ 50% success, 5 patterns:                             │           │
│  │   (0.5 × 100) - (5 × 10) = 0                        │           │
│  └──────────────────────────────────────────────────────┘           │
│                                                                      │
│  Interpretation:                                                     │
│  • 90-100: Excellent                                                │
│  • 70-89:  Good                                                     │
│  • 50-69:  Fair                                                     │
│  • 30-49:  Poor                                                     │
│  • 0-29:   Critical                                                 │
└─────────────────────────────────────────────────────────────────────┘
```

## File System Integration

```
/workspaces/agent-feed/
│
├── api-server/
│   ├── services/
│   │   ├── feedback-loop.js          ← Core service
│   │   └── feedback-loop-db.js       ← Database wrapper
│   ├── routes/
│   │   ├── feedback.js               ← API endpoints
│   │   └── agent-pages.js            ← Integration point
│   ├── middleware/
│   │   └── page-validation.js        ← Validation logic
│   ├── migrations/
│   │   └── add-feedback-system.sql   ← Database schema
│   └── server.js                     ← Initialization
│
├── prod/
│   └── agent_workspace/
│       ├── instructions/              ← Auto-generated warnings
│       │   └── {agentId}.md          ← Agent-specific
│       └── memories/                  ← Persistent learning
│           └── page-builder-failures.md
│
└── database.db                        ← SQLite database
    ├── validation_failures            (records)
    ├── failure_patterns               (patterns)
    ├── agent_feedback                 (learning)
    └── agent_performance_metrics      (metrics)
```

## Data Flow Example

```
┌─────────────────────────────────────────────────────────────────────┐
│                  EXAMPLE: 3 SIDEBAR FAILURES                         │
│                                                                      │
│  Failure #1                                                          │
│  ├─ Record to validation_failures                                   │
│  ├─ Create pattern (count=1)                                        │
│  └─ Update metrics (failed_attempts++)                              │
│                                                                      │
│  Failure #2                                                          │
│  ├─ Record to validation_failures                                   │
│  ├─ Update pattern (count=2)                                        │
│  └─ Update metrics (failed_attempts++)                              │
│                                                                      │
│  Failure #3 ★ THRESHOLD REACHED                                     │
│  ├─ Record to validation_failures                                   │
│  ├─ Update pattern (count=3)                                        │
│  ├─ Generate warning with correct example                           │
│  ├─ Append to /instructions/page-builder-agent.md                   │
│  ├─ Update /memories/page-builder-failures.md                       │
│  ├─ Create agent_feedback record                                    │
│  ├─ Mark pattern.auto_fix_applied = true                            │
│  └─ Update metrics (failed_attempts++, auto_fixes_applied++)        │
│                                                                      │
│  Result:                                                             │
│  • Agent instruction file now contains warning                      │
│  • Memory file logs pattern for all agents                          │
│  • Future failures of same pattern still recorded                   │
│  • Metrics show declining health score                              │
└─────────────────────────────────────────────────────────────────────┘
```

## Component Relationships

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                      │
│   ┌──────────────┐         ┌──────────────┐                        │
│   │ Validation   │────────▶│  Agent       │                        │
│   │ Middleware   │ errors  │  Pages       │                        │
│   └──────────────┘         │  Route       │                        │
│                            └───────┬──────┘                         │
│                                    │                                │
│                                    │ recordFailure()                │
│                                    │                                │
│                            ┌───────▼──────┐                         │
│                            │  Feedback    │                        │
│                            │  Loop        │                        │
│                            │  Service     │                        │
│                            └───────┬──────┘                         │
│                                    │                                │
│                    ┌───────────────┼───────────────┐                │
│                    │               │               │                │
│              ┌─────▼─────┐   ┌────▼────┐   ┌──────▼──────┐        │
│              │ Database  │   │  File   │   │    API      │        │
│              │ (SQLite)  │   │ System  │   │   Routes    │        │
│              └───────────┘   └─────────┘   └─────────────┘        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

**Legend**:
- `→` Data flow
- `▼` Process step
- `┌─┐` Component boundary
- `★` Important event
- `←` Reference/dependency

This architecture enables continuous learning and automatic improvement of agent behavior without manual intervention.
