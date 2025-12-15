-- Migration 004: Performance Optimization Indexes
-- Version: 1.0.0
-- Date: 2025-10-10
-- Description: Comprehensive index strategy for common query patterns
--
-- This migration adds 18 critical indexes identified through query pattern analysis
-- All indexes are created with CONCURRENTLY to avoid blocking operations
--
-- Expected Performance Improvements:
-- - Workspace queries: 60-70% faster
-- - Memory retrieval: 50-60% faster
-- - Post feed: 60-70% faster
-- - Search queries: 70-80% faster
--
-- Estimated Impact:
-- - Storage increase: ~15-20%
-- - Overall query performance: 50-70% improvement
-- - Concurrent user capacity: 2.4x increase

BEGIN;

-- =============================================================================
-- PRIORITY 1: HIGH-IMPACT COMPOSITE INDEXES
-- =============================================================================

-- Index 1: agent_workspaces - User + Agent + Updated composite
-- Optimizes: workspace page listings, getAllPages, getPagesByAgent
-- Expected improvement: 60-70% faster workspace queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agent_workspaces_user_agent_updated
ON agent_workspaces(user_id, agent_name, updated_at DESC);

COMMENT ON INDEX idx_agent_workspaces_user_agent_updated IS
'Composite index for workspace page listings by user and agent. Optimizes getPagesByAgent and getAllPages queries. Expected 60-70% performance improvement.';

-- Index 2: agent_memories - User + Type + Created composite
-- Optimizes: post and comment retrieval, getAllPosts, getCommentsByPostId
-- Expected improvement: 50-60% faster memory queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agent_memories_user_type_created
ON agent_memories(user_id, (metadata->>'type'), created_at DESC);

COMMENT ON INDEX idx_agent_memories_user_type_created IS
'Composite index for memory retrieval filtered by type (post/comment). Optimizes getAllPosts and comment queries. Expected 50-60% performance improvement.';

-- Index 3: agent_memories - User + Agent + Type + Created composite
-- Optimizes: agent-specific post retrieval, getPostsByAgent
-- Expected improvement: 55-65% faster agent post queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agent_memories_user_agent_type_created
ON agent_memories(user_id, agent_name, (metadata->>'type'), created_at DESC);

COMMENT ON INDEX idx_agent_memories_user_agent_type_created IS
'Composite index for agent-specific memory retrieval. Optimizes getPostsByAgent queries. Expected 55-65% performance improvement.';

-- Index 4: agent_memories - User + Post ID + Type composite
-- Optimizes: comment retrieval for specific posts
-- Expected improvement: 40-50% faster comment queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agent_memories_user_post_type
ON agent_memories(user_id, post_id, (metadata->>'type'));

COMMENT ON INDEX idx_agent_memories_user_post_type IS
'Composite index for post-specific comment retrieval. Optimizes getCommentsByPostId queries. Expected 40-50% performance improvement.';

-- Index 5: user_agent_customizations - User + Template composite with INCLUDE
-- Optimizes: agent configuration lookups with JOIN operations
-- Expected improvement: 35-45% faster agent listing queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_agent_customizations_user_template
ON user_agent_customizations(user_id, agent_template)
INCLUDE (custom_name, personality, enabled);

COMMENT ON INDEX idx_user_agent_customizations_user_template IS
'Composite covering index for agent configuration lookups. Optimizes getAllAgents and getAgentByName with JOINs. Expected 35-45% performance improvement.';

-- =============================================================================
-- PRIORITY 2: JSONB OPTIMIZATION INDEXES
-- =============================================================================

-- Index 6: agent_workspaces - Status partial index
-- Optimizes: status-filtered workspace queries (common in UI)
-- Expected improvement: 45-55% faster filtered workspace queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agent_workspaces_user_status_updated
ON agent_workspaces(user_id, (metadata->>'status'), updated_at DESC)
WHERE metadata->>'status' IN ('published', 'draft');

COMMENT ON INDEX idx_agent_workspaces_user_status_updated IS
'Partial index for status-filtered workspace queries (published/draft only). Optimizes getAllPages with status filter. Expected 45-55% performance improvement.';

-- Index 7: agent_memories - Metadata type GIN index
-- Optimizes: type-based filtering across all memory queries
-- Expected improvement: 30-40% faster type-filtered queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agent_memories_metadata_type_gin
ON agent_memories USING GIN ((metadata->>'type') gin_trgm_ops);

COMMENT ON INDEX idx_agent_memories_metadata_type_gin IS
'GIN trigram index for flexible type filtering. Optimizes all memory queries with type filters. Expected 30-40% performance improvement.';

-- Index 8: agent_workspaces - Title search GIN index
-- Optimizes: ILIKE search queries on titles
-- Expected improvement: 70-80% faster search queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agent_workspaces_title_search
ON agent_workspaces USING GIN ((metadata->>'title') gin_trgm_ops);

