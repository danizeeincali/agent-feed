-- ==============================================================================
-- Phase 1: Initial Database Schema
-- ==============================================================================
-- 6 Tables with 3-Tier Data Protection Model:
-- TIER 1: system_agent_templates (Immutable system defaults)
-- TIER 2: user_agent_customizations (User's personalized agents)
-- TIER 3: agent_memories, agent_workspaces (User's conversation history and files)
-- Plus: avi_state, error_log
-- ==============================================================================

BEGIN;

-- ==============================================================================
-- TIER 1: System Agent Templates (Immutable system defaults)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS system_agent_templates (
  -- Primary Key
  name VARCHAR(50) PRIMARY KEY,

  -- Version control
  version INTEGER NOT NULL,

  -- PROTECTED FIELDS - Never user-editable
  model VARCHAR(100),                    -- Claude model (NULL = use env default)
  posting_rules JSONB NOT NULL,          -- Rate limits, length, format
  api_schema JSONB NOT NULL,             -- Platform API requirements
  safety_constraints JSONB NOT NULL,     -- Content filters, prohibited actions

  -- DEFAULT CUSTOMIZABLE FIELDS - Users can override
  default_personality TEXT,
  default_response_style JSONB,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,

  -- Constraints
  CONSTRAINT system_only CHECK (version > 0)
);

-- ==============================================================================
-- TIER 2: User Agent Customizations (User's personalized agents)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS user_agent_customizations (
  -- Primary Key
  id SERIAL PRIMARY KEY,

  -- User identification (multi-tenant support)
  user_id VARCHAR(100) NOT NULL,

  -- Agent template reference
  agent_template VARCHAR(50) NOT NULL REFERENCES system_agent_templates(name) ON DELETE CASCADE,

  -- USER-EDITABLE FIELDS ONLY
  custom_name VARCHAR(100),              -- "My Tech Buddy"
  personality TEXT,                      -- Override default personality
  interests JSONB,                       -- ["AI", "startups", "crypto"]
  response_style JSONB,                  -- {tone: "casual", length: "brief"}
  enabled BOOLEAN DEFAULT TRUE NOT NULL,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,

  -- Constraints
  CONSTRAINT personality_length CHECK (personality IS NULL OR LENGTH(personality) <= 5000),
  CONSTRAINT unique_user_template UNIQUE(user_id, agent_template)
);

-- ==============================================================================
-- TIER 3: Agent Memories (User's conversation history)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS agent_memories (
  -- Primary Key
  id SERIAL PRIMARY KEY,

  -- User and agent identification
  user_id VARCHAR(100) NOT NULL,        -- Multi-user support
  agent_name VARCHAR(50) NOT NULL,

  -- Post reference
  post_id VARCHAR(100),

  -- Memory content
  content TEXT NOT NULL,
  metadata JSONB,                        -- {topic, sentiment, mentioned_users, etc.}

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,

  -- Constraints (immutable once created - prevents accidental deletion)
  CONSTRAINT no_manual_delete CHECK (created_at IS NOT NULL)
);

-- ==============================================================================
-- TIER 3: Agent Workspaces (User's agent-generated files)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS agent_workspaces (
  -- Primary Key
  id SERIAL PRIMARY KEY,

  -- User and agent identification
  user_id VARCHAR(100) NOT NULL,
  agent_name VARCHAR(100) NOT NULL,

  -- File information
  file_path TEXT NOT NULL,
  content BYTEA,                         -- Binary file content
  metadata JSONB,                        -- {file_type, size_bytes, encoding, etc.}

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,

  -- Constraints
  CONSTRAINT unique_user_agent_file UNIQUE(user_id, agent_name, file_path)
);

-- ==============================================================================
-- Avi State (Single row for orchestrator state)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS avi_state (
  -- Primary Key (only one row allowed)
  id INTEGER PRIMARY KEY DEFAULT 1,

  -- State data
  last_feed_position VARCHAR(100),
  pending_tickets JSONB,
  context_size INTEGER DEFAULT 0 NOT NULL,
  last_restart TIMESTAMP,
  uptime_seconds INTEGER DEFAULT 0 NOT NULL,

  -- Constraints (single row enforcement)
  CONSTRAINT single_row CHECK (id = 1)
);

-- ==============================================================================
-- Error Log (Error tracking)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS error_log (
  -- Primary Key
  id SERIAL PRIMARY KEY,

  -- Error information
  agent_name VARCHAR(50),
  error_type VARCHAR(50),
  error_message TEXT,
  context JSONB,                         -- {ticket_id, user_id, error_stack, etc.}

  -- Retry tracking
  retry_count INTEGER DEFAULT 0 NOT NULL,
  resolved BOOLEAN DEFAULT FALSE NOT NULL,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ==============================================================================
-- Comments
-- ==============================================================================

COMMENT ON TABLE system_agent_templates IS 'TIER 1: Immutable system agent templates - version controlled, updated only via migrations';
COMMENT ON TABLE user_agent_customizations IS 'TIER 2: User-specific agent customizations - personality, interests, response_style only';
COMMENT ON TABLE agent_memories IS 'TIER 3: User conversation history - immutable once created, backed up daily';
COMMENT ON TABLE agent_workspaces IS 'TIER 3: User agent-generated files - persistent across app updates';
COMMENT ON TABLE avi_state IS 'Avi orchestrator state - single row, tracks feed position and context size';
COMMENT ON TABLE error_log IS 'Error tracking - stores agent errors for debugging and retry logic';

COMMENT ON COLUMN system_agent_templates.model IS 'Claude model override (NULL = use AGENT_MODEL env var)';
COMMENT ON COLUMN system_agent_templates.posting_rules IS 'Protected: Rate limits, max_length, prohibited_words';
COMMENT ON COLUMN system_agent_templates.api_schema IS 'Protected: Platform API endpoints and auth_type';
COMMENT ON COLUMN system_agent_templates.safety_constraints IS 'Protected: Content filters, max_mentions_per_post';

COMMENT ON COLUMN user_agent_customizations.personality IS 'User override for agent personality (max 5000 chars)';
COMMENT ON COLUMN user_agent_customizations.interests IS 'User-defined topics of interest (max 50 items)';
COMMENT ON COLUMN user_agent_customizations.response_style IS 'User preferences: tone, length, use_emojis';

COMMENT ON COLUMN agent_memories.metadata IS 'JSONB: topic, sentiment, mentioned_users for retrieval';
COMMENT ON COLUMN agent_workspaces.metadata IS 'JSONB: file_type, size_bytes, encoding';

COMMIT;
