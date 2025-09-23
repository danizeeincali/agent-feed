-- SPARC Phase 3 - ARCHITECTURE: Authentic Claude Console Data Schema
-- Designed for 100% real data with zero synthetic content
--
-- REQUIREMENTS:
-- - Store exactly $8.43 total cost
-- - Track 5,784,733 input + 30,696 output tokens
-- - Authentic request IDs: req_011CTF... format
-- - Model: claude-sonnet-4-20250514

-- Drop existing tables if they exist
DROP TABLE IF EXISTS authentic_token_usage;
DROP TABLE IF EXISTS console_log_imports;
DROP TABLE IF EXISTS data_validation_logs;

-- Main table for authentic Claude Console data
CREATE TABLE authentic_token_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Request identification
    request_id TEXT NOT NULL UNIQUE, -- req_011CTF... format
    session_id TEXT,
    operation_type TEXT NOT NULL DEFAULT 'claude-code-operation',

    -- Timing
    timestamp DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    -- Model and pricing
    model TEXT NOT NULL DEFAULT 'claude-sonnet-4-20250514',

    -- Token usage (exact counts)
    input_tokens INTEGER NOT NULL,
    output_tokens INTEGER NOT NULL,
    cache_creation_input_tokens INTEGER DEFAULT 0,
    cache_read_input_tokens INTEGER DEFAULT 0,

    -- Pricing (per token in dollars)
    cost_per_input_token REAL NOT NULL,
    cost_per_output_token REAL NOT NULL,
    cost_per_cache_creation_token REAL DEFAULT 0,
    cost_per_cache_read_token REAL DEFAULT 0,

    -- Calculated costs
    input_cost REAL GENERATED ALWAYS AS (input_tokens * cost_per_input_token) STORED,
    output_cost REAL GENERATED ALWAYS AS (output_tokens * cost_per_output_token) STORED,
    cache_creation_cost REAL GENERATED ALWAYS AS (cache_creation_input_tokens * cost_per_cache_creation_token) STORED,
    cache_read_cost REAL GENERATED ALWAYS AS (cache_read_input_tokens * cost_per_cache_read_token) STORED,
    total_cost REAL GENERATED ALWAYS AS (
        (input_tokens * cost_per_input_token) +
        (output_tokens * cost_per_output_token) +
        (cache_creation_input_tokens * cost_per_cache_creation_token) +
        (cache_read_input_tokens * cost_per_cache_read_token)
    ) STORED,

    -- Data integrity
    is_authentic BOOLEAN NOT NULL DEFAULT 1,
    source_file TEXT, -- Original console log file
    import_batch_id TEXT,

    -- Constraints to prevent fake data
    CONSTRAINT chk_request_id_format CHECK (request_id LIKE 'req_011CTF%'),
    CONSTRAINT chk_model_authentic CHECK (model = 'claude-sonnet-4-20250514'),
    CONSTRAINT chk_positive_tokens CHECK (
        input_tokens >= 0 AND
        output_tokens >= 0 AND
        cache_creation_input_tokens >= 0 AND
        cache_read_input_tokens >= 0
    ),
    CONSTRAINT chk_realistic_costs CHECK (
        cost_per_input_token > 0 AND
        cost_per_output_token > 0 AND
        total_cost > 0
    )
);

-- Import tracking table
CREATE TABLE console_log_imports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    import_batch_id TEXT NOT NULL UNIQUE,
    source_file TEXT NOT NULL,
    import_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,

    -- Import summary
    total_entries_processed INTEGER NOT NULL,
    valid_entries_imported INTEGER NOT NULL,
    invalid_entries_skipped INTEGER NOT NULL,

    -- Validation against requirements
    total_cost_imported REAL NOT NULL,
    total_input_tokens_imported INTEGER NOT NULL,
    total_output_tokens_imported INTEGER NOT NULL,

    -- Requirements validation
    meets_cost_requirement BOOLEAN GENERATED ALWAYS AS (
        ABS(total_cost_imported - 8.43) < 0.01
    ) STORED,
    meets_input_requirement BOOLEAN GENERATED ALWAYS AS (
        total_input_tokens_imported = 5784733
    ) STORED,
    meets_output_requirement BOOLEAN GENERATED ALWAYS AS (
        total_output_tokens_imported = 30696
    ) STORED,
    meets_all_requirements BOOLEAN GENERATED ALWAYS AS (
        meets_cost_requirement AND meets_input_requirement AND meets_output_requirement
    ) STORED,

    -- Error tracking
    import_errors TEXT,
    validation_warnings TEXT
);

-- Data validation logs
CREATE TABLE data_validation_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    validation_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    validation_type TEXT NOT NULL, -- 'import', 'daily', 'on-demand'

    -- Current totals
    current_total_cost REAL NOT NULL,
    current_input_tokens INTEGER NOT NULL,
    current_output_tokens INTEGER NOT NULL,
    current_request_count INTEGER NOT NULL,

    -- Validation results
    cost_matches_requirement BOOLEAN NOT NULL,
    input_tokens_match_requirement BOOLEAN NOT NULL,
    output_tokens_match_requirement BOOLEAN NOT NULL,
    all_requirements_met BOOLEAN NOT NULL,

    -- Deltas from requirements
    cost_delta REAL NOT NULL,
    input_token_delta INTEGER NOT NULL,
    output_token_delta INTEGER NOT NULL,

    -- Data integrity checks
    fake_data_detected BOOLEAN NOT NULL DEFAULT 0,
    fake_patterns_found TEXT,
    suspicious_entries_count INTEGER DEFAULT 0,

    validation_notes TEXT
);

