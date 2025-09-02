#!/bin/bash

# Comprehensive E2E Regression Test Runner Script
# Runs all Claude Instance Management regression tests

echo "🚀 Starting Claude Instance Management E2E Regression Tests"
echo "========================================================"

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

# Check prerequisites
print_status "Checking prerequisites..."

# Check if backend is running
if ! curl -s http://localhost:3333/health > /dev/null 2>&1; then
    print_error "Backend server not responding. Please start with: npm run dev"
    exit 1
fi
print_success "Backend server is running"

# Check if frontend is running
if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
    print_error "Frontend server not responding. Please start with: cd frontend && npm run dev"
    exit 1
fi
print_success "Frontend server is running"

# Check if Playwright browsers are installed
if ! npx playwright --version > /dev/null 2>&1; then
    print_warning "Playwright not found, installing..."
    npm install @playwright/test
    npx playwright install
fi
print_success "Playwright is available"

# Create reports directory
mkdir -p src/tests/reports
print_status "Reports directory ready"

# Clean up any existing instances before starting
print_status "Cleaning up existing Claude instances..."
curl -s -X DELETE http://localhost:3333/api/v1/claude/instances > /dev/null 2>&1 || true

# Run regression test suites
print_status "Running regression test suites..."

# Run each test suite individually for better reporting
TEST_SUITES=(
    "claude-instance-management.spec.ts"
    "claude-instance-performance.spec.ts" 
    "claude-instance-error-scenarios.spec.ts"
)

TOTAL_PASSED=0
TOTAL_FAILED=0
FAILED_SUITES=()

for suite in "${TEST_SUITES[@]}"; do
    print_status "Running $suite..."
    
    # Run Playwright test with JSON output
    if npx playwright test "src/tests/e2e/regression/$suite" \
        --reporter=json \
        --output=src/tests/reports/"${suite%.spec.ts}-results.json" \
        --timeout=60000 \
        --retries=1 \
        --workers=1; then
        print_success "$suite completed successfully"
        ((TOTAL_PASSED++))
    else
        print_error "$suite failed"
        ((TOTAL_FAILED++))
        FAILED_SUITES+=("$suite")
    fi
    
    # Brief pause between test suites
    sleep 2
done

# Run comprehensive test runner for detailed report
print_status "Generating comprehensive regression report..."
if npx tsx src/tests/e2e/regression/test-runner.ts; then
    print_success "Comprehensive report generated"
else
    print_warning "Comprehensive report generation had issues"
fi

# Summary
echo ""
echo "========================================================"
echo "🎯 REGRESSION TEST SUMMARY"
echo "========================================================"
echo "Test Suites Passed: $TOTAL_PASSED ✅"
echo "Test Suites Failed: $TOTAL_FAILED ❌"

if [ ${#FAILED_SUITES[@]} -gt 0 ]; then
    echo ""
    echo "Failed Suites:"
    for suite in "${FAILED_SUITES[@]}"; do
        echo "  ❌ $suite"
    done
fi

echo ""
print_status "Reports available in: frontend/src/tests/reports/"
print_status "HTML reports can be opened in browser"
print_status "JSON reports contain detailed test data"

# Exit with appropriate code
if [ $TOTAL_FAILED -gt 0 ]; then
    print_error "Some regression tests failed!"
    exit 1
else
    print_success "All regression tests passed! 🎉"
    exit 0
fi