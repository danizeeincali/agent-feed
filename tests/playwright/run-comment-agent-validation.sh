#!/bin/bash

# Comment-Agent Response Validation Test Runner
# TDD Approach - Run tests BEFORE implementation

set -e

echo "=========================================="
echo "Comment-Agent Response Validation Tests"
echo "TDD Approach - Expect Initial Failures"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Create screenshot directory
SCREENSHOT_DIR="./docs/validation/screenshots/comment-agent-validation"
mkdir -p "$SCREENSHOT_DIR"

echo "📁 Screenshot directory: $SCREENSHOT_DIR"
echo ""

# Check if backend is running
echo "🔍 Checking backend status..."
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend running on http://localhost:3001${NC}"
else
    echo -e "${RED}❌ Backend NOT running on http://localhost:3001${NC}"
    echo "Please start backend: npm run dev:backend"
    exit 1
fi

# Check if frontend is running
echo "🔍 Checking frontend status..."
if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend running on http://localhost:5173${NC}"
else
    echo -e "${RED}❌ Frontend NOT running on http://localhost:5173${NC}"
    echo "Please start frontend: npm run dev:frontend"
    exit 1
fi

echo ""
echo "=========================================="
echo "Running Playwright Tests (TDD Mode)"
echo "=========================================="
echo ""

# Run Playwright tests
npx playwright test \
    --config=playwright.config.comment-validation.cjs \
    --reporter=html \
    --reporter=list

TEST_EXIT_CODE=$?

echo ""
echo "=========================================="
echo "Test Execution Complete"
echo "=========================================="
echo ""

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ ALL TESTS PASSED${NC}"
    echo ""
    echo "This is unexpected for TDD! Tests should fail initially."
    echo "Please review test implementation."
else
    echo -e "${YELLOW}⚠️  TESTS FAILED (Expected in TDD)${NC}"
    echo ""
    echo "This is NORMAL for TDD approach!"
    echo "Tests are written before implementation."
    echo ""
    echo "Next Steps:"
    echo "1. Review test failures to understand requirements"
    echo "2. Implement features to make tests pass"
    echo "3. Re-run tests to verify implementation"
fi

echo ""
echo "📊 Test Report: playwright-report/index.html"
echo "📸 Screenshots: $SCREENSHOT_DIR/"
echo ""

# Generate test summary
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo ""
echo "Test Cases:"
echo "  TDD-1: User comment triggers agent response visible in UI"
echo "  TDD-2: Agent responses update in real-time via WebSocket"
echo "  TDD-3: Agent comment has correct author metadata"
echo "  TDD-4: No infinite loop in comment processing"
echo "  TDD-5: Multiple users commenting triggers separate agent responses"
echo "  TDD-6: Agent response contains relevant content"
echo ""

exit $TEST_EXIT_CODE
