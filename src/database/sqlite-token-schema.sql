-- Token Analytics SQLite Schema
-- Comprehensive token usage tracking for Claude Code SDK Analytics

-- =============================================
-- TOKEN USAGE TRACKING
-- =============================================

-- Main token usage events table
CREATE TABLE IF NOT EXISTS token_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    session_id TEXT NOT NULL,
    user_id TEXT NOT NULL DEFAULT 'default',
    request_id TEXT UNIQUE NOT NULL,

    -- Provider and model information
    provider TEXT NOT NULL, -- 'anthropic', 'claude-flow', 'mcp'
    model TEXT NOT NULL,

    -- Token counts
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER GENERATED ALWAYS AS (input_tokens + output_tokens) STORED,
    cached_tokens INTEGER DEFAULT 0,

    -- Cost information (in USD cents for precision)
    cost_input INTEGER DEFAULT 0,  -- cents
    cost_output INTEGER DEFAULT 0, -- cents
    cost_total INTEGER GENERATED ALWAYS AS (cost_input + cost_output) STORED,

    -- Request details
    request_type TEXT, -- 'chat', 'completion', 'tool_use', 'agent_spawn'
    component TEXT,    -- which part of the app made the request

    -- Performance metrics
    processing_time_ms INTEGER DEFAULT 0,
    first_token_latency_ms INTEGER DEFAULT 0,
    tokens_per_second REAL DEFAULT 0,

    -- Content for message history
    message_content TEXT,
    response_content TEXT,

    -- Additional metadata
    tools_used TEXT, -- JSON array of tool names
    metadata TEXT,   -- JSON string for additional data

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- AGGREGATED TABLES FOR PERFORMANCE
-- =============================================

-- Hourly aggregations for charts
CREATE TABLE IF NOT EXISTS token_usage_hourly (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hour_bucket TEXT NOT NULL, -- Format: '2024-01-15 14:00:00'
    provider TEXT NOT NULL,
    model TEXT NOT NULL,

    total_requests INTEGER DEFAULT 0,
    total_input_tokens INTEGER DEFAULT 0,
    total_output_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    total_cost INTEGER DEFAULT 0, -- cents

    avg_processing_time_ms REAL DEFAULT 0,
    peak_tokens_per_second REAL DEFAULT 0,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(hour_bucket, provider, model)
);

