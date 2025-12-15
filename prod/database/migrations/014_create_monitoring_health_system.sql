-- Database Monitoring and Health Check System Migration
-- Migration: 014_create_monitoring_health_system.sql
-- Version: 1.0.0
-- Date: 2025-01-04
-- Description: Comprehensive monitoring, health checks, and alerting system

BEGIN;

-- =============================================================================
-- 1. SYSTEM HEALTH MONITORING
-- =============================================================================

-- System health metrics table
CREATE TABLE system_health_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Timestamp and measurement window
    measurement_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    measurement_window INTERVAL DEFAULT INTERVAL '5 minutes',
    
    -- Database performance metrics
    active_connections INTEGER DEFAULT 0,
    max_connections INTEGER DEFAULT 0,
    connection_utilization_percent DECIMAL(5,2) DEFAULT 0.0,
    
    -- Query performance
    avg_query_time_ms DECIMAL(10,4) DEFAULT 0.0,
    slow_queries_count INTEGER DEFAULT 0,
    failed_queries_count INTEGER DEFAULT 0,
    queries_per_second DECIMAL(10,4) DEFAULT 0.0,
    
    -- Cache and memory metrics
    cache_hit_ratio DECIMAL(5,4) DEFAULT 0.0,
    index_usage_ratio DECIMAL(5,4) DEFAULT 0.0,
    shared_buffers_usage_percent DECIMAL(5,2) DEFAULT 0.0,
    work_mem_usage_mb DECIMAL(10,2) DEFAULT 0.0,
    
    -- Storage metrics
    database_size_mb BIGINT DEFAULT 0,
    table_sizes JSONB DEFAULT '{}',
    index_sizes JSONB DEFAULT '{}',
    disk_usage_percent DECIMAL(5,2) DEFAULT 0.0,
    
    -- Transaction metrics
    commits_per_second DECIMAL(10,4) DEFAULT 0.0,
    rollbacks_per_second DECIMAL(10,4) DEFAULT 0.0,
    deadlocks_count INTEGER DEFAULT 0,
    lock_waits_count INTEGER DEFAULT 0,
    
    -- Application-specific metrics
    posts_created_per_minute INTEGER DEFAULT 0,
    user_sessions_active INTEGER DEFAULT 0,
    interaction_events_per_minute INTEGER DEFAULT 0,
    quality_assessments_pending INTEGER DEFAULT 0,
    
    -- System load indicators
    cpu_usage_percent DECIMAL(5,2) DEFAULT 0.0,
    memory_usage_percent DECIMAL(5,2) DEFAULT 0.0,
    io_wait_percent DECIMAL(5,2) DEFAULT 0.0,
    load_average_1min DECIMAL(5,2) DEFAULT 0.0,
    
    -- Health indicators
    overall_health_score DECIMAL(3,2) DEFAULT 1.0 CHECK (overall_health_score BETWEEN 0 AND 1),
    health_status VARCHAR(20) DEFAULT 'healthy' 
        CHECK (health_status IN ('healthy', 'warning', 'critical', 'unknown')),
    
    -- Alert tracking
    alerts_triggered INTEGER DEFAULT 0,
    alert_details JSONB DEFAULT '[]',
    
    -- Metadata
    collection_method VARCHAR(50) DEFAULT 'automatic',
    data_source VARCHAR(100) DEFAULT 'system'
);

-- =============================================================================
-- 2. ALERT SYSTEM
-- =============================================================================

