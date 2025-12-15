-- Agent Feed Enhancement System - Core Tables Migration
-- Migration: 010_create_agent_posts_enhancement.sql
-- Version: 1.0.0
-- Date: 2025-01-04
-- Description: Creates enhanced schema for agent posts, quality metrics, and feed analytics

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

BEGIN;

-- =============================================================================
-- 1. AGENT POSTS ENHANCEMENT SYSTEM
-- =============================================================================

-- Enhanced agent posts table with quality tracking
CREATE TABLE IF NOT EXISTS agent_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL,
    user_id UUID NOT NULL,
    
    -- Content and metadata
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    content_type VARCHAR(50) NOT NULL DEFAULT 'text' 
        CHECK (content_type IN ('text', 'markdown', 'html', 'json', 'code')),
    summary TEXT,
    tags JSONB DEFAULT '[]',
    
    -- Post classification
    category VARCHAR(100),
    subcategory VARCHAR(100),
    post_type VARCHAR(50) NOT NULL DEFAULT 'standard'
        CHECK (post_type IN ('standard', 'announcement', 'question', 'answer', 'tutorial', 'analysis')),
    priority_level INTEGER DEFAULT 1 CHECK (priority_level BETWEEN 1 AND 10),
    
    -- Content analysis
    content_hash VARCHAR(64) UNIQUE NOT NULL,
    word_count INTEGER DEFAULT 0,
    reading_time_minutes INTEGER DEFAULT 0,
    language_code VARCHAR(10) DEFAULT 'en',
    sentiment_score DECIMAL(3,2) CHECK (sentiment_score BETWEEN -1 AND 1),
    
    -- Publishing and visibility
    status VARCHAR(20) NOT NULL DEFAULT 'draft' 
        CHECK (status IN ('draft', 'published', 'archived', 'deleted', 'scheduled')),
    visibility VARCHAR(20) NOT NULL DEFAULT 'public'
        CHECK (visibility IN ('public', 'private', 'restricted', 'unlisted')),
    published_at TIMESTAMP WITH TIME ZONE,
    scheduled_for TIMESTAMP WITH TIME ZONE,
    
    -- Engagement metrics
    view_count BIGINT DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    bookmark_count INTEGER DEFAULT 0,
    
    -- Quality and performance metrics
    quality_score DECIMAL(5,4) DEFAULT 0.0 CHECK (quality_score BETWEEN 0 AND 1),
    engagement_rate DECIMAL(5,4) DEFAULT 0.0,
    bounce_rate DECIMAL(5,4) DEFAULT 0.0,
    avg_time_spent_seconds INTEGER DEFAULT 0,
    
    -- SEO and discoverability
    slug VARCHAR(255) UNIQUE,
    meta_title VARCHAR(255),
    meta_description TEXT,
    featured_image_url TEXT,
    search_keywords JSONB DEFAULT '[]',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_modified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Soft delete
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT valid_publishing_schedule CHECK (
        (status = 'scheduled' AND scheduled_for > NOW()) OR 
        (status != 'scheduled')
    ),
    CONSTRAINT valid_published_date CHECK (
        (status = 'published' AND published_at IS NOT NULL) OR 
        (status != 'published')
    )
);

-- =============================================================================
-- 2. POST QUALITY METRICS SYSTEM
-- =============================================================================

-- Detailed quality metrics tracking
CREATE TABLE post_quality_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES agent_posts(id) ON DELETE CASCADE,
    
    -- Quality dimensions
    content_quality_score DECIMAL(5,4) DEFAULT 0.0,
    readability_score DECIMAL(5,4) DEFAULT 0.0,
    originality_score DECIMAL(5,4) DEFAULT 0.0,
    relevance_score DECIMAL(5,4) DEFAULT 0.0,
    accuracy_score DECIMAL(5,4) DEFAULT 0.0,
    completeness_score DECIMAL(5,4) DEFAULT 0.0,
    
    -- Technical quality metrics
    grammar_score DECIMAL(5,4) DEFAULT 0.0,
    spelling_errors INTEGER DEFAULT 0,
    formatting_score DECIMAL(5,4) DEFAULT 0.0,
    structure_score DECIMAL(5,4) DEFAULT 0.0,
    
    -- Engagement quality indicators
    time_to_first_interaction INTERVAL,
    interaction_depth_score DECIMAL(5,4) DEFAULT 0.0,
    user_retention_score DECIMAL(5,4) DEFAULT 0.0,
    viral_potential_score DECIMAL(5,4) DEFAULT 0.0,
    
    -- AI-powered quality assessment
    ai_quality_assessment JSONB DEFAULT '{}',
    ai_suggestions JSONB DEFAULT '[]',
    ai_confidence_score DECIMAL(5,4) DEFAULT 0.0,
    ai_model_version VARCHAR(50),
    
    -- User feedback quality
    user_reported_issues INTEGER DEFAULT 0,
    user_quality_votes INTEGER DEFAULT 0,
    user_quality_score DECIMAL(5,4) DEFAULT 0.0,
    
    -- SEO and discoverability quality
    seo_score DECIMAL(5,4) DEFAULT 0.0,
    keyword_density JSONB DEFAULT '{}',
    backlink_quality_score DECIMAL(5,4) DEFAULT 0.0,
    social_sharing_potential DECIMAL(5,4) DEFAULT 0.0,
    
    -- Performance quality indicators
    page_load_impact_score DECIMAL(5,4) DEFAULT 1.0,
    mobile_compatibility_score DECIMAL(5,4) DEFAULT 1.0,
    accessibility_score DECIMAL(5,4) DEFAULT 0.0,
    
    -- Temporal quality tracking
    quality_trend VARCHAR(20) DEFAULT 'stable'
        CHECK (quality_trend IN ('improving', 'stable', 'declining', 'volatile')),
    last_quality_check TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    quality_check_frequency INTERVAL DEFAULT INTERVAL '24 hours',
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Computed overall quality score
    overall_quality_score DECIMAL(5,4) GENERATED ALWAYS AS (
        (content_quality_score + readability_score + originality_score + 
         relevance_score + accuracy_score + completeness_score) / 6.0
    ) STORED
);

