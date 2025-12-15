-- Migration 007 Verification Queries
-- Run these to verify the author_agent column migration

-- 1. Check schema (should show both author and author_agent columns)
.schema comments

-- 2. Count total comments
SELECT COUNT(*) as total_comments FROM comments;

-- 3. Count comments missing author_agent (should be 0)
SELECT COUNT(*) as missing_author_agent 
FROM comments 
WHERE author_agent IS NULL;

-- 4. Show sample data with both fields
SELECT 
  id,
  author,
  author_agent,
  substr(content, 1, 60) as content_preview,
  created_at
FROM comments 
ORDER BY created_at DESC 
LIMIT 10;

-- 5. Verify both fields are populated
SELECT 
  COUNT(*) as total,
  SUM(CASE WHEN author IS NOT NULL THEN 1 ELSE 0 END) as has_author,
  SUM(CASE WHEN author_agent IS NOT NULL THEN 1 ELSE 0 END) as has_author_agent
FROM comments;

-- 6. Check for any inconsistencies
SELECT 
  COUNT(*) as inconsistent_count
FROM comments 
WHERE author IS NOT NULL AND author_agent IS NULL;

-- 7. Show agent-created comments (should have author_agent)
SELECT 
  id,
  author,
  author_agent,
  substr(content, 1, 80) as content_preview
FROM comments 
WHERE author_agent LIKE '%agent%'
ORDER BY created_at DESC;
