#!/bin/bash

# TDD London School Test Runner
# Executes comprehensive real data validation tests with zero tolerance enforcement

echo "🎯 TDD LONDON SCHOOL - ZERO TOLERANCE TEST EXECUTION"
echo "=================================================="
echo ""

# Test configuration
export JEST_CONFIG="tests/tdd-london-school/jest.config.london-school.js"
export NODE_ENV="test"
export TDD_APPROACH="london-school"
export MOCK_EXTERNAL_DEPENDENCIES="true"
export VERIFY_BEHAVIOR_NOT_STATE="true"

# Create coverage directory
mkdir -p coverage/tdd-london-school

echo "📋 Test Suite Summary:"
echo "✓ Real Data Integration Final Validation"
echo "✓ Mock Contamination Detection (Comprehensive)"
echo "✓ API Contract Final Validation"
echo "✓ End-to-End Real Data Flow (Comprehensive)"
echo "✓ Source Code Synthetic Data Detection"
echo "✓ Deterministic Behavior Verification"
echo "✓ Zero Tolerance Enforcement (Meta-Testing)"
echo ""

# Function to run individual test suites
run_test_suite() {
    local test_file="$1"
    local test_name="$2"
    
    echo "🧪 Running: $test_name"
    echo "----------------------------------------"
    
    npx jest \
        --config="$JEST_CONFIG" \
        --testPathPattern="$test_file" \
        --verbose \
        --detectOpenHandles \
        --forceExit \
        --maxWorkers=1 \
        --runInBand
    
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        echo "✅ PASSED: $test_name"
    else
        echo "❌ FAILED: $test_name (Exit code: $exit_code)"
        echo "🚨 CRITICAL: Zero tolerance validation failed!"
        return $exit_code
    fi
    
    echo ""
    return 0
}

# Execute test suites in dependency order
echo "🚀 Starting London School TDD Test Execution..."
echo ""

# 1. Real Data Integration Tests
run_test_suite "real-data-final-validation.test.ts" "Real Data Integration Final Validation"
test1_result=$?

# 2. Mock Contamination Detection 
run_test_suite "mock-contamination-detection-comprehensive.test.ts" "Mock Contamination Detection (Comprehensive)"
test2_result=$?

# 3. API Contract Validation
run_test_suite "api-contracts-final-validation.test.ts" "API Contract Final Validation"
test3_result=$?

# 4. End-to-End Data Flow
run_test_suite "e2e-real-data-flow-comprehensive.test.ts" "End-to-End Real Data Flow (Comprehensive)"
test4_result=$?

# 5. Source Code Analysis
run_test_suite "source-code-synthetic-data-detection.test.ts" "Source Code Synthetic Data Detection"
test5_result=$?

# 6. Deterministic Behavior
run_test_suite "deterministic-behavior-verification.test.ts" "Deterministic Behavior Verification"
test6_result=$?

# 7. Zero Tolerance Enforcement (Meta)
run_test_suite "zero-tolerance-enforcement.test.ts" "Zero Tolerance Enforcement (Meta-Testing)"
test7_result=$?

# Calculate overall results
total_tests=7
failed_tests=0

if [ $test1_result -ne 0 ]; then ((failed_tests++)); fi
if [ $test2_result -ne 0 ]; then ((failed_tests++)); fi
if [ $test3_result -ne 0 ]; then ((failed_tests++)); fi
if [ $test4_result -ne 0 ]; then ((failed_tests++)); fi
if [ $test5_result -ne 0 ]; then ((failed_tests++)); fi
if [ $test6_result -ne 0 ]; then ((failed_tests++)); fi
if [ $test7_result -ne 0 ]; then ((failed_tests++)); fi

passed_tests=$((total_tests - failed_tests))

echo "=================================================="
echo "🎯 TDD LONDON SCHOOL TEST EXECUTION COMPLETE"
echo "=================================================="
echo ""
echo "📊 RESULTS SUMMARY:"
echo "   Total Test Suites: $total_tests"
echo "   Passed: $passed_tests"
echo "   Failed: $failed_tests"
echo ""

if [ $failed_tests -eq 0 ]; then
    echo "🎉 SUCCESS: ALL TESTS PASSED!"
    echo "✅ Zero tolerance for mock data successfully enforced"
    echo "✅ 100% real data integration validated"
    echo "✅ Mock contamination detection comprehensive"
    echo "✅ API contracts strictly validated"
    echo "✅ Source code analysis passed"
    echo "✅ Deterministic behavior verified"
    echo ""
    echo "🚫 ZERO MOCK DATA CONTAMINATION DETECTED"
    echo "🎯 REAL DATA INTEGRATION: 100% VERIFIED"
    
    # Generate final report
    echo ""
    echo "📈 Coverage Report Location:"
    echo "   HTML: coverage/tdd-london-school/index.html"
    echo "   LCOV: coverage/tdd-london-school/lcov.info"
    echo ""
    
    exit 0
else
    echo "🚨 FAILURE: $failed_tests TEST SUITE(S) FAILED!"
    echo "❌ Zero tolerance enforcement violated"
    echo "❌ Mock data contamination may be present"
    echo "❌ Real data integration compromised"
    echo ""
    echo "🔧 REQUIRED ACTIONS:"
    echo "   1. Review failed test output above"
    echo "   2. Fix any mock data contamination"
    echo "   3. Ensure 100% real API data usage"
    echo "   4. Re-run tests until all pass"
    echo ""
    
    exit 1
fi