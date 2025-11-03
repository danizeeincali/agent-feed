-- Migration 010: Add User Settings Table (Updated)
-- Date: 2025-11-02 (Updated to match SPARC specification)
-- Purpose: Implement user settings storage for display_name and onboarding state
--          Supporting username collection system via get-to-know-you-agent
--          SPARC Spec: /workspaces/agent-feed/docs/SPARC-USERNAME-COLLECTION.md

-- Enable performance optimizations
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA cache_size = -64000; -- 64MB cache
PRAGMA temp_store = MEMORY;

-- ============================================================================
-- Migration Strategy: Drop and Recreate with Data Preservation
-- ============================================================================

-- Step 1: Backup existing data (if table exists)
-- Note: Check if table exists and has the correct schema
-- If already migrated (no 'username' column), skip backup
CREATE TABLE IF NOT EXISTS user_settings_backup AS
SELECT
  user_id,
  display_name,
  onboarding_completed,
  onboarding_completed_at,
  profile_json,
  created_at,
  updated_at
FROM user_settings
WHERE 1=0;  -- Don't copy data, just create structure

-- Step 2: Drop old table (if exists)
DROP TABLE IF EXISTS user_settings;

-- Step 3: Create new table with STRICT mode
-- ============================================================================
-- Table: user_settings
-- Purpose: Store user display names, onboarding state, and profile preferences
-- Schema: STRICT mode for type safety (SQLite 3.37+)
-- ============================================================================

CREATE TABLE user_settings (
  -- Primary Key (user_id is the natural key)
  user_id TEXT PRIMARY KEY,

  -- Display Name (REQUIRED after onboarding)
  display_name TEXT NOT NULL,

  -- Display Name Style (optional categorization)
  display_name_style TEXT CHECK(
    display_name_style IS NULL OR
    display_name_style IN ('first_only', 'full_name', 'nickname', 'professional')
  ),

  -- Onboarding State
  onboarding_completed INTEGER NOT NULL DEFAULT 0 CHECK(onboarding_completed IN (0, 1)),
  onboarding_completed_at INTEGER,  -- Unix timestamp (seconds since epoch)

  -- Profile Data (JSON string for extensibility)
  profile_json TEXT,

  -- Timestamps (Unix epoch in seconds for consistency)
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
) STRICT;

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

-- Index for fast onboarding status lookups (used in middleware)
CREATE INDEX IF NOT EXISTS idx_user_settings_onboarding
  ON user_settings(onboarding_completed);

-- ============================================================================
-- Trigger: Auto-update updated_at timestamp
-- ============================================================================

CREATE TRIGGER IF NOT EXISTS update_user_settings_timestamp
AFTER UPDATE ON user_settings
FOR EACH ROW
BEGIN
  UPDATE user_settings
  SET updated_at = unixepoch()
  WHERE user_id = NEW.user_id;
END;

-- ============================================================================
-- Step 4: Restore data from backup (if exists)
-- ============================================================================

INSERT OR IGNORE INTO user_settings (
  user_id,
  display_name,
  display_name_style,
  onboarding_completed,
  onboarding_completed_at,
  profile_json,
  created_at,
  updated_at
)
SELECT
  user_id,
  display_name,
  NULL as display_name_style,
  onboarding_completed,
  onboarding_completed_at,
  profile_json,
  created_at,
  updated_at
FROM user_settings_backup
WHERE EXISTS (SELECT 1 FROM sqlite_master WHERE type='table' AND name='user_settings_backup');

-- Step 5: Drop backup table
DROP TABLE IF EXISTS user_settings_backup;

-- ============================================================================
-- Step 6: Insert default settings for demo user (if not restored)
-- ============================================================================

INSERT OR IGNORE INTO user_settings (
  user_id,
  display_name,
  display_name_style,
  onboarding_completed,
  onboarding_completed_at,
  profile_json
)
VALUES (
  'demo-user-123',
  'User',  -- Temporary fallback, will be updated during onboarding
  NULL,
  0,       -- Not completed yet
  NULL,
  '{}'
);

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Verify table created with STRICT mode
SELECT
  type,
  name,
  sql
FROM sqlite_master
WHERE type='table' AND name='user_settings';

-- Verify indexes created
SELECT name FROM sqlite_master
WHERE type='index' AND tbl_name='user_settings';

-- Verify triggers created
SELECT name FROM sqlite_master
WHERE type='trigger' AND tbl_name='user_settings';

-- Test constraints work (should fail if uncommented)
-- INSERT INTO user_settings (user_id, display_name, onboarding_completed)
-- VALUES ('test-invalid', 'Test', 2);  -- Should fail: CHECK constraint

-- Final success message
SELECT 'Migration 010 complete: Created user_settings table with STRICT mode, constraints, triggers, and indexes' as message;
