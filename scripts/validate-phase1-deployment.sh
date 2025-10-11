#!/bin/bash
# ==============================================================================
# Phase 1: Deployment Validation Script
# ==============================================================================
# Validates that all Phase 1 components are correctly deployed and functional
# ==============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
CONTAINER_NAME="${CONTAINER_NAME:-agent-feed-postgres-phase1}"
DB_NAME="${POSTGRES_DB:-avidm_dev}"
DB_USER="${POSTGRES_USER:-postgres}"

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# ==============================================================================
# Helper Functions
# ==============================================================================

print_header() {
  echo ""
  echo "=============================================================================="
  echo "$1"
  echo "=============================================================================="
  echo ""
}

test_pass() {
  echo -e "${GREEN}✓${NC} $1"
  ((PASSED++))
}

test_fail() {
  echo -e "${RED}✗${NC} $1"
  ((FAILED++))
}

test_warn() {
  echo -e "${YELLOW}⚠${NC} $1"
  ((WARNINGS++))
}

# ==============================================================================
# Validation Tests
# ==============================================================================

print_header "Phase 1: Deployment Validation"

# Test 1: Docker Compose file exists
echo "→ Checking Docker Compose configuration..."
if [ -f "docker-compose.phase1.yml" ]; then
  test_pass "docker-compose.phase1.yml exists"
else
  test_fail "docker-compose.phase1.yml not found"
fi

# Test 2: Environment file exists
if [ -f ".env.phase1" ]; then
  test_pass ".env.phase1 exists"
else
  test_fail ".env.phase1 not found"
fi

# Test 3: Schema files exist
echo ""
echo "→ Checking schema files..."
if [ -f "src/database/schema/001_initial_schema.sql" ]; then
  test_pass "001_initial_schema.sql exists"
else
  test_fail "001_initial_schema.sql not found"
fi

if [ -f "src/database/schema/indexes.sql" ]; then
  test_pass "indexes.sql exists"
else
  test_fail "indexes.sql not found"
fi

if [ -f "src/database/schema/seed.sql" ]; then
  test_pass "seed.sql exists"
else
  test_fail "seed.sql not found"
fi

# Test 4: Scripts exist and are executable
echo ""
echo "→ Checking scripts..."
if [ -x "scripts/init-db.sh" ]; then
  test_pass "init-db.sh exists and is executable"
else
  test_fail "init-db.sh missing or not executable"
fi

if [ -x "scripts/backup-user-data.sh" ]; then
  test_pass "backup-user-data.sh exists and is executable"
else
  test_fail "backup-user-data.sh missing or not executable"
fi

# Test 5: Container running
echo ""
echo "→ Checking container status..."
if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}\$"; then
  test_pass "Container '$CONTAINER_NAME' is running"

  # Test 6: Health check
  echo ""
  echo "→ Checking container health..."
  if docker exec "$CONTAINER_NAME" pg_isready -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; then
    test_pass "PostgreSQL is healthy and accepting connections"
  else
    test_fail "PostgreSQL health check failed"
  fi

  # Test 7: Database exists
  echo ""
  echo "→ Checking database..."
  if docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    test_pass "Database '$DB_NAME' exists"
  else
    test_fail "Database '$DB_NAME' not found"
  fi

  # Test 8: Tables exist
  echo ""
  echo "→ Checking schema..."
  TABLE_COUNT=$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';" | xargs)

  if [ "$TABLE_COUNT" -eq 6 ]; then
    test_pass "All 6 tables created (found: $TABLE_COUNT)"
  elif [ "$TABLE_COUNT" -gt 0 ]; then
    test_warn "Expected 6 tables, found: $TABLE_COUNT"
  else
    test_fail "No tables found in database"
  fi

  # Test 9: Indexes exist
  INDEX_COUNT=$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public';" | xargs)

  if [ "$INDEX_COUNT" -ge 20 ]; then
    test_pass "Indexes created (found: $INDEX_COUNT)"
  elif [ "$INDEX_COUNT" -gt 0 ]; then
    test_warn "Expected 20+ indexes, found: $INDEX_COUNT"
  else
    test_fail "No indexes found"
  fi

  # Test 10: Extensions enabled
  echo ""
  echo "→ Checking extensions..."
  EXTENSIONS=$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM pg_extension WHERE extname IN ('uuid-ossp', 'pg_trgm', 'btree_gin', 'pg_stat_statements');" | xargs)

  if [ "$EXTENSIONS" -eq 4 ]; then
    test_pass "All required extensions enabled (found: $EXTENSIONS)"
  else
    test_warn "Expected 4 extensions, found: $EXTENSIONS"
  fi

  # Test 11: Application user exists
  echo ""
  echo "→ Checking users..."
  if docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT 1 FROM pg_user WHERE usename = 'agentfeed_app';" | grep -q 1; then
    test_pass "Application user 'agentfeed_app' exists"
  else
    test_fail "Application user 'agentfeed_app' not found"
  fi

  # Test 12: Avi state initialized
  echo ""
  echo "→ Checking avi_state..."
  if docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT 1 FROM avi_state WHERE id = 1;" 2>/dev/null | grep -q 1; then
    test_pass "avi_state initialized (id=1)"
  else
    test_fail "avi_state not initialized"
  fi

  # Test 13: Volumes exist
  echo ""
  echo "→ Checking volumes..."
  if docker volume ls --format '{{.Name}}' | grep -q "agent-feed_postgres_data"; then
    test_pass "postgres_data volume exists"
  else
    test_fail "postgres_data volume not found"
  fi

  if docker volume ls --format '{{.Name}}' | grep -q "agent-feed_agent_workspaces"; then
    test_pass "agent_workspaces volume exists"
  else
    test_fail "agent_workspaces volume not found"
  fi

  # Test 14: Backup directory exists
  echo ""
  echo "→ Checking backup directory..."
  if [ -d "backups" ]; then
    test_pass "Backup directory exists"
  else
    test_warn "Backup directory not found (will be created on first backup)"
  fi

else
  test_fail "Container '$CONTAINER_NAME' is not running"
  echo ""
  echo "Start the container with:"
  echo "  docker-compose -f docker-compose.phase1.yml up -d"
fi

# ==============================================================================
# Summary
# ==============================================================================

print_header "Validation Summary"

echo "Tests Passed:   ${GREEN}$PASSED${NC}"
echo "Tests Failed:   ${RED}$FAILED${NC}"
echo "Warnings:       ${YELLOW}$WARNINGS${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ Phase 1 deployment is healthy!${NC}"
  echo ""
  echo "Next steps:"
  echo "  1. Seed system templates: npm run db:seed"
  echo "  2. Start your application"
  echo "  3. Setup automated backups"
  exit 0
else
  echo -e "${RED}✗ Phase 1 deployment has issues!${NC}"
  echo ""
  echo "Troubleshooting:"
  echo "  1. Check logs: docker-compose -f docker-compose.phase1.yml logs postgres"
  echo "  2. Reset database: docker-compose -f docker-compose.phase1.yml down --volumes"
  echo "  3. See: PHASE1-DEPLOYMENT-GUIDE.md"
  exit 1
fi
