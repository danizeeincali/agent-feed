#!/bin/bash

###############################################################################
# End-to-End Test Runner for Page Registration Workflow
#
# This script runs all E2E tests in the correct order with proper reporting.
# Tests use REAL functionality - no mocks, actual API, database, and filesystem.
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test configuration
WORKSPACE_ROOT="/workspaces/agent-feed"
TEST_DIR="${WORKSPACE_ROOT}/tests/e2e"
RESULTS_DIR="${TEST_DIR}/results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create results directory
mkdir -p "${RESULTS_DIR}"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Page Registration E2E Test Suite${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  📅 Timestamp: ${TIMESTAMP}"
echo -e "  📂 Test Directory: ${TEST_DIR}"
echo -e "  📊 Results Directory: ${RESULTS_DIR}"
echo ""

# Test execution function
run_test() {
  local test_name=$1
  local test_file=$2
  local description=$3

  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${YELLOW}Running: ${test_name}${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "  📝 ${description}"
  echo ""

  local start_time=$(date +%s)
  local result_file="${RESULTS_DIR}/${test_name}_${TIMESTAMP}.json"

  if npx playwright test "${test_file}" \
    --reporter=json \
    --output="${RESULTS_DIR}/${test_name}_output" \
    > "${result_file}" 2>&1; then

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    echo ""
    echo -e "${GREEN}✅ ${test_name} PASSED${NC} (${duration}s)"
    echo ""
    return 0
  else
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    echo ""
    echo -e "${RED}❌ ${test_name} FAILED${NC} (${duration}s)"
    echo -e "${RED}   See: ${result_file}${NC}"
    echo ""
    return 1
  fi
}

# Track test results
PASSED=0
FAILED=0
TOTAL=0

# Test 1: Complete Workflow
TOTAL=$((TOTAL + 1))
if run_test \
  "page-registration-workflow" \
  "${TEST_DIR}/page-registration-workflow.test.js" \
  "Complete workflow: create → register → verify → render"; then
  PASSED=$((PASSED + 1))
else
  FAILED=$((FAILED + 1))
fi

# Test 2: Agent Compliance
TOTAL=$((TOTAL + 1))
if run_test \
  "agent-compliance" \
  "${TEST_DIR}/agent-compliance.test.js" \
  "Agent behavior: Bash tool usage, no scripts, proper verification"; then
  PASSED=$((PASSED + 1))
else
  FAILED=$((FAILED + 1))
fi

# Test 3: Failure Recovery
TOTAL=$((TOTAL + 1))
if run_test \
  "failure-recovery" \
  "${TEST_DIR}/failure-recovery.test.js" \
  "System recovery: restarts, retries, error handling"; then
  PASSED=$((PASSED + 1))
else
  FAILED=$((FAILED + 1))
fi

# Test 4: Performance
TOTAL=$((TOTAL + 1))
if run_test \
  "performance" \
  "${TEST_DIR}/performance.test.js" \
  "Performance: speed, memory, concurrency, bulk load"; then
  PASSED=$((PASSED + 1))
else
  FAILED=$((FAILED + 1))
fi

# Generate summary report
SUMMARY_FILE="${RESULTS_DIR}/summary_${TIMESTAMP}.txt"

cat > "${SUMMARY_FILE}" << EOF
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  E2E Test Suite Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Timestamp: ${TIMESTAMP}
  Total Tests: ${TOTAL}
  Passed: ${PASSED}
  Failed: ${FAILED}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Test Results:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EOF

# Append individual test results
for test in page-registration-workflow agent-compliance failure-recovery performance; do
  result_file="${RESULTS_DIR}/${test}_${TIMESTAMP}.json"
  if [ -f "${result_file}" ]; then
    echo "  ${test}: See ${result_file}" >> "${SUMMARY_FILE}"
  fi
done

# Display summary
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Test Suite Summary${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  Total Tests: ${TOTAL}"
echo -e "  ${GREEN}Passed: ${PASSED}${NC}"
if [ ${FAILED} -gt 0 ]; then
  echo -e "  ${RED}Failed: ${FAILED}${NC}"
else
  echo -e "  Failed: ${FAILED}"
fi
echo ""
echo -e "  📊 Summary: ${SUMMARY_FILE}"
echo ""

if [ ${FAILED} -eq 0 ]; then
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${GREEN}  🎉 All tests PASSED!${NC}"
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  exit 0
else
  echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${RED}  ❌ Some tests FAILED!${NC}"
  echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  exit 1
fi
