-- Work Queue Table for AVI Architecture
-- Tracks work tickets for agent workers

BEGIN;

CREATE TABLE IF NOT EXISTS work_queue (
  -- Primary Key
  id SERIAL PRIMARY KEY,

  -- User identification
  user_id VARCHAR(100) NOT NULL,

  -- Post/ticket information
  post_id VARCHAR(100) NOT NULL,
  post_content TEXT NOT NULL,
  post_author VARCHAR(100),
  post_metadata JSONB,

  -- Agent assignment
  assigned_agent VARCHAR(50),
  worker_id VARCHAR(100),

  -- Status tracking
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  -- Status values: pending, assigned, in_progress, completed, failed

  -- Priority (higher = more important)
  priority INTEGER DEFAULT 0 NOT NULL,

  -- Result data
  result JSONB,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0 NOT NULL,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  assigned_at TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_work_queue_status ON work_queue(status);
CREATE INDEX IF NOT EXISTS idx_work_queue_user_status ON work_queue(user_id, status);
CREATE INDEX IF NOT EXISTS idx_work_queue_assigned_agent ON work_queue(assigned_agent);
CREATE INDEX IF NOT EXISTS idx_work_queue_priority ON work_queue(priority DESC, created_at);
CREATE INDEX IF NOT EXISTS idx_work_queue_created ON work_queue(created_at DESC);

-- Comments
COMMENT ON TABLE work_queue IS 'Work tickets for agent workers - tracks posts to be processed';
COMMENT ON COLUMN work_queue.status IS 'Ticket status: pending, assigned, in_progress, completed, failed';
COMMENT ON COLUMN work_queue.priority IS 'Higher values processed first';
COMMENT ON COLUMN work_queue.result IS 'JSON result from agent worker (e.g., {post_url, engagement})';
COMMENT ON COLUMN work_queue.retry_count IS 'Number of retry attempts';

COMMIT;
