-- ============================================================
-- MIGRATION 004: ReasoningBank Database Initialization
-- ============================================================
-- Version: 1.0.0
-- Created: 2025-10-18
-- Description: Initialize ReasoningBank learning system with SAFLA algorithm
-- Dependencies: None (standalone migration)
-- Rollback: Supported via down() section
-- ============================================================

-- Migration metadata
-- This migration is idempotent and safe to re-run

-- ============================================================
-- UP: Apply migration
-- ============================================================

-- Step 1: Enable SQLite optimizations (MUST be before transaction)
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA cache_size = -64000;
PRAGMA foreign_keys = ON;
PRAGMA temp_store = MEMORY;
PRAGMA mmap_size = 268435456;
PRAGMA page_size = 4096;

-- Transaction wrapper for atomic migration
BEGIN TRANSACTION;

-- Step 2: Check if migration already applied
CREATE TABLE IF NOT EXISTS migration_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  version TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  applied_at INTEGER NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('pending', 'applied', 'rolled_back')),
  checksum TEXT
) STRICT;

-- Insert migration record
INSERT OR IGNORE INTO migration_history (version, name, applied_at, status)
VALUES ('004', 'reasoningbank-init', strftime('%s', 'now') * 1000, 'pending');

-- Step 3: Create core tables
-- ============================================================

-- patterns table
CREATE TABLE IF NOT EXISTS patterns (
  id TEXT PRIMARY KEY NOT NULL,
  namespace TEXT NOT NULL DEFAULT 'global',
  agent_id TEXT,
  skill_id TEXT,
  content TEXT NOT NULL,
  category TEXT,
  tags TEXT,
  embedding BLOB NOT NULL,
  confidence REAL NOT NULL DEFAULT 0.5 CHECK(confidence >= 0.05 AND confidence <= 0.95),
  success_count INTEGER NOT NULL DEFAULT 0 CHECK(success_count >= 0),
  failure_count INTEGER NOT NULL DEFAULT 0 CHECK(failure_count >= 0),
  total_usage INTEGER NOT NULL DEFAULT 0 CHECK(total_usage >= 0),
  context_type TEXT,
  metadata TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  last_used_at INTEGER,
  CHECK(length(id) > 0),
  CHECK(length(content) > 0),
  CHECK(length(embedding) = 4096),
  CHECK(total_usage = success_count + failure_count)
) STRICT;

-- pattern_outcomes table
CREATE TABLE IF NOT EXISTS pattern_outcomes (
  id TEXT PRIMARY KEY NOT NULL,
  pattern_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK(outcome IN ('success', 'failure', 'neutral')),
  context TEXT,
  confidence_before REAL NOT NULL CHECK(confidence_before >= 0.05 AND confidence_before <= 0.95),
  confidence_after REAL NOT NULL CHECK(confidence_after >= 0.05 AND confidence_after <= 0.95),
  execution_time_ms INTEGER,
  user_feedback TEXT,
  metadata TEXT,
  recorded_at INTEGER NOT NULL,
  FOREIGN KEY (pattern_id) REFERENCES patterns(id) ON DELETE CASCADE,
  CHECK(length(id) > 0),
  CHECK(length(pattern_id) > 0),
  CHECK(length(agent_id) > 0),
  CHECK(execution_time_ms IS NULL OR execution_time_ms >= 0)
) STRICT;

-- pattern_relationships table
CREATE TABLE IF NOT EXISTS pattern_relationships (
  id TEXT PRIMARY KEY NOT NULL,
  source_pattern_id TEXT NOT NULL,
  target_pattern_id TEXT NOT NULL,
  relationship_type TEXT NOT NULL CHECK(
    relationship_type IN ('causes', 'requires', 'conflicts', 'enhances', 'supersedes', 'shared-to', 'promoted-to')
  ),
  strength REAL NOT NULL DEFAULT 0.5 CHECK(strength >= 0.0 AND strength <= 1.0),
  created_at INTEGER NOT NULL,
  FOREIGN KEY (source_pattern_id) REFERENCES patterns(id) ON DELETE CASCADE,
  FOREIGN KEY (target_pattern_id) REFERENCES patterns(id) ON DELETE CASCADE,
  CHECK(length(id) > 0),
  CHECK(source_pattern_id != target_pattern_id),
  UNIQUE(source_pattern_id, target_pattern_id, relationship_type)
) STRICT;