-- Indexes for performance
CREATE INDEX idx_authentic_token_usage_timestamp ON authentic_token_usage(timestamp);
CREATE INDEX idx_authentic_token_usage_session ON authentic_token_usage(session_id);
CREATE INDEX idx_authentic_token_usage_model ON authentic_token_usage(model);
CREATE INDEX idx_authentic_token_usage_cost ON authentic_token_usage(total_cost);
CREATE INDEX idx_authentic_token_usage_request_id ON authentic_token_usage(request_id);

-- View for real-time dashboard queries
CREATE VIEW dashboard_summary AS
SELECT
    COUNT(*) as total_requests,
    SUM(input_tokens) as total_input_tokens,
    SUM(output_tokens) as total_output_tokens,
    SUM(total_cost) as total_cost,
    AVG(total_cost) as avg_cost_per_request,
    MIN(timestamp) as first_request,
    MAX(timestamp) as last_request,
    COUNT(DISTINCT session_id) as unique_sessions,

    -- Requirements validation
    CASE
        WHEN ABS(SUM(total_cost) - 8.43) < 0.01 THEN 1
        ELSE 0
    END as cost_requirement_met,

    CASE
        WHEN SUM(input_tokens) = 5784733 THEN 1
        ELSE 0
    END as input_requirement_met,

    CASE
        WHEN SUM(output_tokens) = 30696 THEN 1
        ELSE 0
    END as output_requirement_met

FROM authentic_token_usage
WHERE is_authentic = 1;

-- View for hourly usage trends
CREATE VIEW hourly_usage_trend AS
SELECT
    strftime('%Y-%m-%d %H:00:00', timestamp) as hour,
    COUNT(*) as request_count,
    SUM(input_tokens) as total_input,
    SUM(output_tokens) as total_output,
    SUM(total_cost) as hourly_cost,
    AVG(total_cost) as avg_cost_per_request
FROM authentic_token_usage
WHERE is_authentic = 1
  AND datetime(timestamp) >= datetime('now', '-7 days')
GROUP BY strftime('%Y-%m-%d %H', timestamp)
ORDER BY hour DESC;

-- View for daily usage trends
CREATE VIEW daily_usage_trend AS
SELECT
    DATE(timestamp) as date,
    COUNT(*) as request_count,
    SUM(input_tokens) as total_input,
    SUM(output_tokens) as total_output,
    SUM(total_cost) as daily_cost,
    AVG(total_cost) as avg_cost_per_request
FROM authentic_token_usage
WHERE is_authentic = 1
  AND DATE(timestamp) >= DATE('now', '-30 days')
GROUP BY DATE(timestamp)
ORDER BY date DESC;

-- Trigger to validate data integrity on insert
CREATE TRIGGER validate_authentic_data_insert
BEFORE INSERT ON authentic_token_usage
BEGIN
    -- Reject obviously fake patterns
    SELECT CASE
        WHEN NEW.total_cost = 12.45 THEN
            RAISE(ABORT, 'Rejected fake cost pattern $12.45')
        WHEN NEW.input_tokens = 99999 OR NEW.output_tokens = 99999 THEN
            RAISE(ABORT, 'Rejected fake token pattern 99999')
        WHEN NEW.request_id NOT LIKE 'req_011CTF%' THEN
            RAISE(ABORT, 'Invalid request ID format - must start with req_011CTF')
        WHEN NEW.model != 'claude-sonnet-4-20250514' THEN
            RAISE(ABORT, 'Invalid model - must be claude-sonnet-4-20250514')
    END;
END;

-- Function to check if system meets requirements
CREATE VIEW system_requirements_status AS
SELECT
    ds.total_cost,
    ds.total_input_tokens,
    ds.total_output_tokens,
    ds.total_requests,

    -- Requirement deltas
    ROUND(ds.total_cost - 8.43, 6) as cost_delta,
    ds.total_input_tokens - 5784733 as input_delta,
    ds.total_output_tokens - 30696 as output_delta,

    -- Requirement status
    ds.cost_requirement_met,
    ds.input_requirement_met,
    ds.output_requirement_met,

    -- Overall status
    CASE
        WHEN ds.cost_requirement_met = 1
         AND ds.input_requirement_met = 1
         AND ds.output_requirement_met = 1
        THEN 'REQUIREMENTS_MET'
        ELSE 'REQUIREMENTS_NOT_MET'
    END as overall_status,

    -- Last update
    ds.last_request as last_data_update

FROM dashboard_summary ds;

-- Initial validation record
INSERT INTO data_validation_logs (
    validation_type,
    current_total_cost,
    current_input_tokens,
    current_output_tokens,
    current_request_count,
    cost_matches_requirement,
    input_tokens_match_requirement,
    output_tokens_match_requirement,
    all_requirements_met,
    cost_delta,
    input_token_delta,
    output_token_delta,
    validation_notes
) VALUES (
    'initial',
    0.0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    -8.43,
    -5784733,
    -30696,
    'Initial schema creation - no data imported yet'
);