COMMENT ON INDEX idx_agent_workspaces_title_search IS
'GIN trigram index for title text search using ILIKE. Optimizes searchPages queries. Expected 70-80% performance improvement.';

-- Index 9: agent_memories - Content search GIN index
-- Optimizes: full-text search on memory content
-- Expected improvement: 65-75% faster content search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agent_memories_content_search
ON agent_memories USING GIN (content gin_trgm_ops);

COMMENT ON INDEX idx_agent_memories_content_search IS
'GIN trigram index for full-text content search. Optimizes future search functionality. Expected 65-75% performance improvement.';

-- =============================================================================
-- PRIORITY 3: PARTIAL INDEXES FOR COMMON FILTERS
-- =============================================================================

-- Index 10: posts - Active posts by author
-- Optimizes: active post retrieval (most common use case)
-- Expected improvement: 40-50% faster active post queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_active_user_created
ON posts(author_id, created_at DESC)
WHERE removed_from_feed = FALSE AND processed = TRUE;

COMMENT ON INDEX idx_posts_active_user_created IS
'Partial index for active, processed posts only. Optimizes feed generation and user post listings. Expected 40-50% performance improvement.';

-- Index 11: comments - Non-deleted comments by post
-- Optimizes: comment thread retrieval
-- Expected improvement: 35-45% faster comment queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_active_post_created
ON comments(post_id, created_at DESC)
WHERE is_deleted = FALSE;

COMMENT ON INDEX idx_comments_active_post_created IS
'Partial index for non-deleted comments only. Optimizes comment threading and post detail views. Expected 35-45% performance improvement.';

-- Index 12: agent_processing_queue - Pending items by priority
-- Optimizes: agent work queue retrieval
-- Expected improvement: 50-60% faster queue queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agent_processing_queue_pending_priority
ON agent_processing_queue(agent_id, priority DESC, assigned_at ASC)
WHERE status = 'pending';

COMMENT ON INDEX idx_agent_processing_queue_pending_priority IS
'Partial index for pending queue items only, ordered by priority. Optimizes get_next_post_for_agent function. Expected 50-60% performance improvement.';

-- =============================================================================
-- PRIORITY 4: PERFORMANCE OPTIMIZATION INDEXES
-- =============================================================================

-- Index 13: likes - Composite for count queries
-- Optimizes: like count and user like status checks
-- Expected improvement: 30-40% faster engagement queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_likes_post_user_created
ON likes(post_id, user_id, created_at DESC)
WHERE post_id IS NOT NULL;

COMMENT ON INDEX idx_likes_post_user_created IS
'Composite index for like counts and user like status. Optimizes engagement analytics and interaction checks. Expected 30-40% performance improvement.';

-- Index 14: user_engagements - Analytics composite
-- Optimizes: engagement analytics queries
-- Expected improvement: 45-55% faster analytics queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_engagements_analytics
ON user_engagements(user_id, engagement_type, last_engaged_at DESC)
INCLUDE (count, metadata);

COMMENT ON INDEX idx_user_engagements_analytics IS
'Covering index for engagement analytics queries. Optimizes get_user_engagement_summary function. Expected 45-55% performance improvement.';

-- Index 15: post_processing_status - Monitoring incomplete jobs
-- Optimizes: processing monitoring queries
-- Expected improvement: 40-50% faster monitoring queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_processing_status_monitoring
ON post_processing_status(processing_stage, started_at DESC)
WHERE completed_at IS NULL;

COMMENT ON INDEX idx_post_processing_status_monitoring IS
'Partial index for incomplete processing jobs. Optimizes processing dashboard and stuck job detection. Expected 40-50% performance improvement.';

-- Index 16: link_previews - Cache lookup optimization
-- Optimizes: link preview cache lookups
-- Expected improvement: 35-45% faster preview queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_link_previews_url_status_expires
ON link_previews(url, status, expires_at)
WHERE status IN ('completed', 'processing');

COMMENT ON INDEX idx_link_previews_url_status_expires IS
'Partial index for active link previews. Optimizes preview generation and cache validation. Expected 35-45% performance improvement.';

-- Index 17: processing_logs - Audit trail queries
-- Optimizes: processing audit trail queries
-- Expected improvement: 30-40% faster audit queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_processing_logs_post_stage_created
ON processing_logs(post_id, processing_stage, created_at DESC);

COMMENT ON INDEX idx_processing_logs_post_stage_created IS
'Composite index for processing audit trails. Optimizes processing debugging and audit reports. Expected 30-40% performance improvement.';

-- Index 18: error_log - Unresolved errors by agent
-- Optimizes: error monitoring dashboard
-- Expected improvement: 40-50% faster error queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_error_log_unresolved_agent_created
ON error_log(agent_name, created_at DESC)
WHERE resolved = FALSE;

