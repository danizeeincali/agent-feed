#!/bin/bash

# ==============================================================================
# Setup Test Database Script
# ==============================================================================
# Creates and initializes the test database for integration tests
# Usage: ./scripts/setup-test-db.sh
# ==============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
CONTAINER_NAME="agent-feed-postgres-phase1"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-dev_password_change_in_production}"
TEST_DB_NAME="avidm_test"
DEV_DB_NAME="avidm_dev"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Phase 1: Test Database Setup${NC}"
echo -e "${GREEN}========================================${NC}"

# ==============================================================================
# Check if Docker is running
# ==============================================================================
echo -e "\n${YELLOW}Checking Docker...${NC}"
if ! docker info > /dev/null 2>&1; then
  echo -e "${RED}Error: Docker is not running${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Docker is running${NC}"

# ==============================================================================
# Check if PostgreSQL container is running
# ==============================================================================
echo -e "\n${YELLOW}Checking PostgreSQL container...${NC}"
if ! docker ps | grep -q $CONTAINER_NAME; then
  echo -e "${YELLOW}PostgreSQL container not running. Starting it...${NC}"
  docker-compose -f docker-compose.phase1.yml up -d postgres

  # Wait for PostgreSQL to be ready
  echo -e "${YELLOW}Waiting for PostgreSQL to be ready...${NC}"
  for i in {1..30}; do
    if docker exec $CONTAINER_NAME pg_isready -U $DB_USER > /dev/null 2>&1; then
      echo -e "${GREEN}✓ PostgreSQL is ready${NC}"
      break
    fi
    if [ $i -eq 30 ]; then
      echo -e "${RED}Error: PostgreSQL failed to start${NC}"
      exit 1
    fi
    sleep 1
  done
else
  echo -e "${GREEN}✓ PostgreSQL container is running${NC}"
fi

# ==============================================================================
# Create test database
# ==============================================================================
echo -e "\n${YELLOW}Creating test database...${NC}"

# Drop existing test database if it exists
docker exec $CONTAINER_NAME psql -U $DB_USER -c "DROP DATABASE IF EXISTS $TEST_DB_NAME;" 2>/dev/null || true

# Create test database
docker exec $CONTAINER_NAME psql -U $DB_USER -c "CREATE DATABASE $TEST_DB_NAME;" 2>/dev/null

echo -e "${GREEN}✓ Test database created: $TEST_DB_NAME${NC}"

# ==============================================================================
# Verify test database
# ==============================================================================
echo -e "\n${YELLOW}Verifying test database...${NC}"

# Check database exists
if docker exec $CONTAINER_NAME psql -U $DB_USER -lqt | cut -d \| -f 1 | grep -qw $TEST_DB_NAME; then
  echo -e "${GREEN}✓ Test database verified${NC}"
else
  echo -e "${RED}Error: Test database not found${NC}"
  exit 1
fi

# ==============================================================================
# Create .env.test file
# ==============================================================================
echo -e "\n${YELLOW}Creating .env.test file...${NC}"

cat > .env.test << EOF
# ==============================================================================
# Phase 1: Test Environment Configuration
# ==============================================================================
# Used by integration tests
# ==============================================================================

# Database connection
DB_HOST=localhost
DB_PORT=5432
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_NAME=$TEST_DB_NAME

# Test database URL
DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$TEST_DB_NAME

# Node environment
NODE_ENV=test
LOG_LEVEL=error

# Claude API (for tests that need it)
ANTHROPIC_API_KEY=test_key_not_used_in_integration_tests
EOF

echo -e "${GREEN}✓ Created .env.test file${NC}"

# ==============================================================================
# Display connection info
# ==============================================================================
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}Test Database Ready!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e ""
echo -e "Database Name: ${YELLOW}$TEST_DB_NAME${NC}"
echo -e "User:          ${YELLOW}$DB_USER${NC}"
echo -e "Host:          ${YELLOW}localhost${NC}"
echo -e "Port:          ${YELLOW}5432${NC}"
echo -e ""
echo -e "Connect via psql:"
echo -e "${YELLOW}docker exec -it $CONTAINER_NAME psql -U $DB_USER -d $TEST_DB_NAME${NC}"
echo -e ""
echo -e "Run integration tests:"
echo -e "${YELLOW}npm test -- tests/phase1/integration/${NC}"
echo -e ""
echo -e "Run specific test file:"
echo -e "${YELLOW}npm test -- tests/phase1/integration/schema-creation.test.ts${NC}"
echo -e ""
echo -e "${GREEN}========================================${NC}"
