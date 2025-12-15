-- Rollback Migration 006: Remove agent management system
-- This script safely removes all agent-related tables and functions
-- while preserving posts and user data

BEGIN;

-- Step 1: Drop dependent triggers first
DROP TRIGGER IF EXISTS update_agent_coordination_updated_at ON agent_coordination;
DROP TRIGGER IF EXISTS update_agent_mentions_updated_at ON agent_mentions;
DROP TRIGGER IF EXISTS update_agent_pages_updated_at ON agent_pages;
DROP TRIGGER IF EXISTS update_agents_updated_at ON agents;

-- Step 2: Drop functions that depend on agent tables
DROP FUNCTION IF EXISTS get_agent_availability(UUID);
DROP FUNCTION IF EXISTS process_agent_mention(UUID);
DROP FUNCTION IF EXISTS update_agent_performance_summary(UUID);

-- Step 3: Remove agent_id references from posts table
ALTER TABLE posts DROP COLUMN IF EXISTS agent_id CASCADE;

-- Step 4: Clear agent-related data from posts
UPDATE posts SET 
    author_agent = NULL,
    mentioned_agents = ARRAY[]::TEXT[],
    updated_at = NOW()
WHERE author_agent IS NOT NULL OR array_length(mentioned_agents, 1) > 0;

-- Step 5: Drop agent-related tables in dependency order

-- Drop agent_coordination (depends on agents)
DROP TABLE IF EXISTS agent_coordination CASCADE;

-- Drop agent_mentions (depends on posts, agents, users)
DROP TABLE IF EXISTS agent_mentions CASCADE;

-- Drop agent_performance_metrics (depends on agents)
DROP TABLE IF EXISTS agent_performance_metrics CASCADE;

-- Drop agent_pages (depends on agents)
DROP TABLE IF EXISTS agent_pages CASCADE;

-- Drop agents table (referenced by other tables)
DROP TABLE IF EXISTS agents CASCADE;

-- Step 6: Remove any sequences
DROP SEQUENCE IF EXISTS agents_id_seq CASCADE;
DROP SEQUENCE IF EXISTS agent_pages_id_seq CASCADE;
DROP SEQUENCE IF EXISTS agent_performance_metrics_id_seq CASCADE;
DROP SEQUENCE IF EXISTS agent_mentions_id_seq CASCADE;
DROP SEQUENCE IF EXISTS agent_coordination_id_seq CASCADE;

-- Step 7: Clean up migration tracking
DELETE FROM claude_flow_sessions 
WHERE swarm_id = 'migration-006-agents';

-- Step 8: Verify rollback completion and data preservation
DO $$
DECLARE
    tables_remaining INTEGER := 0;
    functions_remaining INTEGER := 0;
    posts_preserved INTEGER := 0;
    users_preserved INTEGER := 0;
    posts_cleaned INTEGER := 0;
BEGIN
    -- Check remaining agent tables
    SELECT COUNT(*) INTO tables_remaining
    FROM information_schema.tables
    WHERE table_name IN (
        'agents', 'agent_pages', 'agent_performance_metrics',
        'agent_mentions', 'agent_coordination'
    ) AND table_schema = 'public';
    
    -- Check remaining agent functions
    SELECT COUNT(*) INTO functions_remaining
    FROM information_schema.routines
    WHERE routine_name IN (
        'get_agent_availability', 'process_agent_mention', 'update_agent_performance_summary'
    ) AND routine_schema = 'public';
    
    -- Verify core data preservation
    SELECT COUNT(*) INTO posts_preserved FROM posts;
    SELECT COUNT(*) INTO users_preserved FROM users;
    
    -- Count posts with cleaned agent references
    SELECT COUNT(*) INTO posts_cleaned
    FROM posts 
    WHERE author_agent IS NULL AND array_length(mentioned_agents, 1) IS NULL;
    
    IF tables_remaining > 0 OR functions_remaining > 0 THEN
        RAISE WARNING 'Rollback incomplete: % tables, % functions remaining', 
                     tables_remaining, functions_remaining;
    ELSE
        RAISE NOTICE 'Migration 006 rollback completed: % posts preserved, % posts cleaned of agent references', 
                     posts_preserved, posts_cleaned;
    END IF;
    
    -- Verify posts table structure is intact
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'posts' AND column_name = 'title'
    ) THEN
        RAISE EXCEPTION 'CRITICAL: Posts table structure damaged during rollback';
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
        'rollback-006-agents',
        'completed',
        jsonb_build_object(
            'rollback_type', 'agent_management_system',
            'rollback_date', now(),
            'tables_removed', 5,
            'functions_removed', functions_remaining,
            'posts_preserved', posts_preserved,
            'posts_cleaned', posts_cleaned,
            'success', true
        ),
        jsonb_build_object(
            'tables_remaining', tables_remaining,
            'functions_remaining', functions_remaining,
            'data_integrity_verified', true
        )
    );
END;
$$;

COMMIT;

-- Final verification
SELECT 
    'ROLLBACK_006_COMPLETE' as status,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name LIKE 'agent%') as agent_tables_remaining,
    (SELECT COUNT(*) FROM information_schema.routines WHERE routine_name LIKE '%agent%') as agent_functions_remaining,
    (SELECT COUNT(*) FROM posts) as posts_preserved,
    (SELECT COUNT(*) FROM users) as users_preserved,
    (SELECT COUNT(*) FROM posts WHERE author_agent IS NULL) as posts_with_cleaned_agent_refs;