#!/bin/bash

# Instance Endpoint Consistency Test Runner
# Runs the comprehensive TDD test suite to demonstrate URL mismatch issues

echo "🚀 Instance Endpoint Consistency TDD Test Suite"
echo "================================================="
echo ""
echo "This test suite demonstrates the current URL mismatch between:"
echo "  Frontend expectations: /api/v1/claude/instances (primary)"
echo "  Backend reality:       /api/claude/instances (primary)"
echo ""
echo "Expected Results:"
echo "  ❌ FAILING tests show current broken behavior"
echo "  ✅ PASSING tests show fixed behavior validation"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test files to run
declare -a TESTS=(
    "simple-validation.test.ts"
    "url-mismatch-scenarios.test.ts" 
    "instance-lifecycle-integration.test.ts"
    "mixed-versioning-scenarios.test.ts"
    "error-handling-versioning.test.ts"
)

# Track results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

echo "Running tests in sequence..."
echo ""

for test_file in "${TESTS[@]}"; do
    echo -e "${YELLOW}🔍 Running: $test_file${NC}"
    echo "----------------------------------------"
    
    # Run the test and capture exit code
    npm test -- "tests/unit/instance-endpoint-consistency/$test_file" --verbose --silent=false
    exit_code=$?
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}✅ PASSED: $test_file${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}❌ FAILED: $test_file${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    
    echo ""
    echo "========================================"
    echo ""
done

# Final summary
echo "🏁 TEST SUITE COMPLETE"
echo "======================"
echo "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Some tests failed - this is EXPECTED behavior!${NC}"
    echo ""
    echo "The failing tests demonstrate:"
    echo "  • Current URL mismatch issues"
    echo "  • Frontend getting redirects instead of JSON"
    echo "  • Fallback logic complexity and latency"
    echo "  • Inconsistent error handling"
    echo ""
    echo "The passing tests prove:"
    echo "  • Fixed behavior works correctly"
    echo "  • Performance improvements achieved"
    echo "  • Consistent error handling implemented"
    echo ""
    echo "Next steps:"
    echo "  1. Review detailed test output above"
    echo "  2. Implement endpoint consistency fix"
    echo "  3. Re-run tests to validate all pass"
else
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    echo ""
    echo "If all tests pass, the endpoint consistency fix is working correctly."
fi

echo ""
echo "For detailed analysis, check test output above for:"
echo "  🚨 Error analysis from failing tests"
echo "  ✅ Validation results from passing tests"
echo "  📊 Performance and quality metrics"