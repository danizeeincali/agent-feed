-- ==============================================================================
-- Migration 010: AVI 3-Tier Architecture Tables
-- ==============================================================================
-- Description: Creates complete 3-tier data protection schema for AVI system
-- Author: AVI Architecture Team
-- Date: 2025-10-10
-- Dependencies: None (creates all tables if not exist)
-- Rollback: See rollback instructions at bottom of file
-- ==============================================================================
-- Tables created:
--   - system_agent_templates (TIER 1: System)
--   - user_agent_customizations (TIER 2: User customizations)
--   - agent_memories (TIER 3: User data)
--   - agent_workspaces (TIER 3: User data)
--   - avi_state (Orchestrator state)
--   - work_queue (Ticket system)
--   - error_log (Error tracking)
-- ==============================================================================

BEGIN;

-- ==============================================================================
-- TIER 1: System Agent Templates
-- ==============================================================================

CREATE TABLE IF NOT EXISTS system_agent_templates (
  name VARCHAR(50) PRIMARY KEY,
  version INTEGER NOT NULL,
  model VARCHAR(100),
  posting_rules JSONB NOT NULL,
  api_schema JSONB NOT NULL,
  safety_constraints JSONB NOT NULL,
  default_personality TEXT,
  default_response_style JSONB,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  CONSTRAINT system_only CHECK (version > 0),
  CONSTRAINT valid_posting_rules CHECK (posting_rules ? 'max_length'),
  CONSTRAINT valid_api_schema CHECK (api_schema ? 'platform'),
  CONSTRAINT valid_safety_constraints CHECK (safety_constraints ? 'content_filters')
);

-- ==============================================================================
-- TIER 2: User Agent Customizations
-- ==============================================================================

CREATE TABLE IF NOT EXISTS user_agent_customizations (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(100) NOT NULL,
  agent_template VARCHAR(50) NOT NULL,
  custom_name VARCHAR(100),
  personality TEXT,
  interests JSONB,
  response_style JSONB,
  enabled BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  CONSTRAINT personality_length CHECK (personality IS NULL OR LENGTH(personality) <= 5000),
  CONSTRAINT interests_array CHECK (interests IS NULL OR jsonb_typeof(interests) = 'array'),
  CONSTRAINT unique_user_template UNIQUE(user_id, agent_template)
);

-- Add foreign key constraint only if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'system_agent_templates') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'user_agent_customizations_agent_template_fkey'
    ) THEN
      ALTER TABLE user_agent_customizations
        ADD CONSTRAINT user_agent_customizations_agent_template_fkey
        FOREIGN KEY (agent_template)
        REFERENCES system_agent_templates(name)
        ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- ==============================================================================
-- TIER 3: Agent Memories
-- ==============================================================================

CREATE TABLE IF NOT EXISTS agent_memories (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(100) NOT NULL,
  agent_name VARCHAR(50) NOT NULL,
  post_id VARCHAR(100),
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  CONSTRAINT no_manual_delete CHECK (created_at IS NOT NULL),
  CONSTRAINT content_not_empty CHECK (LENGTH(content) > 0)
);

-- ==============================================================================
-- TIER 3: Agent Workspaces
-- ==============================================================================

CREATE TABLE IF NOT EXISTS agent_workspaces (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(100) NOT NULL,
  agent_name VARCHAR(100) NOT NULL,
  file_path TEXT NOT NULL,
  content BYTEA,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  CONSTRAINT unique_user_agent_file UNIQUE(user_id, agent_name, file_path),
  CONSTRAINT file_path_not_empty CHECK (LENGTH(file_path) > 0)
);

