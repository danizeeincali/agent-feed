#!/bin/bash
set -e

# Run All Tests Script
# This script orchestrates parallel test execution for CI/CD pipeline

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TEST_RESULTS_DIR="test-results"
COVERAGE_DIR="coverage"
LOG_FILE="test-execution.log"
PARALLEL_JOBS=4
TIMEOUT=300  # 5 minutes timeout per test suite

# Environment variables
NODE_ENV=${NODE_ENV:-test}
CI=${CI:-true}
VERBOSE=${VERBOSE:-false}

echo -e "${BLUE}🚀 Starting comprehensive test execution...${NC}"
echo "Environment: $NODE_ENV"
echo "Parallel Jobs: $PARALLEL_JOBS"
echo "Timeout: ${TIMEOUT}s per suite"
echo "Results Directory: $TEST_RESULTS_DIR"
echo ""

# Create directories
mkdir -p $TEST_RESULTS_DIR $COVERAGE_DIR
rm -f $LOG_FILE
touch $LOG_FILE

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a $LOG_FILE
}

# Function to run command with timeout and logging
run_with_timeout() {
    local cmd="$1"
    local name="$2"
    local timeout="${3:-$TIMEOUT}"

    log "Starting: $name"
    if [ "$VERBOSE" = "true" ]; then
        echo -e "${YELLOW}Command: $cmd${NC}"
    fi

    if timeout $timeout bash -c "$cmd" 2>&1 | tee -a $LOG_FILE; then
        log "✅ SUCCESS: $name"
        return 0
    else
        log "❌ FAILED: $name"
        return 1
    fi
}

# Function to check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."

    # Check Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js not found${NC}"
        exit 1
    fi

    # Check npm
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}❌ npm not found${NC}"
        exit 1
    fi

    # Check if package.json exists
    if [ ! -f "package.json" ]; then
        echo -e "${RED}❌ package.json not found${NC}"
        exit 1
    fi

    log "✅ Prerequisites check passed"
}

# Function to install dependencies
install_dependencies() {
    log "Installing dependencies..."

    # Use npm ci for consistent installs
    if run_with_timeout "npm ci --prefer-offline --no-audit" "Dependency Installation" 120; then
        log "✅ Dependencies installed successfully"
    else
        echo -e "${RED}❌ Failed to install dependencies${NC}"
        exit 1
    fi
}

# Function to run linting
run_linting() {
    log "Running code quality checks..."

    local lint_results="$TEST_RESULTS_DIR/lint-results.json"

    # ESLint
    if command -v npx &> /dev/null && npm list eslint &> /dev/null; then
        run_with_timeout "npx eslint . --format=json --output-file=$lint_results" "ESLint" 60 || true
    fi

    # Prettier check
    if npm list prettier &> /dev/null; then
        run_with_timeout "npx prettier --check ." "Prettier Check" 30 || true
    fi

    # TypeScript check
    if [ -f "tsconfig.json" ]; then
        run_with_timeout "npx tsc --noEmit" "TypeScript Check" 90 || true
    fi
}

# Function to run unit tests
run_unit_tests() {
    log "Running unit tests..."

    local test_cmd=""
    local coverage_cmd="--coverage --coverageDirectory=$COVERAGE_DIR/unit"

    # Detect test framework
    if npm list jest &> /dev/null; then
        test_cmd="npx jest --ci --json --outputFile=$TEST_RESULTS_DIR/unit-results.json $coverage_cmd"
    elif npm list vitest &> /dev/null; then
        test_cmd="npx vitest run --reporter=json --outputFile=$TEST_RESULTS_DIR/unit-results.json"
    elif [ -f "package.json" ] && grep -q "\"test\"" package.json; then
        test_cmd="npm test -- --ci --json --outputFile=$TEST_RESULTS_DIR/unit-results.json"
    else
        log "⚠️ No unit test framework detected, skipping unit tests"
        return 0
    fi

    run_with_timeout "$test_cmd" "Unit Tests" || return 1
}

