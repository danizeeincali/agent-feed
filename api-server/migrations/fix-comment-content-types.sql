-- Migration: Fix content_type for comments with markdown syntax
-- Date: 2025-10-31
-- Purpose: Update existing comments that have markdown content but content_type='text'

-- Store counts before migration
.mode column
.headers on

SELECT 'BEFORE MIGRATION:' as status;
SELECT
  COUNT(*) as total_comments,
  SUM(CASE WHEN content_type = 'markdown' THEN 1 ELSE 0 END) as markdown_count,
  SUM(CASE WHEN content_type = 'text' THEN 1 ELSE 0 END) as text_count
FROM comments;

-- Update comments with markdown syntax but content_type='text'
UPDATE comments
SET content_type = 'markdown'
WHERE content_type = 'text'
  AND (
    content LIKE '%**%**%'      -- Bold
    OR content LIKE '%*%*%'     -- Italic (but not part of **)
    OR content LIKE '%`%`%'     -- Inline code
    OR content LIKE '%```%'     -- Code blocks
    OR content LIKE '%##%'      -- Headers
    OR content LIKE '%- %'      -- Unordered lists
    OR content LIKE '%1. %'     -- Ordered lists
    OR content LIKE '%> %'      -- Blockquotes
    OR content LIKE '%[%](%'    -- Links [text](url)
    OR content LIKE '%~~%~~%'   -- Strikethrough
  );

-- Show results after migration
SELECT 'AFTER MIGRATION:' as status;
SELECT
  COUNT(*) as total_comments,
  SUM(CASE WHEN content_type = 'markdown' THEN 1 ELSE 0 END) as markdown_count,
  SUM(CASE WHEN content_type = 'text' THEN 1 ELSE 0 END) as text_count,
  SUM(CASE WHEN updated_at > datetime('now', '-1 minute') THEN 1 ELSE 0 END) as just_updated
FROM comments;

-- Show updated comments (limit to recent updates)
SELECT 'RECENTLY UPDATED COMMENTS:' as status;
SELECT
  id,
  SUBSTR(content, 1, 50) || '...' as content_preview,
  content_type,
  updated_at
FROM comments
WHERE content_type = 'markdown'
  AND updated_at > datetime('now', '-1 minute')
LIMIT 10;

-- Verify the specific weather post comment
SELECT 'WEATHER POST COMMENT:' as status;
SELECT
  id,
  content,
  content_type,
  updated_at
FROM comments
WHERE id = '9e76b8c3-2029-4243-a811-8af801a43bcf';
