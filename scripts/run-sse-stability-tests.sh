#!/bin/bash

###############################################################################
# SSE Stability Test Suite Runner
#
# Runs comprehensive SSE stability tests in the correct order:
# 1. Quick validation (30 seconds)
# 2. Full stability test (5 minutes)
# 3. E2E browser tests (Playwright)
#
# Usage: ./scripts/run-sse-stability-tests.sh [quick|full|e2e|all]
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SERVER_URL="${SERVER_URL:-http://localhost:3001}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:5173}"
RESULTS_DIR="tests/results/sse-stability"

# Create results directory
mkdir -p "$RESULTS_DIR"

# Functions
print_header() {
  echo -e "\n${BLUE}========================================${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}========================================${NC}\n"
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

check_server() {
  print_header "Checking Server Health"

  if curl -f -s "$SERVER_URL/health" > /dev/null 2>&1; then
    print_success "Server is running at $SERVER_URL"
    return 0
  else
    print_error "Server is not running at $SERVER_URL"
    print_warning "Please start the server first: npm run server"
    return 1
  fi
}

install_dependencies() {
  print_header "Installing Test Dependencies"

  # Install integration test dependencies
  if [ -d "tests/integration" ]; then
    cd tests/integration
    if [ -f "package.json" ]; then
      print_warning "Installing integration test dependencies..."
      npm install
    fi
    cd ../..
  fi

  # Install E2E test dependencies
  if [ -d "tests/e2e" ]; then
    cd tests/e2e
    if [ -f "package.json" ]; then
      print_warning "Installing E2E test dependencies..."
      npm install
      npx playwright install chromium
    fi
    cd ../..
  fi

  print_success "Dependencies installed"
}

run_quick_test() {
  print_header "Running Quick Validation Test (30 seconds)"

  local result_file="$RESULTS_DIR/quick-test-$(date +%Y%m%d-%H%M%S).log"

  if SERVER_URL="$SERVER_URL" node tests/integration/sse-stability-quick.js 2>&1 | tee "$result_file"; then
    print_success "Quick validation test passed"
    return 0
  else
    print_error "Quick validation test failed"
    print_warning "Check log: $result_file"
    return 1
  fi
}

run_full_test() {
  print_header "Running Full Stability Test (5 minutes)"

  local result_file="$RESULTS_DIR/full-test-$(date +%Y%m%d-%H%M%S).log"

  print_warning "This test will take approximately 5 minutes..."

  if SERVER_URL="$SERVER_URL" node tests/integration/sse-stability-full.js 2>&1 | tee "$result_file"; then
    print_success "Full stability test passed"
    return 0
  else
    print_error "Full stability test failed"
    print_warning "Check log: $result_file"
    return 1
  fi
}

run_e2e_test() {
  print_header "Running E2E Browser Tests (Playwright)"

  local result_file="$RESULTS_DIR/e2e-test-$(date +%Y%m%d-%H%M%S).log"

  cd tests/e2e

  if BASE_URL="$FRONTEND_URL" API_URL="$SERVER_URL" npx playwright test sse-stability-validation.spec.ts 2>&1 | tee "../../$result_file"; then
    print_success "E2E tests passed"
    cd ../..
    return 0
  else
    print_error "E2E tests failed"
    print_warning "Check log: $result_file"
    cd ../..
    return 1
  fi
}

generate_report() {
  print_header "Generating Test Report"

  local report_file="$RESULTS_DIR/report-$(date +%Y%m%d-%H%M%S).txt"

  {
    echo "SSE Stability Test Report"
    echo "========================="
    echo "Date: $(date)"
    echo "Server: $SERVER_URL"
    echo "Frontend: $FRONTEND_URL"
    echo ""
    echo "Test Results:"
    echo "-------------"

    if [ "$QUICK_RESULT" = "0" ]; then
      echo "✓ Quick Validation (30s): PASSED"
    else
      echo "✗ Quick Validation (30s): FAILED"
    fi

    if [ "$FULL_RESULT" = "0" ]; then
      echo "✓ Full Stability (5m): PASSED"
    else
      echo "✗ Full Stability (5m): FAILED"
    fi

    if [ "$E2E_RESULT" = "0" ]; then
      echo "✓ E2E Browser Tests: PASSED"
    else
      echo "✗ E2E Browser Tests: FAILED"
    fi

    echo ""
    echo "Screenshots: tests/screenshots/sse-stability/"
    echo "Logs: $RESULTS_DIR/"
  } > "$report_file"

  cat "$report_file"
  print_success "Report saved to $report_file"
}

# Main execution
main() {
  local mode="${1:-all}"

  print_header "SSE Stability Test Suite"
  echo "Mode: $mode"
  echo "Server: $SERVER_URL"
  echo "Frontend: $FRONTEND_URL"

  # Check server
  if ! check_server; then
    exit 1
  fi

  # Install dependencies
  install_dependencies

  # Run tests based on mode
  case "$mode" in
    quick)
      run_quick_test
      exit $?
      ;;
    full)
      run_full_test
      exit $?
      ;;
    e2e)
      run_e2e_test
      exit $?
      ;;
    all)
      QUICK_RESULT=0
      FULL_RESULT=0
      E2E_RESULT=0

      run_quick_test || QUICK_RESULT=$?

      if [ "$QUICK_RESULT" = "0" ]; then
        run_full_test || FULL_RESULT=$?
      else
        print_warning "Skipping full test due to quick test failure"
        FULL_RESULT=1
      fi

      if [ "$QUICK_RESULT" = "0" ]; then
        run_e2e_test || E2E_RESULT=$?
      else
        print_warning "Skipping E2E tests due to quick test failure"
        E2E_RESULT=1
      fi

      generate_report

      if [ "$QUICK_RESULT" = "0" ] && [ "$FULL_RESULT" = "0" ] && [ "$E2E_RESULT" = "0" ]; then
        print_success "All tests passed!"
        exit 0
      else
        print_error "Some tests failed"
        exit 1
      fi
      ;;
    *)
      print_error "Invalid mode: $mode"
      echo "Usage: $0 [quick|full|e2e|all]"
      exit 1
      ;;
  esac
}

main "$@"
