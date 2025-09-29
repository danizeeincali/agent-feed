#!/bin/bash

# API Connectivity Test Runner
# Runs comprehensive API tests against real servers

set -e

echo "🚀 Starting API Connectivity Tests"
echo "=================================="

# Configuration
API_BASE_URL=${API_BASE_URL:-"http://localhost:3000"}
FRONTEND_URL=${FRONTEND_URL:-"http://localhost:5173"}
TEST_TIMEOUT=${TEST_TIMEOUT:-30000}

echo "📍 API Base URL: $API_BASE_URL"
echo "🌐 Frontend URL: $FRONTEND_URL"
echo "⏱️  Test Timeout: ${TEST_TIMEOUT}ms"
echo ""

# Check if servers are running
echo "🔍 Checking server availability..."

check_server() {
    local url=$1
    local name=$2
    local required=${3:-true}

    echo "Checking $name at $url..."

    if curl -s --max-time 5 "$url/api/health" > /dev/null 2>&1; then
        echo "✅ $name is running"
        return 0
    else
        if [ "$required" = true ]; then
            echo "❌ $name is not running at $url"
            echo "Please start the $name server before running tests"
            return 1
        else
            echo "⚠️ $name is not running (optional)"
            return 0
        fi
    fi
}

# Check backend (required)
if ! check_server "$API_BASE_URL" "Backend API" true; then
    echo ""
    echo "💡 To start the backend server:"
    echo "   cd /workspaces/agent-feed"
    echo "   node simple-backend.js"
    echo ""
    exit 1
fi

# Check frontend (optional)
check_server "$FRONTEND_URL" "Frontend" false || true

echo ""

# Create test results directory
mkdir -p test-results

# Run Jest tests
echo "🧪 Running Jest API Connectivity Tests..."
echo "----------------------------------------"

export API_BASE_URL
export FRONTEND_URL
export TEST_TIMEOUT

if npm run test -- --config tests/api-connectivity/jest.config.js --detectOpenHandles --forceExit; then
    echo "✅ Jest tests completed successfully"
    JEST_SUCCESS=true
else
    echo "❌ Jest tests failed"
    JEST_SUCCESS=false
fi

echo ""

# Run Playwright tests
echo "🎭 Running Playwright API Connectivity Tests..."
echo "------------------------------------------------"

if npx playwright test --config tests/api-connectivity/playwright.config.js; then
    echo "✅ Playwright tests completed successfully"
    PLAYWRIGHT_SUCCESS=true
else
    echo "❌ Playwright tests failed"
    PLAYWRIGHT_SUCCESS=false
fi

echo ""

# Generate summary report
echo "📊 Test Results Summary"
echo "======================"

if [ "$JEST_SUCCESS" = true ]; then
    echo "✅ Jest Tests: PASSED"
else
    echo "❌ Jest Tests: FAILED"
fi

if [ "$PLAYWRIGHT_SUCCESS" = true ]; then
    echo "✅ Playwright Tests: PASSED"
else
    echo "❌ Playwright Tests: FAILED"
fi

echo ""
echo "📁 Test artifacts saved in:"
echo "   - test-results/api-connectivity-results.xml (Jest JUnit)"
echo "   - test-results/api-connectivity-results.json (Playwright JSON)"
echo "   - test-results/api-connectivity-report/ (Playwright HTML)"

# Check if both test suites passed
if [ "$JEST_SUCCESS" = true ] && [ "$PLAYWRIGHT_SUCCESS" = true ]; then
    echo ""
    echo "🎉 All API Connectivity Tests PASSED!"
    echo "Your API endpoints are working correctly."
    exit 0
else
    echo ""
    echo "💥 Some API Connectivity Tests FAILED!"
    echo "Please review the test output above for details."
    exit 1
fi