#!/bin/bash

###############################################################################
# Processing Pills & Display Name E2E Test Runner
#
# This script runs comprehensive E2E tests for both fixes:
# 1. Processing pill visibility during comment/reply submission
# 2. Display name showing "John Connor" instead of "user"
#
# Usage:
#   ./tests/playwright/run-both-fixes-validation.sh [options]
#
# Options:
#   --headed       Run tests in headed mode (visible browser)
#   --debug        Run tests in debug mode with Playwright Inspector
#   --ui           Run tests with Playwright UI mode
#   --browser      Specify browser: chromium, firefox, webkit (default: chromium)
#   --update-snapshots  Update visual snapshots
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
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCREENSHOT_DIR="$PROJECT_ROOT/tests/playwright/screenshots/both-fixes"
REPORT_DIR="$PROJECT_ROOT/tests/playwright/reports/both-fixes"
CONFIG_FILE="$PROJECT_ROOT/playwright.config.both-fixes.ts"

# Parse command line arguments
HEADED=""
DEBUG=""
UI_MODE=""
BROWSER="chromium"
UPDATE_SNAPSHOTS=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --headed)
      HEADED="--headed"
      shift
      ;;
    --debug)
      DEBUG="--debug"
      shift
      ;;
    --ui)
      UI_MODE="--ui"
      shift
      ;;
    --browser)
      BROWSER="$2"
      shift 2
      ;;
    --update-snapshots)
      UPDATE_SNAPSHOTS="--update-snapshots"
      shift
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Processing Pills & Display Name E2E Test Suite          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Step 1: Create directories
echo -e "${YELLOW}[1/6] Creating test directories...${NC}"
mkdir -p "$SCREENSHOT_DIR"
mkdir -p "$REPORT_DIR"
echo -e "${GREEN}✓ Directories created${NC}"
echo ""

# Step 2: Check if backend is running
echo -e "${YELLOW}[2/6] Checking backend services...${NC}"
if ! curl -s http://localhost:3001/health > /dev/null 2>&1; then
  echo -e "${RED}✗ Backend is not running on port 3001${NC}"
  echo -e "${YELLOW}  Starting backend...${NC}"
  cd "$PROJECT_ROOT/api-server"
  npm start > /dev/null 2>&1 &
  BACKEND_PID=$!
  echo -e "${GREEN}✓ Backend started (PID: $BACKEND_PID)${NC}"
  sleep 5
else
  echo -e "${GREEN}✓ Backend is running${NC}"
  BACKEND_PID=""
fi
echo ""

# Step 3: Check if frontend is running
echo -e "${YELLOW}[3/6] Checking frontend services...${NC}"
if ! curl -s http://localhost:5173 > /dev/null 2>&1; then
  echo -e "${RED}✗ Frontend is not running on port 5173${NC}"
  echo -e "${YELLOW}  Starting frontend...${NC}"
  cd "$PROJECT_ROOT/frontend"
  npm run dev > /dev/null 2>&1 &
  FRONTEND_PID=$!
  echo -e "${GREEN}✓ Frontend started (PID: $FRONTEND_PID)${NC}"
  sleep 5
else
  echo -e "${GREEN}✓ Frontend is running${NC}"
  FRONTEND_PID=""
fi
echo ""

# Step 4: Install Playwright browsers if needed
echo -e "${YELLOW}[4/6] Checking Playwright installation...${NC}"
if ! npx playwright --version > /dev/null 2>&1; then
  echo -e "${YELLOW}  Installing Playwright...${NC}"
  npm install -D @playwright/test
fi

if [ ! -d "$HOME/.cache/ms-playwright" ]; then
  echo -e "${YELLOW}  Installing Playwright browsers...${NC}"
  npx playwright install
fi
echo -e "${GREEN}✓ Playwright ready${NC}"
echo ""

# Step 5: Run tests
echo -e "${YELLOW}[5/6] Running E2E tests...${NC}"
echo -e "${BLUE}Browser: $BROWSER${NC}"
echo -e "${BLUE}Config: $CONFIG_FILE${NC}"
echo ""

cd "$PROJECT_ROOT"

if [ -n "$UI_MODE" ]; then
  # Run in UI mode
  npx playwright test \
    --config="$CONFIG_FILE" \
    --project="$BROWSER" \
    $UI_MODE
elif [ -n "$DEBUG" ]; then
  # Run in debug mode
  npx playwright test \
    --config="$CONFIG_FILE" \
    --project="$BROWSER" \
    $DEBUG $HEADED
else
  # Run normally
  npx playwright test \
    --config="$CONFIG_FILE" \
    --project="$BROWSER" \
    $HEADED $UPDATE_SNAPSHOTS
fi

TEST_EXIT_CODE=$?

echo ""

# Step 6: Generate report
echo -e "${YELLOW}[6/6] Generating test report...${NC}"

if [ $TEST_EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║                  ALL TESTS PASSED ✓                        ║${NC}"
  echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
else
  echo -e "${RED}╔════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${RED}║                  SOME TESTS FAILED ✗                       ║${NC}"
  echo -e "${RED}╚════════════════════════════════════════════════════════════╝${NC}"
fi

echo ""
echo -e "${BLUE}📊 Test Artifacts:${NC}"
echo -e "  Screenshots: ${SCREENSHOT_DIR}"
echo -e "  HTML Report: ${REPORT_DIR}/index.html"
echo -e "  JSON Results: ${REPORT_DIR}/results.json"
echo ""

# Count screenshots
SCREENSHOT_COUNT=$(find "$SCREENSHOT_DIR" -name "*.png" 2>/dev/null | wc -l)
echo -e "${BLUE}📸 Screenshots captured: ${SCREENSHOT_COUNT}${NC}"
echo ""

# Show HTML report
if [ -f "$REPORT_DIR/index.html" ]; then
  echo -e "${YELLOW}To view the HTML report, run:${NC}"
  echo -e "  npx playwright show-report $REPORT_DIR"
  echo ""
fi

# Cleanup background processes
if [ -n "$BACKEND_PID" ]; then
  echo -e "${YELLOW}Stopping backend (PID: $BACKEND_PID)...${NC}"
  kill $BACKEND_PID 2>/dev/null || true
fi

if [ -n "$FRONTEND_PID" ]; then
  echo -e "${YELLOW}Stopping frontend (PID: $FRONTEND_PID)...${NC}"
  kill $FRONTEND_PID 2>/dev/null || true
fi

exit $TEST_EXIT_CODE
