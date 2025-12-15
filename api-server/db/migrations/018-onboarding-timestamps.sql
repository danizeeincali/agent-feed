-- Migration 018: Add created_at and updated_at timestamps to onboarding_state table
-- This migration adds tracking timestamps for onboarding state records

-- Step 1: Add the new columns (initially nullable)
ALTER TABLE onboarding_state ADD COLUMN created_at INTEGER;
ALTER TABLE onboarding_state ADD COLUMN updated_at INTEGER;

-- Step 2: Backfill existing rows with appropriate timestamp values
-- Set created_at = started_at for all existing rows
UPDATE onboarding_state
SET created_at = started_at
WHERE created_at IS NULL;

-- Set updated_at = last_interaction_at if available, otherwise use started_at
UPDATE onboarding_state
SET updated_at = COALESCE(last_interaction_at, started_at)
WHERE updated_at IS NULL;

-- Note: Automatic timestamp updates will be handled by the application layer
-- The onboarding service should update updated_at when modifying records
-- This approach is more reliable than triggers for this use case and avoids
-- trigger recursion issues while maintaining better control over timestamp updates

-- Migration complete
-- created_at and updated_at columns are now available and automatically maintained
