# SPARC Specification: Phase 2 Removal + ReasoningBank Enablement

**Document Version**: 1.0
**Date**: 2025-10-23
**Methodology**: SPARC + NLD + TDD + Claude-Flow Swarm + Playwright E2E
**Validation**: 100% Real (No Mocks/Simulations)

---

## Executive Summary

**Objective**: Remove unused Phase 2 TypeScript orchestrator and enable ReasoningBank memory system with SQLite backend.

**Business Impact**:
- **Code Reduction**: Remove ~2,500 lines of dead code (Phase 2 + adapters)
- **Performance Improvement**: Eliminate failed PostgreSQL connection attempts on startup
- **AI Enhancement**: Enable 20-30% improvement in agent task performance via ReasoningBank
- **Maintainability**: Simplify architecture by removing unused TypeScript orchestrator

**Risk Level**: Low
- Phase 2 never runs (always falls back to Phase 1)
- ReasoningBank is additive (existing systems unaffected)
- Full rollback capability via git

---

# S - SPECIFICATION

## 1.1 Requirements: Phase 2 Removal

### Functional Requirements
- **FR-P2-1**: Remove all Phase 2 TypeScript orchestrator files
- **FR-P2-2**: Remove Phase 2 adapter files (5 adapters)
- **FR-P2-3**: Remove Phase 2 type definition files
- **FR-P2-4**: Remove Phase 2 fallback logic from `server.js`
- **FR-P2-5**: Phase 1 JavaScript orchestrator starts directly (no fallback)
- **FR-P2-6**: No PostgreSQL connection attempts on startup

### Non-Functional Requirements
- **NFR-P2-1**: Server startup time reduced by 500ms (no PostgreSQL retry)
- **NFR-P2-2**: No errors/warnings in startup logs
- **NFR-P2-3**: AVI orchestrator health checks pass 100%
- **NFR-P2-4**: Zero downtime deployment

### Files to Delete
```
src/avi/
├── orchestrator.ts (325 lines)
├── health-monitor.ts
├── state-manager.ts
├── types.ts
└── README.md

src/adapters/
├── avi-database.adapter.ts (PostgreSQL)
├── health-monitor.adapter.ts
├── work-queue.adapter.ts
├── worker-spawner.adapter.ts
└── worker-context.adapter.ts

src/types/
└── avi.ts (if exists)

Documentation/
├── PHASE-2-ORCHESTRATOR-INVESTIGATION.md (archive)
└── PHASE-2-*.md (archive to docs/archive/)
```

### Files to Modify
**`api-server/server.js`** (lines 3713-3743):
```javascript
// BEFORE (with fallback):
try {
  console.log('   Attempting to load new orchestrator factory (TypeScript)...');
  const orchestratorModule = await loadNewOrchestrator();
  await orchestratorModule.startOrchestrator();
} catch (tsError) {
  console.warn('⚠️  Failed to load TypeScript orchestrator, falling back to legacy:', tsError.message);
  await startLegacyOrchestrator({ /* config */ });
}

// AFTER (direct start):
import { startOrchestrator, stopOrchestrator } from './avi/orchestrator.js';
await startOrchestrator({
  maxWorkers: parseInt(process.env.AVI_MAX_WORKERS) || 5,
  maxContextSize: parseInt(process.env.AVI_MAX_CONTEXT) || 50000,
  pollInterval: parseInt(process.env.AVI_POLL_INTERVAL) || 5000,
  healthCheckInterval: parseInt(process.env.AVI_HEALTH_CHECK_INTERVAL) || 30000
});
console.log('✅ AVI Orchestrator started - monitoring for agent activity');
```

### Success Criteria
- ✅ All Phase 2 files deleted
- ✅ No references to Phase 2 in codebase (`grep -r "Phase 2" --exclude-dir=node_modules`)
- ✅ Server starts with zero PostgreSQL errors
- ✅ AVI orchestrator starts directly (no "Legacy" message)
- ✅ All existing AVI features work (polling, health checks, worker spawning)

---

## 1.2 Requirements: ReasoningBank Enablement

### Functional Requirements
- **FR-RB-1**: Initialize ReasoningBank SQLite database
- **FR-RB-2**: Create database directory structure: `prod/.reasoningbank/backups/`
- **FR-RB-3**: Apply schema from `api-server/db/reasoningbank-schema.sql`
- **FR-RB-4**: Enable WAL mode for concurrent access
- **FR-RB-5**: Inject memories before agent task execution
- **FR-RB-6**: Update memories after task completion (success/failure)
- **FR-RB-7**: Health check endpoint for ReasoningBank
- **FR-RB-8**: Statistics endpoint for monitoring

### Non-Functional Requirements
- **NFR-RB-1**: Query latency <3ms (p95)
- **NFR-RB-2**: Storage growth <50MB/month/agent
- **NFR-RB-3**: Semantic search accuracy 87-95%
- **NFR-RB-4**: k-NN retrieval <10ms for top-10 results
- **NFR-RB-5**: Confidence scores 0.05-0.95 (validated)
- **NFR-RB-6**: Database file size monitored (alert >100MB)

### Database Schema (Key Tables)

**`patterns`**: Core learning storage
```sql
CREATE TABLE patterns (
  id TEXT PRIMARY KEY,
  namespace TEXT NOT NULL DEFAULT 'global',
  agent_id TEXT,
  skill_id TEXT,
  content TEXT NOT NULL,
  category TEXT,
  tags TEXT, -- JSON array
  embedding BLOB NOT NULL, -- 1024-dim float32 (4096 bytes)
  confidence REAL NOT NULL DEFAULT 0.5,
  success_count INTEGER NOT NULL DEFAULT 0,
  failure_count INTEGER NOT NULL DEFAULT 0,
  total_usage INTEGER NOT NULL DEFAULT 0,
  context_type TEXT,
  metadata TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  last_used_at INTEGER
);
```

**`learning_sessions`**: Track agent learning sessions
```sql
CREATE TABLE learning_sessions (
  id TEXT PRIMARY KEY,
  agent_id TEXT,
  skill_id TEXT,
  session_type TEXT,
  patterns_before TEXT, -- JSON array of pattern IDs
  patterns_after TEXT,  -- JSON array of pattern IDs
  confidence_delta REAL,
  outcome TEXT,
  metrics TEXT, -- JSON object
  started_at INTEGER NOT NULL,
  ended_at INTEGER NOT NULL
);
```

