-- Migration: Cache Cost Metrics
-- Description: Track cache token usage and associated costs for monitoring and optimization
-- Date: 2025-11-06

CREATE TABLE IF NOT EXISTS cache_cost_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  cache_write_tokens INTEGER NOT NULL,
  cache_read_tokens INTEGER NOT NULL,
  cache_write_cost_usd REAL NOT NULL,
  cache_read_cost_usd REAL NOT NULL,
  total_cost_usd REAL NOT NULL,
  timestamp INTEGER NOT NULL,
  UNIQUE(date, timestamp)
) STRICT;

-- Index for efficient date-based queries
CREATE INDEX IF NOT EXISTS idx_cache_cost_date ON cache_cost_metrics(date);

-- Index for timestamp-based queries
CREATE INDEX IF NOT EXISTS idx_cache_cost_timestamp ON cache_cost_metrics(timestamp);

-- Index for cost threshold queries
CREATE INDEX IF NOT EXISTS idx_cache_cost_total ON cache_cost_metrics(total_cost_usd);
