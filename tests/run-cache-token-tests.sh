#!/bin/bash

###############################################################################
# Cache Token Tracking Test Suite Runner
#
# Comprehensive test execution for cache token tracking feature
# Following London School TDD methodology
###############################################################################

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test result counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}Cache Token Tracking Test Suite${NC}"
echo -e "${BLUE}London School TDD Methodology${NC}"
echo -e "${BLUE}============================================${NC}\n"

# Function to run test file
run_test_suite() {
  local test_file=$1
  local test_name=$2

  echo -e "${YELLOW}Running: ${test_name}${NC}"

  if NODE_OPTIONS=--experimental-vm-modules npx jest "$test_file" --verbose 2>&1 | tee /tmp/test-output.log; then
    local test_count=$(grep -c "✓" /tmp/test-output.log || echo "0")
    PASSED_TESTS=$((PASSED_TESTS + test_count))
    TOTAL_TESTS=$((TOTAL_TESTS + test_count))
    echo -e "${GREEN}✓ ${test_name} PASSED (${test_count} tests)${NC}\n"
  else
    local failed_count=$(grep -c "✗" /tmp/test-output.log || echo "1")
    FAILED_TESTS=$((FAILED_TESTS + failed_count))
    TOTAL_TESTS=$((TOTAL_TESTS + failed_count))
    echo -e "${RED}✗ ${test_name} FAILED${NC}\n"
  fi
}

# Create screenshots directory for E2E tests
mkdir -p tests/screenshots/cache-token-tracking

echo -e "${BLUE}Phase 1: Migration Tests (7 tests)${NC}"
run_test_suite "tests/integration/migration-008-cache-tokens.test.js" "Migration 008"

echo -e "${BLUE}Phase 2: TokenAnalyticsWriter Tests (8 tests)${NC}"
run_test_suite "src/services/__tests__/TokenAnalyticsWriter-cache.test.js" "TokenAnalyticsWriter Cache"

echo -e "${BLUE}Phase 3: Cost Validation Tests (6 tests)${NC}"
run_test_suite "tests/integration/cache-token-cost-validation.test.js" "Cost Validation"

echo -e "${BLUE}Phase 4: Real Data Tests (5 tests)${NC}"
run_test_suite "tests/integration/cache-token-real-data.test.js" "Real Data Integration"

echo -e "${BLUE}Phase 5: Regression Tests (5 tests)${NC}"
run_test_suite "tests/integration/cache-token-regression.test.js" "Regression Tests"

echo -e "${BLUE}Phase 6: E2E Playwright Tests (6 tests)${NC}"
echo -e "${YELLOW}Note: E2E tests require running server${NC}"
if pgrep -f "vite" > /dev/null && pgrep -f "node.*server.js" > /dev/null; then
  npx playwright test tests/e2e/cache-token-tracking.spec.ts --reporter=list
  echo -e "${GREEN}✓ E2E Tests completed${NC}\n"
else
  echo -e "${YELLOW}⚠ Skipping E2E tests (servers not running)${NC}\n"
fi

# Generate Summary Report
echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}Test Execution Summary${NC}"
echo -e "${BLUE}============================================${NC}\n"

echo -e "Total Tests Run: ${TOTAL_TESTS}"
echo -e "${GREEN}Passed: ${PASSED_TESTS}${NC}"
echo -e "${RED}Failed: ${FAILED_TESTS}${NC}\n"

if [ $FAILED_TESTS -eq 0 ]; then
  echo -e "${GREEN}✓ ALL TESTS PASSED!${NC}\n"
  exit 0
else
  echo -e "${RED}✗ SOME TESTS FAILED${NC}\n"
  exit 1
fi