-- database_metadata table
CREATE TABLE IF NOT EXISTS database_metadata (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
) STRICT;

-- Initialize metadata
INSERT OR IGNORE INTO database_metadata (key, value, updated_at) VALUES
  ('schema_version', '1.0.0', strftime('%s', 'now') * 1000),
  ('created_at', strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
  ('last_migration', '004-reasoningbank-init', strftime('%s', 'now') * 1000),
  ('total_patterns_created', '0', strftime('%s', 'now') * 1000),
  ('total_outcomes_recorded', '0', strftime('%s', 'now') * 1000);

-- Step 4: Create indexes
-- ============================================================

-- Pattern indexes
CREATE INDEX IF NOT EXISTS idx_patterns_namespace_confidence
  ON patterns(namespace, confidence DESC, last_used_at DESC);

CREATE INDEX IF NOT EXISTS idx_patterns_confidence_desc
  ON patterns(confidence DESC, total_usage DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_patterns_last_used
  ON patterns(last_used_at DESC)
  WHERE last_used_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_patterns_agent
  ON patterns(agent_id, confidence DESC)
  WHERE agent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_patterns_skill
  ON patterns(skill_id, confidence DESC)
  WHERE skill_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_patterns_category
  ON patterns(category, namespace, confidence DESC)
  WHERE category IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_patterns_created
  ON patterns(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_patterns_usage
  ON patterns(total_usage DESC, confidence DESC)
  WHERE total_usage > 0;

-- Outcome indexes
CREATE INDEX IF NOT EXISTS idx_outcomes_pattern_recorded
  ON pattern_outcomes(pattern_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_outcomes_agent_recorded
  ON pattern_outcomes(agent_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_outcomes_outcome_type
  ON pattern_outcomes(outcome, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_outcomes_recent
  ON pattern_outcomes(recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_outcomes_confidence_delta
  ON pattern_outcomes(confidence_after - confidence_before);

-- Relationship indexes
CREATE INDEX IF NOT EXISTS idx_relationships_source
  ON pattern_relationships(source_pattern_id, relationship_type);

CREATE INDEX IF NOT EXISTS idx_relationships_target
  ON pattern_relationships(target_pattern_id, relationship_type);

CREATE INDEX IF NOT EXISTS idx_relationships_strength
  ON pattern_relationships(relationship_type, strength DESC);

-- Step 5: Create views
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
WHERE po.recorded_at > (strftime('%s', 'now') - 86400) * 1000
ORDER BY po.recorded_at DESC
LIMIT 100;

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
  AND total_usage >= 3
ORDER BY performance_score DESC, confidence DESC, total_usage DESC
LIMIT 50;

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
  CASE
    WHEN MAX(created_at) > MIN(created_at)
    THEN CAST(COUNT(*) AS REAL) / ((MAX(created_at) - MIN(created_at)) / 86400000.0)
    ELSE 0.0
  END AS patterns_per_day
FROM patterns
WHERE agent_id IS NOT NULL
GROUP BY agent_id
ORDER BY total_patterns DESC;

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

-- Step 6: Create triggers
-- ============================================================

CREATE TRIGGER IF NOT EXISTS trg_patterns_update_timestamp
AFTER UPDATE ON patterns
FOR EACH ROW
BEGIN
  UPDATE patterns
  SET updated_at = strftime('%s', 'now') * 1000
  WHERE id = NEW.id;
END;

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

CREATE TRIGGER IF NOT EXISTS trg_relationships_validate
BEFORE INSERT ON pattern_relationships
FOR EACH ROW
WHEN NEW.source_pattern_id = NEW.target_pattern_id
BEGIN
  SELECT RAISE(ABORT, 'Cannot create self-referencing pattern relationship');
END;

-- Step 7: Update migration status
UPDATE migration_history
SET status = 'applied', checksum = 'sha256:004-reasoningbank-init'
WHERE version = '004';

-- Commit transaction
COMMIT;

-- Verify migration success
SELECT
  'Migration 004 applied successfully' AS message,
  (SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name IN ('patterns', 'pattern_outcomes', 'pattern_relationships')) AS tables_created,
  (SELECT COUNT(*) FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%') AS indexes_created,
  (SELECT COUNT(*) FROM sqlite_master WHERE type='view' AND name LIKE 'v_%') AS views_created,
  (SELECT COUNT(*) FROM sqlite_master WHERE type='trigger' AND name LIKE 'trg_%') AS triggers_created;

-- ============================================================
-- DOWN: Rollback migration
-- ============================================================

-- To rollback this migration, run the following:
-- BEGIN TRANSACTION;
--
-- -- Drop triggers
-- DROP TRIGGER IF EXISTS trg_relationships_validate;
-- DROP TRIGGER IF EXISTS trg_metadata_outcome_count;
-- DROP TRIGGER IF EXISTS trg_metadata_pattern_count;
-- DROP TRIGGER IF EXISTS trg_patterns_increment_usage;
-- DROP TRIGGER IF EXISTS trg_patterns_update_timestamp;
--
-- -- Drop views
-- DROP VIEW IF EXISTS v_skill_learning_summary;
-- DROP VIEW IF EXISTS v_agent_learning_summary;
-- DROP VIEW IF EXISTS v_top_performing_patterns;
-- DROP VIEW IF EXISTS v_recent_learning_activity;
-- DROP VIEW IF EXISTS v_pattern_stats_by_namespace;
--
-- -- Drop indexes
-- DROP INDEX IF EXISTS idx_relationships_strength;
-- DROP INDEX IF EXISTS idx_relationships_target;
-- DROP INDEX IF EXISTS idx_relationships_source;
-- DROP INDEX IF EXISTS idx_outcomes_confidence_delta;
-- DROP INDEX IF EXISTS idx_outcomes_recent;
-- DROP INDEX IF EXISTS idx_outcomes_outcome_type;
-- DROP INDEX IF EXISTS idx_outcomes_agent_recorded;
-- DROP INDEX IF EXISTS idx_outcomes_pattern_recorded;
-- DROP INDEX IF EXISTS idx_patterns_usage;
-- DROP INDEX IF EXISTS idx_patterns_created;
-- DROP INDEX IF EXISTS idx_patterns_category;
-- DROP INDEX IF EXISTS idx_patterns_skill;
-- DROP INDEX IF EXISTS idx_patterns_agent;
-- DROP INDEX IF EXISTS idx_patterns_last_used;
-- DROP INDEX IF EXISTS idx_patterns_confidence_desc;
-- DROP INDEX IF EXISTS idx_patterns_namespace_confidence;
--
-- -- Drop tables
-- DROP TABLE IF EXISTS pattern_relationships;
-- DROP TABLE IF EXISTS pattern_outcomes;
-- DROP TABLE IF EXISTS patterns;
--
-- -- Remove metadata entries
-- DELETE FROM database_metadata WHERE key IN (
--   'schema_version',
--   'total_patterns_created',
--   'total_outcomes_recorded'
-- );
-- UPDATE database_metadata SET value = 'rolled_back' WHERE key = 'last_migration';
--
-- -- Update migration status
-- UPDATE migration_history SET status = 'rolled_back' WHERE version = '004';
--
-- COMMIT;

-- ============================================================
-- END OF MIGRATION
-- ============================================================
