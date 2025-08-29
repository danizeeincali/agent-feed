#!/bin/bash

# TDD London School: Claude Instance Duplication Test Runner
# 
# PURPOSE: Execute comprehensive test suite to reproduce and fix duplication bug
# APPROACH: Mock-driven outside-in testing with behavior verification

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test configuration
TEST_DIR="/workspaces/agent-feed/tests/tdd-london-school/claude-tripling-issue"
REPORT_DIR="$TEST_DIR/test-results"

echo -e "${BLUE}🧪 TDD London School: Claude Duplication Bug Test Suite${NC}"
echo "=============================================================="
echo "PURPOSE: Reproduce Claude instance duplication bug with failing tests"
echo "METHODOLOGY: Outside-in TDD with mock-driven development"
echo "EXPECTATION: Tests should FAIL initially, proving bug exists"
echo ""

# Change to test directory
cd "$TEST_DIR"

# Clean previous results
echo -e "${YELLOW}🧹 Cleaning previous test results...${NC}"
rm -rf test-results
mkdir -p test-results

# Check dependencies
echo -e "${BLUE}🔍 Checking test dependencies...${NC}"
if ! command -v npx &> /dev/null; then
    echo -e "${RED}❌ npx not found. Please install Node.js${NC}"
    exit 1
fi

if ! npx playwright --version &> /dev/null; then
    echo -e "${YELLOW}⚠️ Installing Playwright...${NC}"
    npx playwright install
fi

# Verify backend is running
echo -e "${BLUE}📡 Verifying backend services...${NC}"
if ! curl -s http://localhost:3000/api/health > /dev/null; then
    echo -e "${RED}❌ Backend not running on port 3000${NC}"
    echo "Please start the backend: cd /workspaces/agent-feed && node simple-backend.js"
    exit 1
fi

if ! curl -s http://localhost:5173 > /dev/null; then
    echo -e "${RED}❌ Frontend not running on port 5173${NC}"
    echo "Please start the frontend: cd /workspaces/agent-feed/frontend && npm run dev"
    exit 1
fi

echo -e "${GREEN}✅ Services are running${NC}"

# Run TDD London School tests
echo -e "${BLUE}🚀 Running TDD London School Duplication Tests...${NC}"
echo ""

# Test execution options
HEADED=${HEADED:-false}
DEBUG=${DEBUG:-false}
UI=${UI:-false}

if [ "$DEBUG" = "true" ]; then
    echo -e "${YELLOW}🐛 Running in debug mode...${NC}"
    npx playwright test --config=playwright.config.ts --debug
elif [ "$UI" = "true" ]; then
    echo -e "${YELLOW}🎨 Running with UI mode...${NC}"
    npx playwright test --config=playwright.config.ts --ui
elif [ "$HEADED" = "true" ]; then
    echo -e "${YELLOW}👀 Running in headed mode...${NC}"
    npx playwright test --config=playwright.config.ts --headed
else
    echo -e "${BLUE}🤖 Running in headless mode...${NC}"
    npx playwright test --config=playwright.config.ts
fi

# Check test results
TEST_EXIT_CODE=$?

echo ""
echo "=============================================================="

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ Tests PASSED - This indicates the duplication bug is FIXED!${NC}"
    echo -e "${YELLOW}⚠️ If this is unexpected, verify the test logic is correct${NC}"
else
    echo -e "${RED}❌ Tests FAILED - This proves the duplication bug exists!${NC}"
    echo -e "${BLUE}📝 This is EXPECTED behavior for reproducing the bug${NC}"
fi

echo ""
echo -e "${BLUE}📊 Test Results Analysis:${NC}"

# Generate results summary
if [ -f "test-results/results.json" ]; then
    echo "- Results file: test-results/results.json"
    
    # Extract key metrics from results
    TOTAL_TESTS=$(jq '.suites | map(.tests | length) | add' test-results/results.json 2>/dev/null || echo "unknown")
    FAILED_TESTS=$(jq '.suites | map(.tests | map(select(.outcome == "failed")) | length) | add' test-results/results.json 2>/dev/null || echo "unknown")
    
    echo "- Total tests: $TOTAL_TESTS"
    echo "- Failed tests: $FAILED_TESTS"
fi

if [ -f "test-results/html-report/index.html" ]; then
    echo "- HTML report: test-results/html-report/index.html"
    echo ""
    echo -e "${BLUE}💡 View detailed report:${NC}"
    echo "  npx playwright show-report test-results/html-report"
fi

# Show test artifacts
echo ""
echo -e "${BLUE}📁 Test Artifacts:${NC}"
if [ -d "test-results/artifacts" ]; then
    find test-results/artifacts -name "*.png" -o -name "*.webm" | head -5 | while read file; do
        echo "  - $file"
    done
fi

# TDD London School specific analysis
echo ""
echo -e "${BLUE}🎭 TDD London School Analysis:${NC}"

if [ -f "test-results/tdd-london-school-summary.json" ]; then
    echo "- Contract verification summary: test-results/tdd-london-school-summary.json"
    
    # Extract contract violations
    if command -v jq &> /dev/null; then
        CONTRACTS=$(jq -r '.contractDefinitions | keys[]' test-results/tdd-london-school-summary.json 2>/dev/null)
        echo "- Tested contracts: $CONTRACTS"
    fi
fi

# Show next steps
echo ""
echo -e "${BLUE}🔄 Next Steps (TDD Cycle):${NC}"
echo "1. ✅ RED: Tests are failing (proving bug exists)"
echo "2. 🔧 GREEN: Fix the implementation to make tests pass"
echo "3. ♻️ REFACTOR: Clean up code while keeping tests passing"
echo ""

if [ $TEST_EXIT_CODE -ne 0 ]; then
    echo -e "${YELLOW}🎯 Bug Reproduction Successful!${NC}"
    echo "The failing tests prove the duplication bug exists."
    echo "Now you can proceed to fix the implementation."
    echo ""
    echo -e "${BLUE}🔧 To fix the bug, focus on:${NC}"
    echo "- Message deduplication in WebSocket handling"
    echo "- Single instance creation logic"
    echo "- Event handler cleanup"
    echo "- DOM update deduplication"
else
    echo -e "${GREEN}🎉 Bug Fix Verification Successful!${NC}"
    echo "The passing tests prove the duplication bug is fixed."
fi

# Preserve exit code for CI/CD
exit $TEST_EXIT_CODE