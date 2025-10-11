-- ==============================================================================
-- Phase 1: Database Indexes
-- ==============================================================================
-- Performance indexes for all 6 tables
-- Uses GIN indexes for JSONB columns (jsonb_path_ops for 60% smaller size)
-- ==============================================================================

BEGIN;

-- ==============================================================================
-- TIER 1: system_agent_templates indexes
-- ==============================================================================

-- Primary key (name) already has implicit index

-- Index on version for version queries
CREATE INDEX IF NOT EXISTS idx_system_agent_templates_version
  ON system_agent_templates(version);

-- ==============================================================================
-- TIER 2: user_agent_customizations indexes
-- ==============================================================================

-- Index on user_id for user-specific queries
CREATE INDEX IF NOT EXISTS idx_user_agent_customizations_user_id
  ON user_agent_customizations(user_id);

-- Index on agent_template for template-specific queries
CREATE INDEX IF NOT EXISTS idx_user_agent_customizations_agent_template
  ON user_agent_customizations(agent_template);

-- Composite index for user + template + enabled queries
CREATE INDEX IF NOT EXISTS idx_user_agent_customizations_user_template_enabled
  ON user_agent_customizations(user_id, agent_template, enabled);

-- GIN index on interests JSONB (using jsonb_path_ops for containment queries)
CREATE INDEX IF NOT EXISTS idx_user_agent_customizations_interests
  ON user_agent_customizations USING gin (interests jsonb_path_ops);

-- GIN index on response_style JSONB (using jsonb_path_ops)
CREATE INDEX IF NOT EXISTS idx_user_agent_customizations_response_style
  ON user_agent_customizations USING gin (response_style jsonb_path_ops);

-- ==============================================================================
-- TIER 3: agent_memories indexes
-- ==============================================================================

-- Composite index for user + agent + recency queries (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_agent_memories_user_agent_recency
  ON agent_memories(user_id, agent_name, created_at DESC);

-- Index on agent_name for agent-specific queries
CREATE INDEX IF NOT EXISTS idx_agent_memories_agent_name
  ON agent_memories(agent_name);

-- Index on post_id for post-specific queries
CREATE INDEX IF NOT EXISTS idx_agent_memories_post_id
  ON agent_memories(post_id)
  WHERE post_id IS NOT NULL;

-- GIN index on metadata JSONB (using jsonb_path_ops for containment queries)
-- This supports queries like: WHERE metadata @> '{"topic": "AI"}'
CREATE INDEX IF NOT EXISTS idx_agent_memories_metadata
  ON agent_memories USING gin (metadata jsonb_path_ops);

-- Expression index for topic metadata queries (if frequently queried)
CREATE INDEX IF NOT EXISTS idx_agent_memories_metadata_topic
  ON agent_memories((metadata->>'topic'))
  WHERE metadata IS NOT NULL;

-- ==============================================================================
-- TIER 3: agent_workspaces indexes
-- ==============================================================================

-- Composite index for user + agent queries (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_agent_workspaces_user_agent
  ON agent_workspaces(user_id, agent_name);

-- Index on agent_name for agent-specific queries
CREATE INDEX IF NOT EXISTS idx_agent_workspaces_agent_name
  ON agent_workspaces(agent_name);

-- Index on file_path for file-specific queries
CREATE INDEX IF NOT EXISTS idx_agent_workspaces_file_path
  ON agent_workspaces(file_path);

-- GIN index on metadata JSONB (using jsonb_path_ops)
CREATE INDEX IF NOT EXISTS idx_agent_workspaces_metadata
  ON agent_workspaces USING gin (metadata jsonb_path_ops);

-- Expression index for file_type metadata queries
CREATE INDEX IF NOT EXISTS idx_agent_workspaces_metadata_file_type
  ON agent_workspaces((metadata->>'file_type'))
  WHERE metadata IS NOT NULL;

-- ==============================================================================
-- avi_state indexes
-- ==============================================================================

-- No additional indexes needed (single row table with id=1 primary key)

-- ==============================================================================
-- error_log indexes
-- ==============================================================================

-- Index on agent_name for agent-specific error queries
CREATE INDEX IF NOT EXISTS idx_error_log_agent_name
  ON error_log(agent_name)
  WHERE agent_name IS NOT NULL;

-- Index on error_type for error type queries
CREATE INDEX IF NOT EXISTS idx_error_log_error_type
  ON error_log(error_type)
  WHERE error_type IS NOT NULL;

-- Index on resolved status for unresolved errors
CREATE INDEX IF NOT EXISTS idx_error_log_resolved
  ON error_log(resolved);

-- Composite index for recent unresolved errors (common monitoring query)
CREATE INDEX IF NOT EXISTS idx_error_log_resolved_created_at
  ON error_log(resolved, created_at DESC);

-- GIN index on context JSONB (using jsonb_path_ops)
CREATE INDEX IF NOT EXISTS idx_error_log_context
  ON error_log USING gin (context jsonb_path_ops);

-- Expression index for user_id in context
CREATE INDEX IF NOT EXISTS idx_error_log_context_user_id
  ON error_log((context->>'user_id'))
  WHERE context IS NOT NULL;

-- ==============================================================================
-- Index Comments
-- ==============================================================================

COMMENT ON INDEX idx_agent_memories_user_agent_recency IS 'Optimizes memory retrieval: user + agent + recent first';
COMMENT ON INDEX idx_agent_memories_metadata IS 'GIN index for JSONB containment queries (jsonb_path_ops for 60% smaller size)';
COMMENT ON INDEX idx_agent_workspaces_metadata IS 'GIN index for JSONB containment queries on workspace metadata';
COMMENT ON INDEX idx_user_agent_customizations_interests IS 'GIN index for JSONB containment queries on user interests';
COMMENT ON INDEX idx_error_log_resolved_created_at IS 'Optimizes monitoring queries for recent unresolved errors';

-- ==============================================================================
-- Performance Notes
-- ==============================================================================
-- 1. jsonb_path_ops used instead of jsonb_ops for 60% smaller indexes
-- 2. jsonb_path_ops only supports @>, @?, @@ operators (containment queries)
-- 3. If key existence (?) or other operators needed, use jsonb_ops instead
-- 4. Partial indexes (WHERE clauses) reduce index size for optional columns
-- 5. Expression indexes speed up specific JSON path queries
-- 6. Composite indexes follow query patterns (user_id, agent_name, created_at)
-- ==============================================================================

COMMIT;
