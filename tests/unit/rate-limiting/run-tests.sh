#!/bin/bash

# Rate Limiting TDD Test Suite Runner
# Comprehensive testing script for rate limiting functionality

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test directory
TEST_DIR="/workspaces/agent-feed/tests/unit/rate-limiting"
PROJECT_ROOT="/workspaces/agent-feed"

echo -e "${BLUE}🧪 Rate Limiting TDD Test Suite${NC}"
echo -e "${BLUE}==================================${NC}"
echo ""

# Change to project root
cd "$PROJECT_ROOT"

# Check if required dependencies are installed
echo -e "${YELLOW}📋 Checking dependencies...${NC}"
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is required but not installed${NC}"
    exit 1
fi

if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    npm install
fi

echo -e "${GREEN}✅ Dependencies OK${NC}"
echo ""

# Function to run a specific test file
run_test_file() {
    local test_file=$1
    local description=$2
    
    echo -e "${BLUE}🔍 Running: ${description}${NC}"
    echo -e "${BLUE}File: ${test_file}${NC}"
    echo ""
    
    if npm test -- "$TEST_DIR/$test_file" --verbose; then
        echo -e "${GREEN}✅ ${description} - PASSED${NC}"
        return 0
    else
        echo -e "${RED}❌ ${description} - FAILED (Expected for current implementation)${NC}"
        return 1
    fi
}

# Track test results
TOTAL_TESTS=4
PASSED_TESTS=0

echo -e "${YELLOW}🚀 Starting Rate Limiting Tests...${NC}"
echo -e "${YELLOW}Note: Some tests are EXPECTED to FAIL with current broken implementation${NC}"
echo ""

# Test 1: Render Behavior Tests
echo -e "${BLUE}===========================================${NC}"
echo -e "${BLUE} TEST 1: RENDER BEHAVIOR (Critical Bug)${NC}"
echo -e "${BLUE}===========================================${NC}"
if run_test_file "rate-limit-render-behavior.test.tsx" "Render Behavior Tests"; then
    ((PASSED_TESTS++))
fi
echo ""

# Test 2: State Management Tests  
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE} TEST 2: STATE MANAGEMENT${NC}"
echo -e "${BLUE}========================================${NC}"
if run_test_file "rate-limit-state-management.test.tsx" "State Management Tests"; then
    ((PASSED_TESTS++))
fi
echo ""

# Test 3: Integration Tests
echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE} TEST 3: INTEGRATION (User Flows)${NC}"
echo -e "${BLUE}======================================${NC}"
if run_test_file "rate-limit-integration.test.tsx" "Integration Tests"; then
    ((PASSED_TESTS++))
fi
echo ""

# Test 4: Performance Tests
echo -e "${BLUE}====================================${NC}"
echo -e "${BLUE} TEST 4: PERFORMANCE${NC}"
echo -e "${BLUE}====================================${NC}"
if run_test_file "rate-limit-performance.test.tsx" "Performance Tests"; then
    ((PASSED_TESTS++))
fi
echo ""

# Summary
echo -e "${BLUE}==============================================${NC}"
echo -e "${BLUE} RATE LIMITING TEST SUITE SUMMARY${NC}"
echo -e "${BLUE}==============================================${NC}"
echo ""

if [ $PASSED_TESTS -eq $TOTAL_TESTS ]; then
    echo -e "${GREEN}🎉 ALL TESTS PASSED (${PASSED_TESTS}/${TOTAL_TESTS})${NC}"
    echo -e "${GREEN}✅ Rate limiting implementation is working correctly!${NC}"
    echo ""
    echo -e "${GREEN}✅ Buttons available on page load${NC}"
    echo -e "${GREEN}✅ Rate limiting only on user interactions${NC}"
    echo -e "${GREEN}✅ No render-time side effects${NC}"
    echo -e "${GREEN}✅ Optimal performance characteristics${NC}"
    echo -e "${GREEN}✅ Proper state isolation${NC}"
