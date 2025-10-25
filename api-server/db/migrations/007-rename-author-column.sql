-- Migration 007: Add author_agent column for semantic clarity
-- Keeps author column for backward compatibility

-- Add new column
ALTER TABLE comments ADD COLUMN author_agent TEXT;

-- Migrate existing data
UPDATE comments SET author_agent = author WHERE author_agent IS NULL;

-- Verify migration (should return 0)
-- SELECT COUNT(*) FROM comments WHERE author_agent IS NULL;

-- Note: Keep both columns during transition
-- Remove 'author' column in future migration after confirming all code uses author_agent
