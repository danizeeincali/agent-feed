#!/bin/bash

# Metadata Bottom Spacing Test Suite Runner
# Tests the addition of mb-4 class to metadata line

set -e

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║   Metadata Bottom Spacing - Comprehensive TDD Test Suite     ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo "Testing Change: Added mb-4 class to metadata line (line 803)"
echo "Location: frontend/src/components/RealSocialMediaFeed.tsx"
echo "Class: pl-14 flex items-center space-x-6 mt-4 mb-4"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Change to project root
cd /workspaces/agent-feed

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Phase 1: Unit Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ -f "frontend/src/tests/unit/metadata-bottom-spacing.test.tsx" ]; then
    echo -e "${BLUE}Running Unit Tests...${NC}"
    echo ""

    cd frontend

    # Run Jest tests
    if npm run test -- --testPathPattern=metadata-bottom-spacing.test.tsx --verbose --coverage 2>&1 | tee ../tests/metadata-spacing-unit-results.log; then
        echo -e "${GREEN}✓ Unit tests completed${NC}"
        UNIT_STATUS="PASS"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}✗ Unit tests failed${NC}"
        UNIT_STATUS="FAIL"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    cd ..
else
    echo -e "${RED}✗ Unit test file not found${NC}"
    UNIT_STATUS="MISSING"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Phase 2: Visual Regression Tests (Playwright)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ -f "tests/e2e/metadata-bottom-spacing.spec.ts" ]; then
    echo -e "${BLUE}Checking if API server is running...${NC}"

    # Check if server is running
    if curl -s http://localhost:5001/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ API server is running${NC}"
        SERVER_RUNNING=true
    else
        echo -e "${YELLOW}⚠ API server not running, starting it...${NC}"
        cd api-server
        npm start > ../tests/api-server.log 2>&1 &
        API_SERVER_PID=$!
        cd ..

        # Wait for server to start
        echo "Waiting for API server to start..."
        for i in {1..30}; do
            if curl -s http://localhost:5001/health > /dev/null 2>&1; then
                echo -e "${GREEN}✓ API server started${NC}"
                SERVER_RUNNING=true
                break
            fi
            sleep 1
        done

        if [ "$SERVER_RUNNING" != "true" ]; then
            echo -e "${RED}✗ Failed to start API server${NC}"
            exit 1
        fi
    fi

    echo ""
    echo -e "${BLUE}Checking if frontend is running...${NC}"

    # Check if frontend is running
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Frontend is running${NC}"
        FRONTEND_RUNNING=true
    else
        echo -e "${YELLOW}⚠ Frontend not running, starting it...${NC}"
        cd frontend
        npm run dev > ../tests/frontend.log 2>&1 &
        FRONTEND_PID=$!
        cd ..

        # Wait for frontend to start
        echo "Waiting for frontend to start..."
        for i in {1..60}; do
            if curl -s http://localhost:3000 > /dev/null 2>&1; then
                echo -e "${GREEN}✓ Frontend started${NC}"
                FRONTEND_RUNNING=true
                break
            fi
            sleep 1
        done

        if [ "$FRONTEND_RUNNING" != "true" ]; then
            echo -e "${RED}✗ Failed to start frontend${NC}"
            [ ! -z "$API_SERVER_PID" ] && kill $API_SERVER_PID
            [ ! -z "$FRONTEND_PID" ] && kill $FRONTEND_PID
            exit 1
        fi
    fi

    echo ""
    echo -e "${BLUE}Running Visual Regression Tests...${NC}"
    echo ""

    # Run Playwright tests
    if npx playwright test tests/e2e/metadata-bottom-spacing.spec.ts --reporter=html --reporter=list 2>&1 | tee tests/metadata-spacing-e2e-results.log; then
        echo -e "${GREEN}✓ Visual regression tests completed${NC}"
        E2E_STATUS="PASS"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}✗ Visual regression tests failed${NC}"
        E2E_STATUS="FAIL"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    # Cleanup if we started the servers
    if [ ! -z "$API_SERVER_PID" ]; then
        echo "Stopping API server..."
        kill $API_SERVER_PID
    fi

    if [ ! -z "$FRONTEND_PID" ]; then
        echo "Stopping frontend..."
        kill $FRONTEND_PID
    fi
else
    echo -e "${RED}✗ E2E test file not found${NC}"
    E2E_STATUS="MISSING"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Change Tested:"
echo "  ✓ Added mb-4 class to metadata line"
echo "  ✓ Location: RealSocialMediaFeed.tsx line 803"
echo "  ✓ Class: pl-14 flex items-center space-x-6 mt-4 mb-4"
echo ""
echo "Test Results:"
echo "  • Unit Tests:              $UNIT_STATUS"
echo "  • Visual Regression Tests: $E2E_STATUS"
echo ""
echo "Statistics:"
echo "  • Total Test Suites:  $TOTAL_TESTS"
echo "  • Passed:            $PASSED_TESTS"
echo "  • Failed:            $FAILED_TESTS"
echo ""

# Test Categories Covered
echo "Test Categories Covered:"
echo "  ✓ Metadata line class validation"
echo "  ✓ Visual spacing measurement (16px bottom, 16px top)"
echo "  ✓ Symmetric spacing verification"
echo "  ✓ Total spacing to divider (~44px)"
echo "  ✓ Dark mode compatibility"
echo "  ✓ Responsive design (mobile, tablet, desktop)"
echo "  ✓ Multiple posts consistency"
echo "  ✓ No layout shifts"
echo "  ✓ No console errors/warnings"
echo "  ✓ Divider relationship validation"
echo "  ✓ Visual regression screenshots"
echo "  ✓ Accessibility checks"
echo "  ✓ Performance validation"
echo ""

# Success Criteria
echo "Success Criteria:"
if [ "$UNIT_STATUS" = "PASS" ] && [ "$E2E_STATUS" = "PASS" ]; then
    echo -e "  ${GREEN}✓ All tests passed${NC}"
    echo -e "  ${GREEN}✓ Metadata line has both mt-4 and mb-4 classes${NC}"
    echo -e "  ${GREEN}✓ Bottom spacing is 16px${NC}"
    echo -e "  ${GREEN}✓ Visual spacing is symmetric${NC}"
    echo -e "  ${GREEN}✓ Divider has comfortable separation${NC}"
    echo -e "  ${GREEN}✓ No visual regressions detected${NC}"
    echo ""
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║             ✓ ALL TESTS PASSED SUCCESSFULLY              ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
    exit 0
else
    echo -e "  ${RED}✗ Some tests failed${NC}"
    echo ""
    echo -e "${RED}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║               ✗ TESTS FAILED - SEE LOGS                  ║${NC}"
    echo -e "${RED}╚═══════════════════════════════════════════════════════════╝${NC}"
    exit 1
fi