**`retrieval_logs`**: Performance monitoring
```sql
CREATE TABLE retrieval_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT,
  query_embedding BLOB,
  results_count INTEGER,
  latency_ms REAL,
  relevance_scores TEXT, -- JSON array
  context_used TEXT, -- JSON object
  timestamp INTEGER NOT NULL
);
```

### Integration Points

**1. Pre-Task Hook** (Memory Injection):
```javascript
// In agent-executor.ts (before Claude API call)
async function injectReasoningBankMemories(task) {
  const memories = await reasoningBankService.retrieve({
    agentId: task.agent_id,
    skillId: task.skill_id,
    query: task.content,
    limit: 10,
    minConfidence: 0.7
  });

  const memoryContext = formatMemoriesForPrompt(memories);
  task.systemPrompt += `\n\n## Relevant Learnings:\n${memoryContext}`;
  return task;
}
```

**2. Post-Task Hook** (Memory Update):
```javascript
// In agent-executor.ts (after task completion)
async function updateReasoningBankMemories(task, result) {
  await reasoningBankService.recordLearning({
    agentId: task.agent_id,
    skillId: task.skill_id,
    content: result.content,
    outcome: result.success ? 'success' : 'failure',
    confidence: result.confidence,
    metadata: {
      taskType: task.type,
      duration: result.duration,
      tokensUsed: result.tokens
    }
  });
}
```

**3. Health Check Integration**:
```javascript
// In server.js health endpoint
app.get('/api/health', async (req, res) => {
  const health = {
    database: await checkDatabaseHealth(),
    reasoningBank: await reasoningBankService.healthCheck(), // NEW
    orchestrator: getOrchestratorStatus()
  };
  res.json(health);
});
```

### Environment Configuration

**`.env` additions**:
```bash
# ReasoningBank Memory System
REASONINGBANK_ENABLED=true
REASONINGBANK_DB_PATH=prod/.reasoningbank/memory.db
REASONINGBANK_BACKUP_DIR=prod/.reasoningbank/backups
REASONINGBANK_MAX_BACKUPS=30
REASONINGBANK_WAL_MODE=true
REASONINGBANK_MIN_CONFIDENCE=0.7
REASONINGBANK_MAX_RETRIEVAL=10
```

### Success Criteria
- ✅ Database file created at `prod/.reasoningbank/memory.db`
- ✅ All 8 tables created with correct schema
- ✅ WAL mode enabled (`PRAGMA journal_mode = WAL`)
- ✅ Foreign keys enabled (`PRAGMA foreign_keys = ON`)
- ✅ Health check returns `status: "healthy"`
- ✅ First memory pattern stored successfully
- ✅ Memory retrieval returns results in <3ms
- ✅ Semantic search finds relevant memories (>80% accuracy)
- ✅ Confidence scores update correctly on success/failure

---

# P - PSEUDOCODE

## 2.1 Algorithm: Phase 2 Removal

```
FUNCTION removePhase2Orchestrator():

  # Step 1: Verify Phase 1 orchestrator works standalone
  TEST_CASE "Phase 1 starts without Phase 2"
    START server
    ASSERT orchestrator_status == "running"
    ASSERT no_errors_in_logs()
    ASSERT no_postgresql_connection_attempts()

  # Step 2: Remove Phase 2 files
  DELETE_DIRECTORY "src/avi/"
  DELETE_DIRECTORY "src/adapters/"
  DELETE_FILE "src/types/avi.ts" IF EXISTS

  # Step 3: Remove Phase 2 imports from server.js
  OPEN "api-server/server.js"
  REMOVE_LINES 26-40  # loadNewOrchestrator import and function
  REPLACE_LINES 3713-3743 WITH:
    """
    import { startOrchestrator, stopOrchestrator } from './avi/orchestrator.js';

    if (process.env.AVI_ORCHESTRATOR_ENABLED !== 'false') {
      await startOrchestrator({
        maxWorkers: parseInt(process.env.AVI_MAX_WORKERS) || 5,
        maxContextSize: parseInt(process.env.AVI_MAX_CONTEXT) || 50000,
        pollInterval: parseInt(process.env.AVI_POLL_INTERVAL) || 5000,
        healthCheckInterval: parseInt(process.env.AVI_HEALTH_CHECK_INTERVAL) || 30000
      });
      console.log('✅ AVI Orchestrator started - monitoring for agent activity');
    }
    """

  # Step 4: Archive documentation
  MOVE "PHASE-2-*.md" TO "docs/archive/"

  # Step 5: Verify no references remain
  GREP_RESULT = SEARCH_CODEBASE("Phase 2", "TypeScript orchestrator")
  ASSERT GREP_RESULT.empty()

  # Step 6: Test server startup
  TEST_CASE "Server starts cleanly"
    START server
    ASSERT server_running(port=3001)
    ASSERT orchestrator_running()
    ASSERT logs_contain("✅ AVI Orchestrator started")
    ASSERT NOT logs_contain("Legacy")
    ASSERT NOT logs_contain("PostgreSQL")

  # Step 7: Test orchestrator functionality
  TEST_CASE "Orchestrator works correctly"
    VERIFY health_checks_running(interval=30s)
    VERIFY polling_active(interval=5s)
    VERIFY worker_spawning_capable()

  RETURN success
