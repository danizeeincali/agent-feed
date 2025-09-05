-- Feed Intelligence and Analytics Migration
-- Migration: 011_create_feed_intelligence_system.sql
-- Version: 1.0.0
-- Date: 2025-01-04
-- Description: Advanced feed intelligence with ML analytics, user behavior tracking, and optimization

BEGIN;

-- =============================================================================
-- 1. USER BEHAVIOR AND SESSION TRACKING
-- =============================================================================

-- Detailed user session tracking
CREATE TABLE user_sessions_detailed (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    
    -- Session metadata
    ip_address INET,
    user_agent TEXT,
    device_type VARCHAR(50),
    browser_name VARCHAR(100),
    browser_version VARCHAR(50),
    operating_system VARCHAR(100),
    screen_resolution VARCHAR(20),
    
    -- Geographic information
    country VARCHAR(100),
    region VARCHAR(100),
    city VARCHAR(100),
    timezone VARCHAR(100),
    
    -- Session timing
    session_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    session_end TIMESTAMP WITH TIME ZONE,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    session_duration INTERVAL,
    idle_time INTERVAL DEFAULT INTERVAL '0',
    
    -- Engagement metrics
    page_views INTEGER DEFAULT 0,
    posts_viewed INTEGER DEFAULT 0,
    posts_liked INTEGER DEFAULT 0,
    posts_commented INTEGER DEFAULT 0,
    posts_shared INTEGER DEFAULT 0,
    posts_bookmarked INTEGER DEFAULT 0,
    
    -- Behavioral patterns
    scroll_depth_avg DECIMAL(5,4) DEFAULT 0.0,
    time_spent_reading INTERVAL DEFAULT INTERVAL '0',
    interaction_frequency DECIMAL(10,4) DEFAULT 0.0,
    bounce_indicator BOOLEAN DEFAULT FALSE,
    
    -- Feed interaction patterns
    feed_refresh_count INTEGER DEFAULT 0,
    search_queries_count INTEGER DEFAULT 0,
    filter_changes_count INTEGER DEFAULT 0,
    sort_changes_count INTEGER DEFAULT 0,
    
    -- Quality indicators
    session_quality_score DECIMAL(5,4) DEFAULT 0.0,
    engagement_score DECIMAL(5,4) DEFAULT 0.0,
    satisfaction_indicator DECIMAL(5,4) DEFAULT 0.0,
    
    -- Technical performance
    avg_page_load_time INTEGER DEFAULT 0, -- milliseconds
    error_count INTEGER DEFAULT 0,
    slow_requests_count INTEGER DEFAULT 0,
    
    -- Referrer information
    referrer_url TEXT,
    referrer_domain VARCHAR(255),
    utm_source VARCHAR(255),
    utm_medium VARCHAR(255),
    utm_campaign VARCHAR(255),
    
    -- Exit information
    exit_page TEXT,
    exit_reason VARCHAR(100),
    conversion_achieved BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- 2. USER INTERACTION EVENTS
-- =============================================================================

-- Granular user interaction tracking
CREATE TABLE user_interaction_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES user_sessions_detailed(id) ON DELETE CASCADE,
    user_id UUID,
    post_id UUID REFERENCES agent_posts(id) ON DELETE CASCADE,
    
    -- Event classification
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
        'view', 'like', 'unlike', 'comment', 'share', 'bookmark', 'unbookmark',
        'click', 'scroll', 'hover', 'search', 'filter', 'sort', 'refresh'
    )),
    event_category VARCHAR(50) NOT NULL DEFAULT 'engagement',
    event_subcategory VARCHAR(100),
    
    -- Event context
    page_url TEXT NOT NULL,
    element_id VARCHAR(255),
    element_type VARCHAR(100),
    element_position JSONB, -- x, y coordinates, viewport position
    
    -- Event timing
    event_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    time_since_page_load INTEGER, -- milliseconds
    time_since_last_interaction INTEGER, -- milliseconds
    
    -- Event data
    event_data JSONB DEFAULT '{}',
    event_value DECIMAL(10,4),
    event_duration INTEGER, -- milliseconds for duration-based events
    
    -- Content context
    content_category VARCHAR(100),
    content_tags JSONB DEFAULT '[]',
    content_quality_score DECIMAL(5,4),
    
    -- User state at time of event
    scroll_position DECIMAL(5,4), -- 0.0 to 1.0
    viewport_dimensions JSONB,
    focus_state BOOLEAN DEFAULT TRUE,
    tab_active BOOLEAN DEFAULT TRUE,
    
    -- Technical context
    client_timestamp TIMESTAMP WITH TIME ZONE,
    server_processing_time INTEGER, -- milliseconds
    network_quality VARCHAR(20), -- 'slow', 'medium', 'fast'
    
    -- Analytics flags
    is_unique_event BOOLEAN DEFAULT TRUE,
    is_conversion_event BOOLEAN DEFAULT FALSE,
    attribution_source VARCHAR(255),
    
    -- Machine learning features
    ml_features JSONB DEFAULT '{}',
    prediction_confidence DECIMAL(5,4),
    anomaly_score DECIMAL(5,4),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- 3. CONTENT PERFORMANCE ANALYTICS
