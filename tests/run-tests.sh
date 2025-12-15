#!/bin/bash

###############################################################################
# Λvi System Identity Test Runner
#
# Comprehensive test execution script for TDD workflow.
# Supports various test execution modes with real backend (NO MOCKS).
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Test directories
TESTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UNIT_TESTS="$TESTS_DIR/unit"
INTEGRATION_TESTS="$TESTS_DIR/integration"
VALIDATION_TESTS="$TESTS_DIR/validation"

# Print banner
print_banner() {
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║        Λvi System Identity Test Suite                   ║"
    echo "║        100% Real Backend Testing (NO MOCKS)              ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Print section header
print_header() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

# Print success message
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Print error message
print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Print warning message
print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Print info message
print_info() {
    echo -e "${CYAN}ℹ $1${NC}"
}

# Run unit tests
run_unit_tests() {
    print_header "Running Unit Tests"
    print_info "Testing core system identity logic..."

    if npm test -- "$UNIT_TESTS" --verbose; then
        print_success "Unit tests passed"
        return 0
    else
        print_error "Unit tests failed"
        return 1
    fi
}

# Run integration tests
run_integration_tests() {
    print_header "Running Integration Tests"
    print_info "Testing with real database and file system..."

    if npm test -- "$INTEGRATION_TESTS" --verbose; then
        print_success "Integration tests passed"
        return 0
    else
        print_error "Integration tests failed"
        return 1
    fi
}

# Run validation tests
run_validation_tests() {
    print_header "Running Validation Tests"
    print_info "Testing token usage and performance..."

    if npm test -- "$VALIDATION_TESTS" --verbose; then
        print_success "Validation tests passed"
        return 0
    else
        print_error "Validation tests failed"
        return 1
    fi
}

# Run all tests
run_all_tests() {
    print_header "Running Complete Test Suite"

    local failed=0

    run_unit_tests || failed=$((failed + 1))
    run_integration_tests || failed=$((failed + 1))
    run_validation_tests || failed=$((failed + 1))

    echo ""
    if [ $failed -eq 0 ]; then
        print_success "All test suites passed! 🎉"
        return 0
    else
        print_error "$failed test suite(s) failed"
        return 1
    fi
}

# Run tests with coverage
run_with_coverage() {
    print_header "Running Tests with Coverage"

    if npm test -- --coverage --verbose; then
        print_success "Tests completed with coverage report"
        print_info "Coverage report: ./coverage/index.html"
        return 0
    else
        print_error "Tests failed"
        return 1
    fi
}

# Run specific test file
run_specific_test() {
    local test_file="$1"
    print_header "Running Specific Test: $test_file"

    if npm test -- "$test_file" --verbose; then
        print_success "Test passed"
        return 0
    else
        print_error "Test failed"
        return 1
    fi
}

# Watch mode
run_watch_mode() {
    print_header "Running Tests in Watch Mode"
    print_info "Press Ctrl+C to exit"
    npm test -- --watch --verbose
}

# Quick test (no verbose)
run_quick_test() {
    print_header "Running Quick Test"
    npm test
}

# Clean test artifacts
clean_artifacts() {
    print_header "Cleaning Test Artifacts"

    rm -rf "$TESTS_DIR/test-data"
    rm -rf "$(dirname "$TESTS_DIR")/coverage"
    rm -rf "$(dirname "$TESTS_DIR")/test-results"

    print_success "Cleaned test artifacts"
}

# Show test statistics
show_statistics() {
    print_header "Test Suite Statistics"

    local unit_count=$(find "$UNIT_TESTS" -name "*.test.js" -type f | wc -l)
    local integration_count=$(find "$INTEGRATION_TESTS" -name "*.test.js" -type f | wc -l)
    local validation_count=$(find "$VALIDATION_TESTS" -name "*.test.js" -type f | wc -l)
    local total=$((unit_count + integration_count + validation_count))

    echo "Test Files:"
    echo "  Unit Tests:        $unit_count files"
    echo "  Integration Tests: $integration_count files"
    echo "  Validation Tests:  $validation_count files"
    echo "  Total:             $total files"
    echo ""

    print_info "Run './run-tests.sh help' for usage information"
}

# Show help
show_help() {
    print_banner
    echo "Usage: ./run-tests.sh [command]"
    echo ""
    echo "Commands:"
    echo "  all         - Run all test suites (default)"
    echo "  unit        - Run unit tests only"
    echo "  integration - Run integration tests only"
    echo "  validation  - Run validation tests only"
    echo "  coverage    - Run all tests with coverage report"
    echo "  watch       - Run tests in watch mode"
    echo "  quick       - Run quick test (no verbose)"
    echo "  clean       - Clean test artifacts"
    echo "  stats       - Show test statistics"
    echo "  file <path> - Run specific test file"
    echo "  help        - Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./run-tests.sh                    # Run all tests"
    echo "  ./run-tests.sh unit               # Run unit tests"
    echo "  ./run-tests.sh coverage           # Run with coverage"
    echo "  ./run-tests.sh file unit/avi-*.js # Run specific test"
    echo ""
}

# Main execution
main() {
    local command="${1:-all}"

    # Check if npm is available
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install Node.js and npm."
        exit 1
    fi

    case "$command" in
        all)
            print_banner
            run_all_tests
            ;;
        unit)
            print_banner
            run_unit_tests
            ;;
        integration)
            print_banner
            run_integration_tests
            ;;
        validation)
            print_banner
            run_validation_tests
            ;;
        coverage)
            print_banner
            run_with_coverage
            ;;
        watch)
            print_banner
            run_watch_mode
            ;;
        quick)
            print_banner
            run_quick_test
            ;;
        clean)
            print_banner
            clean_artifacts
            ;;
        stats)
            print_banner
            show_statistics
            ;;
        file)
            if [ -z "$2" ]; then
                print_error "Please specify a test file"
                echo "Usage: ./run-tests.sh file <path>"
                exit 1
            fi
            print_banner
            run_specific_test "$2"
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            print_error "Unknown command: $command"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
