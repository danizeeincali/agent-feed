-- Rollback Script for Agent Posts Enhancement Migration
-- Rollback: rollback-010-agent-posts-enhancement.sql
-- Target Migration: 010_create_agent_posts_enhancement.sql
-- Version: 1.0.0
-- Date: 2025-01-04

BEGIN;

-- =============================================================================
-- 1. DROP TRIGGERS
-- =============================================================================

DROP TRIGGER IF EXISTS tr_agent_posts_content_hash ON agent_posts;
DROP TRIGGER IF EXISTS tr_agent_posts_updated_at ON agent_posts;
DROP TRIGGER IF EXISTS tr_agent_posts_engagement_metrics ON agent_posts;
DROP TRIGGER IF EXISTS tr_post_quality_metrics_updated_at ON post_quality_metrics;
DROP TRIGGER IF EXISTS tr_posting_templates_updated_at ON posting_templates;

-- =============================================================================
-- 2. DROP FUNCTIONS
-- =============================================================================

DROP FUNCTION IF EXISTS update_modified_timestamp();
DROP FUNCTION IF EXISTS calculate_post_content_hash();
DROP FUNCTION IF EXISTS update_engagement_metrics();

-- =============================================================================
-- 3. DROP INDEXES
-- =============================================================================

-- Agent posts indexes
DROP INDEX IF EXISTS idx_agent_posts_agent_status;
DROP INDEX IF EXISTS idx_agent_posts_user_published;
DROP INDEX IF EXISTS idx_agent_posts_quality_engagement;
DROP INDEX IF EXISTS idx_agent_posts_content_hash;
DROP INDEX IF EXISTS idx_agent_posts_tags;
DROP INDEX IF EXISTS idx_agent_posts_search_content;
DROP INDEX IF EXISTS idx_agent_posts_scheduled;

-- Post quality metrics indexes
DROP INDEX IF EXISTS idx_post_quality_post_overall;
DROP INDEX IF EXISTS idx_post_quality_ai_assessment;
DROP INDEX IF EXISTS idx_post_quality_trend;

-- Feed analytics indexes
DROP INDEX IF EXISTS idx_feed_analytics_date_granularity;
DROP INDEX IF EXISTS idx_feed_analytics_engagement;
DROP INDEX IF EXISTS idx_feed_analytics_quality;

-- Posting templates indexes
DROP INDEX IF EXISTS idx_posting_templates_user_category;
DROP INDEX IF EXISTS idx_posting_templates_agent_performance;
DROP INDEX IF EXISTS idx_posting_templates_public;

-- =============================================================================
-- 4. RESTORE ORIGINAL FEED_ANALYTICS TABLE (if partitioned)
-- =============================================================================

