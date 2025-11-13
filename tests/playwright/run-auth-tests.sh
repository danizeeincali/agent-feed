#!/bin/bash

#########################################
# Authentication DM/Post Flow Test Runner
#########################################
#
# This script runs the Playwright authentication validation tests
# with proper environment setup and error handling.
#
# Usage:
#   ./tests/playwright/run-auth-tests.sh [scenario]
#
# Examples:
#   ./tests/playwright/run-auth-tests.sh           # Run all scenarios
#   ./tests/playwright/run-auth-tests.sh 1         # Run Scenario 1 only
#   ./tests/playwright/run-auth-tests.sh debug     # Run in debug mode

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TEST_FILE="tests/playwright/ui-validation/auth-dm-post-flow.spec.js"
SCREENSHOT_DIR="docs/validation/screenshots"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:5173}"
API_URL="${API_URL:-http://localhost:3001}"

echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Authentication DM/Post Flow - Playwright Test Runner${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""

# Check prerequisites
echo -e "${YELLOW}📋 Checking prerequisites...${NC}"

# 1. Check if frontend is running
if curl -s "${FRONTEND_URL}" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend is running at ${FRONTEND_URL}${NC}"
else
    echo -e "${RED}❌ Frontend is NOT running at ${FRONTEND_URL}${NC}"
    echo -e "${YELLOW}   Start with: npm run dev --workspace=frontend${NC}"
    exit 1
fi

# 2. Check if API server is running
if curl -s "${API_URL}/api/claude-code/test" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ API server is running at ${API_URL}${NC}"
else
    echo -e "${RED}❌ API server is NOT running at ${API_URL}${NC}"
    echo -e "${YELLOW}   Start with: npm start${NC}"
    exit 1
fi

# 3. Create screenshot directory
mkdir -p "${SCREENSHOT_DIR}"
echo -e "${GREEN}✅ Screenshot directory ready: ${SCREENSHOT_DIR}${NC}"

# 4. Check if Playwright is installed
if ! npx playwright --version > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Playwright not found. Installing...${NC}"
    npm install --save-dev @playwright/test
    npx playwright install chromium
fi

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Running Tests${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""

# Determine which scenario to run
SCENARIO="${1:-all}"

case "$SCENARIO" in
  1)
    echo -e "${YELLOW}🧪 Running Scenario 1: OAuth User Sends DM${NC}"
    npx playwright test "${TEST_FILE}" -g "Scenario 1"
    ;;
  2)
    echo -e "${YELLOW}🧪 Running Scenario 2: API Key User Creates Post${NC}"
    npx playwright test "${TEST_FILE}" -g "Scenario 2"
    ;;
  3)
    echo -e "${YELLOW}🧪 Running Scenario 3: Unauthenticated User${NC}"
    npx playwright test "${TEST_FILE}" -g "Scenario 3"
    ;;
  4)
    echo -e "${YELLOW}🧪 Running Scenario 4: Real OAuth Detection${NC}"
    npx playwright test "${TEST_FILE}" -g "Scenario 4"
    ;;
  debug)
    echo -e "${YELLOW}🐛 Running in DEBUG mode${NC}"
    npx playwright test "${TEST_FILE}" --debug
    ;;
  headed)
    echo -e "${YELLOW}👁️  Running in HEADED mode (visible browser)${NC}"
    npx playwright test "${TEST_FILE}" --headed
    ;;
  all)
    echo -e "${YELLOW}🧪 Running ALL scenarios${NC}"
    npx playwright test "${TEST_FILE}"
    ;;
  *)
    echo -e "${RED}❌ Invalid scenario: ${SCENARIO}${NC}"
    echo -e "${YELLOW}Usage: $0 [1|2|3|4|all|debug|headed]${NC}"
    exit 1
    ;;
esac

# Test results
TEST_EXIT_CODE=$?

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Test Results${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ All tests PASSED${NC}"
    echo ""
    echo -e "${YELLOW}📸 Screenshots saved to:${NC}"
    echo -e "   ${SCREENSHOT_DIR}"
    echo ""

    # List screenshots
    if [ -d "${SCREENSHOT_DIR}" ]; then
        SCREENSHOT_COUNT=$(ls -1 "${SCREENSHOT_DIR}"/auth-fix-*.png 2>/dev/null | wc -l)
        echo -e "${GREEN}   Found ${SCREENSHOT_COUNT} screenshots:${NC}"
        ls -1 "${SCREENSHOT_DIR}"/auth-fix-*.png 2>/dev/null | while read screenshot; do
            echo -e "   - $(basename "$screenshot")"
        done
    fi

    echo ""
    echo -e "${YELLOW}📊 View HTML Report:${NC}"
    echo -e "   npx playwright show-report"
    echo ""
else
    echo -e "${RED}❌ Tests FAILED${NC}"
    echo ""
    echo -e "${YELLOW}📋 Troubleshooting:${NC}"
    echo -e "   1. Check browser console for errors"
    echo -e "   2. Review screenshots in ${SCREENSHOT_DIR}"
    echo -e "   3. Run in headed mode: $0 headed"
    echo -e "   4. Run in debug mode: $0 debug"
    echo ""
fi

echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"

exit $TEST_EXIT_CODE
