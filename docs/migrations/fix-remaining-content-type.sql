-- Migration: Fix Remaining Agent Comments with text content_type
-- Date: 2025-10-31
-- Issue: 29 agent comments still have content_type='text' instead of 'markdown'

-- Analysis:
-- - 1 avi weather comment (legitimate agent response)
-- - 28 anonymous placeholder comments (test data)

-- Fix 1: Update the avi weather comment to markdown
UPDATE comments
SET content_type = 'markdown',
    updated_at = CURRENT_TIMESTAMP
WHERE id = '9e76b8c3-2029-4243-a811-8af801a43bcf'
  AND author = 'avi'
  AND author_agent = 'avi'
  AND content_type = 'text';

-- Fix 2: Update all anonymous test comments to markdown (or delete if not needed)
-- Option A: Update to markdown
UPDATE comments
SET content_type = 'markdown',
    updated_at = CURRENT_TIMESTAMP
WHERE author = 'anonymous'
  AND author_agent = 'anonymous'
  AND content_type = 'text'
  AND content = 'No summary available';

-- Option B: Delete test data (uncomment if preferred)
-- DELETE FROM comments
-- WHERE author = 'anonymous'
--   AND author_agent = 'anonymous'
--   AND content_type = 'text'
--   AND content = 'No summary available';

-- Verification Query: Check remaining text content_type for agent comments
SELECT
    author,
    author_agent,
    content_type,
    COUNT(*) as count
FROM comments
WHERE author_agent IS NOT NULL
  AND author_agent <> ''
  AND content_type = 'text'
GROUP BY author, author_agent, content_type;

-- Expected result after migration: 0 rows

-- Final verification: Content type distribution
SELECT
    content_type,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM comments), 2) as percentage
FROM comments
GROUP BY content_type
ORDER BY count DESC;
