-- Performance Optimization and Index Strategy Migration
-- Migration: 012_create_performance_optimization.sql
-- Version: 1.0.0
-- Date: 2025-01-04
-- Description: Advanced indexing, partitioning, and query optimization for high-volume posting

BEGIN;

-- =============================================================================
-- 1. ADVANCED INDEXING STRATEGIES
-- =============================================================================

-- Composite indexes for common query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agent_posts_compound_performance 
    ON agent_posts(status, published_at DESC, quality_score DESC, engagement_rate DESC)
    WHERE status = 'published';

-- Partial indexes for frequently filtered data
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agent_posts_high_quality 
    ON agent_posts(published_at DESC, view_count DESC)
    WHERE status = 'published' AND quality_score >= 0.7;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agent_posts_trending 
    ON agent_posts(published_at DESC, engagement_rate DESC, view_count DESC)
    WHERE status = 'published' 
    AND published_at >= NOW() - INTERVAL '24 hours' 
    AND engagement_rate >= 0.1;

-- Multi-column indexes for user-specific queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agent_posts_user_feed_optimized 
    ON agent_posts(user_id, status, published_at DESC, priority_level DESC)
    INCLUDE (title, summary, view_count, like_count, comment_count);

-- Category and tag optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agent_posts_category_performance 
    ON agent_posts(category, subcategory, published_at DESC, quality_score DESC)
    WHERE status = 'published';

-- Hash index for exact content hash lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agent_posts_content_hash_hash 
    ON agent_posts USING HASH (content_hash);

-- =============================================================================
-- 2. SPECIALIZED INDEXES FOR ANALYTICS QUERIES
-- =============================================================================

-- Time-series optimized indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_interaction_events_time_series 
    ON user_interaction_events(event_timestamp DESC, event_type, post_id)
    WHERE event_timestamp >= NOW() - INTERVAL '30 days';

-- Engagement pattern analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_sessions_engagement_analysis 
    ON user_sessions_detailed(session_start::DATE, device_type, session_quality_score DESC)
    INCLUDE (session_duration, page_views, posts_viewed);

-- Content performance trending
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_content_performance_trending 
    ON content_performance_metrics(measurement_date DESC, trend_direction, growth_rate DESC)
    WHERE trend_direction = 'up' AND measurement_date >= CURRENT_DATE - INTERVAL '7 days';

-- =============================================================================
-- 3. PARTITIONING STRATEGY FOR HIGH-VOLUME TABLES
-- =============================================================================

-- Function to create time-based partitions automatically
CREATE OR REPLACE FUNCTION create_time_partitions(
    table_name TEXT,
    start_date DATE,
    partition_interval INTERVAL,
    num_partitions INTEGER
)
RETURNS INTEGER AS $$
DECLARE
    partition_date DATE;
    end_date DATE;
    partition_name TEXT;
    sql_command TEXT;
    created_count INTEGER := 0;
BEGIN
    FOR i IN 0..num_partitions-1 LOOP
        partition_date := start_date + (i * partition_interval);
        end_date := partition_date + partition_interval;
        partition_name := table_name || '_' || to_char(partition_date, 'YYYY_MM_DD');
        
        -- Check if partition already exists
        IF NOT EXISTS (
            SELECT 1 FROM pg_class 
            WHERE relname = partition_name AND relkind = 'r'
        ) THEN
            sql_command := format(
                'CREATE TABLE %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
                partition_name, table_name, partition_date, end_date
            );
            
            EXECUTE sql_command;
            created_count := created_count + 1;
            
            -- Create indexes on new partition
            EXECUTE format('CREATE INDEX CONCURRENTLY %I ON %I (event_timestamp DESC)', 
                          'idx_' || partition_name || '_timestamp', partition_name);
        END IF;
    END LOOP;
    
    RETURN created_count;
END;
$$ LANGUAGE plpgsql;

-- Create additional partitions for user interaction events (daily partitions for high volume)
SELECT create_time_partitions('user_interaction_events', CURRENT_DATE, INTERVAL '1 day', 90);

