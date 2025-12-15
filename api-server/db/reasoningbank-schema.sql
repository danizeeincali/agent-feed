-- ============================================================
-- REASONINGBANK DATABASE SCHEMA v1.0
-- Self-Aware Feedback Loop Algorithm (SAFLA)
-- ============================================================
-- Created: 2025-10-18
-- Purpose: SQLite schema for ReasoningBank learning system
-- Target Performance: <3ms query latency, 87-95% semantic accuracy
-- ============================================================

-- Enable Write-Ahead Logging for better concurrency
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA cache_size = -64000; -- 64MB cache
PRAGMA foreign_keys = ON;
PRAGMA temp_store = MEMORY;
PRAGMA mmap_size = 268435456; -- 256MB memory-mapped I/O
PRAGMA page_size = 4096;

-- ============================================================
-- CORE TABLES
-- ============================================================

-- ============================================================
-- patterns: Core learning storage with semantic embeddings
-- ============================================================
CREATE TABLE IF NOT EXISTS patterns (
  -- Identity
  id TEXT PRIMARY KEY NOT NULL,
  namespace TEXT NOT NULL DEFAULT 'global',
  agent_id TEXT,
  skill_id TEXT,

  -- Content
  content TEXT NOT NULL,
  category TEXT,
  tags TEXT, -- JSON array of tags

  -- Embedding for semantic search (1024-dim float32 vector = 4096 bytes)
  embedding BLOB NOT NULL,

  -- Learning metrics (SAFLA core)
  confidence REAL NOT NULL DEFAULT 0.5 CHECK(confidence >= 0.05 AND confidence <= 0.95),
  success_count INTEGER NOT NULL DEFAULT 0 CHECK(success_count >= 0),
  failure_count INTEGER NOT NULL DEFAULT 0 CHECK(failure_count >= 0),
  total_usage INTEGER NOT NULL DEFAULT 0 CHECK(total_usage >= 0),

  -- Context metadata
  context_type TEXT,
  metadata TEXT, -- JSON blob for flexible storage

  -- Timestamps (Unix epoch milliseconds)
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  last_used_at INTEGER,

  -- Constraints
  CHECK(length(id) > 0),
  CHECK(length(content) > 0),
  CHECK(length(embedding) = 4096), -- 1024 floats × 4 bytes
  CHECK(total_usage = success_count + failure_count)
) STRICT;

-- ============================================================
-- pattern_outcomes: Learning history and confidence tracking
-- ============================================================
CREATE TABLE IF NOT EXISTS pattern_outcomes (
  -- Identity
  id TEXT PRIMARY KEY NOT NULL,
  pattern_id TEXT NOT NULL,

  -- Agent context
  agent_id TEXT NOT NULL,

  -- Outcome data
  outcome TEXT NOT NULL CHECK(outcome IN ('success', 'failure', 'neutral')),
  context TEXT, -- JSON: What was happening during execution

  -- Confidence tracking
  confidence_before REAL NOT NULL CHECK(confidence_before >= 0.05 AND confidence_before <= 0.95),
  confidence_after REAL NOT NULL CHECK(confidence_after >= 0.05 AND confidence_after <= 0.95),

  -- Metadata
  execution_time_ms INTEGER,
  user_feedback TEXT,
  metadata TEXT, -- JSON for additional data

  -- Timestamps
  recorded_at INTEGER NOT NULL,

  -- Foreign keys
  FOREIGN KEY (pattern_id) REFERENCES patterns(id) ON DELETE CASCADE,

  -- Constraints
  CHECK(length(id) > 0),
  CHECK(length(pattern_id) > 0),
  CHECK(length(agent_id) > 0),
  CHECK(execution_time_ms IS NULL OR execution_time_ms >= 0)
) STRICT;

-- ============================================================
-- pattern_relationships: Cross-pattern learning and dependencies
-- ============================================================
CREATE TABLE IF NOT EXISTS pattern_relationships (
  -- Identity
  id TEXT PRIMARY KEY NOT NULL,
  source_pattern_id TEXT NOT NULL,
  target_pattern_id TEXT NOT NULL,

  -- Relationship metadata
  relationship_type TEXT NOT NULL CHECK(
    relationship_type IN ('causes', 'requires', 'conflicts', 'enhances', 'supersedes', 'shared-to', 'promoted-to')
  ),
  strength REAL NOT NULL DEFAULT 0.5 CHECK(strength >= 0.0 AND strength <= 1.0),

  -- Timestamps
  created_at INTEGER NOT NULL,

  -- Foreign keys
  FOREIGN KEY (source_pattern_id) REFERENCES patterns(id) ON DELETE CASCADE,
  FOREIGN KEY (target_pattern_id) REFERENCES patterns(id) ON DELETE CASCADE,

  -- Constraints
  CHECK(length(id) > 0),
  CHECK(source_pattern_id != target_pattern_id),
  UNIQUE(source_pattern_id, target_pattern_id, relationship_type)
) STRICT;

