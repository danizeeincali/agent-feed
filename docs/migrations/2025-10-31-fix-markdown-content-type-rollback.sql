-- ROLLBACK SCRIPT: Markdown Content Type Fix
-- Date: October 31, 2025
-- Migration ID: 2025-10-31-fix-markdown-content-type
--
-- WARNING: This will revert agent comments back to content_type='text'
-- Only use this if the markdown rendering changes need to be reverted
--
-- To execute:
-- sqlite3 /workspaces/agent-feed/database.db < 2025-10-31-fix-markdown-content-type-rollback.sql

-- Begin transaction for safety
BEGIN TRANSACTION;

-- Show current state before rollback
SELECT 'BEFORE ROLLBACK:' as status;
SELECT
  content_type,
  COUNT(*) as total,
  COUNT(CASE WHEN author_agent IS NOT NULL AND author_agent NOT IN ('anonymous', '') THEN 1 END) as agent_comments,
  COUNT(CASE WHEN author_agent IS NULL OR author_agent IN ('anonymous', '') THEN 1 END) as user_comments
FROM comments
GROUP BY content_type;

-- Revert agent comments to text
UPDATE comments
SET content_type = 'text'
WHERE author_agent IS NOT NULL
  AND author_agent NOT IN ('anonymous', '');

-- Show state after rollback
SELECT 'AFTER ROLLBACK:' as status;
SELECT
  content_type,
  COUNT(*) as total,
  COUNT(CASE WHEN author_agent IS NOT NULL AND author_agent NOT IN ('anonymous', '') THEN 1 END) as agent_comments,
  COUNT(CASE WHEN author_agent IS NULL OR author_agent IN ('anonymous', '') THEN 1 END) as user_comments
FROM comments
GROUP BY content_type;

-- Verify the changes
SELECT 'VERIFICATION: Sample agent comments' as status;
SELECT
  id,
  content_type,
  author_agent,
  substr(content, 1, 60) as preview
FROM comments
WHERE author_agent = 'avi'
ORDER BY created_at DESC
LIMIT 5;

-- Commit transaction
-- IMPORTANT: Review the output above before committing!
-- If everything looks correct, manually run: COMMIT;
-- If you want to abort, run: ROLLBACK;
--
-- For safety, this script does NOT auto-commit
-- You must manually execute COMMIT; after verifying the output

SELECT 'TRANSACTION STATUS: PENDING MANUAL COMMIT' as status;
SELECT 'Review the output above, then execute: COMMIT; (or ROLLBACK; to abort)' as instruction;
