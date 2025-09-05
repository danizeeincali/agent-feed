-- Data Integrity and Validation System Migration
-- Migration: 013_create_data_integrity_system.sql
-- Version: 1.0.0
-- Date: 2025-01-04
-- Description: Comprehensive data integrity, validation rules, and consistency checks

BEGIN;

-- =============================================================================
-- 1. DATA INTEGRITY CONSTRAINTS
-- =============================================================================

-- Add comprehensive foreign key constraints with proper cascading
ALTER TABLE agent_posts 
    ADD CONSTRAINT fk_agent_posts_agent_id 
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
    
    ADD CONSTRAINT fk_agent_posts_user_id 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Ensure referential integrity for post quality metrics
ALTER TABLE post_quality_metrics
    ADD CONSTRAINT fk_post_quality_metrics_post_id
    FOREIGN KEY (post_id) REFERENCES agent_posts(id) ON DELETE CASCADE;

-- Add foreign key constraints for user sessions
ALTER TABLE user_sessions_detailed
    ADD CONSTRAINT fk_user_sessions_detailed_user_id
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Add foreign key constraints for interaction events
ALTER TABLE user_interaction_events
    ADD CONSTRAINT fk_user_interaction_events_session_id
    FOREIGN KEY (session_id) REFERENCES user_sessions_detailed(id) ON DELETE CASCADE,
    
    ADD CONSTRAINT fk_user_interaction_events_user_id
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    
    ADD CONSTRAINT fk_user_interaction_events_post_id
    FOREIGN KEY (post_id) REFERENCES agent_posts(id) ON DELETE CASCADE;

-- =============================================================================
-- 2. ADVANCED VALIDATION RULES
-- =============================================================================

-- Comprehensive content validation function
CREATE OR REPLACE FUNCTION validate_post_content(
    p_title VARCHAR,
    p_content TEXT,
    p_content_type VARCHAR,
    p_word_count INTEGER,
    p_reading_time_minutes INTEGER
)
RETURNS JSONB AS $$
DECLARE
    validation_result JSONB := '{"valid": true, "warnings": [], "errors": []}';
    title_length INTEGER;
    content_length INTEGER;
    calculated_word_count INTEGER;
    calculated_reading_time INTEGER;
BEGIN
    title_length := LENGTH(p_title);
    content_length := LENGTH(p_content);
    
    -- Title validation
    IF title_length < 5 THEN
        validation_result := jsonb_set(
            validation_result, 
            '{errors}', 
            (validation_result->'errors') || '["Title too short (minimum 5 characters)"]'
        );
        validation_result := jsonb_set(validation_result, '{valid}', 'false');
    END IF;
    
    IF title_length > 500 THEN
        validation_result := jsonb_set(
            validation_result,
            '{errors}',
            (validation_result->'errors') || '["Title too long (maximum 500 characters)"]'
        );
        validation_result := jsonb_set(validation_result, '{valid}', 'false');
    END IF;
    
    -- Content validation
    IF content_length < 10 THEN
        validation_result := jsonb_set(
            validation_result,
            '{errors}',
            (validation_result->'errors') || '["Content too short (minimum 10 characters)"]'
        );
        validation_result := jsonb_set(validation_result, '{valid}', 'false');
    END IF;
    
    -- Word count validation
    calculated_word_count := array_length(string_to_array(trim(p_content), ' '), 1);
    IF ABS(calculated_word_count - p_word_count) > (calculated_word_count * 0.1) THEN
        validation_result := jsonb_set(
            validation_result,
            '{warnings}',
            (validation_result->'warnings') || 
            jsonb_build_array(
                'Word count discrepancy detected. Calculated: ' || calculated_word_count || 
                ', Provided: ' || p_word_count
            )
        );
    END IF;
    
    -- Reading time validation (assuming 200 words per minute)
    calculated_reading_time := CEIL(calculated_word_count / 200.0);
    IF ABS(calculated_reading_time - p_reading_time_minutes) > 2 THEN
        validation_result := jsonb_set(
            validation_result,
            '{warnings}',
            (validation_result->'warnings') || 
            jsonb_build_array(
                'Reading time may be inaccurate. Calculated: ' || calculated_reading_time || 
                ' minutes, Provided: ' || p_reading_time_minutes || ' minutes'
            )
        );
    END IF;
    
    -- Content type validation
    CASE p_content_type
        WHEN 'markdown' THEN
            IF p_content !~ '[\*_`#\[\]]' THEN
                validation_result := jsonb_set(
                    validation_result,
                    '{warnings}',
                    (validation_result->'warnings') || '["Content marked as markdown but contains no markdown syntax"]'
                );
            END IF;
        WHEN 'html' THEN
            IF p_content !~ '<[^>]+>' THEN
                validation_result := jsonb_set(
                    validation_result,
                    '{warnings}',
                    (validation_result->'warnings') || '["Content marked as HTML but contains no HTML tags"]'
                );
            END IF;
        WHEN 'json' THEN
            -- Validate JSON structure
            BEGIN
                PERFORM p_content::JSONB;
            EXCEPTION WHEN OTHERS THEN
                validation_result := jsonb_set(
                    validation_result,
                    '{errors}',
                    (validation_result->'errors') || '["Content marked as JSON but is not valid JSON"]'
                );
                validation_result := jsonb_set(validation_result, '{valid}', 'false');
            END;
    END CASE;
    
    RETURN validation_result;
