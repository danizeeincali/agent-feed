-- Claude Code SDK Cost Tracking Analytics - Database Schema
-- Comprehensive database design for usage tracking, analytics, and cost optimization

-- =============================================
-- CORE TRACKING TABLES
-- =============================================

-- Main usage events table - stores every SDK interaction
CREATE TABLE sdk_usage_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    session_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    request_id VARCHAR(255) NOT NULL UNIQUE,

    -- SDK Context
    working_directory TEXT NOT NULL,
    permission_mode VARCHAR(50) NOT NULL DEFAULT 'standard',
    model_used VARCHAR(100) NOT NULL,

    -- Request Details
    prompt_length INTEGER NOT NULL DEFAULT 0,
    response_length INTEGER NOT NULL DEFAULT 0,
    tools_used TEXT[] DEFAULT '{}',
    execution_duration INTEGER NOT NULL, -- milliseconds

    -- Token Analytics
    tokens_input INTEGER NOT NULL DEFAULT 0,
    tokens_output INTEGER NOT NULL DEFAULT 0,
    tokens_total INTEGER NOT NULL DEFAULT 0,
    tokens_cached INTEGER DEFAULT 0,

    -- Cost Breakdown (in USD cents for precision)
    cost_input INTEGER NOT NULL DEFAULT 0,
    cost_output INTEGER NOT NULL DEFAULT 0,
    cost_tools INTEGER NOT NULL DEFAULT 0,
    cost_total INTEGER NOT NULL DEFAULT 0,

    -- Performance Metrics
    first_token_latency INTEGER DEFAULT 0, -- milliseconds
    tokens_per_second DECIMAL(10,2) DEFAULT 0,
    memory_usage_bytes BIGINT DEFAULT 0,
    cpu_usage_percent DECIMAL(5,2) DEFAULT 0,
    network_latency_ms INTEGER DEFAULT 0,

    -- Metadata (JSONB for flexible schema)
    metadata JSONB DEFAULT '{}',

    -- Indexing and partitioning
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_tokens CHECK (tokens_total >= 0),
    CONSTRAINT valid_costs CHECK (cost_total >= 0),
    CONSTRAINT valid_duration CHECK (execution_duration >= 0)
) PARTITION BY RANGE (created_at);

-- Create monthly partitions for better performance
CREATE TABLE sdk_usage_events_2025_01 PARTITION OF sdk_usage_events
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE sdk_usage_events_2025_02 PARTITION OF sdk_usage_events
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
-- Continue for each month...

-- Indexes for optimal query performance
CREATE INDEX idx_usage_events_user_timestamp ON sdk_usage_events (user_id, created_at DESC);
CREATE INDEX idx_usage_events_session ON sdk_usage_events (session_id, created_at DESC);
CREATE INDEX idx_usage_events_model ON sdk_usage_events (model_used, created_at DESC);
CREATE INDEX idx_usage_events_cost ON sdk_usage_events (cost_total DESC, created_at DESC);
CREATE INDEX idx_usage_events_performance ON sdk_usage_events (execution_duration DESC, created_at DESC);
CREATE INDEX idx_usage_events_metadata ON sdk_usage_events USING GIN (metadata);

-- =============================================
-- ERROR AND WARNING TRACKING
-- =============================================

