-- ==============================================================================
-- Phase 1: Database Seed Data
-- ==============================================================================
-- Seeds initial avi_state row (id=1)
-- System agent templates are seeded from config/system/agent-templates/*.json
-- ==============================================================================

BEGIN;

-- ==============================================================================
-- Seed avi_state table with initial row (id=1)
-- ==============================================================================

INSERT INTO avi_state (
  id,
  last_feed_position,
  pending_tickets,
  context_size,
  last_restart,
  uptime_seconds
)
VALUES (
  1,                    -- MUST be 1 (single row constraint)
  NULL,                 -- No feed position yet
  NULL,                 -- No pending tickets yet
  0,                    -- Initial context size
  NOW(),                -- Initial startup time
  0                     -- Zero uptime initially
)
ON CONFLICT (id) DO NOTHING;  -- Don't overwrite existing state

-- ==============================================================================
-- Verify seed data
-- ==============================================================================

-- Verify avi_state was created
DO $$
DECLARE
  state_exists BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM avi_state WHERE id = 1) INTO state_exists;

  IF NOT state_exists THEN
    RAISE EXCEPTION 'Failed to seed avi_state table';
  END IF;

  RAISE NOTICE 'Successfully seeded avi_state table (id=1)';
END $$;

COMMIT;

-- ==============================================================================
-- Notes
-- ==============================================================================
-- 1. avi_state is seeded here with initial row (id=1)
-- 2. system_agent_templates are seeded from JSON files via seedSystemTemplates()
-- 3. User data tables (TIER 2 & 3) start empty
-- 4. Use ON CONFLICT DO NOTHING to make seeding idempotent
-- ==============================================================================
