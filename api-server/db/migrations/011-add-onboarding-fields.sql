-- Migration 011: Add Onboarding Completion Fields
-- Date: 2025-11-02
-- Purpose: Add onboarding_completed flag and timestamp to track first-time setup
--          Implements FR-5 from SPARC-USERNAME-COLLECTION.md

-- ============================================================================
-- ALTER TABLE: user_settings
-- Purpose: Add onboarding completion tracking
-- ============================================================================

-- Add onboarding_completed flag (0 = not completed, 1 = completed)
ALTER TABLE user_settings
ADD COLUMN onboarding_completed INTEGER DEFAULT 0 CHECK(onboarding_completed IN (0, 1));

-- Add timestamp for when onboarding was completed
ALTER TABLE user_settings
ADD COLUMN onboarding_completed_at INTEGER;

-- Create index for fast onboarding status lookups
CREATE INDEX IF NOT EXISTS idx_user_settings_onboarding
  ON user_settings(onboarding_completed);

-- Update existing demo user to have onboarding not completed (to test flow)
UPDATE user_settings
SET onboarding_completed = 0,
    onboarding_completed_at = NULL
WHERE user_id = 'demo-user-123';

-- Verify migration completed
SELECT 'Migration 011 complete: Added onboarding_completed and onboarding_completed_at fields' as message;