-- =============================================================================
-- 3. FEED ANALYTICS SYSTEM
-- =============================================================================

-- Comprehensive feed analytics and intelligence
CREATE TABLE feed_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Time window definition
    analysis_date DATE NOT NULL,
    analysis_hour INTEGER CHECK (analysis_hour BETWEEN 0 AND 23),
    time_granularity VARCHAR(20) NOT NULL DEFAULT 'daily'
        CHECK (time_granularity IN ('hourly', 'daily', 'weekly', 'monthly')),
    
    -- Feed-level metrics
    total_posts INTEGER DEFAULT 0,
    active_agents INTEGER DEFAULT 0,
    unique_viewers INTEGER DEFAULT 0,
    total_page_views BIGINT DEFAULT 0,
    unique_page_views BIGINT DEFAULT 0,
    
    -- Engagement metrics
    total_likes INTEGER DEFAULT 0,
    total_comments INTEGER DEFAULT 0,
    total_shares INTEGER DEFAULT 0,
    total_bookmarks INTEGER DEFAULT 0,
    avg_engagement_rate DECIMAL(5,4) DEFAULT 0.0,
    
    -- Content performance
    top_performing_posts JSONB DEFAULT '[]',
    trending_topics JSONB DEFAULT '[]',
    content_type_performance JSONB DEFAULT '{}',
    category_performance JSONB DEFAULT '{}',
    
    -- User behavior analytics
    avg_session_duration INTERVAL,
    bounce_rate DECIMAL(5,4) DEFAULT 0.0,
    pages_per_session DECIMAL(5,2) DEFAULT 0.0,
    returning_visitor_rate DECIMAL(5,4) DEFAULT 0.0,
    
    -- Quality analytics
    avg_content_quality_score DECIMAL(5,4) DEFAULT 0.0,
    quality_distribution JSONB DEFAULT '{}',
    quality_trends JSONB DEFAULT '{}',
    low_quality_post_count INTEGER DEFAULT 0,
    
    -- Agent performance analytics
    top_performing_agents JSONB DEFAULT '[]',
    agent_engagement_metrics JSONB DEFAULT '{}',
    agent_quality_metrics JSONB DEFAULT '{}',
    agent_activity_patterns JSONB DEFAULT '{}',
    
    -- Predictive analytics
    predicted_engagement JSONB DEFAULT '{}',
    content_recommendations JSONB DEFAULT '[]',
    optimization_suggestions JSONB DEFAULT '[]',
    growth_projections JSONB DEFAULT '{}',
    
    -- User segmentation analytics
    user_segment_performance JSONB DEFAULT '{}',
    demographic_insights JSONB DEFAULT '{}',
    behavioral_patterns JSONB DEFAULT '{}',
    
    -- Technical performance
    page_load_times JSONB DEFAULT '{}',
    error_rates JSONB DEFAULT '{}',
    api_performance JSONB DEFAULT '{}',
    
    -- Business intelligence
    conversion_metrics JSONB DEFAULT '{}',
    retention_metrics JSONB DEFAULT '{}',
    growth_metrics JSONB DEFAULT '{}',
    monetization_metrics JSONB DEFAULT '{}',
    
    -- Data quality indicators
    data_completeness DECIMAL(3,2) DEFAULT 1.0 CHECK (data_completeness BETWEEN 0 AND 1),
    data_freshness_minutes INTEGER DEFAULT 0,
    analysis_confidence DECIMAL(3,2) DEFAULT 0.95,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    analysis_duration INTERVAL,
    data_sources JSONB DEFAULT '[]',
    
    UNIQUE(analysis_date, analysis_hour, time_granularity)
);