-- =============================================================================

-- Detailed content performance tracking
CREATE TABLE content_performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES agent_posts(id) ON DELETE CASCADE,
    
    -- Time window for metrics
    measurement_date DATE NOT NULL,
    measurement_hour INTEGER CHECK (measurement_hour BETWEEN 0 AND 23),
    time_window_minutes INTEGER DEFAULT 60,
    
    -- Basic engagement metrics
    unique_views INTEGER DEFAULT 0,
    total_views INTEGER DEFAULT 0,
    unique_visitors INTEGER DEFAULT 0,
    returning_visitors INTEGER DEFAULT 0,
    
    -- Detailed engagement
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    bookmarks_count INTEGER DEFAULT 0,
    
    -- Reading behavior
    avg_time_on_post INTERVAL,
    median_time_on_post INTERVAL,
    completion_rate DECIMAL(5,4) DEFAULT 0.0, -- percentage who read to end
    scroll_depth_avg DECIMAL(5,4) DEFAULT 0.0,
    
    -- Interaction patterns
    click_through_rate DECIMAL(5,4) DEFAULT 0.0,
    bounce_rate DECIMAL(5,4) DEFAULT 0.0,
    return_visitor_rate DECIMAL(5,4) DEFAULT 0.0,
    share_rate DECIMAL(5,4) DEFAULT 0.0,
    
    -- Quality and satisfaction
    user_satisfaction_score DECIMAL(5,4) DEFAULT 0.0,
    content_quality_rating DECIMAL(5,4) DEFAULT 0.0,
    user_feedback_sentiment DECIMAL(3,2), -- -1 to 1
    
    -- Virality and reach
    viral_coefficient DECIMAL(10,4) DEFAULT 0.0,
    organic_reach INTEGER DEFAULT 0,
    social_amplification_factor DECIMAL(10,4) DEFAULT 1.0,
    
    -- Conversion metrics
    conversion_events INTEGER DEFAULT 0,
    conversion_rate DECIMAL(5,4) DEFAULT 0.0,
    conversion_value DECIMAL(10,2) DEFAULT 0.0,
    
    -- SEO and discoverability
    search_impressions INTEGER DEFAULT 0,
    search_clicks INTEGER DEFAULT 0,
    search_ctr DECIMAL(5,4) DEFAULT 0.0,
    avg_search_position DECIMAL(5,2) DEFAULT 0.0,
    
    -- Traffic sources
    direct_traffic_percent DECIMAL(5,4) DEFAULT 0.0,
    social_traffic_percent DECIMAL(5,4) DEFAULT 0.0,
    search_traffic_percent DECIMAL(5,4) DEFAULT 0.0,
    referral_traffic_percent DECIMAL(5,4) DEFAULT 0.0,
    
    -- Device and platform analytics
    desktop_views_percent DECIMAL(5,4) DEFAULT 0.0,
    mobile_views_percent DECIMAL(5,4) DEFAULT 0.0,
    tablet_views_percent DECIMAL(5,4) DEFAULT 0.0,
    
    -- Geographic analytics
    top_countries JSONB DEFAULT '[]',
    geographic_distribution JSONB DEFAULT '{}',
    
    -- Temporal patterns
    peak_engagement_hour INTEGER,
    engagement_by_hour JSONB DEFAULT '{}',
    day_of_week_performance JSONB DEFAULT '{}',
    
    -- Predictive metrics
    predicted_lifetime_views INTEGER,
    trend_direction VARCHAR(20) CHECK (trend_direction IN ('up', 'down', 'stable', 'volatile')),
    growth_rate DECIMAL(10,4),
    
    -- Content optimization insights
    optimization_score DECIMAL(5,4) DEFAULT 0.0,
    improvement_recommendations JSONB DEFAULT '[]',
    a_b_test_results JSONB DEFAULT '{}',
    
    -- Metadata
    data_freshness INTERVAL DEFAULT INTERVAL '1 hour',
    calculation_method VARCHAR(50) DEFAULT 'aggregation',
    confidence_level DECIMAL(3,2) DEFAULT 0.95,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(post_id, measurement_date, measurement_hour)
);

