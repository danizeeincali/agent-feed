-- Migration 012: Add Hemingway Bridges System Tables
-- Date: 2025-11-03
-- Purpose: Implement engagement bridge system to always keep users engaged
--          SPARC Spec: /workspaces/agent-feed/docs/SPARC-SYSTEM-INITIALIZATION.md
--          Agent 5: Hemingway Bridge Logic

-- Enable performance optimizations
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA cache_size = -64000; -- 64MB cache
PRAGMA temp_store = MEMORY;

-- ============================================================================
-- Table 1: hemingway_bridges
-- Purpose: Track active engagement points to keep users engaged
-- Strategy: Priority waterfall ensures at least 1 bridge always exists
-- ============================================================================

CREATE TABLE IF NOT EXISTS hemingway_bridges (
  -- Primary Key
  id TEXT PRIMARY KEY,

  -- User reference
  user_id TEXT NOT NULL,

  -- Bridge type (priority waterfall)
  bridge_type TEXT NOT NULL CHECK(
    bridge_type IN (
      'continue_thread',  -- Priority 1: User's last interaction
      'next_step',        -- Priority 2: Next step in current flow
      'new_feature',      -- Priority 3: New feature/agent introduction
      'question',         -- Priority 4: Engaging question
      'insight'           -- Priority 5: Valuable tip/fact
    )
  ),

  -- Bridge content (what to show user)
  content TEXT NOT NULL,

  -- Priority level (1 = highest)
  priority INTEGER NOT NULL CHECK(priority >= 1 AND priority <= 5),

  -- Optional references
  post_id TEXT,           -- Reference to post if bridge is about a post
  agent_id TEXT,          -- Reference to agent if bridge is about agent intro
  action TEXT,            -- Optional action to trigger (e.g., 'trigger_phase2')

  -- State tracking
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0, 1)),

  -- Timestamps
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  completed_at INTEGER,

  -- Foreign key constraint
  FOREIGN KEY (user_id) REFERENCES user_settings(user_id) ON DELETE CASCADE
) STRICT;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_hemingway_bridges_user_active
  ON hemingway_bridges(user_id, active);

CREATE INDEX IF NOT EXISTS idx_hemingway_bridges_priority
  ON hemingway_bridges(user_id, priority, active);

-- ============================================================================
-- Table 2: agent_introductions
-- Purpose: Track which agents have been introduced to each user
-- Strategy: Prevent duplicate introductions, enable contextual triggering
-- ============================================================================

CREATE TABLE IF NOT EXISTS agent_introductions (
  -- Primary Key
  id TEXT PRIMARY KEY,

  -- User reference
  user_id TEXT NOT NULL,

  -- Agent reference
  agent_id TEXT NOT NULL,

  -- Introduction tracking
  introduced_at INTEGER NOT NULL DEFAULT (unixepoch()),
  post_id TEXT,  -- Reference to the introduction post

  -- Interaction tracking
  interaction_count INTEGER NOT NULL DEFAULT 0,

  -- Foreign key constraint
  FOREIGN KEY (user_id) REFERENCES user_settings(user_id) ON DELETE CASCADE,

  -- Unique constraint: one introduction per agent per user
  UNIQUE(user_id, agent_id)
) STRICT;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_introductions_user
  ON agent_introductions(user_id);

CREATE INDEX IF NOT EXISTS idx_agent_introductions_agent
  ON agent_introductions(agent_id);

-- ============================================================================
-- Table 3: onboarding_state
-- Purpose: Track user progress through onboarding phases
-- Strategy: Phase 1 (name + use case) → Phase 2 (deeper personalization)
-- ============================================================================

CREATE TABLE IF NOT EXISTS onboarding_state (
  -- Primary Key
  user_id TEXT PRIMARY KEY,

  -- Current phase and step
  phase INTEGER NOT NULL DEFAULT 1 CHECK(phase >= 1 AND phase <= 2),
  step TEXT CHECK(
    step IS NULL OR
    step IN ('name', 'use_case', 'comm_style', 'goals', 'agent_prefs')
  ),

  -- Phase 1 completion
  phase1_completed INTEGER NOT NULL DEFAULT 0 CHECK(phase1_completed IN (0, 1)),
  phase1_completed_at INTEGER,

  -- Phase 2 completion
  phase2_completed INTEGER NOT NULL DEFAULT 0 CHECK(phase2_completed IN (0, 1)),
  phase2_completed_at INTEGER,

  -- Responses (JSON object of all collected data)
  responses TEXT NOT NULL DEFAULT '{}',

  -- Timestamps
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),

  -- Foreign key constraint
  FOREIGN KEY (user_id) REFERENCES user_settings(user_id) ON DELETE CASCADE
) STRICT;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_onboarding_state_phase
  ON onboarding_state(phase, phase1_completed, phase2_completed);

-- ============================================================================
-- Triggers: Auto-update timestamps
-- ============================================================================

CREATE TRIGGER IF NOT EXISTS update_onboarding_state_timestamp
AFTER UPDATE ON onboarding_state
FOR EACH ROW
BEGIN
  UPDATE onboarding_state
  SET updated_at = unixepoch()
  WHERE user_id = NEW.user_id;
END;

-- ============================================================================
-- Initial Data: Create onboarding state for demo user (if exists)
-- ============================================================================

INSERT OR IGNORE INTO onboarding_state (
  user_id,
  phase,
  step,
  phase1_completed,
  phase2_completed,
  responses
)
SELECT
  'demo-user-123',
  1,
  'name',
  0,
  0,
  '{}'
WHERE EXISTS (SELECT 1 FROM user_settings WHERE user_id = 'demo-user-123');

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Verify tables created
SELECT 'hemingway_bridges table created' as status
FROM sqlite_master
WHERE type='table' AND name='hemingway_bridges';

SELECT 'agent_introductions table created' as status
FROM sqlite_master
WHERE type='table' AND name='agent_introductions';

SELECT 'onboarding_state table created' as status
FROM sqlite_master
WHERE type='table' AND name='onboarding_state';

-- Verify indexes created
SELECT COUNT(*) || ' indexes created' as status
FROM sqlite_master
WHERE type='index' AND tbl_name IN ('hemingway_bridges', 'agent_introductions', 'onboarding_state');

-- Final success message
SELECT 'Migration 012 complete: Created hemingway_bridges, agent_introductions, and onboarding_state tables' as message;
