#!/bin/bash

# Dynamic Pages E2E Test Runner
# Comprehensive test execution with server management and reporting

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_PORT=3000
FRONTEND_PORT=5173
BACKEND_URL="http://localhost:$BACKEND_PORT"
FRONTEND_URL="http://localhost:$FRONTEND_PORT"
MAX_WAIT_TIME=60
HEALTH_CHECK_INTERVAL=2

# Test options
RUN_MODE="all"
BROWSER="chromium"
HEADED=false
DEBUG=false
WORKERS=""
PROJECT_ROOT="/workspaces/agent-feed"
TEST_DIR="$PROJECT_ROOT/tests/e2e"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -h|--help)
      echo "Dynamic Pages E2E Test Runner"
      echo ""
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  -m, --mode MODE        Test mode: all, e2e, api, rendering (default: all)"
      echo "  -b, --browser BROWSER  Browser: chromium, firefox, webkit, all (default: chromium)"
      echo "  -w, --workers NUM      Number of workers (default: auto)"
      echo "  -d, --debug           Run tests in debug mode"
      echo "  -u, --headed          Run tests with browser UI"
      echo "  -c, --cleanup         Only run cleanup (remove test data)"
      echo "  -s, --setup-only      Only run setup verification"
      echo "  -r, --report          Generate and show HTML report"
      echo "  --mobile              Run mobile tests only"
      echo "  --performance         Run performance tests only"
      echo "  --accessibility       Run accessibility tests only"
      echo "  -h, --help            Show this help message"
      echo ""
      echo "Examples:"
      echo "  $0                    # Run all tests in chromium"
      echo "  $0 -m e2e -b firefox  # Run E2E tests in Firefox"
      echo "  $0 -u -d             # Run with UI in debug mode"
      echo "  $0 --mobile          # Run mobile tests"
      echo "  $0 -c                # Cleanup test data only"
      exit 0
      ;;
    -m|--mode)
      RUN_MODE="$2"
      shift 2
      ;;
    -b|--browser)
      BROWSER="$2"
      shift 2
      ;;
    -w|--workers)
      WORKERS="--workers=$2"
      shift 2
      ;;
    -d|--debug)
      DEBUG=true
      shift
      ;;
    -u|--headed)
      HEADED=true
      shift
      ;;
    -c|--cleanup)
      RUN_MODE="cleanup"
      shift
      ;;
    -s|--setup-only)
      RUN_MODE="setup"
      shift
      ;;
    -r|--report)
      RUN_MODE="report"
      shift
      ;;
    --mobile)
      RUN_MODE="mobile"
      shift
      ;;
    --performance)
      RUN_MODE="performance"
      shift
      ;;
    --accessibility)
      RUN_MODE="accessibility"
      shift
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

# Utility functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null; then
        return 0
    else
        return 1
    fi
}

wait_for_server() {
    local url=$1
    local name=$2
    local max_attempts=$((MAX_WAIT_TIME / HEALTH_CHECK_INTERVAL))
    local attempt=1

    log_info "Waiting for $name at $url..."

    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" >/dev/null 2>&1; then
            log_success "$name is ready"
            return 0
        fi

        if [ $attempt -eq 1 ]; then
            echo -n "  Waiting"
        fi
        echo -n "."
        sleep $HEALTH_CHECK_INTERVAL
        attempt=$((attempt + 1))
    done

    echo ""
    log_error "$name failed to start within $MAX_WAIT_TIME seconds"
    return 1
}