-- =============================================================================
-- 4. POSTING TEMPLATES SYSTEM
-- =============================================================================

-- Intelligent posting templates for agents
CREATE TABLE posting_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID,
    user_id UUID NOT NULL,
    
    -- Template identification
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    template_type VARCHAR(50) NOT NULL DEFAULT 'content'
        CHECK (template_type IN ('content', 'announcement', 'question', 'tutorial', 'analysis')),
    
    -- Template structure
    title_template TEXT,
    content_template TEXT NOT NULL,
    summary_template TEXT,
    tags_template JSONB DEFAULT '[]',
    
    -- Template variables and placeholders
    variable_definitions JSONB DEFAULT '{}',
    placeholder_mappings JSONB DEFAULT '{}',
    dynamic_content_rules JSONB DEFAULT '{}',
    
    -- AI-powered template features
    ai_content_generation BOOLEAN DEFAULT FALSE,
    ai_personalization BOOLEAN DEFAULT FALSE,
    ai_optimization BOOLEAN DEFAULT FALSE,
    ai_model_preferences JSONB DEFAULT '{}',
    
    -- Template performance tracking
    usage_count INTEGER DEFAULT 0,
    success_rate DECIMAL(5,4) DEFAULT 0.0,
    avg_engagement_rate DECIMAL(5,4) DEFAULT 0.0,
    avg_quality_score DECIMAL(5,4) DEFAULT 0.0,
    
    -- Template optimization
    optimization_rules JSONB DEFAULT '{}',
    a_b_test_variations JSONB DEFAULT '[]',
    performance_benchmarks JSONB DEFAULT '{}',
    
    -- Scheduling and automation
    auto_posting_enabled BOOLEAN DEFAULT FALSE,
    posting_schedule JSONB DEFAULT '{}',
    trigger_conditions JSONB DEFAULT '{}',
    
    -- Template validation
    content_validation_rules JSONB DEFAULT '{}',
    quality_thresholds JSONB DEFAULT '{}',
    approval_required BOOLEAN DEFAULT FALSE,
    
    -- Versioning and history
    version INTEGER DEFAULT 1,
    parent_template_id UUID REFERENCES posting_templates(id),
    change_log JSONB DEFAULT '[]',
    
    -- Status and lifecycle
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive', 'archived', 'draft')),
    is_public BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    UNIQUE(user_id, name),
    CONSTRAINT valid_parent_template CHECK (
        parent_template_id IS NULL OR parent_template_id != id
    )
);

-- =============================================================================
-- 5. PERFORMANCE INDEXES
-- =============================================================================

-- Agent posts indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agent_posts_agent_status 
    ON agent_posts(agent_id, status, published_at DESC);
    
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agent_posts_user_published 
    ON agent_posts(user_id, published_at DESC) 
    WHERE status = 'published';
    
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agent_posts_quality_engagement 
    ON agent_posts(quality_score DESC, engagement_rate DESC);
    
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agent_posts_content_hash 
    ON agent_posts(content_hash);
    
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agent_posts_tags 
    ON agent_posts USING GIN (tags);
    
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agent_posts_search_content 
    ON agent_posts USING GIN (to_tsvector('english', title || ' ' || content));
    
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agent_posts_scheduled 
    ON agent_posts(scheduled_for) 
    WHERE status = 'scheduled';

-- Post quality metrics indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_quality_post_overall 
    ON post_quality_metrics(post_id, overall_quality_score DESC);
    
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_quality_ai_assessment 
    ON post_quality_metrics USING GIN (ai_quality_assessment);
    
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_quality_trend 
    ON post_quality_metrics(quality_trend, last_quality_check);

-- Feed analytics indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_feed_analytics_date_granularity 
    ON feed_analytics(analysis_date DESC, time_granularity);
    
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_feed_analytics_engagement 
    ON feed_analytics(avg_engagement_rate DESC, total_page_views DESC);
    
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_feed_analytics_quality 
    ON feed_analytics(avg_content_quality_score DESC, analysis_date DESC);

-- Posting templates indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posting_templates_user_category 
    ON posting_templates(user_id, category, status);
    
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posting_templates_agent_performance 
    ON posting_templates(agent_id, success_rate DESC, usage_count DESC);
    
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posting_templates_public 
    ON posting_templates(is_public, is_featured, avg_quality_score DESC) 
    WHERE status = 'active';

-- =============================================================================
-- 6. TRIGGERS AND FUNCTIONS
-- =============================================================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_modified_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.last_modified_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate content hash
CREATE OR REPLACE FUNCTION calculate_post_content_hash()
RETURNS TRIGGER AS $$
BEGIN
    NEW.content_hash = encode(digest(NEW.title || NEW.content, 'sha256'), 'hex');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update engagement metrics
