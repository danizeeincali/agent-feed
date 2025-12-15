#!/bin/bash
# Run Comment Reply Processing E2E Tests

set -e

echo "======================================"
echo "Comment Reply Processing E2E Tests"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Playwright is installed
if ! command -v npx &> /dev/null; then
    echo -e "${RED}Error: npx not found. Please install Node.js${NC}"
    exit 1
fi

# Create required directories
echo -e "${YELLOW}Setting up test environment...${NC}"
mkdir -p tests/playwright/screenshots
mkdir -p tests/playwright/reports
mkdir -p tests/playwright/test-results

# Check if dev server is running
echo -e "${YELLOW}Checking dev server...${NC}"
if ! curl -s http://localhost:5173 > /dev/null; then
    echo -e "${RED}Dev server not running on port 5173!${NC}"
    echo -e "${YELLOW}Starting dev server in background...${NC}"
    npm run dev &
    DEV_PID=$!

    # Wait for server to be ready
    echo "Waiting for dev server to start..."
    for i in {1..30}; do
        if curl -s http://localhost:5173 > /dev/null; then
            echo -e "${GREEN}Dev server ready!${NC}"
            break
        fi
        sleep 2
        if [ $i -eq 30 ]; then
            echo -e "${RED}Dev server failed to start${NC}"
            exit 1
        fi
    done
else
    echo -e "${GREEN}Dev server is running${NC}"
fi

# Run Playwright tests
echo ""
echo -e "${YELLOW}Running Playwright tests...${NC}"
npx playwright test --config=playwright.config.reply-processing.ts

TEST_EXIT_CODE=$?

# Display results
echo ""
echo "======================================"
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
else
    echo -e "${RED}✗ Some tests failed${NC}"
fi
echo "======================================"

# Show screenshot locations
echo ""
echo -e "${YELLOW}Screenshots saved to:${NC}"
echo "  tests/playwright/screenshots/"
ls -lh tests/playwright/screenshots/ 2>/dev/null || echo "  (no screenshots yet)"

# Show report location
echo ""
echo -e "${YELLOW}Test report:${NC}"
echo "  tests/playwright/reports/reply-processing/index.html"

# Open report option
if [ -f "tests/playwright/reports/reply-processing/index.html" ]; then
    echo ""
    echo "To view the HTML report, run:"
    echo "  npx playwright show-report tests/playwright/reports/reply-processing"
fi

# Cleanup background process if we started it
if [ ! -z "$DEV_PID" ]; then
    echo ""
    echo -e "${YELLOW}Stopping dev server...${NC}"
    kill $DEV_PID 2>/dev/null || true
fi

exit $TEST_EXIT_CODE