CREATE TABLE sdk_errors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES sdk_usage_events(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    error_type VARCHAR(50) NOT NULL,
    error_code VARCHAR(100) NOT NULL,
    error_message TEXT NOT NULL,
    error_stack TEXT,
    severity VARCHAR(20) NOT NULL DEFAULT 'medium',
    recoverable BOOLEAN NOT NULL DEFAULT false,
    retry_count INTEGER DEFAULT 0,

    context_data JSONB DEFAULT '{}',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_errors_type_severity ON sdk_errors (error_type, severity, timestamp DESC);
CREATE INDEX idx_errors_event ON sdk_errors (event_id);

CREATE TABLE sdk_warnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES sdk_usage_events(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    warning_type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    threshold_value DECIMAL(15,4),
    actual_value DECIMAL(15,4),
    recommendation TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_warnings_type ON sdk_warnings (warning_type, timestamp DESC);

-- =============================================
-- AGGREGATED ANALYTICS TABLES
-- =============================================

-- Hourly aggregations for recent data (kept for 30 days)
CREATE TABLE usage_analytics_hourly (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hour_bucket TIMESTAMPTZ NOT NULL,

    -- Dimensions
    user_id VARCHAR(255),
    model_used VARCHAR(100),
    feature VARCHAR(100),

    -- Volume Metrics
    total_requests INTEGER NOT NULL DEFAULT 0,
    total_tokens BIGINT NOT NULL DEFAULT 0,
    total_cost INTEGER NOT NULL DEFAULT 0, -- cents
    unique_sessions INTEGER NOT NULL DEFAULT 0,

    -- Performance Metrics
    avg_response_time DECIMAL(10,2) NOT NULL DEFAULT 0,
    p95_response_time INTEGER NOT NULL DEFAULT 0,
    p99_response_time INTEGER NOT NULL DEFAULT 0,
    avg_tokens_per_second DECIMAL(10,2) NOT NULL DEFAULT 0,
    avg_first_token_latency INTEGER NOT NULL DEFAULT 0,
    error_count INTEGER NOT NULL DEFAULT 0,
    success_count INTEGER NOT NULL DEFAULT 0,

    -- Resource Metrics
    avg_memory_usage BIGINT NOT NULL DEFAULT 0,
    avg_cpu_usage DECIMAL(5,2) NOT NULL DEFAULT 0,
    avg_network_latency INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(hour_bucket, user_id, model_used, feature)
);

CREATE INDEX idx_analytics_hourly_bucket ON usage_analytics_hourly (hour_bucket DESC);
CREATE INDEX idx_analytics_hourly_user ON usage_analytics_hourly (user_id, hour_bucket DESC);

-- Daily aggregations for historical trends (kept for 2 years)
CREATE TABLE usage_analytics_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date_bucket DATE NOT NULL,

    -- Dimensions
    user_id VARCHAR(255),
    model_used VARCHAR(100),
    feature VARCHAR(100),
    region VARCHAR(50),

    -- Volume Metrics
    total_requests INTEGER NOT NULL DEFAULT 0,
    total_tokens BIGINT NOT NULL DEFAULT 0,
    total_cost INTEGER NOT NULL DEFAULT 0,
    unique_sessions INTEGER NOT NULL DEFAULT 0,
    unique_users INTEGER NOT NULL DEFAULT 0,

    -- Performance Metrics
    avg_response_time DECIMAL(10,2) NOT NULL DEFAULT 0,
    p95_response_time INTEGER NOT NULL DEFAULT 0,
    p99_response_time INTEGER NOT NULL DEFAULT 0,
    error_rate DECIMAL(5,4) NOT NULL DEFAULT 0,
    success_rate DECIMAL(5,4) NOT NULL DEFAULT 0,

    -- Cost Analysis
    cost_by_model JSONB DEFAULT '{}',
    cost_by_feature JSONB DEFAULT '{}',
    cost_trend JSONB DEFAULT '{}',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(date_bucket, user_id, model_used, feature, region)
);

CREATE INDEX idx_analytics_daily_date ON usage_analytics_daily (date_bucket DESC);
CREATE INDEX idx_analytics_daily_user ON usage_analytics_daily (user_id, date_bucket DESC);
CREATE INDEX idx_analytics_daily_cost ON usage_analytics_daily (total_cost DESC, date_bucket DESC);

-- =============================================
-- REAL-TIME METRICS TABLES
-- =============================================

-- Current live metrics (updated every 30 seconds)
CREATE TABLE live_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Current Activity
    active_requests INTEGER NOT NULL DEFAULT 0,
    requests_per_second DECIMAL(10,2) NOT NULL DEFAULT 0,
    tokens_per_second DECIMAL(10,2) NOT NULL DEFAULT 0,
    cost_per_second DECIMAL(10,4) NOT NULL DEFAULT 0,

    -- Performance
    avg_response_time INTEGER NOT NULL DEFAULT 0,
    error_rate DECIMAL(5,4) NOT NULL DEFAULT 0,
    queue_length INTEGER NOT NULL DEFAULT 0,

    -- System Load
    cpu_usage DECIMAL(5,2) NOT NULL DEFAULT 0,
    memory_usage DECIMAL(5,2) NOT NULL DEFAULT 0,
    network_usage DECIMAL(10,2) NOT NULL DEFAULT 0,
    disk_usage DECIMAL(5,2) NOT NULL DEFAULT 0,

    -- Geographic and Feature Distribution
    active_regions JSONB DEFAULT '{}',
    active_features JSONB DEFAULT '{}',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only keep live metrics for 24 hours
CREATE INDEX idx_live_metrics_timestamp ON live_metrics (timestamp DESC);

-- =============================================
-- ALERTING AND MONITORING
-- =============================================

CREATE TABLE alert_thresholds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    metric VARCHAR(100) NOT NULL,
    operator VARCHAR(10) NOT NULL, -- 'gt', 'gte', 'lt', 'lte', 'eq', 'ne'
    threshold_value DECIMAL(15,4) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    time_window_minutes INTEGER NOT NULL DEFAULT 5,
    min_occurrences INTEGER NOT NULL DEFAULT 1,

    -- Configuration
    enabled BOOLEAN NOT NULL DEFAULT true,
    notification_channels TEXT[] DEFAULT '{}',
    suppression_rules JSONB DEFAULT '{}',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    threshold_id UUID REFERENCES alert_thresholds(id) ON DELETE CASCADE,

    -- Alert Details
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,

    -- Trigger Information
    metric VARCHAR(100) NOT NULL,
    threshold_value DECIMAL(15,4) NOT NULL,
    actual_value DECIMAL(15,4) NOT NULL,
    operator VARCHAR(10) NOT NULL,

    -- Context
    affected_users TEXT[] DEFAULT '{}',
    affected_sessions TEXT[] DEFAULT '{}',
    related_metrics JSONB DEFAULT '{}',

    -- Status Tracking
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    acknowledged_by VARCHAR(255),
    acknowledged_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,

    -- Actions Taken
    actions JSONB DEFAULT '[]',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alerts_status_created ON alerts (status, created_at DESC);
CREATE INDEX idx_alerts_severity ON alerts (severity, created_at DESC);
CREATE INDEX idx_alerts_threshold ON alerts (threshold_id, created_at DESC);

-- =============================================
-- OPTIMIZATION AND RECOMMENDATIONS
-- =============================================

CREATE TABLE optimization_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Recommendation Details
    category VARCHAR(50) NOT NULL,
    priority VARCHAR(20) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,

    -- Impact Analysis
    potential_cost_savings INTEGER DEFAULT 0, -- cents
    potential_performance_improvement DECIMAL(5,2) DEFAULT 0,
    potential_reliability_improvement DECIMAL(5,2) DEFAULT 0,

    -- Implementation
    complexity VARCHAR(20) NOT NULL,
    estimated_effort VARCHAR(100),
    prerequisites TEXT[] DEFAULT '{}',
    implementation_steps TEXT[] DEFAULT '{}',

    -- Validation
    kpis TEXT[] DEFAULT '{}',
    success_criteria JSONB DEFAULT '[]',

    -- Applicability
    applies_to TEXT[] DEFAULT '{}', -- user IDs, features, etc.
    valid_until TIMESTAMPTZ,
    source VARCHAR(50) NOT NULL DEFAULT 'rule_based',
    confidence_score DECIMAL(3,2) DEFAULT 0.5,

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    implemented_by VARCHAR(255),
    implemented_at TIMESTAMPTZ,
    implementation_notes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_recommendations_priority ON optimization_recommendations (priority, created_at DESC);
CREATE INDEX idx_recommendations_category ON optimization_recommendations (category, status);
CREATE INDEX idx_recommendations_savings ON optimization_recommendations (potential_cost_savings DESC);

-- =============================================
-- USER AND SESSION TRACKING
-- =============================================

CREATE TABLE user_analytics (
    user_id VARCHAR(255) PRIMARY KEY,

    -- Usage Summary
    total_requests INTEGER NOT NULL DEFAULT 0,
    total_tokens BIGINT NOT NULL DEFAULT 0,
    total_cost INTEGER NOT NULL DEFAULT 0,
    total_sessions INTEGER NOT NULL DEFAULT 0,

    -- Time-based Usage
    first_seen TIMESTAMPTZ,
    last_seen TIMESTAMPTZ,
    avg_session_duration INTEGER DEFAULT 0, -- minutes

    -- Preferences and Patterns
    preferred_models TEXT[] DEFAULT '{}',
    preferred_tools TEXT[] DEFAULT '{}',
    usage_patterns JSONB DEFAULT '{}',

    -- Performance Profile
    avg_response_time INTEGER DEFAULT 0,
    error_rate DECIMAL(5,4) DEFAULT 0,
    efficiency_score DECIMAL(3,2) DEFAULT 0,

    -- Cost Profile
    cost_tier VARCHAR(20) DEFAULT 'standard',
    monthly_budget INTEGER DEFAULT 0, -- cents
    cost_alerts_enabled BOOLEAN DEFAULT true,

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_analytics_cost ON user_analytics (total_cost DESC);
CREATE INDEX idx_user_analytics_usage ON user_analytics (total_requests DESC);
CREATE INDEX idx_user_analytics_last_seen ON user_analytics (last_seen DESC);

-- =============================================
-- CONFIGURATION AND SETTINGS
-- =============================================

CREATE TABLE analytics_configuration (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key VARCHAR(255) NOT NULL UNIQUE,
    config_value JSONB NOT NULL,
    description TEXT,

    -- Versioning
    version INTEGER NOT NULL DEFAULT 1,
    previous_value JSONB,

    -- Metadata
    updated_by VARCHAR(255),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default configuration
INSERT INTO analytics_configuration (config_key, config_value, description) VALUES
('collection.sampling_rate', '1.0', 'Event collection sampling rate (0-1)'),
('collection.retention_days', '90', 'Raw event retention period in days'),
('collection.batch_size', '100', 'Event processing batch size'),
('alerts.enabled', 'true', 'Enable alerting system'),
('optimization.ml_enabled', 'true', 'Enable ML-based recommendations'),
('privacy.anonymize_users', 'false', 'Anonymize user data in analytics');

-- =============================================
-- VIEWS FOR COMMON QUERIES
-- =============================================

-- Real-time dashboard view
CREATE VIEW realtime_dashboard AS
SELECT
    DATE_TRUNC('minute', timestamp) as minute_bucket,
    COUNT(*) as requests_per_minute,
    SUM(tokens_total) as tokens_per_minute,
    SUM(cost_total) as cost_per_minute,
    AVG(execution_duration) as avg_response_time,
    COUNT(CASE WHEN tokens_total > 0 THEN 1 END)::float / COUNT(*) as success_rate
FROM sdk_usage_events
WHERE timestamp >= NOW() - INTERVAL '1 hour'
GROUP BY minute_bucket
ORDER BY minute_bucket DESC;

-- User cost summary view
CREATE VIEW user_cost_summary AS
SELECT
    user_id,
    DATE_TRUNC('day', timestamp) as date,
    COUNT(*) as daily_requests,
    SUM(tokens_total) as daily_tokens,
    SUM(cost_total) as daily_cost,
    AVG(execution_duration) as avg_response_time
FROM sdk_usage_events
WHERE timestamp >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY user_id, date
ORDER BY user_id, date DESC;

-- Model performance comparison view
CREATE VIEW model_performance AS
SELECT
    model_used,
    COUNT(*) as total_requests,
    AVG(execution_duration) as avg_response_time,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY execution_duration) as p95_response_time,
    SUM(cost_total)::float / SUM(tokens_total) as cost_per_token,
    COUNT(CASE WHEN EXISTS(SELECT 1 FROM sdk_errors e WHERE e.event_id = sdk_usage_events.id) THEN 1 END)::float / COUNT(*) as error_rate
FROM sdk_usage_events
WHERE timestamp >= NOW() - INTERVAL '7 days'
GROUP BY model_used
ORDER BY total_requests DESC;

-- =============================================
-- STORED PROCEDURES FOR COMMON OPERATIONS
-- =============================================

-- Procedure to aggregate hourly metrics
CREATE OR REPLACE FUNCTION aggregate_hourly_metrics(target_hour TIMESTAMPTZ)
RETURNS void AS $$
BEGIN
    INSERT INTO usage_analytics_hourly (
        hour_bucket, user_id, model_used, feature,
        total_requests, total_tokens, total_cost, unique_sessions,
        avg_response_time, p95_response_time, p99_response_time,
        avg_tokens_per_second, avg_first_token_latency,
        error_count, success_count,
        avg_memory_usage, avg_cpu_usage, avg_network_latency
    )
    SELECT
        DATE_TRUNC('hour', timestamp) as hour_bucket,
        user_id,
        model_used,
        metadata->>'feature' as feature,
        COUNT(*) as total_requests,
        SUM(tokens_total) as total_tokens,
        SUM(cost_total) as total_cost,
        COUNT(DISTINCT session_id) as unique_sessions,
        AVG(execution_duration) as avg_response_time,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY execution_duration) as p95_response_time,
        PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY execution_duration) as p99_response_time,
        AVG(tokens_per_second) as avg_tokens_per_second,
        AVG(first_token_latency) as avg_first_token_latency,
        COUNT(CASE WHEN EXISTS(SELECT 1 FROM sdk_errors e WHERE e.event_id = sdk_usage_events.id) THEN 1 END) as error_count,
        COUNT(CASE WHEN NOT EXISTS(SELECT 1 FROM sdk_errors e WHERE e.event_id = sdk_usage_events.id) THEN 1 END) as success_count,
        AVG(memory_usage_bytes) as avg_memory_usage,
        AVG(cpu_usage_percent) as avg_cpu_usage,
        AVG(network_latency_ms) as avg_network_latency
    FROM sdk_usage_events
    WHERE DATE_TRUNC('hour', timestamp) = DATE_TRUNC('hour', target_hour)
    GROUP BY
        DATE_TRUNC('hour', timestamp),
        user_id,
        model_used,
        metadata->>'feature'
    ON CONFLICT (hour_bucket, user_id, model_used, feature)
    DO UPDATE SET
        total_requests = EXCLUDED.total_requests,
        total_tokens = EXCLUDED.total_tokens,
        total_cost = EXCLUDED.total_cost,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- TRIGGERS FOR REAL-TIME UPDATES