CREATE OR REPLACE FUNCTION update_engagement_metrics()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate engagement rate based on views and interactions
    IF NEW.view_count > 0 THEN
        NEW.engagement_rate = (NEW.like_count + NEW.comment_count + NEW.share_count + NEW.bookmark_count)::DECIMAL / NEW.view_count;
    ELSE
        NEW.engagement_rate = 0;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER tr_agent_posts_content_hash
    BEFORE INSERT OR UPDATE OF title, content ON agent_posts
    FOR EACH ROW EXECUTE FUNCTION calculate_post_content_hash();

CREATE TRIGGER tr_agent_posts_updated_at
    BEFORE UPDATE ON agent_posts
    FOR EACH ROW EXECUTE FUNCTION update_modified_timestamp();

CREATE TRIGGER tr_agent_posts_engagement_metrics
    BEFORE INSERT OR UPDATE OF view_count, like_count, comment_count, share_count, bookmark_count ON agent_posts
    FOR EACH ROW EXECUTE FUNCTION update_engagement_metrics();

CREATE TRIGGER tr_post_quality_metrics_updated_at
    BEFORE UPDATE ON post_quality_metrics
    FOR EACH ROW EXECUTE FUNCTION update_modified_timestamp();

CREATE TRIGGER tr_posting_templates_updated_at
    BEFORE UPDATE ON posting_templates
    FOR EACH ROW EXECUTE FUNCTION update_modified_timestamp();

-- =============================================================================
-- 7. PARTITIONING SETUP
-- =============================================================================

-- Convert feed_analytics to partitioned table for better performance
ALTER TABLE feed_analytics RENAME TO feed_analytics_old;

CREATE TABLE feed_analytics (
    LIKE feed_analytics_old INCLUDING ALL
) PARTITION BY RANGE (analysis_date);

-- Create initial partitions (current month and next 3 months)
CREATE TABLE feed_analytics_2025_01 PARTITION OF feed_analytics
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE feed_analytics_2025_02 PARTITION OF feed_analytics
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
CREATE TABLE feed_analytics_2025_03 PARTITION OF feed_analytics
    FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');
CREATE TABLE feed_analytics_2025_04 PARTITION OF feed_analytics
    FOR VALUES FROM ('2025-04-01') TO ('2025-05-01');

-- Copy data from old table
INSERT INTO feed_analytics SELECT * FROM feed_analytics_old;
DROP TABLE feed_analytics_old;

-- =============================================================================
-- 8. VALIDATION AND CONSTRAINTS
-- =============================================================================

-- Add additional validation constraints
ALTER TABLE agent_posts 
ADD CONSTRAINT chk_word_count_positive CHECK (word_count >= 0),
ADD CONSTRAINT chk_reading_time_reasonable CHECK (reading_time_minutes >= 0 AND reading_time_minutes <= 1440),
ADD CONSTRAINT chk_priority_level_valid CHECK (priority_level BETWEEN 1 AND 10);

ALTER TABLE post_quality_metrics
ADD CONSTRAINT chk_all_scores_valid CHECK (
    content_quality_score BETWEEN 0 AND 1 AND
    readability_score BETWEEN 0 AND 1 AND
    originality_score BETWEEN 0 AND 1 AND
    relevance_score BETWEEN 0 AND 1 AND
    accuracy_score BETWEEN 0 AND 1 AND
    completeness_score BETWEEN 0 AND 1
);

ALTER TABLE feed_analytics
ADD CONSTRAINT chk_rates_valid CHECK (
    avg_engagement_rate BETWEEN 0 AND 1 AND
    bounce_rate BETWEEN 0 AND 1 AND
    returning_visitor_rate BETWEEN 0 AND 1
);

COMMIT;

-- =============================================================================
-- 9. COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON TABLE agent_posts IS 'Enhanced agent posts with quality tracking and analytics';
COMMENT ON TABLE post_quality_metrics IS 'Comprehensive quality assessment for agent posts';
COMMENT ON TABLE feed_analytics IS 'Time-series analytics data for feed intelligence';
COMMENT ON TABLE posting_templates IS 'Intelligent templates for automated and assisted posting';

COMMENT ON COLUMN agent_posts.content_hash IS 'SHA256 hash for duplicate detection and content versioning';
COMMENT ON COLUMN agent_posts.quality_score IS 'Computed overall quality score from multiple dimensions';
COMMENT ON COLUMN post_quality_metrics.overall_quality_score IS 'Generated column computed from all quality dimensions';
COMMENT ON COLUMN feed_analytics.data_completeness IS 'Percentage of expected data points collected for this analysis';