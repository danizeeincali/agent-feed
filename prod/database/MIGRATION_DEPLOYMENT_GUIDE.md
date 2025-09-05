# Database Migration Deployment Guide

## Overview

This guide provides comprehensive procedures for deploying the agent feed enhancement database migrations with zero-downtime capabilities and full rollback support.

## Migration Architecture

### Migration Files Structure
```
/prod/database/migrations/
├── 010_create_agent_posts_enhancement.sql
├── 011_create_feed_intelligence_system.sql
├── 012_create_performance_optimization.sql
├── 013_create_data_integrity_system.sql
├── 014_create_monitoring_health_system.sql
└── rollback/
    ├── rollback-010-agent-posts-enhancement.sql
    ├── rollback-011-feed-intelligence.sql
    ├── rollback-012-performance-optimization.sql
    ├── rollback-013-data-integrity.sql
    └── rollback-014-monitoring-health.sql
```

## Pre-Migration Checklist

### 1. Environment Validation
```bash
# Verify PostgreSQL version (requires 12+)
psql -c "SELECT version();"

# Check available disk space (ensure 2x current DB size)
df -h

# Verify database connectivity
psql -h $DATABASE_HOST -U $DATABASE_USER -d $DATABASE_NAME -c "\l"

# Check current database size
psql -c "SELECT pg_size_pretty(pg_database_size(current_database()));"
```

### 2. Backup Procedures
```bash
# Create full database backup
pg_dump -h $DATABASE_HOST -U $DATABASE_USER -d $DATABASE_NAME \
  --verbose --no-owner --no-privileges \
  -f "backup_pre_migration_$(date +%Y%m%d_%H%M%S).sql"

# Verify backup integrity
pg_restore --list backup_pre_migration_*.sql | head -20
```

### 3. Performance Baseline
```sql
-- Collect baseline metrics
SELECT 
    schemaname,
    tablename,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes,
    n_live_tup as live_tuples,
    n_dead_tup as dead_tuples
FROM pg_stat_user_tables 
ORDER BY n_live_tup DESC;

-- Check current connection count
SELECT COUNT(*) as active_connections FROM pg_stat_activity;

-- Record current database size
SELECT 
    pg_size_pretty(pg_database_size(current_database())) as database_size,
    pg_size_pretty(pg_total_relation_size('users')) as users_table_size;
```

## Zero-Downtime Migration Strategy

### Phase 1: Schema Enhancement (Migration 010)
```sql
-- Duration: 5-10 minutes
-- Downtime: None (new tables only)

BEGIN;
\i /prod/database/migrations/010_create_agent_posts_enhancement.sql
COMMIT;

-- Validation
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_name IN ('agent_posts', 'post_quality_metrics', 'feed_analytics', 'posting_templates');
```

### Phase 2: Intelligence System (Migration 011)
```sql
-- Duration: 10-15 minutes  
-- Downtime: None (new tables with partitioning)

BEGIN;
\i /prod/database/migrations/011_create_feed_intelligence_system.sql
COMMIT;

-- Validation
SELECT COUNT(*) FROM user_sessions_detailed;
SELECT COUNT(*) FROM user_interaction_events;
```

### Phase 3: Performance Optimization (Migration 012)
```sql
-- Duration: 15-30 minutes
-- Downtime: Minimal during index creation (CONCURRENT indexes)

-- Note: CONCURRENT index creation happens outside transaction
\i /prod/database/migrations/012_create_performance_optimization.sql

-- Validation
SELECT indexname, tablename FROM pg_indexes 
WHERE indexname LIKE 'idx_agent_posts%';
```

### Phase 4: Data Integrity (Migration 013)
```sql
-- Duration: 5-10 minutes
-- Downtime: Brief during constraint addition

BEGIN;
\i /prod/database/migrations/013_create_data_integrity_system.sql
COMMIT;

-- Validation
SELECT * FROM check_data_consistency() LIMIT 5;
```

### Phase 5: Monitoring System (Migration 014)
```sql
-- Duration: 5-10 minutes
-- Downtime: None

BEGIN;
\i /prod/database/migrations/014_create_monitoring_health_system.sql
COMMIT;

-- Validation
SELECT * FROM perform_comprehensive_health_check() LIMIT 5;
```

## Migration Execution Scripts

### Automated Migration Script
```bash
#!/bin/bash
# migrate.sh

set -e

DATABASE_URL="${DATABASE_URL:-postgresql://user:password@localhost:5432/agentfeed}"
MIGRATION_DIR="/prod/database/migrations"
LOG_FILE="migration_$(date +%Y%m%d_%H%M%S).log"

echo "Starting database migration at $(date)" | tee -a $LOG_FILE

# Function to execute migration with logging
execute_migration() {
    local migration_file=$1
    local migration_name=$(basename $migration_file .sql)
    
    echo "Executing $migration_name..." | tee -a $LOG_FILE
    
    if psql $DATABASE_URL -f $migration_file >> $LOG_FILE 2>&1; then
        echo "✓ $migration_name completed successfully" | tee -a $LOG_FILE
    else
        echo "✗ $migration_name failed" | tee -a $LOG_FILE
        exit 1
    fi
}

# Execute migrations in order
for migration in 010 011 012 013 014; do
    migration_file="$MIGRATION_DIR/${migration}_*.sql"
    if ls $migration_file 1> /dev/null 2>&1; then
        execute_migration $migration_file
    else
        echo "Warning: Migration file $migration not found" | tee -a $LOG_FILE
    fi
done

echo "All migrations completed successfully at $(date)" | tee -a $LOG_FILE
```

