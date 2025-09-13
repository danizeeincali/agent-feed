#!/bin/bash

# TDD London School Agent Pages Test Runner
# Comprehensive test execution with proper reporting

set -e

echo "🧪 TDD London School - Agent Pages Test Suite"
echo "============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TEST_DIR="/workspaces/agent-feed/frontend/tests/tdd-london-school/agent-pages"
COVERAGE_DIR="${TEST_DIR}/coverage"
REPORTS_DIR="${TEST_DIR}/reports"

# Create required directories
mkdir -p "${COVERAGE_DIR}" "${REPORTS_DIR}"

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to run test suite
run_test_suite() {
    local suite_name=$1
    local test_pattern=$2
    local description=$3
    
    print_status $BLUE "Running ${suite_name}..."
    echo "Description: ${description}"
    echo "Pattern: ${test_pattern}"
    echo ""
    
    # Run Jest with specific configuration
    npx jest \
        --config="${TEST_DIR}/jest.config.js" \
        --testPathPattern="${test_pattern}" \
        --coverage \
        --coverageDirectory="${COVERAGE_DIR}/${suite_name}" \
        --coverageReporters=text,html,json \
        --verbose \
        --detectOpenHandles \
        --forceExit \
        --maxWorkers=4 \
        --testTimeout=10000 \
        --reporters=default,jest-junit \
        --outputFile="${REPORTS_DIR}/${suite_name}-results.xml" \
        || {
            print_status $RED "❌ ${suite_name} failed!"
            return 1
        }
    
    print_status $GREEN "✅ ${suite_name} completed successfully!"
    echo ""
}

# Main test execution
main() {
    print_status $YELLOW "Starting TDD London School test execution..."
    echo "Test directory: ${TEST_DIR}"
    echo "Coverage directory: ${COVERAGE_DIR}"
    echo "Reports directory: ${REPORTS_DIR}"
    echo ""
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        print_status $YELLOW "Installing dependencies..."
        npm install
    fi
    
    # Clear previous coverage and reports
    rm -rf "${COVERAGE_DIR}" "${REPORTS_DIR}"
    mkdir -p "${COVERAGE_DIR}" "${REPORTS_DIR}"
    
    local total_tests=0
    local passed_tests=0
    local start_time=$(date +%s)
    
    # Unit Tests
    if run_test_suite "unit-tests" "unit/" "Mock-driven unit tests with behavior verification"; then
        ((passed_tests++))
    fi
    ((total_tests++))
    
    # Integration Tests
    if run_test_suite "integration-tests" "integration/" "Outside-in integration tests with full workflow coverage"; then
        ((passed_tests++))
    fi
    ((total_tests++))
    
    # All Tests Combined
    if run_test_suite "all-tests" "." "Complete TDD London School test suite"; then
        ((passed_tests++))
    fi
    ((total_tests++))
    
    # Calculate execution time
    local end_time=$(date +%s)
    local execution_time=$((end_time - start_time))
    
    # Generate combined coverage report
    print_status $BLUE "Generating combined coverage report..."
    npx jest \
        --config="${TEST_DIR}/jest.config.js" \
        --coverage \
        --coverageDirectory="${COVERAGE_DIR}/combined" \
        --coverageReporters=text-summary,html,json,lcov \
        --passWithNoTests \
        --silent \
        2>/dev/null || true
    
    # Generate test summary
    cat > "${REPORTS_DIR}/test-summary.md" << EOF
# TDD London School - Agent Pages Test Results

## Execution Summary
- **Total Test Suites**: ${total_tests}
- **Passed Test Suites**: ${passed_tests}
- **Failed Test Suites**: $((total_tests - passed_tests))
- **Success Rate**: $(( (passed_tests * 100) / total_tests ))%
- **Execution Time**: ${execution_time} seconds
- **Timestamp**: $(date)

## Test Suites

### Unit Tests
- **Focus**: Mock-driven unit tests with behavior verification
- **Methodology**: London School TDD with outside-in development
- **Coverage**: Component loading, API endpoints, validation

### Integration Tests  
- **Focus**: Frontend-backend integration workflows
- **Methodology**: Contract-driven integration testing
- **Coverage**: Complete user workflows, error boundaries, registry management

## Coverage Reports
- Combined: \`${COVERAGE_DIR}/combined/lcov-report/index.html\`
- Unit Tests: \`${COVERAGE_DIR}/unit-tests/lcov-report/index.html\`
- Integration Tests: \`${COVERAGE_DIR}/integration-tests/lcov-report/index.html\`

## Test Reports
- JUnit XML: \`${REPORTS_DIR}/*-results.xml\`
- Summary: \`${REPORTS_DIR}/test-summary.md\`
EOF
    
    # Print final results
    echo ""
    print_status $BLUE "🎯 Test Execution Complete!"
    echo "============================================="
    print_status $GREEN "✅ Passed: ${passed_tests}/${total_tests} test suites"
    
    if [ ${passed_tests} -eq ${total_tests} ]; then
        print_status $GREEN "🏆 All tests passed! TDD London School methodology validated."
        
        # Check coverage thresholds
        local coverage_file="${COVERAGE_DIR}/combined/coverage-summary.json"
        if [ -f "${coverage_file}" ]; then
            local lines_coverage=$(cat "${coverage_file}" | jq -r '.total.lines.pct // 0')
            local branches_coverage=$(cat "${coverage_file}" | jq -r '.total.branches.pct // 0')
            
            if (( $(echo "${lines_coverage} >= 85" | bc -l) )); then
                print_status $GREEN "📊 Coverage threshold met: ${lines_coverage}% lines"
            else
                print_status $YELLOW "⚠️  Coverage below threshold: ${lines_coverage}% lines (target: 85%)"
            fi
        fi
        
        echo ""
        print_status $BLUE "📋 Test Summary Report: ${REPORTS_DIR}/test-summary.md"
        print_status $BLUE "🔍 Coverage Report: ${COVERAGE_DIR}/combined/lcov-report/index.html"
        
        exit 0
    else
        print_status $RED "❌ $(( total_tests - passed_tests )) test suite(s) failed!"
        print_status $YELLOW "Check individual test outputs above for details"
        exit 1
    fi
}

# Trap to cleanup on exit
cleanup() {
    print_status $YELLOW "Cleaning up test processes..."
    # Kill any hanging processes
    pkill -f jest || true
}

trap cleanup EXIT

# Run main function
main "$@"