#!/bin/bash

# Comment Processing Pill E2E Test Runner
# This script runs the complete E2E test suite with screenshot capture

set -e

echo "🧪 Comment Processing Pill E2E Test Suite"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if backend is running
check_backend() {
  echo "🔍 Checking backend status..."
  if curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${GREEN}✓${NC} Backend is running"
    return 0
  else
    echo -e "${RED}✗${NC} Backend is not running"
    return 1
  fi
}

# Start backend if not running
start_backend() {
  echo "🚀 Starting backend server..."
  cd api-server
  node server.js > /dev/null 2>&1 &
  BACKEND_PID=$!
  echo "Backend PID: $BACKEND_PID"
  cd ..

  # Wait for backend to be ready
  echo "⏳ Waiting for backend to be ready..."
  for i in {1..30}; do
    if curl -s http://localhost:3000/health > /dev/null; then
      echo -e "${GREEN}✓${NC} Backend is ready"
      return 0
    fi
    sleep 1
  done

  echo -e "${RED}✗${NC} Backend failed to start"
  return 1
}

# Create screenshots directory
create_screenshots_dir() {
  echo "📁 Creating screenshots directory..."
  mkdir -p tests/playwright/screenshots
  echo -e "${GREEN}✓${NC} Screenshots directory ready"
}

# Install Playwright if needed
check_playwright() {
  echo "🔍 Checking Playwright installation..."
  if ! npx playwright --version > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠${NC} Installing Playwright..."
    npm install --save-dev @playwright/test
    npx playwright install chromium
  else
    echo -e "${GREEN}✓${NC} Playwright is installed"
  fi
}

# Run tests
run_tests() {
  echo ""
  echo "🧪 Running E2E tests..."
  echo "======================="

  npx playwright test --config=playwright.config.processing-pill.ts

  TEST_EXIT_CODE=$?

  if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓ All tests passed!${NC}"
  else
    echo ""
    echo -e "${RED}✗ Some tests failed${NC}"
  fi

  return $TEST_EXIT_CODE
}

# Show screenshots
show_screenshots() {
  echo ""
  echo "📸 Generated Screenshots:"
  echo "========================"

  if [ -d "tests/playwright/screenshots" ]; then
    ls -lh tests/playwright/screenshots/ | tail -n +2 | while read -r line; do
      echo "  $line"
    done
  else
    echo -e "${YELLOW}⚠${NC} No screenshots found"
  fi
}

# Show report
show_report() {
  echo ""
  echo "📊 Test Report:"
  echo "=============="

  if [ -f "tests/playwright/test-results.json" ]; then
    echo "JSON results: tests/playwright/test-results.json"
  fi

  if [ -d "tests/playwright/playwright-report" ]; then
    echo "HTML report: tests/playwright/playwright-report"
    echo ""
    echo "To view HTML report, run:"
    echo "  npx playwright show-report tests/playwright/playwright-report"
  fi
}

# Cleanup on exit
cleanup() {
  if [ ! -z "$BACKEND_PID" ]; then
    echo ""
    echo "🧹 Cleaning up..."
    kill $BACKEND_PID 2>/dev/null || true
    echo -e "${GREEN}✓${NC} Backend stopped"
  fi
}

# Set trap for cleanup
trap cleanup EXIT

# Main execution
main() {
  BACKEND_PID=""
  BACKEND_ALREADY_RUNNING=false

  # Check prerequisites
  check_playwright
  create_screenshots_dir

  # Check if backend is running
  if check_backend; then
    BACKEND_ALREADY_RUNNING=true
  else
    # Start backend if not running
    if ! start_backend; then
      echo -e "${RED}Failed to start backend${NC}"
      exit 1
    fi
  fi

  # Run tests
  run_tests
  TEST_EXIT_CODE=$?

  # Show results
  show_screenshots
  show_report

  # Don't kill backend if it was already running
  if [ "$BACKEND_ALREADY_RUNNING" = true ]; then
    echo ""
    echo "ℹ️  Backend was already running, not stopping it"
    BACKEND_PID=""
  fi

  echo ""
  echo "=========================================="
  if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✓ Test suite completed successfully${NC}"
  else
    echo -e "${RED}✗ Test suite failed${NC}"
  fi
  echo "=========================================="

  exit $TEST_EXIT_CODE
}

# Run main function
main