-- =============================================================================
-- 4. MACHINE LEARNING INSIGHTS
-- =============================================================================

-- AI/ML powered insights and predictions
CREATE TABLE ml_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Insight classification
    insight_type VARCHAR(100) NOT NULL CHECK (insight_type IN (
        'content_optimization', 'user_behavior_prediction', 'engagement_forecast',
        'quality_assessment', 'trend_analysis', 'anomaly_detection',
        'personalization', 'content_recommendation', 'performance_optimization'
    )),
    category VARCHAR(100),
    subcategory VARCHAR(100),
    
    -- Target entities
    target_post_id UUID REFERENCES agent_posts(id),
    target_user_id UUID,
    target_agent_id UUID,
    
    -- Insight data
    insight_title VARCHAR(255) NOT NULL,
    insight_description TEXT,
    insight_data JSONB NOT NULL,
    confidence_score DECIMAL(5,4) CHECK (confidence_score BETWEEN 0 AND 1),
    
    -- Machine learning model info
    model_name VARCHAR(255),
    model_version VARCHAR(100),
    model_type VARCHAR(100),
    training_data_size INTEGER,
    feature_importance JSONB DEFAULT '{}',
    
    -- Predictions and recommendations
    predicted_outcomes JSONB DEFAULT '{}',
    recommended_actions JSONB DEFAULT '[]',
    expected_impact JSONB DEFAULT '{}',
    implementation_difficulty VARCHAR(20) CHECK (implementation_difficulty IN ('easy', 'medium', 'hard')),
    
    -- Validation and accuracy
    validation_status VARCHAR(20) DEFAULT 'pending' CHECK (validation_status IN (
        'pending', 'validated', 'partially_validated', 'invalidated'
    )),
    actual_outcomes JSONB DEFAULT '{}',
    accuracy_metrics JSONB DEFAULT '{}',
    
    -- Business impact
    business_impact_score DECIMAL(5,4) DEFAULT 0.0,
    estimated_value DECIMAL(15,2),
    implementation_cost DECIMAL(15,2),
    roi_estimate DECIMAL(10,4),
    
    -- Temporal aspects
    insight_valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    insight_valid_until TIMESTAMP WITH TIME ZONE,
    refresh_frequency INTERVAL,
    
    -- Priority and urgency
    priority_score INTEGER DEFAULT 5 CHECK (priority_score BETWEEN 1 AND 10),
    urgency_level VARCHAR(20) DEFAULT 'medium' CHECK (urgency_level IN ('low', 'medium', 'high', 'critical')),
    
    -- Implementation tracking
    implementation_status VARCHAR(20) DEFAULT 'not_implemented' CHECK (implementation_status IN (
        'not_implemented', 'in_progress', 'implemented', 'rejected', 'deferred'
    )),
    implementation_date TIMESTAMP WITH TIME ZONE,
    implementation_notes TEXT,
    
    -- Feedback and learning
    user_feedback_rating INTEGER CHECK (user_feedback_rating BETWEEN 1 AND 5),
    user_feedback_comments TEXT,
    system_feedback JSONB DEFAULT '{}',
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(100) DEFAULT 'system'
);

-- =============================================================================
-- 5. FEED OPTIMIZATION ENGINE
-- =============================================================================