### Migration Status Check
```bash
#!/bin/bash
# check_migration_status.sh

psql $DATABASE_URL << EOF
-- Check table existence
SELECT 
    table_name,
    CASE WHEN table_name IN (
        'agent_posts', 'post_quality_metrics', 'feed_analytics', 
        'posting_templates', 'user_sessions_detailed', 'user_interaction_events',
        'content_performance_metrics', 'ml_insights', 'feed_optimization_rules',
        'user_preference_profiles', 'audit_log', 'alert_rules'
    ) THEN '✓' ELSE '✗' END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'agent_posts', 'post_quality_metrics', 'feed_analytics', 
    'posting_templates', 'user_sessions_detailed', 'user_interaction_events',
    'content_performance_metrics', 'ml_insights', 'feed_optimization_rules',
    'user_preference_profiles', 'audit_log', 'alert_rules'
)
ORDER BY table_name;

-- Check function existence
SELECT 
    routine_name,
    routine_type,
    '✓' as status
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND routine_name IN (
    'validate_post_content', 'check_data_consistency',
    'perform_comprehensive_health_check', 'collect_system_metrics'
)
ORDER BY routine_name;
EOF
```

## Rollback Procedures

### Emergency Rollback Script
```bash
#!/bin/bash
# emergency_rollback.sh

set -e

DATABASE_URL="${DATABASE_URL:-postgresql://user:password@localhost:5432/agentfeed}"
ROLLBACK_DIR="/prod/database/migrations/rollback"
LOG_FILE="rollback_$(date +%Y%m%d_%H%M%S).log"

echo "Starting emergency rollback at $(date)" | tee -a $LOG_FILE

# Rollback in reverse order
for migration in 014 013 012 011 010; do
    rollback_file="$ROLLBACK_DIR/rollback-${migration}*.sql"
    if ls $rollback_file 1> /dev/null 2>&1; then
        echo "Rolling back migration $migration..." | tee -a $LOG_FILE
        if psql $DATABASE_URL -f $rollback_file >> $LOG_FILE 2>&1; then
            echo "✓ Migration $migration rolled back successfully" | tee -a $LOG_FILE
        else
            echo "✗ Rollback of migration $migration failed" | tee -a $LOG_FILE
            exit 1
        fi
    fi
done

echo "Emergency rollback completed at $(date)" | tee -a $LOG_FILE
```

### Selective Rollback
```bash
#!/bin/bash
# selective_rollback.sh <migration_number>

MIGRATION_NUM=$1
if [ -z "$MIGRATION_NUM" ]; then
    echo "Usage: $0 <migration_number>"
    exit 1
fi

ROLLBACK_FILE="/prod/database/migrations/rollback/rollback-${MIGRATION_NUM}*.sql"

echo "Rolling back migration $MIGRATION_NUM..."
psql $DATABASE_URL -f $ROLLBACK_FILE
echo "Rollback completed"
```

## Post-Migration Validation

### Comprehensive Validation Script
```sql
-- validation_suite.sql

-- 1. Table Structure Validation
DO $$
DECLARE
    expected_tables TEXT[] := ARRAY[
        'agent_posts', 'post_quality_metrics', 'feed_analytics', 'posting_templates',
        'user_sessions_detailed', 'user_interaction_events', 'content_performance_metrics',
        'ml_insights', 'feed_optimization_rules', 'user_preference_profiles',
        'audit_log', 'alert_rules', 'alert_incidents', 'system_health_metrics'
    ];
    table_name TEXT;
    missing_tables TEXT[] := '{}';
BEGIN
    FOREACH table_name IN ARRAY expected_tables
    LOOP
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                      WHERE table_schema = 'public' AND table_name = table_name) THEN
            missing_tables := array_append(missing_tables, table_name);
        END IF;
    END LOOP;
    
    IF array_length(missing_tables, 1) > 0 THEN
        RAISE EXCEPTION 'Missing tables: %', array_to_string(missing_tables, ', ');
    ELSE
        RAISE NOTICE 'All expected tables present';
    END IF;
END $$;

-- 2. Index Validation
WITH expected_indexes AS (
    SELECT unnest(ARRAY[
        'idx_agent_posts_agent_status', 'idx_agent_posts_content_hash',
        'idx_user_interaction_events_session_time', 'idx_content_performance_post_date',
        'idx_ml_insights_type_confidence', 'idx_feed_optimization_rules_performance'
    ]) as index_name
),
actual_indexes AS (
    SELECT indexname FROM pg_indexes WHERE schemaname = 'public'
)
SELECT 
    ei.index_name,
    CASE WHEN ai.indexname IS NOT NULL THEN '✓' ELSE '✗' END as status
FROM expected_indexes ei
LEFT JOIN actual_indexes ai ON ei.index_name = ai.indexname
ORDER BY ei.index_name;

-- 3. Function Validation
SELECT 
    routine_name,
    routine_type,
    specific_name
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND routine_name IN (
    'validate_post_content', 'validate_quality_metrics', 'check_data_consistency',
    'perform_comprehensive_health_check', 'collect_system_metrics',
    'cleanup_orphaned_data', 'refresh_analytics_views'
)
ORDER BY routine_name;

-- 4. Constraint Validation
SELECT 
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type
FROM information_schema.table_constraints tc
WHERE tc.table_schema = 'public'
AND tc.constraint_type IN ('FOREIGN KEY', 'CHECK', 'UNIQUE')
AND tc.table_name IN ('agent_posts', 'post_quality_metrics', 'user_interaction_events')
ORDER BY tc.table_name, tc.constraint_type;

-- 5. Performance Test
EXPLAIN ANALYZE
SELECT ap.*, pqm.overall_quality_score
FROM agent_posts ap
LEFT JOIN post_quality_metrics pqm ON ap.id = pqm.post_id
WHERE ap.status = 'published'
ORDER BY ap.published_at DESC
LIMIT 100;
```