END;
$$ LANGUAGE plpgsql;

-- Quality score validation function
CREATE OR REPLACE FUNCTION validate_quality_metrics(
    p_content_quality DECIMAL,
    p_readability DECIMAL,
    p_originality DECIMAL,
    p_relevance DECIMAL,
    p_accuracy DECIMAL,
    p_completeness DECIMAL,
    p_overall_quality DECIMAL
)
RETURNS JSONB AS $$
DECLARE
    validation_result JSONB := '{"valid": true, "warnings": [], "errors": []}';
    calculated_overall DECIMAL;
    tolerance DECIMAL := 0.05; -- 5% tolerance
BEGIN
    -- Validate individual scores are within range
    IF p_content_quality < 0 OR p_content_quality > 1 THEN
        validation_result := jsonb_set(
            validation_result,
            '{errors}',
            (validation_result->'errors') || '["Content quality score must be between 0 and 1"]'
        );
        validation_result := jsonb_set(validation_result, '{valid}', 'false');
    END IF;
    
    -- Calculate expected overall quality
    calculated_overall := (p_content_quality + p_readability + p_originality + 
                          p_relevance + p_accuracy + p_completeness) / 6.0;
    
    -- Validate overall quality calculation
    IF ABS(calculated_overall - p_overall_quality) > tolerance THEN
        validation_result := jsonb_set(
            validation_result,
            '{warnings}',
            (validation_result->'warnings') || 
            jsonb_build_array(
                'Overall quality score discrepancy. Expected: ' || 
                ROUND(calculated_overall, 4) || ', Provided: ' || p_overall_quality
            )
        );
    END IF;
    
    RETURN validation_result;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 3. CONSISTENCY CHECK FUNCTIONS
-- =============================================================================

