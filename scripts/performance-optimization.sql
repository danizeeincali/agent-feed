-- Performance Optimization Script for AgentLink Database
-- This script contains advanced performance optimizations, monitoring queries,
-- and maintenance procedures for the AgentLink database schema

-- Enable necessary extensions for advanced performance features
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gin;
CREATE EXTENSION IF NOT EXISTS btree_gist;

BEGIN;

-- =====================================================
-- 1. ADVANCED INDEXING STRATEGIES
-- =====================================================

-- Composite indexes for common query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_author_status_published 
ON posts(author_id, processing_status, published_at DESC) 
WHERE processing_status = 'published' AND deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_agent_business_impact 
ON posts(agent_id, business_impact DESC, created_at DESC) 
WHERE agent_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_engagements_user_post_type 
ON user_engagements(user_id, post_id, engagement_type, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_trending 
ON posts(likes_count DESC, comments_count DESC, shares_count DESC, created_at DESC) 
WHERE processing_status = 'published' AND deleted_at IS NULL 
AND created_at >= NOW() - INTERVAL '7 days';

-- Partial indexes for specific use cases
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_draft_author 
ON posts(author_id, created_at DESC) 
WHERE processing_status IN ('draft', 'processing');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_high_impact 
ON posts(business_impact DESC, created_at DESC) 
WHERE business_impact >= 7 AND deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agent_mentions_pending 
ON agent_mentions(agent_id, created_at DESC) 
WHERE is_processed = FALSE;

-- GIN indexes for array and JSONB operations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_tags_gin 
ON posts USING GIN(tags) 
WHERE array_length(tags, 1) > 0;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_mentioned_agents_gin 
ON posts USING GIN(mentioned_agents) 
WHERE array_length(mentioned_agents, 1) > 0;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_metadata_gin 
ON posts USING GIN(metadata) 
WHERE metadata IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agent_performance_metrics_gin 
ON agent_performance_metrics USING GIN(detailed_metrics) 
WHERE detailed_metrics IS NOT NULL;

-- Full-text search optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_fulltext_weighted 
ON posts USING GIN(
    setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(hook, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(content_body, '')), 'C') ||
    setweight(to_tsvector('english', array_to_string(tags, ' ')), 'D')
);

-- =====================================================
-- 2. PARTITIONING STRATEGIES FOR LARGE TABLES
-- =====================================================

-- Partition user_engagements by month for better performance
-- This is for future implementation when engagement data grows large
/*
CREATE TABLE user_engagements_partitioned (
    LIKE user_engagements INCLUDING ALL
) PARTITION BY RANGE (created_at);

-- Create monthly partitions (example for 2025)
CREATE TABLE user_engagements_2025_01 PARTITION OF user_engagements_partitioned
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE user_engagements_2025_02 PARTITION OF user_engagements_partitioned
FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
-- Continue for other months as needed
*/

-- =====================================================
-- 3. MATERIALIZED VIEWS FOR ANALYTICS
-- =====================================================

-- Materialized view for trending posts
CREATE MATERIALIZED VIEW IF NOT EXISTS trending_posts AS
SELECT 
    p.id,
    p.title,
    p.author_id,
    p.author_agent,
    p.likes_count,
    p.comments_count,
    p.shares_count,
    p.views_count,
    p.business_impact,
    p.created_at,
    p.published_at,
    -- Trending score calculation
    (
        p.likes_count * 2.0 +
        p.comments_count * 5.0 +
        p.shares_count * 10.0 +
        p.views_count * 0.1 +
        p.business_impact * 3.0
    ) * EXP(-EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 86400.0) as trending_score,
    
    -- Engagement rate
    CASE 
        WHEN p.views_count > 0 
        THEN (p.likes_count + p.comments_count + p.shares_count)::DECIMAL / p.views_count 
        ELSE 0 
    END as engagement_rate
FROM posts p
WHERE p.processing_status = 'published'
AND p.deleted_at IS NULL
AND p.created_at >= NOW() - INTERVAL '30 days'
ORDER BY trending_score DESC;

