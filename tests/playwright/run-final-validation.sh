#!/bin/bash

################################################################################
# Final 4-Issue Validation Test Runner
#
# Executes comprehensive Playwright tests to validate all 4 critical fixes:
# 1. WebSocket connection stability (>30 seconds)
# 2. Avatar display name correctness ("D" for Dunedain)
# 3. Comment counter real-time updates (0→1 without refresh)
# 4. Toast notification for agent responses
#
# Usage:
#   ./run-final-validation.sh           # Run all tests
#   ./run-final-validation.sh --headed  # Run with browser UI
#   ./run-final-validation.sh --debug   # Run with Playwright Inspector
################################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Directories
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TESTS_DIR="${PROJECT_ROOT}/tests/playwright"
SCREENSHOTS_DIR="${PROJECT_ROOT}/docs/validation/screenshots/final-4-issue-validation"
RESULTS_DIR="${PROJECT_ROOT}/tests/playwright/results"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║        Final 4-Issue Validation Test Suite                    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Parse arguments
HEADED_FLAG=""
DEBUG_FLAG=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --headed)
      HEADED_FLAG="--headed"
      echo -e "${YELLOW}🖥️  Running in HEADED mode (browser visible)${NC}"
      shift
      ;;
    --debug)
      DEBUG_FLAG="--debug"
      echo -e "${YELLOW}🐛 Running in DEBUG mode (Playwright Inspector)${NC}"
      shift
      ;;
    *)
      echo -e "${RED}❌ Unknown option: $1${NC}"
      echo "Usage: $0 [--headed] [--debug]"
      exit 1
      ;;
  esac
done

echo ""

# Create necessary directories
echo -e "${BLUE}📁 Creating test directories...${NC}"
mkdir -p "$SCREENSHOTS_DIR"
mkdir -p "$RESULTS_DIR"

# Check if backend and frontend are running
echo -e "${BLUE}🔍 Checking services...${NC}"

if ! curl -s http://localhost:3001/health > /dev/null 2>&1; then
  echo -e "${RED}❌ Backend not running on http://localhost:3001${NC}"
  echo -e "${YELLOW}   Start backend: npm run server${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Backend running on http://localhost:3001${NC}"

if ! curl -s http://localhost:5173 > /dev/null 2>&1; then
  echo -e "${RED}❌ Frontend not running on http://localhost:5173${NC}"
  echo -e "${YELLOW}   Start frontend: npm run dev${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Frontend running on http://localhost:5173${NC}"

echo ""

# Run Playwright tests
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Running Playwright Tests                                     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

cd "$PROJECT_ROOT"

# Construct Playwright command
PLAYWRIGHT_CMD="npx playwright test tests/playwright/final-4-issue-validation.spec.ts"

if [[ -n "$HEADED_FLAG" ]]; then
  PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD --headed"
fi

if [[ -n "$DEBUG_FLAG" ]]; then
  PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD --debug"
fi

# Add reporter flags
PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD --reporter=list,json,junit"

echo -e "${YELLOW}📝 Command: $PLAYWRIGHT_CMD${NC}"
echo ""

# Run tests
if eval "$PLAYWRIGHT_CMD"; then
  TEST_EXIT_CODE=0
  echo ""
  echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║  ✅ ALL TESTS PASSED                                           ║${NC}"
  echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
else
  TEST_EXIT_CODE=$?
  echo ""
  echo -e "${RED}╔════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${RED}║  ❌ SOME TESTS FAILED                                          ║${NC}"
  echo -e "${RED}╚════════════════════════════════════════════════════════════════╝${NC}"
fi

echo ""

# Test summary
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Test Summary                                                  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📊 Test Results:${NC}"
echo -e "   Location: ${RESULTS_DIR}"
echo ""
echo -e "${BLUE}📸 Screenshots:${NC}"
echo -e "   Location: ${SCREENSHOTS_DIR}"
echo ""

# List screenshots
if [ -d "$SCREENSHOTS_DIR" ] && [ "$(ls -A $SCREENSHOTS_DIR)" ]; then
  echo -e "${BLUE}📷 Generated Screenshots:${NC}"
  ls -1 "$SCREENSHOTS_DIR" | head -20 | while read file; do
    echo -e "   - ${file}"
  done

  SCREENSHOT_COUNT=$(ls -1 "$SCREENSHOTS_DIR" | wc -l)
  if [ "$SCREENSHOT_COUNT" -gt 20 ]; then
    echo -e "   ... and $((SCREENSHOT_COUNT - 20)) more"
  fi
  echo ""
fi

# Print test execution summary
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Test Coverage                                                 ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✅ ISSUE-1:${NC} WebSocket stability (>30 seconds)"
echo -e "${GREEN}✅ ISSUE-2:${NC} Avatar display name (\"D\" for Dunedain)"
echo -e "${GREEN}✅ ISSUE-3:${NC} Comment counter real-time updates"
echo -e "${GREEN}✅ ISSUE-4:${NC} Toast notification for agent responses"
echo -e "${GREEN}✅ REGRESSION:${NC} No console errors"
echo -e "${GREEN}✅ INTEGRATION:${NC} All fixes working together"
echo ""

# Next steps
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Next Steps                                                    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ $TEST_EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}✅ All tests passed! Ready for production deployment.${NC}"
  echo ""
  echo -e "${BLUE}📋 Review test artifacts:${NC}"
  echo -e "   1. View screenshots: ${SCREENSHOTS_DIR}"
  echo -e "   2. Check JUnit report: ${RESULTS_DIR}/junit-results.xml"
  echo -e "   3. Review JSON report: ${RESULTS_DIR}/test-results.json"
  echo ""
  echo -e "${BLUE}📝 Documentation:${NC}"
  echo -e "   - Read test plan: ${PROJECT_ROOT}/docs/AGENT9-TEST-PLAN.md"
  echo -e "   - View execution summary: ${PROJECT_ROOT}/docs/AGENT9-EXECUTION-SUMMARY.md"
else
  echo -e "${RED}❌ Tests failed. Review failure details above.${NC}"
  echo ""
  echo -e "${YELLOW}🔍 Debugging steps:${NC}"
  echo -e "   1. Check screenshots: ${SCREENSHOTS_DIR}"
  echo -e "   2. Review console logs in test output"
  echo -e "   3. Run with browser UI: $0 --headed"
  echo -e "   4. Use Playwright Inspector: $0 --debug"
  echo ""
  echo -e "${YELLOW}📚 Common issues:${NC}"
  echo -e "   - WebSocket not staying connected: Check socket.ts cleanup logic"
  echo -e "   - Avatar showing wrong initial: Verify UserDisplayName component"
  echo -e "   - Counter not updating: Check WebSocket event handlers in PostCard"
  echo -e "   - Toast not appearing: Review toast notification code in PostCard"
fi

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Test Execution Complete                                       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"

exit $TEST_EXIT_CODE
