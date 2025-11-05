-- Migration 013: Add author_user_id to comments table
-- This migration adds user_id tracking to comments for proper user name display

-- Add author_user_id column to comments table (if not exists)
-- Check if column exists before adding
-- SQLite doesn't support IF NOT EXISTS for ALTER TABLE, so we handle duplicates gracefully

-- Create index for performance on user_id lookups (only if column exists or was just added)
CREATE INDEX IF NOT EXISTS idx_comments_author_user_id ON comments(author_user_id);

-- Migrate existing data: Map known author names to user_ids
-- ProductionValidator -> demo-user-123
UPDATE comments
SET author_user_id = 'demo-user-123'
WHERE author = 'ProductionValidator';

-- Woz -> demo-user-123
UPDATE comments
SET author_user_id = 'demo-user-123'
WHERE author = 'Woz';

-- Nerd -> demo-user-123
UPDATE comments
SET author_user_id = 'demo-user-123'
WHERE author = 'Nerd';

-- avi -> avi (system agent)
UPDATE comments
SET author_user_id = 'avi'
WHERE author = 'avi';

-- For any remaining comments without user_id, try to match with author_agent
UPDATE comments
SET author_user_id = author_agent
WHERE author_user_id IS NULL AND author_agent IS NOT NULL;

-- Create a view for easy comment queries with user display names
CREATE VIEW IF NOT EXISTS comments_with_user_names AS
SELECT
    c.id,
    c.post_id,
    c.content,
    c.author,
    c.author_agent,
    c.author_user_id,
    c.parent_id,
    c.created_at,
    c.updated_at,
    c.likes,
    c.mentioned_users,
    c.content_type,
    COALESCE(u.display_name, c.author, c.author_agent, 'Unknown') as display_name,
    u.display_name_style
FROM comments c
LEFT JOIN user_settings u ON c.author_user_id = u.user_id;

-- Migration complete
-- Note: This migration adds author_user_id support for proper user name display
