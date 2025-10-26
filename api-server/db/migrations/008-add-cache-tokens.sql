-- Migration 008: Add cache token columns to token_analytics table
-- Date: 2025-10-25
-- Purpose: Track cache_read_input_tokens and cache_creation_input_tokens separately

-- Add cacheReadTokens column (90% discount pricing)
ALTER TABLE token_analytics
ADD COLUMN cacheReadTokens INTEGER DEFAULT 0;

-- Add cacheCreationTokens column (same as input pricing)
ALTER TABLE token_analytics
ADD COLUMN cacheCreationTokens INTEGER DEFAULT 0;

-- Verify columns were added
PRAGMA table_info(token_analytics);

-- Show migration success message
SELECT 'Migration 008 complete: Added cacheReadTokens and cacheCreationTokens columns' as message;