-- Partition content_performance_metrics by month
ALTER TABLE content_performance_metrics RENAME TO content_performance_metrics_old;

CREATE TABLE content_performance_metrics (
    LIKE content_performance_metrics_old INCLUDING ALL
) PARTITION BY RANGE (measurement_date);

-- Create monthly partitions
CREATE TABLE content_performance_metrics_2025_01 PARTITION OF content_performance_metrics
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE content_performance_metrics_2025_02 PARTITION OF content_performance_metrics
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
CREATE TABLE content_performance_metrics_2025_03 PARTITION OF content_performance_metrics
    FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');
CREATE TABLE content_performance_metrics_2025_04 PARTITION OF content_performance_metrics
    FOR VALUES FROM ('2025-04-01') TO ('2025-05-01');

-- Copy data from old table
INSERT INTO content_performance_metrics SELECT * FROM content_performance_metrics_old;
DROP TABLE content_performance_metrics_old;

-- =============================================================================
-- 4. QUERY OPTIMIZATION FUNCTIONS
-- =============================================================================

-- Optimized function for feed retrieval with caching hints
CREATE OR REPLACE FUNCTION get_optimized_feed(
    p_user_id UUID DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0,
    p_quality_threshold DECIMAL DEFAULT 0.0,
    p_time_window INTERVAL DEFAULT INTERVAL '30 days'
)
RETURNS TABLE (
    post_id UUID,
    title VARCHAR,
    summary TEXT,
    published_at TIMESTAMP WITH TIME ZONE,
    quality_score DECIMAL,
    engagement_rate DECIMAL,
    view_count BIGINT,
    like_count INTEGER,
    comment_count INTEGER,
    agent_name VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ap.id,
        ap.title,
        ap.summary,
        ap.published_at,
        ap.quality_score,
        ap.engagement_rate,
        ap.view_count,
        ap.like_count,
        ap.comment_count,
        ag.name as agent_name
    FROM agent_posts ap
    LEFT JOIN agents ag ON ap.agent_id = ag.id
    WHERE ap.status = 'published'
        AND ap.published_at >= NOW() - p_time_window
        AND ap.quality_score >= p_quality_threshold
        AND (p_user_id IS NULL OR ap.user_id = p_user_id)
    ORDER BY 
        ap.published_at DESC,
        ap.quality_score DESC,
        ap.engagement_rate DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function for efficient content similarity search
CREATE OR REPLACE FUNCTION find_similar_content(
    p_post_id UUID,
    p_similarity_threshold DECIMAL DEFAULT 0.3,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    similar_post_id UUID,
    similarity_score DECIMAL,
    title VARCHAR,
    published_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    WITH post_vectors AS (
        SELECT 
            id,
            title,
            published_at,
            -- Simple text similarity using trigram matching
            SIMILARITY(content, (SELECT content FROM agent_posts WHERE id = p_post_id)) as sim_score
        FROM agent_posts
        WHERE status = 'published' 
        AND id != p_post_id
        AND published_at >= NOW() - INTERVAL '90 days'
    )
    SELECT 
        pv.id,
        pv.sim_score,
        pv.title,
        pv.published_at
    FROM post_vectors pv
    WHERE pv.sim_score >= p_similarity_threshold
    ORDER BY pv.sim_score DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================================================
-- 5. MATERIALIZED VIEWS FOR ANALYTICS
-- =============================================================================

-- Hourly engagement summary materialized view
CREATE MATERIALIZED VIEW hourly_engagement_summary AS
SELECT 
    DATE_TRUNC('hour', event_timestamp) as hour_bucket,
    event_type,
    COUNT(*) as event_count,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT post_id) as unique_posts,
    AVG(CASE WHEN event_duration IS NOT NULL THEN event_duration ELSE 0 END) as avg_duration,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY event_duration) as median_duration
FROM user_interaction_events
WHERE event_timestamp >= NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('hour', event_timestamp), event_type;

