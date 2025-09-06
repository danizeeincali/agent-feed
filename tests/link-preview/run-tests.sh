#!/bin/bash

# Link Preview TDD Test Runner
# Comprehensive test suite runner for link preview functionality

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default configuration
RUN_UNIT=true
RUN_INTEGRATION=true
RUN_E2E=true
RUN_PERFORMANCE=false
PARALLEL=false
COVERAGE=false
VERBOSE=false
BAIL_ON_FAIL=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --unit-only)
            RUN_UNIT=true
            RUN_INTEGRATION=false
            RUN_E2E=false
            RUN_PERFORMANCE=false
            shift
            ;;
        --integration-only)
            RUN_UNIT=false
            RUN_INTEGRATION=true
            RUN_E2E=false
            RUN_PERFORMANCE=false
            shift
            ;;
        --e2e-only)
            RUN_UNIT=false
            RUN_INTEGRATION=false
            RUN_E2E=true
            RUN_PERFORMANCE=false
            shift
            ;;
        --performance-only)
            RUN_UNIT=false
            RUN_INTEGRATION=false
            RUN_E2E=false
            RUN_PERFORMANCE=true
            shift
            ;;
        --all)
            RUN_UNIT=true
            RUN_INTEGRATION=true
            RUN_E2E=true
            RUN_PERFORMANCE=true
            shift
            ;;
        --parallel)
            PARALLEL=true
            shift
            ;;
        --coverage)
            COVERAGE=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --bail)
            BAIL_ON_FAIL=true
            shift
            ;;
        --help)
            echo "Link Preview TDD Test Runner"
            echo ""
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --unit-only       Run only unit tests"
            echo "  --integration-only Run only integration tests"
            echo "  --e2e-only        Run only E2E tests"
            echo "  --performance-only Run only performance tests"
            echo "  --all             Run all test types including performance"
            echo "  --parallel        Run tests in parallel where possible"
            echo "  --coverage        Generate coverage reports"
            echo "  --verbose         Verbose output"
            echo "  --bail            Stop on first failure"
            echo "  --help            Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                    # Run unit, integration, and E2E tests"
            echo "  $0 --unit-only       # Run only unit tests"
            echo "  $0 --all --coverage  # Run all tests with coverage"
            echo "  $0 --parallel --bail # Run in parallel, stop on first failure"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to check if services are running
check_services() {
    print_status $BLUE "🔍 Checking services..."
    
    # Check if backend is running
    if ! curl -s http://localhost:3001/health > /dev/null 2>&1; then
        print_status $YELLOW "⚠️  Backend service not running. Starting..."
        npm run dev:backend > backend.log 2>&1 &
        BACKEND_PID=$!
        sleep 3
        
        if ! curl -s http://localhost:3001/health > /dev/null 2>&1; then
            print_status $RED "❌ Failed to start backend service"
            exit 1
        fi
    fi
    
    # Check if frontend is running (for E2E tests)
    if [[ "$RUN_E2E" == "true" ]]; then
        if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
            print_status $YELLOW "⚠️  Frontend service not running. Starting..."
            cd ../../frontend && npm run dev > ../tests/link-preview/frontend.log 2>&1 &
            FRONTEND_PID=$!
            cd - > /dev/null
            sleep 5
            
            if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
                print_status $RED "❌ Failed to start frontend service"
                exit 1
            fi
        fi
    fi
    
    print_status $GREEN "✅ Services are running"
}

# Function to stop services
cleanup_services() {
    if [[ -n "$BACKEND_PID" ]]; then
        print_status $YELLOW "🛑 Stopping backend service..."
        kill $BACKEND_PID 2>/dev/null || true
    fi
    
    if [[ -n "$FRONTEND_PID" ]]; then
        print_status $YELLOW "🛑 Stopping frontend service..."
        kill $FRONTEND_PID 2>/dev/null || true
    fi
}

# Trap to cleanup services on exit
trap cleanup_services EXIT

# Function to run unit tests
run_unit_tests() {
    print_status $BLUE "🧪 Running Unit Tests..."
    
    local jest_args=""
    if [[ "$COVERAGE" == "true" ]]; then
        jest_args="--coverage"
    fi
    if [[ "$VERBOSE" == "true" ]]; then
        jest_args="$jest_args --verbose"
    fi
    if [[ "$BAIL_ON_FAIL" == "true" ]]; then
        jest_args="$jest_args --bail"
    fi
    
    if jest --config=jest.config.js $jest_args unit/; then
        print_status $GREEN "✅ Unit tests passed"
        return 0
    else
        print_status $RED "❌ Unit tests failed"
        return 1
    fi
}

