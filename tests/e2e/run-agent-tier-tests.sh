#!/bin/bash

###############################################################################
# Agent Tier System E2E Test Runner
#
# Comprehensive test execution script for Agent Tier System validation
#
# Features:
# - Pre-flight environment checks
# - Server startup validation
# - Test execution with multiple configurations
# - Screenshot capture and comparison
# - Test result reporting
# - Cleanup and error handling
#
# Usage:
#   ./run-agent-tier-tests.sh [options]
#
# Options:
#   --update-snapshots    Update visual regression baselines
#   --headed              Run tests in headed mode (visible browser)
#   --debug               Run with Playwright debug inspector
#   --report              Open HTML report after tests
#   --ui                  Run in Playwright UI mode
#
# Requirements:
# - Frontend dev server running on port 5173
# - Backend API server running on port 3000
# - Node.js and npm installed
# - Playwright dependencies installed
#
###############################################################################

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
FRONTEND_PORT=5173
BACKEND_PORT=3000
BASE_URL="http://localhost:${FRONTEND_PORT}"
TEST_FILE="agent-tier-filtering.spec.ts"
REPORT_DIR="tests/e2e/playwright-report"
SCREENSHOTS_DIR="tests/e2e/.playwright/screenshots"

# Parse command line arguments
UPDATE_SNAPSHOTS=false
HEADED=false
DEBUG=false
OPEN_REPORT=false
UI_MODE=false

for arg in "$@"; do
  case $arg in
    --update-snapshots)
      UPDATE_SNAPSHOTS=true
      shift
      ;;
    --headed)
      HEADED=true
      shift
      ;;
    --debug)
      DEBUG=true
      shift
      ;;
    --report)
      OPEN_REPORT=true
      shift
      ;;
    --ui)
      UI_MODE=true
      shift
      ;;
    *)
      # Unknown option
      ;;
  esac
done

###############################################################################
# Helper Functions
###############################################################################

print_header() {
  echo ""
  echo -e "${BLUE}================================${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}================================${NC}"
  echo ""
}

print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
  echo -e "${RED}✗ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
  echo -e "${BLUE}ℹ $1${NC}"
}

check_port() {
  local port=$1
  local service=$2

  if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
    print_success "$service is running on port $port"
    return 0
  else
    print_error "$service is NOT running on port $port"
    return 1
  fi
}

check_command() {
  local cmd=$1

  if command -v $cmd &> /dev/null; then
    print_success "$cmd is installed"
    return 0
  else
    print_error "$cmd is NOT installed"
    return 1
  fi
}

###############################################################################
# Pre-flight Checks
###############################################################################

print_header "Pre-flight Environment Checks"

# Check required commands
COMMANDS_OK=true
for cmd in node npm npx curl; do
  if ! check_command $cmd; then
    COMMANDS_OK=false
  fi
done

if [ "$COMMANDS_OK" = false ]; then
  print_error "Missing required commands. Please install them first."
  exit 1
fi

# Check server status
SERVERS_OK=true
print_info "Checking server availability..."

if ! check_port $FRONTEND_PORT "Frontend dev server"; then
  print_warning "Frontend server not running. Start it with: cd frontend && npm run dev"
  SERVERS_OK=false
fi

if ! check_port $BACKEND_PORT "Backend API server"; then
  print_warning "Backend server not running. Start it with: node api-server/server.js"
  SERVERS_OK=false
fi

if [ "$SERVERS_OK" = false ]; then
  print_error "Required servers are not running. Please start them before running tests."
  exit 1
fi

# Test server connectivity
print_info "Testing server connectivity..."

if curl -s -o /dev/null -w "%{http_code}" $BASE_URL | grep -q "200"; then
  print_success "Frontend server is accessible at $BASE_URL"
else
  print_error "Frontend server is not accessible at $BASE_URL"
  exit 1
fi

if curl -s -o /dev/null -w "%{http_code}" http://localhost:$BACKEND_PORT/api/agents | grep -q "200"; then
  print_success "Backend API is accessible"
else
  print_error "Backend API is not accessible"
  exit 1
fi

# Check Playwright installation
print_info "Checking Playwright installation..."

