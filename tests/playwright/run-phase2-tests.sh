#!/bin/bash

################################################################################
# Phase 2C - PostgreSQL UI/UX Validation Test Runner
################################################################################

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Phase 2C - PostgreSQL UI/UX Validation Test Suite          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if API server is running
echo -e "${YELLOW}🔍 Checking prerequisites...${NC}"

# Check API server
if curl -s http://localhost:3001/api/posts > /dev/null 2>&1; then
    echo -e "${GREEN}✅ API server is running on port 3001${NC}"

    # Verify PostgreSQL mode
    API_RESPONSE=$(curl -s http://localhost:3001/api/posts)
    if echo "$API_RESPONSE" | grep -q "PostgreSQL"; then
        echo -e "${GREEN}✅ API server is in PostgreSQL mode${NC}"
    else
        echo -e "${RED}❌ API server is NOT in PostgreSQL mode${NC}"
        echo -e "${YELLOW}   Response source: $(echo "$API_RESPONSE" | grep -o '"source":"[^"]*"')${NC}"
        echo -e "${YELLOW}   Please set USE_POSTGRES=true and restart the API server${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ API server is NOT running on port 3001${NC}"
    echo -e "${YELLOW}   Please start the API server with: cd api-server && npm start${NC}"
    exit 1
fi

# Check frontend
FRONTEND_PORT=${FRONTEND_PORT:-5173}
if curl -s http://localhost:$FRONTEND_PORT > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend is running on port $FRONTEND_PORT${NC}"
else
    echo -e "${RED}❌ Frontend is NOT running on port $FRONTEND_PORT${NC}"
    echo -e "${YELLOW}   Please start the frontend with: cd frontend && npm run dev${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}📦 Installing Playwright browsers (if needed)...${NC}"
npx playwright install chromium firefox webkit --with-deps || true

echo ""
echo -e "${BLUE}🧪 Running Phase 2C tests...${NC}"
echo ""

# Parse command line arguments
TEST_ARGS=""
BROWSER=""
HEADED=""
DEBUG=""

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
        --browser=*)
            BROWSER="--project=${1#*=}"
            shift
            ;;
        --grep=*)
            TEST_ARGS="$TEST_ARGS -g ${1#*=}"
            shift
            ;;
        *)
            TEST_ARGS="$TEST_ARGS $1"
            shift
            ;;
    esac
done

# Run the tests
npx playwright test \
    --config tests/playwright/playwright.config.phase2.js \
    $BROWSER \
    $HEADED \
    $DEBUG \
    $TEST_ARGS

TEST_EXIT_CODE=$?

echo ""
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║   ✅ All Phase 2C tests passed!                               ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BLUE}📸 Screenshots saved to: tests/playwright/screenshots/phase2/${NC}"
    echo -e "${BLUE}📊 View HTML report: npx playwright show-report tests/playwright/screenshots/phase2/playwright-report${NC}"
else
    echo -e "${RED}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║   ❌ Some tests failed                                        ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}📸 Check screenshots: tests/playwright/screenshots/phase2/${NC}"
    echo -e "${YELLOW}📊 View HTML report: npx playwright show-report tests/playwright/screenshots/phase2/playwright-report${NC}"
    echo -e "${YELLOW}🐛 Debug with: ./tests/playwright/run-phase2-tests.sh --debug${NC}"
fi

exit $TEST_EXIT_CODE