```

## 2.2 Algorithm: ReasoningBank Initialization

```
FUNCTION initializeReasoningBank():

  # Step 1: Create directory structure
  CREATE_DIRECTORY "prod/.reasoningbank"
  CREATE_DIRECTORY "prod/.reasoningbank/backups"

  # Step 2: Initialize database
  db = OPEN_SQLITE("prod/.reasoningbank/memory.db")

  # Step 3: Load and apply schema
  schema_sql = READ_FILE("api-server/db/reasoningbank-schema.sql")
  db.executescript(schema_sql)

  # Step 4: Enable optimizations
  db.execute("PRAGMA journal_mode = WAL")
  db.execute("PRAGMA synchronous = NORMAL")
  db.execute("PRAGMA foreign_keys = ON")
  db.execute("PRAGMA temp_store = MEMORY")
  db.execute("PRAGMA cache_size = -64000")  # 64MB cache

  # Step 5: Create indexes for performance
  db.execute("""
    CREATE INDEX IF NOT EXISTS idx_patterns_agent_id ON patterns(agent_id);
    CREATE INDEX IF NOT EXISTS idx_patterns_skill_id ON patterns(skill_id);
    CREATE INDEX IF NOT EXISTS idx_patterns_confidence ON patterns(confidence);
    CREATE INDEX IF NOT EXISTS idx_patterns_last_used ON patterns(last_used_at);
  """)

  # Step 6: Verify schema integrity
  tables = db.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
  ASSERT tables.contains("patterns")
  ASSERT tables.contains("learning_sessions")
  ASSERT tables.contains("retrieval_logs")
  ASSERT tables.contains("confidence_history")
  ASSERT tables.contains("pattern_links")
  ASSERT tables.contains("skill_patterns")
  ASSERT tables.contains("optimization_log")
  ASSERT tables.contains("memory_stats")

  # Step 7: Initialize service
  reasoningBankService = NEW ReasoningBankDatabaseService({
    dbPath: "prod/.reasoningbank/memory.db",
    schemaPath: "api-server/db/reasoningbank-schema.sql",
    backupDir: "prod/.reasoningbank/backups",
    maxBackups: 30,
    walMode: true
  })

  await reasoningBankService.initialize()

  # Step 8: Health check
  health = await reasoningBankService.healthCheck()
  ASSERT health.status == "healthy"
  ASSERT health.dbExists == true
  ASSERT health.schemaValid == true
  ASSERT health.foreignKeysEnabled == true

  RETURN reasoningBankService
```

## 2.3 Algorithm: Memory Injection (Pre-Task)

```
FUNCTION injectMemories(task):

  # Step 1: Generate query embedding
  query_embedding = await embeddings.generate(task.content)

  # Step 2: Retrieve relevant memories
  memories = await reasoningBankService.retrieve({
    agentId: task.agent_id,
    skillId: task.skill_id,
    namespace: task.namespace || 'global',
    queryEmbedding: query_embedding,
    limit: 10,
    minConfidence: 0.7,
    contextType: task.type
  })

  # Step 3: Log retrieval for monitoring
  await reasoningBankService.logRetrieval({
    sessionId: task.session_id,
    queryEmbedding: query_embedding,
    resultsCount: memories.length,
    latencyMs: retrievalTime,
    relevanceScores: memories.map(m => m.relevance),
    timestamp: Date.now()
  })

  # Step 4: Format memories for prompt
  IF memories.length > 0:
    memoryContext = """
    ## Relevant Learnings from Past Experience:

    You have encountered similar situations before. Here are the most relevant learnings:

    """

    FOR EACH memory IN memories:
      memoryContext += f"""
      ### {memory.category} (Confidence: {memory.confidence})
      - **Pattern**: {memory.content}
      - **Success Rate**: {memory.success_count}/{memory.total_usage}
      - **Last Used**: {formatDate(memory.last_used_at)}
      - **Tags**: {memory.tags}

      """

    # Step 5: Inject into system prompt
    task.systemPrompt += "\n\n" + memoryContext

  # Step 6: Track patterns used in this session
  task.patternsUsedBefore = memories.map(m => m.id)

  RETURN task
```

## 2.4 Algorithm: Memory Update (Post-Task)

```
FUNCTION updateMemories(task, result):

  # Step 1: Determine outcome
  outcome = result.success ? 'success' : 'failure'

  # Step 2: Calculate confidence delta
  confidenceBefore = task.patternsUsedBefore.avgConfidence()
  confidenceAfter = result.confidence
  confidenceDelta = confidenceAfter - confidenceBefore

  # Step 3: Update existing patterns used
  FOR EACH patternId IN task.patternsUsedBefore:
    await reasoningBankService.updatePattern({
      id: patternId,
      outcome: outcome,
      confidenceDelta: confidenceDelta,
      lastUsedAt: Date.now()
    })

  # Step 4: Extract new learnings from result
  IF result.success AND result.containsLearning():
    newPatterns = extractPatterns(result.content)

    FOR EACH pattern IN newPatterns:
      embedding = await embeddings.generate(pattern.content)

      await reasoningBankService.storePattern({
        namespace: task.namespace || 'global',
        agentId: task.agent_id,
        skillId: task.skill_id,
        content: pattern.content,
        category: pattern.category,
        tags: pattern.tags,
        embedding: embedding,
        confidence: 0.5,  # Start neutral
        contextType: task.type,
        metadata: {
          taskId: task.id,
          extractedAt: Date.now()
        }
      })

  # Step 5: Record learning session
  await reasoningBankService.recordSession({
    agentId: task.agent_id,
    skillId: task.skill_id,
    sessionType: task.type,
    patternsBefore: task.patternsUsedBefore,
    patternsAfter: newPatterns.map(p => p.id),
    confidenceDelta: confidenceDelta,
    outcome: outcome,
    metrics: {
      duration: result.duration,
      tokensUsed: result.tokens,
      successRate: calculateSuccessRate(task.agent_id)
    },
    startedAt: task.startedAt,
    endedAt: Date.now()
  })

  # Step 6: Optimize database if needed
  stats = await reasoningBankService.getStats()
  IF stats.totalPatterns > 10000:
    await reasoningBankService.optimize({
      pruneConfidenceBelow: 0.1,
      pruneUnusedDays: 90
    })

  RETURN success
```

---

# A - ARCHITECTURE

## 3.1 System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         BEFORE (Current)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  server.js                                                        │
│  ┌────────────────────────────────────────────────────────┐     │
│  │ Try Phase 2 (TypeScript)                               │     │
│  │   ├── Load orchestrator.ts                             │     │
│  │   ├── Connect to PostgreSQL (FAILS ❌)                 │     │
│  │   └── Error: ECONNREFUSED ::1:5432                     │     │
│  │                                                          │     │
│  │ Catch Error → Fallback to Phase 1 (JavaScript)         │     │
│  │   └── orchestrator.js (SQLite stubs) ✅                │     │
│  └────────────────────────────────────────────────────────┘     │
│                                                                   │
│  Problems:                                                        │
│  • 500ms wasted on PostgreSQL connection attempt                 │
│  • Confusing "Legacy" warning in logs                            │
│  • 2,500 lines of unused code                                    │
│  • No ReasoningBank memory system                                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                          AFTER (Target)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  server.js                                                        │
│  ┌────────────────────────────────────────────────────────┐     │
│  │ Direct Start: orchestrator.js ✅                       │     │
│  │   └── Phase 1 (JavaScript, SQLite)                     │     │
│  └────────────────────────────────────────────────────────┘     │
│                                                                   │
│  ┌────────────────────────────────────────────────────────┐     │
│  │ ReasoningBank Service ✅                               │     │
│  │   ├── Database: prod/.reasoningbank/memory.db          │     │
│  │   ├── WAL mode enabled                                 │     │
│  │   └── 8 tables (patterns, sessions, logs, etc.)        │     │
│  └────────────────────────────────────────────────────────┘     │
│                                                                   │
│  Benefits:                                                        │
│  • Faster startup (no PostgreSQL retry)                          │
│  • Clean logs (no "Legacy" warning)                              │
│  • 2,500 fewer lines of code                                     │
│  • 20-30% agent performance improvement                          │
└─────────────────────────────────────────────────────────────────┘
```

