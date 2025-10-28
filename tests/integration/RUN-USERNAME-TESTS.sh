#!/bin/bash

# ============================================================================
# USERNAME COLLECTION SYSTEM - TEST EXECUTION SCRIPT
# ============================================================================
#
# This script runs the comprehensive TDD integration tests for the username
# collection system, ensuring all components work together correctly.
#
# Usage:
#   ./tests/integration/RUN-USERNAME-TESTS.sh [options]
#
# Options:
#   --setup      Run database migration before tests
#   --coverage   Run with coverage reporting
#   --watch      Run in watch mode
#   --verbose    Show detailed test output
#   --skip-server-check  Skip server availability check
#
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DB_PATH="./database.db"
API_URL="http://localhost:3001"
TEST_FILE="tests/integration/username-collection.test.js"

# Parse command line arguments
SETUP=false
COVERAGE=false
WATCH=false
VERBOSE=false
SKIP_SERVER_CHECK=false

for arg in "$@"; do
  case $arg in
    --setup)
      SETUP=true
      shift
      ;;
    --coverage)
      COVERAGE=true
      shift
      ;;
    --watch)
      WATCH=true
      shift
      ;;
    --verbose)
      VERBOSE=true
      shift
      ;;
    --skip-server-check)
      SKIP_SERVER_CHECK=true
      shift
      ;;
    *)
      echo "Unknown option: $arg"
      echo "Usage: $0 [--setup] [--coverage] [--watch] [--verbose] [--skip-server-check]"
      exit 1
      ;;
  esac
done

# ============================================================================
# Pre-Flight Checks
# ============================================================================

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  USERNAME COLLECTION SYSTEM - INTEGRATION TESTS           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}📋 Pre-flight checks...${NC}"

# Check if database exists
if [ -f "$DB_PATH" ]; then
  echo -e "${GREEN}✅ Database found:${NC} $DB_PATH"
  DB_SIZE=$(du -h "$DB_PATH" | cut -f1)
  echo "   Size: $DB_SIZE"
else
  echo -e "${RED}❌ Database not found:${NC} $DB_PATH"
  exit 1
fi

# Check if test file exists
if [ -f "$TEST_FILE" ]; then
  echo -e "${GREEN}✅ Test file found:${NC} $TEST_FILE"
  TEST_COUNT=$(grep -c "it('should" "$TEST_FILE" || echo "0")
  echo "   Tests: $TEST_COUNT"
else
  echo -e "${RED}❌ Test file not found:${NC} $TEST_FILE"
  exit 1
fi

# Check if API server is running (unless skipped)
if [ "$SKIP_SERVER_CHECK" = false ]; then
  echo ""
  echo -e "${YELLOW}🔍 Checking API server...${NC}"

  if curl -s "$API_URL/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ API server running:${NC} $API_URL"
  else
    echo -e "${YELLOW}⚠️  API server not running on port 3001${NC}"
    echo ""
    echo "   Start the server with:"
    echo "   ${BLUE}cd api-server && npm run dev${NC}"
    echo ""
    echo "   Or skip this check with: ${BLUE}--skip-server-check${NC}"
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      exit 1
    fi
  fi
fi

# ============================================================================
# Database Migration (if requested)
# ============================================================================

if [ "$SETUP" = true ]; then
  echo ""
  echo -e "${YELLOW}🔧 Running database migration...${NC}"

  if [ -d "api-server" ]; then
    cd api-server

    if [ -f "package.json" ]; then
      if npm run migrate 2>&1 | grep -q "error"; then
        echo -e "${RED}❌ Migration failed${NC}"
        exit 1
      else
        echo -e "${GREEN}✅ Migration completed${NC}"
      fi
    else
      echo -e "${YELLOW}⚠️  No package.json found in api-server${NC}"
    fi

    cd ..
  else
    echo -e "${YELLOW}⚠️  api-server directory not found${NC}"
  fi
fi

# ============================================================================
# Verify user_settings Table Exists
# ============================================================================

echo ""
echo -e "${YELLOW}🔍 Verifying database schema...${NC}"

if sqlite3 "$DB_PATH" "SELECT name FROM sqlite_master WHERE type='table' AND name='user_settings';" | grep -q "user_settings"; then
  echo -e "${GREEN}✅ user_settings table exists${NC}"

  # Show column count
  COLUMN_COUNT=$(sqlite3 "$DB_PATH" "PRAGMA table_info(user_settings);" | wc -l)
  echo "   Columns: $COLUMN_COUNT"

  # Show record count
  RECORD_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM user_settings;" 2>/dev/null || echo "0")
  echo "   Records: $RECORD_COUNT"
else
  echo -e "${RED}❌ user_settings table not found${NC}"
  echo ""
  echo "   Run migration first:"
  echo "   ${BLUE}$0 --setup${NC}"
  echo ""
  exit 1
fi

# ============================================================================
# Run Tests
# ============================================================================

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  RUNNING TESTS                                            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Build test command
TEST_CMD="npx vitest run $TEST_FILE"

if [ "$WATCH" = true ]; then
  TEST_CMD="npx vitest $TEST_FILE"
fi

if [ "$COVERAGE" = true ]; then
  TEST_CMD="$TEST_CMD --coverage"
fi

if [ "$VERBOSE" = true ]; then
  TEST_CMD="$TEST_CMD --reporter=verbose"
fi

# Run tests
echo -e "${YELLOW}Running:${NC} $TEST_CMD"
echo ""

if eval $TEST_CMD; then
  echo ""
  echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║  ✅ ALL TESTS PASSED                                      ║${NC}"
  echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
  echo ""

  # Show summary
  echo -e "${BLUE}Test Summary:${NC}"
  echo "  • Database Migration: ✅ Passed"
  echo "  • API Endpoints: ✅ Passed"
  echo "  • Validation & Security: ✅ Passed"
  echo "  • Edge Cases: ✅ Passed"
  echo "  • Performance: ✅ Passed"
  echo ""

  exit 0
else
  echo ""
  echo -e "${RED}╔════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${RED}║  ❌ TESTS FAILED                                          ║${NC}"
  echo -e "${RED}╚════════════════════════════════════════════════════════════╝${NC}"
  echo ""

  echo -e "${YELLOW}Troubleshooting:${NC}"
  echo "  1. Check API server is running: ${BLUE}curl $API_URL/health${NC}"
  echo "  2. Verify database schema: ${BLUE}sqlite3 $DB_PATH '.schema user_settings'${NC}"
  echo "  3. Check test logs above for specific failures"
  echo "  4. Run with --verbose for detailed output"
  echo ""

  exit 1
fi
