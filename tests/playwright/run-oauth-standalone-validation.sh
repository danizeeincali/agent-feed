#!/bin/bash

# OAuth Standalone UI Validation Test Runner
# Runs comprehensive Playwright tests for OAuth user flows

set -e

echo "🎭 OAuth Standalone UI Validation Test Suite"
echo "=============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if backend is running
echo "🔍 Checking if backend is running..."
if ! curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo -e "${RED}❌ Backend not running on port 3001${NC}"
    echo "Please start backend: npm run dev:backend"
    exit 1
fi
echo -e "${GREEN}✅ Backend is running${NC}"

# Check if frontend is running
echo "🔍 Checking if frontend is running..."
if ! curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo -e "${RED}❌ Frontend not running on port 5173${NC}"
    echo "Please start frontend: npm run dev:frontend"
    exit 1
fi
echo -e "${GREEN}✅ Frontend is running${NC}"
echo ""

# Create screenshot directories
echo "📁 Creating screenshot directories..."
mkdir -p docs/validation/screenshots/{oauth-standalone-01-settings,oauth-standalone-02-dm-interface,oauth-standalone-03-compose,oauth-standalone-04-send,oauth-standalone-05-apikey-flow,oauth-standalone-06-payg-flow}
echo -e "${GREEN}✅ Directories created${NC}"
echo ""

# Run tests
echo "🎬 Starting test execution..."
echo ""

MODE=${1:-headed}

if [ "$MODE" = "headless" ]; then
    echo -e "${BLUE}Running in headless mode...${NC}"
    npx playwright test tests/playwright/oauth-standalone-ui-validation.spec.ts
elif [ "$MODE" = "debug" ]; then
    echo -e "${BLUE}Running in debug mode...${NC}"
    npx playwright test tests/playwright/oauth-standalone-ui-validation.spec.ts --debug
else
    echo -e "${BLUE}Running in headed mode (browser visible)...${NC}"
    npx playwright test tests/playwright/oauth-standalone-ui-validation.spec.ts --headed
fi

echo ""
echo "=============================================="
echo "🎉 Test execution complete!"
echo ""

# Count screenshots
SCREENSHOT_COUNT=$(find docs/validation/screenshots/oauth-standalone-* -name "*.png" 2>/dev/null | wc -l)
echo -e "${GREEN}📸 Screenshots captured: ${SCREENSHOT_COUNT}${NC}"

# Check for network logs
if [ -f "docs/validation/screenshots/oauth-standalone-04-send/network-logs.json" ]; then
    echo -e "${GREEN}📝 Network logs saved${NC}"

    # Check for 500 errors in logs
    if grep -q '"status": 500' docs/validation/screenshots/oauth-standalone-04-send/network-logs.json 2>/dev/null; then
        echo -e "${RED}⚠️  500 ERROR DETECTED in OAuth message send${NC}"
        echo "Check: docs/validation/screenshots/oauth-standalone-04-send/network-logs.json"
    else
        echo -e "${GREEN}✅ No 500 errors detected${NC}"
    fi
fi

echo ""
echo "📊 View Results:"
echo "   Screenshots: docs/validation/screenshots/"
echo "   Gallery: docs/validation/OAUTH-STANDALONE-SCREENSHOT-GALLERY.md"
echo "   Report: docs/PLAYWRIGHT-OAUTH-STANDALONE-VALIDATION.md"
echo ""
echo "🔍 View Playwright Report:"
echo "   npx playwright show-report"
echo ""