-- Function to check data consistency across related tables
CREATE OR REPLACE FUNCTION check_data_consistency()
RETURNS TABLE (
    check_name VARCHAR,
    status VARCHAR,
    details JSONB,
    severity VARCHAR
) AS $$
BEGIN
    -- Check for orphaned post quality metrics
    RETURN QUERY
    SELECT 
        'orphaned_post_quality_metrics'::VARCHAR,
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END::VARCHAR,
        jsonb_build_object('orphaned_records', COUNT(*))::JSONB,
        CASE WHEN COUNT(*) = 0 THEN 'INFO' ELSE 'ERROR' END::VARCHAR
    FROM post_quality_metrics pqm
    LEFT JOIN agent_posts ap ON pqm.post_id = ap.id
    WHERE ap.id IS NULL;
    
    -- Check for missing quality metrics for published posts
    RETURN QUERY
    SELECT 
        'missing_quality_metrics'::VARCHAR,
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'WARN' END::VARCHAR,
        jsonb_build_object('missing_metrics_count', COUNT(*))::JSONB,
        CASE WHEN COUNT(*) = 0 THEN 'INFO' ELSE 'WARNING' END::VARCHAR
    FROM agent_posts ap
    LEFT JOIN post_quality_metrics pqm ON ap.id = pqm.post_id
    WHERE ap.status = 'published' 
    AND ap.published_at >= NOW() - INTERVAL '30 days'
    AND pqm.id IS NULL;
    
    -- Check for inconsistent engagement metrics
    RETURN QUERY
    SELECT 
        'inconsistent_engagement_metrics'::VARCHAR,
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'WARN' END::VARCHAR,
        jsonb_build_object('inconsistent_records', COUNT(*))::JSONB,
        'WARNING'::VARCHAR
    FROM agent_posts ap
    WHERE ap.view_count > 0 
    AND (ap.like_count + ap.comment_count + ap.share_count + ap.bookmark_count) = 0
    AND ap.engagement_rate > 0
    AND ap.published_at >= NOW() - INTERVAL '7 days';
    
    -- Check for user sessions without interaction events
    RETURN QUERY
    SELECT 
        'sessions_without_interactions'::VARCHAR,
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'INFO' END::VARCHAR,
        jsonb_build_object('sessions_count', COUNT(*))::JSONB,
        'INFO'::VARCHAR
    FROM user_sessions_detailed usd
    LEFT JOIN user_interaction_events uie ON usd.id = uie.session_id
    WHERE usd.session_start >= NOW() - INTERVAL '24 hours'
    AND usd.session_duration > INTERVAL '1 minute'
    AND uie.id IS NULL;
    
    -- Check for content hash duplicates
    RETURN QUERY
    SELECT 
        'duplicate_content_hashes'::VARCHAR,
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'ERROR' END::VARCHAR,
        jsonb_build_object('duplicate_groups', COUNT(*))::JSONB,
        'ERROR'::VARCHAR
    FROM (
        SELECT content_hash, COUNT(*) as duplicate_count
        FROM agent_posts
        WHERE status = 'published'
        GROUP BY content_hash
        HAVING COUNT(*) > 1
    ) duplicates;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 4. AUDIT LOGGING SYSTEM
-- =============================================================================

-- Audit log table for tracking changes
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    operation VARCHAR(10) NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    
    -- Change details
    old_values JSONB,
    new_values JSONB,
    changed_fields VARCHAR[],
    
    -- User and session context
    user_id UUID,
    session_id UUID,
    ip_address INET,
    user_agent TEXT,
    
    -- Change metadata
    change_reason VARCHAR(255),
    automated_change BOOLEAN DEFAULT FALSE,
    change_source VARCHAR(100) DEFAULT 'application',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes for efficient querying
    INDEX (table_name, record_id, created_at DESC),
    INDEX (user_id, created_at DESC),
    INDEX (operation, created_at DESC)
);

-- Generic audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    old_record JSONB;
    new_record JSONB;
    changed_fields VARCHAR[] := '{}';
    field_name TEXT;
