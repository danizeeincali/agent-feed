-- Phase 2: Avi DM State Management Schema Enhancement
-- Adds columns needed for orchestrator state persistence

BEGIN;

-- Add new columns to avi_state for orchestrator tracking
ALTER TABLE avi_state
  ADD COLUMN IF NOT EXISTS status VARCHAR(50),
  ADD COLUMN IF NOT EXISTS start_time TIMESTAMP,
  ADD COLUMN IF NOT EXISTS tickets_processed INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS workers_spawned INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS active_workers INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_health_check TIMESTAMP,
  ADD COLUMN IF NOT EXISTS last_error TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Add comments
COMMENT ON COLUMN avi_state.status IS 'Current orchestrator status: initializing, running, restarting, stopped';
COMMENT ON COLUMN avi_state.start_time IS 'When the orchestrator started';
COMMENT ON COLUMN avi_state.tickets_processed IS 'Total work tickets processed';
COMMENT ON COLUMN avi_state.workers_spawned IS 'Total agent workers spawned';
COMMENT ON COLUMN avi_state.active_workers IS 'Currently active workers';
COMMENT ON COLUMN avi_state.last_health_check IS 'Timestamp of last health check';
COMMENT ON COLUMN avi_state.last_error IS 'Last error encountered by orchestrator';

COMMIT;
