-- ==============================================================================
-- AVI 3-Tier Architecture - Complete Database Schema
-- ==============================================================================
-- This schema implements the 3-tier data protection model for the AVI system:
-- TIER 1: system_agent_templates (Immutable system defaults)
-- TIER 2: user_agent_customizations (User's personalized agents)
-- TIER 3: agent_memories, agent_workspaces (User's conversation history and files)
-- Plus: avi_state, work_queue, error_log
-- ==============================================================================
-- Version: 1.0
-- Date: 2025-10-10
-- References: /workspaces/agent-feed/AVI-ARCHITECTURE-PLAN.md
-- ==============================================================================

BEGIN;

-- ==============================================================================
-- TIER 1: System Agent Templates (Immutable system defaults)
-- ==============================================================================
-- Purpose: Store system-defined agent templates that define protected rules
-- Protection: Only updateable via migrations, never by users
-- Seeded from: /config/system/agent-templates/*.json
-- ==============================================================================

CREATE TABLE IF NOT EXISTS system_agent_templates (
  -- Primary Key
  name VARCHAR(50) PRIMARY KEY,

  -- Version control
  version INTEGER NOT NULL,

  -- PROTECTED FIELDS - Never user-editable
  model VARCHAR(100),                    -- Claude model (NULL = use AGENT_MODEL env var)
  posting_rules JSONB NOT NULL,          -- Rate limits, length, format, prohibited_words
  api_schema JSONB NOT NULL,             -- Platform API requirements (endpoints, auth_type)
  safety_constraints JSONB NOT NULL,     -- Content filters, max_mentions, human_review_required

  -- DEFAULT CUSTOMIZABLE FIELDS - Users can override these
  default_personality TEXT,              -- Default personality template
  default_response_style JSONB,          -- Default style: {tone, length, use_emojis}

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,

  -- Constraints
  CONSTRAINT system_only CHECK (version > 0),
  CONSTRAINT valid_posting_rules CHECK (posting_rules ? 'max_length'),
  CONSTRAINT valid_api_schema CHECK (api_schema ? 'platform'),
  CONSTRAINT valid_safety_constraints CHECK (safety_constraints ? 'content_filters')
);

-- ==============================================================================
-- TIER 2: User Agent Customizations (User's personalized agents)
-- ==============================================================================
-- Purpose: Store user-specific customizations for agents
-- Protection: Users can only modify personality, interests, response_style
-- Composition: Merged with system template at runtime to create agent context
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
  CONSTRAINT interests_array CHECK (interests IS NULL OR jsonb_typeof(interests) = 'array'),
  CONSTRAINT unique_user_template UNIQUE(user_id, agent_template)
);

-- ==============================================================================
-- TIER 3: Agent Memories (User's conversation history)
-- ==============================================================================
-- Purpose: Store conversation memories for context retrieval
-- Protection: Immutable once created, backed up daily
-- Retrieval: By user_id + agent_name + metadata tags + recency
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
  metadata JSONB,                        -- {topic, sentiment, mentioned_users, importance}

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,

  -- Constraints (immutable once created - prevents accidental deletion)
  CONSTRAINT no_manual_delete CHECK (created_at IS NOT NULL),
  CONSTRAINT content_not_empty CHECK (LENGTH(content) > 0)
);

-- ==============================================================================
-- TIER 3: Agent Workspaces (User's agent-generated files)
-- ==============================================================================
-- Purpose: Store files generated by agents (code, documents, media)
-- Protection: User-owned, persists across app updates
-- Storage: Binary content with metadata
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
  metadata JSONB,                        -- {file_type, size_bytes, encoding, mime_type}

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,

  -- Constraints
  CONSTRAINT unique_user_agent_file UNIQUE(user_id, agent_name, file_path),
  CONSTRAINT file_path_not_empty CHECK (LENGTH(file_path) > 0)
);

-- ==============================================================================
-- Avi State (Single row for orchestrator state)
-- ==============================================================================
-- Purpose: Persistent state for Avi DM orchestrator
-- Usage: Survives graceful restarts, tracks context size
-- Constraint: Only one row allowed (id = 1)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS avi_state (
  -- Primary Key (only one row allowed)
  id INTEGER PRIMARY KEY DEFAULT 1,

  -- Feed tracking
  last_feed_position VARCHAR(100),      -- Last processed post ID

  -- Work queue state
  pending_tickets JSONB,                 -- Array of pending work ticket IDs

  -- Context management
  context_size INTEGER DEFAULT 0 NOT NULL,
  last_restart TIMESTAMP,
  uptime_seconds INTEGER DEFAULT 0 NOT NULL,

  -- Health status (added from 002_phase2_avi_state.sql)
  status VARCHAR(50),                    -- initializing, running, restarting, stopped
  start_time TIMESTAMP,
  tickets_processed INTEGER DEFAULT 0 NOT NULL,
  workers_spawned INTEGER DEFAULT 0 NOT NULL,
  active_workers INTEGER DEFAULT 0 NOT NULL,
  last_health_check TIMESTAMP,
  last_error TEXT,

  -- Metadata
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,

  -- Constraints (single row enforcement)
  CONSTRAINT single_row CHECK (id = 1),
  CONSTRAINT valid_context_size CHECK (context_size >= 0),
  CONSTRAINT valid_counters CHECK (
    tickets_processed >= 0 AND
    workers_spawned >= 0 AND
    active_workers >= 0
  )
);

-- ==============================================================================
-- Work Queue (Orchestrator ticket system)
-- ==============================================================================
-- Purpose: Queue of work tickets for agent workers
-- Lifecycle: Created by Avi → Assigned to worker → Completed/Failed
-- Priority: Higher priority processed first
-- ==============================================================================

CREATE TABLE IF NOT EXISTS work_queue (
  -- Primary Key
  id SERIAL PRIMARY KEY,

  -- Ticket identification
  ticket_id VARCHAR(100) UNIQUE NOT NULL,

  -- Assignment
  user_id VARCHAR(100) NOT NULL,
  assigned_agent VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',  -- pending, assigned, processing, completed, failed

  -- Post context
  post_id VARCHAR(100) NOT NULL,
  post_content TEXT NOT NULL,
  post_author VARCHAR(100),
  post_metadata JSONB,                   -- {platform, mentions, hashtags, etc.}

  -- Relevant memories for context
  relevant_memories JSONB,               -- Array of memory objects

  -- Priority and scheduling
  priority INTEGER DEFAULT 0 NOT NULL,   -- Higher = more urgent
  retry_count INTEGER DEFAULT 0 NOT NULL,
  max_retries INTEGER DEFAULT 3 NOT NULL,

  -- Worker tracking
  worker_id VARCHAR(100),                -- ID of agent worker processing this
  assigned_at TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,

  -- Error handling
  last_error TEXT,
  error_context JSONB,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,

  -- Constraints
  CONSTRAINT valid_status CHECK (status IN ('pending', 'assigned', 'processing', 'completed', 'failed')),
  CONSTRAINT valid_priority CHECK (priority >= 0),
  CONSTRAINT valid_retry_count CHECK (retry_count >= 0 AND retry_count <= max_retries),
  CONSTRAINT post_content_not_empty CHECK (LENGTH(post_content) > 0)
);

-- ==============================================================================
-- Error Log (Error tracking)
-- ==============================================================================
-- Purpose: Track errors for debugging and retry logic
-- Usage: Created on agent failures, updated on retries
-- Retention: Can be purged after resolution
-- ==============================================================================

CREATE TABLE IF NOT EXISTS error_log (
  -- Primary Key
  id SERIAL PRIMARY KEY,

  -- Error information
  agent_name VARCHAR(50),
  error_type VARCHAR(50) NOT NULL,
  error_message TEXT NOT NULL,
  context JSONB,                         -- {ticket_id, user_id, error_stack, request_data}

  -- Retry tracking
  retry_count INTEGER DEFAULT 0 NOT NULL,
  resolved BOOLEAN DEFAULT FALSE NOT NULL,
  resolved_at TIMESTAMP,
  resolution_notes TEXT,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,

  -- Constraints
  CONSTRAINT valid_retry_count CHECK (retry_count >= 0),
  CONSTRAINT error_message_not_empty CHECK (LENGTH(error_message) > 0)
);

-- ==============================================================================
-- Indexes for Performance
-- ==============================================================================
-- Optimized for the query patterns described in AVI-ARCHITECTURE-PLAN.md
-- ==============================================================================

-- TIER 1: system_agent_templates indexes
CREATE INDEX IF NOT EXISTS idx_system_templates_version ON system_agent_templates(version DESC);

-- TIER 2: user_agent_customizations indexes
CREATE INDEX IF NOT EXISTS idx_user_customizations_user_id ON user_agent_customizations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_customizations_template ON user_agent_customizations(agent_template);
CREATE INDEX IF NOT EXISTS idx_user_customizations_enabled ON user_agent_customizations(enabled) WHERE enabled = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_customizations_user_template ON user_agent_customizations(user_id, agent_template, enabled);

-- TIER 3: agent_memories indexes
-- Primary query pattern: Get recent memories for user + agent, optionally filtered by metadata
CREATE INDEX IF NOT EXISTS idx_memories_user_agent_recency ON agent_memories(user_id, agent_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memories_user_recency ON agent_memories(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memories_agent_recency ON agent_memories(agent_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memories_post_id ON agent_memories(post_id) WHERE post_id IS NOT NULL;

-- GIN index for JSONB metadata queries (topic matching, sentiment filtering)
CREATE INDEX IF NOT EXISTS idx_memories_metadata ON agent_memories USING GIN(metadata);

-- TIER 3: agent_workspaces indexes
CREATE INDEX IF NOT EXISTS idx_workspaces_user_agent ON agent_workspaces(user_id, agent_name);
CREATE INDEX IF NOT EXISTS idx_workspaces_file_path ON agent_workspaces(file_path);
CREATE INDEX IF NOT EXISTS idx_workspaces_updated ON agent_workspaces(updated_at DESC);

-- GIN index for workspace metadata
CREATE INDEX IF NOT EXISTS idx_workspaces_metadata ON agent_workspaces USING GIN(metadata);

-- avi_state: No indexes needed (single row table)

-- work_queue indexes
-- Primary query patterns: Get pending tickets by priority, track assigned workers
CREATE INDEX IF NOT EXISTS idx_work_queue_status_priority ON work_queue(status, priority DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_work_queue_user_status ON work_queue(user_id, status);
CREATE INDEX IF NOT EXISTS idx_work_queue_agent_status ON work_queue(assigned_agent, status);
CREATE INDEX IF NOT EXISTS idx_work_queue_worker ON work_queue(worker_id) WHERE worker_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_work_queue_ticket_id ON work_queue(ticket_id);
CREATE INDEX IF NOT EXISTS idx_work_queue_post_id ON work_queue(post_id);
CREATE INDEX IF NOT EXISTS idx_work_queue_created ON work_queue(created_at DESC);

-- Partial index for active tickets (pending, assigned, processing)
CREATE INDEX IF NOT EXISTS idx_work_queue_active ON work_queue(status, priority DESC)
  WHERE status IN ('pending', 'assigned', 'processing');

-- error_log indexes
CREATE INDEX IF NOT EXISTS idx_error_log_agent ON error_log(agent_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_log_type ON error_log(error_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_log_unresolved ON error_log(resolved, created_at DESC) WHERE resolved = FALSE;
CREATE INDEX IF NOT EXISTS idx_error_log_created ON error_log(created_at DESC);

-- GIN index for error context
CREATE INDEX IF NOT EXISTS idx_error_log_context ON error_log USING GIN(context);

-- ==============================================================================
-- Table Comments (Documentation)
-- ==============================================================================

COMMENT ON TABLE system_agent_templates IS 'TIER 1: Immutable system agent templates - version controlled, updated only via migrations. Seeded from /config/system/agent-templates/*.json';

COMMENT ON TABLE user_agent_customizations IS 'TIER 2: User-specific agent customizations - users can only modify personality, interests, and response_style. System rules always override user customizations.';

COMMENT ON TABLE agent_memories IS 'TIER 3: User conversation history - immutable once created, backed up daily. Retrieved by user_id + agent_name + metadata tags + recency.';

COMMENT ON TABLE agent_workspaces IS 'TIER 3: User agent-generated files - persistent across app updates, user-owned data.';

COMMENT ON TABLE avi_state IS 'Avi orchestrator state - single row (id=1), tracks feed position, context size, and health status. Survives graceful restarts.';

COMMENT ON TABLE work_queue IS 'Orchestrator work queue - tickets for agent workers. Created by Avi DM, processed by ephemeral workers. Priority-based processing.';

COMMENT ON TABLE error_log IS 'Error tracking - stores agent errors for debugging and retry logic. Can be purged after resolution.';

-- Column comments for system_agent_templates
COMMENT ON COLUMN system_agent_templates.model IS 'Claude model override (NULL = use AGENT_MODEL env var, e.g., claude-sonnet-4-5-20250929)';
COMMENT ON COLUMN system_agent_templates.posting_rules IS 'Protected: {max_length, min_interval_seconds, rate_limit_per_hour, prohibited_words[]}';
COMMENT ON COLUMN system_agent_templates.api_schema IS 'Protected: {platform, endpoints{}, auth_type}';
COMMENT ON COLUMN system_agent_templates.safety_constraints IS 'Protected: {content_filters[], max_mentions_per_post, requires_human_review[]}';
COMMENT ON COLUMN system_agent_templates.default_personality IS 'Default personality template - users can override this';
COMMENT ON COLUMN system_agent_templates.default_response_style IS 'Default style: {tone, length, use_emojis} - users can override';

-- Column comments for user_agent_customizations
COMMENT ON COLUMN user_agent_customizations.personality IS 'User override for agent personality (max 5000 chars)';
COMMENT ON COLUMN user_agent_customizations.interests IS 'User-defined topics of interest as JSONB array (max 50 items recommended)';
COMMENT ON COLUMN user_agent_customizations.response_style IS 'User preferences: {tone, length, use_emojis}';
COMMENT ON COLUMN user_agent_customizations.enabled IS 'Whether this customization is active. Allows users to disable agents without deleting them.';

-- Column comments for agent_memories
COMMENT ON COLUMN agent_memories.metadata IS 'JSONB: {topic, sentiment, mentioned_users, importance} for retrieval and filtering';
COMMENT ON COLUMN agent_memories.post_id IS 'Reference to the post that created this memory (nullable for non-post memories)';

-- Column comments for agent_workspaces
COMMENT ON COLUMN agent_workspaces.metadata IS 'JSONB: {file_type, size_bytes, encoding, mime_type}';
COMMENT ON COLUMN agent_workspaces.content IS 'Binary file content. Can be large, consider external storage for files > 1MB.';

-- Column comments for avi_state
COMMENT ON COLUMN avi_state.context_size IS 'Current token count in Avi orchestrator context. Trigger graceful restart at 50K tokens.';
COMMENT ON COLUMN avi_state.pending_tickets IS 'JSONB array of pending work ticket IDs for recovery after restart';
COMMENT ON COLUMN avi_state.status IS 'Current orchestrator status: initializing, running, restarting, stopped';

-- Column comments for work_queue
COMMENT ON COLUMN work_queue.status IS 'Ticket status: pending, assigned, processing, completed, failed';
COMMENT ON COLUMN work_queue.priority IS 'Priority level (higher = more urgent). 0 = normal, 10 = high, 100 = critical';
COMMENT ON COLUMN work_queue.relevant_memories IS 'JSONB array of memory objects loaded from agent_memories table';
COMMENT ON COLUMN work_queue.post_metadata IS 'JSONB: {platform, mentions[], hashtags[], media_urls[], reply_to_id}';

-- Column comments for error_log
COMMENT ON COLUMN error_log.context IS 'JSONB: {ticket_id, user_id, error_stack, request_data, retry_strategy}';
COMMENT ON COLUMN error_log.resolved IS 'Whether the error has been resolved (successful retry or manual intervention)';

-- ==============================================================================
-- Initial Data
-- ==============================================================================

-- Initialize avi_state with single row (if not exists)
INSERT INTO avi_state (id, status, context_size)
VALUES (1, 'initializing', 0)
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- ==============================================================================
-- Query Examples (from AVI-ARCHITECTURE-PLAN.md)
-- ==============================================================================

-- Get system template
-- SELECT * FROM system_agent_templates WHERE name = 'tech-guru';

-- Get user customization
-- SELECT * FROM user_agent_customizations
-- WHERE user_id = 'user123' AND agent_template = 'tech-guru' AND enabled = TRUE;

-- Store memory
-- INSERT INTO agent_memories (user_id, agent_name, post_id, content, metadata)
-- VALUES ('user123', 'tech-guru', 'post456', 'User asked about AI trends',
--         '{"topic": "AI", "sentiment": "curious"}');

-- Retrieve relevant memories (recency + metadata)
-- SELECT content, metadata, created_at
-- FROM agent_memories
-- WHERE user_id = 'user123'
--   AND agent_name = 'tech-guru'
--   AND (metadata @> '{"topic": "AI"}' OR created_at > NOW() - INTERVAL '7 days')
-- ORDER BY created_at DESC
-- LIMIT 5;

-- Get pending work tickets by priority
-- SELECT * FROM work_queue
-- WHERE status = 'pending'
-- ORDER BY priority DESC, created_at ASC
-- LIMIT 10;

-- Update Avi state
-- UPDATE avi_state
-- SET last_feed_position = 'post789',
--     context_size = 2500,
--     active_workers = 3,
--     updated_at = NOW()
-- WHERE id = 1;

-- Log error
-- INSERT INTO error_log (agent_name, error_type, error_message, context, retry_count)
-- VALUES ('tech-guru', 'api_error', 'Rate limit exceeded',
--         '{"ticket_id": "ticket123", "user_id": "user123"}', 0);

-- ==============================================================================
-- End of Schema
-- ==============================================================================
