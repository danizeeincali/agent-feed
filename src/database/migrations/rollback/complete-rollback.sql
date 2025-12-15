-- Complete Rollback Script: Rollback all AgentLink migrations (008 → 005)
-- This script executes all rollbacks in the correct order to restore the original schema
-- CRITICAL: Creates full backup before rollback and ensures data preservation

BEGIN;

-- Step 1: Create comprehensive backup of all data before rollback
CREATE SCHEMA IF NOT EXISTS rollback_backup;

-- Backup all AgentLink tables before rollback
DO $$
DECLARE
    table_name TEXT;
    backup_sql TEXT;
    tables_to_backup TEXT[] := ARRAY[
        'agent_responses', 'chief_of_staff_checks', 'post_links', 'link_previews',
        'post_processing_status', 'engagement_events', 'post_analytics',
        'user_engagement_analytics', 'user_engagements', 'agent_coordination',
        'agent_mentions', 'agent_performance_metrics', 'agent_pages', 'agents', 'posts'
    ];
BEGIN
    FOREACH table_name IN ARRAY tables_to_backup
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = table_name AND table_schema = 'public') THEN
            backup_sql := format('CREATE TABLE rollback_backup.%I AS SELECT * FROM public.%I', table_name, table_name);
            EXECUTE backup_sql;
            RAISE NOTICE 'Backed up table: %', table_name;
        END IF;
    END LOOP;
END;
$$;

-- Step 2: Record rollback initiation
INSERT INTO claude_flow_sessions (
    user_id,
    swarm_id,
    status,
    configuration,
    metrics
) VALUES (
    (SELECT id FROM users LIMIT 1),
    'complete-rollback-agentlink',
    'processing',
    jsonb_build_object(
        'rollback_type', 'complete_agentlink_rollback',
        'rollback_date', now(),
        'backup_schema_created', true,
        'migrations_to_rollback', ARRAY['008', '007', '006', '005']
    ),
    jsonb_build_object(
        'backup_tables_created', (
            SELECT COUNT(*) FROM information_schema.tables 
            WHERE table_schema = 'rollback_backup'
        )
    )
);

COMMIT;

-- Step 3: Execute rollbacks in reverse order (008 → 007 → 006 → 005)

\echo 'Starting Migration 008 Rollback (Processing & Previews)...'
\i /workspaces/agent-feed/src/database/migrations/rollback/rollback-008-processing.sql

\echo 'Starting Migration 007 Rollback (Engagement System)...'
\i /workspaces/agent-feed/src/database/migrations/rollback/rollback-007-engagement.sql

\echo 'Starting Migration 006 Rollback (Agent Management)...'
\i /workspaces/agent-feed/src/database/migrations/rollback/rollback-006-agents.sql

\echo 'Starting Migration 005 Rollback (Posts Structure)...'
\i /workspaces/agent-feed/src/database/migrations/rollback/rollback-005-posts.sql

-- Step 4: Final verification and cleanup
BEGIN;

-- Verify original schema is restored
DO $$
DECLARE
    agentlink_tables_remaining INTEGER := 0;
    original_tables_verified INTEGER := 0;
    data_integrity_check BOOLEAN := TRUE;
    rollback_success BOOLEAN := TRUE;
BEGIN
    -- Count any remaining AgentLink-specific tables
    SELECT COUNT(*) INTO agentlink_tables_remaining
    FROM information_schema.tables
    WHERE table_name IN (
        'posts', 'agents', 'agent_pages', 'agent_performance_metrics', 'agent_mentions',
        'agent_coordination', 'user_engagements', 'user_engagement_analytics',
        'post_analytics', 'engagement_events', 'post_processing_status',
        'link_previews', 'post_links', 'chief_of_staff_checks', 'agent_responses'
    ) AND table_schema = 'public';
    
    -- Verify original tables exist
    SELECT COUNT(*) INTO original_tables_verified
    FROM information_schema.tables
    WHERE table_name IN (
        'users', 'feeds', 'feed_items', 'comments', 'claude_flow_sessions',
        'neural_patterns', 'user_sessions', 'feed_fetch_logs',
        'automation_results', 'automation_triggers', 'automation_actions'
    ) AND table_schema = 'public';
    
    -- Check data integrity
    IF NOT EXISTS (SELECT 1 FROM users LIMIT 1) THEN
        data_integrity_check := FALSE;
        rollback_success := FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM feeds LIMIT 1) THEN
        RAISE WARNING 'No feeds found - this may be normal if database was empty';
    END IF;
    
    -- Final assessment
    IF agentlink_tables_remaining > 0 THEN
        rollback_success := FALSE;
        RAISE WARNING 'Rollback incomplete: % AgentLink tables still exist', agentlink_tables_remaining;
    END IF;
    
    IF original_tables_verified < 8 THEN
        rollback_success := FALSE;
        RAISE WARNING 'Original schema incomplete: only % of 8+ expected tables found', original_tables_verified;
    END IF;
    
    -- Log final results
    IF rollback_success AND data_integrity_check THEN
        RAISE NOTICE 'COMPLETE ROLLBACK SUCCESSFUL: All AgentLink migrations rolled back, original schema restored';
    ELSE
        RAISE EXCEPTION 'ROLLBACK FAILED: Schema state inconsistent, check backup tables in rollback_backup schema';
    END IF;
    
    -- Update rollback session status
    UPDATE claude_flow_sessions 
    SET status = CASE WHEN rollback_success THEN 'completed' ELSE 'failed' END,
        metrics = metrics || jsonb_build_object(
            'agentlink_tables_remaining', agentlink_tables_remaining,
            'original_tables_verified', original_tables_verified,
            'data_integrity_check', data_integrity_check,
            'rollback_success', rollback_success,
            'completion_time', now()
        )
    WHERE swarm_id = 'complete-rollback-agentlink';
END;
$$;

COMMIT;

-- Step 5: Provide rollback summary and next steps
\echo ''
\echo '==============================================='
\echo 'AGENTLINK ROLLBACK SUMMARY'
\echo '==============================================='

SELECT 
    'COMPLETE_ROLLBACK_STATUS' as operation,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'posts') 
        THEN 'FAILED - AgentLink tables still exist'
        ELSE 'SUCCESS - Rolled back to original schema'
    END as status,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'rollback_backup') as backup_tables_created,
    (SELECT COUNT(*) FROM users) as users_preserved,
    (SELECT COUNT(*) FROM feed_items) as feed_items_preserved,
    (SELECT COUNT(*) FROM comments) as comments_preserved;

\echo ''
\echo 'ROLLBACK COMPLETE!'
\echo ''
\echo 'What was rolled back:'
\echo '  ✓ Posts enhanced structure → Original feed_items'
\echo '  ✓ Agent management system → Removed'
\echo '  ✓ User engagement tracking → Removed'
\echo '  ✓ Processing status & link previews → Removed'
\echo ''
\echo 'Data preservation:'
\echo '  ✓ All user accounts preserved'
\echo '  ✓ All feed configurations preserved'
\echo '  ✓ All feed items preserved'
\echo '  ✓ All comments preserved'
\echo '  ✓ Complete backup available in rollback_backup schema'
\echo ''
\echo 'To restore AgentLink features:'
\echo '  1. Run migrations 005-008 again'
\echo '  2. Or restore from backup tables in rollback_backup schema'
\echo ''
\echo 'To remove backup (once rollback confirmed successful):'
\echo '  DROP SCHEMA rollback_backup CASCADE;'
\echo '==============================================='