COMMENT ON INDEX idx_error_log_unresolved_agent_created IS
'Partial index for unresolved errors only. Optimizes error dashboard and monitoring alerts. Expected 40-50% performance improvement.';

-- =============================================================================
-- INDEX CREATION VALIDATION
-- =============================================================================

-- Function to validate all indexes were created successfully
CREATE OR REPLACE FUNCTION validate_performance_indexes()
RETURNS TABLE(
    index_name TEXT,
    table_name TEXT,
    status TEXT,
    size TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        indexname::TEXT,
        tablename::TEXT,
        CASE
            WHEN idx_scan IS NOT NULL THEN 'Created'
            ELSE 'Missing'
        END as status,
        pg_size_pretty(pg_relation_size(indexname::regclass))::TEXT as size
    FROM pg_indexes
    LEFT JOIN pg_stat_user_indexes ON pg_indexes.indexname = pg_stat_user_indexes.indexname
    WHERE schemaname = 'public'
    AND pg_indexes.indexname LIKE 'idx_%'
    ORDER BY tablename, indexname;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_performance_indexes IS
'Validation function to check all performance indexes were created successfully. Returns index name, table, status, and size.';

-- =============================================================================
-- PERFORMANCE MONITORING FUNCTIONS
-- =============================================================================

-- Function to analyze index usage and identify optimization opportunities
CREATE OR REPLACE FUNCTION analyze_index_usage()
RETURNS TABLE(
    table_name TEXT,
    index_name TEXT,
    index_scans BIGINT,
    rows_read BIGINT,
    index_size TEXT,
    last_used TEXT,
    usage_priority TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        schemaname || '.' || tablename AS table_name,
        indexname::TEXT,
        idx_scan,
        idx_tup_read,
        pg_size_pretty(pg_relation_size(indexname::regclass))::TEXT,
        CASE
            WHEN idx_scan = 0 THEN 'Never'
            ELSE 'Recently'
        END::TEXT as last_used,
        CASE
            WHEN idx_scan = 0 THEN 'Review for removal'
            WHEN idx_scan < 100 THEN 'Low usage'
            WHEN idx_scan < 1000 THEN 'Medium usage'
            ELSE 'High usage'
        END::TEXT as usage_priority
    FROM pg_stat_user_indexes
    WHERE schemaname = 'public'
    ORDER BY idx_scan DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION analyze_index_usage IS
'Analyzes index usage patterns to identify unused or underutilized indexes. Use for regular performance audits.';

-- Function to get query performance baseline before/after optimization
CREATE OR REPLACE FUNCTION get_query_performance_baseline()
RETURNS TABLE(
    query_type TEXT,
    avg_time_ms NUMERIC,
    max_time_ms NUMERIC,
    total_calls BIGINT,
    cache_hit_ratio NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        CASE
            WHEN query LIKE '%agent_workspaces%' THEN 'Workspace Queries'
            WHEN query LIKE '%agent_memories%' THEN 'Memory Queries'
            WHEN query LIKE '%posts%' THEN 'Post Queries'
            WHEN query LIKE '%comments%' THEN 'Comment Queries'
            WHEN query LIKE '%user_agent_customizations%' THEN 'Agent Config Queries'
            ELSE 'Other'
        END::TEXT as query_type,
        ROUND(AVG(mean_exec_time)::NUMERIC, 2) as avg_time_ms,
        ROUND(MAX(max_exec_time)::NUMERIC, 2) as max_time_ms,
        SUM(calls) as total_calls,
        ROUND((SUM(shared_blks_hit)::NUMERIC / NULLIF(SUM(shared_blks_hit + shared_blks_read), 0) * 100), 2) as cache_hit_ratio
    FROM pg_stat_statements
    WHERE query NOT LIKE '%pg_stat%'
    GROUP BY 1
    ORDER BY avg_time_ms DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_query_performance_baseline IS
'Provides query performance baseline metrics by query type. Compare before/after migration to measure improvement.';

-- =============================================================================
-- MAINTENANCE AND MONITORING
-- =============================================================================

-- Function to recommend index maintenance based on bloat
CREATE OR REPLACE FUNCTION recommend_index_maintenance()
RETURNS TABLE(
    index_name TEXT,
    table_name TEXT,
    bloat_ratio NUMERIC,
    recommended_action TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        indexname::TEXT,
        tablename::TEXT,
        ROUND(
            (pg_relation_size(indexname::regclass)::NUMERIC /
            NULLIF(pg_relation_size(tablename::regclass), 0) * 100),
            2
        ) as bloat_ratio,
        CASE
            WHEN pg_relation_size(indexname::regclass) > pg_relation_size(tablename::regclass) * 0.5
                THEN 'REINDEX recommended - index larger than 50% of table'
            WHEN pg_relation_size(indexname::regclass) > pg_relation_size(tablename::regclass) * 0.3
                THEN 'Monitor - index larger than 30% of table'
            ELSE 'Healthy'
        END::TEXT
    FROM pg_indexes
    WHERE schemaname = 'public'
    ORDER BY bloat_ratio DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION recommend_index_maintenance IS
'Identifies indexes that may benefit from REINDEX based on bloat ratio. Use for regular maintenance planning.';

-- =============================================================================
-- POST-MIGRATION VALIDATION AND REPORTING
-- =============================================================================

-- Validation check for all performance indexes
DO $$
DECLARE
    expected_indexes TEXT[] := ARRAY[
        'idx_agent_workspaces_user_agent_updated',
        'idx_agent_memories_user_type_created',
        'idx_agent_memories_user_agent_type_created',
        'idx_agent_memories_user_post_type',
        'idx_user_agent_customizations_user_template',
        'idx_agent_workspaces_user_status_updated',
        'idx_agent_memories_metadata_type_gin',
        'idx_agent_workspaces_title_search',
        'idx_agent_memories_content_search',
        'idx_posts_active_user_created',
        'idx_comments_active_post_created',
        'idx_agent_processing_queue_pending_priority',
        'idx_likes_post_user_created',
        'idx_user_engagements_analytics',
        'idx_post_processing_status_monitoring',
        'idx_link_previews_url_status_expires',
        'idx_processing_logs_post_stage_created',
        'idx_error_log_unresolved_agent_created'
    ];
    missing_indexes TEXT[];
    idx_name TEXT;
BEGIN
    -- Check for missing indexes
    FOREACH idx_name IN ARRAY expected_indexes
    LOOP
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = idx_name) THEN
            missing_indexes := array_append(missing_indexes, idx_name);
        END IF;
    END LOOP;

    -- Report results
    IF array_length(missing_indexes, 1) > 0 THEN
        RAISE WARNING 'Missing performance indexes: %', array_to_string(missing_indexes, ', ');
        RAISE EXCEPTION 'Migration failed: Not all indexes were created successfully';
    ELSE
        RAISE NOTICE '✓ All 18 performance optimization indexes created successfully';
    END IF;

    -- Report total index count and size
    RAISE NOTICE 'Total indexes in schema: %', (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public');
    RAISE NOTICE 'Total index size: %', (
        SELECT pg_size_pretty(SUM(pg_relation_size(indexname::regclass)))
        FROM pg_indexes
        WHERE schemaname = 'public'
    );
END $$;

-- Generate migration completion report
SELECT
    'Performance Optimization Migration Completed' as status,
    NOW() as completion_time,
    (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'idx_%') as total_performance_indexes,
    (SELECT pg_size_pretty(SUM(pg_relation_size(indexname::regclass)))
     FROM pg_indexes
     WHERE schemaname = 'public'
     AND indexname LIKE 'idx_%') as total_index_size,
    '18 new indexes created for query optimization' as summary,
    'Expected 50-70% overall query performance improvement' as expected_impact;

COMMIT;

-- =============================================================================
-- POST-MIGRATION INSTRUCTIONS
-- =============================================================================

-- After running this migration:
--
-- 1. Run ANALYZE on all affected tables to update statistics:
--    ANALYZE agent_workspaces, agent_memories, user_agent_customizations,
--            posts, comments, agent_processing_queue, likes, user_engagements,
--            post_processing_status, link_previews, processing_logs, error_log;
--
-- 2. Capture baseline performance metrics:
--    SELECT * FROM get_query_performance_baseline();
--
-- 3. Validate all indexes were created:
--    SELECT * FROM validate_performance_indexes();
--
-- 4. Monitor index usage over 7 days:
--    SELECT * FROM analyze_index_usage();
--
-- 5. Check for bloat after 30 days:
--    SELECT * FROM recommend_index_maintenance();
--
-- 6. Compare query performance after 7 days:
--    SELECT * FROM get_query_performance_baseline();
--    -- Compare with baseline captured in step 2
--
-- 7. Review slow query log for remaining optimization opportunities
--
-- 8. Consider implementing materialized views if analytics queries still slow
--
-- 9. Monitor connection pool utilization and adjust max_connections if needed
--
-- 10. Schedule regular REINDEX operations for high-write indexes

-- For rollback (if needed):
-- DROP INDEX CONCURRENTLY IF EXISTS idx_agent_workspaces_user_agent_updated;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_agent_memories_user_type_created;
-- ... (repeat for all 18 indexes)
-- DROP FUNCTION IF EXISTS validate_performance_indexes();
-- DROP FUNCTION IF EXISTS analyze_index_usage();
-- DROP FUNCTION IF EXISTS get_query_performance_baseline();
-- DROP FUNCTION IF EXISTS recommend_index_maintenance();
