#!/bin/bash

###############################################################################
# Toast Backend Events E2E Validation Script
#
# Runs comprehensive Playwright tests for the complete toast notification
# sequence with REAL backend events and screenshot capture.
#
# Usage:
#   ./scripts/run-toast-backend-validation.sh
#   ./scripts/run-toast-backend-validation.sh --headed  # Run with browser UI
#   ./scripts/run-toast-backend-validation.sh --debug   # Run with debug mode
###############################################################################

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
CONFIG_FILE="playwright.config.toast-backend-validation.cjs"
TEST_FILE="tests/playwright/toast-backend-events-e2e.spec.ts"
SCREENSHOT_DIR="docs/validation/screenshots/toast-backend-events"
RESULTS_JSON="tests/e2e/toast-backend-results.json"
JUNIT_XML="tests/e2e/toast-backend-junit.xml"
REPORT_DIR="tests/e2e/toast-backend-report"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Toast Backend Events E2E Validation${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Parse command line arguments
HEADED=""
DEBUG=""
PROJECT=""

for arg in "$@"; do
  case $arg in
    --headed)
      HEADED="--headed"
      echo -e "${YELLOW}Running in HEADED mode (browser visible)${NC}"
      ;;
    --debug)
      DEBUG="--debug"
      echo -e "${YELLOW}Running in DEBUG mode${NC}"
      ;;
    --desktop)
      PROJECT="--project=toast-sequence-desktop"
      echo -e "${YELLOW}Running DESKTOP viewport only${NC}"
      ;;
    --tablet)
      PROJECT="--project=toast-sequence-tablet"
      echo -e "${YELLOW}Running TABLET viewport only${NC}"
      ;;
    --mobile)
      PROJECT="--project=toast-sequence-mobile"
      echo -e "${YELLOW}Running MOBILE viewport only${NC}"
      ;;
  esac
done

echo ""

# Step 1: Verify dependencies
echo -e "${BLUE}Step 1: Verifying dependencies...${NC}"

if ! command -v npx &> /dev/null; then
  echo -e "${RED}ERROR: npx not found. Please install Node.js${NC}"
  exit 1
fi

if [ ! -f "package.json" ]; then
  echo -e "${RED}ERROR: package.json not found. Are you in the project root?${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Dependencies verified${NC}"
echo ""

# Step 2: Install Playwright browsers if needed
echo -e "${BLUE}Step 2: Checking Playwright browsers...${NC}"

if ! npx playwright --version &> /dev/null; then
  echo -e "${YELLOW}Installing Playwright...${NC}"
  npm install --save-dev @playwright/test
fi

npx playwright install chromium --with-deps
echo -e "${GREEN}✓ Playwright browsers ready${NC}"
echo ""

# Step 3: Ensure screenshot directories exist
echo -e "${BLUE}Step 3: Preparing screenshot directories...${NC}"

mkdir -p "$SCREENSHOT_DIR/sequence"
mkdir -p "$SCREENSHOT_DIR/websocket"
mkdir -p "$SCREENSHOT_DIR/timing"
mkdir -p "$SCREENSHOT_DIR/multiple"
mkdir -p "$SCREENSHOT_DIR/responsive"

echo -e "${GREEN}✓ Screenshot directories ready${NC}"
echo ""

# Step 4: Clean previous results
echo -e "${BLUE}Step 4: Cleaning previous test results...${NC}"

rm -f "$RESULTS_JSON"
rm -f "$JUNIT_XML"
rm -rf "$REPORT_DIR"

echo -e "${GREEN}✓ Previous results cleaned${NC}"
echo ""

# Step 5: Run Playwright tests
echo -e "${BLUE}Step 5: Running Playwright E2E tests...${NC}"
echo ""

START_TIME=$(date +%s)

# Build the command
COMMAND="npx playwright test --config=$CONFIG_FILE"

if [ -n "$PROJECT" ]; then
  COMMAND="$COMMAND $PROJECT"
fi

if [ -n "$HEADED" ]; then
  COMMAND="$COMMAND --headed"
fi

if [ -n "$DEBUG" ]; then
  COMMAND="$COMMAND --debug"
