#!/bin/bash

##############################################################################
# QUICK VERIFICATION SCRIPT
# Validates that tabs and anchor tests are properly set up
##############################################################################

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}═══════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  TABS & ANCHOR TEST VERIFICATION${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════${NC}"
echo ""

# Check test file exists
echo -e "${YELLOW}Checking test file...${NC}"
if [ -f "tests/e2e/tabs-and-anchor-validation.spec.ts" ]; then
    LINES=$(wc -l < tests/e2e/tabs-and-anchor-validation.spec.ts)
    TESTS=$(grep -c "^  test('" tests/e2e/tabs-and-anchor-validation.spec.ts || echo "0")
    echo -e "${GREEN}✓ Test file exists${NC}"
    echo -e "  Lines: ${GREEN}${LINES}${NC}"
    echo -e "  Tests: ${GREEN}${TESTS}${NC}"
else
    echo -e "${RED}✗ Test file not found${NC}"
    exit 1
fi
echo ""

# Check runner script exists and is executable
echo -e "${YELLOW}Checking runner script...${NC}"
if [ -x "tests/e2e/run-tabs-anchor-tests.sh" ]; then
    echo -e "${GREEN}✓ Runner script exists and is executable${NC}"
else
    echo -e "${YELLOW}⚠ Making script executable...${NC}"
    chmod +x tests/e2e/run-tabs-anchor-tests.sh
    echo -e "${GREEN}✓ Runner script is now executable${NC}"
fi
echo ""

# Check documentation exists
echo -e "${YELLOW}Checking documentation...${NC}"
if [ -f "tests/e2e/TABS_AND_ANCHOR_VALIDATION_README.md" ]; then
    echo -e "${GREEN}✓ README exists${NC}"
else
    echo -e "${RED}✗ README not found${NC}"
fi

if [ -f "tests/e2e/TABS_ANCHOR_TEST_SUMMARY.md" ]; then
    echo -e "${GREEN}✓ Summary exists${NC}"
else
    echo -e "${RED}✗ Summary not found${NC}"
fi
echo ""

# List test categories
echo -e "${YELLOW}Test Coverage:${NC}"
echo -e "${GREEN}Tabs Component Tests (8):${NC}"
grep -A 1 "TEST [1-8]:" tests/e2e/tabs-and-anchor-validation.spec.ts | grep "test('" | sed 's/.*test(/  -/' | sed "s/',.*$//" || true
echo ""

echo -e "${GREEN}Anchor Navigation Tests (8):${NC}"
grep -A 1 "TEST \(9\|1[0-6]\):" tests/e2e/tabs-and-anchor-validation.spec.ts | grep "test('" | sed 's/.*test(/  -/' | sed "s/',.*$//" || true
echo ""

echo -e "${GREEN}Combined Scenario Tests (5):${NC}"
grep -A 1 "TEST \(1[7-9]\|2[0-1]\):" tests/e2e/tabs-and-anchor-validation.spec.ts | grep "test('" | sed 's/.*test(/  -/' | sed "s/',.*$//" || true
echo ""

echo -e "${BLUE}═══════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ All files verified!${NC}"
echo ""
echo -e "${BLUE}To run tests:${NC}"
echo -e "  ${GREEN}./tests/e2e/run-tabs-anchor-tests.sh${NC}"
echo ""
echo -e "${BLUE}To view documentation:${NC}"
echo -e "  ${GREEN}cat tests/e2e/TABS_AND_ANCHOR_VALIDATION_README.md${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════${NC}"
