-- Token Analytics Database Schema - SPARC Implementation
-- Real token usage tracking without fake data patterns

-- Drop existing tables if they exist
DROP TABLE IF EXISTS token_usage_hourly_aggregates;
DROP TABLE IF EXISTS token_usage_daily_aggregates;
DROP TABLE IF EXISTS token_usage_records;
DROP TABLE IF EXISTS token_sessions;

-- Token sessions table - tracks user sessions
CREATE TABLE token_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT UNIQUE NOT NULL,
    user_id TEXT NOT NULL,
    start_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_time DATETIME NULL,
    total_cost_cents INTEGER NOT NULL DEFAULT 0, -- Store in cents to avoid floating point issues
    total_input_tokens INTEGER NOT NULL DEFAULT 0,
    total_output_tokens INTEGER NOT NULL DEFAULT 0,
    total_requests INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed', 'timeout')),
    metadata TEXT, -- JSON metadata
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Token usage records table - individual API calls
CREATE TABLE token_usage_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    message_id TEXT UNIQUE NOT NULL, -- Prevents duplicate tracking
    provider TEXT NOT NULL CHECK (provider IN ('anthropic', 'claude-flow', 'mcp', 'openai')),
    model TEXT NOT NULL,
    request_type TEXT NOT NULL,
    component TEXT, -- Component that made the request

    -- Token counts (exact values from API responses)
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    cache_creation_tokens INTEGER DEFAULT 0,
    cache_read_tokens INTEGER DEFAULT 0,

    -- Cost calculations (in cents)
    cost_input INTEGER NOT NULL DEFAULT 0,
    cost_output INTEGER NOT NULL DEFAULT 0,
    cost_cache_creation INTEGER DEFAULT 0,
    cost_cache_read INTEGER DEFAULT 0,

    -- Timing and metadata
    processing_time_ms INTEGER DEFAULT 0,
    request_size_bytes INTEGER DEFAULT 0,
    response_size_bytes INTEGER DEFAULT 0,
    retry_count INTEGER NOT NULL DEFAULT 0,

    -- Request/response content hashes (for deduplication)
    request_hash TEXT,
    response_hash TEXT,

    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (session_id) REFERENCES token_sessions(session_id) ON DELETE CASCADE
);

-- Hourly aggregates table - pre-computed hourly summaries
CREATE TABLE token_usage_hourly_aggregates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hour_bucket DATETIME NOT NULL, -- Rounded to hour boundary
    user_id TEXT,
    provider TEXT,

    -- Aggregated counts
    total_requests INTEGER NOT NULL DEFAULT 0,
    total_input_tokens INTEGER NOT NULL DEFAULT 0,
    total_output_tokens INTEGER NOT NULL DEFAULT 0,
    total_cache_creation_tokens INTEGER NOT NULL DEFAULT 0,
    total_cache_read_tokens INTEGER NOT NULL DEFAULT 0,

    -- Aggregated costs (in cents)
    total_cost_cents INTEGER NOT NULL DEFAULT 0,
    total_cost_input_cents INTEGER NOT NULL DEFAULT 0,
    total_cost_output_cents INTEGER NOT NULL DEFAULT 0,
    total_cost_cache_creation_cents INTEGER NOT NULL DEFAULT 0,
    total_cost_cache_read_cents INTEGER NOT NULL DEFAULT 0,

    -- Statistical measures
    avg_tokens_per_request REAL DEFAULT 0,
    max_tokens_single_request INTEGER DEFAULT 0,
    min_tokens_single_request INTEGER DEFAULT 0,
    avg_processing_time_ms REAL DEFAULT 0,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(hour_bucket, user_id, provider)
);

