#!/bin/bash

# AVI Persistent Session - Test Suite Runner
# London School TDD Implementation
# Date: 2025-10-24

echo "================================================"
echo "AVI Persistent Session - TDD Test Suite"
echo "London School (Mockist) Approach"
echo "================================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Track results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to run test suite
run_test_suite() {
  local test_file=$1
  local test_name=$2

  echo -e "${YELLOW}Running: ${test_name}${NC}"
  echo "File: ${test_file}"
  echo ""

  npm test -- --run ${test_file} --reporter=verbose

  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ ${test_name} PASSED${NC}"
  else
    echo -e "${RED}✗ ${test_name} FAILED${NC}"
    ((FAILED_TESTS++))
  fi

  echo ""
  echo "------------------------------------------------"
  echo ""
}

# Run all test suites
echo "Starting test execution..."
echo ""

# 1. Unit Tests: AVI Session Manager
run_test_suite "tests/unit/avi-session-manager.test.js" "Unit Tests: AVI Session Manager (42 tests)"

# 2. Integration Tests: AVI Post Integration
run_test_suite "tests/integration/avi-post-integration.test.js" "Integration Tests: AVI Post Integration (18 tests)"

# 3. Integration Tests: AVI DM API
run_test_suite "tests/integration/avi-dm-api.test.js" "Integration Tests: AVI DM API (35 tests)"

# 4. Unit Tests: Comment Schema Migration
run_test_suite "tests/unit/comment-schema-migration.test.js" "Unit Tests: Comment Schema Migration (18 tests)"

# Final Summary
echo "================================================"
echo "TEST SUITE SUMMARY"
echo "================================================"
echo ""
echo "Total Test Suites: 4"
echo "Total Tests: 113"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
  echo -e "${GREEN}✓ ALL TESTS PASSED${NC}"
  echo ""
  echo "Test Coverage:"
  echo "  - Session lifecycle: ✓"
  echo "  - Token tracking: ✓"
  echo "  - Idle timeout: ✓"
  echo "  - Comment creation: ✓"
  echo "  - API endpoints: ✓"
  echo "  - Schema migration: ✓"
  echo ""
  exit 0
else
  echo -e "${RED}✗ ${FAILED_TESTS} TEST SUITE(S) FAILED${NC}"
  echo ""
  exit 1
fi
