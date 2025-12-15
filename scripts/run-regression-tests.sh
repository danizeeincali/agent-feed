#!/bin/bash

###############################################################################
# Ghost Post Fix - Regression Test Runner
###############################################################################
#
# Purpose: Run regression tests to verify AVI DM and Quick Post still work
#          after implementing the ghost post fix.
#
# Usage:
#   ./scripts/run-regression-tests.sh [OPTIONS]
#
# Options:
#   --ui          Run in interactive UI mode
#   --debug       Run in debug mode
#   --headed      Run with browser visible
#   --report      Generate HTML report after tests
#   --suite NAME  Run specific test suite (avi-dm|quick-post|feed|ghost-post)
#
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_URL="http://localhost:5173"
TEST_FILE="tests/e2e/ghost-post-regression.spec.ts"
SCREENSHOT_DIR="tests/screenshots/regression"
MAX_RETRIES=3
RETRY_DELAY=2

# Parse arguments
UI_MODE=false
DEBUG_MODE=false
HEADED=false
GENERATE_REPORT=false
TEST_SUITE=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --ui)
      UI_MODE=true
      shift
      ;;
    --debug)
      DEBUG_MODE=true
      shift
      ;;
    --headed)
      HEADED=true
      shift
      ;;
    --report)
      GENERATE_REPORT=true
      shift
      ;;
    --suite)
      TEST_SUITE="$2"
      shift 2
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Ghost Post Fix - Regression Test Suite${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Check if app is running
echo -e "${YELLOW}⟳ Checking if application is running...${NC}"

check_app_running() {
  local retries=0
  while [ $retries -lt $MAX_RETRIES ]; do
    if curl -s -o /dev/null -w "%{http_code}" "$APP_URL" | grep -q "200\|304"; then
      echo -e "${GREEN}✓ Application is running at $APP_URL${NC}"
      return 0
    fi
    retries=$((retries + 1))
    if [ $retries -lt $MAX_RETRIES ]; then
      echo -e "${YELLOW}  App not ready, retrying in ${RETRY_DELAY}s... (attempt $retries/$MAX_RETRIES)${NC}"
      sleep $RETRY_DELAY
    fi
  done
  return 1
}

if ! check_app_running; then
  echo -e "${RED}✗ Application is not running at $APP_URL${NC}"
  echo -e "${YELLOW}  Please start the application first:${NC}"
  echo -e "${YELLOW}    npm run dev${NC}"
  exit 1
fi

# Create screenshot directory
mkdir -p "$SCREENSHOT_DIR"
echo -e "${GREEN}✓ Screenshot directory ready: $SCREENSHOT_DIR${NC}"
echo ""

# Build test command
TEST_CMD="npx playwright test $TEST_FILE"

if [ "$UI_MODE" = true ]; then
  TEST_CMD="$TEST_CMD --ui"
  echo -e "${BLUE}Running in UI mode...${NC}"
elif [ "$DEBUG_MODE" = true ]; then
  TEST_CMD="$TEST_CMD --debug"
  echo -e "${BLUE}Running in debug mode...${NC}"
fi

if [ "$HEADED" = true ]; then
  TEST_CMD="$TEST_CMD --headed"
fi

if [ "$GENERATE_REPORT" = true ]; then
  TEST_CMD="$TEST_CMD --reporter=html"
fi

# Add test suite filter if specified
if [ -n "$TEST_SUITE" ]; then
  case $TEST_SUITE in
    avi-dm)
      TEST_CMD="$TEST_CMD -g 'AVI DM'"
      echo -e "${BLUE}Running AVI DM tests only${NC}"
      ;;
    quick-post)
      TEST_CMD="$TEST_CMD -g 'Quick Post'"
      echo -e "${BLUE}Running Quick Post tests only${NC}"
      ;;
    feed)
      TEST_CMD="$TEST_CMD -g 'Feed Functionality'"
      echo -e "${BLUE}Running Feed tests only${NC}"
      ;;
    ghost-post)
      TEST_CMD="$TEST_CMD -g 'Ghost Post Prevention'"
      echo -e "${BLUE}Running Ghost Post Prevention tests only${NC}"
      ;;
    *)
      echo -e "${RED}Unknown test suite: $TEST_SUITE${NC}"
      echo -e "${YELLOW}Valid suites: avi-dm, quick-post, feed, ghost-post${NC}"
      exit 1
      ;;
  esac
fi

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Running Regression Tests${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Run tests
if eval "$TEST_CMD"; then
  TEST_RESULT=0
  echo ""
  echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
  echo -e "${GREEN}  ✓ All Regression Tests Passed!${NC}"
  echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
else
  TEST_RESULT=1
  echo ""
  echo -e "${RED}═══════════════════════════════════════════════════════════${NC}"
  echo -e "${RED}  ✗ Some Tests Failed${NC}"
  echo -e "${RED}═══════════════════════════════════════════════════════════${NC}"
fi

# Display screenshots
echo ""
echo -e "${BLUE}Test Artifacts:${NC}"
echo -e "${BLUE}───────────────────────────────────────────────────────────${NC}"

if [ -d "$SCREENSHOT_DIR" ] && [ "$(ls -A $SCREENSHOT_DIR)" ]; then
  echo -e "${GREEN}Screenshots:${NC}"
  ls -lh "$SCREENSHOT_DIR"/*.png 2>/dev/null || echo "  No screenshots generated"
else
  echo -e "${YELLOW}No screenshots found${NC}"
fi

if [ -d "test-results" ] && [ "$(ls -A test-results)" ]; then
  echo ""
  echo -e "${GREEN}Test Results:${NC}"
  echo "  Location: test-results/"
  echo "  Videos: $(find test-results -name "*.webm" | wc -l) file(s)"
  echo "  Traces: $(find test-results -name "*.zip" | wc -l) file(s)"
fi

# Generate report if requested
if [ "$GENERATE_REPORT" = true ]; then
  echo ""
  echo -e "${BLUE}Generating HTML report...${NC}"
  npx playwright show-report
fi

# Summary
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Test Summary${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo "  Application URL: $APP_URL"
echo "  Test File: $TEST_FILE"
echo "  Screenshot Dir: $SCREENSHOT_DIR"
echo ""

if [ $TEST_RESULT -eq 0 ]; then
  echo -e "${GREEN}  Status: ✓ PASS${NC}"
  echo ""
  echo -e "${GREEN}  ✓ AVI DM functionality verified${NC}"
  echo -e "${GREEN}  ✓ Quick Post functionality verified${NC}"
  echo -e "${GREEN}  ✓ Feed functionality verified${NC}"
  echo -e "${GREEN}  ✓ Ghost post prevention validated${NC}"
else
  echo -e "${RED}  Status: ✗ FAIL${NC}"
  echo ""
  echo -e "${YELLOW}  Review test output and artifacts for details${NC}"
  echo -e "${YELLOW}  Run with --ui flag for interactive debugging${NC}"
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"

exit $TEST_RESULT
