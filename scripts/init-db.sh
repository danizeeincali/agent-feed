#!/bin/bash
# ==============================================================================
# Phase 1: Database Extensions and Application User Setup
# ==============================================================================
# This script runs AFTER schema/indexes/seed SQL files (04-extensions.sh)
# It sets up PostgreSQL extensions and creates the application user
# ==============================================================================

set -e

echo "=============================================================================="
echo "Phase 1: PostgreSQL Extensions and Application User Setup"
echo "=============================================================================="

# Wait for PostgreSQL to be ready
echo "→ Waiting for PostgreSQL to be ready..."
until pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; do
  echo "  PostgreSQL not ready yet, waiting..."
  sleep 2
done

echo "✓ PostgreSQL is ready"
echo ""

# Run extension and user setup
echo "→ Setting up PostgreSQL extensions and application user..."
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  -- ==============================================================================
  -- Enable Required Extensions
  -- ==============================================================================

  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
  CREATE EXTENSION IF NOT EXISTS "pg_trgm";              -- Trigram similarity for text search
  CREATE EXTENSION IF NOT EXISTS "btree_gin";            -- Additional GIN operators
  CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";   -- Query performance monitoring

  -- Log extension creation
  DO \$\$
  BEGIN
    RAISE NOTICE '✓ PostgreSQL extensions initialized:';
    RAISE NOTICE '  - uuid-ossp (UUID generation)';
    RAISE NOTICE '  - pg_trgm (Trigram text search)';
    RAISE NOTICE '  - btree_gin (Additional GIN operators)';
    RAISE NOTICE '  - pg_stat_statements (Query monitoring)';
  END \$\$;

  -- ==============================================================================
  -- Create Application User (Non-Superuser)
  -- ==============================================================================
  -- Best practice: Application should use limited-privilege user, not postgres
  -- ==============================================================================

  DO \$\$
  BEGIN
    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'agentfeed_app') THEN
      CREATE USER agentfeed_app WITH PASSWORD '${APP_USER_PASSWORD:-app_password_change_in_production}';
      RAISE NOTICE '✓ Created application user: agentfeed_app';
    ELSE
      RAISE NOTICE '  Application user agentfeed_app already exists, skipping';
    END IF;
  END \$\$;

  -- Grant necessary permissions to application user
  GRANT CONNECT ON DATABASE $POSTGRES_DB TO agentfeed_app;
  GRANT USAGE ON SCHEMA public TO agentfeed_app;
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO agentfeed_app;
  GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO agentfeed_app;

  -- Set default privileges for future tables (persist across migrations)
  ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO agentfeed_app;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO agentfeed_app;

  -- Log permissions granted
  DO \$\$
  BEGIN
    RAISE NOTICE '✓ Granted permissions to agentfeed_app:';
    RAISE NOTICE '  - CONNECT on database $POSTGRES_DB';
    RAISE NOTICE '  - SELECT, INSERT, UPDATE, DELETE on all tables';
    RAISE NOTICE '  - USAGE, SELECT on all sequences';
  END \$\$;

  -- ==============================================================================
  -- Verify Schema Initialization
  -- ==============================================================================

  DO \$\$
  DECLARE
    table_count INTEGER;
    index_count INTEGER;
    avi_state_exists BOOLEAN;
  BEGIN
    -- Count tables
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE';

    -- Count indexes
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes
    WHERE schemaname = 'public';

    -- Check avi_state
    SELECT EXISTS(SELECT 1 FROM avi_state WHERE id = 1) INTO avi_state_exists;

    RAISE NOTICE '';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'Phase 1: Database Initialization Complete';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'Database: $POSTGRES_DB';
    RAISE NOTICE 'Superuser: $POSTGRES_USER';
    RAISE NOTICE 'App User: agentfeed_app';
    RAISE NOTICE '';
    RAISE NOTICE 'Schema Summary:';
    RAISE NOTICE '  - Tables: %', table_count;
    RAISE NOTICE '  - Indexes: %', index_count;
    RAISE NOTICE '  - Avi State Initialized: %', avi_state_exists;
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '  1. Verify schema: psql -d $POSTGRES_DB -c "\\dt"';
    RAISE NOTICE '  2. Seed system templates via application';
    RAISE NOTICE '  3. Start the Avi DM application';
    RAISE NOTICE '============================================================================';

    -- Fail if tables not created
    IF table_count = 0 THEN
      RAISE EXCEPTION 'Schema initialization failed: No tables found!';
    END IF;

    -- Fail if avi_state not initialized
    IF NOT avi_state_exists THEN
      RAISE EXCEPTION 'Schema initialization failed: avi_state not seeded!';
    END IF;
  END \$\$;
EOSQL

echo ""
echo "=============================================================================="
echo "Database Initialization Successful"
echo "=============================================================================="
echo "Database: $POSTGRES_DB"
echo "Connection: postgresql://$POSTGRES_USER@localhost:5432/$POSTGRES_DB"
echo ""
echo "Application Connection String:"
echo "  postgresql://agentfeed_app:<password>@localhost:5432/$POSTGRES_DB"
echo ""
echo "Health Check:"
echo "  docker exec agent-feed-postgres-phase1 pg_isready -U $POSTGRES_USER -d $POSTGRES_DB"
echo "=============================================================================="
echo ""