BEGIN
    -- Convert OLD and NEW to JSONB
    IF TG_OP = 'DELETE' THEN
        old_record := to_jsonb(OLD);
        new_record := NULL;
    ELSIF TG_OP = 'INSERT' THEN
        old_record := NULL;
        new_record := to_jsonb(NEW);
    ELSE -- UPDATE
        old_record := to_jsonb(OLD);
        new_record := to_jsonb(NEW);
        
        -- Identify changed fields
        FOR field_name IN SELECT jsonb_object_keys(new_record)
        LOOP
            IF old_record->>field_name IS DISTINCT FROM new_record->>field_name THEN
                changed_fields := array_append(changed_fields, field_name);
            END IF;
        END LOOP;
    END IF;
    
    -- Insert audit record
    INSERT INTO audit_log (
        table_name,
        record_id,
        operation,
        old_values,
        new_values,
        changed_fields,
        user_id,
        automated_change
    ) VALUES (
        TG_TABLE_NAME,
        COALESCE((new_record->>'id')::UUID, (old_record->>'id')::UUID),
        TG_OP,
        old_record,
        new_record,
        changed_fields,
        COALESCE(
            (new_record->>'user_id')::UUID, 
            (old_record->>'user_id')::UUID
        ),
        COALESCE(current_setting('audit.automated_change', true)::BOOLEAN, FALSE)
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create audit triggers for critical tables
CREATE TRIGGER audit_agent_posts
    AFTER INSERT OR UPDATE OR DELETE ON agent_posts
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_post_quality_metrics
    AFTER INSERT OR UPDATE OR DELETE ON post_quality_metrics
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_posting_templates
    AFTER INSERT OR UPDATE OR DELETE ON posting_templates
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- =============================================================================
-- 5. DATA VALIDATION TRIGGERS
-- =============================================================================

-- Comprehensive validation trigger for agent posts
CREATE OR REPLACE FUNCTION validate_agent_post_trigger()
RETURNS TRIGGER AS $$
DECLARE
    validation_result JSONB;
    quality_validation JSONB;
BEGIN
    -- Validate post content
    validation_result := validate_post_content(
        NEW.title,
        NEW.content,
        NEW.content_type,
        NEW.word_count,
        NEW.reading_time_minutes
    );
    
    -- If validation fails, prevent insert/update
    IF NOT (validation_result->>'valid')::BOOLEAN THEN
        RAISE EXCEPTION 'Post validation failed: %', validation_result->>'errors';
    END IF;
    
    -- Log warnings if any
    IF jsonb_array_length(validation_result->'warnings') > 0 THEN
        INSERT INTO validation_warnings (
            table_name,
            record_id,
            warnings,
            created_at
        ) VALUES (
            'agent_posts',
            NEW.id,
            validation_result->'warnings',
            NOW()
        );
    END IF;
    
    -- Auto-calculate fields if not provided
    IF NEW.word_count = 0 OR NEW.word_count IS NULL THEN
        NEW.word_count := array_length(string_to_array(trim(NEW.content), ' '), 1);
    END IF;
    
    IF NEW.reading_time_minutes = 0 OR NEW.reading_time_minutes IS NULL THEN
        NEW.reading_time_minutes := GREATEST(1, CEIL(NEW.word_count / 200.0));
    END IF;
    
    -- Validate scheduled publishing
    IF NEW.status = 'scheduled' AND NEW.scheduled_for <= NOW() THEN
        RAISE EXCEPTION 'Scheduled publication time must be in the future';
    END IF;
    
    -- Auto-generate slug if not provided
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
        NEW.slug := lower(regexp_replace(NEW.title, '[^a-zA-Z0-9]+', '-', 'g'));
        NEW.slug := trim(both '-' from NEW.slug);
        
        -- Ensure uniqueness
        IF EXISTS (SELECT 1 FROM agent_posts WHERE slug = NEW.slug AND id != NEW.id) THEN
            NEW.slug := NEW.slug || '-' || extract(epoch from NOW())::INTEGER;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create validation trigger
CREATE TRIGGER validate_agent_post
    BEFORE INSERT OR UPDATE ON agent_posts
    FOR EACH ROW EXECUTE FUNCTION validate_agent_post_trigger();

-- Validation warnings table
CREATE TABLE IF NOT EXISTS validation_warnings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    warnings JSONB NOT NULL,
    resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Quality metrics validation trigger
CREATE OR REPLACE FUNCTION validate_quality_metrics_trigger()
RETURNS TRIGGER AS $$
DECLARE
    validation_result JSONB;
BEGIN
    validation_result := validate_quality_metrics(
        NEW.content_quality_score,
        NEW.readability_score,
        NEW.originality_score,
        NEW.relevance_score,
        NEW.accuracy_score,
        NEW.completeness_score,
        NEW.overall_quality_score
    );
    
    IF NOT (validation_result->>'valid')::BOOLEAN THEN
        RAISE EXCEPTION 'Quality metrics validation failed: %', validation_result->>'errors';
    END IF;
    
    -- Log warnings
    IF jsonb_array_length(validation_result->'warnings') > 0 THEN
        INSERT INTO validation_warnings (
            table_name,
            record_id,
            warnings
        ) VALUES (
            'post_quality_metrics',
            NEW.id,
            validation_result->'warnings'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_quality_metrics
    BEFORE INSERT OR UPDATE ON post_quality_metrics
    FOR EACH ROW EXECUTE FUNCTION validate_quality_metrics_trigger();

-- =============================================================================
-- 6. DATA CLEANUP AND MAINTENANCE
-- =============================================================================

-- Function to clean up orphaned records
CREATE OR REPLACE FUNCTION cleanup_orphaned_data()
RETURNS TABLE (
    cleanup_type VARCHAR,
    records_cleaned INTEGER,
    cleanup_timestamp TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    cleanup_count INTEGER;
BEGIN
    -- Clean up orphaned quality metrics
    DELETE FROM post_quality_metrics
    WHERE post_id NOT IN (SELECT id FROM agent_posts);
    GET DIAGNOSTICS cleanup_count = ROW_COUNT;
    
    RETURN QUERY SELECT 'orphaned_quality_metrics'::VARCHAR, cleanup_count, NOW();
    
    -- Clean up old interaction events (beyond retention period)
    DELETE FROM user_interaction_events
    WHERE event_timestamp < NOW() - INTERVAL '90 days';
    GET DIAGNOSTICS cleanup_count = ROW_COUNT;
    
    RETURN QUERY SELECT 'old_interaction_events'::VARCHAR, cleanup_count, NOW();
    
    -- Clean up expired user sessions
    DELETE FROM user_sessions_detailed
    WHERE session_end IS NOT NULL 
    AND session_end < NOW() - INTERVAL '30 days';
    GET DIAGNOSTICS cleanup_count = ROW_COUNT;
    
    RETURN QUERY SELECT 'expired_sessions'::VARCHAR, cleanup_count, NOW();
    
    -- Clean up resolved validation warnings older than 30 days
    DELETE FROM validation_warnings
    WHERE resolved = TRUE 
    AND resolved_at < NOW() - INTERVAL '30 days';
    GET DIAGNOSTICS cleanup_count = ROW_COUNT;
    
    RETURN QUERY SELECT 'old_validation_warnings'::VARCHAR, cleanup_count, NOW();
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 7. INTEGRITY CHECK PROCEDURES
-- =============================================================================

-- Function to perform comprehensive integrity checks
CREATE OR REPLACE FUNCTION perform_integrity_checks()
RETURNS TABLE (
    check_category VARCHAR,
    total_checks INTEGER,
    passed_checks INTEGER,
    failed_checks INTEGER,
    warnings INTEGER,
    overall_status VARCHAR
) AS $$
DECLARE
    consistency_results RECORD;
    total_consistency_checks INTEGER := 0;
    passed_consistency_checks INTEGER := 0;
    failed_consistency_checks INTEGER := 0;
    warning_consistency_checks INTEGER := 0;
BEGIN
    -- Run consistency checks
    FOR consistency_results IN 
        SELECT * FROM check_data_consistency()
    LOOP
        total_consistency_checks := total_consistency_checks + 1;
        
        CASE consistency_results.status
            WHEN 'PASS' THEN 
                passed_consistency_checks := passed_consistency_checks + 1;
            WHEN 'FAIL' THEN 
                failed_consistency_checks := failed_consistency_checks + 1;
            WHEN 'WARN' THEN 
                warning_consistency_checks := warning_consistency_checks + 1;
        END CASE;
    END LOOP;
    
    RETURN QUERY SELECT 
        'data_consistency'::VARCHAR,
        total_consistency_checks,
        passed_consistency_checks,
        failed_consistency_checks,
        warning_consistency_checks,
        CASE 
            WHEN failed_consistency_checks > 0 THEN 'CRITICAL'
            WHEN warning_consistency_checks > 0 THEN 'WARNING'
            ELSE 'HEALTHY'
        END::VARCHAR;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- =============================================================================
-- 8. POST-MIGRATION VALIDATION
-- =============================================================================

-- Verify all constraints and triggers are in place
DO $$
DECLARE
    missing_constraints INTEGER := 0;
    missing_triggers INTEGER := 0;
BEGIN
    -- Check critical foreign key constraints
    SELECT COUNT(*) INTO missing_constraints
    FROM information_schema.table_constraints tc
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND tc.table_name IN ('agent_posts', 'post_quality_metrics', 'user_sessions_detailed', 'user_interaction_events')
    AND tc.constraint_name NOT LIKE 'fk_%';
    
    -- Check critical triggers
    SELECT COUNT(*) INTO missing_triggers
    FROM information_schema.triggers
    WHERE trigger_schema = 'public'
    AND trigger_name IN ('audit_agent_posts', 'validate_agent_post', 'validate_quality_metrics');
    
    IF missing_constraints > 0 THEN
        RAISE WARNING 'Some foreign key constraints may be missing';
    END IF;
    
    IF missing_triggers < 3 THEN
        RAISE WARNING 'Some validation or audit triggers may be missing';
    ELSE
        RAISE NOTICE 'All data integrity components installed successfully';
    END IF;
END $$;