## 3.2 ReasoningBank Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Agent Task Execution Flow                     │
└─────────────────────────────────────────────────────────────────┘

1. TASK RECEIVED
   ┌──────────────┐
   │ Work Queue   │
   │ ticket_id: 1 │
   │ agent: AVI   │
   │ content: ... │
   └──────┬───────┘
          │
          ▼
2. PRE-TASK HOOK: Memory Injection
   ┌────────────────────────────────────┐
   │ ReasoningBank.retrieve()           │
   │  ├─ Generate query embedding       │
   │  ├─ k-NN search in patterns table  │
   │  ├─ Filter by confidence > 0.7     │
   │  └─ Return top 10 memories         │
   └────────────┬───────────────────────┘
                │
                ▼
   ┌────────────────────────────────────┐
   │ Format memories for prompt         │
   │  • Category & confidence           │
   │  • Success rate                    │
   │  • Tags & context                  │
   └────────────┬───────────────────────┘
                │
                ▼
3. TASK EXECUTION
   ┌────────────────────────────────────┐
   │ Agent Executor                     │
   │  System Prompt:                    │
   │   - Original instructions          │
   │   - ** Relevant Learnings **       │
   │   - Memory pattern 1               │
   │   - Memory pattern 2               │
   │   - ...                            │
   └────────────┬───────────────────────┘
                │
                ▼
   ┌────────────────────────────────────┐
   │ Claude API Call                    │
   │  (with injected memories)          │
   └────────────┬───────────────────────┘
                │
                ▼
4. POST-TASK HOOK: Memory Update
   ┌────────────────────────────────────┐
   │ ReasoningBank.updateMemories()     │
   │  ├─ Update confidence scores       │
   │  ├─ Increment success/failure      │
   │  ├─ Extract new learnings          │
   │  └─ Store new patterns             │
   └────────────┬───────────────────────┘
                │
                ▼
5. LEARNING SESSION RECORDED
   ┌────────────────────────────────────┐
   │ learning_sessions table            │
   │  - Patterns before/after           │
   │  - Confidence delta                │
   │  - Outcome metrics                 │
   └────────────────────────────────────┘
```

## 3.3 Database Schema Visualization

```
┌─────────────────────────────────────────────────────────────────┐
│                  ReasoningBank Schema (SQLite)                   │
└─────────────────────────────────────────────────────────────────┘

patterns (Core learning storage)
┌──────────────┬─────────────┬──────────────────────────────┐
│ id (PK)      │ TEXT        │ UUID                         │
│ namespace    │ TEXT        │ 'global', 'user:123', etc.   │
│ agent_id     │ TEXT        │ 'avi', 'ada', 'scout'        │
│ skill_id     │ TEXT        │ 'search', 'analyze', etc.    │
│ content      │ TEXT        │ Natural language pattern     │
│ category     │ TEXT        │ 'bug_fix', 'optimization'    │
│ tags         │ TEXT (JSON) │ ['python', 'async']          │
│ embedding    │ BLOB        │ 4096 bytes (1024 floats)     │
│ confidence   │ REAL        │ 0.05 - 0.95                  │
│ success_cnt  │ INTEGER     │ Times pattern succeeded      │
│ failure_cnt  │ INTEGER     │ Times pattern failed         │
│ total_usage  │ INTEGER     │ success + failure            │
│ created_at   │ INTEGER     │ Unix timestamp               │
│ updated_at   │ INTEGER     │ Unix timestamp               │
│ last_used_at │ INTEGER     │ Unix timestamp               │
└──────────────┴─────────────┴──────────────────────────────┘
         │
         │ Foreign Keys
         ▼
learning_sessions (Track learning events)
┌──────────────────┬─────────────┬──────────────────────┐
│ id (PK)          │ TEXT        │ UUID                 │
│ agent_id         │ TEXT        │ FK → patterns        │
│ skill_id         │ TEXT        │ FK → patterns        │
│ patterns_before  │ TEXT (JSON) │ [pattern_id, ...]    │
│ patterns_after   │ TEXT (JSON) │ [pattern_id, ...]    │
│ confidence_delta │ REAL        │ +/- change           │
│ outcome          │ TEXT        │ 'success'/'failure'  │
│ metrics          │ TEXT (JSON) │ {duration, tokens}   │
│ started_at       │ INTEGER     │ Unix timestamp       │
│ ended_at         │ INTEGER     │ Unix timestamp       │
└──────────────────┴─────────────┴──────────────────────┘

retrieval_logs (Performance monitoring)
┌──────────────────┬─────────────┬──────────────────────┐
│ id (PK)          │ INTEGER AI  │ Auto-increment       │
│ session_id       │ TEXT        │ FK → sessions        │
│ query_embedding  │ BLOB        │ 4096 bytes           │
│ results_count    │ INTEGER     │ Number of results    │
│ latency_ms       │ REAL        │ Query performance    │
│ relevance_scores │ TEXT (JSON) │ [0.95, 0.87, ...]    │
│ timestamp        │ INTEGER     │ Unix timestamp       │
└──────────────────┴─────────────┴──────────────────────┘

confidence_history (Track learning curve)
pattern_links (Pattern relationships)
skill_patterns (Skill-specific patterns)
optimization_log (Database maintenance)
memory_stats (Aggregated metrics)
```

## 3.4 Component Interaction

```
┌─────────────────────────────────────────────────────────────────┐
│                        Component Diagram                         │
└─────────────────────────────────────────────────────────────────┘

Frontend (React)
┌────────────────────┐
│ UI Components      │
│  - Agent Feed      │
│  - Create Post     │
│  - AVI DM          │
└─────────┬──────────┘
          │ HTTP/WebSocket
          ▼
