#!/bin/bash

# Phase 3 Comprehensive Test Suite Runner
# Runs all 163+ tests for Phase 3 implementation

set -e

echo "======================================"
echo "Phase 3 Comprehensive Test Suite"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

echo -e "${BLUE}[1/4] Running Phase 3 Skills Unit Tests (55+ tests)...${NC}"
echo "--------------------------------------"
if npx jest tests/skills/phase3-skills.test.ts --verbose --no-coverage 2>&1 | tee /tmp/phase3-unit-tests.log; then
    UNIT_TESTS=$(grep -oP '\d+ tests? passed' /tmp/phase3-unit-tests.log | grep -oP '\d+' || echo "0")
    PASSED_TESTS=$((PASSED_TESTS + UNIT_TESTS))
    echo -e "${GREEN}✓ Unit tests passed: $UNIT_TESTS${NC}"
else
    echo -e "${RED}✗ Unit tests failed${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
echo ""

echo -e "${BLUE}[2/4] Running Phase 3 Integration Tests (33+ tests)...${NC}"
echo "--------------------------------------"
if npx jest tests/skills/phase3-integration.test.ts --verbose --no-coverage 2>&1 | tee /tmp/phase3-integration-tests.log; then
    INTEGRATION_TESTS=$(grep -oP '\d+ tests? passed' /tmp/phase3-integration-tests.log | grep -oP '\d+' || echo "0")
    PASSED_TESTS=$((PASSED_TESTS + INTEGRATION_TESTS))
    echo -e "${GREEN}✓ Integration tests passed: $INTEGRATION_TESTS${NC}"
else
    echo -e "${RED}✗ Integration tests failed${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
echo ""

echo -e "${BLUE}[3/4] Running Phase 3 Agent Config Tests (50+ tests)...${NC}"
echo "--------------------------------------"
if npx jest tests/skills/phase3-agent-configs.test.ts --verbose --no-coverage 2>&1 | tee /tmp/phase3-agent-tests.log; then
    AGENT_TESTS=$(grep -oP '\d+ tests? passed' /tmp/phase3-agent-tests.log | grep -oP '\d+' || echo "0")
    PASSED_TESTS=$((PASSED_TESTS + AGENT_TESTS))
    echo -e "${GREEN}✓ Agent config tests passed: $AGENT_TESTS${NC}"
else
    echo -e "${RED}✗ Agent config tests failed${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
echo ""

echo -e "${BLUE}[4/4] Running Phase 3 E2E Validation Tests (25+ tests)...${NC}"
echo "--------------------------------------"
if npx jest tests/e2e/phase3-skills-validation.spec.ts --verbose --no-coverage 2>&1 | tee /tmp/phase3-e2e-tests.log; then
    E2E_TESTS=$(grep -oP '\d+ tests? passed' /tmp/phase3-e2e-tests.log | grep -oP '\d+' || echo "0")
    PASSED_TESTS=$((PASSED_TESTS + E2E_TESTS))
    echo -e "${GREEN}✓ E2E tests passed: $E2E_TESTS${NC}"
else
    echo -e "${RED}✗ E2E tests failed${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
echo ""

# Generate summary
echo "======================================"
echo "Test Summary"
echo "======================================"
TOTAL_TESTS=$((UNIT_TESTS + INTEGRATION_TESTS + AGENT_TESTS + E2E_TESTS))
echo "Total tests run: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✓ All test suites passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some test suites failed${NC}"
    exit 1
fi