-- Alert definitions and rules
CREATE TABLE alert_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Rule identification
    rule_name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    category VARCHAR(100) NOT NULL DEFAULT 'performance',
    
    -- Alert conditions
    metric_name VARCHAR(100) NOT NULL,
    condition_type VARCHAR(20) NOT NULL 
        CHECK (condition_type IN ('threshold', 'trend', 'anomaly', 'pattern')),
    
    -- Threshold conditions
    threshold_value DECIMAL(15,4),
    threshold_operator VARCHAR(10) 
        CHECK (threshold_operator IN ('>', '<', '>=', '<=', '=', '!=')),
    
    -- Trend conditions
    trend_window INTERVAL,
    trend_direction VARCHAR(20) 
        CHECK (trend_direction IN ('increasing', 'decreasing', 'volatile')),
    trend_threshold DECIMAL(10,4),
    
    -- Alert severity and priority
    severity VARCHAR(20) NOT NULL DEFAULT 'medium'
        CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
    
    -- Alert timing
    check_frequency INTERVAL DEFAULT INTERVAL '5 minutes',
    alert_frequency INTERVAL DEFAULT INTERVAL '30 minutes', -- How often to re-alert
    snooze_duration INTERVAL DEFAULT INTERVAL '1 hour',
    
    -- Notification settings
    notification_channels JSONB DEFAULT '["email"]',
    notification_recipients JSONB DEFAULT '[]',
    escalation_rules JSONB DEFAULT '{}',
    
    -- Rule status and lifecycle
    is_active BOOLEAN DEFAULT TRUE,
    last_checked TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_triggered TIMESTAMP WITH TIME ZONE,
    trigger_count INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(100)
);

-- Alert incidents and history
CREATE TABLE alert_incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_rule_id UUID NOT NULL REFERENCES alert_rules(id) ON DELETE CASCADE,
    
    -- Incident identification
    incident_key VARCHAR(255) NOT NULL, -- For deduplication
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Incident details
    triggered_value DECIMAL(15,4),
    threshold_value DECIMAL(15,4),
    severity VARCHAR(20) NOT NULL,
    
    -- Status tracking
    status VARCHAR(20) NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'acknowledged', 'resolved', 'suppressed')),
    
    -- Timing
    first_triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    
    -- Response tracking
    acknowledged_by VARCHAR(100),
    resolved_by VARCHAR(100),
    resolution_notes TEXT,
    
    -- Incident metrics
    duration_minutes INTEGER,
    escalation_level INTEGER DEFAULT 1,
    notification_count INTEGER DEFAULT 0,
    
    -- Related data
    related_metrics JSONB DEFAULT '{}',
    system_context JSONB DEFAULT '{}',
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(alert_rule_id, incident_key)
);

-- =============================================================================
-- 3. COMPREHENSIVE HEALTH CHECK FUNCTIONS
-- =============================================================================

