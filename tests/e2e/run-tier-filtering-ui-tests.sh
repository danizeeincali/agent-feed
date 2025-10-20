#!/bin/bash
#
# Tier Filtering UI Validation Test Runner
#
# TDD Workflow Script:
# 1. Pre-flight checks (servers, dependencies)
# 2. Run test suite
# 3. Generate reports and screenshots
# 4. Provide actionable feedback
#
# Usage:
#   ./tests/e2e/run-tier-filtering-ui-tests.sh
#
# Requirements:
#   - Frontend running on :5173
#   - Backend running on :3000
#   - Playwright installed

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test configuration
TEST_FILE="tier-filtering-ui-validation.spec.ts"
REPORT_DIR="tests/e2e/reports/tier-filtering-ui"
SCREENSHOT_DIR="tests/e2e/screenshots/tier-filtering-ui"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Tier Filtering UI Validation Test Suite${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# ========================================
# 1. PRE-FLIGHT CHECKS
# ========================================

echo -e "${YELLOW}[1/4] Running pre-flight checks...${NC}"

# Check if frontend is running
if lsof -i :5173 -s TCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Frontend server running on :5173${NC}"
else
    echo -e "${RED}✗ Frontend server NOT running on :5173${NC}"
    echo -e "${YELLOW}  Start with: cd frontend && npm run dev${NC}"
    exit 1
fi

# Check if backend is running
if lsof -i :3000 -s TCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend server running on :3000${NC}"
else
    echo -e "${RED}✗ Backend server NOT running on :3000${NC}"
    echo -e "${YELLOW}  Start with: node api-server/server.js${NC}"
    exit 1
fi

# Check if Playwright is installed
if ! npx playwright --version >/dev/null 2>&1; then
    echo -e "${RED}✗ Playwright not installed${NC}"
    echo -e "${YELLOW}  Install with: npx playwright install${NC}"
    exit 1
else
    echo -e "${GREEN}✓ Playwright installed${NC}"
fi

# Test API endpoint
if curl -s -f http://localhost:3000/api/v1/claude-live/prod/agents?tier=1 >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend API responding${NC}"
else
    echo -e "${YELLOW}⚠ Backend API may not have tier filtering endpoint yet${NC}"
    echo -e "${YELLOW}  Tests may fail - this is expected for TDD approach${NC}"
fi

echo ""

# ========================================
# 2. CREATE REPORT DIRECTORIES
# ========================================

echo -e "${YELLOW}[2/4] Creating report directories...${NC}"

mkdir -p "$REPORT_DIR"
mkdir -p "$SCREENSHOT_DIR"

echo -e "${GREEN}✓ Report directory: $REPORT_DIR${NC}"
echo -e "${GREEN}✓ Screenshot directory: $SCREENSHOT_DIR${NC}"
echo ""

# ========================================
# 3. RUN TESTS
# ========================================

echo -e "${YELLOW}[3/4] Running test suite...${NC}"
echo -e "${BLUE}Test file: $TEST_FILE${NC}"
echo -e "${BLUE}Expected: 21 tests${NC}"
echo ""

# Run tests with multiple reporters
npx playwright test "$TEST_FILE" \
  --reporter=html,line,json \
  --output="$SCREENSHOT_DIR" \
  || TEST_EXIT_CODE=$?

echo ""

# ========================================
# 4. GENERATE REPORT
# ========================================

echo -e "${YELLOW}[4/4] Generating test report...${NC}"

# Count screenshots
SCREENSHOT_COUNT=$(find "$SCREENSHOT_DIR" -name "*.png" 2>/dev/null | wc -l)

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Test Execution Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Test File: $TEST_FILE"
echo "Total Tests: 21"
echo "Test Groups:"
echo "  - Group 1: Default Behavior (3 tests)"
echo "  - Group 2: Tier Toggle Interaction (4 tests)"
echo "  - Group 3: Visual Components (4 tests)"
echo "  - Group 4: localStorage Persistence (3 tests)"
echo "  - Group 5: API Integration (3 tests)"
echo "  - Visual Regression Screenshots (4 tests)"
echo ""
echo "Screenshots Captured: $SCREENSHOT_COUNT"
echo "Screenshot Directory: $SCREENSHOT_DIR"
echo "HTML Report: playwright-report/index.html"
echo ""

if [ ${TEST_EXIT_CODE:-0} -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    echo ""
    echo "Next Steps:"
    echo "  1. View HTML report: npx playwright show-report"
    echo "  2. Review screenshots in: $SCREENSHOT_DIR"
    echo "  3. Verify visual components match design specs"
else
    echo -e "${YELLOW}⚠ Some tests failed (expected for TDD approach)${NC}"
    echo ""
    echo "TDD Workflow:"
    echo "  1. Review failing tests to understand requirements"
    echo "  2. Implement missing features (backend API, UI components)"
    echo "  3. Re-run tests: ./tests/e2e/run-tier-filtering-ui-tests.sh"
    echo "  4. Iterate until all tests pass"
    echo ""
    echo "View detailed report:"
    echo "  npx playwright show-report"
fi

echo -e "${BLUE}========================================${NC}"

exit ${TEST_EXIT_CODE:-0}