Backend (Express)
┌─────────────────────────────────────────────────────┐
│ server.js                                           │
│  ├─ REST API (/api/*)                               │
│  ├─ WebSocket (real-time updates)                   │
│  └─ Health checks                                   │
└────┬──────────────┬─────────────────┬───────────────┘
     │              │                 │
     ▼              ▼                 ▼
┌──────────┐  ┌─────────────┐  ┌──────────────────┐
│ SQLite   │  │ Orchestrator│  │ ReasoningBank    │
│ Main DB  │  │  (Phase 1)  │  │ Memory Service   │
│          │  │             │  │                  │
│ • posts  │  │ • Poll      │  │ • patterns       │
│ • agents │  │ • Spawn     │  │ • sessions       │
│ • skills │  │ • Health    │  │ • retrieval_logs │
└──────────┘  └──────┬──────┘  └────────┬─────────┘
                     │                  │
                     ▼                  │
              ┌─────────────┐           │
              │ Work Queue  │           │
              │  (SQLite)   │           │
              │             │           │
              │ • tickets   │           │
              │ • status    │           │
              └──────┬──────┘           │
                     │                  │
                     ▼                  ▼
              ┌──────────────────────────────┐
              │ Agent Executor               │
              │  ├─ Pre-task: inject memory  │◄─┘
              │  ├─ Execute with Claude API  │
              │  └─ Post-task: update memory │
              └──────────────────────────────┘
```

---

# R - REFINEMENT

## 4.1 TDD Test Plan

### Unit Tests: Phase 2 Removal

**Test Suite**: `tests/unit/orchestrator-phase1.test.js`

```javascript
describe('Phase 1 Orchestrator (Direct Start)', () => {

  test('UNIT-P2-001: Orchestrator imports correctly', () => {
    const { startOrchestrator, stopOrchestrator } = require('./avi/orchestrator.js');
    expect(startOrchestrator).toBeDefined();
    expect(stopOrchestrator).toBeDefined();
  });

  test('UNIT-P2-002: Orchestrator starts with default config', async () => {
    const orchestrator = await startOrchestrator({
      maxWorkers: 5,
      maxContextSize: 50000,
      pollInterval: 5000,
      healthCheckInterval: 30000
    });
    expect(orchestrator.state.status).toBe('running');
  });

  test('UNIT-P2-003: No PostgreSQL connection attempts', async () => {
    const logSpy = jest.spyOn(console, 'error');
    await startOrchestrator({});
    const postgresErrors = logSpy.mock.calls.filter(call =>
      call[0].includes('PostgreSQL') || call[0].includes('ECONNREFUSED')
    );
    expect(postgresErrors).toHaveLength(0);
  });

  test('UNIT-P2-004: Health checks run correctly', async () => {
    const orchestrator = await startOrchestrator({ healthCheckInterval: 1000 });
    await new Promise(resolve => setTimeout(resolve, 1500));
    expect(orchestrator.healthCheckCount).toBeGreaterThan(0);
  });

  test('UNIT-P2-005: Work queue polling active', async () => {
    const orchestrator = await startOrchestrator({ pollInterval: 1000 });
    await new Promise(resolve => setTimeout(resolve, 1500));
    expect(orchestrator.pollCount).toBeGreaterThan(0);
  });
});
```

### Unit Tests: ReasoningBank Initialization

**Test Suite**: `tests/unit/reasoningbank-init.test.js`

```javascript
describe('ReasoningBank Database Service', () => {

  test('UNIT-RB-001: Database directory created', async () => {
    await initializeReasoningBank();
    expect(fs.existsSync('prod/.reasoningbank')).toBe(true);
    expect(fs.existsSync('prod/.reasoningbank/backups')).toBe(true);
  });

  test('UNIT-RB-002: Database file created', async () => {
    await initializeReasoningBank();
    expect(fs.existsSync('prod/.reasoningbank/memory.db')).toBe(true);
  });

  test('UNIT-RB-003: Schema tables created', async () => {
    const service = await initializeReasoningBank();
    const tables = await service.getTables();
    expect(tables).toContain('patterns');
    expect(tables).toContain('learning_sessions');
    expect(tables).toContain('retrieval_logs');
    expect(tables).toContain('confidence_history');
    expect(tables).toContain('pattern_links');
    expect(tables).toContain('skill_patterns');
    expect(tables).toContain('optimization_log');
    expect(tables).toContain('memory_stats');
  });

  test('UNIT-RB-004: WAL mode enabled', async () => {
    const service = await initializeReasoningBank();
    const walMode = await service.db.pragma('journal_mode');
    expect(walMode).toBe('wal');
  });

  test('UNIT-RB-005: Foreign keys enabled', async () => {
    const service = await initializeReasoningBank();
    const fkEnabled = await service.db.pragma('foreign_keys');
    expect(fkEnabled).toBe(1);
  });

  test('UNIT-RB-006: Health check passes', async () => {
    const service = await initializeReasoningBank();
    const health = await service.healthCheck();
    expect(health.status).toBe('healthy');
    expect(health.dbExists).toBe(true);
    expect(health.schemaValid).toBe(true);
    expect(health.foreignKeysEnabled).toBe(true);
  });

  test('UNIT-RB-007: Stats endpoint works', async () => {
    const service = await initializeReasoningBank();
    const stats = await service.getStats();
    expect(stats.totalPatterns).toBe(0);
    expect(stats.totalSessions).toBe(0);
    expect(stats.avgConfidence).toBe(null);
  });
});
```

### Unit Tests: Memory Storage & Retrieval

**Test Suite**: `tests/unit/reasoningbank-memory.test.js`

```javascript
describe('ReasoningBank Memory Operations', () => {

  test('UNIT-MEM-001: Store pattern successfully', async () => {
    const service = await initializeReasoningBank();
    const embedding = new Float32Array(1024).fill(0.5);

    const pattern = await service.storePattern({
      namespace: 'global',
      agentId: 'avi',
      skillId: 'test',
      content: 'When debugging async issues, check event loop blocking',
      category: 'debugging',
      tags: ['async', 'performance'],
      embedding: Buffer.from(embedding.buffer),
      confidence: 0.5
    });

    expect(pattern.id).toBeDefined();
    expect(pattern.confidence).toBe(0.5);
  });

  test('UNIT-MEM-002: Retrieve patterns by embedding', async () => {
    const service = await initializeReasoningBank();

    // Store 5 patterns
    for (let i = 0; i < 5; i++) {
      await service.storePattern({ /* ... */ });
    }

    // Retrieve top 3
    const queryEmbedding = new Float32Array(1024).fill(0.5);
    const results = await service.retrieve({
      queryEmbedding: Buffer.from(queryEmbedding.buffer),
      limit: 3,
      minConfidence: 0.4
    });

    expect(results).toHaveLength(3);
    expect(results[0].relevance).toBeGreaterThan(0);
  });

  test('UNIT-MEM-003: Update pattern confidence on success', async () => {
    const service = await initializeReasoningBank();
    const pattern = await service.storePattern({ /* ... */ });

    await service.updatePattern({
      id: pattern.id,
      outcome: 'success',
      confidenceDelta: 0.1
    });

    const updated = await service.getPattern(pattern.id);
    expect(updated.confidence).toBeCloseTo(0.6); // 0.5 + 0.1
    expect(updated.success_count).toBe(1);
    expect(updated.total_usage).toBe(1);
  });

  test('UNIT-MEM-004: Update pattern confidence on failure', async () => {
    const service = await initializeReasoningBank();
    const pattern = await service.storePattern({ /* ... */ });

    await service.updatePattern({
      id: pattern.id,
      outcome: 'failure',
      confidenceDelta: -0.1
    });

    const updated = await service.getPattern(pattern.id);
    expect(updated.confidence).toBeCloseTo(0.4); // 0.5 - 0.1
    expect(updated.failure_count).toBe(1);
    expect(updated.total_usage).toBe(1);
  });

  test('UNIT-MEM-005: Confidence stays within bounds [0.05, 0.95]', async () => {
    const service = await initializeReasoningBank();
    const pattern = await service.storePattern({ confidence: 0.9 });

    // Try to push above 0.95
    await service.updatePattern({ id: pattern.id, outcome: 'success', confidenceDelta: 0.2 });
    const updated = await service.getPattern(pattern.id);
    expect(updated.confidence).toBeLessThanOrEqual(0.95);
  });

  test('UNIT-MEM-006: Query latency <3ms (p95)', async () => {
    const service = await initializeReasoningBank();

    // Store 100 patterns
    for (let i = 0; i < 100; i++) {
      await service.storePattern({ /* ... */ });
    }

    // Measure 100 queries
    const latencies = [];
    for (let i = 0; i < 100; i++) {
      const start = performance.now();
      await service.retrieve({ /* ... */ });
      latencies.push(performance.now() - start);
    }

    latencies.sort((a, b) => a - b);
    const p95 = latencies[Math.floor(latencies.length * 0.95)];
    expect(p95).toBeLessThan(3);
  });
});
```

### Integration Tests

**Test Suite**: `tests/integration/reasoningbank-agent.test.js`

```javascript
describe('ReasoningBank Integration with Agent Execution', () => {

  test('INT-001: Memory injected before task execution', async () => {
    // Store a relevant pattern
    await reasoningBank.storePattern({
      agentId: 'avi',
      content: 'For search queries, use semantic similarity first',
      category: 'search_optimization'
    });

    // Execute task
    const task = {
      agent_id: 'avi',
      skill_id: 'search',
      content: 'Find posts about AI agents'
    };

    const enrichedTask = await injectMemories(task);

    expect(enrichedTask.systemPrompt).toContain('Relevant Learnings');
    expect(enrichedTask.systemPrompt).toContain('semantic similarity');
    expect(enrichedTask.patternsUsedBefore).toHaveLength(1);
  });

  test('INT-002: Memory updated after successful task', async () => {
    const pattern = await reasoningBank.storePattern({ /* ... */ });

    const task = {
      agent_id: 'avi',
      patternsUsedBefore: [pattern.id]
    };

    const result = {
      success: true,
      confidence: 0.8
    };

    await updateMemories(task, result);

    const updated = await reasoningBank.getPattern(pattern.id);
    expect(updated.success_count).toBe(1);
    expect(updated.confidence).toBeGreaterThan(0.5);
  });

  test('INT-003: Learning session recorded', async () => {
    const task = { /* ... */ };
    const result = { success: true };

    await updateMemories(task, result);

    const sessions = await reasoningBank.getSessions({ agentId: 'avi', limit: 1 });
    expect(sessions).toHaveLength(1);
    expect(sessions[0].outcome).toBe('success');
  });

  test('INT-004: End-to-end task with memory loop', async () => {
    // 1. Execute task without memory
    const task1 = await executeTask({ content: 'Debug async issue' });
    expect(task1.patternsUsedBefore).toHaveLength(0);

    // 2. Store learning from task 1
    await reasoningBank.storePattern({
      content: 'Check event loop blocking for async issues',
      category: 'debugging'
    });

    // 3. Execute similar task - should retrieve memory
    const task2 = await executeTask({ content: 'Debug async performance' });
    expect(task2.patternsUsedBefore).toHaveLength(1);
    expect(task2.systemPrompt).toContain('event loop blocking');
  });
});
```

### E2E Tests with Playwright

**Test Suite**: `tests/e2e/reasoningbank-ui.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('ReasoningBank E2E UI Validation', () => {

  test('E2E-001: Health check shows ReasoningBank healthy', async ({ page }) => {
    await page.goto('http://localhost:3001/api/health');

    const health = await page.textContent('body');
    const healthJson = JSON.parse(health);

    expect(healthJson.reasoningBank.status).toBe('healthy');

    // Screenshot for validation
    await page.screenshot({ path: 'tests/screenshots/health-check-reasoningbank.png' });
  });

  test('E2E-002: Agent learns from previous tasks', async ({ page }) => {
    await page.goto('http://localhost:5173');

    // 1. Create first task
    await page.click('[data-testid="create-post"]');
    await page.fill('[data-testid="post-content"]', 'How do I optimize search?');
    await page.click('[data-testid="submit-post"]');

    await page.waitForTimeout(2000);

    // 2. Verify memory stored
    const healthResponse = await page.goto('http://localhost:3001/api/reasoningbank/stats');
    const stats = await healthResponse.json();
    expect(stats.totalPatterns).toBeGreaterThan(0);

    // 3. Create similar task - should use memory
    await page.goto('http://localhost:5173');
    await page.click('[data-testid="create-post"]');
    await page.fill('[data-testid="post-content"]', 'Best practices for search queries?');
    await page.click('[data-testid="submit-post"]');

    // 4. Screenshot showing learning
    await page.screenshot({ path: 'tests/screenshots/agent-learning-memory.png' });
  });

  test('E2E-003: No "Legacy" warning in UI', async ({ page }) => {
    await page.goto('http://localhost:5173');

    // Open browser console
    const consoleLogs = [];
    page.on('console', msg => consoleLogs.push(msg.text()));

    await page.waitForTimeout(5000);

    // Verify no "Legacy" or "PostgreSQL" warnings
    const legacyWarnings = consoleLogs.filter(log =>
      log.includes('Legacy') || log.includes('PostgreSQL')
    );

    expect(legacyWarnings).toHaveLength(0);

    await page.screenshot({ path: 'tests/screenshots/no-legacy-warnings.png' });
  });

  test('E2E-004: Orchestrator status displays correctly', async ({ page }) => {
    await page.goto('http://localhost:3001/api/avi/status');

    const status = await page.textContent('body');
    const statusJson = JSON.parse(status);

    expect(statusJson.status).toBe('running');
    expect(statusJson.phase).not.toContain('Legacy');

    await page.screenshot({ path: 'tests/screenshots/orchestrator-status.png' });
  });
});
```

### Regression Test Matrix

```
┌────────────────────────────────────────────────────────────────┐
│                    Regression Test Coverage                     │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Feature                        │ Test ID    │ Status  │ ✓/✗    │
│────────────────────────────────┼────────────┼─────────┼────────│
│ AVI Orchestrator Startup       │ REG-001    │ Pending │        │
│ Health Check Interval (30s)    │ REG-002    │ Pending │        │
│ Work Queue Polling (5s)        │ REG-003    │ Pending │        │
│ Worker Spawning (max 5)        │ REG-004    │ Pending │        │
│ Context Limit (50K tokens)     │ REG-005    │ Pending │        │
│ Search Endpoint (/api/search)  │ REG-006    │ Pending │        │
│ Post Creation                  │ REG-007    │ Pending │        │
│ Ghost Post Fix (no DM posts)   │ REG-008    │ Pending │        │
│ Skills System                  │ REG-009    │ Pending │        │
│ Agent Protection               │ REG-010    │ Pending │        │
│ Autonomous Learning            │ REG-011    │ Pending │        │
│ WebSocket Connection           │ REG-012    │ Pending │        │
│ API Connection (no disconnect) │ REG-013    │ Pending │        │
│ Link Preview                   │ REG-014    │ Pending │        │
│ Filter Stats                   │ REG-015    │ Pending │        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 4.2 Concurrent Agent Execution Plan