-- Master health check function
CREATE OR REPLACE FUNCTION perform_comprehensive_health_check()
RETURNS TABLE (
    check_category VARCHAR,
    check_name VARCHAR,
    status VARCHAR,
    value TEXT,
    threshold TEXT,
    severity VARCHAR,
    details JSONB
) AS $$
BEGIN
    -- Database connection health
    RETURN QUERY
    WITH connection_stats AS (
        SELECT 
            COUNT(*) as active_connections,
            (SELECT setting::INTEGER FROM pg_settings WHERE name = 'max_connections') as max_connections
        FROM pg_stat_activity 
        WHERE state = 'active'
    )
    SELECT 
        'database'::VARCHAR,
        'connection_utilization'::VARCHAR,
        CASE 
            WHEN (active_connections::DECIMAL / max_connections) > 0.8 THEN 'CRITICAL'
            WHEN (active_connections::DECIMAL / max_connections) > 0.6 THEN 'WARNING'
            ELSE 'HEALTHY'
        END::VARCHAR,
        ROUND((active_connections::DECIMAL / max_connections * 100), 2)::TEXT || '%',
        '< 80%'::TEXT,
        CASE 
            WHEN (active_connections::DECIMAL / max_connections) > 0.8 THEN 'critical'
            WHEN (active_connections::DECIMAL / max_connections) > 0.6 THEN 'high'
            ELSE 'low'
        END::VARCHAR,
        jsonb_build_object(
            'active_connections', active_connections,
            'max_connections', max_connections,
            'utilization_percent', ROUND((active_connections::DECIMAL / max_connections * 100), 2)
        )
    FROM connection_stats;
    
    -- Cache hit ratio check
    RETURN QUERY
    WITH cache_stats AS (
        SELECT 
            ROUND((SUM(heap_blks_hit) / (SUM(heap_blks_hit) + SUM(heap_blks_read)) * 100)::NUMERIC, 2) as cache_hit_ratio
        FROM pg_statio_user_tables
        WHERE heap_blks_hit + heap_blks_read > 0
    )
    SELECT 
        'performance'::VARCHAR,
        'cache_hit_ratio'::VARCHAR,
        CASE 
            WHEN cache_hit_ratio < 90 THEN 'CRITICAL'
            WHEN cache_hit_ratio < 95 THEN 'WARNING'
            ELSE 'HEALTHY'
        END::VARCHAR,
        cache_hit_ratio::TEXT || '%',
        '> 95%'::TEXT,
        CASE 
            WHEN cache_hit_ratio < 90 THEN 'critical'
            WHEN cache_hit_ratio < 95 THEN 'medium'
            ELSE 'low'
        END::VARCHAR,
        jsonb_build_object('cache_hit_ratio', cache_hit_ratio)
    FROM cache_stats;
    
    -- Index usage check
    RETURN QUERY
    WITH index_stats AS (
        SELECT 
            ROUND((SUM(idx_scan) / NULLIF(SUM(seq_scan) + SUM(idx_scan), 0) * 100)::NUMERIC, 2) as index_usage_ratio
        FROM pg_stat_user_tables
    )
    SELECT 
        'performance'::VARCHAR,
        'index_usage_ratio'::VARCHAR,
        CASE 
            WHEN index_usage_ratio < 80 THEN 'WARNING'
            WHEN index_usage_ratio < 90 THEN 'INFO'
            ELSE 'HEALTHY'
        END::VARCHAR,
        COALESCE(index_usage_ratio::TEXT, '0') || '%',
        '> 90%'::TEXT,
        CASE 
            WHEN index_usage_ratio < 80 THEN 'medium'
            ELSE 'low'
        END::VARCHAR,
        jsonb_build_object('index_usage_ratio', COALESCE(index_usage_ratio, 0))
    FROM index_stats;
    
    -- Database size check
    RETURN QUERY
    WITH size_stats AS (
        SELECT pg_size_pretty(pg_database_size(current_database())) as db_size,
               pg_database_size(current_database()) as db_size_bytes
    )
    SELECT 
        'storage'::VARCHAR,
        'database_size'::VARCHAR,
        CASE 
            WHEN db_size_bytes > 100 * 1024^3 THEN 'WARNING' -- > 100GB
            WHEN db_size_bytes > 500 * 1024^3 THEN 'CRITICAL' -- > 500GB
            ELSE 'HEALTHY'
        END::VARCHAR,
        db_size::TEXT,
        '< 100GB (warning), < 500GB (critical)'::TEXT,
        CASE 
            WHEN db_size_bytes > 500 * 1024^3 THEN 'high'
            WHEN db_size_bytes > 100 * 1024^3 THEN 'medium'
            ELSE 'low'
        END::VARCHAR,
        jsonb_build_object(
            'size_pretty', db_size,
            'size_bytes', db_size_bytes
        )
    FROM size_stats;
    
    -- Long running queries check
    RETURN QUERY
    WITH long_queries AS (
        SELECT 
            COUNT(*) as long_query_count,
            MAX(EXTRACT(EPOCH FROM (NOW() - query_start))) as longest_query_seconds
        FROM pg_stat_activity
        WHERE state = 'active' 
        AND query_start < NOW() - INTERVAL '5 minutes'
        AND query NOT LIKE '%pg_stat_activity%'
    )
    SELECT 
        'performance'::VARCHAR,
        'long_running_queries'::VARCHAR,
        CASE 
            WHEN long_query_count > 10 THEN 'CRITICAL'
            WHEN long_query_count > 5 THEN 'WARNING'
            WHEN long_query_count > 0 THEN 'INFO'
            ELSE 'HEALTHY'
        END::VARCHAR,
        long_query_count::TEXT || ' queries',
        '< 5 queries'::TEXT,
        CASE 
            WHEN long_query_count > 10 THEN 'high'
            WHEN long_query_count > 5 THEN 'medium'
            ELSE 'low'
        END::VARCHAR,
        jsonb_build_object(
            'long_query_count', long_query_count,
            'longest_query_seconds', COALESCE(longest_query_seconds, 0)
        )
    FROM long_queries;
    
    -- Recent errors check
    RETURN QUERY
    WITH error_stats AS (
        SELECT COUNT(*) as recent_errors
        FROM audit_log
        WHERE created_at >= NOW() - INTERVAL '1 hour'
        AND (old_values ? 'error' OR new_values ? 'error')
    )
    SELECT 
        'application'::VARCHAR,
        'recent_errors'::VARCHAR,
        CASE 
            WHEN recent_errors > 100 THEN 'CRITICAL'
            WHEN recent_errors > 50 THEN 'WARNING'
            WHEN recent_errors > 10 THEN 'INFO'
            ELSE 'HEALTHY'
        END::VARCHAR,
        recent_errors::TEXT || ' errors',
        '< 10 errors/hour'::TEXT,
        CASE 
            WHEN recent_errors > 100 THEN 'critical'
            WHEN recent_errors > 50 THEN 'high'
            WHEN recent_errors > 10 THEN 'medium'
            ELSE 'low'
        END::VARCHAR,
        jsonb_build_object('recent_errors', recent_errors)
    FROM error_stats;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 4. PERFORMANCE METRICS COLLECTION