-- Feed optimization rules and configurations
CREATE TABLE feed_optimization_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Rule identification
    rule_name VARCHAR(255) NOT NULL,
    rule_description TEXT,
    rule_type VARCHAR(100) NOT NULL CHECK (rule_type IN (
        'ranking', 'filtering', 'personalization', 'content_boosting',
        'quality_filtering', 'diversity', 'freshness', 'engagement_optimization'
    )),
    
    -- Rule configuration
    rule_conditions JSONB NOT NULL,
    rule_actions JSONB NOT NULL,
    rule_parameters JSONB DEFAULT '{}',
    weight DECIMAL(5,4) DEFAULT 1.0,
    
    -- Target audience
    target_user_segments JSONB DEFAULT '[]',
    target_content_types JSONB DEFAULT '[]',
    target_agents JSONB DEFAULT '[]',
    
    -- Rule effectiveness
    success_metrics JSONB DEFAULT '{}',
    performance_indicators JSONB DEFAULT '{}',
    a_b_test_results JSONB DEFAULT '{}',
    
    -- Machine learning integration
    ml_model_integration BOOLEAN DEFAULT FALSE,
    ml_model_name VARCHAR(255),
    feature_inputs JSONB DEFAULT '{}',
    prediction_outputs JSONB DEFAULT '{}',
    
    -- Rule lifecycle
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN (
        'draft', 'active', 'inactive', 'testing', 'deprecated'
    )),
    version INTEGER DEFAULT 1,
    parent_rule_id UUID REFERENCES feed_optimization_rules(id),
    
    -- Scheduling and conditions
    active_hours JSONB DEFAULT '{}', -- when rule should be active
    active_days JSONB DEFAULT '[]',
    seasonal_adjustments JSONB DEFAULT '{}',
    
    -- Performance tracking
    applications_count BIGINT DEFAULT 0,
    success_rate DECIMAL(5,4) DEFAULT 0.0,
    avg_impact_score DECIMAL(5,4) DEFAULT 0.0,
    user_satisfaction_impact DECIMAL(3,2) DEFAULT 0.0,
    
    -- Business metrics
    business_impact DECIMAL(15,2) DEFAULT 0.0,
    cost_per_application DECIMAL(10,4) DEFAULT 0.0,
    roi_metric DECIMAL(10,4) DEFAULT 0.0,
    
    -- Validation and testing
    test_group_size INTEGER,
    control_group_size INTEGER,
    statistical_significance DECIMAL(5,4),
    confidence_interval JSONB DEFAULT '{}',
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(100),
    last_modified_by VARCHAR(100),
    
    UNIQUE(rule_name, version)
);

-- =============================================================================
-- 6. USER PREFERENCES AND PERSONALIZATION
-- =============================================================================

-- Advanced user preference modeling
CREATE TABLE user_preference_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    
    -- Content preferences
    preferred_content_types JSONB DEFAULT '{}',
    preferred_topics JSONB DEFAULT '{}',
    preferred_agents JSONB DEFAULT '{}',
    content_length_preference VARCHAR(20) DEFAULT 'medium',
    
    -- Engagement patterns
    typical_session_duration INTERVAL,
    preferred_interaction_times JSONB DEFAULT '{}',
    engagement_frequency VARCHAR(20) DEFAULT 'regular',
    preferred_devices JSONB DEFAULT '[]',
    
    -- Feed customization
    feed_layout_preference VARCHAR(50) DEFAULT 'list',
    posts_per_page_preference INTEGER DEFAULT 20,
    auto_refresh_preference BOOLEAN DEFAULT TRUE,
    notification_preferences JSONB DEFAULT '{}',
    
    -- Quality and filtering preferences
    minimum_quality_threshold DECIMAL(5,4) DEFAULT 0.0,
    content_freshness_preference VARCHAR(20) DEFAULT 'balanced',
    diversity_preference DECIMAL(3,2) DEFAULT 0.5,
    
    -- Personalization settings
    personalization_enabled BOOLEAN DEFAULT TRUE,
    personalization_level VARCHAR(20) DEFAULT 'medium' CHECK (personalization_level IN ('low', 'medium', 'high')),
    privacy_level VARCHAR(20) DEFAULT 'balanced' CHECK (privacy_level IN ('minimal', 'balanced', 'strict')),
    
    -- Machine learning features
    behavioral_features JSONB DEFAULT '{}',
    preference_embeddings JSONB DEFAULT '{}',
    similarity_scores JSONB DEFAULT '{}',
    cluster_assignments JSONB DEFAULT '{}',
    
    -- Dynamic preferences (learned from behavior)
    implicit_preferences JSONB DEFAULT '{}',
    preference_confidence JSONB DEFAULT '{}',
    preference_stability JSONB DEFAULT '{}',
    
    -- Temporal patterns
    time_based_preferences JSONB DEFAULT '{}',
    seasonal_preferences JSONB DEFAULT '{}',
    context_based_preferences JSONB DEFAULT '{}',
    
    -- Performance tracking
    personalization_effectiveness DECIMAL(5,4) DEFAULT 0.0,
    user_satisfaction_score DECIMAL(5,4) DEFAULT 0.0,
    engagement_improvement DECIMAL(10,4) DEFAULT 0.0,
    
    -- Profile management
    profile_completeness DECIMAL(3,2) DEFAULT 0.0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    update_frequency INTERVAL DEFAULT INTERVAL '7 days',
    auto_update_enabled BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- =============================================================================
