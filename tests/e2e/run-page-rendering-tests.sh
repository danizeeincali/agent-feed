#!/bin/bash

###############################################################################
# Page Rendering E2E Test Runner
#
# This script validates the setup and runs the page rendering tests.
###############################################################################

set -e

echo "=========================================="
echo "Page Rendering E2E Test Runner"
echo "=========================================="
echo ""

# Navigate to test directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Step 1: Validate setup
echo "Step 1: Validating test setup..."
echo "----------------------------------------"
if [ -f "validate-test-setup.sh" ]; then
    ./validate-test-setup.sh
    VALIDATION_RESULT=$?

    if [ $VALIDATION_RESULT -ne 0 ]; then
        echo ""
        echo "Setup validation failed. Please fix errors before running tests."
        exit 1
    fi
else
    echo "Warning: validate-test-setup.sh not found. Skipping validation."
fi

echo ""
echo "Step 2: Installing dependencies..."
echo "----------------------------------------"
if [ ! -d "node_modules" ]; then
    echo "Installing npm packages..."
    npm install
else
    echo "Dependencies already installed."
fi

echo ""
echo "Step 3: Checking Playwright browsers..."
echo "----------------------------------------"
if [ ! -d "$HOME/.cache/ms-playwright" ] && [ ! -d "$HOME/Library/Caches/ms-playwright" ]; then
    echo "Installing Playwright browsers..."
    npx playwright install
else
    echo "Playwright browsers already installed."
fi

echo ""
echo "Step 4: Running E2E tests..."
echo "----------------------------------------"
echo ""

# Parse command line arguments
MODE="${1:-normal}"

case "$MODE" in
    headed)
        echo "Running tests in HEADED mode (visible browser)..."
        npm run test:rendering:headed
        ;;
    debug)
        echo "Running tests in DEBUG mode..."
        npm run test:rendering:debug
        ;;
    ui)
        echo "Running tests in UI mode..."
        npx playwright test page-rendering-fix.spec.ts --ui
        ;;
    *)
        echo "Running tests in NORMAL mode..."
        npm run test:rendering
        ;;
esac

TEST_RESULT=$?

echo ""
echo "=========================================="
echo "Test Execution Complete"
echo "=========================================="
echo ""

if [ $TEST_RESULT -eq 0 ]; then
    echo "✅ All tests PASSED!"
    echo ""
    echo "View results:"
    echo "  - Screenshots: screenshots/page-rendering-fix/"
    echo "  - HTML Report: npm run test:report"
    echo "  - JSON Results: results/test-results.json"
else
    echo "❌ Some tests FAILED!"
    echo ""
    echo "Debug options:"
    echo "  - Review screenshots: screenshots/page-rendering-fix/"
    echo "  - Run with browser visible: ./run-page-rendering-tests.sh headed"
    echo "  - Run with debugger: ./run-page-rendering-tests.sh debug"
    echo "  - View HTML report: npm run test:report"
fi

echo ""

exit $TEST_RESULT
