#!/bin/bash

# White Screen Prevention Test Runner
# Comprehensive test execution script for validating white screen fixes

set -e

echo "🚀 Starting White Screen Prevention Test Suite"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the frontend directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the frontend directory."
    exit 1
fi

# Create test results directory
mkdir -p test-results/white-screen-prevention

# Check if dev server is running
print_status "Checking if development server is running..."
if ! curl -s http://localhost:5173 > /dev/null; then
    print_warning "Development server not running. Starting it..."
    npm run dev &
    DEV_SERVER_PID=$!
    sleep 10

    # Check again
    if ! curl -s http://localhost:5173 > /dev/null; then
        print_error "Failed to start development server"
        exit 1
    fi
    print_success "Development server started"
else
    print_success "Development server is already running"
fi

# Run individual test suites
print_status "Running Main Page Load Tests..."
npx playwright test tests/e2e/white-screen-prevention/main-page-load.spec.ts \
    --config=tests/e2e/white-screen-prevention/white-screen-prevention.config.ts \
    --project=chromium-white-screen-prevention \
    --reporter=list || print_warning "Some main page load tests failed"

print_status "Running DOM Element Verification Tests..."
npx playwright test tests/e2e/white-screen-prevention/dom-element-verification.spec.ts \
    --config=tests/e2e/white-screen-prevention/white-screen-prevention.config.ts \
    --project=chromium-white-screen-prevention \
    --reporter=list || print_warning "Some DOM verification tests failed"

print_status "Running Console Error Detection Tests..."
npx playwright test tests/e2e/white-screen-prevention/console-error-detection.spec.ts \
    --config=tests/e2e/white-screen-prevention/white-screen-prevention.config.ts \
    --project=chromium-white-screen-prevention \
    --reporter=list || print_warning "Some console error tests failed"

print_status "Running Navigation Flow Tests..."
npx playwright test tests/e2e/white-screen-prevention/navigation-flow.spec.ts \
    --config=tests/e2e/white-screen-prevention/white-screen-prevention.config.ts \
    --project=chromium-white-screen-prevention \
    --reporter=list || print_warning "Some navigation tests failed"

print_status "Running UI Component Validation Tests..."
npx playwright test tests/e2e/white-screen-prevention/ui-component-validation.spec.ts \
    --config=tests/e2e/white-screen-prevention/white-screen-prevention.config.ts \
    --project=chromium-white-screen-prevention \
    --reporter=list || print_warning "Some UI component tests failed"

print_status "Running Error Recovery Tests..."
npx playwright test tests/e2e/white-screen-prevention/error-recovery.spec.ts \
    --config=tests/e2e/white-screen-prevention/white-screen-prevention.config.ts \
    --project=chromium-white-screen-prevention \
    --reporter=list || print_warning "Some error recovery tests failed"

print_status "Running Performance Measurement Tests..."
npx playwright test tests/e2e/white-screen-prevention/performance-measurement.spec.ts \
    --config=tests/e2e/white-screen-prevention/white-screen-prevention.config.ts \
    --project=chromium-white-screen-prevention \
    --reporter=list || print_warning "Some performance tests failed"

# Cross-browser testing (optional, can be slow)
if [ "$1" = "--cross-browser" ]; then
    print_status "Running Cross-Browser Compatibility Tests..."
    npx playwright test tests/e2e/white-screen-prevention/cross-browser-compatibility.spec.ts \
        --config=tests/e2e/white-screen-prevention/white-screen-prevention.config.ts \
        --reporter=list || print_warning "Some cross-browser tests failed"
fi

# Full suite run
print_status "Running Complete White Screen Prevention Test Suite..."
npx playwright test tests/e2e/white-screen-prevention/ \
    --config=tests/e2e/white-screen-prevention/white-screen-prevention.config.ts \
    --project=chromium-white-screen-prevention \
    --reporter=html,json,junit || print_warning "Some tests in the full suite failed"

# Generate summary report
print_status "Generating test summary..."

# Check if results file exists
RESULTS_FILE="test-results/white-screen-prevention-results.json"
if [ -f "$RESULTS_FILE" ]; then
    # Extract test summary using Node.js
    node -e "
    const fs = require('fs');
    const results = JSON.parse(fs.readFileSync('$RESULTS_FILE', 'utf8'));
    const stats = results.stats || {};
    const total = stats.expected || 0;
    const passed = stats.expected - (stats.failed || 0) - (stats.skipped || 0);
    const failed = stats.failed || 0;
    const skipped = stats.skipped || 0;

    console.log('\\n📊 WHITE SCREEN PREVENTION TEST SUMMARY');
    console.log('=========================================');
    console.log(\`Total Tests: \${total}\`);
    console.log(\`✅ Passed: \${passed}\`);
    console.log(\`❌ Failed: \${failed}\`);
    console.log(\`⏭️  Skipped: \${skipped}\`);
    console.log(\`📈 Success Rate: \${total > 0 ? Math.round((passed / total) * 100) : 0}%\`);

    if (failed > 0) {
        console.log('\\n⚠️  Some tests failed. Check the HTML report for details.');
        process.exit(1);
    } else {
        console.log('\\n🎉 All white screen prevention tests passed!');
    }
    " || print_warning "Could not generate test summary"
else
    print_warning "Test results file not found. Tests may not have completed successfully."
fi

# Open HTML report if available
if [ -f "test-results/white-screen-prevention-report/index.html" ]; then
    print_success "HTML test report generated at: test-results/white-screen-prevention-report/index.html"

    # Try to open report in browser (Linux/WSL)
    if command -v xdg-open > /dev/null; then
        print_status "Opening HTML report in browser..."
        xdg-open test-results/white-screen-prevention-report/index.html 2>/dev/null || true
    elif command -v open > /dev/null; then
        # macOS
        open test-results/white-screen-prevention-report/index.html 2>/dev/null || true
    fi
fi

# Cleanup
if [ ! -z "$DEV_SERVER_PID" ]; then
    print_status "Stopping development server..."
    kill $DEV_SERVER_PID 2>/dev/null || true
fi

print_success "White Screen Prevention Test Suite Completed!"
echo ""
echo "📁 Test artifacts saved to: test-results/white-screen-prevention/"
echo "📋 HTML Report: test-results/white-screen-prevention-report/index.html"
echo "📄 JSON Results: test-results/white-screen-prevention-results.json"
echo "🗂️  JUnit XML: test-results/white-screen-prevention-junit.xml"