-- Work Queue Tickets Table
-- Stores proactive agent work queue tickets for URL processing and other automated tasks
-- Created: 2025-10-23

CREATE TABLE IF NOT EXISTS work_queue_tickets (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  agent_id TEXT NOT NULL,
  content TEXT NOT NULL,
  url TEXT,
  priority TEXT NOT NULL CHECK(priority IN ('P0', 'P1', 'P2', 'P3')),
  status TEXT NOT NULL CHECK(status IN ('pending', 'in_progress', 'completed', 'failed')),
  retry_count INTEGER DEFAULT 0,
  metadata TEXT,
  result TEXT,
  last_error TEXT,
  post_id TEXT,
  created_at INTEGER NOT NULL,
  assigned_at INTEGER,
  completed_at INTEGER
) STRICT;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_work_queue_status ON work_queue_tickets(status);
CREATE INDEX IF NOT EXISTS idx_work_queue_agent ON work_queue_tickets(agent_id);
CREATE INDEX IF NOT EXISTS idx_work_queue_priority ON work_queue_tickets(priority, created_at);
CREATE INDEX IF NOT EXISTS idx_work_queue_user ON work_queue_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_work_queue_post_id ON work_queue_tickets(post_id);
