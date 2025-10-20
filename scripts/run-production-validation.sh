#!/bin/bash

# PRODUCTION VALIDATION RUNNER
# Runs real browser tests with Claude Code integration

set -e

echo "=========================================="
echo "PRODUCTION VALIDATION - REAL BROWSER TEST"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if backend is running
echo "Checking backend connectivity..."
if ! curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo -e "${RED}❌ Backend is not running on port 3001${NC}"
    echo "Please start the backend first:"
    echo "  cd api-server && npm start"
    exit 1
fi
echo -e "${GREEN}✓ Backend is running${NC}"
echo ""

# Check if frontend is running
echo "Checking frontend connectivity..."
if ! curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo -e "${RED}❌ Frontend is not running on port 5173${NC}"
    echo "Please start the frontend first:"
    echo "  cd frontend && npm run dev"
    exit 1
fi
echo -e "${GREEN}✓ Frontend is running${NC}"
echo ""

# Check for Anthropic API key
if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo -e "${YELLOW}⚠ Warning: ANTHROPIC_API_KEY not set${NC}"
    echo "This test requires a real Claude API key."
    echo "Set it with: export ANTHROPIC_API_KEY=your_key"
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Create screenshots directory
mkdir -p /workspaces/agent-feed/screenshots/production-validation
echo -e "${GREEN}✓ Screenshots directory ready${NC}"
echo ""

# Run the test
echo "Starting production validation test..."
echo "This will:"
echo "  1. Open a real browser window"
echo "  2. Navigate to the application"
echo "  3. Send a test message to Claude"
echo "  4. Wait for real Claude response (up to 2 minutes)"
echo "  5. Validate response authenticity"
echo "  6. Take screenshots at every step"
echo ""
echo "Press Ctrl+C to abort..."
sleep 3
echo ""

cd /workspaces/agent-feed

# Run Playwright test
npx playwright test tests/e2e/production-validation-real-browser.spec.ts \
    --headed \
    --project=chromium \
    --reporter=list,html \
    --timeout=180000

# Check test result
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}=========================================="
    echo "✓ PRODUCTION VALIDATION PASSED"
    echo "==========================================${NC}"
    echo ""
    echo "Results available at:"
    echo "  - Screenshots: /workspaces/agent-feed/screenshots/production-validation/"
    echo "  - Report: /workspaces/agent-feed/screenshots/production-validation/validation-report.json"
    echo "  - HTML Report: /workspaces/agent-feed/playwright-report/index.html"
    echo ""

    # Generate comprehensive report
    node /workspaces/agent-feed/scripts/generate-validation-report.js

else
    echo ""
    echo -e "${RED}=========================================="
    echo "❌ PRODUCTION VALIDATION FAILED"
    echo "==========================================${NC}"
    echo ""
    echo "Debug information:"
    echo "  - Screenshots: /workspaces/agent-feed/screenshots/production-validation/"
    echo "  - Report: /workspaces/agent-feed/screenshots/production-validation/validation-report.json"
    echo ""
    echo "Common issues:"
    echo "  - 403 Forbidden: Check ANTHROPIC_API_KEY in backend .env"
    echo "  - Timeout: Claude API might be slow, or network issues"
    echo "  - UI not found: Frontend structure might have changed"
    echo ""
    exit 1
fi
