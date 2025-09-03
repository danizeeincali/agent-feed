#!/bin/bash

# Claude AI Response System - Regression Test Suite Runner
# 
# This script runs the complete regression test suite with proper setup,
# execution, and cleanup for the Claude AI response system.

set -e  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKEND_PID=""
FRONTEND_PID=""
TEST_START_TIME=$(date +%s)
REPORT_DIR="$PROJECT_ROOT/tests/reports"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Logging functions
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

log_header() {
    echo -e "${PURPLE}[REGRESSION TEST SUITE]${NC} $1"
}

# Cleanup function
cleanup() {
    log_info "Starting cleanup..."
    
    # Kill backend if running
    if [ ! -z "$BACKEND_PID" ]; then
        log_info "Stopping backend (PID: $BACKEND_PID)..."
        kill $BACKEND_PID 2>/dev/null || true
        wait $BACKEND_PID 2>/dev/null || true
    fi
    
    # Kill frontend if running
    if [ ! -z "$FRONTEND_PID" ]; then
        log_info "Stopping frontend (PID: $FRONTEND_PID)..."
        kill $FRONTEND_PID 2>/dev/null || true
        wait $FRONTEND_PID 2>/dev/null || true
    fi
    
    # Clean up any remaining Claude instances
    cleanup_claude_instances
    
    log_success "Cleanup completed"
}

# Trap for cleanup on exit
trap cleanup EXIT

# Claude instance cleanup
cleanup_claude_instances() {
    log_info "Cleaning up test Claude instances..."
    
    # Try to clean up via API
    curl -s -X GET "http://localhost:3000/api/claude/instances" | \
        jq -r '.instances[]? | select(.id | contains("test")) | .id' | \
        while read -r instance_id; do
            if [ ! -z "$instance_id" ]; then
                log_info "Deleting test instance: $instance_id"
                curl -s -X DELETE "http://localhost:3000/api/claude/instances/$instance_id" || true
            fi
        done
}

# Check prerequisites
check_prerequisites() {
    log_header "Checking Prerequisites"
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    log_success "Node.js found: $(node --version)"
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi
    log_success "npm found: $(npm --version)"
    
    # Check jq for JSON parsing
    if ! command -v jq &> /dev/null; then
        log_warning "jq not found, installing..."
        npm install -g jq || true
    fi
    
    # Check if Claude CLI is available
    if ! command -v claude &> /dev/null; then
        log_warning "Claude CLI not found in PATH"
    else
        log_success "Claude CLI found: $(claude --version | head -1)"
    fi
    
    # Create reports directory
    mkdir -p "$REPORT_DIR"
}

# Install dependencies
install_dependencies() {
    log_header "Installing Dependencies"
    
    cd "$PROJECT_ROOT"
    
    # Install root dependencies
    log_info "Installing root dependencies..."
    npm install --silent
    
    # Install frontend dependencies
    if [ -d "frontend" ]; then
        log_info "Installing frontend dependencies..."
        cd frontend
        npm install --silent
        cd ..
    fi
    
    # Install test dependencies
    log_info "Installing test dependencies..."
    npm install --save-dev --silent jest @jest/globals eventsource node-fetch jest-junit jest-html-reporters @playwright/test
    
    log_success "Dependencies installed"
}

# Start backend server
start_backend() {
    log_header "Starting Backend Server"
    
    cd "$PROJECT_ROOT"
    
    # Check if port 3000 is already in use
    if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
        log_warning "Port 3000 is already in use, attempting to kill existing process..."
        lsof -ti:3000 | xargs kill -9 2>/dev/null || true
        sleep 2
    fi
    
    # Start backend
    log_info "Starting backend server..."
    node simple-backend.js > "$REPORT_DIR/backend.log" 2>&1 &
    BACKEND_PID=$!
    
    # Wait for backend to be ready
    log_info "Waiting for backend to be ready..."
    local retries=30
    while [ $retries -gt 0 ]; do
        if curl -s "http://localhost:3000/health" > /dev/null 2>&1; then
            log_success "Backend server is ready (PID: $BACKEND_PID)"
            return 0
        fi
        sleep 2
        retries=$((retries - 1))
    done
    
    log_error "Backend server failed to start within 60 seconds"
    exit 1
}

# Start frontend server
start_frontend() {
    log_header "Starting Frontend Server"
    
    cd "$PROJECT_ROOT/frontend"
    
    # Check if port 5173 is already in use
    if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1; then
        log_warning "Port 5173 is already in use, attempting to kill existing process..."
        lsof -ti:5173 | xargs kill -9 2>/dev/null || true
        sleep 2
    fi
    
    # Start frontend
    log_info "Starting frontend development server..."
    npm run dev > "$REPORT_DIR/frontend.log" 2>&1 &
    FRONTEND_PID=$!
    
    # Wait for frontend to be ready
    log_info "Waiting for frontend to be ready..."
    local retries=30
    while [ $retries -gt 0 ]; do
        if curl -s "http://localhost:5173" > /dev/null 2>&1; then
            log_success "Frontend server is ready (PID: $FRONTEND_PID)"
            return 0
        fi
        sleep 2
        retries=$((retries - 1))
    done
    
    log_error "Frontend server failed to start within 60 seconds"
    exit 1
}

