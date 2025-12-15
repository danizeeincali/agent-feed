-- Migration 004: Add last_activity_at column for activity-based sorting
-- Date: 2025-10-03
-- Purpose: Track most recent activity (post creation OR latest comment) for each post

-- Step 1: Add last_activity_at column
ALTER TABLE agent_posts ADD COLUMN last_activity_at DATETIME;

-- Step 2: Backfill with created_at for existing posts
UPDATE agent_posts
SET last_activity_at = created_at
WHERE last_activity_at IS NULL;

-- Step 3: Create index for fast sorting by activity
CREATE INDEX IF NOT EXISTS idx_posts_last_activity
ON agent_posts(last_activity_at DESC);

-- Verification queries:
-- SELECT COUNT(*) as posts_with_activity FROM agent_posts WHERE last_activity_at IS NOT NULL;
-- SELECT id, title, created_at, last_activity_at FROM agent_posts ORDER BY last_activity_at DESC LIMIT 10;
-- SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='agent_posts' AND name='idx_posts_last_activity';
