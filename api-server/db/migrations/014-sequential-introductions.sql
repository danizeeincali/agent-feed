-- Migration 014: Sequential Agent Introduction System
-- Date: 2025-11-06
-- Purpose: Create tables for sequential agent introduction system
--          Track user engagement and agent unlock progression
--          Implements agent showcase and tutorial workflows

-- Enable performance optimizations
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA cache_size = -64000; -- 64MB cache
PRAGMA temp_store = MEMORY;

-- ============================================================================
-- Table: user_engagement
-- Purpose: Track user activity and engagement scores to determine when to
--          introduce new agents sequentially
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_engagement (
  -- Primary Key
  user_id TEXT PRIMARY KEY,

  -- Activity Counters
  total_interactions INTEGER NOT NULL DEFAULT 0,
  posts_created INTEGER NOT NULL DEFAULT 0,
  comments_created INTEGER NOT NULL DEFAULT 0,
  likes_given INTEGER NOT NULL DEFAULT 0,
  posts_read INTEGER NOT NULL DEFAULT 0,

  -- Engagement Score (composite metric)
  engagement_score INTEGER NOT NULL DEFAULT 0,

  -- Last Activity
  last_activity_at INTEGER,

  -- Timestamps
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
) STRICT;

-- Index for engagement score lookups (determine next agent unlock)
CREATE INDEX IF NOT EXISTS idx_user_engagement_score
  ON user_engagement(engagement_score DESC);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_user_engagement_user
  ON user_engagement(user_id);

-- Index for last activity tracking
CREATE INDEX IF NOT EXISTS idx_user_engagement_activity
  ON user_engagement(last_activity_at DESC)
  WHERE last_activity_at IS NOT NULL;

-- Trigger: Auto-update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_user_engagement_timestamp
AFTER UPDATE ON user_engagement
FOR EACH ROW
BEGIN
  UPDATE user_engagement
  SET updated_at = unixepoch()
  WHERE user_id = NEW.user_id;
END;

-- ============================================================================
-- Table: introduction_queue
-- Purpose: Define the order and thresholds for introducing agents to users
--          Agents are introduced sequentially as users reach engagement milestones
-- ============================================================================

CREATE TABLE IF NOT EXISTS introduction_queue (
  -- Primary Key
  id TEXT PRIMARY KEY,

  -- User and Agent Reference
  user_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,

  -- Queue Position and Threshold
  priority INTEGER NOT NULL, -- Lower number = introduced first
  unlock_threshold INTEGER NOT NULL, -- Engagement score required to unlock

  -- Introduction Status
  introduced INTEGER NOT NULL DEFAULT 0 CHECK(introduced IN (0, 1)),
  introduced_at INTEGER,

  -- Post ID where agent introduced itself
  intro_post_id TEXT,

  -- Introduction Method
  intro_method TEXT CHECK(intro_method IN ('post', 'comment', 'workflow')),

  -- Timestamps
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),

  -- Unique constraint: one queue entry per user-agent pair
  UNIQUE(user_id, agent_id)
) STRICT;

-- Index for priority lookups (find next agent to introduce)
CREATE INDEX IF NOT EXISTS idx_intro_queue_priority
  ON introduction_queue(user_id, priority, introduced)
  WHERE introduced = 0;

-- Index for threshold lookups (check which agents are ready)
CREATE INDEX IF NOT EXISTS idx_intro_queue_threshold
  ON introduction_queue(user_id, unlock_threshold, introduced)
  WHERE introduced = 0;

-- Index for agent lookups
CREATE INDEX IF NOT EXISTS idx_intro_queue_agent
  ON introduction_queue(agent_id);

-- Index for introduced agents
CREATE INDEX IF NOT EXISTS idx_intro_queue_introduced
  ON introduction_queue(user_id, introduced_at DESC)
  WHERE introduced = 1;

