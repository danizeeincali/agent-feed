#!/bin/bash

###############################################################################
# Component Showcase E2E Test Runner
###############################################################################
# This script runs comprehensive E2E tests specifically for the
# component-showcase-and-examples page with detailed reporting
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="http://localhost:5173"
SHOWCASE_URL="$BASE_URL/agents/page-builder-agent/pages/component-showcase-and-examples"
SCREENSHOT_DIR="./component-showcase/screenshots"
REPORT_DIR="../../playwright-report"
TEST_RESULTS="../../test-results"

# Print banner
echo -e "${CYAN}"
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                                                                ║"
echo "║       Component Showcase E2E Test Suite - Comprehensive       ║"
echo "║                                                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check if servers are running
echo -e "${BLUE}Checking if servers are running...${NC}"
if ! curl -s "$BASE_URL" > /dev/null 2>&1; then
    echo -e "${RED}✗ Frontend server is not running at $BASE_URL${NC}"
    echo -e "${YELLOW}Please start the frontend server with: npm run dev${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Frontend server is running${NC}"

# Create screenshot directory
mkdir -p "$SCREENSHOT_DIR"
echo -e "${GREEN}✓ Screenshot directory ready: $SCREENSHOT_DIR${NC}"

# Display test information
echo ""
echo -e "${PURPLE}Test Configuration:${NC}"
echo -e "  Base URL: ${CYAN}$BASE_URL${NC}"
echo -e "  Showcase URL: ${CYAN}$SHOWCASE_URL${NC}"
echo -e "  Screenshots: ${CYAN}$SCREENSHOT_DIR${NC}"
echo ""

# Run the test suite
echo -e "${BLUE}Running Component Showcase E2E Tests...${NC}"
echo ""

cd /workspaces/agent-feed/frontend

# Run tests with comprehensive reporting
npx playwright test tests/e2e/component-showcase/component-showcase.spec.ts \
  --reporter=html \
  --reporter=json \
  --reporter=list \
  --project=core-features-chrome \
  --output="$TEST_RESULTS"

TEST_EXIT_CODE=$?

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed successfully!${NC}"
else
    echo -e "${YELLOW}⚠ Some tests failed (Exit code: $TEST_EXIT_CODE)${NC}"
fi

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Display results summary
echo -e "${PURPLE}Test Artifacts:${NC}"
echo -e "  Screenshots: ${CYAN}$(pwd)/$SCREENSHOT_DIR${NC}"
echo -e "  HTML Report: ${CYAN}$(pwd)/$REPORT_DIR/index.html${NC}"
echo -e "  JSON Results: ${CYAN}$(pwd)/$TEST_RESULTS/e2e-results.json${NC}"
echo ""

# Count screenshots
if [ -d "$SCREENSHOT_DIR" ]; then
    SCREENSHOT_COUNT=$(find "$SCREENSHOT_DIR" -type f \( -name "*.png" -o -name "*.jpg" \) 2>/dev/null | wc -l)
    echo -e "${GREEN}✓ Total screenshots captured: $SCREENSHOT_COUNT${NC}"
fi

# Show how to view report
echo ""
echo -e "${YELLOW}To view the HTML report:${NC}"
echo -e "  ${CYAN}npx playwright show-report${NC}"
echo ""

# Exit with same code as tests
exit $TEST_EXIT_CODE
