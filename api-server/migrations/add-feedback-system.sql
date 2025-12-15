-- Migration: Add Feedback Loop System
-- Purpose: Track validation failures, detect patterns, and enable automated learning
-- Created: 2025-10-06

-- Table: validation_failures
-- Records every validation failure with full context
CREATE TABLE IF NOT EXISTS validation_failures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_details TEXT,
  component_type TEXT,
  validation_rule TEXT,
  page_config TEXT,
  stack_trace TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table: failure_patterns
-- Detected patterns that occur 3+ times
CREATE TABLE IF NOT EXISTS failure_patterns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT NOT NULL,
  pattern_type TEXT NOT NULL,
  error_signature TEXT NOT NULL,
  occurrence_count INTEGER DEFAULT 0,
  first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'active', -- active, resolved, ignored
  auto_fix_applied BOOLEAN DEFAULT 0,
  fix_applied_at DATETIME,
  pattern_metadata TEXT, -- JSON with additional context

  UNIQUE(agent_id, error_signature)
);

-- Table: agent_feedback
-- Learning history and instruction updates
CREATE TABLE IF NOT EXISTS agent_feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT NOT NULL,
  pattern_id INTEGER,
  feedback_type TEXT NOT NULL, -- warning, instruction_update, success_pattern
  feedback_content TEXT NOT NULL,
  applied_to_agent BOOLEAN DEFAULT 0,
  effectiveness_score REAL DEFAULT 0.0, -- Track if feedback helped
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (pattern_id) REFERENCES failure_patterns(id) ON DELETE CASCADE
);

-- Table: agent_performance_metrics
-- Aggregate performance data
CREATE TABLE IF NOT EXISTS agent_performance_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT NOT NULL,
  date DATE NOT NULL,
  total_attempts INTEGER DEFAULT 0,
  successful_attempts INTEGER DEFAULT 0,
  failed_attempts INTEGER DEFAULT 0,
  validation_failures INTEGER DEFAULT 0,
  auto_fixes_applied INTEGER DEFAULT 0,
  success_rate REAL DEFAULT 0.0,

  UNIQUE(agent_id, date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_validation_failures_agent ON validation_failures(agent_id);
CREATE INDEX IF NOT EXISTS idx_validation_failures_page ON validation_failures(page_id);
CREATE INDEX IF NOT EXISTS idx_validation_failures_type ON validation_failures(error_type);
CREATE INDEX IF NOT EXISTS idx_validation_failures_created ON validation_failures(created_at);
CREATE INDEX IF NOT EXISTS idx_failure_patterns_agent ON failure_patterns(agent_id);
CREATE INDEX IF NOT EXISTS idx_failure_patterns_status ON failure_patterns(status);
CREATE INDEX IF NOT EXISTS idx_agent_feedback_agent ON agent_feedback(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_performance_agent ON agent_performance_metrics(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_performance_date ON agent_performance_metrics(date);

-- View: Recent Failures Summary
CREATE VIEW IF NOT EXISTS recent_failures_summary AS
SELECT
  agent_id,
  error_type,
  COUNT(*) as count,
  MAX(created_at) as last_occurrence,
  GROUP_CONCAT(DISTINCT component_type) as affected_components
FROM validation_failures
WHERE created_at >= datetime('now', '-7 days')
GROUP BY agent_id, error_type
ORDER BY count DESC;

-- View: Agent Health Dashboard
CREATE VIEW IF NOT EXISTS agent_health_dashboard AS
SELECT
  apm.agent_id,
  apm.date,
  apm.total_attempts,
  apm.successful_attempts,
  apm.failed_attempts,
  apm.success_rate,
  COUNT(DISTINCT fp.id) as active_patterns,
  COUNT(DISTINCT af.id) as feedback_items
FROM agent_performance_metrics apm
LEFT JOIN failure_patterns fp ON fp.agent_id = apm.agent_id AND fp.status = 'active'
LEFT JOIN agent_feedback af ON af.agent_id = apm.agent_id AND af.created_at >= apm.date
GROUP BY apm.agent_id, apm.date
ORDER BY apm.date DESC;