-- ============================================================
-- database_metadata: Version tracking and statistics
-- ============================================================
CREATE TABLE IF NOT EXISTS database_metadata (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
) STRICT;

-- Initialize metadata
INSERT OR IGNORE INTO database_metadata (key, value, updated_at) VALUES
  ('schema_version', '1.0.0', strftime('%s', 'now') * 1000),
  ('created_at', strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
  ('last_migration', 'initial', strftime('%s', 'now') * 1000),
  ('total_patterns_created', '0', strftime('%s', 'now') * 1000),
  ('total_outcomes_recorded', '0', strftime('%s', 'now') * 1000);

-- ============================================================
-- INDEXES: Optimized for <3ms query performance
-- ============================================================

-- Primary query: semantic search by namespace and confidence
CREATE INDEX IF NOT EXISTS idx_patterns_namespace_confidence
  ON patterns(namespace, confidence DESC, last_used_at DESC);

-- High-confidence patterns filter
CREATE INDEX IF NOT EXISTS idx_patterns_confidence_desc
  ON patterns(confidence DESC, total_usage DESC, created_at DESC);

-- Recent activity and recency factor
CREATE INDEX IF NOT EXISTS idx_patterns_last_used
  ON patterns(last_used_at DESC)
  WHERE last_used_at IS NOT NULL;

-- Agent-specific patterns
CREATE INDEX IF NOT EXISTS idx_patterns_agent
  ON patterns(agent_id, confidence DESC)
  WHERE agent_id IS NOT NULL;

-- Skill-specific patterns
CREATE INDEX IF NOT EXISTS idx_patterns_skill
  ON patterns(skill_id, confidence DESC)
  WHERE skill_id IS NOT NULL;

-- Category filtering
CREATE INDEX IF NOT EXISTS idx_patterns_category
  ON patterns(category, namespace, confidence DESC)
  WHERE category IS NOT NULL;

-- Pattern creation timeline
CREATE INDEX IF NOT EXISTS idx_patterns_created
  ON patterns(created_at DESC);

-- Total usage for popularity ranking
CREATE INDEX IF NOT EXISTS idx_patterns_usage
  ON patterns(total_usage DESC, confidence DESC)
  WHERE total_usage > 0;

-- ============================================================
-- OUTCOME INDEXES: Fast outcome history queries
-- ============================================================

-- Pattern outcome history
CREATE INDEX IF NOT EXISTS idx_outcomes_pattern_recorded
  ON pattern_outcomes(pattern_id, recorded_at DESC);

-- Agent learning activity
CREATE INDEX IF NOT EXISTS idx_outcomes_agent_recorded
  ON pattern_outcomes(agent_id, recorded_at DESC);

-- Outcome type filtering
CREATE INDEX IF NOT EXISTS idx_outcomes_outcome_type
  ON pattern_outcomes(outcome, recorded_at DESC);

-- Recent learning activity (last 24h optimization)
CREATE INDEX IF NOT EXISTS idx_outcomes_recent
  ON pattern_outcomes(recorded_at DESC);

-- Confidence tracking
CREATE INDEX IF NOT EXISTS idx_outcomes_confidence_delta
  ON pattern_outcomes(confidence_after - confidence_before);

-- ============================================================
-- RELATIONSHIP INDEXES: Cross-pattern queries
-- ============================================================

-- Source pattern relationships
CREATE INDEX IF NOT EXISTS idx_relationships_source
  ON pattern_relationships(source_pattern_id, relationship_type);

-- Target pattern relationships
CREATE INDEX IF NOT EXISTS idx_relationships_target
  ON pattern_relationships(target_pattern_id, relationship_type);

-- Relationship strength filtering
CREATE INDEX IF NOT EXISTS idx_relationships_strength
  ON pattern_relationships(relationship_type, strength DESC);

-- ============================================================
-- MATERIALIZED VIEWS (Analytics)
-- ============================================================

-- ============================================================
-- v_pattern_stats_by_namespace: Namespace-level statistics
-- ============================================================
CREATE VIEW IF NOT EXISTS v_pattern_stats_by_namespace AS
SELECT
  namespace,
  COUNT(*) AS total_patterns,
  AVG(confidence) AS avg_confidence,
  SUM(success_count) AS total_successes,
  SUM(failure_count) AS total_failures,
  SUM(total_usage) AS total_usage,
  CASE
    WHEN SUM(total_usage) > 0
    THEN CAST(SUM(success_count) AS REAL) / SUM(total_usage)
    ELSE 0.0
  END AS success_rate,
  COUNT(CASE WHEN confidence > 0.7 THEN 1 END) AS high_confidence_count,
  COUNT(CASE WHEN confidence < 0.3 THEN 1 END) AS low_confidence_count,
  MAX(created_at) AS latest_pattern_at,
  MAX(last_used_at) AS latest_usage_at
FROM patterns
GROUP BY namespace
ORDER BY total_patterns DESC;

-- ============================================================
-- v_recent_learning_activity: Last 24 hours learning events
-- ============================================================
CREATE VIEW IF NOT EXISTS v_recent_learning_activity AS
SELECT
  p.id AS pattern_id,
  p.content,
  p.namespace,
  p.agent_id,
  p.skill_id,
  po.outcome,
  po.confidence_before,
  po.confidence_after,
  (po.confidence_after - po.confidence_before) AS confidence_delta,
  po.execution_time_ms,
  po.recorded_at,
  (strftime('%s', 'now') * 1000 - po.recorded_at) AS age_ms
FROM patterns p
JOIN pattern_outcomes po ON p.id = po.pattern_id
WHERE po.recorded_at > (strftime('%s', 'now') - 86400) * 1000 -- Last 24 hours
ORDER BY po.recorded_at DESC
LIMIT 100;

-- ============================================================
-- v_top_performing_patterns: High-confidence, well-tested patterns
-- ============================================================
CREATE VIEW IF NOT EXISTS v_top_performing_patterns AS
SELECT
  id,
  content,
  namespace,
  agent_id,
  skill_id,
  category,
  confidence,
  success_count,
  failure_count,
  total_usage,
  CASE
    WHEN total_usage > 0
    THEN CAST(success_count AS REAL) / total_usage
    ELSE 0.0
  END AS success_rate,
  last_used_at,
  created_at,
  -- Composite performance score
  (confidence * 0.4 +
   CAST(success_count AS REAL) / NULLIF(total_usage, 0) * 0.3 +
   CASE
     WHEN last_used_at IS NOT NULL
     THEN EXP(-1.0 * (strftime('%s', 'now') * 1000 - last_used_at) / (30.0 * 86400.0 * 1000.0))
     ELSE 0.5
   END * 0.2 +
   MIN(CAST(total_usage AS REAL) / 100.0, 1.0) * 0.1
  ) AS performance_score
FROM patterns
WHERE
  confidence > 0.7
  AND total_usage >= 3 -- Minimum validation
ORDER BY performance_score DESC, confidence DESC, total_usage DESC
LIMIT 50;

-- ============================================================
-- v_agent_learning_summary: Per-agent learning statistics
-- ============================================================
CREATE VIEW IF NOT EXISTS v_agent_learning_summary AS
SELECT
  agent_id,
  COUNT(*) AS total_patterns,
  AVG(confidence) AS avg_confidence,
  SUM(success_count) AS total_successes,
  SUM(failure_count) AS total_failures,
  SUM(total_usage) AS total_usage,
  CASE
    WHEN SUM(total_usage) > 0
    THEN CAST(SUM(success_count) AS REAL) / SUM(total_usage)
    ELSE 0.0
  END AS success_rate,
  COUNT(CASE WHEN confidence > 0.7 THEN 1 END) AS high_confidence_patterns,
  MAX(created_at) AS latest_pattern_created,
  MAX(last_used_at) AS latest_pattern_used,
  -- Learning velocity: patterns created per day
  CASE
    WHEN MAX(created_at) > MIN(created_at)
    THEN CAST(COUNT(*) AS REAL) / ((MAX(created_at) - MIN(created_at)) / 86400000.0)
    ELSE 0.0
  END AS patterns_per_day
FROM patterns
WHERE agent_id IS NOT NULL
GROUP BY agent_id
ORDER BY total_patterns DESC;

-- ============================================================
-- v_skill_learning_summary: Per-skill learning statistics
-- ============================================================
CREATE VIEW IF NOT EXISTS v_skill_learning_summary AS
SELECT
  skill_id,
  COUNT(*) AS total_patterns,
  AVG(confidence) AS avg_confidence,
  SUM(success_count) AS total_successes,
  SUM(failure_count) AS total_failures,
  CASE
    WHEN SUM(total_usage) > 0
    THEN CAST(SUM(success_count) AS REAL) / SUM(total_usage)
    ELSE 0.0
  END AS success_rate,
  COUNT(DISTINCT agent_id) AS agent_count,
  MAX(last_used_at) AS latest_usage
FROM patterns
WHERE skill_id IS NOT NULL
GROUP BY skill_id
ORDER BY total_patterns DESC;

-- ============================================================
-- TRIGGERS: Automatic maintenance and integrity
-- ============================================================

-- ============================================================
-- Auto-update updated_at timestamp on patterns
-- ============================================================
CREATE TRIGGER IF NOT EXISTS trg_patterns_update_timestamp
AFTER UPDATE ON patterns
FOR EACH ROW
BEGIN
  UPDATE patterns
  SET updated_at = strftime('%s', 'now') * 1000
  WHERE id = NEW.id;
END;

-- ============================================================
-- Increment pattern usage counter on outcome recording
-- ============================================================
CREATE TRIGGER IF NOT EXISTS trg_patterns_increment_usage
AFTER INSERT ON pattern_outcomes
FOR EACH ROW
WHEN NEW.outcome IN ('success', 'failure')
BEGIN
  UPDATE patterns
  SET
    success_count = success_count + CASE WHEN NEW.outcome = 'success' THEN 1 ELSE 0 END,
    failure_count = failure_count + CASE WHEN NEW.outcome = 'failure' THEN 1 ELSE 0 END,
    total_usage = success_count + failure_count +
                  CASE WHEN NEW.outcome = 'success' THEN 1 ELSE 0 END +
                  CASE WHEN NEW.outcome = 'failure' THEN 1 ELSE 0 END,
    last_used_at = NEW.recorded_at,
    updated_at = strftime('%s', 'now') * 1000
  WHERE id = NEW.pattern_id;
END;

-- ============================================================
-- Update metadata counters
-- ============================================================
CREATE TRIGGER IF NOT EXISTS trg_metadata_pattern_count
AFTER INSERT ON patterns
BEGIN
  UPDATE database_metadata
  SET
    value = CAST(CAST(value AS INTEGER) + 1 AS TEXT),
    updated_at = strftime('%s', 'now') * 1000
  WHERE key = 'total_patterns_created';
END;

CREATE TRIGGER IF NOT EXISTS trg_metadata_outcome_count
AFTER INSERT ON pattern_outcomes
BEGIN
  UPDATE database_metadata
  SET
    value = CAST(CAST(value AS INTEGER) + 1 AS TEXT),
    updated_at = strftime('%s', 'now') * 1000
  WHERE key = 'total_outcomes_recorded';
END;

-- ============================================================
-- Prevent invalid relationship creation (self-referencing)
-- ============================================================
CREATE TRIGGER IF NOT EXISTS trg_relationships_validate
BEFORE INSERT ON pattern_relationships
FOR EACH ROW
WHEN NEW.source_pattern_id = NEW.target_pattern_id
BEGIN
  SELECT RAISE(ABORT, 'Cannot create self-referencing pattern relationship');
END;

-- ============================================================
-- VACUUM and ANALYZE automation
-- ============================================================
-- Note: These should be run periodically via scheduled jobs
-- VACUUM; -- Reclaim space and defragment
-- ANALYZE; -- Update query planner statistics

-- ============================================================
-- SCHEMA VALIDATION QUERIES
-- ============================================================

-- Verify all tables created
-- SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;

-- Verify all indexes created
-- SELECT name FROM sqlite_master WHERE type='index' ORDER BY name;

-- Verify all views created
-- SELECT name FROM sqlite_master WHERE type='view' ORDER BY name;

-- Verify all triggers created
-- SELECT name FROM sqlite_master WHERE type='trigger' ORDER BY name;

-- Check schema integrity
-- PRAGMA integrity_check;

-- Check foreign key constraints
-- PRAGMA foreign_key_check;

-- ============================================================
-- USAGE EXAMPLES
-- ============================================================

-- Example 1: Create a pattern
-- INSERT INTO patterns (id, content, embedding, namespace, created_at, updated_at)
-- VALUES ('uuid-here', 'Use Fibonacci for feature prioritization', X'deadbeef...', 'agent:todos', 1729260000000, 1729260000000);

-- Example 2: Query high-confidence patterns
-- SELECT * FROM v_top_performing_patterns LIMIT 10;

-- Example 3: Record outcome
-- INSERT INTO pattern_outcomes (id, pattern_id, agent_id, outcome, confidence_before, confidence_after, recorded_at)
-- VALUES ('outcome-uuid', 'pattern-uuid', 'agent-id', 'success', 0.5, 0.7, 1729260000000);

-- Example 4: Semantic search (application-level with cosine similarity)
-- SELECT id, content, confidence, embedding FROM patterns
-- WHERE namespace IN ('agent:todos', 'global') AND confidence > 0.2
-- ORDER BY confidence DESC LIMIT 100;
-- -- Then calculate cosine similarity in application code

-- Example 5: Get agent learning summary
-- SELECT * FROM v_agent_learning_summary WHERE agent_id = 'personal-todos-agent';

-- ============================================================
-- END OF SCHEMA
-- ============================================================