fi

echo -e "${YELLOW}Executing: $COMMAND${NC}"
echo ""

# Run tests
if $COMMAND; then
  TEST_EXIT_CODE=0
  echo ""
  echo -e "${GREEN}✓ All tests passed!${NC}"
else
  TEST_EXIT_CODE=$?
  echo ""
  echo -e "${RED}✗ Some tests failed (exit code: $TEST_EXIT_CODE)${NC}"
fi

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo -e "${BLUE}Test execution completed in ${DURATION} seconds${NC}"
echo ""

# Step 6: Display results summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Test Results Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Count screenshots
if [ -d "$SCREENSHOT_DIR" ]; then
  SCREENSHOT_COUNT=$(find "$SCREENSHOT_DIR" -type f -name "*.png" | wc -l)
  echo -e "Screenshots captured: ${GREEN}$SCREENSHOT_COUNT${NC}"
  echo ""

  echo -e "${BLUE}Screenshots by category:${NC}"
  echo "  Sequence:    $(find "$SCREENSHOT_DIR/sequence" -type f -name "*.png" 2>/dev/null | wc -l)"
  echo "  WebSocket:   $(find "$SCREENSHOT_DIR/websocket" -type f -name "*.png" 2>/dev/null | wc -l)"
  echo "  Timing:      $(find "$SCREENSHOT_DIR/timing" -type f -name "*.png" 2>/dev/null | wc -l)"
  echo "  Multiple:    $(find "$SCREENSHOT_DIR/multiple" -type f -name "*.png" 2>/dev/null | wc -l)"
  echo "  Responsive:  $(find "$SCREENSHOT_DIR/responsive" -type f -name "*.png" 2>/dev/null | wc -l)"
  echo ""
fi

# Parse JSON results if available
if [ -f "$RESULTS_JSON" ]; then
  echo -e "${BLUE}Test execution details:${NC}"

  if command -v jq &> /dev/null; then
    TOTAL=$(jq '.suites[].specs | length' "$RESULTS_JSON" | awk '{s+=$1} END {print s}')
    PASSED=$(jq '[.suites[].specs[].tests[] | select(.status == "passed")] | length' "$RESULTS_JSON")
    FAILED=$(jq '[.suites[].specs[].tests[] | select(.status == "failed")] | length' "$RESULTS_JSON")

    echo "  Total tests:  $TOTAL"
    echo -e "  Passed:       ${GREEN}$PASSED${NC}"
    if [ "$FAILED" -gt 0 ]; then
      echo -e "  Failed:       ${RED}$FAILED${NC}"
    else
      echo "  Failed:       0"
    fi
  else
    echo -e "${YELLOW}  Install 'jq' for detailed test statistics${NC}"
  fi
  echo ""
fi

# Display report location
if [ -d "$REPORT_DIR" ]; then
  echo -e "${BLUE}HTML Report:${NC}"
  echo "  $REPORT_DIR/index.html"
  echo ""
  echo -e "${YELLOW}To view the report, run:${NC}"
  echo "  npx playwright show-report $REPORT_DIR"
  echo ""
fi

# Display artifact locations
echo -e "${BLUE}Test Artifacts:${NC}"
echo "  Config:      $CONFIG_FILE"
echo "  Test file:   $TEST_FILE"
echo "  Screenshots: $SCREENSHOT_DIR/"
echo "  JSON report: $RESULTS_JSON"
echo "  JUnit XML:   $JUNIT_XML"
echo "  HTML report: $REPORT_DIR/"
echo ""

# Final status
echo -e "${BLUE}========================================${NC}"
if [ $TEST_EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}✓ Toast Backend Validation: PASSED${NC}"
  echo -e "${BLUE}========================================${NC}"
  exit 0
else
  echo -e "${RED}✗ Toast Backend Validation: FAILED${NC}"
  echo -e "${BLUE}========================================${NC}"
  echo ""
  echo -e "${YELLOW}Check the HTML report for details:${NC}"
  echo "  npx playwright show-report $REPORT_DIR"
  exit $TEST_EXIT_CODE
fi
