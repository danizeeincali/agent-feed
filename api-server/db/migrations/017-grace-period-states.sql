-- Migration 017: Grace Period States Table
-- Stores execution state for queries that trigger grace period warnings
-- Enables resumption of paused work

CREATE TABLE IF NOT EXISTS grace_period_states (
  id TEXT PRIMARY KEY,
  worker_id TEXT NOT NULL,
  ticket_id TEXT NOT NULL,
  query TEXT NOT NULL,
  partial_results TEXT,
  execution_state TEXT NOT NULL, -- JSON snapshot of worker state
  plan TEXT, -- TodoWrite plan JSON
  user_choice TEXT, -- 'continue', 'pause', 'simplify', 'cancel'
  user_choice_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  resumed BOOLEAN DEFAULT 0,
  resumed_at DATETIME,
  FOREIGN KEY (ticket_id) REFERENCES work_queue_tickets(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_grace_period_worker ON grace_period_states(worker_id);
CREATE INDEX IF NOT EXISTS idx_grace_period_ticket ON grace_period_states(ticket_id);
CREATE INDEX IF NOT EXISTS idx_grace_period_expires ON grace_period_states(expires_at);
CREATE INDEX IF NOT EXISTS idx_grace_period_user_choice ON grace_period_states(user_choice);