cleanup_test_data() {
    log_info "Cleaning up test data..."

    # Try to clean up via API
    if curl -s "$BACKEND_URL/api/agents/personal-todos-agent/pages" >/dev/null 2>&1; then
        node -e "
        const fetch = require('node-fetch');

        async function cleanup() {
            try {
                const response = await fetch('$BACKEND_URL/api/agents/personal-todos-agent/pages');
                const data = await response.json();

                if (data.success && data.data.pages) {
                    let cleaned = 0;
                    for (const page of data.data.pages) {
                        const isTestPage = page.title.includes('Test') ||
                                         page.tags?.includes('test') ||
                                         page.tags?.includes('api');

                        if (isTestPage) {
                            const deleteResponse = await fetch(
                                \`$BACKEND_URL/api/agents/personal-todos-agent/pages/\${page.id}\`,
                                { method: 'DELETE' }
                            );
                            if (deleteResponse.ok) cleaned++;
                        }
                    }
                    console.log(\`Cleaned up \${cleaned} test pages\`);
                }
            } catch (error) {
                console.log('Cleanup completed (some errors may be normal)');
            }
        }

        cleanup();
        " 2>/dev/null || log_warning "Could not clean up test data via API"
    fi

    log_success "Test data cleanup completed"
}

start_servers() {
    log_info "Starting servers..."

    # Check if servers are already running
    if check_port $BACKEND_PORT && check_port $FRONTEND_PORT; then
        log_success "Servers are already running"
        return 0
    fi

    # Start backend if not running
    if ! check_port $BACKEND_PORT; then
        log_info "Starting backend server..."
        cd "$PROJECT_ROOT"
        nohup npm run dev:backend > /tmp/backend.log 2>&1 &
        BACKEND_PID=$!
        log_info "Backend started with PID $BACKEND_PID"
    fi

    # Start frontend if not running
    if ! check_port $FRONTEND_PORT; then
        log_info "Starting frontend server..."
        cd "$PROJECT_ROOT"
        nohup npm run dev:frontend > /tmp/frontend.log 2>&1 &
        FRONTEND_PID=$!
        log_info "Frontend started with PID $FRONTEND_PID"
    fi

    # Wait for servers to be ready
    if ! wait_for_server "$BACKEND_URL/api/agents" "Backend server"; then
        log_error "Backend server failed to start"
        return 1
    fi

    if ! wait_for_server "$FRONTEND_URL" "Frontend server"; then
        log_error "Frontend server failed to start"
        return 1
    fi

    log_success "All servers are ready"
    return 0
}

run_playwright_tests() {
    local test_args="$1"

    cd "$TEST_DIR"

    # Build Playwright command
    local cmd="npx playwright test"

    # Add workers if specified
    if [ -n "$WORKERS" ]; then
        cmd="$cmd $WORKERS"
    fi

    # Add headed mode
    if [ "$HEADED" = true ]; then
        cmd="$cmd --headed"
    fi

    # Add debug mode
    if [ "$DEBUG" = true ]; then
        cmd="$cmd --debug"
    fi

    # Add browser selection
    case $BROWSER in
        "all")
            cmd="$cmd --project=chromium --project=firefox --project=webkit"
            ;;
        "chromium"|"firefox"|"webkit")
            cmd="$cmd --project=$BROWSER"
            ;;
        *)
            log_error "Unknown browser: $BROWSER"
            return 1
            ;;
    esac

    # Add test-specific arguments
    cmd="$cmd $test_args"

    log_info "Running: $cmd"
    $cmd
}

# Main execution
main() {
    log_info "Dynamic Pages E2E Test Runner"
    log_info "Mode: $RUN_MODE | Browser: $BROWSER | Debug: $DEBUG | Headed: $HEADED"
    echo ""

    # Handle special modes
    case $RUN_MODE in
        "cleanup")
            cleanup_test_data
            exit 0
            ;;
        "report")
            cd "$TEST_DIR"
            npx playwright show-report
            exit 0
            ;;
        "setup")
            if start_servers; then
                log_success "Setup verification completed successfully"
                exit 0
            else
                log_error "Setup verification failed"
                exit 1
            fi
            ;;
    esac

    # Start servers
    if ! start_servers; then
        log_error "Failed to start required servers"
        exit 1
    fi

    # Give servers a moment to fully initialize
    sleep 3

    # Run tests based on mode
    case $RUN_MODE in
        "all")
            log_info "Running all dynamic pages tests..."
            run_playwright_tests ""
            ;;
        "e2e")
            log_info "Running E2E navigation tests..."
            run_playwright_tests "dynamic-pages.spec.ts"
            ;;
        "api")
            log_info "Running API integration tests..."
            run_playwright_tests "api-integration.spec.ts"
            ;;
        "rendering")
            log_info "Running page rendering tests..."
            run_playwright_tests "page-rendering.spec.ts"
            ;;
        "mobile")
            log_info "Running mobile tests..."
            run_playwright_tests '--project="Mobile Chrome" --project="Mobile Safari"'
            ;;
        "performance")
            log_info "Running performance tests..."
            run_playwright_tests '--grep="performance|Performance|load|Load"'
            ;;
        "accessibility")
            log_info "Running accessibility tests..."
            run_playwright_tests '--grep="accessibility|Accessibility|a11y"'
            ;;
        *)
            log_error "Unknown run mode: $RUN_MODE"
            exit 1
            ;;
    esac

    # Test execution completed
    local test_exit_code=$?

    if [ $test_exit_code -eq 0 ]; then
        log_success "All tests completed successfully!"

        # Show quick results summary
        log_info "Generating test report..."
        cd "$TEST_DIR"

        # Check if reports exist
        if [ -d "./reports" ]; then
            log_success "Reports available:"
            echo "  HTML Report: file://$TEST_DIR/reports/html/index.html"
            if [ -f "./reports/results.json" ]; then
                echo "  JSON Results: $TEST_DIR/reports/results.json"
            fi
            if [ -f "./reports/junit.xml" ]; then
                echo "  JUnit XML: $TEST_DIR/reports/junit.xml"
            fi
        fi

    else
        log_error "Tests failed with exit code $test_exit_code"

        # Show helpful debugging information
        log_info "Debugging information:"
        echo "  Backend logs: tail -f /tmp/backend.log"
        echo "  Frontend logs: tail -f /tmp/frontend.log"
        echo "  Test results: $TEST_DIR/test-results/"
        echo "  Screenshots: $TEST_DIR/test-results/screenshots/"
    fi

    # Cleanup test data
    cleanup_test_data

    # Exit with test result code
    exit $test_exit_code
}

# Handle script interruption
cleanup_on_exit() {
    log_info "Cleaning up on exit..."
    cleanup_test_data
    exit 1
}

trap cleanup_on_exit INT TERM

# Run main function
main "$@"