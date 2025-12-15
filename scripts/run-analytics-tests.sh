#!/bin/bash

###############################################################################
# Analytics Test Suite Runner
# Comprehensive test execution for Claude Code SDK Analytics Fix
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
SKIPPED_TESTS=0

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Claude Code SDK Analytics Test Suite${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to run tests and capture results
run_test_suite() {
  local name=$1
  local command=$2
  local expected_count=$3

  echo -e "${YELLOW}Running: ${name}${NC}"
  echo "Command: $command"
  echo ""

  if eval "$command"; then
    echo -e "${GREEN}✅ ${name} - PASSED (${expected_count} tests)${NC}"
    PASSED_TESTS=$((PASSED_TESTS + expected_count))
    TOTAL_TESTS=$((TOTAL_TESTS + expected_count))
    return 0
  else
    echo -e "${RED}❌ ${name} - FAILED${NC}"
    FAILED_TESTS=$((FAILED_TESTS + expected_count))
    TOTAL_TESTS=$((TOTAL_TESTS + expected_count))
    return 1
  fi
}

echo -e "${BLUE}Category 1: Unit Tests - TokenAnalyticsWriter${NC}"
echo "Expected: 14 tests"
echo ""
run_test_suite \
  "Unit Tests - TokenAnalyticsWriter" \
  "cd /workspaces/agent-feed && npx vitest run src/services/__tests__/TokenAnalyticsWriter.test.js" \
  14
echo ""

echo -e "${BLUE}Category 2: Integration Tests - Analytics Tracking Flow${NC}"
echo "Expected: 10 tests"
echo ""
run_test_suite \
  "Integration Tests - Analytics Tracking" \
  "cd /workspaces/agent-feed && npx vitest run src/api/__tests__/analytics-tracking-integration.test.js" \
  10
echo ""

echo -e "${BLUE}Category 3: Database Tests - Manual Write Validation${NC}"
echo "Expected: 7 tests"
echo ""
run_test_suite \
  "Database Tests - Manual Write" \
  "cd /workspaces/agent-feed && npx vitest run tests/integration/database-write.test.js" \
  7
echo ""

echo -e "${BLUE}Category 4: Response Structure Validation Tests${NC}"
echo "Expected: 6 tests"
echo ""
run_test_suite \
  "Response Structure Tests" \
  "cd /workspaces/agent-feed && npx vitest run src/api/__tests__/response-structure-validation.test.js" \
  6
echo ""

echo -e "${BLUE}Category 5: Error Handling Tests${NC}"
echo "Expected: 6 tests"
echo ""
run_test_suite \
  "Error Handling Tests" \
  "cd /workspaces/agent-feed && npx vitest run src/api/__tests__/analytics-error-handling.test.js" \
  6
echo ""

echo -e "${BLUE}Category 6: E2E Tests - Real Analytics Flow${NC}"
echo "Expected: 9 tests"
echo "Note: E2E tests require running API server"
echo ""

# Check if API server is running
if curl -s http://localhost:3001/api/claude-code/health > /dev/null 2>&1; then
  run_test_suite \
    "E2E Tests - Analytics Writing" \
    "cd /workspaces/agent-feed && npx playwright test tests/e2e/analytics-writing.spec.ts" \
    9
else
  echo -e "${YELLOW}⚠️  API server not running, skipping E2E tests${NC}"
  SKIPPED_TESTS=$((SKIPPED_TESTS + 9))
  TOTAL_TESTS=$((TOTAL_TESTS + 9))
fi
echo ""

# Print summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Test Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"
echo -e "${YELLOW}Skipped: $SKIPPED_TESTS${NC}"
echo ""

# Calculate success rate
if [ $TOTAL_TESTS -gt 0 ]; then
  SUCCESS_RATE=$(awk "BEGIN {printf \"%.1f\", ($PASSED_TESTS / $TOTAL_TESTS) * 100}")
  echo "Success Rate: ${SUCCESS_RATE}%"
fi
echo ""

# Exit with error if any tests failed
if [ $FAILED_TESTS -gt 0 ]; then
  echo -e "${RED}❌ Some tests failed. Please review the output above.${NC}"
  exit 1
else
  echo -e "${GREEN}✅ All tests passed!${NC}"
  exit 0
fi
