#!/bin/bash

# Agent Dynamic Pages - Comprehensive Test Runner
# Runs all test types in sequence with proper reporting

set -e

echo "🚀 Starting Agent Dynamic Pages Test Suite"
echo "============================================"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results tracking
declare -A test_results

# Function to run test and track results
run_test() {
    local test_name=$1
    local test_command=$2
    
    echo -e "\n${BLUE}📋 Running: ${test_name}${NC}"
    echo "----------------------------------------"
    
    if eval $test_command; then
        echo -e "${GREEN}✅ ${test_name} - PASSED${NC}"
        test_results[$test_name]="PASSED"
    else
        echo -e "${RED}❌ ${test_name} - FAILED${NC}"
        test_results[$test_name]="FAILED"
    fi
}

# Create reports directory
mkdir -p tests/reports

# 1. Unit and Integration Tests
run_test "Unit & Integration Tests" "npm test -- --coverage --testPathPattern='(integration|components|api)' --coverageDirectory=tests/reports/coverage"

# 2. Performance Tests  
run_test "Performance Tests" "npm test -- --testPathPattern='performance' --verbose"

# 3. Accessibility Tests
run_test "Accessibility Tests" "npm test -- --testPathPattern='accessibility' --verbose"

# 4. E2E Tests - Chrome
run_test "E2E Tests (Chrome)" "npm run test:e2e -- --project=chromium"

# 5. E2E Tests - Firefox  
run_test "E2E Tests (Firefox)" "npm run test:e2e -- --project=firefox"

# 6. E2E Tests - Mobile
run_test "E2E Tests (Mobile)" "npm run test:e2e -- --project='Mobile Chrome'"

# 7. Cross-browser Accessibility
run_test "E2E Accessibility Tests" "npm run test:e2e -- --project=accessibility"

# Generate summary report
echo -e "\n${YELLOW}📊 Test Results Summary${NC}"
echo "========================================"

total_tests=0
passed_tests=0
failed_tests=0

for test_name in "${!test_results[@]}"; do
    result=${test_results[$test_name]}
    total_tests=$((total_tests + 1))
    
    if [ "$result" = "PASSED" ]; then
        echo -e "${GREEN}✅ $test_name${NC}"
        passed_tests=$((passed_tests + 1))
    else
        echo -e "${RED}❌ $test_name${NC}"
        failed_tests=$((failed_tests + 1))
    fi
done

echo "========================================"
echo -e "Total Tests: $total_tests"
echo -e "${GREEN}Passed: $passed_tests${NC}"
echo -e "${RED}Failed: $failed_tests${NC}"

# Calculate success rate
success_rate=$((passed_tests * 100 / total_tests))
echo -e "Success Rate: ${success_rate}%"

# Generate JSON report
cat > tests/reports/test-summary.json << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "total_tests": $total_tests,
  "passed_tests": $passed_tests,
  "failed_tests": $failed_tests,
  "success_rate": $success_rate,
  "test_results": {
EOF

first=true
for test_name in "${!test_results[@]}"; do
    if [ "$first" = false ]; then
        echo "," >> tests/reports/test-summary.json
    fi
    echo "    \"$test_name\": \"${test_results[$test_name]}\"" >> tests/reports/test-summary.json
    first=false
done

cat >> tests/reports/test-summary.json << EOF
  }
}
EOF

# Final status
echo -e "\n${YELLOW}📁 Reports Generated:${NC}"
echo "- Coverage: tests/reports/coverage/index.html"
echo "- E2E Report: tests/reports/playwright-report/index.html"
echo "- Summary: tests/reports/test-summary.json"

if [ $failed_tests -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All tests passed! Agent Dynamic Pages system is fully validated.${NC}"
    exit 0
else
    echo -e "\n${RED}⚠️  Some tests failed. Please review the results and fix issues.${NC}"
    exit 1
fi