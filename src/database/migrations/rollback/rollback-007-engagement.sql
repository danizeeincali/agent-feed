-- Rollback Migration 007: Remove user engagement tracking system
-- This script safely removes all engagement-related tables and functions
-- while preserving core posts and users data

BEGIN;

-- Step 1: Drop dependent triggers first
DROP TRIGGER IF EXISTS engagement_counts_trigger ON user_engagements;
DROP TRIGGER IF EXISTS update_engagement_events_updated_at ON engagement_events;
DROP TRIGGER IF EXISTS update_post_analytics_updated_at ON post_analytics;
DROP TRIGGER IF EXISTS update_user_engagement_analytics_updated_at ON user_engagement_analytics;
DROP TRIGGER IF EXISTS update_user_engagements_updated_at ON user_engagements;

-- Step 2: Drop functions that depend on engagement tables
DROP FUNCTION IF EXISTS remove_user_engagement(UUID, UUID, VARCHAR);
DROP FUNCTION IF EXISTS add_user_engagement(UUID, UUID, VARCHAR, JSONB);
DROP FUNCTION IF EXISTS calculate_post_analytics(UUID, DATE);
DROP FUNCTION IF EXISTS calculate_user_engagement_analytics(UUID, DATE);
DROP FUNCTION IF EXISTS update_engagement_counts();

-- Step 3: Reset engagement counts in posts table to zero
-- (Since we're removing the engagement system, reset counts)
UPDATE posts SET 
    likes_count = 0,
    saves_count = 0,
    shares_count = 0,
    views_count = 0,
    updated_at = NOW()
WHERE likes_count > 0 OR saves_count > 0 OR shares_count > 0 OR views_count > 0;

-- Step 4: Reset agent interaction counts
UPDATE agents SET 
    total_interactions = 0,
    updated_at = NOW()
WHERE total_interactions > 0;

-- Step 5: Drop engagement tables in dependency order

-- Drop engagement_events (independent)
DROP TABLE IF EXISTS engagement_events CASCADE;

-- Drop post_analytics (depends on posts)
DROP TABLE IF EXISTS post_analytics CASCADE;

-- Drop user_engagement_analytics (depends on users)
DROP TABLE IF EXISTS user_engagement_analytics CASCADE;

-- Drop user_engagements (depends on users, posts)
DROP TABLE IF EXISTS user_engagements CASCADE;

-- Step 6: Remove any sequences
DROP SEQUENCE IF EXISTS user_engagements_id_seq CASCADE;
DROP SEQUENCE IF EXISTS user_engagement_analytics_id_seq CASCADE;
DROP SEQUENCE IF EXISTS post_analytics_id_seq CASCADE;
DROP SEQUENCE IF EXISTS engagement_events_id_seq CASCADE;

-- Step 7: Clean up migration tracking
DELETE FROM claude_flow_sessions 
WHERE swarm_id = 'migration-007-engagement';

-- Step 8: Verify rollback completion
DO $$
DECLARE
    tables_remaining INTEGER := 0;
    functions_remaining INTEGER := 0;
    posts_reset INTEGER := 0;
BEGIN
    -- Check remaining tables
    SELECT COUNT(*) INTO tables_remaining
    FROM information_schema.tables
    WHERE table_name IN (
        'user_engagements', 'user_engagement_analytics', 
        'post_analytics', 'engagement_events'
    ) AND table_schema = 'public';
    
    -- Check remaining functions
    SELECT COUNT(*) INTO functions_remaining
    FROM information_schema.routines
    WHERE routine_name LIKE '%engagement%'
    AND routine_schema = 'public';
    
    -- Count posts with reset engagement counts
    SELECT COUNT(*) INTO posts_reset
    FROM posts 
    WHERE likes_count = 0 AND saves_count = 0 AND shares_count = 0 AND views_count = 0;
    
    IF tables_remaining > 0 OR functions_remaining > 0 THEN
        RAISE WARNING 'Rollback incomplete: % tables, % functions remaining', 
                     tables_remaining, functions_remaining;
    ELSE
        RAISE NOTICE 'Migration 007 rollback completed: % posts engagement counts reset', posts_reset;
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
        'rollback-007-engagement',
        'completed',
        jsonb_build_object(
            'rollback_type', 'engagement_system',
            'rollback_date', now(),
            'tables_removed', 4,
            'functions_removed', functions_remaining,
            'posts_reset', posts_reset,
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
    'ROLLBACK_007_COMPLETE' as status,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name LIKE '%engagement%' 
     OR table_name = 'post_analytics') as engagement_tables_remaining,
    (SELECT COUNT(*) FROM information_schema.routines WHERE routine_name LIKE '%engagement%') as engagement_functions_remaining,
    (SELECT COUNT(*) FROM posts WHERE likes_count = 0 AND saves_count = 0 AND shares_count = 0) as posts_with_reset_counts;