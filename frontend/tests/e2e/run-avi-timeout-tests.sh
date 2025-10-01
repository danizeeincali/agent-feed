#!/bin/bash

################################################################################
# Avi DM Chat Timeout Test Runner
#
# This script runs the comprehensive test suite for the Avi DM chat timeout fix
#
# Prerequisites:
# - Frontend dev server must be running on http://localhost:5173
# - Backend API server must be running on http://localhost:3001
# - Real Claude Code SDK must be configured
#
# Usage:
#   ./run-avi-timeout-tests.sh [test-type]
#
# Test types:
#   unit        - Run unit tests only
#   integration - Run integration tests only
#   e2e         - Run E2E tests only
#   all         - Run all tests (default)
################################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test type
TEST_TYPE="${1:-all}"

# Directories
FRONTEND_DIR="/workspaces/agent-feed/frontend"
TEST_DIR="$FRONTEND_DIR/tests/e2e"

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  Avi DM Chat Timeout Test Suite${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Check prerequisites
check_prerequisites() {
    echo -e "${YELLOW}Checking prerequisites...${NC}"

    # Check if frontend dev server is running
    if ! curl -s http://localhost:5173 > /dev/null 2>&1; then
        echo -e "${RED}Error: Frontend dev server is not running on http://localhost:5173${NC}"
        echo -e "${YELLOW}Start it with: cd $FRONTEND_DIR && npm run dev${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Frontend dev server is running${NC}"

    # Check if backend API server is running
    if ! curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
        echo -e "${YELLOW}Warning: Backend API server may not be running on http://localhost:3001${NC}"
        echo -e "${YELLOW}Start it with: cd /workspaces/agent-feed/api-server && npm start${NC}"
    else
        echo -e "${GREEN}✓ Backend API server is running${NC}"
    fi

    echo ""
}

# Run unit tests
run_unit_tests() {
    echo -e "${BLUE}Running Unit Tests...${NC}"
    cd "$FRONTEND_DIR"

    npx vitest run src/tests/unit/AviDMTimeoutUnit.test.tsx --reporter=verbose

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Unit tests passed${NC}"
    else
        echo -e "${RED}✗ Unit tests failed${NC}"
        exit 1
    fi
    echo ""
}

# Run integration tests
run_integration_tests() {
    echo -e "${BLUE}Running Integration Tests...${NC}"
    cd "$FRONTEND_DIR"

    npx vitest run src/tests/integration/AviDMTimeout.test.tsx --reporter=verbose

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Integration tests passed${NC}"
    else
        echo -e "${RED}✗ Integration tests failed${NC}"
        exit 1
    fi
    echo ""
}

# Run E2E tests
run_e2e_tests() {
    echo -e "${BLUE}Running E2E Tests with Playwright...${NC}"
    cd "$TEST_DIR"

    npx playwright test avi-dm-timeout.spec.ts --config=playwright.config.avi-timeout.ts

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ E2E tests passed${NC}"
    else
        echo -e "${RED}✗ E2E tests failed${NC}"
        exit 1
    fi
    echo ""
}

# Main execution
check_prerequisites

case "$TEST_TYPE" in
    unit)
        run_unit_tests
        ;;
    integration)
        run_integration_tests
        ;;
    e2e)
        run_e2e_tests
        ;;
    all)
        run_unit_tests
        run_integration_tests
        run_e2e_tests
        ;;
    *)
        echo -e "${RED}Invalid test type: $TEST_TYPE${NC}"
        echo "Usage: $0 [unit|integration|e2e|all]"
        exit 1
        ;;
esac

echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}  All tests passed! ✓${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo -e "${YELLOW}Test Results Summary:${NC}"
echo -e "  - Unit tests: ${GREEN}✓${NC}"
echo -e "  - Integration tests: ${GREEN}✓${NC}"
echo -e "  - E2E tests: ${GREEN}✓${NC}"
echo ""
echo -e "${BLUE}View detailed reports:${NC}"
echo -e "  - HTML Report: ${FRONTEND_DIR}/tests/e2e/test-results/avi-timeout-report/index.html"
echo -e "  - JSON Results: ${FRONTEND_DIR}/tests/e2e/test-results/avi-timeout-results.json"
echo ""
