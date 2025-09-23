#!/bin/bash

# Component Registry Test Suite Runner
# Comprehensive test execution with detailed reporting

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test configuration
TEST_DIR="/workspaces/agent-feed/frontend/tests/tdd-london-school/component-registry"
REPORTS_DIR="${TEST_DIR}/reports"
COVERAGE_DIR="${TEST_DIR}/coverage"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Ensure directories exist
mkdir -p "${REPORTS_DIR}"
mkdir -p "${COVERAGE_DIR}"

echo -e "${BLUE}🧪 Component Registry Test Suite${NC}"
echo "================================================="
echo "Test Directory: ${TEST_DIR}"
echo "Reports Directory: ${REPORTS_DIR}"
echo "Timestamp: ${TIMESTAMP}"
echo ""

# Function to print section headers
print_section() {
    echo -e "\n${BLUE}=== $1 ===${NC}"
}

# Function to print success messages
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Function to print warning messages
print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Function to print error messages
print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Change to test directory
cd "${TEST_DIR}"

# Check if required dependencies are installed
print_section "Dependency Check"

# Check for Jest
if ! command -v jest &> /dev/null; then
    if [ -f "../../../../node_modules/.bin/jest" ]; then
        JEST_CMD="../../../../node_modules/.bin/jest"
        print_success "Jest found in node_modules"
    else
        print_error "Jest not found. Please run npm install first."
        exit 1
    fi
else
    JEST_CMD="jest"
    print_success "Jest found globally"
fi

# Check for required test files
REQUIRED_FILES=(
    "jest.config.js"
    "test-setup.ts"
    "unit/navigation-components.test.ts"
    "unit/layout-components.test.ts" 
    "unit/form-components.test.ts"
    "unit/display-components.test.ts"
    "security/component-security.test.ts"
    "integration/component-registry.test.ts"
    "integration/mobile-responsiveness.test.ts"
    "test-utilities.ts"
)

print_section "Test File Validation"
missing_files=0

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        print_success "Found: $file"
    else
        print_error "Missing: $file"
        missing_files=$((missing_files + 1))
    fi
done

if [ $missing_files -gt 0 ]; then
    print_error "Missing $missing_files required test files"
    exit 1
fi

# Run test suites
print_section "Running Test Suites"

# Set test environment variables
export NODE_ENV=test
export CI=true

# Test execution function
run_test_suite() {
    local suite_name=$1
    local test_pattern=$2
    local output_file="${REPORTS_DIR}/${suite_name}-results-${TIMESTAMP}.xml"
    
    echo -e "\n${YELLOW}Running ${suite_name} tests...${NC}"
    
    if ${JEST_CMD} --config=jest.config.js \
        --testPathPattern="${test_pattern}" \
        --verbose \
        --reporters=default \
        --reporters=jest-junit \
        --outputFile="${output_file}" \
        --coverage \
        --coverageDirectory="${COVERAGE_DIR}/${suite_name}" \
        --collectCoverageFrom="../../../src/services/ComponentRegistry.ts" \
        --collectCoverageFrom="../../../src/services/AgentComponentRegistry.ts" \
        --collectCoverageFrom="../../../src/components/ui/**/*.tsx" \
        --coverageReporters=text \
        --coverageReporters=html \
        --coverageReporters=lcov; then
        print_success "${suite_name} tests passed"
        return 0
    else
        print_error "${suite_name} tests failed"
        return 1
    fi
}

# Track test results
failed_suites=()

# 1. Unit Tests - Navigation Components
if ! run_test_suite "navigation" "unit/navigation-components.test.ts"; then
    failed_suites+=("navigation")
fi

# 2. Unit Tests - Layout Components
if ! run_test_suite "layout" "unit/layout-components.test.ts"; then
    failed_suites+=("layout")
fi

# 3. Unit Tests - Form Components  
if ! run_test_suite "form" "unit/form-components.test.ts"; then
    failed_suites+=("form")
fi

# 4. Unit Tests - Display Components
if ! run_test_suite "display" "unit/display-components.test.ts"; then
    failed_suites+=("display")
fi

# 5. Security Tests
if ! run_test_suite "security" "security/component-security.test.ts"; then
    failed_suites+=("security")
fi

# 6. Integration Tests - Registry
if ! run_test_suite "registry-integration" "integration/component-registry.test.ts"; then
    failed_suites+=("registry-integration")
fi

# 7. Integration Tests - Mobile Responsiveness
if ! run_test_suite "mobile-responsiveness" "integration/mobile-responsiveness.test.ts"; then
    failed_suites+=("mobile-responsiveness")
fi

# 8. Run all tests together for comprehensive coverage
print_section "Comprehensive Test Run"

echo -e "\n${YELLOW}Running all tests together for comprehensive coverage...${NC}"

if ${JEST_CMD} --config=jest.config.js \
    --verbose \
    --coverage \
    --coverageDirectory="${COVERAGE_DIR}/comprehensive" \
    --collectCoverageFrom="../../../src/services/ComponentRegistry.ts" \
    --collectCoverageFrom="../../../src/services/AgentComponentRegistry.ts" \
    --collectCoverageFrom="../../../src/components/ui/**/*.tsx" \
    --coverageReporters=text \
    --coverageReporters=html \
    --coverageReporters=lcov \
    --coverageReporters=json-summary \
    --reporters=default \
    --reporters=jest-html-reporters \
    --outputFile="${REPORTS_DIR}/comprehensive-report-${TIMESTAMP}.html"; then
    print_success "Comprehensive test run completed"
else
    print_error "Comprehensive test run failed"
    failed_suites+=("comprehensive")
fi

# Generate summary report
print_section "Test Summary"

total_suites=8
passed_suites=$((total_suites - ${#failed_suites[@]}))

echo "Test Execution Summary:"
echo "  Total Test Suites: $total_suites"
echo "  Passed: $passed_suites"
echo "  Failed: ${#failed_suites[@]}"

if [ ${#failed_suites[@]} -eq 0 ]; then
    print_success "All test suites passed! 🎉"
    exit_code=0
else
    print_error "Failed test suites:"
    for suite in "${failed_suites[@]}"; do
        echo "  - $suite"
    done
    exit_code=1
fi

# Coverage report location
print_section "Generated Reports"

echo "Coverage Reports:"
echo "  Comprehensive HTML: ${COVERAGE_DIR}/comprehensive/index.html"
echo "  Individual Suite Reports: ${COVERAGE_DIR}/"

echo ""
echo "Test Result Reports:"
echo "  XML Reports: ${REPORTS_DIR}/*-results-*.xml"
echo "  HTML Report: ${REPORTS_DIR}/comprehensive-report-${TIMESTAMP}.html"

# Performance metrics
print_section "Performance Metrics"

if [ -f "${COVERAGE_DIR}/comprehensive/coverage-summary.json" ]; then
    echo "Coverage Summary:"
    cat "${COVERAGE_DIR}/comprehensive/coverage-summary.json" | grep -E '"lines"|"functions"|"branches"|"statements"' | head -4
fi

# Open coverage report if in interactive mode
if [ -t 1 ] && command -v xdg-open &> /dev/null; then
    read -p "Open coverage report in browser? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        xdg-open "${COVERAGE_DIR}/comprehensive/index.html"
    fi
fi

# Final status
echo ""
if [ $exit_code -eq 0 ]; then
    print_success "Component Registry Test Suite completed successfully!"
else
    print_error "Component Registry Test Suite completed with failures"
fi

echo "Reports generated at: ${REPORTS_DIR}"
echo "Coverage reports at: ${COVERAGE_DIR}"

exit $exit_code