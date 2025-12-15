#!/bin/bash

###############################################################################
# Avi DM OAuth Validation - Test Runner Script
#
# This script automates the execution of Playwright tests for Avi DM OAuth
# validation, including prerequisite checks and result reporting.
#
# Usage:
#   ./scripts/run-avi-oauth-tests.sh [options]
#
# Options:
#   --headed       Run tests with visible browser
#   --debug        Run tests in debug mode
#   --scenario N   Run only scenario N (1-5)
#   --skip-checks  Skip prerequisite checks
#   --help         Show this help message
###############################################################################

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
FRONTEND_URL="${FRONTEND_URL:-http://localhost:5173}"
API_URL="${API_URL:-http://localhost:3001}"
SCREENSHOT_DIR="docs/validation/screenshots/avi-oauth"
CONFIG_FILE="playwright.config.avi-oauth.cjs"

# Parse command line arguments
HEADLESS=true
DEBUG=false
SCENARIO=""
SKIP_CHECKS=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --headed)
      HEADLESS=false
      shift
      ;;
    --debug)
      DEBUG=true
      shift
      ;;
    --scenario)
      SCENARIO="$2"
      shift 2
      ;;
    --skip-checks)
      SKIP_CHECKS=true
      shift
      ;;
    --help)
      head -n 20 "$0" | tail -n 15
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Header
echo -e "${BLUE}"
echo "================================================================================"
echo "  Avi DM OAuth Validation - Test Runner"
echo "================================================================================"
echo -e "${NC}"

# Step 1: Prerequisite Checks
if [ "$SKIP_CHECKS" = false ]; then
  echo -e "${YELLOW}Step 1: Checking Prerequisites...${NC}\n"

  # Check if frontend is running
  echo -n "  - Frontend ($FRONTEND_URL): "
  if curl -s "$FRONTEND_URL" > /dev/null; then
    echo -e "${GREEN}✓ Running${NC}"
  else
    echo -e "${RED}✗ Not running${NC}"
    echo -e "${YELLOW}    Start with: npm run dev${NC}"
    exit 1
  fi

  # Check if API server is running
  echo -n "  - API Server ($API_URL/health): "
  if curl -s "$API_URL/health" > /dev/null; then
    echo -e "${GREEN}✓ Running${NC}"
  else
    echo -e "${RED}✗ Not running${NC}"
    echo -e "${YELLOW}    Start with: npm run server${NC}"
    exit 1
  fi

  # Check Claude CLI authentication
  echo -n "  - Claude CLI Authentication: "
  if command -v claude &> /dev/null; then
    if claude auth status &> /dev/null; then
      echo -e "${GREEN}✓ Authenticated${NC}"
    else
      echo -e "${YELLOW}⚠ Not authenticated${NC}"
      echo -e "${YELLOW}    Login with: claude login${NC}"
      echo -e "${YELLOW}    (Tests may still run but OAuth detection will fail)${NC}"
    fi
  else
    echo -e "${YELLOW}⚠ Claude CLI not found${NC}"
    echo -e "${YELLOW}    (Tests may still run but OAuth detection will fail)${NC}"
  fi

  # Check screenshot directory
  echo -n "  - Screenshot Directory: "
  if [ -d "$SCREENSHOT_DIR" ]; then
    echo -e "${GREEN}✓ Exists${NC}"
  else
    echo -e "${YELLOW}⚠ Creating...${NC}"
    mkdir -p "$SCREENSHOT_DIR"
    echo -e "${GREEN}    ✓ Created${NC}"
  fi

  echo ""
else
  echo -e "${YELLOW}Skipping prerequisite checks (--skip-checks)${NC}\n"
fi

# Step 2: Run Tests
echo -e "${YELLOW}Step 2: Running Playwright Tests...${NC}\n"

# Build test command
TEST_CMD="npx playwright test --config=$CONFIG_FILE"

# Add scenario filter if specified
if [ -n "$SCENARIO" ]; then
  TEST_CMD="$TEST_CMD -g \"Scenario $SCENARIO\""
  echo -e "  Running only: ${BLUE}Scenario $SCENARIO${NC}\n"
fi

# Add headed mode if specified
if [ "$HEADLESS" = false ]; then
  export HEADLESS=false
  echo -e "  Mode: ${BLUE}Headed (browser visible)${NC}\n"
fi

# Add debug mode if specified
if [ "$DEBUG" = true ]; then
  TEST_CMD="$TEST_CMD --debug"
  echo -e "  Mode: ${BLUE}Debug (Playwright Inspector)${NC}\n"
fi

# Execute tests
echo -e "${BLUE}Executing: $TEST_CMD${NC}\n"
echo "--------------------------------------------------------------------------------"

if eval "$TEST_CMD"; then
  TEST_RESULT="PASSED"
  TEST_COLOR=$GREEN
else
  TEST_RESULT="FAILED"
  TEST_COLOR=$RED
fi

echo "--------------------------------------------------------------------------------"
echo ""

# Step 3: Report Results
echo -e "${YELLOW}Step 3: Test Results Summary${NC}\n"

echo -e "  Test Status: ${TEST_COLOR}${TEST_RESULT}${NC}"

# Count screenshots
if [ -d "$SCREENSHOT_DIR" ]; then
  SCREENSHOT_COUNT=$(find "$SCREENSHOT_DIR" -type f -name "*.png" | wc -l)
  echo -e "  Screenshots: ${GREEN}$SCREENSHOT_COUNT captured${NC}"
else
  echo -e "  Screenshots: ${RED}Directory not found${NC}"
fi

# Check for reports
if [ -f "tests/playwright/ui-validation/results/avi-oauth-results.json" ]; then
  echo -e "  JSON Report: ${GREEN}✓ Generated${NC}"
else
  echo -e "  JSON Report: ${RED}✗ Not found${NC}"
fi

if [ -d "tests/playwright/ui-validation/results/avi-oauth-report" ]; then
  echo -e "  HTML Report: ${GREEN}✓ Generated${NC}"
else
  echo -e "  HTML Report: ${RED}✗ Not found${NC}"
fi

echo ""

# Step 4: Next Steps
echo -e "${YELLOW}Step 4: Next Steps${NC}\n"

if [ "$TEST_RESULT" = "PASSED" ]; then
  echo -e "  ${GREEN}✓ All tests passed!${NC}\n"
  echo "  View results:"
  echo "    - HTML Report: npx playwright show-report tests/playwright/ui-validation/results/avi-oauth-report"
  echo "    - Screenshots: open $SCREENSHOT_DIR"
  echo ""
else
  echo -e "  ${RED}✗ Some tests failed${NC}\n"
  echo "  Troubleshooting:"
  echo "    - Review console output above"
  echo "    - Check screenshots: open $SCREENSHOT_DIR"
  echo "    - Run in headed mode: $0 --headed"
  echo "    - Run in debug mode: $0 --debug"
  echo "    - Check backend logs"
  echo ""
fi

# Footer
echo -e "${BLUE}"
echo "================================================================================"
echo "  Test Execution Complete"
echo "================================================================================"
echo -e "${NC}"

# Exit with test result
if [ "$TEST_RESULT" = "PASSED" ]; then
  exit 0
else
  exit 1
fi