# Run regression tests
run_regression_tests() {
    log_header "Running Regression Tests"
    
    cd "$PROJECT_ROOT"
    
    local test_start=$(date +%s)
    
    # Run Jest tests
    log_info "Running regression and integration tests..."
    if npx jest --config tests/jest.config.regression.js --verbose --forceExit; then
        log_success "Regression tests passed"
    else
        log_error "Regression tests failed"
        return 1
    fi
    
    local test_end=$(date +%s)
    local test_duration=$((test_end - test_start))
    log_info "Regression tests completed in ${test_duration} seconds"
}

# Run E2E tests
run_e2e_tests() {
    log_header "Running E2E Tests"
    
    cd "$PROJECT_ROOT"
    
    local test_start=$(date +%s)
    
    # Install Playwright browsers if not already installed
    log_info "Ensuring Playwright browsers are installed..."
    npx playwright install --with-deps chromium > /dev/null 2>&1 || true
    
    # Run Playwright tests
    log_info "Running end-to-end tests..."
    if npx playwright test --config tests/playwright.config.e2e.js; then
        log_success "E2E tests passed"
    else
        log_error "E2E tests failed"
        return 1
    fi
    
    local test_end=$(date +%s)
    local test_duration=$((test_end - test_start))
    log_info "E2E tests completed in ${test_duration} seconds"
}

# Generate test report summary
generate_report_summary() {
    log_header "Generating Test Report Summary"
    
    local total_end_time=$(date +%s)
    local total_duration=$((total_end_time - TEST_START_TIME))
    
    local summary_file="$REPORT_DIR/test-run-summary-$(date +%Y%m%d-%H%M%S).json"
    
    cat > "$summary_file" << EOF
{
  "testRun": {
    "timestamp": "$(date -Iseconds)",
    "duration": ${total_duration},
    "status": "completed",
    "environment": {
      "nodeVersion": "$(node --version)",
      "npmVersion": "$(npm --version)",
      "platform": "$(uname -s)",
      "architecture": "$(uname -m)"
    },
    "services": {
      "backend": {
        "pid": "${BACKEND_PID}",
        "url": "http://localhost:3000",
        "logFile": "$REPORT_DIR/backend.log"
      },
      "frontend": {
        "pid": "${FRONTEND_PID}",
        "url": "http://localhost:5173",
        "logFile": "$REPORT_DIR/frontend.log"
      }
    },
    "reports": {
      "jestHtml": "$REPORT_DIR/regression-test-report.html",
      "jestJunit": "$REPORT_DIR/regression-junit.xml",
      "playwrightHtml": "$REPORT_DIR/e2e-html/index.html",
      "playwrightJunit": "$REPORT_DIR/e2e-junit.xml",
      "coverage": "$PROJECT_ROOT/tests/coverage/regression/lcov-report/index.html"
    }
  }
}
EOF
    
    log_success "Test report summary: $summary_file"
    
    # Display summary
    echo
    log_header "TEST RUN SUMMARY"
    echo -e "${BLUE}Total Duration:${NC} ${total_duration} seconds"
    echo -e "${BLUE}Backend PID:${NC} ${BACKEND_PID}"
    echo -e "${BLUE}Frontend PID:${NC} ${FRONTEND_PID}"
    echo -e "${BLUE}Reports Directory:${NC} $REPORT_DIR"
    echo
    
    if [ -f "$REPORT_DIR/regression-test-report.html" ]; then
        log_success "HTML Test Report: $REPORT_DIR/regression-test-report.html"
    fi
    
    if [ -f "$REPORT_DIR/e2e-html/index.html" ]; then
        log_success "E2E Test Report: $REPORT_DIR/e2e-html/index.html"
    fi
}

# Main execution
main() {
    log_header "Starting Claude AI Response System Regression Test Suite"
    echo -e "${BLUE}Timestamp:${NC} $(date)"
    echo -e "${BLUE}Project Root:${NC} $PROJECT_ROOT"
    echo
    
    # Run all phases
    check_prerequisites
    install_dependencies
    start_backend
    start_frontend
    
    # Give services time to fully initialize
    log_info "Allowing services to fully initialize..."
    sleep 5
    
    # Run tests
    local test_failures=0
    
    if ! run_regression_tests; then
        test_failures=$((test_failures + 1))
    fi
    
    if ! run_e2e_tests; then
        test_failures=$((test_failures + 1))
    fi
    
    # Generate report
    generate_report_summary
    
    # Final status
    echo
    if [ $test_failures -eq 0 ]; then
        log_header "🎉 ALL TESTS PASSED! 🎉"
        echo -e "${GREEN}The Claude AI response system is protected from regressions.${NC}"
        exit 0
    else
        log_header "❌ TEST FAILURES DETECTED ❌"
        echo -e "${RED}$test_failures test suite(s) failed. Please review the reports.${NC}"
        exit 1
    fi
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "Claude AI Response System - Regression Test Suite Runner"
        echo
        echo "Usage: $0 [options]"
        echo
        echo "Options:"
        echo "  --help, -h          Show this help message"
        echo "  --no-cleanup        Skip cleanup on exit"
        echo "  --verbose, -v       Enable verbose output"
        echo
        echo "Environment Variables:"
        echo "  TEST_TIMEOUT        Override test timeout (default: 60000ms)"
        echo "  SKIP_INSTALL        Skip dependency installation"
        echo "  KEEP_SERVERS        Keep servers running after tests"
        echo
        exit 0
        ;;
    --no-cleanup)
        trap - EXIT
        ;;
    --verbose|-v)
        set -x
        ;;
esac

# Run main function
main "$@"