-- ==============================================================================
-- Avi State (Enhanced with Phase 2 columns)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS avi_state (
  id INTEGER PRIMARY KEY DEFAULT 1,
  last_feed_position VARCHAR(100),
  pending_tickets JSONB,
  context_size INTEGER DEFAULT 0 NOT NULL,
  last_restart TIMESTAMP,
  uptime_seconds INTEGER DEFAULT 0 NOT NULL,
  status VARCHAR(50),
  start_time TIMESTAMP,
  tickets_processed INTEGER DEFAULT 0 NOT NULL,
  workers_spawned INTEGER DEFAULT 0 NOT NULL,
  active_workers INTEGER DEFAULT 0 NOT NULL,
  last_health_check TIMESTAMP,
  last_error TEXT,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  CONSTRAINT single_row CHECK (id = 1),
  CONSTRAINT valid_context_size CHECK (context_size >= 0),
  CONSTRAINT valid_counters CHECK (
    tickets_processed >= 0 AND
    workers_spawned >= 0 AND
    active_workers >= 0
  )
);

-- Add missing columns to avi_state if table exists
DO $$
BEGIN
  -- Add status column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'avi_state' AND column_name = 'status'
  ) THEN
    ALTER TABLE avi_state ADD COLUMN status VARCHAR(50);
  END IF;

  -- Add start_time column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'avi_state' AND column_name = 'start_time'
  ) THEN
    ALTER TABLE avi_state ADD COLUMN start_time TIMESTAMP;
  END IF;

  -- Add tickets_processed column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'avi_state' AND column_name = 'tickets_processed'
  ) THEN
    ALTER TABLE avi_state ADD COLUMN tickets_processed INTEGER DEFAULT 0 NOT NULL;
  END IF;

  -- Add workers_spawned column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'avi_state' AND column_name = 'workers_spawned'
  ) THEN
    ALTER TABLE avi_state ADD COLUMN workers_spawned INTEGER DEFAULT 0 NOT NULL;
  END IF;

  -- Add active_workers column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'avi_state' AND column_name = 'active_workers'
  ) THEN
    ALTER TABLE avi_state ADD COLUMN active_workers INTEGER DEFAULT 0 NOT NULL;
  END IF;

  -- Add last_health_check column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'avi_state' AND column_name = 'last_health_check'
  ) THEN
    ALTER TABLE avi_state ADD COLUMN last_health_check TIMESTAMP;
  END IF;

  -- Add last_error column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'avi_state' AND column_name = 'last_error'
  ) THEN
    ALTER TABLE avi_state ADD COLUMN last_error TEXT;
  END IF;

  -- Add updated_at column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'avi_state' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE avi_state ADD COLUMN updated_at TIMESTAMP DEFAULT NOW() NOT NULL;
  END IF;
END $$;

-- ==============================================================================
-- Work Queue (NEW TABLE)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS work_queue (
  id SERIAL PRIMARY KEY,
  ticket_id VARCHAR(100) UNIQUE NOT NULL,
  user_id VARCHAR(100) NOT NULL,
  assigned_agent VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  post_id VARCHAR(100) NOT NULL,
  post_content TEXT NOT NULL,
  post_author VARCHAR(100),
  post_metadata JSONB,
  relevant_memories JSONB,
  priority INTEGER DEFAULT 0 NOT NULL,
  retry_count INTEGER DEFAULT 0 NOT NULL,
  max_retries INTEGER DEFAULT 3 NOT NULL,
  worker_id VARCHAR(100),
  assigned_at TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  last_error TEXT,
  error_context JSONB,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  CONSTRAINT valid_status CHECK (status IN ('pending', 'assigned', 'processing', 'completed', 'failed')),
  CONSTRAINT valid_priority CHECK (priority >= 0),
  CONSTRAINT valid_retry_count CHECK (retry_count >= 0 AND retry_count <= max_retries),
  CONSTRAINT post_content_not_empty CHECK (LENGTH(post_content) > 0)
);

-- ==============================================================================
-- Error Log
-- ==============================================================================

