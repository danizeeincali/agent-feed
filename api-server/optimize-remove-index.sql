-- Performance Optimization: Remove Harmful Index
-- Based on benchmark results showing 65% performance degradation with index
--
-- Benchmark Results:
--   With Index:    142μs mean, 197μs P95
--   Without Index:  86μs mean, 115μs P95
--   Improvement: 65%
--
-- Reason for removal:
-- The idx_posts_engagement_comments index cannot be used by the priority sorting query
-- because it relies on calculated fields (CASE statement) and multi-column sorting.
-- SQLite performs a full table SCAN + TEMP B-TREE sort regardless of the index,
-- so the index only adds I/O overhead with no benefit.
--
-- Query plan shows:
--   SCAN agent_posts
--   USE TEMP B-TREE FOR ORDER BY
--
-- Future optimization: Add computed columns with triggers (see recommendations)

BEGIN TRANSACTION;

-- Remove the index
DROP INDEX IF EXISTS idx_posts_engagement_comments;

-- Verify removal
SELECT 'Index removed successfully. Remaining indices:' as status;

SELECT name, sql
FROM sqlite_master
WHERE type = 'index' AND tbl_name = 'agent_posts';

COMMIT;

-- Expected result: 65% improvement in query performance
-- Next step: Consider adding computed columns (see PERFORMANCE_SUMMARY.md)