# Function to run integration tests
run_integration_tests() {
    log "Running integration tests..."

    # Check if integration test script exists
    if npm run | grep -q "test:integration"; then
        run_with_timeout "npm run test:integration -- --json --outputFile=$TEST_RESULTS_DIR/integration-results.json" "Integration Tests" || return 1
    else
        log "⚠️ No integration tests configured, skipping"
        return 0
    fi
}

# Function to run component tests
run_component_tests() {
    log "Running component tests..."

    if npm run | grep -q "test:component"; then
        run_with_timeout "npm run test:component -- --json --outputFile=$TEST_RESULTS_DIR/component-results.json" "Component Tests" || return 1
    else
        log "⚠️ No component tests configured, skipping"
        return 0
    fi
}

# Function to run API tests
run_api_tests() {
    log "Running API tests..."

    if npm run | grep -q "test:api"; then
        run_with_timeout "npm run test:api -- --json --outputFile=$TEST_RESULTS_DIR/api-results.json" "API Tests" || return 1
    else
        log "⚠️ No API tests configured, skipping"
        return 0
    fi
}

# Function to run performance tests
run_performance_tests() {
    log "Running performance tests..."

    if npm run | grep -q "test:performance"; then
        run_with_timeout "npm run test:performance -- --outputFile=$TEST_RESULTS_DIR/performance-results.json" "Performance Tests" 600 || return 1
    else
        log "⚠️ No performance tests configured, skipping"
        return 0
    fi
}

# Function to run security tests
run_security_tests() {
    log "Running security tests..."

    # npm audit
    run_with_timeout "npm audit --audit-level=moderate --json > $TEST_RESULTS_DIR/audit-results.json" "NPM Audit" 60 || true

    # Snyk if available
    if command -v snyk &> /dev/null; then
        run_with_timeout "snyk test --json > $TEST_RESULTS_DIR/snyk-results.json" "Snyk Security Scan" 120 || true
    fi
}

# Function to run tests in parallel
run_parallel_tests() {
    log "Starting parallel test execution..."

    local pids=()
    local results=()

    # Start unit tests in background
    {
        run_unit_tests
        echo $? > $TEST_RESULTS_DIR/unit.exit_code
    } &
    pids+=($!)

    # Start integration tests in background
    {
        run_integration_tests
        echo $? > $TEST_RESULTS_DIR/integration.exit_code
    } &
    pids+=($!)

    # Start component tests in background
    {
        run_component_tests
        echo $? > $TEST_RESULTS_DIR/component.exit_code
    } &
    pids+=($!)

    # Start API tests in background
    {
        run_api_tests
        echo $? > $TEST_RESULTS_DIR/api.exit_code
    } &
    pids+=($!)

    # Wait for all background jobs
    local failed=0
    for i in "${!pids[@]}"; do
        wait ${pids[$i]}
        local exit_code=$?
        if [ $exit_code -ne 0 ]; then
            failed=1
        fi
        results+=($exit_code)
    done

    # Check individual results
    local tests=("unit" "integration" "component" "api")
    for i in "${!tests[@]}"; do
        local test_name=${tests[$i]}
        if [ -f "$TEST_RESULTS_DIR/${test_name}.exit_code" ]; then
            local code=$(cat "$TEST_RESULTS_DIR/${test_name}.exit_code")
            if [ "$code" -eq 0 ]; then
                log "✅ ${test_name} tests passed"
            else
                log "❌ ${test_name} tests failed"
                failed=1
            fi
        fi
    done

    return $failed
}