-- Daily aggregates table - pre-computed daily summaries
CREATE TABLE token_usage_daily_aggregates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date_bucket DATE NOT NULL, -- YYYY-MM-DD format
    user_id TEXT,
    provider TEXT,

    -- Aggregated counts
    total_requests INTEGER NOT NULL DEFAULT 0,
    total_input_tokens INTEGER NOT NULL DEFAULT 0,
    total_output_tokens INTEGER NOT NULL DEFAULT 0,
    total_cache_creation_tokens INTEGER NOT NULL DEFAULT 0,
    total_cache_read_tokens INTEGER NOT NULL DEFAULT 0,

    -- Aggregated costs (in cents)
    total_cost_cents INTEGER NOT NULL DEFAULT 0,
    total_cost_input_cents INTEGER NOT NULL DEFAULT 0,
    total_cost_output_cents INTEGER NOT NULL DEFAULT 0,
    total_cost_cache_creation_cents INTEGER NOT NULL DEFAULT 0,
    total_cost_cache_read_cents INTEGER NOT NULL DEFAULT 0,

    -- Daily statistics
    avg_tokens_per_request REAL DEFAULT 0,
    peak_hourly_tokens INTEGER DEFAULT 0,
    peak_hourly_cost_cents INTEGER DEFAULT 0,
    active_hours INTEGER DEFAULT 0, -- Hours with activity
    unique_models_used INTEGER DEFAULT 0,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(date_bucket, user_id, provider)
);

-- Indexes for performance
CREATE INDEX idx_token_usage_records_session_id ON token_usage_records(session_id);
CREATE INDEX idx_token_usage_records_timestamp ON token_usage_records(timestamp);
CREATE INDEX idx_token_usage_records_provider ON token_usage_records(provider);
CREATE INDEX idx_token_usage_records_message_id ON token_usage_records(message_id);
CREATE INDEX idx_token_usage_records_request_hash ON token_usage_records(request_hash);

CREATE INDEX idx_token_sessions_user_id ON token_sessions(user_id);
CREATE INDEX idx_token_sessions_start_time ON token_sessions(start_time);
CREATE INDEX idx_token_sessions_status ON token_sessions(status);

CREATE INDEX idx_hourly_aggregates_bucket ON token_usage_hourly_aggregates(hour_bucket);
CREATE INDEX idx_hourly_aggregates_user_provider ON token_usage_hourly_aggregates(user_id, provider);

CREATE INDEX idx_daily_aggregates_bucket ON token_usage_daily_aggregates(date_bucket);
CREATE INDEX idx_daily_aggregates_user_provider ON token_usage_daily_aggregates(user_id, provider);

-- Triggers for automatic aggregation updates

-- Update session totals when records are inserted
CREATE TRIGGER update_session_totals
AFTER INSERT ON token_usage_records
BEGIN
    UPDATE token_sessions SET
        total_cost_cents = total_cost_cents + NEW.cost_input + NEW.cost_output + COALESCE(NEW.cost_cache_creation, 0) + COALESCE(NEW.cost_cache_read, 0),
        total_input_tokens = total_input_tokens + NEW.input_tokens,
        total_output_tokens = total_output_tokens + NEW.output_tokens,
        total_requests = total_requests + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE session_id = NEW.session_id;
END;

-- Update hourly aggregates
CREATE TRIGGER update_hourly_aggregates
AFTER INSERT ON token_usage_records
BEGIN
    INSERT OR REPLACE INTO token_usage_hourly_aggregates (
        hour_bucket, user_id, provider,
        total_requests, total_input_tokens, total_output_tokens,
        total_cache_creation_tokens, total_cache_read_tokens,
        total_cost_cents, total_cost_input_cents, total_cost_output_cents,
        total_cost_cache_creation_cents, total_cost_cache_read_cents,
        avg_tokens_per_request, max_tokens_single_request, min_tokens_single_request,
        updated_at
    )
    SELECT
        datetime(strftime('%Y-%m-%d %H:00:00', NEW.timestamp)) as hour_bucket,
        ts.user_id,
        NEW.provider,
        COALESCE(existing.total_requests, 0) + 1,
        COALESCE(existing.total_input_tokens, 0) + NEW.input_tokens,
        COALESCE(existing.total_output_tokens, 0) + NEW.output_tokens,
        COALESCE(existing.total_cache_creation_tokens, 0) + COALESCE(NEW.cache_creation_tokens, 0),
        COALESCE(existing.total_cache_read_tokens, 0) + COALESCE(NEW.cache_read_tokens, 0),
        COALESCE(existing.total_cost_cents, 0) + NEW.cost_input + NEW.cost_output + COALESCE(NEW.cost_cache_creation, 0) + COALESCE(NEW.cost_cache_read, 0),
        COALESCE(existing.total_cost_input_cents, 0) + NEW.cost_input,
        COALESCE(existing.total_cost_output_cents, 0) + NEW.cost_output,
        COALESCE(existing.total_cost_cache_creation_cents, 0) + COALESCE(NEW.cost_cache_creation, 0),
        COALESCE(existing.total_cost_cache_read_cents, 0) + COALESCE(NEW.cost_cache_read, 0),
        CAST((COALESCE(existing.total_input_tokens, 0) + NEW.input_tokens + COALESCE(existing.total_output_tokens, 0) + NEW.output_tokens) AS REAL) / (COALESCE(existing.total_requests, 0) + 1),
        MAX(COALESCE(existing.max_tokens_single_request, 0), NEW.input_tokens + NEW.output_tokens),
        CASE
            WHEN existing.min_tokens_single_request IS NULL THEN NEW.input_tokens + NEW.output_tokens
            ELSE MIN(existing.min_tokens_single_request, NEW.input_tokens + NEW.output_tokens)
        END,
        CURRENT_TIMESTAMP
    FROM token_sessions ts
    LEFT JOIN token_usage_hourly_aggregates existing ON
        existing.hour_bucket = datetime(strftime('%Y-%m-%d %H:00:00', NEW.timestamp))
        AND existing.user_id = ts.user_id
        AND existing.provider = NEW.provider
    WHERE ts.session_id = NEW.session_id;