-- =============================================================================

-- Function to collect comprehensive system metrics
CREATE OR REPLACE FUNCTION collect_system_metrics()
RETURNS UUID AS $$
DECLARE
    metrics_id UUID;
    active_conns INTEGER;
    max_conns INTEGER;
    cache_hit DECIMAL;
    index_usage DECIMAL;
    db_size_bytes BIGINT;
    slow_query_count INTEGER;
    health_score DECIMAL;
    health_status VARCHAR;
BEGIN
    -- Collect basic metrics
    SELECT COUNT(*) INTO active_conns 
    FROM pg_stat_activity WHERE state = 'active';
    
    SELECT setting::INTEGER INTO max_conns 
    FROM pg_settings WHERE name = 'max_connections';
    
    SELECT ROUND((SUM(heap_blks_hit) / NULLIF(SUM(heap_blks_hit) + SUM(heap_blks_read), 0))::NUMERIC, 4) 
    INTO cache_hit
    FROM pg_statio_user_tables;
    
    SELECT ROUND((SUM(idx_scan) / NULLIF(SUM(seq_scan) + SUM(idx_scan), 0))::NUMERIC, 4)
    INTO index_usage
    FROM pg_stat_user_tables;
    
    SELECT pg_database_size(current_database()) INTO db_size_bytes;
    
    SELECT COUNT(*) INTO slow_query_count
    FROM pg_stat_activity
    WHERE state = 'active' 
    AND query_start < NOW() - INTERVAL '30 seconds'
    AND query NOT LIKE '%pg_stat_activity%';
    
    -- Calculate overall health score
    health_score := (
        CASE WHEN active_conns::DECIMAL / max_conns < 0.8 THEN 0.25 ELSE 0.0 END +
        CASE WHEN COALESCE(cache_hit, 0) > 0.95 THEN 0.25 ELSE 0.0 END +
        CASE WHEN COALESCE(index_usage, 0) > 0.9 THEN 0.25 ELSE 0.0 END +
        CASE WHEN slow_query_count < 5 THEN 0.25 ELSE 0.0 END
    );
    
    -- Determine health status
    health_status := CASE 
        WHEN health_score >= 0.8 THEN 'healthy'
        WHEN health_score >= 0.6 THEN 'warning'
        ELSE 'critical'
    END;
    
    -- Insert metrics record
    INSERT INTO system_health_metrics (
        active_connections,
        max_connections,
        connection_utilization_percent,
        cache_hit_ratio,
        index_usage_ratio,
        database_size_mb,
        slow_queries_count,
        overall_health_score,
        health_status
    ) VALUES (
        active_conns,
        max_conns,
        ROUND((active_conns::DECIMAL / max_conns * 100)::NUMERIC, 2),
        COALESCE(cache_hit, 0),
        COALESCE(index_usage, 0),
        ROUND((db_size_bytes / (1024^2))::NUMERIC, 0),
        slow_query_count,
        health_score,
        health_status
    ) RETURNING id INTO metrics_id;
    
    RETURN metrics_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 5. ALERT PROCESSING ENGINE
-- =============================================================================

-- Function to check alert rules and trigger alerts
CREATE OR REPLACE FUNCTION process_alert_rules()
RETURNS TABLE (
    rule_name VARCHAR,
    status VARCHAR,
    triggered BOOLEAN,
    message TEXT
) AS $$
DECLARE
    rule_record RECORD;
    current_value DECIMAL;
    should_trigger BOOLEAN;
    incident_key VARCHAR;
    existing_incident_id UUID;