Using Claude-Flow Swarm for parallel task execution:

```yaml
agents:
  - name: phase2-removal-agent
    role: Remove Phase 2 TypeScript orchestrator
    tasks:
      - Delete src/avi/ directory
      - Delete src/adapters/ directory
      - Remove Phase 2 imports from server.js
      - Archive documentation
      - Run TDD tests
    parallel: true
    timeout: 10m

  - name: reasoningbank-init-agent
    role: Initialize ReasoningBank database
    tasks:
      - Create directory structure
      - Initialize SQLite database
      - Apply schema
      - Enable WAL mode
      - Run health checks
    parallel: true
    timeout: 10m

  - name: memory-integration-agent
    role: Integrate memory hooks
    depends_on: [reasoningbank-init-agent]
    tasks:
      - Add pre-task hook (inject memories)
      - Add post-task hook (update memories)
      - Add environment variables
      - Test memory injection
    parallel: false
    timeout: 15m

  - name: testing-agent
    role: Run full test suite
    depends_on: [phase2-removal-agent, memory-integration-agent]
    tasks:
      - Unit tests (Phase 2 removal)
      - Unit tests (ReasoningBank)
      - Integration tests
      - E2E tests (Playwright)
      - Regression tests
    parallel: false
    timeout: 30m

  - name: validation-agent
    role: Production validation
    depends_on: [testing-agent]
    tasks:
      - Execute real agent task with memory
      - Measure performance improvement
      - Verify database persistence
      - Capture screenshots
      - Generate validation report
    parallel: false
    timeout: 20m
```

