-- Migration 005: Work Queue Table
-- Phase 3A: Add work_queue table for job persistence

CREATE TABLE IF NOT EXISTS work_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type VARCHAR(50) NOT NULL,
  priority INTEGER NOT NULL DEFAULT 5,
  agent_name VARCHAR(100) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  worker_id VARCHAR(100),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processing_started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  CONSTRAINT fk_agent_template FOREIGN KEY (agent_name)
    REFERENCES system_agent_templates(name) ON DELETE CASCADE
);

-- Index for efficient queue polling
CREATE INDEX IF NOT EXISTS idx_work_queue_status_priority
  ON work_queue(status, priority DESC, created_at ASC);

-- Index for user queries
CREATE INDEX IF NOT EXISTS idx_work_queue_user_id
  ON work_queue(user_id);

-- Index for worker tracking
CREATE INDEX IF NOT EXISTS idx_work_queue_worker_id
  ON work_queue(worker_id) WHERE worker_id IS NOT NULL;

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_work_queue_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE work_queue IS 'Work ticket queue for agent processing';
COMMENT ON COLUMN work_queue.type IS 'Type of work: post_response, memory_update, etc.';
COMMENT ON COLUMN work_queue.priority IS 'Priority level (1=highest, 10=lowest)';
COMMENT ON COLUMN work_queue.status IS 'Current status: pending, processing, completed, failed';
COMMENT ON COLUMN work_queue.payload IS 'Job-specific data (feedItemId, etc.)';