# Function to run integration tests
run_integration_tests() {
    print_status $BLUE "🔗 Running Integration Tests..."
    
    local jest_args=""
    if [[ "$COVERAGE" == "true" ]]; then
        jest_args="--coverage"
    fi
    if [[ "$VERBOSE" == "true" ]]; then
        jest_args="$jest_args --verbose"
    fi
    if [[ "$BAIL_ON_FAIL" == "true" ]]; then
        jest_args="$jest_args --bail"
    fi
    
    if jest --config=jest.config.js $jest_args integration/; then
        print_status $GREEN "✅ Integration tests passed"
        return 0
    else
        print_status $RED "❌ Integration tests failed"
        return 1
    fi
}

# Function to run E2E tests
run_e2e_tests() {
    print_status $BLUE "🌐 Running E2E Tests..."
    
    local playwright_args=""
    if [[ "$VERBOSE" == "true" ]]; then
        playwright_args="--reporter=list"
    fi
    
    cd e2e
    if npx playwright test $playwright_args; then
        print_status $GREEN "✅ E2E tests passed"
        cd ..
        return 0
    else
        print_status $RED "❌ E2E tests failed"
        cd ..
        return 1
    fi
}

# Function to run performance tests
run_performance_tests() {
    print_status $BLUE "⚡ Running Performance Tests..."
    
    local jest_args="--testTimeout=60000"
    if [[ "$VERBOSE" == "true" ]]; then
        jest_args="$jest_args --verbose"
    fi
    
    if jest --config=jest.config.js $jest_args performance/; then
        print_status $GREEN "✅ Performance tests passed"
        return 0
    else
        print_status $RED "❌ Performance tests failed"
        return 1
    fi
}

# Function to run load tests
run_load_tests() {
    print_status $BLUE "🚀 Running Load Tests..."
    
    # Run different load test scenarios
    local scenarios=("smoke" "load" "stress")
    
    for scenario in "${scenarios[@]}"; do
        print_status $YELLOW "Running $scenario test..."
        if node performance/load-test.js $scenario; then
            print_status $GREEN "✅ $scenario test passed"
        else
            print_status $RED "❌ $scenario test failed"
            if [[ "$BAIL_ON_FAIL" == "true" ]]; then
                return 1
            fi
        fi
    done
}