END;

-- Update daily aggregates
CREATE TRIGGER update_daily_aggregates
AFTER INSERT ON token_usage_records
BEGIN
    INSERT OR REPLACE INTO token_usage_daily_aggregates (
        date_bucket, user_id, provider,
        total_requests, total_input_tokens, total_output_tokens,
        total_cache_creation_tokens, total_cache_read_tokens,
        total_cost_cents, total_cost_input_cents, total_cost_output_cents,
        total_cost_cache_creation_cents, total_cost_cache_read_cents,
        avg_tokens_per_request, unique_models_used, updated_at
    )
    SELECT
        date(NEW.timestamp) as date_bucket,
        ts.user_id,
        NEW.provider,
        COALESCE(existing.total_requests, 0) + 1,
        COALESCE(existing.total_input_tokens, 0) + NEW.input_tokens,
        COALESCE(existing.total_output_tokens, 0) + NEW.output_tokens,
        COALESCE(existing.total_cache_creation_tokens, 0) + COALESCE(NEW.cache_creation_tokens, 0),
        COALESCE(existing.total_cache_read_tokens, 0) + COALESCE(NEW.cache_read_tokens, 0),
        COALESCE(existing.total_cost_cents, 0) + NEW.cost_input + NEW.cost_output + COALESCE(NEW.cost_cache_creation, 0) + COALESCE(NEW.cost_cache_read, 0),
        COALESCE(existing.total_cost_input_cents, 0) + NEW.cost_input,
        COALESCE(existing.total_cost_output_cents, 0) + NEW.cost_output,
        COALESCE(existing.total_cost_cache_creation_cents, 0) + COALESCE(NEW.cost_cache_creation, 0),
        COALESCE(existing.total_cost_cache_read_cents, 0) + COALESCE(NEW.cost_cache_read, 0),
        CAST((COALESCE(existing.total_input_tokens, 0) + NEW.input_tokens + COALESCE(existing.total_output_tokens, 0) + NEW.output_tokens) AS REAL) / (COALESCE(existing.total_requests, 0) + 1),
        COALESCE(existing.unique_models_used, 0) + CASE WHEN EXISTS(
            SELECT 1 FROM token_usage_records tur2
            JOIN token_sessions ts2 ON tur2.session_id = ts2.session_id
            WHERE date(tur2.timestamp) = date(NEW.timestamp)
            AND ts2.user_id = ts.user_id
            AND tur2.provider = NEW.provider
            AND tur2.model = NEW.model
        ) THEN 0 ELSE 1 END,
        CURRENT_TIMESTAMP
    FROM token_sessions ts
    LEFT JOIN token_usage_daily_aggregates existing ON
        existing.date_bucket = date(NEW.timestamp)
        AND existing.user_id = ts.user_id
        AND existing.provider = NEW.provider
    WHERE ts.session_id = NEW.session_id;
END;

-- Views for common queries

