#!/bin/bash
# Run Multi-State Comment Pills E2E Tests with Playwright
#
# This script runs the visual validation tests for the multi-state
# comment processing pills and captures screenshots for each state:
# - Waiting (yellow)
# - Analyzing (blue)
# - Responding (purple)
# - Complete (green)

set -e

echo "=========================================="
echo "Multi-State Comment Pills E2E Test Suite"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Navigate to project root
cd "$(dirname "$0")/../.."

# Create screenshots directory
mkdir -p tests/playwright/screenshots/multi-state-pills
mkdir -p tests/playwright/reports/multi-state-pills

echo -e "${YELLOW}Creating screenshots directory...${NC}"

# Check if Playwright is installed
if ! npx playwright --version > /dev/null 2>&1; then
  echo -e "${YELLOW}Installing Playwright...${NC}"
  npx playwright install chromium
fi

# Check if dev server is running
if curl -s http://localhost:5173 > /dev/null; then
  echo -e "${GREEN}Dev server is running on port 5173${NC}"
  export DEV_SERVER_RUNNING=true
else
  echo -e "${YELLOW}Starting dev server...${NC}"
  export DEV_SERVER_RUNNING=false
fi

# Run tests with multi-state pills config
echo -e "${YELLOW}Running multi-state pills E2E tests...${NC}"

npx playwright test \
  --config=playwright.config.multi-state-pills.ts \
  "$@"

# Check test result
TEST_RESULT=$?

# Show screenshots location
echo ""
echo "=========================================="
if [ $TEST_RESULT -eq 0 ]; then
  echo -e "${GREEN}Tests completed successfully!${NC}"
else
  echo -e "${RED}Some tests failed.${NC}"
fi
echo "=========================================="
echo ""
echo "Screenshots saved to:"
echo "  tests/playwright/screenshots/multi-state-pills/"
echo ""
echo "Test report available at:"
echo "  tests/playwright/reports/multi-state-pills/index.html"
echo ""

# List screenshots
if [ -d "tests/playwright/screenshots/multi-state-pills" ]; then
  echo "Generated screenshots:"
  ls -la tests/playwright/screenshots/multi-state-pills/*.png 2>/dev/null || echo "  (none yet)"
fi

exit $TEST_RESULT