# Function to generate reports
generate_reports() {
    print_status $BLUE "📊 Generating Test Reports..."
    
    # Create reports directory
    mkdir -p reports
    
    # Combine coverage reports if available
    if [[ "$COVERAGE" == "true" ]] && [[ -d "coverage" ]]; then
        cp -r coverage reports/
        print_status $GREEN "📈 Coverage report generated: reports/coverage/lcov-report/index.html"
    fi
    
    # Copy E2E reports
    if [[ -d "e2e/reports" ]]; then
        cp -r e2e/reports reports/e2e
        print_status $GREEN "🎭 E2E report generated: reports/e2e/playwright-html/index.html"
    fi
    
    # Generate summary report
    cat > reports/test-summary.html << EOF
<!DOCTYPE html>
<html>
<head>
    <title>Link Preview Test Summary</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 8px; }
        .section { margin: 20px 0; padding: 15px; border-left: 4px solid #007acc; }
        .success { border-color: #28a745; }
        .failure { border-color: #dc3545; }
        .warning { border-color: #ffc107; }
        pre { background: #f8f9fa; padding: 10px; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔗 Link Preview TDD Test Suite Results</h1>
        <p>Generated: $(date)</p>
    </div>
    
    <div class="section">
        <h2>📋 Test Summary</h2>
        <p>Comprehensive test suite following London School TDD methodology</p>
        <ul>
            <li><strong>Unit Tests:</strong> Mock-driven behavior verification</li>
            <li><strong>Integration Tests:</strong> End-to-end workflow testing</li>
            <li><strong>E2E Tests:</strong> Frontend rendering and interaction testing</li>
            <li><strong>Performance Tests:</strong> Load testing and benchmarks</li>
        </ul>
    </div>
    
    <div class="section">
        <h2>📊 Available Reports</h2>
        <ul>
            <li><a href="coverage/lcov-report/index.html">Code Coverage Report</a></li>
            <li><a href="e2e/playwright-html/index.html">Playwright E2E Report</a></li>
        </ul>
    </div>
</body>
</html>
EOF
    
    print_status $GREEN "📄 Test summary generated: reports/test-summary.html"
}

# Main execution
main() {
    print_status $GREEN "🚀 Starting Link Preview TDD Test Suite"
    echo "Configuration:"
    echo "  Unit Tests: $RUN_UNIT"
    echo "  Integration Tests: $RUN_INTEGRATION" 
    echo "  E2E Tests: $RUN_E2E"
    echo "  Performance Tests: $RUN_PERFORMANCE"
    echo "  Parallel: $PARALLEL"
    echo "  Coverage: $COVERAGE"
    echo "  Verbose: $VERBOSE"
    echo "  Bail on Fail: $BAIL_ON_FAIL"
    echo ""
    
    # Check services
    check_services
    
    # Initialize results
    local unit_result=0
    local integration_result=0
    local e2e_result=0
    local performance_result=0
    
    # Run tests based on configuration
    if [[ "$PARALLEL" == "true" && "$RUN_UNIT" == "true" && "$RUN_INTEGRATION" == "true" ]]; then
        print_status $BLUE "🔄 Running unit and integration tests in parallel..."
        
        # Run unit and integration tests in parallel
        run_unit_tests &
        unit_pid=$!
        
        run_integration_tests &
        integration_pid=$!
        
        # Wait for both to complete
        wait $unit_pid
        unit_result=$?
        
        wait $integration_pid
        integration_result=$?
        
    else
        # Run tests sequentially
        if [[ "$RUN_UNIT" == "true" ]]; then
            run_unit_tests
            unit_result=$?
            if [[ $unit_result -ne 0 && "$BAIL_ON_FAIL" == "true" ]]; then
                exit $unit_result
            fi
        fi
        
        if [[ "$RUN_INTEGRATION" == "true" ]]; then
            run_integration_tests
            integration_result=$?
            if [[ $integration_result -ne 0 && "$BAIL_ON_FAIL" == "true" ]]; then
                exit $integration_result
            fi
        fi
    fi
    
    # Run E2E tests (always sequential)
    if [[ "$RUN_E2E" == "true" ]]; then
        run_e2e_tests
        e2e_result=$?
        if [[ $e2e_result -ne 0 && "$BAIL_ON_FAIL" == "true" ]]; then
            exit $e2e_result
        fi
    fi
    
    # Run performance tests (always sequential and last)
    if [[ "$RUN_PERFORMANCE" == "true" ]]; then
        run_performance_tests
        performance_result=$?
        
        # Also run load tests
        run_load_tests
        local load_result=$?
        
        # Use worst result
        if [[ $load_result -ne 0 ]]; then
            performance_result=$load_result
        fi
        
        if [[ $performance_result -ne 0 && "$BAIL_ON_FAIL" == "true" ]]; then
            exit $performance_result
        fi
    fi
    
    # Generate reports
    generate_reports
    
    # Summary
    print_status $BLUE "📋 Test Results Summary:"
    [[ "$RUN_UNIT" == "true" ]] && (( unit_result == 0 )) && print_status $GREEN "  ✅ Unit Tests: PASSED" || [[ "$RUN_UNIT" == "true" ]] && print_status $RED "  ❌ Unit Tests: FAILED"
    [[ "$RUN_INTEGRATION" == "true" ]] && (( integration_result == 0 )) && print_status $GREEN "  ✅ Integration Tests: PASSED" || [[ "$RUN_INTEGRATION" == "true" ]] && print_status $RED "  ❌ Integration Tests: FAILED"
    [[ "$RUN_E2E" == "true" ]] && (( e2e_result == 0 )) && print_status $GREEN "  ✅ E2E Tests: PASSED" || [[ "$RUN_E2E" == "true" ]] && print_status $RED "  ❌ E2E Tests: FAILED"
    [[ "$RUN_PERFORMANCE" == "true" ]] && (( performance_result == 0 )) && print_status $GREEN "  ✅ Performance Tests: PASSED" || [[ "$RUN_PERFORMANCE" == "true" ]] && print_status $RED "  ❌ Performance Tests: FAILED"
    
    # Overall result
    local overall_result=$(( unit_result + integration_result + e2e_result + performance_result ))
    
    if [[ $overall_result -eq 0 ]]; then
        print_status $GREEN "🎉 All tests passed!"
        exit 0
    else
        print_status $RED "💥 Some tests failed!"
        exit 1
    fi
}

# Check if running directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi