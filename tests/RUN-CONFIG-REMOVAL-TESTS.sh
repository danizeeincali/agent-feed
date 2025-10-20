#!/bin/bash
# Agent Config Page Removal - Test Runner Script
# This script runs all test suites for the config page removal

set -e  # Exit on error

echo "========================================"
echo "Agent Config Page Removal - Test Runner"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results
UNIT_TESTS_PASSED=false
E2E_TESTS_PASSED=false
REGRESSION_TESTS_PASSED=false

echo "${YELLOW}1. Running Unit Tests...${NC}"
echo "--------------------------------------"
cd /workspaces/agent-feed/frontend
if npm run test -- src/tests/unit/config-removal.test.tsx --run; then
  echo "${GREEN}✓ Unit tests completed${NC}"
  UNIT_TESTS_PASSED=true
else
  echo "${RED}✗ Unit tests have failures (expected before removal)${NC}"
fi
echo ""

echo "${YELLOW}2. Checking if app is running...${NC}"
echo "--------------------------------------"
if curl -s http://localhost:5173 > /dev/null; then
  echo "${GREEN}✓ App is running on http://localhost:5173${NC}"

  echo ""
  echo "${YELLOW}3. Running E2E Validation Tests...${NC}"
  echo "--------------------------------------"
  cd /workspaces/agent-feed
  if npx playwright test tests/e2e/config-removal-validation.spec.ts --reporter=list; then
    echo "${GREEN}✓ E2E validation tests completed${NC}"
    E2E_TESTS_PASSED=true
  else
    echo "${RED}✗ E2E validation tests have failures${NC}"
  fi

  echo ""
  echo "${YELLOW}4. Running Regression Tests...${NC}"
  echo "--------------------------------------"
  if npx playwright test tests/e2e/config-removal-regression.spec.ts --reporter=list; then
    echo "${GREEN}✓ Regression tests completed${NC}"
    REGRESSION_TESTS_PASSED=true
  else
    echo "${RED}✗ Regression tests have failures${NC}"
  fi

else
  echo "${RED}✗ App is not running!${NC}"
  echo "Please start the app first: npm run dev"
  echo "Then run this script again."
  exit 1
fi

echo ""
echo "========================================"
echo "Test Summary"
echo "========================================"
echo ""

if [ "$UNIT_TESTS_PASSED" = true ]; then
  echo "${GREEN}✓ Unit Tests: PASSED${NC}"
else
  echo "${RED}✗ Unit Tests: FAILED (expected before removal)${NC}"
fi

if [ "$E2E_TESTS_PASSED" = true ]; then
  echo "${GREEN}✓ E2E Tests: PASSED${NC}"
else
  echo "${RED}✗ E2E Tests: FAILED${NC}"
fi

if [ "$REGRESSION_TESTS_PASSED" = true ]; then
  echo "${GREEN}✓ Regression Tests: PASSED${NC}"
else
  echo "${RED}✗ Regression Tests: FAILED${NC}"
fi

echo ""
echo "Screenshots saved to: /workspaces/agent-feed/tests/e2e/screenshots/config-removal/"
echo ""

if [ "$UNIT_TESTS_PASSED" = true ] && [ "$E2E_TESTS_PASSED" = true ] && [ "$REGRESSION_TESTS_PASSED" = true ]; then
  echo "${GREEN}✓✓✓ ALL TESTS PASSED! Config removal was successful!${NC}"
  exit 0
else
  echo "${YELLOW}⚠ Some tests failed. Review the report above.${NC}"
  echo "Note: Failures are EXPECTED before removal, PASS after removal."
  exit 1
fi
