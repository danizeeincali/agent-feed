#!/bin/bash

# ============================================================================
# Comment Threading Hooks - Test Runner
# ============================================================================
#
# Quick-start script to run comprehensive TDD tests for comment threading.
#
# Usage:
#   ./RUN-COMMENT-TESTS.sh [options]
#
# Options:
#   --watch        Run tests in watch mode
#   --verbose      Show detailed test output
#   --quick        Run only basic tests (skip performance)
#   --e2e          Run only end-to-end tests
#   --realtime     Run only WebSocket/real-time tests
#   --help         Show this help message

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_BASE="http://localhost:3001"
DB_PATH="../../database.db"
TEST_FILE="comment-hooks.test.js"

# Parse command line arguments
WATCH_MODE=false
VERBOSE=false
TEST_FILTER=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --watch)
      WATCH_MODE=true
      shift
      ;;
    --verbose)
      VERBOSE=true
      shift
      ;;
    --quick)
      TEST_FILTER="useCommentThreading"
      shift
      ;;
    --e2e)
      TEST_FILTER="End-to-End"
      shift
      ;;
    --realtime)
      TEST_FILTER="Real-time"
      shift
      ;;
    --help)
      head -n 20 "$0" | tail -n +3 | sed 's/^# //'
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC}  Comment Threading Hooks - TDD Test Suite                     ${BLUE}║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ============================================================================
# Pre-flight Checks
# ============================================================================

echo -e "${YELLOW}📋 Running pre-flight checks...${NC}"
echo ""

# Check if API server is running
echo -n "Checking API server at ${API_BASE}... "
if curl -s "${API_BASE}/health" > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Running${NC}"
else
  echo -e "${RED}✗ Not running${NC}"
  echo ""
  echo -e "${RED}ERROR: API server not running on port 3001${NC}"
  echo ""
  echo "Please start the server first:"
  echo "  cd /workspaces/agent-feed/api-server"
  echo "  npm start"
  echo ""
  exit 1
fi

# Check if database exists
echo -n "Checking database at ${DB_PATH}... "
if [ -f "${DB_PATH}" ]; then
  echo -e "${GREEN}✓ Found${NC}"
else
  echo -e "${RED}✗ Not found${NC}"
  echo ""
  echo -e "${RED}ERROR: Database not found at ${DB_PATH}${NC}"
  exit 1
fi

# Check if comments table exists
echo -n "Checking comments table... "
if sqlite3 "${DB_PATH}" "SELECT name FROM sqlite_master WHERE type='table' AND name='comments';" | grep -q "comments"; then
  echo -e "${GREEN}✓ Exists${NC}"
else
  echo -e "${RED}✗ Missing${NC}"
  echo ""
  echo -e "${RED}ERROR: Comments table not found in database${NC}"
  echo "Please run database migrations first"
  exit 1
fi

# Check if node_modules exists
echo -n "Checking test dependencies... "
if [ -d "node_modules" ]; then
  echo -e "${GREEN}✓ Installed${NC}"
else
  echo -e "${YELLOW}✗ Not installed${NC}"
  echo ""
  echo -e "${YELLOW}Installing test dependencies...${NC}"
  npm install
  echo ""
fi

echo ""
echo -e "${GREEN}✓ All pre-flight checks passed!${NC}"
echo ""

# ============================================================================
# Test Execution
# ============================================================================

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC}  Running Tests                                                 ${BLUE}║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Build test command
TEST_CMD="npm test ${TEST_FILE}"

if [ "$WATCH_MODE" = true ]; then
  TEST_CMD="${TEST_CMD} -- --watch"
  echo -e "${YELLOW}Running in WATCH mode (press 'q' to quit)${NC}"
  echo ""
fi

if [ "$VERBOSE" = true ]; then
  TEST_CMD="${TEST_CMD} -- --reporter=verbose"
fi

if [ -n "$TEST_FILTER" ]; then
  TEST_CMD="${TEST_CMD} -- -t \"${TEST_FILTER}\""
  echo -e "${YELLOW}Running filtered tests: ${TEST_FILTER}${NC}"
  echo ""
fi

# Environment variables
export API_BASE="${API_BASE}"
export DB_PATH="${DB_PATH}"

# Run tests
echo -e "${BLUE}Executing: ${TEST_CMD}${NC}"
echo ""

if eval $TEST_CMD; then
  echo ""
  echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║${NC}  ✓ ALL TESTS PASSED!                                          ${GREEN}║${NC}"
  echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "${GREEN}Comment threading hooks are working correctly! 🎉${NC}"
  echo ""
  exit 0
else
  echo ""
  echo -e "${RED}╔════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${RED}║${NC}  ✗ TESTS FAILED                                                ${RED}║${NC}"
  echo -e "${RED}╚════════════════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "${RED}Some tests failed. Check output above for details.${NC}"
  echo ""
  echo "Troubleshooting:"
  echo "  1. Check server logs: tail -f api-server/logs/app.log"
  echo "  2. Verify WebSocket connection: wscat -c ws://localhost:3001/socket.io/"
  echo "  3. Check database: sqlite3 database.db '.schema comments'"
  echo "  4. Review test file: tests/integration/comment-hooks.test.js"
  echo ""
  exit 1
fi

# ============================================================================
# Test Statistics
# ============================================================================

echo -e "${BLUE}Test Coverage:${NC}"
echo "  • Basic comment operations"
echo "  • Comment threading (replies)"
echo "  • Comment tree building"
echo "  • Loading states"
echo "  • Error handling"
echo "  • WebSocket connection"
echo "  • Real-time events"
echo "  • End-to-end flows"
echo "  • Performance tests"
echo ""

# Database stats
COMMENT_COUNT=$(sqlite3 "${DB_PATH}" "SELECT COUNT(*) FROM comments;" 2>/dev/null || echo "0")
echo -e "${BLUE}Database Statistics:${NC}"
echo "  • Total comments: ${COMMENT_COUNT}"
echo ""

echo -e "${GREEN}For detailed documentation, see:${NC}"
echo "  tests/integration/COMMENT-HOOKS-TEST-README.md"
echo ""