-- =============================================

-- Update user analytics on new events
CREATE OR REPLACE FUNCTION update_user_analytics()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_analytics (
        user_id, total_requests, total_tokens, total_cost, total_sessions,
        first_seen, last_seen
    )
    VALUES (
        NEW.user_id, 1, NEW.tokens_total, NEW.cost_total, 1,
        NEW.timestamp, NEW.timestamp
    )
    ON CONFLICT (user_id) DO UPDATE SET
        total_requests = user_analytics.total_requests + 1,
        total_tokens = user_analytics.total_tokens + NEW.tokens_total,
        total_cost = user_analytics.total_cost + NEW.cost_total,
        last_seen = NEW.timestamp,
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_analytics
    AFTER INSERT ON sdk_usage_events
    FOR EACH ROW EXECUTE FUNCTION update_user_analytics();

-- =============================================
-- DATA RETENTION POLICIES
-- =============================================

-- Function to clean up old data
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void AS $$
BEGIN
    -- Delete raw events older than 90 days
    DELETE FROM sdk_usage_events
    WHERE created_at < NOW() - INTERVAL '90 days';

    -- Delete hourly aggregations older than 30 days
    DELETE FROM usage_analytics_hourly
    WHERE created_at < NOW() - INTERVAL '30 days';

    -- Delete live metrics older than 24 hours
    DELETE FROM live_metrics
    WHERE created_at < NOW() - INTERVAL '24 hours';

    -- Delete resolved alerts older than 30 days
    DELETE FROM alerts
    WHERE status = 'resolved' AND resolved_at < NOW() - INTERVAL '30 days';

    -- Vacuum tables to reclaim space
    VACUUM ANALYZE sdk_usage_events;
    VACUUM ANALYZE usage_analytics_hourly;
    VACUUM ANALYZE live_metrics;
    VACUUM ANALYZE alerts;
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup to run daily
-- SELECT cron.schedule('cleanup-analytics-data', '0 2 * * *', 'SELECT cleanup_old_data();');