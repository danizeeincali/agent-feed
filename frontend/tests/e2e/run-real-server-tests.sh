#!/bin/bash

# Real Server E2E Test Runner
# Runs comprehensive browser tests against actual running servers

set -e

echo "🚀 REAL SERVER E2E TESTING - NO MOCKS POLICY"
echo "=============================================="

# Configuration
FRONTEND_URL="http://127.0.0.1:5173"
BACKEND_URL="http://localhost:3000"
TEST_TARGET_URL="$FRONTEND_URL/agents/personal-todos-agent/pages/015b7296-a144-4096-9c60-ee5d7f900723"
RESULTS_DIR="/workspaces/agent-feed/frontend/tests/e2e/test-results"
SCREENSHOTS_DIR="/workspaces/agent-feed/frontend/tests/e2e/screenshots"

# Create directories
mkdir -p "$RESULTS_DIR"
mkdir -p "$SCREENSHOTS_DIR"

echo "📋 Test Configuration:"
echo "  Target URL: $TEST_TARGET_URL"
echo "  Frontend Server: $FRONTEND_URL"
echo "  Backend Server: $BACKEND_URL"
echo "  Results Dir: $RESULTS_DIR"
echo ""

# Check if servers are running
check_server() {
    local url=$1
    local name=$2
    echo -n "🔍 Checking $name server ($url)... "
    
    if curl -s -f "$url" > /dev/null 2>&1; then
        echo "✅ RUNNING"
        return 0
    else
        echo "❌ NOT RUNNING"
        return 1
    fi
}

# Health check for servers
echo "🏥 Server Health Check:"
check_server "$FRONTEND_URL" "Frontend" || {
    echo "❌ Frontend server not running at $FRONTEND_URL"
    echo "   Please start with: cd frontend && npm run dev"
    exit 1
}

check_server "$BACKEND_URL/api/health" "Backend" || {
    echo "❌ Backend server not running at $BACKEND_URL"
    echo "   Please start with: node simple-backend.js"
    exit 1
}

echo ""

# Install Playwright if needed
echo "🎭 Setting up Playwright..."
cd /workspaces/agent-feed/frontend
if [ ! -d "node_modules/@playwright" ]; then
    echo "Installing Playwright..."
    npm install @playwright/test@latest
fi

# Install browsers if needed
if [ ! -d "$HOME/.cache/ms-playwright" ]; then
    echo "Installing Playwright browsers..."
    npx playwright install chromium firefox
fi

echo ""

# Run the real server tests
echo "🧪 Running Real Server E2E Tests..."
echo "Target: $TEST_TARGET_URL"
echo ""

# Set environment variables for the test
export TEST_TARGET_URL
export FRONTEND_URL  
export BACKEND_URL
export PWDEBUG=1  # Enable Playwright debug mode

# Run tests with detailed logging
npx playwright test \
    --config=tests/config/real-server-playwright.config.ts \
    --reporter=list,html,json \
    --output=tests/e2e/test-results \
    --headed \
    --slowmo=1000 \
    tests/e2e/real-agent-pages-infinite-loading.spec.ts

TEST_EXIT_CODE=$?

echo ""
echo "📊 Test Results Summary:"
echo "========================"

# Check if results file exists
RESULTS_FILE="$RESULTS_DIR/results.json"
if [ -f "$RESULTS_FILE" ]; then
    echo "✅ Results file generated: $RESULTS_FILE"
    
    # Parse results with jq if available
    if command -v jq > /dev/null 2>&1; then
        TOTAL_TESTS=$(jq '.stats.total' "$RESULTS_FILE" 2>/dev/null || echo "unknown")
        PASSED_TESTS=$(jq '.stats.passed' "$RESULTS_FILE" 2>/dev/null || echo "unknown")
        FAILED_TESTS=$(jq '.stats.failed' "$RESULTS_FILE" 2>/dev/null || echo "unknown")
        
        echo "  Total Tests: $TOTAL_TESTS"
        echo "  Passed: $PASSED_TESTS"
        echo "  Failed: $FAILED_TESTS"
    fi
else
    echo "⚠️ Results file not found"
fi

# Check for screenshots
SCREENSHOT_COUNT=$(ls -1 "$SCREENSHOTS_DIR"/*.png 2>/dev/null | wc -l || echo "0")
echo "📷 Screenshots captured: $SCREENSHOT_COUNT"

if [ $SCREENSHOT_COUNT -gt 0 ]; then
    echo "  Screenshots location: $SCREENSHOTS_DIR/"
    ls -la "$SCREENSHOTS_DIR"/*.png 2>/dev/null || true
fi

# Check for HTML report
HTML_REPORT="/workspaces/agent-feed/frontend/tests/e2e/playwright-report/index.html"
if [ -f "$HTML_REPORT" ]; then
    echo "📋 HTML Report: $HTML_REPORT"
fi

echo ""

# Final status
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "✅ ALL TESTS PASSED - No infinite loading detected"
else
    echo "❌ TESTS FAILED - Infinite loading issue confirmed"
    echo ""
    echo "🔍 Debugging Information:"
    echo "  1. Check screenshots in: $SCREENSHOTS_DIR/"
    echo "  2. Review HTML report: $HTML_REPORT"  
    echo "  3. Check console errors in test output above"
    echo "  4. Verify network requests in test logs"
    echo ""
    echo "🚨 INFINITE LOADING DIAGNOSIS:"
    echo "  The real browser tests have captured the exact failure point."
    echo "  Review the test output above for:"
    echo "    - Console errors causing the loading state"
    echo "    - Failed API calls preventing data loading"
    echo "    - Component mounting issues"
    echo "    - React routing problems"
fi

echo ""
echo "🏁 Real Server E2E Testing Complete"
echo "Exit Code: $TEST_EXIT_CODE"

exit $TEST_EXIT_CODE