-- Check if we need to restore from partitioned table
DO $$
BEGIN
    -- If feed_analytics is partitioned, restore from backup
    IF EXISTS (
        SELECT 1 FROM pg_partitioned_table 
        WHERE schemaname = 'public' AND tablename = 'feed_analytics'
    ) THEN
        -- Create temporary table with original structure
        CREATE TABLE feed_analytics_restore AS 
        SELECT * FROM feed_analytics;
        
        -- Drop partitioned table and partitions
        DROP TABLE IF EXISTS feed_analytics CASCADE;
        
        -- Recreate as regular table
        CREATE TABLE feed_analytics (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            analysis_date DATE NOT NULL,
            analysis_hour INTEGER CHECK (analysis_hour BETWEEN 0 AND 23),
            time_granularity VARCHAR(20) NOT NULL DEFAULT 'daily'
                CHECK (time_granularity IN ('hourly', 'daily', 'weekly', 'monthly')),
            total_posts INTEGER DEFAULT 0,
            active_agents INTEGER DEFAULT 0,
            unique_viewers INTEGER DEFAULT 0,
            total_page_views BIGINT DEFAULT 0,
            unique_page_views BIGINT DEFAULT 0,
            total_likes INTEGER DEFAULT 0,
            total_comments INTEGER DEFAULT 0,
            total_shares INTEGER DEFAULT 0,
            total_bookmarks INTEGER DEFAULT 0,
            avg_engagement_rate DECIMAL(5,4) DEFAULT 0.0,
            top_performing_posts JSONB DEFAULT '[]',
            trending_topics JSONB DEFAULT '[]',
            content_type_performance JSONB DEFAULT '{}',
            category_performance JSONB DEFAULT '{}',
            avg_session_duration INTERVAL,
            bounce_rate DECIMAL(5,4) DEFAULT 0.0,
            pages_per_session DECIMAL(5,2) DEFAULT 0.0,
            returning_visitor_rate DECIMAL(5,4) DEFAULT 0.0,
            avg_content_quality_score DECIMAL(5,4) DEFAULT 0.0,
            quality_distribution JSONB DEFAULT '{}',
            quality_trends JSONB DEFAULT '{}',
            low_quality_post_count INTEGER DEFAULT 0,
            top_performing_agents JSONB DEFAULT '[]',
            agent_engagement_metrics JSONB DEFAULT '{}',
            agent_quality_metrics JSONB DEFAULT '{}',
            agent_activity_patterns JSONB DEFAULT '{}',
            predicted_engagement JSONB DEFAULT '{}',
            content_recommendations JSONB DEFAULT '[]',
            optimization_suggestions JSONB DEFAULT '[]',
            growth_projections JSONB DEFAULT '{}',
            user_segment_performance JSONB DEFAULT '{}',
            demographic_insights JSONB DEFAULT '{}',
            behavioral_patterns JSONB DEFAULT '{}',
            page_load_times JSONB DEFAULT '{}',
            error_rates JSONB DEFAULT '{}',
            api_performance JSONB DEFAULT '{}',
            conversion_metrics JSONB DEFAULT '{}',
            retention_metrics JSONB DEFAULT '{}',
            growth_metrics JSONB DEFAULT '{}',
            monetization_metrics JSONB DEFAULT '{}',
            data_completeness DECIMAL(3,2) DEFAULT 1.0 CHECK (data_completeness BETWEEN 0 AND 1),
            data_freshness_minutes INTEGER DEFAULT 0,
            analysis_confidence DECIMAL(3,2) DEFAULT 0.95,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            analysis_duration INTERVAL,
            data_sources JSONB DEFAULT '[]',
            UNIQUE(analysis_date, analysis_hour, time_granularity)
        );
        
        -- Restore data
        INSERT INTO feed_analytics SELECT * FROM feed_analytics_restore;
        DROP TABLE feed_analytics_restore;
    END IF;
END
$$;

-- =============================================================================
-- 5. DROP TABLES (in reverse dependency order)
-- =============================================================================

DROP TABLE IF EXISTS post_quality_metrics CASCADE;
DROP TABLE IF EXISTS posting_templates CASCADE;
DROP TABLE IF EXISTS feed_analytics CASCADE;
DROP TABLE IF EXISTS agent_posts CASCADE;

-- =============================================================================
-- 6. REMOVE EXTENSIONS (only if they were added by this migration)
-- =============================================================================

-- Note: We don't drop extensions as they might be used by other parts of the system
-- DROP EXTENSION IF EXISTS "btree_gin";
-- DROP EXTENSION IF EXISTS "pg_stat_statements";
-- These should be manually removed if needed

-- =============================================================================
-- 7. VERIFICATION
-- =============================================================================

-- Verify tables are removed
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agent_posts') THEN
        RAISE EXCEPTION 'Rollback failed: agent_posts table still exists';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'post_quality_metrics') THEN
        RAISE EXCEPTION 'Rollback failed: post_quality_metrics table still exists';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'posting_templates') THEN
        RAISE EXCEPTION 'Rollback failed: posting_templates table still exists';
    END IF;
    
    RAISE NOTICE 'Rollback completed successfully - all tables and related objects removed';
END
$$;

COMMIT;

-- =============================================================================
-- 8. ROLLBACK VERIFICATION REPORT
-- =============================================================================

-- Generate rollback report
SELECT 
    'Rollback Summary' as report_section,
    NOW() as rollback_timestamp,
    'Migration 010_create_agent_posts_enhancement.sql successfully rolled back' as status;

-- Verify no remaining objects
SELECT 
    'Remaining Objects Check' as report_section,
    COUNT(*) as remaining_tables
FROM information_schema.tables 
WHERE table_name IN ('agent_posts', 'post_quality_metrics', 'feed_analytics', 'posting_templates')
    AND table_schema = 'public';