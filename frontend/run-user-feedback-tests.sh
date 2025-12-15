#!/bin/bash

# User Feedback Validation E2E Test Runner
# This script ensures the server is running and executes the E2E tests

set -e

echo "🚀 Starting User Feedback E2E Test Runner..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if server is already running
SERVER_PID=$(lsof -ti:3001 || echo "")

if [ -z "$SERVER_PID" ]; then
    echo -e "${YELLOW}⚠️  Server not running on port 3001${NC}"
    echo "Please start the API server first:"
    echo "  cd /workspaces/agent-feed/api-server && node server.js"
    echo ""
    exit 1
else
    echo -e "${GREEN}✓ Server detected on port 3001 (PID: $SERVER_PID)${NC}"
fi

# Ensure screenshots directory exists
echo "📁 Ensuring screenshots directory exists..."
mkdir -p /workspaces/agent-feed/docs/screenshots
echo -e "${GREEN}✓ Screenshots directory ready${NC}"
echo ""

# Run the tests
echo "🧪 Running Playwright E2E Tests..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd /workspaces/agent-feed/frontend

# Run tests without starting a new server (server already running)
npx playwright test --project=user-feedback-validation --config=playwright.config.ts

TEST_EXIT_CODE=$?

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    echo ""
    echo "📸 Screenshots saved to: /workspaces/agent-feed/docs/screenshots/"
    echo "📊 Test report available at: /workspaces/agent-feed/frontend/test-results/"
    echo ""
    echo "View HTML report with:"
    echo "  cd /workspaces/agent-feed/frontend && npx playwright show-report"
else
    echo -e "${RED}❌ Some tests failed${NC}"
    echo ""
    echo "📊 Check test results at: /workspaces/agent-feed/frontend/test-results/"
    echo ""
    echo "View HTML report with:"
    echo "  cd /workspaces/agent-feed/frontend && npx playwright show-report"
fi

echo ""
exit $TEST_EXIT_CODE