**Execution Timeline**:
```
0min  ├─ phase2-removal-agent (parallel)
      ├─ reasoningbank-init-agent (parallel)

10min ├─ memory-integration-agent (sequential)

25min ├─ testing-agent (sequential)

55min ├─ validation-agent (sequential)

75min └─ Complete ✅
```

---

# C - COMPLETION

## 5.1 Implementation Checklist

### Phase 2 Removal
- [ ] **PR2-001**: Delete `/workspaces/agent-feed/src/avi/` directory
- [ ] **PR2-002**: Delete `/workspaces/agent-feed/src/adapters/` directory
- [ ] **PR2-003**: Delete `/workspaces/agent-feed/src/types/avi.ts` (if exists)
- [ ] **PR2-004**: Remove `loadNewOrchestrator` function from `server.js`
- [ ] **PR2-005**: Replace Phase 2 fallback logic in `server.js:3713-3743`
- [ ] **PR2-006**: Archive `PHASE-2-*.md` files to `docs/archive/`
- [ ] **PR2-007**: Verify no references to "Phase 2" in codebase
- [ ] **PR2-008**: Verify no references to "TypeScript orchestrator" in codebase
- [ ] **PR2-009**: Test server startup (no PostgreSQL errors)
- [ ] **PR2-010**: Test orchestrator functionality (polling, health checks)

### ReasoningBank Enablement
- [ ] **RB-001**: Create `prod/.reasoningbank/` directory
- [ ] **RB-002**: Create `prod/.reasoningbank/backups/` directory
- [ ] **RB-003**: Initialize SQLite database at `prod/.reasoningbank/memory.db`
- [ ] **RB-004**: Apply schema from `api-server/db/reasoningbank-schema.sql`
- [ ] **RB-005**: Enable WAL mode (`PRAGMA journal_mode = WAL`)
- [ ] **RB-006**: Enable foreign keys (`PRAGMA foreign_keys = ON`)
- [ ] **RB-007**: Create performance indexes (agent_id, skill_id, confidence)
- [ ] **RB-008**: Verify all 8 tables created
- [ ] **RB-009**: Add environment variables to `.env`
- [ ] **RB-010**: Implement pre-task hook (memory injection)
- [ ] **RB-011**: Implement post-task hook (memory update)
- [ ] **RB-012**: Add health check endpoint `/api/reasoningbank/health`
- [ ] **RB-013**: Add stats endpoint `/api/reasoningbank/stats`
- [ ] **RB-014**: Test memory storage (store pattern)
- [ ] **RB-015**: Test memory retrieval (k-NN search)
- [ ] **RB-016**: Test memory update (confidence adjustment)
- [ ] **RB-017**: Test learning session recording