BEGIN
    FOR rule_record IN 
        SELECT * FROM alert_rules 
        WHERE is_active = TRUE 
        AND (last_checked IS NULL OR last_checked < NOW() - check_frequency)
    LOOP
        should_trigger := FALSE;
        current_value := NULL;
        
        -- Get current metric value based on rule configuration
        CASE rule_record.metric_name
            WHEN 'connection_utilization' THEN
                SELECT (COUNT(*)::DECIMAL / (SELECT setting::INTEGER FROM pg_settings WHERE name = 'max_connections')) * 100
                INTO current_value
                FROM pg_stat_activity WHERE state = 'active';
                
            WHEN 'cache_hit_ratio' THEN
                SELECT (SUM(heap_blks_hit) / NULLIF(SUM(heap_blks_hit) + SUM(heap_blks_read), 0)) * 100
                INTO current_value
                FROM pg_statio_user_tables;
                
            WHEN 'slow_queries' THEN
                SELECT COUNT(*)::DECIMAL
                INTO current_value
                FROM pg_stat_activity
                WHERE state = 'active' 
                AND query_start < NOW() - INTERVAL '30 seconds';
                
            WHEN 'database_size_gb' THEN
                SELECT (pg_database_size(current_database()) / (1024^3))::DECIMAL
                INTO current_value;
        END CASE;
        
        -- Evaluate threshold condition
        IF rule_record.condition_type = 'threshold' AND current_value IS NOT NULL THEN
            should_trigger := CASE rule_record.threshold_operator
                WHEN '>' THEN current_value > rule_record.threshold_value
                WHEN '<' THEN current_value < rule_record.threshold_value
                WHEN '>=' THEN current_value >= rule_record.threshold_value
                WHEN '<=' THEN current_value <= rule_record.threshold_value
                WHEN '=' THEN current_value = rule_record.threshold_value
                WHEN '!=' THEN current_value != rule_record.threshold_value
                ELSE FALSE
            END;
        END IF;
        
        -- Update rule check timestamp
        UPDATE alert_rules 
        SET last_checked = NOW()
        WHERE id = rule_record.id;
        
        -- Create or update incident if triggered
        IF should_trigger THEN
            incident_key := rule_record.rule_name || '_' || DATE_TRUNC('hour', NOW())::TEXT;
            
            -- Check if incident already exists
            SELECT id INTO existing_incident_id
            FROM alert_incidents 
            WHERE alert_rule_id = rule_record.id 
            AND incident_key = incident_key
            AND status IN ('open', 'acknowledged');
            
            IF existing_incident_id IS NULL THEN
                -- Create new incident
                INSERT INTO alert_incidents (
                    alert_rule_id,
                    incident_key,
                    title,
                    description,
                    triggered_value,
                    threshold_value,
                    severity
                ) VALUES (
                    rule_record.id,
                    incident_key,
                    rule_record.rule_name || ' Alert',
                    'Metric ' || rule_record.metric_name || ' value ' || current_value::TEXT || 
                    ' ' || rule_record.threshold_operator || ' ' || rule_record.threshold_value::TEXT,
                    current_value,
                    rule_record.threshold_value,
                    rule_record.severity
                );
                
                -- Update rule trigger info
                UPDATE alert_rules 
                SET last_triggered = NOW(), trigger_count = trigger_count + 1
                WHERE id = rule_record.id;
            ELSE
                -- Update existing incident
                UPDATE alert_incidents 
                SET 
                    last_triggered_at = NOW(),
                    triggered_value = current_value
                WHERE id = existing_incident_id;
            END IF;
        END IF;
        
        RETURN QUERY SELECT 
            rule_record.rule_name::VARCHAR,
            CASE WHEN current_value IS NOT NULL THEN 'checked' ELSE 'skipped' END::VARCHAR,
            should_trigger,
            CASE 
                WHEN should_trigger THEN 'Alert triggered: ' || current_value::TEXT
                WHEN current_value IS NOT NULL THEN 'Normal: ' || current_value::TEXT
                ELSE 'Unable to collect metric'
            END::TEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 6. AUTOMATED MONITORING PROCEDURES