-- Daily aggregations for trends
CREATE TABLE IF NOT EXISTS token_usage_daily (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date_bucket TEXT NOT NULL, -- Format: '2024-01-15'
    provider TEXT NOT NULL,
    model TEXT NOT NULL,

    total_requests INTEGER DEFAULT 0,
    total_input_tokens INTEGER DEFAULT 0,
    total_output_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    total_cost INTEGER DEFAULT 0, -- cents

    avg_processing_time_ms REAL DEFAULT 0,
    peak_hour_usage INTEGER DEFAULT 0,
    unique_sessions INTEGER DEFAULT 0,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(date_bucket, provider, model)
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Token usage indexes
CREATE INDEX IF NOT EXISTS idx_token_usage_timestamp ON token_usage(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_token_usage_provider_model ON token_usage(provider, model);
CREATE INDEX IF NOT EXISTS idx_token_usage_session ON token_usage(session_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_request_type ON token_usage(request_type);
CREATE INDEX IF NOT EXISTS idx_token_usage_hourly_bucket ON token_usage(date(timestamp), strftime('%H', timestamp));
CREATE INDEX IF NOT EXISTS idx_token_usage_daily_bucket ON token_usage(date(timestamp));
CREATE INDEX IF NOT EXISTS idx_token_usage_cost ON token_usage(cost_total DESC);

-- Hourly aggregation indexes
CREATE INDEX IF NOT EXISTS idx_hourly_hour_bucket ON token_usage_hourly(hour_bucket DESC);
CREATE INDEX IF NOT EXISTS idx_hourly_provider_model ON token_usage_hourly(provider, model);

-- Daily aggregation indexes
CREATE INDEX IF NOT EXISTS idx_daily_date_bucket ON token_usage_daily(date_bucket DESC);
CREATE INDEX IF NOT EXISTS idx_daily_provider_model ON token_usage_daily(provider, model);

-- =============================================
-- TRIGGERS FOR AUTOMATIC AGGREGATION
-- =============================================

-- Trigger to update hourly aggregations
CREATE TRIGGER IF NOT EXISTS update_hourly_aggregation
    AFTER INSERT ON token_usage
BEGIN
    INSERT OR REPLACE INTO token_usage_hourly (
        hour_bucket, provider, model,
        total_requests, total_input_tokens, total_output_tokens,
        total_tokens, total_cost, avg_processing_time_ms,
        updated_at
    )
    SELECT
        datetime(strftime('%Y-%m-%d %H:00:00', NEW.timestamp)) as hour_bucket,
        NEW.provider,
        NEW.model,
        COALESCE(existing.total_requests, 0) + 1,
        COALESCE(existing.total_input_tokens, 0) + NEW.input_tokens,
        COALESCE(existing.total_output_tokens, 0) + NEW.output_tokens,
        COALESCE(existing.total_tokens, 0) + NEW.total_tokens,
        COALESCE(existing.total_cost, 0) + NEW.cost_total,
        ((COALESCE(existing.avg_processing_time_ms, 0) * COALESCE(existing.total_requests, 0)) + NEW.processing_time_ms) / (COALESCE(existing.total_requests, 0) + 1),
        CURRENT_TIMESTAMP
    FROM (
        SELECT *
        FROM token_usage_hourly
        WHERE hour_bucket = datetime(strftime('%Y-%m-%d %H:00:00', NEW.timestamp))
          AND provider = NEW.provider
          AND model = NEW.model
    ) as existing;
END;

-- Trigger to update daily aggregations
CREATE TRIGGER IF NOT EXISTS update_daily_aggregation
    AFTER INSERT ON token_usage
BEGIN
    INSERT OR REPLACE INTO token_usage_daily (
        date_bucket, provider, model,
        total_requests, total_input_tokens, total_output_tokens,
        total_tokens, total_cost, avg_processing_time_ms,
        unique_sessions, updated_at
    )
    SELECT
        date(NEW.timestamp) as date_bucket,
        NEW.provider,
        NEW.model,
        COALESCE(existing.total_requests, 0) + 1,
        COALESCE(existing.total_input_tokens, 0) + NEW.input_tokens,
        COALESCE(existing.total_output_tokens, 0) + NEW.output_tokens,
        COALESCE(existing.total_tokens, 0) + NEW.total_tokens,
        COALESCE(existing.total_cost, 0) + NEW.cost_total,
        ((COALESCE(existing.avg_processing_time_ms, 0) * COALESCE(existing.total_requests, 0)) + NEW.processing_time_ms) / (COALESCE(existing.total_requests, 0) + 1),
        (
            SELECT COUNT(DISTINCT session_id)
            FROM token_usage
            WHERE date(timestamp) = date(NEW.timestamp)
              AND provider = NEW.provider
              AND model = NEW.model
        ),
        CURRENT_TIMESTAMP
    FROM (
        SELECT *
        FROM token_usage_daily
        WHERE date_bucket = date(NEW.timestamp)
          AND provider = NEW.provider
          AND model = NEW.model
    ) as existing;
END;

-- =============================================
-- VIEWS FOR COMMON QUERIES
-- =============================================

-- Last 24 hours hourly view
CREATE VIEW IF NOT EXISTS hourly_token_usage_24h AS
SELECT
    hour_bucket,
    provider,
    model,
    total_tokens,
    total_cost,
    total_requests,
    avg_processing_time_ms
FROM token_usage_hourly
WHERE datetime(hour_bucket) >= datetime('now', '-24 hours')
ORDER BY hour_bucket DESC;

-- Last 30 days daily view
CREATE VIEW IF NOT EXISTS daily_token_usage_30d AS
SELECT
    date_bucket,
    provider,
    model,
    total_tokens,
    total_cost,
    total_requests,
    unique_sessions,
    avg_processing_time_ms
FROM token_usage_daily
WHERE date(date_bucket) >= date('now', '-30 days')
ORDER BY date_bucket DESC;

-- Last 50 messages view
CREATE VIEW IF NOT EXISTS recent_messages AS
SELECT
    id,
    timestamp,
    provider,
    model,
    request_type,
    total_tokens,
    cost_total,
    processing_time_ms,
    CASE
        WHEN length(message_content) > 100
        THEN substr(message_content, 1, 100) || '...'
        ELSE message_content
    END as message_preview,
    CASE
        WHEN length(response_content) > 100
        THEN substr(response_content, 1, 100) || '...'
        ELSE response_content
    END as response_preview
FROM token_usage
ORDER BY timestamp DESC
LIMIT 50;

-- =============================================
-- SAMPLE DATA FOR TESTING
-- =============================================

-- Insert sample data for the last 24 hours (for testing)
INSERT OR IGNORE INTO token_usage (
    request_id, session_id, provider, model, input_tokens, output_tokens,
    cost_input, cost_output, request_type, component, processing_time_ms,
    message_content, response_content, timestamp
) VALUES
    ('test-1', 'session-1', 'anthropic', 'claude-3-5-sonnet-20241022', 150, 300, 45, 180, 'chat', 'agent-feed', 1200, 'Analyze this data for insights', 'Based on the data analysis, I found several key patterns...', datetime('now', '-1 hours')),
    ('test-2', 'session-1', 'anthropic', 'claude-3-5-sonnet-20241022', 200, 450, 60, 270, 'tool_use', 'analytics', 1800, 'Generate a report on token usage', 'Here is a comprehensive report on token usage patterns...', datetime('now', '-2 hours')),
    ('test-3', 'session-2', 'claude-flow', 'agent-orchestrator', 100, 250, 30, 150, 'agent_spawn', 'orchestration', 900, 'Spawn research agent for data analysis', 'Agent spawned successfully and began analysis...', datetime('now', '-3 hours')),
    ('test-4', 'session-2', 'anthropic', 'claude-3-5-haiku-20241022', 80, 120, 24, 72, 'completion', 'search', 600, 'Search for relevant information', 'Found 15 relevant sources for your query...', datetime('now', '-4 hours')),
    ('test-5', 'session-3', 'anthropic', 'claude-3-5-sonnet-20241022', 300, 600, 90, 360, 'chat', 'agent-feed', 2100, 'Help me understand token analytics', 'Token analytics help you understand usage patterns...', datetime('now', '-5 hours'));