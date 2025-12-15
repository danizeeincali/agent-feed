#!/bin/bash
# Run Onboarding E2E Tests with Screenshot Validation
#
# This script runs the complete E2E test suite for the onboarding flow.
# Tests WILL FAIL in RED phase until backend fixes are implemented.

set -e

echo ""
echo "🎬 Onboarding E2E Test Suite Runner"
echo "===================================="
echo ""

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v npx &> /dev/null; then
    echo "❌ npx not found. Please install Node.js"
    exit 1
fi

echo "✅ npx found"

# Check Playwright installation
if ! npx playwright --version &> /dev/null; then
    echo "⚠️  Playwright not found. Installing..."
    npm install -D @playwright/test
    npx playwright install
fi

echo "✅ Playwright installed"

# Create screenshot directory
mkdir -p /workspaces/agent-feed/tests/screenshots/onboarding
echo "✅ Screenshot directory ready"

# Check backend health
echo ""
echo "📋 Checking backend status..."
if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "✅ Backend is running"
else
    echo "⚠️  Backend not responding. Starting backend..."
    cd /workspaces/agent-feed/api-server
    npm start &
    BACKEND_PID=$!
    echo "⏳ Waiting for backend to start..."
    sleep 10
fi

# Check frontend
echo ""
echo "📋 Checking frontend status..."
if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo "✅ Frontend is running"
else
    echo "⚠️  Frontend not responding. Starting frontend..."
    cd /workspaces/agent-feed/frontend
    npm run dev &
    FRONTEND_PID=$!
    echo "⏳ Waiting for frontend to start..."
    sleep 10
fi

# Run tests
echo ""
echo "🎬 Running E2E tests..."
echo ""
echo "⚠️  EXPECTED: Tests will FAIL in RED phase"
echo "   These tests validate requirements before implementation"
echo ""

cd /workspaces/agent-feed

# Run with different options based on environment
if [ "$CI" = "true" ]; then
    echo "📊 Running in CI mode (headless, with retries)"
    npx playwright test --config playwright.config.onboarding.ts \
        --reporter=html,json,junit
else
    echo "🖥️  Running in development mode"
    echo ""
    echo "Choose test mode:"
    echo "  1) Headless (faster)"
    echo "  2) UI Mode (debugging, recommended)"
    echo "  3) Headed (see browser)"
    echo ""
    read -p "Select mode (1-3): " mode
    
    case $mode in
        1)
            npx playwright test --config playwright.config.onboarding.ts
            ;;
        2)
            npx playwright test --config playwright.config.onboarding.ts --ui
            ;;
        3)
            npx playwright test --config playwright.config.onboarding.ts --headed
            ;;
        *)
            echo "Invalid selection. Running headless."
            npx playwright test --config playwright.config.onboarding.ts
            ;;
    esac
fi

TEST_EXIT_CODE=$?

# Show results
echo ""
echo "📊 Test Results"
echo "=============="
echo ""

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "✅ ALL TESTS PASSED!"
    echo ""
    echo "🎉 Onboarding flow is working correctly!"
    echo ""
else
    echo "❌ TESTS FAILED (Expected in RED phase)"
    echo ""
    echo "This is EXPECTED behavior in RED phase."
    echo "Tests define the requirements before implementation."
    echo ""
    echo "Next steps:"
    echo "  1. Review failed test screenshots in tests/screenshots/onboarding/"
    echo "  2. Implement backend fixes per ONBOARDING-FLOW-SPEC.md"
    echo "  3. Re-run tests until GREEN"
    echo ""
fi

# Show report location
echo "📊 Test Reports:"
echo "   HTML: tests/e2e/reports/index.html"
echo "   JSON: tests/e2e/reports/onboarding-results.json"
echo "   JUnit: tests/e2e/reports/onboarding-junit.xml"
echo ""

echo "📸 Screenshots:"
echo "   Location: tests/screenshots/onboarding/"
echo "   Count: $(ls tests/screenshots/onboarding/*.png 2>/dev/null | wc -l) files"
echo ""

# Open HTML report if not in CI
if [ "$CI" != "true" ] && [ $TEST_EXIT_CODE -ne 0 ]; then
    read -p "Open HTML report? (y/n): " open_report
    if [ "$open_report" = "y" ]; then
        npx playwright show-report tests/e2e/reports
    fi
fi

echo ""
echo "✅ E2E test run complete"
echo ""

exit $TEST_EXIT_CODE
