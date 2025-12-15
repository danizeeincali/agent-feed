#!/bin/bash

# TDD Test Suite Runner: Meta Agent Removal
# London School (Mockist) Approach

set -e

echo "=================================================="
echo "Meta Agent Removal - TDD Test Suite"
echo "London School (Mockist) - Outside-In Testing"
echo "=================================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test execution
echo -e "${BLUE}Running Mock-Based Unit Tests...${NC}"
npm test -- tests/unit/meta-agent-removal.test.js --verbose --coverage --coverageDirectory=tests/coverage/meta-agent-removal

# Test result validation
if [ $? -eq 0 ]; then
  echo ""
  echo -e "${GREEN}✓ All tests passed!${NC}"
  echo ""
else
  echo ""
  echo -e "${RED}✗ Tests failed - Review output above${NC}"
  echo ""
  exit 1
fi

# Generate test report
echo -e "${BLUE}Generating Test Report...${NC}"
echo ""
echo "Test Coverage Summary:"
echo "======================"
npm test -- tests/unit/meta-agent-removal.test.js --coverage --coverageReporters=text-summary

echo ""
echo -e "${GREEN}Test suite execution complete!${NC}"
echo ""
echo "Test Results Location:"
echo "  - Coverage: tests/coverage/meta-agent-removal/"
echo "  - HTML Report: tests/coverage/meta-agent-removal/lcov-report/index.html"
echo ""
