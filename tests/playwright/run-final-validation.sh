#!/bin/bash

# Final E2E Validation for Both Fixes
# Tests: 1) Reply Button Processing Pill 2) Display Name "John Connor" 3) Independence

set -e

echo "=================================================="
echo "🚀 Final E2E Validation - Both Fixes"
echo "=================================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCREENSHOT_DIR="$PROJECT_ROOT/tests/playwright/screenshots/final-validation"
REPORT_DIR="$PROJECT_ROOT/tests/playwright/reports"

cd "$PROJECT_ROOT"

# Create directories
echo -e "${BLUE}📁 Creating directories...${NC}"
mkdir -p "$SCREENSHOT_DIR"
mkdir -p "$REPORT_DIR"

# Clean previous screenshots
echo -e "${BLUE}🧹 Cleaning previous screenshots...${NC}"
rm -rf "$SCREENSHOT_DIR"/*
echo "✓ Screenshots cleaned"
echo ""

# Check if backend is running
echo -e "${BLUE}🔍 Checking backend server...${NC}"
if ! curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo -e "${RED}❌ Backend not running on port 3001${NC}"
    echo "Please start the backend first:"
    echo "  cd api-server && node server.js"
    exit 1
fi
echo -e "${GREEN}✓ Backend is running${NC}"
echo ""

# Run Playwright tests
echo -e "${BLUE}🎭 Running Final Validation Tests...${NC}"
echo ""
echo "Test Scenarios:"
echo "  1. Reply Button Processing Pill (Critical)"
echo "  2. Display Name 'John Connor'"
echo "  3. Multiple Comments Independence"
echo "  4. Complete Integration"
echo ""

npx playwright test --config=playwright.config.final-validation.ts

TEST_EXIT_CODE=$?

echo ""
echo "=================================================="
echo "📊 Test Results"
echo "=================================================="

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ ALL TESTS PASSED!${NC}"
    echo ""
    echo "✓ Fix 1: Reply Button Processing Pill - WORKING"
    echo "✓ Fix 2: Display Name 'John Connor' - WORKING"
    echo "✓ Fix 3: Multiple Comments Independence - WORKING"
    echo "✓ Complete Integration - WORKING"
else
    echo -e "${RED}❌ SOME TESTS FAILED${NC}"
    echo ""
    echo "Check the logs above for details"
fi

echo ""
echo "=================================================="
echo "📸 Screenshots"
echo "=================================================="

if [ -d "$SCREENSHOT_DIR" ] && [ "$(ls -A $SCREENSHOT_DIR)" ]; then
    echo -e "${GREEN}Screenshots saved to:${NC}"
    echo "  $SCREENSHOT_DIR"
    echo ""
    echo "Screenshot count: $(ls -1 "$SCREENSHOT_DIR" | wc -l)"
    echo ""
    echo "Key screenshots to review:"
    echo "  - CRITICAL_processing_pill_visible.png"
    echo "  - scenario2_john_connor_visible.png"
    echo "  - scenario3_independence_verified.png"
    echo "  - integration_all_fixes_active.png"
else
    echo -e "${YELLOW}⚠️  No screenshots generated${NC}"
fi

echo ""
echo "=================================================="
echo "📋 Reports"
echo "=================================================="
echo "HTML Report:"
echo "  $REPORT_DIR/final-validation/index.html"
echo ""
echo "JSON Report:"
echo "  $REPORT_DIR/final-validation-results.json"
echo ""

echo "To view HTML report:"
echo "  npx playwright show-report tests/playwright/reports/final-validation"
echo ""

# Open screenshots directory
if command -v xdg-open > /dev/null 2>&1; then
    echo "Opening screenshots directory..."
    xdg-open "$SCREENSHOT_DIR" 2>/dev/null || true
elif command -v open > /dev/null 2>&1; then
    echo "Opening screenshots directory..."
    open "$SCREENSHOT_DIR" 2>/dev/null || true
fi

exit $TEST_EXIT_CODE