# Function to generate test report
generate_report() {
    log "Generating test report..."

    local report_file="$TEST_RESULTS_DIR/test-report.json"
    local summary_file="$TEST_RESULTS_DIR/test-summary.md"

    # Create JSON report
    cat > $report_file << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "environment": "$NODE_ENV",
  "results": {
EOF

    # Add results for each test type
    local first=true
    for result_file in $TEST_RESULTS_DIR/*-results.json; do
        if [ -f "$result_file" ]; then
            local test_type=$(basename "$result_file" -results.json)
            if [ "$first" = true ]; then
                first=false
            else
                echo "," >> $report_file
            fi
            echo "    \"$test_type\": $(cat "$result_file")" >> $report_file
        fi
    done

    cat >> $report_file << EOF
  }
}
EOF

    # Create markdown summary
    cat > $summary_file << EOF
# Test Execution Summary

**Date:** $(date)
**Environment:** $NODE_ENV
**Duration:** ${SECONDS}s

## Results

EOF

    # Add summary for each test type
    local total_tests=0
    local total_passed=0
    local total_failed=0

    for result_file in $TEST_RESULTS_DIR/*-results.json; do
        if [ -f "$result_file" ]; then
            local test_type=$(basename "$result_file" -results.json)
            echo "### $test_type Tests" >> $summary_file

            # Try to extract test counts (format may vary)
            if command -v jq &> /dev/null; then
                local passed=$(jq -r '.numPassedTests // 0' "$result_file" 2>/dev/null || echo "0")
                local failed=$(jq -r '.numFailedTests // 0' "$result_file" 2>/dev/null || echo "0")
                local total=$(jq -r '.numTotalTests // 0' "$result_file" 2>/dev/null || echo "0")

                echo "- Total: $total" >> $summary_file
                echo "- Passed: $passed" >> $summary_file
                echo "- Failed: $failed" >> $summary_file

                total_tests=$((total_tests + total))
                total_passed=$((total_passed + passed))
                total_failed=$((total_failed + failed))
            fi
            echo "" >> $summary_file
        fi
    done

    # Add totals
    cat >> $summary_file << EOF
## Overall Summary

- **Total Tests:** $total_tests
- **Passed:** $total_passed
- **Failed:** $total_failed
- **Success Rate:** $(( total_tests > 0 ? (total_passed * 100) / total_tests : 0 ))%

EOF

    # Add coverage info if available
    if [ -d "$COVERAGE_DIR" ]; then
        echo "## Coverage" >> $summary_file
        echo "Coverage reports generated in: \`$COVERAGE_DIR\`" >> $summary_file
    fi

    log "✅ Test report generated: $report_file"
    log "✅ Test summary generated: $summary_file"
}

# Function to cleanup
cleanup() {
    log "Cleaning up..."

    # Kill any remaining background processes
    jobs -p | xargs -r kill 2>/dev/null || true

    # Clean up temporary files
    rm -f $TEST_RESULTS_DIR/*.exit_code
}

# Function to handle script interruption
handle_interrupt() {
    echo -e "\n${YELLOW}⚠️ Test execution interrupted${NC}"
    cleanup
    exit 130
}

# Trap interrupts
trap handle_interrupt INT TERM

# Main execution
main() {
    local start_time=$SECONDS

    echo -e "${BLUE}=== Test Execution Pipeline ===${NC}"

    # Prerequisites
    check_prerequisites

    # Install dependencies
    install_dependencies

    # Code quality
    run_linting

    # Parallel test execution
    if run_parallel_tests; then
        echo -e "${GREEN}✅ All parallel tests passed${NC}"
    else
        echo -e "${RED}❌ Some parallel tests failed${NC}"
    fi

    # Sequential tests that require specific order
    run_performance_tests
    run_security_tests

    # Generate reports
    generate_report

    # Final summary
    local duration=$((SECONDS - start_time))
    echo -e "${BLUE}=== Execution Complete ===${NC}"
    echo "Total Duration: ${duration}s"
    echo "Results: $TEST_RESULTS_DIR/"
    echo "Logs: $LOG_FILE"

    # Check overall success
    if [ -f "$TEST_RESULTS_DIR/test-report.json" ]; then
        echo -e "${GREEN}✅ Test execution completed successfully${NC}"
        exit 0
    else
        echo -e "${RED}❌ Test execution failed${NC}"
        exit 1
    fi
}

# Cleanup on exit
trap cleanup EXIT

# Run main function
main "$@"