-- Migration 016: User Agent Exposure - Agent Visibility and Boundaries
-- Date: 2025-11-06
-- Purpose: Track which agents users have been exposed to
--          Separate system agents (coder, reviewer, tester) from user-facing agents
--          Enable progressive agent revelation based on user interaction

-- Enable performance optimizations
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA cache_size = -64000; -- 64MB cache
PRAGMA temp_store = MEMORY;

-- ============================================================================
-- Table: user_agent_exposure
-- Purpose: Track which agents have been introduced/shown to each user
--          Enables progressive revelation and system agent hiding
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_agent_exposure (
  -- Primary Key
  id TEXT PRIMARY KEY,

  -- User and Agent Reference
  user_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,

  -- Introduction Tracking
  introduced_at INTEGER NOT NULL DEFAULT (unixepoch()),
  session_number INTEGER, -- Which session was agent introduced
  introduction_method TEXT CHECK(introduction_method IN (
    'welcome',      -- Shown during welcome/onboarding
    'milestone',    -- Unlocked via engagement milestone
    'manual',       -- Manually triggered by user
    'system'        -- System introduction (e.g., admin override)
  )),

  -- Introduction Phase (1-5 for progressive revelation)
  introduction_phase INTEGER DEFAULT 1 CHECK(introduction_phase BETWEEN 1 AND 5),

  -- Aha Moment Tracking
  aha_completed INTEGER NOT NULL DEFAULT 0 CHECK(aha_completed IN (0, 1)),
  aha_completed_at INTEGER,

  -- Timestamps
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),

  -- Unique constraint: one exposure record per user-agent pair
  UNIQUE(user_id, agent_id)
) STRICT;

-- Index for user lookups (get all agents user has been exposed to)
CREATE INDEX IF NOT EXISTS idx_user_agent_exposure_user
  ON user_agent_exposure(user_id, introduced_at DESC);

-- Index for agent lookups (which users have seen this agent)
CREATE INDEX IF NOT EXISTS idx_user_agent_exposure_agent
  ON user_agent_exposure(agent_id);

-- Index for phase-based lookups (progressive revelation)
CREATE INDEX IF NOT EXISTS idx_user_agent_exposure_phase
  ON user_agent_exposure(user_id, introduction_phase);

-- Index for aha moment tracking
CREATE INDEX IF NOT EXISTS idx_user_agent_exposure_aha
  ON user_agent_exposure(user_id, aha_completed)
  WHERE aha_completed = 1;

-- ============================================================================
-- Table: agent_metadata
-- Purpose: Store agent visibility and introduction configuration
--          Parsed from agent frontmatter and stored in database
-- ============================================================================

CREATE TABLE IF NOT EXISTS agent_metadata (
  -- Primary Key (agent slug)
  agent_id TEXT PRIMARY KEY,

  -- Basic Info
  agent_name TEXT NOT NULL,
  agent_description TEXT,

  -- Visibility Configuration
  visibility TEXT NOT NULL DEFAULT 'public' CHECK(visibility IN (
    'public',       -- User-facing agent, shown in feed
    'system',       -- System agent (coder, reviewer, tester), hidden from users
    'admin'         -- Admin-only agent
  )),

  -- Introduction Configuration
  requires_introduction INTEGER NOT NULL DEFAULT 1 CHECK(requires_introduction IN (0, 1)),
  introduction_phase INTEGER DEFAULT 1 CHECK(introduction_phase BETWEEN 1 AND 5),
  introduction_priority TEXT DEFAULT 'medium' CHECK(introduction_priority IN (
    'high',         -- Introduce early
    'medium',       -- Introduce mid-journey
    'low'           -- Introduce later
  )),

  -- Unlock Requirements
  min_engagement_score INTEGER DEFAULT 0,
  requires_previous_agent TEXT, -- Agent ID that must be introduced first

  -- Metadata
  category TEXT,
  tags TEXT, -- JSON array

  -- Timestamps
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
) STRICT;

-- Index for visibility lookups
CREATE INDEX IF NOT EXISTS idx_agent_metadata_visibility
  ON agent_metadata(visibility);

-- Index for introduction phase and priority
CREATE INDEX IF NOT EXISTS idx_agent_metadata_introduction
  ON agent_metadata(introduction_phase, introduction_priority);

-- Index for unlock requirements
CREATE INDEX IF NOT EXISTS idx_agent_metadata_unlock
  ON agent_metadata(min_engagement_score);

-- Trigger: Auto-update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_agent_metadata_timestamp
AFTER UPDATE ON agent_metadata
FOR EACH ROW
BEGIN
  UPDATE agent_metadata
  SET updated_at = unixepoch()
  WHERE agent_id = NEW.agent_id;
END;

-- ============================================================================
-- Seed Data: Configure system agents as hidden
-- ============================================================================

-- System agents (should never be shown to users)
INSERT OR REPLACE INTO agent_metadata (
  agent_id,
  agent_name,
  visibility,
  requires_introduction,
  agent_description
) VALUES
  ('coder', 'Coder Agent', 'system', 0, 'Backend code generation agent'),
  ('reviewer', 'Code Reviewer', 'system', 0, 'Code review and quality assurance'),
  ('tester', 'Test Engineer', 'system', 0, 'Automated testing and validation'),
  ('debugger', 'Debugger', 'system', 0, 'Debug and troubleshooting assistance'),
  ('architect', 'System Architect', 'system', 0, 'System architecture and design');

-- Example public agents with introduction phases
INSERT OR REPLACE INTO agent_metadata (
  agent_id,
  agent_name,
  visibility,
  requires_introduction,
  introduction_phase,
  introduction_priority,
  min_engagement_score,
  agent_description
) VALUES
  ('avi', 'Avi', 'public', 1, 1, 'high', 0, 'Your AI assistant and guide'),
  ('personal-todos-agent', 'Personal Todos', 'public', 1, 2, 'high', 10, 'Manage your tasks and todos'),
  ('get-to-know-you-agent', 'Get To Know You', 'public', 1, 1, 'high', 5, 'Helps us learn about you'),
  ('learning-optimizer-agent', 'Learning Optimizer', 'public', 1, 3, 'medium', 25, 'Optimizes your learning journey'),
  ('follow-ups-agent', 'Follow Ups', 'public', 1, 2, 'medium', 15, 'Tracks follow-up items');

-- Demo user - mark Avi as already introduced
INSERT OR IGNORE INTO user_agent_exposure (
  id,
  user_id,
  agent_id,
  introduction_method,
  introduction_phase,
  aha_completed
) VALUES (
  'exposure-demo-avi',
  'demo-user-123',
  'avi',
  'welcome',
  1,
  1
);

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Show all agent metadata
SELECT
  agent_id,
  visibility,
  introduction_phase,
  min_engagement_score
FROM agent_metadata
ORDER BY
  visibility,
  introduction_phase,
  introduction_priority;

-- Show demo user exposures
SELECT
  agent_id,
  introduction_method,
  datetime(introduced_at, 'unixepoch') as introduced_at
FROM user_agent_exposure
WHERE user_id = 'demo-user-123';

-- Verification message
SELECT 'Migration 016 complete: Created user_agent_exposure and agent_metadata tables' as message;
