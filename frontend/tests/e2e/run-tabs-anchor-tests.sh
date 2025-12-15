#!/bin/bash

##############################################################################
# TABS AND ANCHOR NAVIGATION TEST RUNNER
##############################################################################
#
# This script runs comprehensive E2E tests for:
# - Tabs Component Functionality (8 tests)
# - Anchor Navigation Functionality (8 tests)
# - Combined Scenarios (5 tests)
#
# Total: 21 tests
#
# Prerequisites:
# - Frontend server running on http://localhost:5173
# - Playwright installed
# - Test page available at /agents/page-builder-agent/pages/component-showcase-and-examples
#
##############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
TEST_FILE="tests/e2e/tabs-and-anchor-validation.spec.ts"
SCREENSHOT_DIR="/tmp/screenshots"
BASE_URL="http://localhost:5173"
TEST_URL="${BASE_URL}/agents/page-builder-agent/pages/component-showcase-and-examples"

echo -e "${BLUE}═══════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  TABS & ANCHOR NAVIGATION VALIDATION TEST SUITE${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════${NC}"
echo ""

# Create screenshot directory
echo -e "${YELLOW}📁 Creating screenshot directory...${NC}"
mkdir -p "$SCREENSHOT_DIR"
echo -e "${GREEN}✓ Screenshot directory ready: $SCREENSHOT_DIR${NC}"
echo ""

# Check if server is running
echo -e "${YELLOW}🔍 Checking if frontend server is running...${NC}"
if curl -s -f "$BASE_URL" > /dev/null; then
    echo -e "${GREEN}✓ Frontend server is running${NC}"
else
    echo -e "${RED}✗ Frontend server is not running!${NC}"
    echo -e "${YELLOW}Please start the server with: npm run dev${NC}"
    exit 1
fi
echo ""

# Check if test page is accessible
echo -e "${YELLOW}🔍 Verifying test page is accessible...${NC}"
if curl -s -f "$TEST_URL" > /dev/null; then
    echo -e "${GREEN}✓ Test page is accessible${NC}"
else
    echo -e "${YELLOW}⚠ Warning: Test page may not be accessible${NC}"
    echo -e "${YELLOW}URL: $TEST_URL${NC}"
fi
echo ""

# Display test information
echo -e "${BLUE}Test Configuration:${NC}"
echo -e "  Test File: ${GREEN}$TEST_FILE${NC}"
echo -e "  Target URL: ${GREEN}$TEST_URL${NC}"
echo -e "  Screenshots: ${GREEN}$SCREENSHOT_DIR${NC}"
echo ""

echo -e "${BLUE}Test Coverage:${NC}"
echo -e "  ${GREEN}✓${NC} Tabs Component Tests (8 tests)"
echo -e "    - React hook error detection"
echo -e "    - Component rendering validation"
echo -e "    - Tab switching functionality"
echo -e "    - ARIA accessibility attributes"
echo -e "    - Visual regression testing"
echo -e "    - State persistence"
echo ""
echo -e "  ${GREEN}✓${NC} Anchor Navigation Tests (8 tests)"
echo -e "    - Sidebar anchor link verification"
echo -e "    - Header ID attribute inspection"
echo -e "    - Click and scroll behavior"
echo -e "    - URL hash updates"
echo -e "    - Browser history navigation"
echo -e "    - Direct URL with hash"
echo ""
echo -e "  ${GREEN}✓${NC} Combined Scenario Tests (5 tests)"
echo -e "    - Anchor to tabs navigation"
echo -e "    - Tabs after navigation"
echo -e "    - Complex user workflows"
echo -e "    - State preservation"
echo ""

echo -e "${YELLOW}Running tests...${NC}"
echo ""

# Run the tests
npx playwright test "$TEST_FILE" \
  --reporter=list,html \
  --workers=1 \
  --retries=1 \
  --timeout=60000

TEST_EXIT_CODE=$?

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════${NC}"

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✓ ALL TESTS PASSED${NC}"
    echo ""
    echo -e "${GREEN}Test Results:${NC}"
    echo -e "  Total Tests: ${GREEN}21${NC}"
    echo -e "  Tabs Tests: ${GREEN}8${NC}"
    echo -e "  Anchor Tests: ${GREEN}8${NC}"
    echo -e "  Combined Tests: ${GREEN}5${NC}"
    echo ""
    echo -e "${BLUE}Screenshots Location:${NC}"
    echo -e "  ${GREEN}$SCREENSHOT_DIR${NC}"

    # Count screenshots
    SCREENSHOT_COUNT=$(ls -1 "$SCREENSHOT_DIR"/*.png 2>/dev/null | wc -l)
    echo -e "  ${GREEN}$SCREENSHOT_COUNT screenshots captured${NC}"

    if [ $SCREENSHOT_COUNT -gt 0 ]; then
        echo ""
        echo -e "${BLUE}Recent Screenshots:${NC}"
        ls -1t "$SCREENSHOT_DIR"/*.png | head -5 | while read file; do
            echo -e "  - $(basename "$file")"
        done
    fi

    echo ""
    echo -e "${BLUE}View HTML Report:${NC}"
    echo -e "  npx playwright show-report"
else
    echo -e "${RED}✗ SOME TESTS FAILED${NC}"
    echo ""
    echo -e "${YELLOW}Troubleshooting:${NC}"
    echo -e "  1. Check console errors in test output above"
    echo -e "  2. Review screenshots in: $SCREENSHOT_DIR"
    echo -e "  3. Open HTML report: npx playwright show-report"
    echo -e "  4. Verify test page is accessible: $TEST_URL"
    echo -e "  5. Check browser console for React errors"
fi

echo -e "${BLUE}═══════════════════════════════════════════════════════════════════${NC}"
echo ""

exit $TEST_EXIT_CODE
