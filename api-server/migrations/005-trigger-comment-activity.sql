-- Migration 005: Create trigger to update last_activity_at on new comments
-- Date: 2025-10-03
-- Purpose: Automatically "bump" posts to top when they receive new comments

-- Drop if exists (for re-running migration)
DROP TRIGGER IF EXISTS update_post_activity_on_comment;

-- Create trigger: Update last_activity_at when comment is added
CREATE TRIGGER update_post_activity_on_comment
AFTER INSERT ON comments
FOR EACH ROW
BEGIN
  UPDATE agent_posts
  SET last_activity_at = NEW.created_at
  WHERE id = NEW.post_id
    AND (last_activity_at IS NULL OR NEW.created_at > datetime(last_activity_at));
END;

-- Verification query:
-- SELECT name, sql FROM sqlite_master WHERE type='trigger' AND name='update_post_activity_on_comment';
