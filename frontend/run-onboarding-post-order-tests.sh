#!/bin/bash

# Run Onboarding Post Order Validation E2E Tests
# This script runs the Playwright tests for validating post order after database reset

set -e

echo "================================================"
echo "Onboarding Post Order Validation E2E Tests"
echo "================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if servers are running
echo -e "${YELLOW}Checking if servers are running...${NC}"

if ! curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo -e "${RED}ERROR: Backend server is not running on port 3001${NC}"
    echo "Please start the backend server first:"
    echo "  cd /workspaces/agent-feed/api-server"
    echo "  node server.js"
    exit 1
fi

if ! curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo -e "${RED}ERROR: Frontend dev server is not running on port 5173${NC}"
    echo "Please start the frontend server first:"
    echo "  cd /workspaces/agent-feed/frontend"
    echo "  npm run dev"
    exit 1
fi

echo -e "${GREEN}✓ Backend server is running${NC}"
echo -e "${GREEN}✓ Frontend server is running${NC}"
echo ""

# Create screenshots directory
echo -e "${YELLOW}Creating screenshots directory...${NC}"
mkdir -p ../docs/screenshots/post-order-fix
echo -e "${GREEN}✓ Directory created${NC}"
echo ""

# Run the tests
echo -e "${YELLOW}Running Playwright tests...${NC}"
echo ""

# Run with the custom config
npx playwright test \
  --config=playwright.config.onboarding-post-order.ts \
  onboarding-post-order-validation.spec.ts \
  "$@"

TEST_EXIT_CODE=$?

echo ""
echo "================================================"

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    echo ""
    echo "Screenshots saved to: ../docs/screenshots/post-order-fix/"
    echo "HTML report: playwright-report-post-order/index.html"
    echo ""
    echo "View report with:"
    echo "  npx playwright show-report playwright-report-post-order"
else
    echo -e "${RED}✗ Some tests failed${NC}"
    echo ""
    echo "Review the test output above for details"
    echo "View HTML report:"
    echo "  npx playwright show-report playwright-report-post-order"
fi

echo "================================================"

exit $TEST_EXIT_CODE
