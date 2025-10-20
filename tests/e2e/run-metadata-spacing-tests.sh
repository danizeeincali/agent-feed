#!/bin/bash

# Metadata Line Spacing Validation Test Runner
# Purpose: Execute E2E tests for mt-4 class addition to metadata line

set -e

echo "========================================"
echo "Metadata Line Spacing Validation Tests"
echo "========================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if servers are running
echo "Checking application servers..."

if ! curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo -e "${RED}✗ Frontend server not running on http://localhost:5173${NC}"
    echo "Please start the frontend server with: cd frontend && npm run dev"
    exit 1
fi
echo -e "${GREEN}✓ Frontend server running${NC}"

if ! curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠ Backend server not responding on http://localhost:3001${NC}"
    echo "Backend may not be running, but continuing with tests..."
else
    echo -e "${GREEN}✓ Backend server running${NC}"
fi

echo ""

# Create screenshot directory
SCREENSHOT_DIR="tests/e2e/screenshots/metadata-spacing"
mkdir -p "$SCREENSHOT_DIR"
echo -e "${GREEN}✓ Screenshot directory created: $SCREENSHOT_DIR${NC}"

# Create reports directory
REPORT_DIR="tests/e2e/reports"
mkdir -p "$REPORT_DIR"

echo ""
echo "Running Playwright E2E tests..."
echo "Test file: metadata-spacing-validation.spec.ts"
echo ""

# Run tests with custom config
cd tests/e2e
npx playwright test \
  --config=playwright.config.metadata-spacing.ts \
  --reporter=list,html,json

TEST_EXIT_CODE=$?

echo ""
echo "========================================"

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed successfully!${NC}"
    echo ""
    echo "Screenshots saved to: $SCREENSHOT_DIR"
    echo "HTML Report: tests/e2e/reports/metadata-spacing/index.html"
    echo "JSON Results: tests/e2e/reports/metadata-spacing-results.json"
else
    echo -e "${RED}✗ Some tests failed (exit code: $TEST_EXIT_CODE)${NC}"
    echo ""
    echo "Check the reports for details:"
    echo "  HTML Report: tests/e2e/reports/metadata-spacing/index.html"
    echo "  Screenshots: $SCREENSHOT_DIR"
fi

echo "========================================"
echo ""

# List captured screenshots
if [ -d "$SCREENSHOT_DIR" ]; then
    echo "Captured screenshots:"
    ls -lh "$SCREENSHOT_DIR" | grep -E '\.(png|jpg)$' || echo "No screenshots found"
fi

exit $TEST_EXIT_CODE
