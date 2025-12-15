#!/bin/bash

###############################################################################
# Visual Pills & Real-Time Updates E2E Test Runner
#
# This script runs comprehensive E2E tests for:
# - Visual processing pills on comment cards
# - Real-time updates via WebSocket (no refresh)
# - Multiple independent processing pills
# - WebSocket connection status
###############################################################################

set -e

echo "🎬 Visual Pills & Real-Time Updates E2E Test Suite"
echo "=================================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
FRONTEND_URL="http://localhost:5173"
BACKEND_URL="http://localhost:3001"
SCREENSHOT_DIR="tests/playwright/screenshots/visual-realtime"

# Check if services are running
echo -e "${BLUE}1. Checking services...${NC}"

if curl -s "$FRONTEND_URL" > /dev/null; then
    echo -e "${GREEN}✓ Frontend is running${NC}"
else
    echo -e "${RED}✗ Frontend is not running at $FRONTEND_URL${NC}"
    echo "  Start with: cd frontend && npm run dev"
    exit 1
fi

if curl -s "$BACKEND_URL/health" > /dev/null; then
    echo -e "${GREEN}✓ Backend is running${NC}"
else
    echo -e "${RED}✗ Backend is not running at $BACKEND_URL${NC}"
    echo "  Start with: cd api-server && npm start"
    exit 1
fi

echo ""

# Create screenshot directory
echo -e "${BLUE}2. Preparing test environment...${NC}"
mkdir -p "$SCREENSHOT_DIR"
echo -e "${GREEN}✓ Screenshot directory ready: $SCREENSHOT_DIR${NC}"
echo ""

# Run tests
echo -e "${BLUE}3. Running E2E tests...${NC}"
echo ""

# Choose test mode
if [ "$1" == "--ui" ]; then
    echo -e "${YELLOW}Running in UI mode...${NC}"
    npx playwright test visual-pills-and-realtime-e2e.spec.ts \
        --config=playwright.config.visual-realtime.ts \
        --ui
elif [ "$1" == "--headed" ]; then
    echo -e "${YELLOW}Running in headed mode...${NC}"
    npx playwright test visual-pills-and-realtime-e2e.spec.ts \
        --config=playwright.config.visual-realtime.ts \
        --headed \
        --workers=1
elif [ "$1" == "--debug" ]; then
    echo -e "${YELLOW}Running in debug mode...${NC}"
    npx playwright test visual-pills-and-realtime-e2e.spec.ts \
        --config=playwright.config.visual-realtime.ts \
        --debug
elif [ -n "$1" ]; then
    # Run specific scenario
    echo -e "${YELLOW}Running scenario: $1${NC}"
    npx playwright test visual-pills-and-realtime-e2e.spec.ts \
        --config=playwright.config.visual-realtime.ts \
        --grep "$1"
else
    # Default: Run all tests
    npx playwright test visual-pills-and-realtime-e2e.spec.ts \
        --config=playwright.config.visual-realtime.ts
fi

TEST_EXIT_CODE=$?

echo ""
echo "=================================================="

# Check results
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    echo ""
    echo -e "${BLUE}4. Test artifacts generated:${NC}"

    # List screenshots
    if [ -d "$SCREENSHOT_DIR" ]; then
        SCREENSHOT_COUNT=$(find "$SCREENSHOT_DIR" -name "*.png" | wc -l)
        echo -e "${GREEN}   - $SCREENSHOT_COUNT screenshots in $SCREENSHOT_DIR${NC}"

        # List critical screenshots
        echo ""
        echo -e "${YELLOW}   Critical screenshots to review:${NC}"
        [ -f "$SCREENSHOT_DIR/03_CRITICAL_visual_pill_on_comment.png" ] && \
            echo -e "${GREEN}   ✓ Visual pill on comment${NC}"
        [ -f "$SCREENSHOT_DIR/06_CRITICAL_realtime_reply_appears.png" ] && \
            echo -e "${GREEN}   ✓ Real-time reply appearance${NC}"
        [ -f "$SCREENSHOT_DIR/09_CRITICAL_both_pills_visible.png" ] && \
            echo -e "${GREEN}   ✓ Multiple pills visible${NC}"
        [ -f "$SCREENSHOT_DIR/13_CRITICAL_console_websocket_status.png" ] && \
            echo -e "${GREEN}   ✓ WebSocket console status${NC}"
    fi

    # Show report location
    echo ""
    echo -e "${BLUE}   - HTML report: playwright-report-visual-realtime/index.html${NC}"
    echo -e "${BLUE}   - JSON results: test-results/visual-realtime-results.json${NC}"

    echo ""
    echo -e "${GREEN}🎉 Visual Pills & Real-Time Updates E2E Tests PASSED${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Review screenshots in $SCREENSHOT_DIR"
    echo "  2. Open HTML report: npx playwright show-report playwright-report-visual-realtime"
    echo "  3. Verify visual pill appearance in 03_CRITICAL_visual_pill_on_comment.png"
    echo "  4. Verify real-time updates in 06_CRITICAL_realtime_reply_appears.png"

else
    echo -e "${RED}✗ Some tests failed${NC}"
    echo ""
    echo "Troubleshooting:"
    echo "  1. Check screenshots in $SCREENSHOT_DIR for visual clues"
    echo "  2. Review test output above for specific failures"
    echo "  3. Run with --ui flag to debug interactively:"
    echo "     ./run-visual-realtime-tests.sh --ui"
    echo "  4. Check browser console for errors"
    echo "  5. Verify WebSocket connection in Network tab"
    exit 1
fi

echo ""
echo "=================================================="
echo ""

# Offer to open report
if [ $TEST_EXIT_CODE -eq 0 ] && [ -z "$CI" ]; then
    read -p "Open HTML report? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        npx playwright show-report playwright-report-visual-realtime
    fi
fi

exit $TEST_EXIT_CODE