CREATE UNIQUE INDEX ON hourly_engagement_summary (hour_bucket, event_type);

-- Daily content performance summary
CREATE MATERIALIZED VIEW daily_content_performance AS
SELECT 
    measurement_date,
    COUNT(DISTINCT post_id) as total_posts,
    AVG(unique_views) as avg_unique_views,
    SUM(total_views) as total_views_sum,
    AVG(completion_rate) as avg_completion_rate,
    AVG(user_satisfaction_score) as avg_satisfaction,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY unique_views) as p95_views,
    COUNT(*) FILTER (WHERE viral_coefficient > 1.0) as viral_posts_count
FROM content_performance_metrics
WHERE measurement_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY measurement_date;

CREATE UNIQUE INDEX ON daily_content_performance (measurement_date);

-- Agent performance leaderboard
CREATE MATERIALIZED VIEW agent_performance_leaderboard AS
SELECT 
    ap.agent_id,
    ag.name as agent_name,
    COUNT(*) as total_posts,
    AVG(ap.quality_score) as avg_quality_score,
    AVG(ap.engagement_rate) as avg_engagement_rate,
    SUM(ap.view_count) as total_views,
    SUM(ap.like_count) as total_likes,
    AVG(cpm.user_satisfaction_score) as avg_user_satisfaction,
    RANK() OVER (ORDER BY AVG(ap.quality_score) DESC) as quality_rank,
    RANK() OVER (ORDER BY AVG(ap.engagement_rate) DESC) as engagement_rank
FROM agent_posts ap
LEFT JOIN agents ag ON ap.agent_id = ag.id
LEFT JOIN content_performance_metrics cpm ON ap.id = cpm.post_id
WHERE ap.status = 'published' 
AND ap.published_at >= NOW() - INTERVAL '30 days'
GROUP BY ap.agent_id, ag.name
HAVING COUNT(*) >= 5; -- Only agents with at least 5 posts

CREATE UNIQUE INDEX ON agent_performance_leaderboard (agent_id);

-- =============================================================================
-- 6. AUTOMATED MAINTENANCE PROCEDURES
-- =============================================================================

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY hourly_engagement_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY daily_content_performance;
    REFRESH MATERIALIZED VIEW CONCURRENTLY agent_performance_leaderboard;
    
    -- Log the refresh
    INSERT INTO system_maintenance_log (operation, status, details)
    VALUES ('refresh_analytics_views', 'completed', 
            jsonb_build_object('timestamp', NOW(), 'views_refreshed', 3));
END;
$$ LANGUAGE plpgsql;

-- Create maintenance log table if it doesn't exist
CREATE TABLE IF NOT EXISTS system_maintenance_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operation VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Function to clean up old interaction events
CREATE OR REPLACE FUNCTION cleanup_old_interaction_events(
    retention_days INTEGER DEFAULT 90
)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
    cutoff_date DATE;
BEGIN
    cutoff_date := CURRENT_DATE - (retention_days || ' days')::INTERVAL;
    
    -- Delete old interaction events beyond retention period
    DELETE FROM user_interaction_events
    WHERE event_timestamp < cutoff_date;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log the cleanup
    INSERT INTO system_maintenance_log (operation, status, details)
    VALUES ('cleanup_old_interaction_events', 'completed',
            jsonb_build_object(
                'deleted_count', deleted_count,
                'cutoff_date', cutoff_date,
                'retention_days', retention_days
            ));
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 7. QUERY PERFORMANCE MONITORING
-- =============================================================================

