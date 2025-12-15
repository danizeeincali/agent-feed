-- Migration 010 ROLLBACK: Remove User Settings Table
-- Date: 2025-11-02
-- Purpose: Rollback user_settings table migration
--          WARNING: This will delete all user settings data

-- Enable performance optimizations
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;

-- ============================================================================
-- Rollback Strategy: Backup and Drop
-- ============================================================================

-- Step 1: Backup data before rollback (optional safety measure)
CREATE TABLE IF NOT EXISTS user_settings_rollback_backup AS
SELECT * FROM user_settings;

-- Step 2: Drop triggers
DROP TRIGGER IF EXISTS update_user_settings_timestamp;

-- Step 3: Drop indexes
DROP INDEX IF EXISTS idx_user_settings_onboarding;

-- Step 4: Drop table
DROP TABLE IF EXISTS user_settings;

-- Verification
SELECT 'Migration 010 rollback complete: user_settings table and related objects removed' as message;
SELECT 'Backup table created: user_settings_rollback_backup' as message;