-- 7. PERFORMANCE INDEXES
-- =============================================================================

-- User sessions indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_sessions_detailed_user_start 
    ON user_sessions_detailed(user_id, session_start DESC);
    
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_sessions_detailed_duration_quality 
    ON user_sessions_detailed(session_duration DESC, session_quality_score DESC);
    
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_sessions_detailed_device_browser 
    ON user_sessions_detailed(device_type, browser_name);

-- User interaction events indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_interaction_events_session_time 
    ON user_interaction_events(session_id, event_timestamp DESC);
    
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_interaction_events_post_type 
    ON user_interaction_events(post_id, event_type, event_timestamp DESC);
    
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_interaction_events_user_type 
    ON user_interaction_events(user_id, event_type, event_timestamp DESC);

-- Content performance metrics indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_content_performance_post_date 
    ON content_performance_metrics(post_id, measurement_date DESC);
    
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_content_performance_engagement 
    ON content_performance_metrics(click_through_rate DESC, engagement_by_hour);

-- ML insights indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ml_insights_type_confidence 
    ON ml_insights(insight_type, confidence_score DESC);
    
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ml_insights_target_entities 
    ON ml_insights(target_post_id, target_user_id, target_agent_id);
    
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ml_insights_priority_urgency 
    ON ml_insights(priority_score DESC, urgency_level);

-- Feed optimization rules indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_feed_optimization_rules_type_status 
    ON feed_optimization_rules(rule_type, status);
    
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_feed_optimization_rules_performance 
    ON feed_optimization_rules(success_rate DESC, avg_impact_score DESC);

-- User preference profiles indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_preference_profiles_user 
    ON user_preference_profiles(user_id);
    
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_preference_profiles_effectiveness 
    ON user_preference_profiles(personalization_effectiveness DESC, user_satisfaction_score DESC);

-- GIN indexes for JSONB columns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_interaction_events_event_data 
    ON user_interaction_events USING GIN (event_data);
    
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ml_insights_insight_data 
    ON ml_insights USING GIN (insight_data);
    
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_feed_optimization_rules_conditions 
    ON feed_optimization_rules USING GIN (rule_conditions);
    
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_preference_profiles_preferences 
    ON user_preference_profiles USING GIN (preferred_content_types, preferred_topics);

-- =============================================================================
-- 8. PARTITIONING FOR LARGE TABLES
-- =============================================================================

-- Partition user_interaction_events by date for better performance
ALTER TABLE user_interaction_events RENAME TO user_interaction_events_old;

CREATE TABLE user_interaction_events (
    LIKE user_interaction_events_old INCLUDING ALL
) PARTITION BY RANGE (event_timestamp);

-- Create partitions for current and future months
CREATE TABLE user_interaction_events_2025_01 PARTITION OF user_interaction_events
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE user_interaction_events_2025_02 PARTITION OF user_interaction_events
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
CREATE TABLE user_interaction_events_2025_03 PARTITION OF user_interaction_events
    FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');

-- Copy data and drop old table
INSERT INTO user_interaction_events SELECT * FROM user_interaction_events_old;
DROP TABLE user_interaction_events_old;

COMMIT;

-- =============================================================================
-- 9. COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON TABLE user_sessions_detailed IS 'Comprehensive user session tracking with device, geographic, and behavioral data';
COMMENT ON TABLE user_interaction_events IS 'Granular tracking of all user interactions with feed content';
COMMENT ON TABLE content_performance_metrics IS 'Detailed performance analytics for content optimization';
COMMENT ON TABLE ml_insights IS 'AI/ML powered insights and recommendations for feed optimization';
COMMENT ON TABLE feed_optimization_rules IS 'Configurable rules engine for dynamic feed optimization';
COMMENT ON TABLE user_preference_profiles IS 'Advanced user preference modeling for personalization';