else
    echo -e "${YELLOW}⚠️  SOME TESTS FAILED (${PASSED_TESTS}/${TOTAL_TESTS} passed)${NC}"
    echo -e "${YELLOW}This is EXPECTED with the current implementation${NC}"
    echo ""
    echo -e "${RED}🚨 CRITICAL BUGS DETECTED:${NC}"
    echo -e "${RED}❌ Buttons disabled on page load${NC}"
    echo -e "${RED}❌ Rate limiting during component renders${NC}"
    echo -e "${RED}❌ Performance overhead from render-time checks${NC}"
    echo -e "${RED}❌ State management issues${NC}"
    echo ""
    echo -e "${YELLOW}🔧 FIXES NEEDED:${NC}"
    echo -e "${YELLOW}1. Remove checkRateLimit() from render (line 252 in ClaudeInstanceButtons.tsx)${NC}"
    echo -e "${YELLOW}2. Only check rate limits in event handlers${NC}"
    echo -e "${YELLOW}3. Separate rate limit checking (pure) from recording (side effect)${NC}"
    echo -e "${YELLOW}4. Add user-driven rate limit state management${NC}"
    echo -e "${YELLOW}5. Optimize performance by removing render-time computations${NC}"
fi

echo ""
echo -e "${BLUE}📊 DETAILED ANALYSIS:${NC}"
echo ""

if [ $PASSED_TESTS -lt $TOTAL_TESTS ]; then
    echo -e "${RED}PRIMARY BUG:${NC}"
    echo -e "${RED}In ClaudeInstanceButtons.tsx line 252:${NC}"
    echo -e "${RED}const isDisabled = loading || isDebounced || checkRateLimit(); // ❌ PROBLEMATIC${NC}"
    echo ""
    echo -e "${YELLOW}IMPACT:${NC}"
    echo -e "${YELLOW}• Buttons are disabled immediately on page load${NC}"
    echo -e "${YELLOW}• Poor user experience - users can't interact with fresh pages${NC}"
    echo -e "${YELLOW}• Rate limiting triggers during renders, not user actions${NC}"
    echo -e "${YELLOW}• Performance degradation from unnecessary computations${NC}"
    echo ""
    echo -e "${GREEN}CORRECT APPROACH:${NC}"
    echo -e "${GREEN}• Check rate limits only in onClick handlers${NC}"
    echo -e "${GREEN}• Use separate state for user-driven rate limiting${NC}"
    echo -e "${GREEN}• Keep rate limit checking pure (no side effects)${NC}"
    echo -e "${GREEN}• Preserve rate limit state across component lifecycle${NC}"
fi

echo ""
echo -e "${BLUE}📁 TEST FILES LOCATION:${NC}"
echo -e "${BLUE}${TEST_DIR}${NC}"
echo ""
echo -e "${BLUE}📖 For detailed information, see:${NC}"
echo -e "${BLUE}${TEST_DIR}/README.md${NC}"
echo ""

# Instructions for fixing
if [ $PASSED_TESTS -lt $TOTAL_TESTS ]; then
    echo -e "${YELLOW}🛠️  TO FIX THE ISSUES:${NC}"
    echo ""
    echo -e "${YELLOW}1. Edit ClaudeInstanceButtons.tsx:${NC}"
    echo -e "   ${YELLOW}Replace:${NC} const isDisabled = loading || isDebounced || checkRateLimit();"
    echo -e "   ${YELLOW}With:${NC}    const isDisabled = loading || isDebounced || isUserRateLimited;"
    echo ""
    echo -e "${YELLOW}2. Add user rate limit state:${NC}"
    echo -e "   ${YELLOW}const [isUserRateLimited, setIsUserRateLimited] = useState(false);${NC}"
    echo ""
    echo -e "${YELLOW}3. Move rate limit checks to event handlers:${NC}"
    echo -e "   ${YELLOW}const handleClick = () => {${NC}"
    echo -e "   ${YELLOW}  if (checkRateLimit()) {${NC}"
    echo -e "   ${YELLOW}    setIsUserRateLimited(true);${NC}"
    echo -e "   ${YELLOW}    return;${NC}"
    echo -e "   ${YELLOW}  }${NC}"
    echo -e "   ${YELLOW}  // ... rest of click handler${NC}"
    echo -e "   ${YELLOW}};${NC}"
    echo ""
    echo -e "${YELLOW}4. Run tests again to verify fixes:${NC}"
    echo -e "   ${YELLOW}./run-tests.sh${NC}"
    echo ""
fi

echo -e "${BLUE}✨ Rate Limiting TDD Test Suite Complete${NC}"

# Exit with appropriate code
if [ $PASSED_TESTS -eq $TOTAL_TESTS ]; then
    exit 0
else
    exit 1
fi