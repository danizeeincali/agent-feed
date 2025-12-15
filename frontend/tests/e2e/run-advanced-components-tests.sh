#!/bin/bash

# Advanced Components E2E Test Runner
# This script runs comprehensive E2E tests for all 7 advanced components

set -e

echo "========================================"
echo "Advanced Components E2E Test Suite"
echo "========================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if servers are running
echo -e "${BLUE}Checking if servers are running...${NC}"

# Check backend
if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend server is running on http://localhost:3001${NC}"
else
    echo -e "${RED}✗ Backend server is NOT running on http://localhost:3001${NC}"
    echo -e "${YELLOW}Please start the backend server first:${NC}"
    echo "  cd /workspaces/agent-feed/backend"
    echo "  npm run dev"
    exit 1
fi

# Check frontend
if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Frontend server is running on http://localhost:5173${NC}"
else
    echo -e "${RED}✗ Frontend server is NOT running on http://localhost:5173${NC}"
    echo -e "${YELLOW}Please start the frontend server first:${NC}"
    echo "  cd /workspaces/agent-feed/frontend"
    echo "  npm run dev"
    exit 1
fi

echo ""
echo -e "${BLUE}Creating screenshots directory...${NC}"
mkdir -p /workspaces/agent-feed/frontend/tests/e2e/screenshots

echo ""
echo -e "${BLUE}Running E2E tests for all 7 advanced components...${NC}"
echo ""

# Run tests with different options based on arguments
if [ "$1" == "--ui" ]; then
    echo -e "${YELLOW}Running tests in UI mode...${NC}"
    npx playwright test tests/e2e/advanced-components-validation.spec.ts --ui
elif [ "$1" == "--headed" ]; then
    echo -e "${YELLOW}Running tests in headed mode...${NC}"
    npx playwright test tests/e2e/advanced-components-validation.spec.ts --headed --reporter=list
elif [ "$1" == "--debug" ]; then
    echo -e "${YELLOW}Running tests in debug mode...${NC}"
    npx playwright test tests/e2e/advanced-components-validation.spec.ts --debug
elif [ "$1" == "--component" ]; then
    if [ -z "$2" ]; then
        echo -e "${RED}Error: Please specify a component name${NC}"
        echo "Usage: $0 --component <ComponentName>"
        echo "Examples:"
        echo "  $0 --component Checklist"
        echo "  $0 --component Calendar"
        echo "  $0 --component PhotoGrid"
        exit 1
    fi
    echo -e "${YELLOW}Running tests for $2 component only...${NC}"
    npx playwright test tests/e2e/advanced-components-validation.spec.ts -g "$2 Component" --reporter=list
else
    echo -e "${YELLOW}Running all tests...${NC}"
    npx playwright test tests/e2e/advanced-components-validation.spec.ts --reporter=list
fi

TEST_EXIT_CODE=$?

echo ""
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}========================================"
    echo "✓ All tests passed successfully!"
    echo "========================================${NC}"
    echo ""
    echo -e "${BLUE}Screenshots saved to:${NC}"
    echo "  /workspaces/agent-feed/frontend/tests/e2e/screenshots/"
    echo ""
    echo -e "${BLUE}View screenshots:${NC}"
    ls -lh /workspaces/agent-feed/frontend/tests/e2e/screenshots/*.png 2>/dev/null || echo "  No screenshots found (tests may not have run)"
else
    echo -e "${RED}========================================"
    echo "✗ Some tests failed"
    echo "========================================${NC}"
    echo ""
    echo -e "${YELLOW}To debug failures:${NC}"
    echo "  1. Run with --debug flag: $0 --debug"
    echo "  2. Run with --headed flag: $0 --headed"
    echo "  3. Run with --ui flag: $0 --ui"
    echo "  4. Check test output above for specific errors"
fi

echo ""
echo -e "${BLUE}Available commands:${NC}"
echo "  $0                    # Run all tests"
echo "  $0 --ui               # Run in interactive UI mode"
echo "  $0 --headed           # Run with browser visible"
echo "  $0 --debug            # Run in debug mode"
echo "  $0 --component <name> # Run specific component tests"

exit $TEST_EXIT_CODE
