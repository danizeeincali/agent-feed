-- Migration 009: Add Activity Tracking Tables
-- Date: 2025-10-26
-- Purpose: Implement telemetry tracking for Claude Code SDK activity monitoring
--          Based on SPARC-LIVE-ACTIVITY-ENHANCEMENT-ARCHITECTURE.md

-- Enable performance optimizations
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA cache_size = -64000; -- 64MB cache
PRAGMA temp_store = MEMORY;

-- ============================================================================
-- Table 1: activity_events
-- Purpose: General event log for all SDK activity
-- ============================================================================

CREATE TABLE IF NOT EXISTS activity_events (
  -- Primary Key
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),

  -- Event Classification
  event_type TEXT NOT NULL,  -- 'tool_execution', 'agent_started', 'agent_completed', 'progress_update'
  session_id TEXT NOT NULL,
  agent_id TEXT,

  -- Tool Information
  tool_name TEXT,
  action TEXT,               -- Sanitized action description (max 200 chars)
  status TEXT NOT NULL,      -- 'started', 'success', 'failed'

  -- Performance Metrics
  duration INTEGER,          -- Milliseconds
  timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Additional Context (JSON)
  metadata JSON,             -- { block_id, message_uuid, file_path, output_size, etc. }

  -- Constraints
  CHECK (event_type IN ('tool_execution', 'agent_started', 'agent_completed', 'progress_update')),
  CHECK (status IN ('started', 'success', 'failed'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_session_time
  ON activity_events(session_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_events_type_time
  ON activity_events(event_type, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_events_tool_time
  ON activity_events(tool_name, timestamp DESC)
  WHERE tool_name IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_events_status
  ON activity_events(status, timestamp DESC);

-- ============================================================================
-- Table 2: agent_executions
-- Purpose: Agent-level execution tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS agent_executions (
  -- Primary Key
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),

  -- Session & Agent Info
  session_id TEXT NOT NULL,
  agent_type TEXT NOT NULL,   -- 'coder', 'researcher', 'tester', etc.
  status TEXT NOT NULL,        -- 'running', 'completed', 'failed'

  -- Execution Details
  prompt TEXT,                 -- Truncated to 200 chars
  model TEXT NOT NULL,         -- 'claude-sonnet-4-20250514'

  -- Timing
  start_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  end_time DATETIME,
  duration INTEGER,            -- Milliseconds (calculated on completion)

  -- Token & Cost Tracking
  tokens_used INTEGER,
  cost REAL,                   -- USD

  -- Error Handling
  error TEXT,                  -- Error message if failed

  -- Constraints
  CHECK (status IN ('running', 'completed', 'failed')),
  CHECK (duration IS NULL OR duration >= 0),
  CHECK (tokens_used IS NULL OR tokens_used >= 0),
  CHECK (cost IS NULL OR cost >= 0)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agents_session
  ON agent_executions(session_id, start_time DESC);

CREATE INDEX IF NOT EXISTS idx_agents_status
  ON agent_executions(status, start_time DESC);

CREATE INDEX IF NOT EXISTS idx_agents_type
  ON agent_executions(agent_type, start_time DESC);

-- ============================================================================
-- Table 3: tool_executions
-- Purpose: Tool-level execution tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS tool_executions (
  -- Primary Key
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),

  -- Session & Agent Context
  session_id TEXT NOT NULL,
  agent_id TEXT,               -- Reference to agent_executions.id

  -- Tool Information
  tool_name TEXT NOT NULL,     -- 'Bash', 'Read', 'Write', etc.
  action TEXT,                 -- Truncated action description
  status TEXT NOT NULL,        -- 'success', 'failed'

  -- Performance Metrics
  duration INTEGER NOT NULL,   -- Milliseconds
  output_size INTEGER,         -- Bytes (for Read/Write operations)

  -- File Operations
  file_path TEXT,              -- Sanitized file path (for file operations)

  -- Error Handling
  error TEXT,                  -- Error message if failed

  -- Timing
  timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  CHECK (status IN ('success', 'failed')),
  CHECK (duration >= 0),
  CHECK (output_size IS NULL OR output_size >= 0),

  -- Foreign Key
  FOREIGN KEY (agent_id) REFERENCES agent_executions(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tools_session
  ON tool_executions(session_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_tools_agent
  ON tool_executions(agent_id, timestamp DESC)
  WHERE agent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tools_name_time
  ON tool_executions(tool_name, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_tools_status
  ON tool_executions(status, timestamp DESC);

-- ============================================================================
-- Table 4: session_metrics
-- Purpose: Aggregated session-level metrics
-- ============================================================================

CREATE TABLE IF NOT EXISTS session_metrics (
  -- Primary Key
  session_id TEXT PRIMARY KEY,

  -- Timing
  start_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  end_time DATETIME,
  duration INTEGER,            -- Milliseconds

  -- Activity Counts
  request_count INTEGER DEFAULT 0 NOT NULL,
  total_tokens INTEGER DEFAULT 0 NOT NULL,
  total_cost REAL DEFAULT 0.0 NOT NULL,
  agent_count INTEGER DEFAULT 0 NOT NULL,
  tool_count INTEGER DEFAULT 0 NOT NULL,
  error_count INTEGER DEFAULT 0 NOT NULL,

  -- Status
  status TEXT,                 -- 'active', 'completed', 'failed'

  -- Constraints
  CHECK (request_count >= 0),
  CHECK (total_tokens >= 0),
  CHECK (total_cost >= 0),
  CHECK (agent_count >= 0),
  CHECK (tool_count >= 0),
  CHECK (error_count >= 0),
  CHECK (status IN ('active', 'completed', 'failed'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_session_start_time
  ON session_metrics(start_time DESC);

CREATE INDEX IF NOT EXISTS idx_session_status
  ON session_metrics(status, start_time DESC);

-- Verify migration completed
SELECT 'Migration 009 complete: Added activity_events, agent_executions, tool_executions, and session_metrics tables' as message;
