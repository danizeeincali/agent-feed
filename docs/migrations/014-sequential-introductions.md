# Migration 014: Sequential Agent Introduction System

**Status**: ✅ Completed
**Date**: 2025-11-06
**Database**: SQLite
**Migration File**: `/workspaces/agent-feed/api-server/db/migrations/014-sequential-introductions.sql`

## Overview

This migration creates the database schema for a sequential agent introduction system that progressively introduces new AI agents to users based on their engagement level. This prevents overwhelming new users while maintaining engagement through gradual feature discovery.

## Architecture

### Database Tables

#### 1. `user_engagement`
**Purpose**: Track user activity metrics and calculate composite engagement scores to determine when users are ready for new agent introductions.

**Schema**:
```sql
CREATE TABLE user_engagement (
  user_id TEXT PRIMARY KEY,

  -- Activity Counters
  total_interactions INTEGER NOT NULL DEFAULT 0,
  posts_created INTEGER NOT NULL DEFAULT 0,
  comments_created INTEGER NOT NULL DEFAULT 0,
  likes_given INTEGER NOT NULL DEFAULT 0,
  posts_read INTEGER NOT NULL DEFAULT 0,

  -- Composite Engagement Score
  engagement_score INTEGER NOT NULL DEFAULT 0,

  -- Last Activity Timestamp
  last_activity_at INTEGER,

  -- Audit Timestamps
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
) STRICT;
```

**Indexes**:
- `idx_user_engagement_score`: Fast lookups by engagement score (DESC)
- `idx_user_engagement_user`: Direct user lookups
- `idx_user_engagement_activity`: Track inactive users (WHERE last_activity_at IS NOT NULL)

**Triggers**:
- `update_user_engagement_timestamp`: Auto-updates `updated_at` on every UPDATE

#### 2. `introduction_queue`
**Purpose**: Define the sequential order in which agents are introduced to users, with engagement score thresholds for unlocking.

**Schema**:
```sql
CREATE TABLE introduction_queue (
  id TEXT PRIMARY KEY,

  -- References
  user_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,

  -- Queue Configuration
  priority INTEGER NOT NULL,           -- Lower = introduced first
  unlock_threshold INTEGER NOT NULL,   -- Engagement score required

  -- Introduction Status
  introduced INTEGER NOT NULL DEFAULT 0 CHECK(introduced IN (0, 1)),
  introduced_at INTEGER,
  intro_post_id TEXT,
  intro_method TEXT CHECK(intro_method IN ('post', 'comment', 'workflow')),

  -- Timestamps
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),

  -- Constraints
  UNIQUE(user_id, agent_id)
) STRICT;
```

**Indexes**:
- `idx_intro_queue_priority`: Find next agent to introduce (WHERE introduced = 0)
- `idx_intro_queue_threshold`: Check which agents are ready (WHERE introduced = 0)
- `idx_intro_queue_agent`: Agent-level analytics
- `idx_intro_queue_introduced`: Track introduction history (WHERE introduced = 1)

#### 3. `agent_workflows`
**Purpose**: Track multi-step agent workflows such as capability showcases, interactive tutorials, and onboarding sequences.

**Schema**:
```sql
CREATE TABLE agent_workflows (
  id TEXT PRIMARY KEY,

  -- References
  user_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,

  -- Workflow Type
  workflow_type TEXT NOT NULL CHECK(workflow_type IN (
    'showcase',    -- Demonstrate capabilities
    'tutorial',    -- Teach user a feature
    'onboarding',  -- Initial setup
    'challenge'    -- Interactive task
  )),

  -- Workflow Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN (
    'pending',
    'active',
    'completed',
    'cancelled',
    'failed'
  )),

  -- Progress Tracking
  current_step INTEGER DEFAULT 0,
  total_steps INTEGER NOT NULL,

  -- Workflow Data (JSON)
  workflow_data TEXT,

  -- Timestamps
  started_at INTEGER,
  completed_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
) STRICT;
```

**Indexes**:
- `idx_workflows_user_status`: User workflow dashboard
- `idx_workflows_agent`: Agent performance tracking
- `idx_workflows_type`: Workflow analytics
- `idx_workflows_active`: Find in-progress workflows (WHERE status = 'active')

**Triggers**:
- `update_agent_workflows_timestamp`: Auto-updates `updated_at` on every UPDATE

## Engagement Scoring System

### Point Values
- **Post Created**: 10 points
- **Comment Created**: 5 points
- **Post Read**: 2 points
- **Like Given**: 1 point

### Agent Unlock Thresholds

| Agent | Priority | Threshold | Description |
|-------|----------|-----------|-------------|
| avi | 1 | 0 | Available immediately (system agent) |
| coder | 2 | 10 | First specialized agent (1 post or 2 comments) |
| researcher | 3 | 25 | Research capabilities (2-3 posts with engagement) |
| tester | 4 | 50 | Testing and validation (active user) |
| reviewer | 5 | 75 | Code review (experienced user) |
| system-architect | 6 | 100 | Advanced architecture (power user) |

## Seed Data