### Testing & Validation
- [ ] **TEST-001**: Run unit tests for Phase 2 removal (10 tests)
- [ ] **TEST-002**: Run unit tests for ReasoningBank init (7 tests)
- [ ] **TEST-003**: Run unit tests for memory operations (6 tests)
- [ ] **TEST-004**: Run integration tests (4 tests)
- [ ] **TEST-005**: Run E2E tests with Playwright (4 tests)
- [ ] **TEST-006**: Run regression tests (15 tests)
- [ ] **TEST-007**: Verify query latency <3ms (p95)
- [ ] **TEST-008**: Verify semantic accuracy >85%
- [ ] **TEST-009**: Verify confidence bounds [0.05, 0.95]
- [ ] **TEST-010**: Verify database file size <50MB

### Production Validation (100% Real)
- [ ] **PROD-001**: Execute real agent task without memory (baseline)
- [ ] **PROD-002**: Store learning from baseline task
- [ ] **PROD-003**: Execute similar task with memory injection
- [ ] **PROD-004**: Verify memory retrieved and injected into prompt
- [ ] **PROD-005**: Verify confidence score updated correctly
- [ ] **PROD-006**: Verify learning session recorded
- [ ] **PROD-007**: Measure performance improvement (target: 20-30%)
- [ ] **PROD-008**: Capture Playwright screenshots (4 screenshots)
- [ ] **PROD-009**: Verify database persistence (data survives restart)
- [ ] **PROD-010**: Verify no errors in production logs

### Documentation
- [ ] **DOC-001**: Update `README.md` with ReasoningBank section
- [ ] **DOC-002**: Create `REASONINGBANK-GUIDE.md` user guide
- [ ] **DOC-003**: Update `ARCHITECTURE.md` with memory flow diagram
- [ ] **DOC-004**: Archive Phase 2 documentation
- [ ] **DOC-005**: Update `.env.example` with ReasoningBank variables

## 5.2 Validation Criteria

### Success Metrics
```
✅ PASS Criteria:

Phase 2 Removal:
  • 0 PostgreSQL connection attempts
  • 0 "Legacy" warnings in logs
  • Server startup <3 seconds
  • Orchestrator status: "running"
  • All health checks pass

ReasoningBank:
  • Database created: prod/.reasoningbank/memory.db
  • Schema valid: 8 tables present
  • WAL mode: enabled
  • Foreign keys: enabled
  • Health check: "healthy"
  • First pattern stored: success
  • First retrieval: <3ms
  • Semantic accuracy: >85%

Testing:
  • Unit tests: 23/23 passing
  • Integration tests: 4/4 passing
  • E2E tests: 4/4 passing
  • Regression tests: 15/15 passing
  • Total: 46/46 tests passing ✅

Production:
  • Memory injection: verified ✅
  • Memory update: verified ✅
  • Performance improvement: >20% ✅
  • Database persistence: verified ✅
  • No errors in logs: verified ✅
```

### Failure Criteria (Rollback Triggers)
```
❌ FAIL Criteria (rollback required):

  • Any test failures (< 100% pass rate)
  • PostgreSQL errors still present
  • Database corruption detected
  • Query latency >10ms (p95)
  • Semantic accuracy <80%
  • Production errors detected
  • Performance degradation
```

## 5.3 Production Readiness Checklist

- [ ] **READY-001**: All tests passing (46/46)
- [ ] **READY-002**: No errors in development logs
- [ ] **READY-003**: No errors in production logs
- [ ] **READY-004**: Database backups configured
- [ ] **READY-005**: Monitoring alerts configured
- [ ] **READY-006**: Rollback plan documented
- [ ] **READY-007**: User documentation complete
- [ ] **READY-008**: Performance benchmarks met
- [ ] **READY-009**: Security review complete
- [ ] **READY-010**: Stakeholder approval received

## 5.4 Rollback Plan

### Immediate Rollback (if needed)
```bash
# 1. Stop server
pkill -f "node.*server.js"

# 2. Revert git changes
git reset --hard HEAD~1

# 3. Disable ReasoningBank
echo "REASONINGBANK_ENABLED=false" >> .env

# 4. Restart server
cd /workspaces/agent-feed/api-server
npm run dev &

# 5. Verify rollback
curl http://localhost:3001/api/health
# Should show: reasoningBank: { status: "disabled" }
```

### Data Backup
```bash
# Backup ReasoningBank database before changes
cp prod/.reasoningbank/memory.db \
   prod/.reasoningbank/backups/memory-$(date +%Y%m%d-%H%M%S).db

# Restore if needed
cp prod/.reasoningbank/backups/memory-20251023-*.db \
   prod/.reasoningbank/memory.db
```

---

## 6. Execution Summary

**Total Implementation Time**: ~75 minutes (with concurrent agents)

**Files Modified**: 3
- `api-server/server.js` (remove Phase 2 fallback)
- `.env` (add ReasoningBank config)
- `api-server/agent-executor.ts` (add memory hooks)

**Files Deleted**: 15+
- `src/avi/` (5 files)
- `src/adapters/` (5 files)
- `src/types/avi.ts` (1 file)
- `PHASE-2-*.md` (4 files)

**Files Created**: 2
- `prod/.reasoningbank/memory.db` (database)
- `REASONINGBANK-GUIDE.md` (documentation)

**Tests Created**: 46
- Unit: 23 tests
- Integration: 4 tests
- E2E: 4 tests
- Regression: 15 tests

**Expected Benefits**:
- 📉 -2,500 lines of dead code
- ⚡ -500ms server startup time
- 🧠 +20-30% agent performance
- 🗄️ Persistent learning memory
- ✅ 100% test coverage

---

**Next Step**: Execute this specification using Claude-Flow Swarm with concurrent agents.

**Validation**: All changes must be verified 100% real (no mocks/simulations) with Playwright screenshots and production testing.
