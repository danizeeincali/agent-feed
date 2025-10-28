-- Migration 010: Add User Settings Table
-- Date: 2025-10-26
-- Purpose: Implement user settings storage for display_name, username, and preferences
--          Supporting username collection system via get-to-know-you-agent

-- Enable performance optimizations
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA cache_size = -64000; -- 64MB cache
PRAGMA temp_store = MEMORY;

-- ============================================================================
-- Table: user_settings
-- Purpose: Store user preferences, display name, and profile settings
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_settings (
  -- Primary Key
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),

  -- User Identification (single-user system, but prepared for multi-user)
  user_id TEXT NOT NULL DEFAULT 'demo-user-123',

  -- Display Name / Username
  display_name TEXT,              -- User's preferred display name (collected by get-to-know-you-agent)
  username TEXT,                  -- Alternative username field

  -- Profile Information
  profile_data JSON,              -- Complete profile from get-to-know-you-agent

  -- Preferences
  preferences JSON,               -- User preferences (theme, notifications, etc.)

  -- Timestamps
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  UNIQUE (user_id)                -- One settings record per user
);

-- Create index for fast user lookup
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id
  ON user_settings(user_id);

-- Insert default settings for demo user if not exists
INSERT OR IGNORE INTO user_settings (user_id, display_name, username, profile_data, preferences)
VALUES (
  'demo-user-123',
  NULL,
  NULL,
  '{}',
  '{}'
);

-- Verify migration completed
SELECT 'Migration 010 complete: Added user_settings table with display_name and username fields' as message;