## Monitoring and Health Checks

### Post-Migration Health Check
```sql
-- Execute comprehensive health check
SELECT * FROM perform_comprehensive_health_check();

-- Check system metrics
SELECT * FROM collect_system_metrics();

-- Validate data integrity
SELECT * FROM check_data_consistency();

-- Check alert system
SELECT rule_name, is_active, last_checked 
FROM alert_rules 
WHERE is_active = TRUE;
```

### Performance Monitoring
```sql
-- Monitor query performance
SELECT 
    query,
    calls,
    mean_time,
    total_time,
    rows,
    100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
ORDER BY mean_time DESC
LIMIT 10;

-- Monitor table statistics
SELECT 
    schemaname,
    tablename,
    n_live_tup,
    n_dead_tup,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;
```

## Troubleshooting Guide

### Common Issues and Solutions

#### 1. Migration Timeout
```bash
# Increase statement timeout
psql $DATABASE_URL -c "SET statement_timeout = '30min';"

# Or execute in smaller batches
psql $DATABASE_URL -c "SET work_mem = '256MB';"
```

#### 2. Lock Conflicts
```sql
-- Check for blocking queries
SELECT 
    blocked_locks.pid AS blocked_pid,
    blocked_activity.usename AS blocked_user,
    blocking_locks.pid AS blocking_pid,
    blocking_activity.usename AS blocking_user,
    blocked_activity.query AS blocked_statement,
    blocking_activity.query AS current_statement_in_blocking_process
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks 
    ON blocking_locks.locktype = blocked_locks.locktype
    AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
    AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
    AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
    AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
    AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
    AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
    AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
    AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
    AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
    AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;
```

#### 3. Index Creation Failures
```sql
-- Check index creation progress
SELECT 
    i.relname as index_name,
    t.relname as table_name,
    round(100.0 * i.relpages / t.relpages, 2) as progress_percent
FROM pg_class i
JOIN pg_index ix ON i.oid = ix.indexrelid
JOIN pg_class t ON ix.indrelid = t.oid
WHERE i.relkind = 'I'
AND t.relname IN ('agent_posts', 'user_interaction_events');
```

## Maintenance Procedures

### Regular Maintenance Tasks
```sql
-- Weekly maintenance
SELECT * FROM perform_automated_maintenance();

-- Manual vacuum and analyze
VACUUM (ANALYZE, VERBOSE) agent_posts;
VACUUM (ANALYZE, VERBOSE) user_interaction_events;

-- Update statistics
ANALYZE;

-- Check for bloated tables
SELECT 
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
    round(100 * pg_relation_size(schemaname||'.'||tablename) / pg_total_relation_size(schemaname||'.'||tablename)) as table_percent
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## Success Criteria

Migration is considered successful when:

1. ✅ All tables created without errors
2. ✅ All indexes built successfully  
3. ✅ All functions and triggers operational
4. ✅ Data integrity checks pass
5. ✅ Performance benchmarks within 10% of baseline
6. ✅ Health checks return "healthy" status
7. ✅ No application errors in logs
8. ✅ Rollback procedures tested and verified

## Support and Escalation

### Emergency Contacts
- Database Team: dba-team@company.com
- DevOps Team: devops@company.com  
- On-call: +1-XXX-XXX-XXXX

### Log Files Location
- Migration logs: `/var/log/migrations/`
- Database logs: Check `pg_log` directory
- Application logs: `/var/log/agentfeed/`

### Recovery Procedures
1. Execute emergency rollback script
2. Restore from backup if necessary
3. Notify stakeholders
4. Conduct post-incident review