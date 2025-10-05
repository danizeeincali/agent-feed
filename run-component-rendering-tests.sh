#!/bin/bash

# Component Rendering Validation Test Runner
# Runs comprehensive E2E tests for DynamicPageRenderer component rendering validation

set -e

echo "======================================"
echo "Component Rendering Validation Tests"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
FRONTEND_DIR="/workspaces/agent-feed/frontend"
SCREENSHOT_DIR="$FRONTEND_DIR/tests/e2e/screenshots/component-rendering"
TEST_FILE="$FRONTEND_DIR/tests/e2e/component-rendering-validation.spec.ts"

echo -e "${YELLOW}Test Configuration:${NC}"
echo "  Frontend Dir: $FRONTEND_DIR"
echo "  Test File: $TEST_FILE"
echo "  Screenshot Dir: $SCREENSHOT_DIR"
echo ""

# Verify test file exists
if [ ! -f "$TEST_FILE" ]; then
  echo -e "${RED}ERROR: Test file not found at $TEST_FILE${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Test file found${NC}"

# Ensure screenshot directory exists
mkdir -p "$SCREENSHOT_DIR"
echo -e "${GREEN}✓ Screenshot directory ready${NC}"

# Clean previous screenshots (optional)
echo ""
read -p "Clean previous screenshots? (y/N): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
  rm -f "$SCREENSHOT_DIR"/*.png
  echo -e "${GREEN}✓ Previous screenshots cleaned${NC}"
fi

echo ""
echo -e "${YELLOW}Starting Playwright tests...${NC}"
echo ""

# Change to frontend directory
cd "$FRONTEND_DIR"

# Run the tests
npx playwright test component-rendering-validation.spec.ts \
  --reporter=list,html \
  --timeout=60000 \
  --retries=0 \
  --workers=1

TEST_EXIT_CODE=$?

echo ""
echo "======================================"

if [ $TEST_EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}✓ All tests passed!${NC}"

  # Count screenshots
  SCREENSHOT_COUNT=$(ls -1 "$SCREENSHOT_DIR"/*.png 2>/dev/null | wc -l)
  echo ""
  echo "Screenshots captured: $SCREENSHOT_COUNT"
  echo "Location: $SCREENSHOT_DIR"

  if [ $SCREENSHOT_COUNT -gt 0 ]; then
    echo ""
    echo "Screenshot files:"
    ls -1 "$SCREENSHOT_DIR"/*.png | while read file; do
      echo "  - $(basename "$file")"
    done
  fi
else
  echo -e "${RED}✗ Tests failed with exit code $TEST_EXIT_CODE${NC}"
  echo ""
  echo "Check the test output above for details"
fi

echo ""
echo "HTML Report: $FRONTEND_DIR/playwright-report/index.html"
echo "======================================"
echo ""

exit $TEST_EXIT_CODE