CREATE UNIQUE INDEX ON trending_posts(id);
CREATE INDEX ON trending_posts(trending_score DESC);
CREATE INDEX ON trending_posts(engagement_rate DESC);

-- Materialized view for agent performance summary
CREATE MATERIALIZED VIEW IF NOT EXISTS agent_performance_summary AS
SELECT 
    a.id,
    a.name,
    a.agent_type,
    a.status,
    
    -- Post statistics
    COUNT(p.id) as total_posts,
    COUNT(CASE WHEN p.processing_status = 'published' THEN 1 END) as published_posts,
    AVG(p.business_impact) as avg_business_impact,
    
    -- Engagement statistics
    SUM(p.likes_count) as total_likes,
    SUM(p.comments_count) as total_comments,
    SUM(p.shares_count) as total_shares,
    SUM(p.views_count) as total_views,
    
    -- Performance metrics
    AVG(CASE WHEN p.views_count > 0 
        THEN (p.likes_count + p.comments_count + p.shares_count)::DECIMAL / p.views_count 
        ELSE 0 END) as avg_engagement_rate,
    
    -- Recent activity
    MAX(p.created_at) as last_post_at,
    COUNT(CASE WHEN p.created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as posts_last_week,
    COUNT(CASE WHEN p.created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as posts_last_month
    
FROM agents a
LEFT JOIN posts p ON a.id = p.agent_id AND p.deleted_at IS NULL
WHERE a.deleted_at IS NULL
GROUP BY a.id, a.name, a.agent_type, a.status
ORDER BY total_posts DESC;

CREATE UNIQUE INDEX ON agent_performance_summary(id);
CREATE INDEX ON agent_performance_summary(avg_engagement_rate DESC);
CREATE INDEX ON agent_performance_summary(total_posts DESC);

-- Materialized view for user activity summary
CREATE MATERIALIZED VIEW IF NOT EXISTS user_activity_summary AS
SELECT 
    u.id,
    u.name,
    u.email,
    
    -- Post statistics
    COUNT(p.id) as total_posts,
    COUNT(CASE WHEN p.processing_status = 'published' THEN 1 END) as published_posts,
    MAX(p.created_at) as last_post_at,
    
    -- Engagement statistics
    COUNT(ue.id) as total_engagements,
    COUNT(CASE WHEN ue.engagement_type = 'like' THEN 1 END) as total_likes_given,
    COUNT(CASE WHEN ue.engagement_type = 'comment' THEN 1 END) as total_comments_made,
    COUNT(CASE WHEN ue.engagement_type = 'share' THEN 1 END) as total_shares_made,
    
    -- Activity recency
    MAX(ue.created_at) as last_engagement_at,
    COUNT(CASE WHEN ue.created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as engagements_last_week,
    COUNT(CASE WHEN ue.created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as engagements_last_month,
    
    -- User classification
    CASE 
        WHEN COUNT(p.id) > 10 AND COUNT(ue.id) > 50 THEN 'power_user'
        WHEN COUNT(p.id) > 5 OR COUNT(ue.id) > 20 THEN 'active_user'
        WHEN COUNT(p.id) > 0 OR COUNT(ue.id) > 0 THEN 'regular_user'
        ELSE 'inactive_user'
    END as user_type

FROM users u
LEFT JOIN posts p ON u.id = p.author_id AND p.deleted_at IS NULL
LEFT JOIN user_engagements ue ON u.id = ue.user_id
GROUP BY u.id, u.name, u.email
ORDER BY total_engagements DESC;

CREATE UNIQUE INDEX ON user_activity_summary(id);
CREATE INDEX ON user_activity_summary(user_type);
CREATE INDEX ON user_activity_summary(total_engagements DESC);

-- =====================================================
-- 4. ADVANCED PERFORMANCE FUNCTIONS
-- =====================================================

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_performance_views()
RETURNS TABLE(view_name TEXT, refresh_duration INTERVAL) AS $$
DECLARE
    start_time TIMESTAMP;
    view_record RECORD;
BEGIN
    FOR view_record IN 
        SELECT matviewname as name FROM pg_matviews WHERE schemaname = 'public'
    LOOP
        start_time := clock_timestamp();
        EXECUTE format('REFRESH MATERIALIZED VIEW CONCURRENTLY %I', view_record.name);
        
        RETURN QUERY SELECT view_record.name, clock_timestamp() - start_time;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function for intelligent query optimization
CREATE OR REPLACE FUNCTION optimize_query_performance()
RETURNS TABLE(optimization_type TEXT, description TEXT, impact TEXT) AS $$
BEGIN
    -- Analyze table statistics
    ANALYZE users, posts, agents, user_engagements, agent_mentions, 
           post_processing_status, link_previews;
    
    RETURN QUERY VALUES 
        ('statistics', 'Updated table statistics for query planner', 'high'),
        ('materialized_views', 'Refreshed all materialized views', 'medium');
    
    -- Check for missing indexes on foreign keys
    IF EXISTS (
        SELECT 1 FROM posts p
        JOIN pg_stats s ON s.tablename = 'posts' AND s.attname = 'author_id'
        WHERE s.n_distinct > 100 AND NOT EXISTS (
            SELECT 1 FROM pg_indexes WHERE tablename = 'posts' AND indexdef LIKE '%author_id%'
        )
    ) THEN
        RETURN QUERY VALUES 
            ('index_suggestion', 'Consider adding index on frequently queried columns', 'medium');
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to identify slow queries
CREATE OR REPLACE FUNCTION identify_slow_queries(
    min_duration_ms INTEGER DEFAULT 1000,
    limit_results INTEGER DEFAULT 10
)
RETURNS TABLE(
    query TEXT,
    avg_duration_ms NUMERIC,
    total_calls BIGINT,
    total_time_ms NUMERIC,
    rows_avg NUMERIC
) AS $$
BEGIN
    -- Requires pg_stat_statements extension
    RETURN QUERY
    SELECT 
        pss.query,
        ROUND(pss.mean_exec_time::NUMERIC, 2) as avg_duration_ms,
        pss.calls as total_calls,
        ROUND(pss.total_exec_time::NUMERIC, 2) as total_time_ms,
        ROUND(pss.mean_rows::NUMERIC, 2) as rows_avg
    FROM pg_stat_statements pss
    WHERE pss.mean_exec_time > min_duration_ms
    ORDER BY pss.mean_exec_time DESC
    LIMIT limit_results;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. MONITORING AND ALERTING
-- =====================================================

-- Function to monitor database health
CREATE OR REPLACE FUNCTION monitor_database_health()
RETURNS TABLE(
    metric_name TEXT,
    current_value TEXT,
    status TEXT,
    recommendation TEXT
) AS $$
DECLARE
    db_size BIGINT;
    active_connections INTEGER;
    slow_queries INTEGER;
    table_bloat NUMERIC;
BEGIN
    -- Database size
    SELECT pg_database_size(current_database()) INTO db_size;
    RETURN QUERY SELECT 
        'database_size'::TEXT,
        pg_size_pretty(db_size)::TEXT,
        CASE WHEN db_size > 10 * 1024^3 THEN 'warning' ELSE 'healthy' END::TEXT,
        CASE WHEN db_size > 10 * 1024^3 THEN 'Consider archiving old data' ELSE 'Size within limits' END::TEXT;
    
    -- Active connections
    SELECT count(*) FROM pg_stat_activity WHERE state = 'active' INTO active_connections;
    RETURN QUERY SELECT 
        'active_connections'::TEXT,
        active_connections::TEXT,
        CASE WHEN active_connections > 50 THEN 'warning' ELSE 'healthy' END::TEXT,
        CASE WHEN active_connections > 50 THEN 'Consider connection pooling' ELSE 'Connection count normal' END::TEXT;
    
    -- Slow queries (if pg_stat_statements is available)
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements') THEN
        SELECT COUNT(*) FROM pg_stat_statements WHERE mean_exec_time > 1000 INTO slow_queries;
        RETURN QUERY SELECT 
            'slow_queries'::TEXT,
            slow_queries::TEXT,
            CASE WHEN slow_queries > 5 THEN 'warning' ELSE 'healthy' END::TEXT,
            CASE WHEN slow_queries > 5 THEN 'Investigate slow queries' ELSE 'Query performance acceptable' END::TEXT;
    END IF;
    
    -- Check for table bloat on main tables
    SELECT 
        ROUND(
            (pg_total_relation_size('posts'::regclass)::NUMERIC / 
             NULLIF(pg_relation_size('posts'::regclass), 0) - 1) * 100, 2
        ) INTO table_bloat;
    
    RETURN QUERY SELECT 
        'table_bloat_posts'::TEXT,
        COALESCE(table_bloat::TEXT || '%', 'N/A'),
        CASE WHEN table_bloat > 50 THEN 'warning' ELSE 'healthy' END::TEXT,
        CASE WHEN table_bloat > 50 THEN 'Consider VACUUM FULL or reindexing' ELSE 'Bloat within acceptable limits' END::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Function for maintenance recommendations
CREATE OR REPLACE FUNCTION get_maintenance_recommendations()
RETURNS TABLE(
    priority TEXT,
    task TEXT,
    description TEXT,
    estimated_impact TEXT
) AS $$
BEGIN
    -- Check if VACUUM is needed
    IF EXISTS (
        SELECT 1 FROM pg_stat_user_tables 
        WHERE schemaname = 'public' 
        AND n_dead_tup > n_live_tup * 0.1
        AND n_live_tup > 1000
    ) THEN
        RETURN QUERY SELECT 
            'high'::TEXT,
            'vacuum_tables'::TEXT,
            'Several tables have significant dead tuple accumulation'::TEXT,
            'Improved query performance'::TEXT;
    END IF;
    
    -- Check if REINDEX is needed
    IF EXISTS (
        SELECT 1 FROM pg_stat_user_indexes 
        WHERE schemaname = 'public' 
        AND idx_scan < 100 
        AND pg_relation_size(indexrelid) > 10 * 1024 * 1024
    ) THEN
        RETURN QUERY SELECT 
            'medium'::TEXT,
            'review_unused_indexes'::TEXT,
            'Some large indexes appear to be rarely used'::TEXT,
            'Reduced storage usage'::TEXT;
    END IF;
    
    -- Check materialized view freshness
    IF EXISTS (
        SELECT 1 FROM pg_matviews 
        WHERE schemaname = 'public'
    ) THEN
        RETURN QUERY SELECT 
            'medium'::TEXT,
            'refresh_materialized_views'::TEXT,
            'Materialized views should be refreshed regularly'::TEXT,
            'More accurate analytics data'::TEXT;
    END IF;
    
    -- General recommendations
    RETURN QUERY SELECT 
        'low'::TEXT,
        'update_statistics'::TEXT,
        'Run ANALYZE to update table statistics'::TEXT,
        'Better query planning'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. AUTOMATED MAINTENANCE PROCEDURES
-- =====================================================

-- Function to perform routine maintenance
CREATE OR REPLACE FUNCTION perform_routine_maintenance()
RETURNS TABLE(
    task TEXT,
    status TEXT,
    duration INTERVAL,
    details TEXT
) AS $$
DECLARE
    start_time TIMESTAMP;
    task_name TEXT;
BEGIN
    -- VACUUM and ANALYZE critical tables
    FOR task_name IN SELECT unnest(ARRAY['posts', 'user_engagements', 'agents', 'users']) LOOP
        start_time := clock_timestamp();
        EXECUTE format('VACUUM ANALYZE %I', task_name);
        
        RETURN QUERY SELECT 
            task_name,
            'completed'::TEXT,
            clock_timestamp() - start_time,
            format('Vacuumed and analyzed %s table', task_name)::TEXT;
    END LOOP;
    
    -- Refresh materialized views
    start_time := clock_timestamp();
    PERFORM refresh_performance_views();
    
    RETURN QUERY SELECT 
        'refresh_views'::TEXT,
        'completed'::TEXT,
        clock_timestamp() - start_time,
        'Refreshed all materialized views'::TEXT;
    
    -- Update statistics
    start_time := clock_timestamp();
    ANALYZE;
    
    RETURN QUERY SELECT 
        'update_statistics'::TEXT,
        'completed'::TEXT,
        clock_timestamp() - start_time,
        'Updated database statistics'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. PERFORMANCE MONITORING VIEWS
-- =====================================================

-- View for real-time query performance
CREATE OR REPLACE VIEW query_performance AS
SELECT 
    query,
    calls,
    ROUND(total_exec_time::NUMERIC, 2) as total_time_ms,
    ROUND(mean_exec_time::NUMERIC, 2) as avg_time_ms,
    ROUND(max_exec_time::NUMERIC, 2) as max_time_ms,
    ROUND(stddev_exec_time::NUMERIC, 2) as stddev_time_ms,
    rows as total_rows,
    ROUND(mean_rows::NUMERIC, 2) as avg_rows
FROM pg_stat_statements 
WHERE calls > 10
ORDER BY mean_exec_time DESC;

-- View for index usage statistics
CREATE OR REPLACE VIEW index_usage_stats AS
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch,
    CASE 
        WHEN idx_tup_read > 0 
        THEN ROUND((idx_tup_fetch::NUMERIC / idx_tup_read) * 100, 2)
        ELSE 0 
    END as index_efficiency,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_tup_read DESC;

-- View for table statistics
CREATE OR REPLACE VIEW table_stats AS
SELECT 
    schemaname,
    tablename,
    n_live_tup as live_tuples,
    n_dead_tup as dead_tuples,
    CASE 
        WHEN n_live_tup > 0 
        THEN ROUND((n_dead_tup::NUMERIC / n_live_tup) * 100, 2)
        ELSE 0 
    END as dead_tuple_ratio,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze,
    pg_size_pretty(pg_total_relation_size(relid)) as total_size
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(relid) DESC;

COMMIT;

-- =====================================================
-- 8. PERFORMANCE TESTING QUERIES
-- =====================================================

-- Test query performance for common operations
\echo 'Testing query performance...'

-- Test 1: User feed query
\timing on
SELECT p.id, p.title, p.content_body, u.name, p.likes_count, p.comments_count
FROM posts p
JOIN users u ON p.author_id = u.id
WHERE p.processing_status = 'published' 
  AND p.deleted_at IS NULL
ORDER BY p.published_at DESC
LIMIT 20;

-- Test 2: Agent performance query
SELECT a.name, COUNT(p.id) as post_count, AVG(p.business_impact) as avg_impact
FROM agents a
LEFT JOIN posts p ON a.id = p.agent_id AND p.deleted_at IS NULL
GROUP BY a.id, a.name
ORDER BY post_count DESC;

-- Test 3: Engagement analytics query
SELECT 
    p.id, 
    p.title, 
    COUNT(ue.id) as engagement_count,
    COUNT(CASE WHEN ue.engagement_type = 'like' THEN 1 END) as likes
FROM posts p
LEFT JOIN user_engagements ue ON p.id = ue.post_id
WHERE p.created_at >= NOW() - INTERVAL '7 days'
  AND p.deleted_at IS NULL
GROUP BY p.id, p.title
HAVING COUNT(ue.id) > 0
ORDER BY engagement_count DESC
LIMIT 10;

-- Test 4: Full-text search query
SELECT p.id, p.title, ts_rank_cd(search_vector, query) as rank
FROM posts p, to_tsquery('english', 'agent & workflow') query
WHERE search_vector @@ query
  AND p.deleted_at IS NULL
ORDER BY rank DESC
LIMIT 10;

\timing off

-- =====================================================
-- MAINTENANCE SCHEDULE RECOMMENDATIONS
-- =====================================================

\echo 'Performance optimization complete!'
\echo ''
\echo 'Recommended maintenance schedule:'
\echo '  Daily:   SELECT perform_routine_maintenance();'
\echo '  Weekly:  SELECT refresh_performance_views();'
\echo '  Monthly: SELECT monitor_database_health();'
\echo '  Quarterly: SELECT get_maintenance_recommendations();'
\echo ''
\echo 'Monitor performance with:'
\echo '  SELECT * FROM query_performance;'
\echo '  SELECT * FROM index_usage_stats;'
\echo '  SELECT * FROM table_stats;'
\echo ''