-- ============================================================
-- MIGRATION 003: Agents System
-- ============================================================
-- Version: 1.0.0
-- Created: 2025-11-07
-- Description: Adds agents configuration and onboarding tables
-- Dependencies: 001-initial-schema.sql, 002-comments.sql
-- ============================================================

BEGIN TRANSACTION;

-- ============================================================
-- AGENTS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT,
  description TEXT,
  tier INTEGER DEFAULT 1,
  visibility TEXT DEFAULT 'public',
  icon TEXT,
  icon_emoji TEXT,
  color TEXT,
  model TEXT DEFAULT 'sonnet',
  posts_as_self INTEGER DEFAULT 1,
  show_in_default_feed INTEGER DEFAULT 1,
  proactive INTEGER DEFAULT 0,
  priority TEXT DEFAULT 'P3',
  tools TEXT,                  -- JSON array
  skills TEXT,                 -- JSON array
  metadata TEXT,               -- JSON
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_agents_name ON agents(name);
CREATE INDEX IF NOT EXISTS idx_agents_tier ON agents(tier);
CREATE INDEX IF NOT EXISTS idx_agents_visibility ON agents(visibility);

-- ============================================================
-- ONBOARDING_STATE TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS onboarding_state (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  phase INTEGER DEFAULT 1,
  step TEXT DEFAULT 'name',    -- Current onboarding step
  completed INTEGER DEFAULT 0,
  current_question INTEGER DEFAULT 1,
  responses TEXT,              -- JSON
  phase1_completed INTEGER DEFAULT 0,
  phase1_completed_at INTEGER,
  phase2_completed INTEGER DEFAULT 0,
  phase2_completed_at INTEGER,
  started_at INTEGER DEFAULT (unixepoch()),
  completed_at INTEGER,
  last_interaction_at INTEGER,
  metadata TEXT,               -- JSON

  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_onboarding_user_id ON onboarding_state(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_phase ON onboarding_state(phase);
CREATE INDEX IF NOT EXISTS idx_onboarding_completed ON onboarding_state(completed);

-- ============================================================
-- HEMINGWAY_BRIDGES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS hemingway_bridges (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  bridge_type TEXT NOT NULL,
  content TEXT,
  priority INTEGER,
  post_id TEXT,
  agent_id TEXT,
  action TEXT,
  active INTEGER DEFAULT 1,
  status TEXT DEFAULT 'active',
  created_at INTEGER DEFAULT (unixepoch()),
  completed_at INTEGER,
  metadata TEXT,

  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(post_id) REFERENCES agent_posts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_hemingway_user ON hemingway_bridges(user_id);
CREATE INDEX IF NOT EXISTS idx_hemingway_active ON hemingway_bridges(active);
CREATE INDEX IF NOT EXISTS idx_hemingway_priority ON hemingway_bridges(priority);

-- ============================================================
-- AGENT_INTRODUCTIONS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS agent_introductions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  introduced_at INTEGER DEFAULT (unixepoch()),
  post_id TEXT,
  interaction_count INTEGER DEFAULT 0,

  UNIQUE(user_id, agent_id),
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(post_id) REFERENCES agent_posts(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_intro_user ON agent_introductions(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_intro_agent ON agent_introductions(agent_id);

COMMIT;

-- ============================================================
-- END OF MIGRATION
-- ============================================================
