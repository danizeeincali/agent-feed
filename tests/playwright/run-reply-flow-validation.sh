#!/bin/bash

# Comment Reply Flow E2E Test Runner
# Tests both processing pill visibility and agent response routing

set -e

echo "========================================"
echo "Comment Reply Flow E2E Test Suite"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Create screenshot directory
SCREENSHOT_DIR="tests/playwright/screenshots/reply-flow"
mkdir -p "$SCREENSHOT_DIR"

echo -e "${BLUE}[INFO]${NC} Screenshot directory: $SCREENSHOT_DIR"
echo ""

# Check if servers are running
echo -e "${YELLOW}[CHECK]${NC} Verifying servers are running..."

if ! curl -s http://localhost:5173 > /dev/null; then
    echo -e "${RED}[ERROR]${NC} Frontend not running on http://localhost:5173"
    echo "Please start the frontend: npm run dev"
    exit 1
fi

if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${YELLOW}[WARNING]${NC} Backend not responding on http://localhost:3000"
    echo "Some tests may fail without backend"
fi

echo -e "${GREEN}[OK]${NC} Servers are running"
echo ""

# Run Playwright tests
echo -e "${BLUE}[RUN]${NC} Starting Playwright E2E tests..."
echo ""

npx playwright test \
  --config=playwright.config.reply-flow.ts \
  --reporter=html,json,junit,list

TEST_EXIT_CODE=$?

echo ""
echo "========================================"
echo "Test Results"
echo "========================================"

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}[SUCCESS]${NC} All tests passed!"
else
    echo -e "${RED}[FAILURE]${NC} Some tests failed (exit code: $TEST_EXIT_CODE)"
fi

echo ""
echo "Reports generated:"
echo "  - HTML Report: tests/playwright/reports/reply-flow-html/index.html"
echo "  - JSON Results: tests/playwright/reports/reply-flow-results.json"
echo "  - JUnit XML: tests/playwright/reports/reply-flow-junit.xml"
echo "  - Screenshots: $SCREENSHOT_DIR"
echo ""

# Open HTML report if tests passed
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${BLUE}[INFO]${NC} Opening HTML report..."
    npx playwright show-report tests/playwright/reports/reply-flow-html
fi

exit $TEST_EXIT_CODE