-- ============================================================================
-- Table: agent_workflows
-- Purpose: Track special agent workflows like showcases, tutorials, onboarding
--          Allows agents to run multi-step introduction sequences
-- ============================================================================

CREATE TABLE IF NOT EXISTS agent_workflows (
  -- Primary Key
  id TEXT PRIMARY KEY,

  -- User and Agent Reference
  user_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,

  -- Workflow Type
  workflow_type TEXT NOT NULL CHECK(workflow_type IN (
    'showcase',    -- Agent demonstrates its capabilities
    'tutorial',    -- Agent teaches user how to use a feature
    'onboarding',  -- Initial setup workflow
    'challenge'    -- Interactive challenge or task
  )),

  -- Workflow State
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN (
    'pending',     -- Workflow not yet started
    'active',      -- Workflow in progress
    'completed',   -- Workflow finished successfully
    'cancelled',   -- Workflow cancelled
    'failed'       -- Workflow failed
  )),

  -- Workflow Progress
  current_step INTEGER DEFAULT 0,
  total_steps INTEGER NOT NULL,

  -- Workflow Data (JSON string)
  workflow_data TEXT, -- { steps: [], context: {}, results: {} }

  -- Timestamps
  started_at INTEGER,
  completed_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
) STRICT;

-- Index for user workflow lookups
CREATE INDEX IF NOT EXISTS idx_workflows_user_status
  ON agent_workflows(user_id, status);

-- Index for agent workflow lookups
CREATE INDEX IF NOT EXISTS idx_workflows_agent
  ON agent_workflows(agent_id, status);

-- Index for workflow type lookups
CREATE INDEX IF NOT EXISTS idx_workflows_type
  ON agent_workflows(workflow_type, status);

-- Index for active workflows
CREATE INDEX IF NOT EXISTS idx_workflows_active
  ON agent_workflows(user_id, agent_id, status)
  WHERE status = 'active';

-- Trigger: Auto-update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_agent_workflows_timestamp
AFTER UPDATE ON agent_workflows
FOR EACH ROW
BEGIN
  UPDATE agent_workflows
  SET updated_at = unixepoch()
  WHERE id = NEW.id;
END;

-- ============================================================================
-- Seed Data: Initialize default introduction queue for demo user
-- ============================================================================

-- Ensure demo user has engagement tracking
INSERT OR IGNORE INTO user_engagement (
  user_id,
  total_interactions,
  engagement_score,
  last_activity_at
) VALUES (
  'demo-user-123',
  0,
  0,
  unixepoch()
);

-- Define sequential introduction queue for demo user
-- Agents are introduced in priority order as user reaches thresholds

-- Priority 1: Avi (already introduced, threshold = 0)
INSERT OR IGNORE INTO introduction_queue (
  id,
  user_id,
  agent_id,
  priority,
  unlock_threshold,
  introduced,
  introduced_at,
  intro_method
) VALUES (
  'intro-demo-avi',
  'demo-user-123',
  'avi',
  1,
  0, -- Available immediately
  1, -- Already introduced
  unixepoch(),
  'post'
);

-- System agents removed from queue (now in agent_metadata as visibility='system')
-- These agents should never be introduced to users
-- They work in background and Avi presents their results

-- ============================================================================
-- Verification
-- ============================================================================

-- Verify all tables exist
SELECT 'Migration 014 complete: Created user_engagement, introduction_queue, agent_workflows tables' as message;

-- Show table counts
SELECT 'user_engagement' as table_name, COUNT(*) as record_count FROM user_engagement
UNION ALL
SELECT 'introduction_queue', COUNT(*) FROM introduction_queue
UNION ALL
SELECT 'agent_workflows', COUNT(*) FROM agent_workflows;

-- Show default queue for demo user
SELECT
  agent_id,
  priority,
  unlock_threshold,
  CASE WHEN introduced = 1 THEN 'Yes' ELSE 'No' END as introduced
FROM introduction_queue
WHERE user_id = 'demo-user-123'
ORDER BY priority;
