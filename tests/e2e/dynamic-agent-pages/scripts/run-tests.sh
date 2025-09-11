#!/bin/bash

# Dynamic Agent Pages E2E Test Runner
# Comprehensive test execution script with multiple options

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default configuration
CONFIG_FILE="tests/e2e/dynamic-agent-pages/playwright.config.ts"
REPORT_DIR="tests/e2e/dynamic-agent-pages/reports"
TIMEOUT="60000"
RETRIES="2"
WORKERS="2"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check if npm is available
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed or not in PATH"
        exit 1
    fi
    
    # Check if Playwright is installed
    if ! npm list @playwright/test &> /dev/null; then
        print_warning "Playwright not found, installing..."
        npm install @playwright/test
    fi
    
    # Check if browsers are installed
    if ! npx playwright --version &> /dev/null; then
        print_warning "Installing Playwright browsers..."
        npx playwright install
    fi
    
    print_success "Prerequisites checked"
}

# Function to start services
start_services() {
    print_status "Starting required services..."
    
    # Check if services are already running
    if curl -s http://localhost:5173 > /dev/null 2>&1; then
        print_success "Frontend service already running on port 5173"
    else
        print_status "Starting frontend service..."
        npm run dev:frontend &
        FRONTEND_PID=$!
        
        # Wait for frontend to start
        for i in {1..30}; do
            if curl -s http://localhost:5173 > /dev/null 2>&1; then
                print_success "Frontend service started"
                break
            fi
            sleep 1
        done
    fi
    
    if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
        print_success "Backend service already running on port 3000"
    else
        print_status "Starting backend service..."
        npm run dev:backend &
        BACKEND_PID=$!
        
        # Wait for backend to start
        for i in {1..20}; do
            if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
                print_success "Backend service started"
                break
            fi
            sleep 1
        done
    fi
}

# Function to stop services
stop_services() {
    print_status "Stopping services..."
    
    if [[ -n "$FRONTEND_PID" ]]; then
        kill $FRONTEND_PID 2>/dev/null || true
        print_status "Frontend service stopped"
    fi
    
    if [[ -n "$BACKEND_PID" ]]; then
        kill $BACKEND_PID 2>/dev/null || true
        print_status "Backend service stopped"
    fi
}

# Function to run tests
run_tests() {
    local test_pattern="$1"
    local project="$2"
    local additional_args="$3"
    
    print_status "Running tests..."
    print_status "Pattern: ${test_pattern:-all tests}"
    print_status "Project: ${project:-all browsers}"
    
    local cmd="npx playwright test"
    cmd="$cmd --config=$CONFIG_FILE"
    cmd="$cmd --timeout=$TIMEOUT"
    cmd="$cmd --retries=$RETRIES"
    cmd="$cmd --workers=$WORKERS"
    
    if [[ -n "$test_pattern" ]]; then
        cmd="$cmd $test_pattern"
    fi
    
    if [[ -n "$project" ]]; then
        cmd="$cmd --project=$project"
    fi
    
    if [[ -n "$additional_args" ]]; then
        cmd="$cmd $additional_args"
    fi
    
    print_status "Executing: $cmd"
    
    if eval $cmd; then
        print_success "Tests completed successfully"
        return 0
    else
        print_error "Tests failed"
        return 1
    fi
}

