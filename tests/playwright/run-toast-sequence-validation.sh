#!/bin/bash

################################################################################
# TOAST NOTIFICATION SEQUENCE - E2E VALIDATION
################################################################################
#
# This script runs comprehensive Playwright tests for the complete toast
# notification flow from post creation through agent processing.
#
# Test Coverage:
# - Complete toast sequence (4 toasts)
# - Work queue vs AVI DM flow
# - Toast timing and auto-dismiss
# - Error handling
# - Visual validation
#
# Screenshots: docs/validation/screenshots/toast-notifications/
#
################################################################################

set -e

echo "================================"
echo "Toast Notification Sequence E2E"
echo "================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Ensure screenshot directory exists
mkdir -p /workspaces/agent-feed/docs/validation/screenshots/toast-notifications

# Check if backend is running
echo -n "Checking backend status... "
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend running${NC}"
else
    echo -e "${RED}✗ Backend not running${NC}"
    echo ""
    echo "Please start the backend first:"
    echo "  npm start"
    exit 1
fi

echo ""
echo "Starting Playwright tests..."
echo ""

# Run Playwright tests
npx playwright test tests/playwright/toast-notification-sequence.spec.ts \
    --headed \
    --reporter=list,html \
    --timeout=120000

TEST_EXIT_CODE=$?

echo ""
echo "================================"
echo "Test Execution Complete"
echo "================================"
echo ""

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    echo ""
    echo "📸 Screenshots saved to:"
    echo "   /workspaces/agent-feed/docs/validation/screenshots/toast-notifications/"
    echo ""
    echo "📊 HTML Report:"
    echo "   npx playwright show-report"
    echo ""
else
    echo -e "${RED}❌ Some tests failed${NC}"
    echo ""
    echo "View detailed report:"
    echo "   npx playwright show-report"
    echo ""
    exit $TEST_EXIT_CODE
fi

# List screenshots
echo "📸 Screenshots captured:"
ls -lh /workspaces/agent-feed/docs/validation/screenshots/toast-notifications/ | tail -n +2

echo ""
echo "🎉 Toast Notification E2E Validation Complete!"
