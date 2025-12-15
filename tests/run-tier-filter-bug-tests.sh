#!/bin/bash

###############################################################################
# TDD Tier Filter Bug Fix Test Runner
#
# Runs all test suites for tier filtering bug fixes
# EXPECTED: All tests should FAIL initially (demonstrating the bugs)
# After fix: All tests should PASS
###############################################################################

set -e

echo "============================================================================"
echo "TDD: Tier Filter Bug Fix Test Suite"
echo "============================================================================"
echo ""
echo "EXPECTED BEHAVIOR: All tests should FAIL initially"
echo "This demonstrates the bugs exist and need to be fixed"
echo ""
echo "============================================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TOTAL_TESTS=0
FAILED_TESTS=0
PASSED_TESTS=0

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}PHASE 1: Frontend Unit Tests (London School TDD)${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Running: frontend/src/tests/unit/IsolatedRealAgentManager-tier-bug-fix.test.tsx"
echo ""

cd /workspaces/agent-feed/frontend

if npm test -- IsolatedRealAgentManager-tier-bug-fix.test.tsx --run 2>&1 | tee /tmp/unit-test-output.txt; then
  echo -e "${GREEN}✓ Frontend unit tests PASSED${NC}"
  UNIT_RESULT="PASS"
else
  echo -e "${RED}✗ Frontend unit tests FAILED (expected)${NC}"
  UNIT_RESULT="FAIL"
  FAILED_TESTS=$((FAILED_TESTS + 1))
fi

# Count tests from output
UNIT_TEST_COUNT=$(grep -oP '\d+(?= passed|\s+failed)' /tmp/unit-test-output.txt | head -1 || echo "0")
TOTAL_TESTS=$((TOTAL_TESTS + UNIT_TEST_COUNT))

echo ""
echo "Unit Tests: $UNIT_TEST_COUNT tests, Result: $UNIT_RESULT"
echo ""

cd /workspaces/agent-feed

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}PHASE 2: Backend Integration Tests${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Running: tests/integration/agent-tier-filtering-fix.test.js"
echo ""

# Check if mocha is available
if ! command -v mocha &> /dev/null; then
  echo -e "${YELLOW}⚠ Installing mocha...${NC}"
  npm install --save-dev mocha chai supertest
fi

if npx mocha tests/integration/agent-tier-filtering-fix.test.js --timeout 10000 --reporter spec 2>&1 | tee /tmp/integration-test-output.txt; then
  echo -e "${GREEN}✓ Backend integration tests PASSED${NC}"
  INTEGRATION_RESULT="PASS"
else
  echo -e "${RED}✗ Backend integration tests FAILED (expected)${NC}"
  INTEGRATION_RESULT="FAIL"
  FAILED_TESTS=$((FAILED_TESTS + 1))
fi

# Count tests
INTEGRATION_TEST_COUNT=$(grep -oP '\d+(?= passing|\s+failing)' /tmp/integration-test-output.txt | head -1 || echo "0")
TOTAL_TESTS=$((TOTAL_TESTS + INTEGRATION_TEST_COUNT))

echo ""
echo "Integration Tests: $INTEGRATION_TEST_COUNT tests, Result: $INTEGRATION_RESULT"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}PHASE 3: E2E Playwright Tests${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Running: tests/e2e/tier-filter-bug-fix-validation.spec.ts"
echo ""
echo -e "${YELLOW}⚠ Skipping E2E tests (requires running dev server)${NC}"
echo "To run E2E tests manually:"
echo "  1. Start frontend: cd frontend && npm run dev"
echo "  2. Start backend: cd api-server && npm start"
echo "  3. Run E2E: npx playwright test tests/e2e/tier-filter-bug-fix-validation.spec.ts"
echo ""

E2E_RESULT="SKIPPED"
E2E_TEST_COUNT=25 # Approximate count from spec file

echo ""
echo "E2E Tests: $E2E_TEST_COUNT tests, Result: $E2E_RESULT"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}TEST SUITE SUMMARY${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Test Suite Results:"
echo "  • Frontend Unit Tests:      $UNIT_RESULT ($UNIT_TEST_COUNT tests)"
echo "  • Backend Integration Tests: $INTEGRATION_RESULT ($INTEGRATION_TEST_COUNT tests)"
echo "  • E2E Playwright Tests:     $E2E_RESULT ($E2E_TEST_COUNT tests)"
echo ""
echo "Total Tests: $TOTAL_TESTS"
echo "Failed Suites: $FAILED_TESTS"
echo ""

if [ $FAILED_TESTS -gt 0 ]; then
  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${YELLOW}✓ SUCCESS: Tests are FAILING as expected (bugs exist)${NC}"
  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo "Next Steps:"
  echo "  1. Implement fixes in IsolatedRealAgentManager.tsx"
  echo "  2. Fix backend response serialization"
  echo "  3. Re-run tests - they should all PASS"
  echo ""
  exit 0
else
  echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${RED}✗ UNEXPECTED: Tests are PASSING (bugs should exist)${NC}"
  echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo "This might mean:"
  echo "  1. Bugs have already been fixed"
  echo "  2. Tests are not correctly detecting the bugs"
  echo "  3. Test environment is different from production"
  echo ""
  exit 1
fi
