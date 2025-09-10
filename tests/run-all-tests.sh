#!/bin/bash

# Agent Feed - Comprehensive Test Runner
# This script runs all tests in the correct order for TDD validation

set -e  # Exit on any error

echo "🚀 Starting Agent Feed TDD Systematic Rebuild Tests"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to run test suite and track results
run_test_suite() {
    local suite_name=$1
    local test_command=$2
    
    echo -e "\n${YELLOW}Running $suite_name Tests...${NC}"
    echo "----------------------------------------"
    
    if eval $test_command; then
        echo -e "${GREEN}✅ $suite_name Tests PASSED${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}❌ $suite_name Tests FAILED${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

# Ensure we're in the right directory
cd "$(dirname "$0")/.."

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# 1. Health Check Tests - Verify system prerequisites
run_test_suite "Health Check" "npm run test:health"

# 2. Unit Tests - Test individual components
run_test_suite "Unit Tests" "npm run test:unit"

# 3. Integration Tests - Test component interactions
run_test_suite "Integration Tests" "npm run test:integration"

# 4. Regression Tests - Ensure no previous functionality is broken
run_test_suite "Regression Tests" "npm run test:regression"

# 5. End-to-End Tests - Test complete user workflows
run_test_suite "End-to-End Tests" "npm run test:e2e"

# Coverage Report
echo -e "\n${YELLOW}Generating Coverage Report...${NC}"
npm run test:coverage > coverage-report.txt 2>&1 || true

# Final Results
echo -e "\n🏁 Test Execution Complete"
echo "=========================="
echo -e "Total Test Suites: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n${GREEN}🎉 ALL TESTS PASSED! System is ready for production.${NC}"
    exit 0
else
    echo -e "\n${RED}⚠️  Some tests failed. Review the output above for details.${NC}"
    exit 1
fi