#!/bin/bash

# TDD London School Test Runner
# Comprehensive test execution script with behavior verification

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Test suite directory
SUITE_DIR="tests/tdd-london-suite"
COVERAGE_DIR="coverage/tdd-london-suite"

# Logging functions
log_header() {
    echo -e "\n${BLUE}=================================${NC}"
    echo -e "${BLUE} $1 ${NC}"
    echo -e "${BLUE}=================================${NC}\n"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_info() {
    echo -e "${CYAN}ℹ️  $1${NC}"
}

# Pre-flight checks
check_dependencies() {
    log_header "PRE-FLIGHT CHECKS"
    
    # Check if we're in the right directory
    if [ ! -d "$SUITE_DIR" ]; then
        log_error "Test suite directory not found: $SUITE_DIR"
        exit 1
    fi
    
    # Check for required dependencies
    if ! command -v node &> /dev/null; then
        log_error "Node.js is required but not installed"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        log_error "npm is required but not installed"
        exit 1
    fi
    
    # Check Jest installation
    if [ ! -f "node_modules/.bin/jest" ] && [ ! -f "$SUITE_DIR/node_modules/.bin/jest" ]; then
        log_warning "Jest not found, installing dependencies..."
        npm install
    fi
    
    log_success "All dependencies checked"
}

# Install test suite dependencies
setup_test_environment() {
    log_header "SETTING UP TEST ENVIRONMENT"
    
    # Navigate to test suite directory
    cd "$SUITE_DIR" || exit 1
    
    # Install test-specific dependencies if package.json exists
    if [ -f "package.json" ]; then
        log_info "Installing test suite dependencies..."
        npm install --silent
        log_success "Test dependencies installed"
    fi
    
    # Create coverage directory
    mkdir -p "../../$COVERAGE_DIR"
    
    # Navigate back to root
    cd - > /dev/null
    
    log_success "Test environment ready"
}

# Run specific test suite
run_test_suite() {
    local suite_name=$1
    local jest_project=$2
    
    log_info "Running $suite_name tests..."
    
    # Run tests with coverage
    if npx jest --selectProjects="$jest_project" --coverage --passWithNoTests; then
        log_success "$suite_name tests passed"
        return 0
    else
        log_error "$suite_name tests failed"
        return 1
    fi
}

# Validate test results
validate_results() {
    local exit_code=$1
    local suite_name=$2
    
    if [ $exit_code -eq 0 ]; then
        log_success "$suite_name validation passed"
    else
        log_error "$suite_name validation failed"
    fi
    
    return $exit_code
}

# Generate comprehensive report
generate_report() {
    log_header "GENERATING TEST REPORT"
    
    # Combine coverage reports if they exist
    if [ -d "$COVERAGE_DIR" ]; then
        log_info "Coverage reports generated in $COVERAGE_DIR"
        
        # Check coverage thresholds
        if [ -f "$COVERAGE_DIR/coverage-summary.json" ]; then
            log_info "Coverage summary available"
        fi
    fi
    
    # Create test summary
    echo "TDD London School Test Suite Results" > test-summary.txt
    echo "====================================" >> test-summary.txt
    echo "Timestamp: $(date)" >> test-summary.txt
    echo "Test Suite: Claude Interaction Testing" >> test-summary.txt
    echo "" >> test-summary.txt
    
    log_success "Test report generated"
}

# Main execution function
run_all_tests() {
    local failed_suites=0
    
    log_header "TDD LONDON SCHOOL TEST EXECUTION"
    
    # Check if this is a dry run
    if [ "$1" = "--dry-run" ]; then
        log_info "DRY RUN MODE - No tests will be executed"
        echo "Test suites that would be executed:"
        echo "1. Unit Tests (Process Spawning, Input/Output, WebSocket)"
        echo "2. Integration Tests (E2E Claude Interaction)" 
        echo "3. Contract Tests (Interface Verification)"
        echo "4. ANSI Parsing Tests (Content Preservation)"
        return 0
    fi
    
    # Run unit tests
    if ! run_test_suite "Unit" "Unit Tests"; then
        ((failed_suites++))
    fi
    
    # Run integration tests
    if ! run_test_suite "Integration" "Integration Tests"; then
        ((failed_suites++))
    fi
    
    # Run contract tests
    if ! run_test_suite "Contract" "Contract Tests"; then
        ((failed_suites++))
    fi
    
    # Run E2E tests (if specified)
    if [ "$1" = "--include-e2e" ] || [ "$1" = "--full" ]; then
        if ! run_test_suite "E2E" "E2E Tests"; then
            ((failed_suites++))
        fi
    fi
    
    return $failed_suites
}

# Cleanup function
cleanup() {
    log_header "CLEANUP"
    
    # Kill any remaining test processes
    pkill -f "jest" 2>/dev/null || true
    pkill -f "node.*test" 2>/dev/null || true
    
    # Clean up temporary files
    rm -f test-*.tmp 2>/dev/null || true
    
    log_success "Cleanup completed"
}

# Signal handlers
trap cleanup EXIT

# Parse command line arguments
case "$1" in
    --unit)
        check_dependencies
        setup_test_environment
        run_test_suite "Unit" "Unit Tests"
        exit $?
        ;;
    --integration)
        check_dependencies
        setup_test_environment
        run_test_suite "Integration" "Integration Tests"
        exit $?
        ;;
    --contracts)
        check_dependencies
        setup_test_environment
        run_test_suite "Contract" "Contract Tests"
        exit $?
        ;;
    --e2e)
        check_dependencies
        setup_test_environment
        run_test_suite "E2E" "E2E Tests"
        exit $?
        ;;
    --watch)
        check_dependencies
        setup_test_environment
        log_header "WATCH MODE"
        npx jest --watch --selectProjects="Unit Tests"
        exit $?
        ;;
    --coverage)
        check_dependencies
        setup_test_environment
        log_header "COVERAGE ANALYSIS"
        npx jest --coverage --ci --watchAll=false
        generate_report
        exit $?
        ;;
    --dry-run)
        check_dependencies
        run_all_tests --dry-run
        exit 0
        ;;
    --full)
        check_dependencies
        setup_test_environment
        failed_suites=$(run_all_tests --full)
        generate_report
        
        if [ $failed_suites -eq 0 ]; then
            log_success "All test suites passed!"
            exit 0
        else
            log_error "$failed_suites test suite(s) failed"
            exit 1
        fi
        ;;
    --help|-h)
        echo "TDD London School Test Runner"
        echo ""
        echo "Usage: $0 [OPTION]"
        echo ""
        echo "Options:"
        echo "  --unit          Run unit tests only"
        echo "  --integration   Run integration tests only"
        echo "  --contracts     Run contract tests only"
        echo "  --e2e           Run E2E tests only"
        echo "  --watch         Run tests in watch mode"
        echo "  --coverage      Run all tests with coverage"
        echo "  --full          Run all test suites including E2E"
        echo "  --dry-run       Show what would be tested without running"
        echo "  --help, -h      Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0 --unit                    # Run unit tests"
        echo "  $0 --full                    # Run all tests"
        echo "  $0 --coverage                # Run with coverage"
        echo "  $0 --watch                   # Development mode"
        exit 0
        ;;
    *)
        # Default: run core test suites (unit + integration + contracts)
        check_dependencies
        setup_test_environment
        failed_suites=$(run_all_tests)
        generate_report
        
        if [ $failed_suites -eq 0 ]; then
            log_success "Core test suites passed!"
            echo ""
            echo "💡 Tip: Run with --full to include E2E tests"
            echo "💡 Tip: Run with --coverage for detailed coverage analysis"
            exit 0
        else
            log_error "$failed_suites test suite(s) failed"
            exit 1
        fi
        ;;
esac