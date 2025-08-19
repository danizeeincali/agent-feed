-- Rollback Migration 008: Remove processing status tracking and link preview functionality
-- This script safely removes all tables, functions, and indexes created in migration 008
-- while preserving all existing data in core tables

BEGIN;

-- Step 1: Drop dependent triggers first
DROP TRIGGER IF EXISTS update_agent_responses_updated_at ON agent_responses;
DROP TRIGGER IF EXISTS update_chief_of_staff_checks_updated_at ON chief_of_staff_checks;
DROP TRIGGER IF EXISTS update_post_links_updated_at ON post_links;
DROP TRIGGER IF EXISTS update_link_previews_updated_at ON link_previews;
DROP TRIGGER IF EXISTS update_post_processing_status_updated_at ON post_processing_status;

-- Step 2: Drop functions that depend on the tables
DROP FUNCTION IF EXISTS get_post_processing_pipeline(UUID);
DROP FUNCTION IF EXISTS execute_chief_of_staff_check(UUID, VARCHAR, JSONB, VARCHAR);
DROP FUNCTION IF EXISTS update_post_processing_stage(UUID, VARCHAR, VARCHAR, VARCHAR, JSONB, TEXT);
DROP FUNCTION IF EXISTS extract_post_links(UUID, TEXT);

-- Step 3: Drop tables in reverse dependency order

-- Drop agent_responses (depends on posts, agents)
DROP TABLE IF EXISTS agent_responses CASCADE;

-- Drop chief_of_staff_checks (depends on posts, users)
DROP TABLE IF EXISTS chief_of_staff_checks CASCADE;

-- Drop post_links (depends on posts, link_previews)
DROP TABLE IF EXISTS post_links CASCADE;

-- Drop link_previews (independent)
DROP TABLE IF EXISTS link_previews CASCADE;

-- Drop post_processing_status (depends on posts)
DROP TABLE IF EXISTS post_processing_status CASCADE;

-- Step 4: Remove any sequences that were created
DROP SEQUENCE IF EXISTS post_processing_status_id_seq CASCADE;
DROP SEQUENCE IF EXISTS link_previews_id_seq CASCADE;
DROP SEQUENCE IF EXISTS post_links_id_seq CASCADE;
DROP SEQUENCE IF EXISTS chief_of_staff_checks_id_seq CASCADE;
DROP SEQUENCE IF EXISTS agent_responses_id_seq CASCADE;

-- Step 5: Clean up any migration tracking records
DELETE FROM claude_flow_sessions 
WHERE swarm_id = 'migration-008-processing';

-- Step 6: Verify rollback completion
DO $$
DECLARE
    tables_remaining INTEGER := 0;
    functions_remaining INTEGER := 0;
BEGIN
    -- Check if any migration 008 tables still exist
    SELECT COUNT(*) INTO tables_remaining
    FROM information_schema.tables
    WHERE table_name IN (
        'post_processing_status', 'link_previews', 'post_links',
        'chief_of_staff_checks', 'agent_responses'
    ) AND table_schema = 'public';
    
    -- Check if any migration 008 functions still exist
    SELECT COUNT(*) INTO functions_remaining
    FROM information_schema.routines
    WHERE routine_name IN (
        'get_post_processing_pipeline', 'execute_chief_of_staff_check',
        'update_post_processing_stage', 'extract_post_links'
    ) AND routine_schema = 'public';
    
    IF tables_remaining > 0 OR functions_remaining > 0 THEN
        RAISE WARNING 'Rollback incomplete: % tables, % functions remaining', 
                     tables_remaining, functions_remaining;
    ELSE
        RAISE NOTICE 'Migration 008 rollback completed successfully';
    END IF;
    
    -- Log rollback completion
    INSERT INTO claude_flow_sessions (
        user_id,
        swarm_id,
        status,
        configuration,
        metrics
    ) VALUES (
        (SELECT id FROM users LIMIT 1),
        'rollback-008-processing',
        'completed',
        jsonb_build_object(
            'rollback_type', 'processing_and_previews',
            'rollback_date', now(),
            'tables_removed', 5,
            'functions_removed', 4,
            'success', true
        ),
        jsonb_build_object(
            'tables_remaining', tables_remaining,
            'functions_remaining', functions_remaining
        )
    );
END;
$$;

COMMIT;

-- Final verification
SELECT 
    'ROLLBACK_008_COMPLETE' as status,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name IN (
        'post_processing_status', 'link_previews', 'post_links',
        'chief_of_staff_checks', 'agent_responses'
    )) as migration_tables_remaining,
    (SELECT COUNT(*) FROM information_schema.routines WHERE routine_name LIKE '%processing%' 
     OR routine_name LIKE '%link%' OR routine_name LIKE '%chief%') as migration_functions_remaining;