CREATE TABLE IF NOT EXISTS error_log (
  id SERIAL PRIMARY KEY,
  agent_name VARCHAR(50),
  error_type VARCHAR(50) NOT NULL,
  error_message TEXT NOT NULL,
  context JSONB,
  retry_count INTEGER DEFAULT 0 NOT NULL,
  resolved BOOLEAN DEFAULT FALSE NOT NULL,
  resolved_at TIMESTAMP,
  resolution_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  CONSTRAINT valid_retry_count CHECK (retry_count >= 0),
  CONSTRAINT error_message_not_empty CHECK (LENGTH(error_message) > 0)
);

-- Add missing columns to error_log if table exists
DO $$
BEGIN
  -- Add resolved_at column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'error_log' AND column_name = 'resolved_at'
  ) THEN
    ALTER TABLE error_log ADD COLUMN resolved_at TIMESTAMP;
  END IF;

  -- Add resolution_notes column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'error_log' AND column_name = 'resolution_notes'
  ) THEN
    ALTER TABLE error_log ADD COLUMN resolution_notes TEXT;
  END IF;
END $$;

-- ==============================================================================
-- Indexes (Created with CONCURRENTLY for zero-downtime)
-- ==============================================================================
-- Note: CREATE INDEX CONCURRENTLY cannot run inside a transaction block
-- These will be created after the COMMIT
-- ==============================================================================

COMMIT;

-- ==============================================================================
-- Indexes (Outside transaction for CONCURRENTLY)
-- ==============================================================================

-- TIER 1: system_agent_templates
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_system_templates_version
  ON system_agent_templates(version DESC);

