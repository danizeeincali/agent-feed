#!/bin/bash

###############################################################################
# Sidebar Anchor Navigation E2E Test Runner
#
# This script runs the comprehensive anchor navigation tests with proper setup
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Sidebar Anchor Navigation E2E Tests${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: package.json not found${NC}"
    echo -e "${YELLOW}Please run this script from the frontend directory${NC}"
    exit 1
fi

# Check if Playwright is installed
if ! command -v npx playwright &> /dev/null; then
    echo -e "${RED}Error: Playwright not found${NC}"
    echo -e "${YELLOW}Installing Playwright...${NC}"
    npm install --save-dev @playwright/test
    npx playwright install chromium
fi

# Ensure screenshots directory exists
echo -e "${BLUE}Creating screenshots directory...${NC}"
mkdir -p tests/e2e/screenshots

# Check if dev server is running
echo -e "${BLUE}Checking development server...${NC}"
if curl -s http://localhost:5173 > /dev/null; then
    echo -e "${GREEN}✓ Dev server is running${NC}"
else
    echo -e "${YELLOW}! Dev server not detected on localhost:5173${NC}"
    echo -e "${YELLOW}! Starting dev server...${NC}"
    npm run dev &
    DEV_SERVER_PID=$!
    echo -e "${BLUE}Waiting for dev server to start...${NC}"
    sleep 10

    # Check again
    if curl -s http://localhost:5173 > /dev/null; then
        echo -e "${GREEN}✓ Dev server started successfully${NC}"
    else
        echo -e "${RED}✗ Failed to start dev server${NC}"
        exit 1
    fi
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Running Tests${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Parse command line arguments
TEST_PATTERN=""
HEADED=""
DEBUG=""
UI_MODE=""
BROWSER="chromium"

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
        --browser=*)
            BROWSER="${1#*=}"
            shift
            ;;
        --test=*)
            TEST_PATTERN="-g ${1#*=}"
            shift
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Run the tests
echo -e "${GREEN}Running anchor navigation tests...${NC}"
echo ""

if [ -n "$UI_MODE" ]; then
    npx playwright test tests/e2e/sidebar-anchor-navigation.spec.js --ui
elif [ -n "$DEBUG" ]; then
    npx playwright test tests/e2e/sidebar-anchor-navigation.spec.js --debug
else
    npx playwright test tests/e2e/sidebar-anchor-navigation.spec.js \
        --project=$BROWSER \
        $HEADED \
        $TEST_PATTERN \
        --reporter=html
fi

TEST_EXIT_CODE=$?

# Kill dev server if we started it
if [ -n "$DEV_SERVER_PID" ]; then
    echo ""
    echo -e "${BLUE}Stopping dev server...${NC}"
    kill $DEV_SERVER_PID 2>/dev/null || true
fi

echo ""
echo -e "${BLUE}========================================${NC}"

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    echo ""
    echo -e "${GREEN}Screenshots saved to:${NC}"
    echo -e "${YELLOW}tests/e2e/screenshots/${NC}"
    echo ""
    echo -e "${GREEN}Test report available:${NC}"
    echo -e "${YELLOW}npx playwright show-report${NC}"
else
    echo -e "${RED}✗ Some tests failed${NC}"
    echo ""
    echo -e "${YELLOW}View detailed report:${NC}"
    echo -e "${YELLOW}npx playwright show-report${NC}"
    echo ""
    echo -e "${YELLOW}Check screenshots in:${NC}"
    echo -e "${YELLOW}tests/e2e/screenshots/${NC}"
fi

echo -e "${BLUE}========================================${NC}"
echo ""

exit $TEST_EXIT_CODE