-- Function to identify slow queries and optimization opportunities
CREATE OR REPLACE FUNCTION analyze_query_performance()
RETURNS TABLE (
    query_text TEXT,
    avg_execution_time_ms DOUBLE PRECISION,
    total_calls BIGINT,
    total_time_ms DOUBLE PRECISION,
    optimization_priority INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pss.query,
        pss.mean_time as avg_execution_time_ms,
        pss.calls as total_calls,
        pss.total_time as total_time_ms,
        CASE 
            WHEN pss.mean_time > 1000 THEN 1 -- Critical: > 1 second average
            WHEN pss.mean_time > 500 THEN 2  -- High: > 500ms average
            WHEN pss.total_time > 60000 THEN 3 -- Medium: > 1 minute total
            ELSE 4 -- Low priority
        END as optimization_priority
    FROM pg_stat_statements pss
    WHERE pss.query NOT LIKE '%pg_stat_statements%'
    AND pss.calls > 10 -- Only frequently called queries
    ORDER BY optimization_priority ASC, pss.mean_time DESC;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 8. CONNECTION AND RESOURCE OPTIMIZATION
-- =============================================================================

-- Set optimal configuration for high-volume operations
-- Note: These would typically be set in postgresql.conf, but shown here for documentation

-- Connection pooling recommendations
COMMENT ON DATABASE postgres IS 'Recommended connection pool settings:
- max_connections: 200-500 (depending on hardware)
- shared_buffers: 25% of RAM
- effective_cache_size: 75% of RAM
- work_mem: 4-16MB per connection
- maintenance_work_mem: 256MB-1GB';

-- Function to get current database performance metrics
CREATE OR REPLACE FUNCTION get_database_performance_metrics()
RETURNS TABLE (
    metric_name VARCHAR,
    metric_value TEXT,
    recommendation TEXT
) AS $$
BEGIN
    -- Connection usage
    RETURN QUERY
    SELECT 
        'active_connections'::VARCHAR,
        (SELECT COUNT(*)::TEXT FROM pg_stat_activity WHERE state = 'active'),
        'Monitor for connection pool saturation'::TEXT;
    
    -- Cache hit ratio
    RETURN QUERY
    SELECT 
        'cache_hit_ratio'::VARCHAR,
        ROUND(
            (SELECT SUM(heap_blks_hit) / (SUM(heap_blks_hit) + SUM(heap_blks_read)) * 100 
             FROM pg_statio_user_tables)::NUMERIC, 2
        )::TEXT || '%',
        'Should be > 95% for optimal performance'::TEXT;
    
    -- Index usage
    RETURN QUERY
    SELECT 
        'index_usage_ratio'::VARCHAR,
        ROUND(
            (SELECT SUM(idx_scan) / (SUM(seq_scan) + SUM(idx_scan)) * 100 
             FROM pg_stat_user_tables WHERE seq_scan + idx_scan > 0)::NUMERIC, 2
        )::TEXT || '%',
        'Should be > 90% for optimal query performance'::TEXT;
    
    -- Database size
    RETURN QUERY
    SELECT 
        'database_size'::VARCHAR,
        pg_size_pretty(pg_database_size(current_database())),
        'Monitor growth patterns and plan for scaling'::TEXT;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- =============================================================================
-- 9. POST-MIGRATION VALIDATION
-- =============================================================================

-- Validate that all indexes were created successfully
DO $$
DECLARE
    missing_indexes TEXT[];
    idx_name TEXT;
BEGIN
    -- Check for critical indexes
    FOR idx_name IN VALUES 
        ('idx_agent_posts_compound_performance'),
        ('idx_agent_posts_high_quality'),
        ('idx_agent_posts_trending'),
        ('idx_user_interaction_events_time_series'),
        ('idx_content_performance_trending')
    LOOP
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = idx_name) THEN
            missing_indexes := array_append(missing_indexes, idx_name);
        END IF;
    END LOOP;
    
    IF array_length(missing_indexes, 1) > 0 THEN
        RAISE WARNING 'Missing indexes: %', array_to_string(missing_indexes, ', ');
    ELSE
        RAISE NOTICE 'All performance optimization indexes created successfully';
    END IF;
END $$;

-- Generate performance optimization report
SELECT 
    'Performance Optimization Migration Completed' as status,
    NOW() as completion_time,
    (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public') as total_indexes_created,
    (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public' AND routine_type = 'FUNCTION') as total_functions_created;