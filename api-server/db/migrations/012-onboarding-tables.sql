-- Migration 012: Onboarding System Tables
-- Date: 2025-11-03
-- Purpose: Create tables for complete system initialization and onboarding experience
--          Implements SPARC-SYSTEM-INITIALIZATION.md specification
--          Agent 1: Infrastructure & Database

-- Enable performance optimizations
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA cache_size = -64000; -- 64MB cache
PRAGMA temp_store = MEMORY;

-- ============================================================================
-- ALTER TABLE: user_settings
-- Purpose: Add additional columns for onboarding phases
-- ============================================================================

-- Add primary use case (collected in Phase 1)
ALTER TABLE user_settings
ADD COLUMN primary_use_case TEXT;

-- Add communication style (collected in Phase 2)
ALTER TABLE user_settings
ADD COLUMN communication_style TEXT;

-- Add key goals (JSON array, collected in Phase 2)
ALTER TABLE user_settings
ADD COLUMN key_goals TEXT;

-- Add onboarding phase tracking
ALTER TABLE user_settings
ADD COLUMN onboarding_phase INTEGER DEFAULT 1 CHECK(onboarding_phase IN (1, 2));

-- Add phase completion flags
ALTER TABLE user_settings
ADD COLUMN phase1_completed INTEGER DEFAULT 0 CHECK(phase1_completed IN (0, 1));

ALTER TABLE user_settings
ADD COLUMN phase2_completed INTEGER DEFAULT 0 CHECK(phase2_completed IN (0, 1));

-- ============================================================================
-- Table: hemingway_bridges
-- Purpose: Track engagement points to ensure users always have a next action
-- Implements Hemingway Bridge Strategy (Decision 10)
-- ============================================================================

CREATE TABLE IF NOT EXISTS hemingway_bridges (
  -- Primary Key
  id TEXT PRIMARY KEY,

  -- User reference
  user_id TEXT NOT NULL,

  -- Bridge type (priority waterfall)
  bridge_type TEXT NOT NULL CHECK(bridge_type IN (
    'continue_thread',   -- Priority 1: Continue last interaction
    'next_step',         -- Priority 2: Next step in current flow
    'new_feature',       -- Priority 3: New feature introduction
    'question',          -- Priority 4: Engaging question
    'insight'            -- Priority 5: Valuable insight
  )),

  -- Bridge content
  content TEXT NOT NULL,

  -- Priority level (1-5, lower is higher priority)
  priority INTEGER NOT NULL CHECK(priority BETWEEN 1 AND 5),

  -- Related post ID (if applicable)
  post_id TEXT,

  -- Related agent ID (if applicable)
  agent_id TEXT,

  -- Action to trigger (if applicable)
  action TEXT,

  -- Active status
  active INTEGER DEFAULT 1 CHECK(active IN (0, 1)),

  -- Timestamps
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  completed_at INTEGER
) STRICT;

-- Index for active bridges lookup
CREATE INDEX IF NOT EXISTS idx_hemingway_bridges_active
  ON hemingway_bridges(user_id, active, priority);

-- Index for bridge type
CREATE INDEX IF NOT EXISTS idx_hemingway_bridges_type
  ON hemingway_bridges(bridge_type);

-- ============================================================================
-- Table: agent_introductions
-- Purpose: Track which agents have been introduced to users
-- Implements Agent Self-Introduction System (FR-4)
-- ============================================================================

CREATE TABLE IF NOT EXISTS agent_introductions (
  -- Primary Key
  id TEXT PRIMARY KEY,

  -- User reference
  user_id TEXT NOT NULL,

  -- Agent identifier
  agent_id TEXT NOT NULL,

  -- Introduction timestamp
  introduced_at INTEGER NOT NULL DEFAULT (unixepoch()),

  -- Post ID where agent introduced itself
  post_id TEXT,

  -- Interaction count
  interaction_count INTEGER DEFAULT 0,

  -- Unique constraint: one introduction per user-agent pair
  UNIQUE(user_id, agent_id)
) STRICT;

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_agent_introductions_user
  ON agent_introductions(user_id);

-- Index for agent lookups
CREATE INDEX IF NOT EXISTS idx_agent_introductions_agent
  ON agent_introductions(agent_id);

-- ============================================================================
-- Table: onboarding_state
-- Purpose: Track detailed progress through onboarding phases
-- Implements Onboarding Flow (FR-3)
-- ============================================================================

CREATE TABLE IF NOT EXISTS onboarding_state (
  -- Primary Key (one record per user)
  user_id TEXT PRIMARY KEY,

  -- Current phase (1 or 2)
  phase INTEGER DEFAULT 1 CHECK(phase IN (1, 2)),

  -- Current step within phase
  step TEXT, -- 'name', 'use_case', 'comm_style', 'goals', 'agent_prefs'

  -- Phase 1 completion
  phase1_completed INTEGER DEFAULT 0 CHECK(phase1_completed IN (0, 1)),
  phase1_completed_at INTEGER,

  -- Phase 2 completion
  phase2_completed INTEGER DEFAULT 0 CHECK(phase2_completed IN (0, 1)),
  phase2_completed_at INTEGER,

  -- All responses (JSON object)
  responses TEXT, -- Store all user responses for reference

  -- Timestamps
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
) STRICT;

-- Trigger: Auto-update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_onboarding_state_timestamp
AFTER UPDATE ON onboarding_state
FOR EACH ROW
BEGIN
  UPDATE onboarding_state
  SET updated_at = unixepoch()
  WHERE user_id = NEW.user_id;
END;

-- ============================================================================
-- Seed Data: Initialize demo user with onboarding state
-- ============================================================================

-- Ensure demo user exists in user_settings
INSERT OR IGNORE INTO user_settings (user_id, display_name)
VALUES ('demo-user-123', 'User');

-- Create initial onboarding state for demo user
INSERT OR IGNORE INTO onboarding_state (user_id, phase, step)
VALUES ('demo-user-123', 1, 'name');

-- Create initial Hemingway bridge for demo user
INSERT OR IGNORE INTO hemingway_bridges (
  id,
  user_id,
  bridge_type,
  content,
  priority,
  active
) VALUES (
  'initial-bridge-demo-user',
  'demo-user-123',
  'question',
  'Welcome! What brings you to Agent Feed today?',
  4,
  1
);

-- ============================================================================
-- Verification
-- ============================================================================

-- Verify all tables exist
SELECT 'Migration 012 complete: Created hemingway_bridges, agent_introductions, onboarding_state tables' as message;

-- Show table counts
SELECT 'hemingway_bridges' as table_name, COUNT(*) as record_count FROM hemingway_bridges
UNION ALL
SELECT 'agent_introductions', COUNT(*) FROM agent_introductions
UNION ALL
SELECT 'onboarding_state', COUNT(*) FROM onboarding_state
UNION ALL
SELECT 'user_settings', COUNT(*) FROM user_settings;