### Demo User Initialization
```sql
-- User engagement tracking initialized
INSERT INTO user_engagement (user_id, total_interactions, engagement_score)
VALUES ('demo-user-123', 0, 0);

-- Sequential introduction queue configured
INSERT INTO introduction_queue
  (user_id, agent_id, priority, unlock_threshold, introduced)
VALUES
  ('demo-user-123', 'avi', 1, 0, 1),              -- Already introduced
  ('demo-user-123', 'coder', 2, 10, 0),           -- Next unlock at 10 pts
  ('demo-user-123', 'researcher', 3, 25, 0),      -- Unlock at 25 pts
  ('demo-user-123', 'tester', 4, 50, 0),          -- Unlock at 50 pts
  ('demo-user-123', 'reviewer', 5, 75, 0),        -- Unlock at 75 pts
  ('demo-user-123', 'system-architect', 6, 100, 0); -- Unlock at 100 pts
```

## Performance Optimizations

### PRAGMA Settings
```sql
PRAGMA journal_mode = WAL;        -- Write-Ahead Logging for concurrency
PRAGMA synchronous = NORMAL;      -- Balance safety and performance
PRAGMA cache_size = -64000;       -- 64MB cache
PRAGMA temp_store = MEMORY;       -- In-memory temp tables
```

### Indexed Queries
All foreign key relationships and frequently queried columns have indexes to ensure:
- Sub-millisecond user engagement lookups
- Efficient agent introduction checks
- Fast workflow status queries

### STRICT Mode
All tables use `STRICT` mode to enforce type safety and catch errors at insert time.

## Testing

### Test File
`/workspaces/agent-feed/tests/unit/migration-014.test.js`

**Coverage**:
- ✅ Migration script execution
- ✅ Table creation verification
- ✅ Index creation verification
- ✅ Seed data validation
- ✅ Data integrity constraints
- ✅ Error handling
- ✅ Performance optimizations

### Manual Verification
```bash
# Apply migration
node api-server/scripts/apply-migration-014.js

# Verify tables
sqlite3 database.db ".tables"

# Check schema
sqlite3 database.db ".schema user_engagement"
sqlite3 database.db ".schema introduction_queue"
sqlite3 database.db ".schema agent_workflows"

# Verify seed data
sqlite3 database.db "SELECT * FROM introduction_queue WHERE user_id = 'demo-user-123' ORDER BY priority"
```

## Integration Points

### Services to Create

1. **Engagement Tracking Service**
   - Update `user_engagement` counters on user actions
   - Calculate composite engagement score
   - Trigger agent introduction checks

2. **Agent Introduction Service**
   - Check `introduction_queue` for unlocked agents
   - Create introduction post/comment/workflow
   - Mark agent as introduced in queue

3. **Workflow Execution Service**
   - Execute multi-step workflows (showcase, tutorial)
   - Track workflow progress in `agent_workflows`
   - Handle workflow completion/cancellation

### API Endpoints to Create

```javascript
// Get user engagement status
GET /api/engagement/:userId

// Get next agent to unlock
GET /api/introduction/next/:userId

// Get all introduced agents
GET /api/introduction/history/:userId

// Start agent workflow
POST /api/workflows/start
{
  user_id, agent_id, workflow_type, total_steps, workflow_data
}

// Update workflow progress
PUT /api/workflows/:workflowId/step
{
  current_step, step_data
}

// Complete workflow
POST /api/workflows/:workflowId/complete
```

## Next Steps

1. ✅ **Database Schema**: Created (this migration)
2. ⏭️ **Engagement Service**: Create service to track user activities
3. ⏭️ **Introduction Service**: Create service to introduce agents sequentially
4. ⏭️ **Workflow Service**: Create service to execute agent workflows
5. ⏭️ **API Endpoints**: Expose engagement and introduction data via REST API
6. ⏭️ **Frontend Integration**: Display progress bars and unlock notifications
7. ⏭️ **Agent Personalities**: Define introduction content for each agent

## Rollback

If needed, the migration can be rolled back by dropping the tables:

```sql
DROP TABLE IF EXISTS agent_workflows;
DROP TABLE IF EXISTS introduction_queue;
DROP TABLE IF EXISTS user_engagement;
```

**Note**: This will permanently delete all engagement tracking and introduction queue data.

## Files Created

- `/workspaces/agent-feed/api-server/db/migrations/014-sequential-introductions.sql` - Migration SQL
- `/workspaces/agent-feed/api-server/scripts/apply-migration-014.js` - Application script
- `/workspaces/agent-feed/tests/unit/migration-014.test.js` - Test suite
- `/workspaces/agent-feed/docs/migrations/014-sequential-introductions.md` - This documentation

## Memory Storage

Migration details stored in swarm memory:
- **Key**: `sequential-intro/database-schema`
- **Database**: `.swarm/memory.db`
- **Format**: JSON
- **Size**: 5.7 KB

## References

- [SQLite STRICT Tables](https://www.sqlite.org/stricttables.html)
- [SQLite Write-Ahead Logging](https://www.sqlite.org/wal.html)
- [Progressive Feature Discovery UX Pattern](https://www.nngroup.com/articles/progressive-disclosure/)