# Function to generate reports
generate_reports() {
    print_status "Generating test reports..."
    
    # Open HTML report
    if [[ -f "$REPORT_DIR/html/index.html" ]]; then
        print_success "HTML report generated: $REPORT_DIR/html/index.html"
        
        if [[ "$OPEN_REPORT" == "true" ]]; then
            npx playwright show-report "$REPORT_DIR/html"
        fi
    fi
    
    # Show summary if available
    if [[ -f "$REPORT_DIR/SUMMARY.md" ]]; then
        print_status "Test Summary:"
        cat "$REPORT_DIR/SUMMARY.md"
    fi
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS] [TEST_PATTERN]"
    echo ""
    echo "Options:"
    echo "  -h, --help              Show this help message"
    echo "  -p, --project NAME      Run tests for specific browser project"
    echo "  -c, --category NAME     Run tests for specific category"
    echo "  -m, --mobile           Run mobile tests only"
    echo "  -d, --debug            Run tests in debug mode"
    echo "  -u, --ui               Run tests with Playwright UI"
    echo "  -H, --headed           Run tests in headed mode (visible browser)"
    echo "  -s, --setup            Run setup tests only"
    echo "  -t, --teardown         Run teardown tests only"
    echo "  -r, --report           Open test report after completion"
    echo "  -w, --workers NUM      Number of worker processes (default: 2)"
    echo "  -R, --retries NUM      Number of retries on failure (default: 2)"
    echo "  --timeout NUM          Test timeout in milliseconds (default: 60000)"
    echo "  --update-snapshots     Update visual regression snapshots"
    echo "  --trace                Enable trace recording"
    echo ""
    echo "Categories:"
    echo "  navigation             Navigation flow tests"
    echo "  content                Content rendering tests"
    echo "  customization          Profile customization tests"
    echo "  responsive             Responsive design tests"
    echo "  realtime               Real-time/WebSocket tests"
    echo "  performance            Performance tests"
    echo "  accessibility          Accessibility tests"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Run all tests"
    echo "  $0 -p chromium                       # Run tests in Chrome only"
    echo "  $0 -c navigation                     # Run navigation tests only"
    echo "  $0 -m                                # Run mobile tests only"
    echo "  $0 -d navigation/agent-card-navigation.spec.ts  # Debug specific test"
    echo "  $0 --ui                              # Run with Playwright UI"
    echo "  $0 -r                                # Run tests and open report"
}

# Parse command line arguments
POSITIONAL=()
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_usage
            exit 0
            ;;
        -p|--project)
            PROJECT="$2"
            shift 2
            ;;
        -c|--category)
            CATEGORY="$2"
            shift 2
            ;;
        -m|--mobile)
            PROJECT="Mobile Chrome"
            shift
            ;;
        -d|--debug)
            ADDITIONAL_ARGS="--debug"
            shift
            ;;
        -u|--ui)
            ADDITIONAL_ARGS="--ui"
            shift
            ;;
        -H|--headed)
            ADDITIONAL_ARGS="--headed"
            shift
            ;;
        -s|--setup)
            TEST_PATTERN="setup.ts"
            shift
            ;;
        -t|--teardown)
            TEST_PATTERN="teardown.ts"
            shift
            ;;
        -r|--report)
            OPEN_REPORT="true"
            shift
            ;;
        -w|--workers)
            WORKERS="$2"
            shift 2
            ;;
        -R|--retries)
            RETRIES="$2"
            shift 2
            ;;
        --timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        --update-snapshots)
            ADDITIONAL_ARGS="--update-snapshots"
            shift
            ;;
        --trace)
            ADDITIONAL_ARGS="--trace on"
            shift
            ;;
        *)
            POSITIONAL+=("$1")
            shift
            ;;
    esac
done

# Restore positional parameters
set -- "${POSITIONAL[@]}"

# Set test pattern based on category or positional argument
if [[ -n "$CATEGORY" ]]; then
    TEST_PATTERN="tests/e2e/dynamic-agent-pages/specs/$CATEGORY/"
elif [[ -n "$1" ]]; then
    TEST_PATTERN="$1"
fi

# Main execution
main() {
    print_status "Starting Dynamic Agent Pages E2E Test Runner"
    print_status "Configuration: $CONFIG_FILE"
    
    # Set up trap to clean up services on exit
    trap stop_services EXIT
    
    # Check prerequisites
    check_prerequisites
    
    # Start services (only if not running setup/teardown only)
    if [[ "$TEST_PATTERN" != "setup.ts" && "$TEST_PATTERN" != "teardown.ts" ]]; then
        start_services
    fi
    
    # Run tests
    if run_tests "$TEST_PATTERN" "$PROJECT" "$ADDITIONAL_ARGS"; then
        print_success "All tests completed successfully!"
        
        # Generate reports
        generate_reports
        
        exit 0
    else
        print_error "Some tests failed"
        
        # Still generate reports for failed tests
        generate_reports
        
        exit 1
    fi
}

# Execute main function
main