-- Recent usage view
CREATE VIEW recent_token_usage AS
SELECT
    tur.id,
    tur.timestamp,
    tur.provider,
    tur.model,
    tur.request_type,
    tur.component,
    tur.input_tokens,
    tur.output_tokens,
    tur.input_tokens + tur.output_tokens as total_tokens,
    ROUND((tur.cost_input + tur.cost_output + COALESCE(tur.cost_cache_creation, 0) + COALESCE(tur.cost_cache_read, 0)) / 100.0, 4) as cost_dollars,
    tur.processing_time_ms,
    ts.user_id,
    tur.session_id
FROM token_usage_records tur
JOIN token_sessions ts ON tur.session_id = ts.session_id
ORDER BY tur.timestamp DESC;

-- Hourly summary view
CREATE VIEW hourly_usage_summary AS
SELECT
    hour_bucket,
    user_id,
    provider,
    total_requests,
    total_input_tokens + total_output_tokens as total_tokens,
    ROUND(total_cost_cents / 100.0, 4) as cost_dollars,
    ROUND(avg_tokens_per_request, 1) as avg_tokens_per_request,
    max_tokens_single_request,
    ROUND(avg_processing_time_ms, 1) as avg_processing_time_ms
FROM token_usage_hourly_aggregates
ORDER BY hour_bucket DESC;

-- Daily summary view
CREATE VIEW daily_usage_summary AS
SELECT
    date_bucket,
    user_id,
    provider,
    total_requests,
    total_input_tokens + total_output_tokens as total_tokens,
    ROUND(total_cost_cents / 100.0, 4) as cost_dollars,
    ROUND(avg_tokens_per_request, 1) as avg_tokens_per_request,
    ROUND(peak_hourly_cost_cents / 100.0, 4) as peak_hourly_cost_dollars,
    active_hours,
    unique_models_used
FROM token_usage_daily_aggregates
ORDER BY date_bucket DESC;

-- Cost alerts thresholds (configuration table)
CREATE TABLE cost_alert_thresholds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    threshold_type TEXT NOT NULL CHECK (threshold_type IN ('hourly', 'daily', 'monthly')),
    limit_cents INTEGER NOT NULL,
    alert_at_percentage INTEGER NOT NULL DEFAULT 80, -- Alert at 80% of limit
    enabled BOOLEAN NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id, threshold_type)
);

-- Insert default thresholds
INSERT INTO cost_alert_thresholds (user_id, threshold_type, limit_cents, alert_at_percentage) VALUES
(NULL, 'hourly', 1000, 80),    -- $10.00 per hour default
(NULL, 'daily', 5000, 80),     -- $50.00 per day default
(NULL, 'monthly', 100000, 80); -- $1000.00 per month default

-- Data cleanup procedures (to be run periodically)

-- Clean up old records (keep 1 year)
CREATE VIEW cleanup_old_records AS
SELECT
    'DELETE FROM token_usage_records WHERE timestamp < datetime("now", "-1 year");' as cleanup_sql
UNION ALL
SELECT
    'DELETE FROM token_usage_hourly_aggregates WHERE hour_bucket < datetime("now", "-1 year");' as cleanup_sql
UNION ALL
SELECT
    'DELETE FROM token_usage_daily_aggregates WHERE date_bucket < date("now", "-1 year");' as cleanup_sql;

-- Performance monitoring query
CREATE VIEW token_usage_performance AS
SELECT
    'records_count' as metric,
    COUNT(*) as value,
    'Total token usage records' as description
FROM token_usage_records
UNION ALL
SELECT
    'hourly_aggregates_count' as metric,
    COUNT(*) as value,
    'Total hourly aggregate records' as description
FROM token_usage_hourly_aggregates
UNION ALL
SELECT
    'daily_aggregates_count' as metric,
    COUNT(*) as value,
    'Total daily aggregate records' as description
FROM token_usage_daily_aggregates
UNION ALL
SELECT
    'active_sessions' as metric,
    COUNT(*) as value,
    'Currently active sessions' as description
FROM token_sessions
WHERE status = 'active';

-- Comments for documentation
PRAGMA user_version = 1;

-- Insert schema metadata
INSERT INTO sqlite_master (type, name, tbl_name, rootpage, sql) VALUES
('comment', 'schema_description', '', 0, 'Token Analytics Database Schema - Tracks real token usage without fake data patterns. Stores costs in cents to avoid floating point precision issues. Includes automatic aggregation triggers for performance.');

PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA cache_size = 10000;
PRAGMA temp_store = memory;