-- TIER 2: user_agent_customizations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_customizations_user_id
  ON user_agent_customizations(user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_customizations_template
  ON user_agent_customizations(agent_template);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_customizations_enabled
  ON user_agent_customizations(enabled) WHERE enabled = TRUE;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_customizations_user_template
  ON user_agent_customizations(user_id, agent_template, enabled);

-- TIER 3: agent_memories
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_memories_user_agent_recency
  ON agent_memories(user_id, agent_name, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_memories_user_recency
  ON agent_memories(user_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_memories_agent_recency
  ON agent_memories(agent_name, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_memories_post_id
  ON agent_memories(post_id) WHERE post_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_memories_metadata
  ON agent_memories USING GIN(metadata);

-- TIER 3: agent_workspaces
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workspaces_user_agent
  ON agent_workspaces(user_id, agent_name);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workspaces_file_path
  ON agent_workspaces(file_path);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workspaces_updated
  ON agent_workspaces(updated_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workspaces_metadata
  ON agent_workspaces USING GIN(metadata);

-- work_queue
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_work_queue_status_priority
  ON work_queue(status, priority DESC, created_at ASC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_work_queue_user_status
  ON work_queue(user_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_work_queue_agent_status
  ON work_queue(assigned_agent, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_work_queue_worker
  ON work_queue(worker_id) WHERE worker_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_work_queue_ticket_id
  ON work_queue(ticket_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_work_queue_post_id
  ON work_queue(post_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_work_queue_created
  ON work_queue(created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_work_queue_active
  ON work_queue(status, priority DESC)
  WHERE status IN ('pending', 'assigned', 'processing');

-- error_log
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_error_log_agent
  ON error_log(agent_name, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_error_log_type
  ON error_log(error_type, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_error_log_unresolved
  ON error_log(resolved, created_at DESC) WHERE resolved = FALSE;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_error_log_created
  ON error_log(created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_error_log_context
  ON error_log USING GIN(context);

-- ==============================================================================
-- Table and Column Comments
-- ==============================================================================

BEGIN;

COMMENT ON TABLE system_agent_templates IS 'TIER 1: Immutable system agent templates - version controlled, updated only via migrations';
COMMENT ON TABLE user_agent_customizations IS 'TIER 2: User-specific agent customizations - personality, interests, response_style only';
COMMENT ON TABLE agent_memories IS 'TIER 3: User conversation history - immutable once created, backed up daily';
COMMENT ON TABLE agent_workspaces IS 'TIER 3: User agent-generated files - persistent across app updates';
COMMENT ON TABLE avi_state IS 'Avi orchestrator state - single row, tracks feed position and context size';
COMMENT ON TABLE work_queue IS 'Orchestrator work queue - tickets for agent workers';
COMMENT ON TABLE error_log IS 'Error tracking - stores agent errors for debugging and retry logic';

COMMIT;

-- ==============================================================================
-- Initialize Avi State
-- ==============================================================================

BEGIN;

INSERT INTO avi_state (id, status, context_size)
VALUES (1, 'initializing', 0)
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- ==============================================================================
-- Validation Functions
-- ==============================================================================

-- Function to validate user customizations don't contain protected fields
CREATE OR REPLACE FUNCTION validate_user_customization()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate personality length
  IF NEW.personality IS NOT NULL AND LENGTH(NEW.personality) > 5000 THEN
    RAISE EXCEPTION 'Personality text too long (max 5000 characters)';
  END IF;

  -- Validate interests is array
  IF NEW.interests IS NOT NULL AND jsonb_typeof(NEW.interests) != 'array' THEN
    RAISE EXCEPTION 'Interests must be a JSONB array';
  END IF;

  -- Validate interests count
  IF NEW.interests IS NOT NULL AND jsonb_array_length(NEW.interests) > 50 THEN
    RAISE EXCEPTION 'Too many interests (max 50)';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for validation
DROP TRIGGER IF EXISTS trigger_validate_user_customization ON user_agent_customizations;
CREATE TRIGGER trigger_validate_user_customization
  BEFORE INSERT OR UPDATE ON user_agent_customizations
  FOR EACH ROW
  EXECUTE FUNCTION validate_user_customization();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS trigger_update_system_templates_updated_at ON system_agent_templates;
CREATE TRIGGER trigger_update_system_templates_updated_at
  BEFORE UPDATE ON system_agent_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_user_customizations_updated_at ON user_agent_customizations;
CREATE TRIGGER trigger_update_user_customizations_updated_at
  BEFORE UPDATE ON user_agent_customizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_workspaces_updated_at ON agent_workspaces;
CREATE TRIGGER trigger_update_workspaces_updated_at
  BEFORE UPDATE ON agent_workspaces
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_avi_state_updated_at ON avi_state;
CREATE TRIGGER trigger_update_avi_state_updated_at
  BEFORE UPDATE ON avi_state
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_work_queue_updated_at ON work_queue;
CREATE TRIGGER trigger_update_work_queue_updated_at
  BEFORE UPDATE ON work_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- Migration Complete
-- ==============================================================================

-- Verify migration
DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN (
      'system_agent_templates',
      'user_agent_customizations',
      'agent_memories',
      'agent_workspaces',
      'avi_state',
      'work_queue',
      'error_log'
    );

  IF table_count = 7 THEN
    RAISE NOTICE 'Migration 010 completed successfully - all 7 tables created';
  ELSE
    RAISE WARNING 'Migration 010 incomplete - only % of 7 tables created', table_count;
  END IF;
END $$;

-- ==============================================================================
-- ROLLBACK INSTRUCTIONS
-- ==============================================================================
-- To rollback this migration, run the following commands:
-- WARNING: This will delete all AVI data!
--
-- BEGIN;
-- DROP TABLE IF EXISTS work_queue CASCADE;
-- DROP TABLE IF EXISTS error_log CASCADE;
-- DROP TABLE IF EXISTS agent_workspaces CASCADE;
-- DROP TABLE IF EXISTS agent_memories CASCADE;
-- DROP TABLE IF EXISTS user_agent_customizations CASCADE;
-- DROP TABLE IF EXISTS system_agent_templates CASCADE;
-- DROP TABLE IF EXISTS avi_state CASCADE;
-- DROP FUNCTION IF EXISTS validate_user_customization() CASCADE;
-- DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
-- COMMIT;
--
-- Note: TIER 3 data (agent_memories, agent_workspaces) should be backed up
-- before rollback. See AVI-ARCHITECTURE-PLAN.md for backup procedures.
-- ==============================================================================