if npx playwright --version &> /dev/null; then
  PLAYWRIGHT_VERSION=$(npx playwright --version)
  print_success "Playwright installed: $PLAYWRIGHT_VERSION"
else
  print_error "Playwright is not installed. Run: npm install && npx playwright install"
  exit 1
fi

###############################################################################
# Test Execution
###############################################################################

print_header "Agent Tier System E2E Tests"

# Build test command
TEST_CMD="npx playwright test $TEST_FILE"

# Add options based on flags
if [ "$UPDATE_SNAPSHOTS" = true ]; then
  TEST_CMD="$TEST_CMD --update-snapshots"
  print_info "Visual regression baselines will be updated"
fi

if [ "$HEADED" = true ]; then
  TEST_CMD="$TEST_CMD --headed"
  print_info "Running in headed mode (visible browser)"
fi

if [ "$DEBUG" = true ]; then
  TEST_CMD="$TEST_CMD --debug"
  print_info "Running with Playwright inspector"
fi

if [ "$UI_MODE" = true ]; then
  print_info "Launching Playwright UI mode..."
  npx playwright test $TEST_FILE --ui
  exit 0
fi

# Set environment variables
export BASE_URL=$BASE_URL

print_info "Running tests: $TEST_CMD"
echo ""

# Run tests
if $TEST_CMD; then
  TEST_EXIT_CODE=0
  print_success "All tests passed!"
else
  TEST_EXIT_CODE=$?
  print_error "Some tests failed (exit code: $TEST_EXIT_CODE)"
fi

###############################################################################
# Test Results
###############################################################################

print_header "Test Results Summary"

# Check for test results file
if [ -f "tests/e2e/test-results.json" ]; then
  print_info "Test results saved to: tests/e2e/test-results.json"

  # Extract test counts (requires jq)
  if command -v jq &> /dev/null; then
    TOTAL=$(jq '.suites | map(.specs | length) | add' tests/e2e/test-results.json 2>/dev/null || echo "?")
    print_info "Total test scenarios: $TOTAL"
  fi
fi

# Check for HTML report
if [ -d "$REPORT_DIR" ]; then
  print_success "HTML report generated: $REPORT_DIR/index.html"

  if [ "$OPEN_REPORT" = true ]; then
    print_info "Opening HTML report..."
    if command -v open &> /dev/null; then
      open "$REPORT_DIR/index.html"
    elif command -v xdg-open &> /dev/null; then
      xdg-open "$REPORT_DIR/index.html"
    else
      print_warning "Could not open report automatically. View it at: $REPORT_DIR/index.html"
    fi
  fi
else
  print_warning "HTML report not found"
fi

# Check for screenshots
if [ -d "$SCREENSHOTS_DIR" ]; then
  SCREENSHOT_COUNT=$(find "$SCREENSHOTS_DIR" -name "*.png" | wc -l)
  print_info "Visual regression screenshots: $SCREENSHOT_COUNT"
fi

# Check for failures
if [ $TEST_EXIT_CODE -ne 0 ]; then
  print_header "Failure Analysis"

  print_warning "Tests failed. Common issues:"
  echo "  1. Check if correct number of agents are loaded (8 T1, 11 T2, 19 total)"
  echo "  2. Verify tier toggle component is rendering correctly"
  echo "  3. Check for JavaScript errors in browser console"
  echo "  4. Ensure API is returning correct tier data"
  echo "  5. Review screenshots in test-results/ directory"
  echo ""
  print_info "To debug: ./run-agent-tier-tests.sh --debug"
  print_info "To update snapshots: ./run-agent-tier-tests.sh --update-snapshots"
fi

###############################################################################
# Cleanup
###############################################################################

print_header "Test Execution Complete"

if [ $TEST_EXIT_CODE -eq 0 ]; then
  print_success "All Agent Tier System E2E tests passed successfully!"
  echo ""
  print_info "Next steps:"
  echo "  - Review HTML report: $REPORT_DIR/index.html"
  echo "  - Check visual regression screenshots"
  echo "  - Verify test coverage meets requirements (>95%)"
  exit 0
else
  print_error "Agent Tier System E2E tests failed"
  echo ""
  print_info "Review the failures and try again"
  exit $TEST_EXIT_CODE
fi