-- =============================================================================

-- Function to perform automated system maintenance
CREATE OR REPLACE FUNCTION perform_automated_maintenance()
RETURNS TABLE (
    maintenance_task VARCHAR,
    status VARCHAR,
    details JSONB,
    execution_time_ms INTEGER
) AS $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    execution_duration INTEGER;
BEGIN
    -- Update table statistics
    start_time := clock_timestamp();
    ANALYZE;
    end_time := clock_timestamp();
    execution_duration := EXTRACT(MILLISECONDS FROM (end_time - start_time));
    
    RETURN QUERY SELECT 
        'analyze_tables'::VARCHAR,
        'completed'::VARCHAR,
        jsonb_build_object('execution_time_ms', execution_duration),
        execution_duration;
    
    -- Vacuum bloated tables
    start_time := clock_timestamp();
    VACUUM (ANALYZE, VERBOSE);
    end_time := clock_timestamp();
    execution_duration := EXTRACT(MILLISECONDS FROM (end_time - start_time));
    
    RETURN QUERY SELECT 
        'vacuum_tables'::VARCHAR,
        'completed'::VARCHAR,
        jsonb_build_object('execution_time_ms', execution_duration),
        execution_duration;
    
    -- Refresh materialized views
    start_time := clock_timestamp();
    PERFORM refresh_analytics_views();
    end_time := clock_timestamp();
    execution_duration := EXTRACT(MILLISECONDS FROM (end_time - start_time));
    
    RETURN QUERY SELECT 
        'refresh_views'::VARCHAR,
        'completed'::VARCHAR,
        jsonb_build_object('execution_time_ms', execution_duration),
        execution_duration;
    
    -- Clean up old data
    start_time := clock_timestamp();
    PERFORM cleanup_orphaned_data();
    end_time := clock_timestamp();
    execution_duration := EXTRACT(MILLISECONDS FROM (end_time - start_time));
    
    RETURN QUERY SELECT 
        'cleanup_old_data'::VARCHAR,
        'completed'::VARCHAR,
        jsonb_build_object('execution_time_ms', execution_duration),
        execution_duration;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 7. INDEXES AND CONSTRAINTS
-- =============================================================================

-- Indexes for system health metrics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_system_health_metrics_timestamp
    ON system_health_metrics(measurement_timestamp DESC);
    
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_system_health_metrics_status
    ON system_health_metrics(health_status, overall_health_score DESC);

-- Indexes for alert rules
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alert_rules_active
    ON alert_rules(is_active, last_checked) 
    WHERE is_active = TRUE;
    
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alert_rules_category_severity
    ON alert_rules(category, severity, priority DESC);

-- Indexes for alert incidents
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alert_incidents_status_time
    ON alert_incidents(status, first_triggered_at DESC);
    
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alert_incidents_severity
    ON alert_incidents(severity, status, first_triggered_at DESC);

COMMIT;

-- =============================================================================
-- 8. DEFAULT ALERT RULES SETUP
-- =============================================================================

-- Insert default alert rules for critical system metrics
INSERT INTO alert_rules (rule_name, description, category, metric_name, condition_type, threshold_value, threshold_operator, severity, priority) VALUES
('High Connection Utilization', 'Alert when connection utilization exceeds 80%', 'database', 'connection_utilization', 'threshold', 80.0, '>', 'high', 8),
('Low Cache Hit Ratio', 'Alert when cache hit ratio falls below 95%', 'performance', 'cache_hit_ratio', 'threshold', 95.0, '<', 'medium', 6),
('Too Many Slow Queries', 'Alert when more than 10 slow queries are detected', 'performance', 'slow_queries', 'threshold', 10.0, '>', 'medium', 7),
('Database Size Warning', 'Alert when database size exceeds 100GB', 'storage', 'database_size_gb', 'threshold', 100.0, '>', 'medium', 5),
('Database Size Critical', 'Critical alert when database size exceeds 500GB', 'storage', 'database_size_gb', 'threshold', 500.0, '>', 'critical', 9);

-- Generate initial health check report
SELECT 'Database Monitoring System Initialized' as status,
       NOW() as initialization_time,
       (SELECT COUNT(*) FROM alert_rules WHERE is_active = TRUE) as active_alert_rules;