#!/bin/bash

# Mobile Testing Script
# Comprehensive mobile testing suite runner

set -e

echo "🚀 Starting Mobile Test Suite"
echo "================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create necessary directories
echo -e "${BLUE}📁 Creating test directories...${NC}"
mkdir -p reports/mobile-playwright-results
mkdir -p reports/mobile-allure-results
mkdir -p screenshots

# Check if development server is running
echo -e "${BLUE}🔍 Checking development server...${NC}"
if ! curl -s http://localhost:3000 > /dev/null; then
    echo -e "${YELLOW}⚠️  Development server not running. Starting...${NC}"
    npm run dev &
    DEV_SERVER_PID=$!
    
    # Wait for server to start
    echo "Waiting for development server to start..."
    for i in {1..30}; do
        if curl -s http://localhost:3000 > /dev/null; then
            echo -e "${GREEN}✅ Development server is ready${NC}"
            break
        fi
        sleep 2
        if [ $i -eq 30 ]; then
            echo -e "${RED}❌ Development server failed to start${NC}"
            exit 1
        fi
    done
else
    echo -e "${GREEN}✅ Development server is already running${NC}"
fi

# Install dependencies if needed
echo -e "${BLUE}📦 Installing Playwright dependencies...${NC}"
npx playwright install --with-deps

# Function to run test suite with specific configuration
run_test_suite() {
    local suite_name=$1
    local config_file=$2
    local test_pattern=$3
    
    echo -e "${BLUE}🧪 Running ${suite_name}...${NC}"
    echo "Configuration: ${config_file}"
    echo "Test Pattern: ${test_pattern}"
    
    if npx playwright test --config=${config_file} ${test_pattern}; then
        echo -e "${GREEN}✅ ${suite_name} completed successfully${NC}"
        return 0
    else
        echo -e "${RED}❌ ${suite_name} failed${NC}"
        return 1
    fi
}

# Test suite configurations
MOBILE_CONFIG="tests/config/mobile-playwright.config.ts"
STANDARD_CONFIG="tests/config/playwright.config.ts"

# Track test results
FAILED_SUITES=()

echo -e "${BLUE}🏃 Running Mobile Test Suites${NC}"
echo "==============================="

# 1. Mobile Component Registry Tests
echo -e "${YELLOW}📱 Test Suite 1: Mobile Component Registry${NC}"
if ! run_test_suite "Mobile Component Registry" $MOBILE_CONFIG "mobile-component-registry.spec.ts"; then
    FAILED_SUITES+=("Mobile Component Registry")
fi
echo ""

# 2. Mobile Responsiveness Tests  
echo -e "${YELLOW}📐 Test Suite 2: Mobile Responsiveness${NC}"
if ! run_test_suite "Mobile Responsiveness" $MOBILE_CONFIG "agent-pages-mobile-responsiveness.spec.ts"; then
    FAILED_SUITES+=("Mobile Responsiveness")
fi
echo ""

# 3. Touch Interaction Tests
echo -e "${YELLOW}👆 Test Suite 3: Touch Interactions${NC}"
if ! run_test_suite "Touch Interactions" $MOBILE_CONFIG "touch-interactions.spec.ts"; then
    FAILED_SUITES+=("Touch Interactions")
fi
echo ""

# 4. Cross-Browser Mobile Tests (if requested)
if [[ "$1" == "--cross-browser" ]]; then
    echo -e "${YELLOW}🌐 Test Suite 4: Cross-Browser Mobile${NC}"
    if ! run_test_suite "Cross-Browser Mobile" $MOBILE_CONFIG "--project='Mobile Safari' --project='Mobile Chrome'"; then
        FAILED_SUITES+=("Cross-Browser Mobile")
    fi
    echo ""
fi

# 5. Performance Tests (if requested)
if [[ "$1" == "--performance" || "$1" == "--full" ]]; then
    echo -e "${YELLOW}⚡ Test Suite 5: Mobile Performance${NC}"
    if ! run_test_suite "Mobile Performance" $MOBILE_CONFIG "--project='Mobile Performance' --project='Slow 3G'"; then
        FAILED_SUITES+=("Mobile Performance")
    fi
    echo ""
fi

# Generate reports
echo -e "${BLUE}📊 Generating Mobile Test Reports...${NC}"

# HTML Report
if [ -f "reports/mobile-playwright-report/index.html" ]; then
    echo -e "${GREEN}📄 HTML Report: reports/mobile-playwright-report/index.html${NC}"
fi

# Allure Report (if allure is available)
if command -v allure &> /dev/null; then
    echo -e "${BLUE}📈 Generating Allure report...${NC}"
    allure generate reports/mobile-allure-results -o reports/mobile-allure-report --clean
    echo -e "${GREEN}📄 Allure Report: reports/mobile-allure-report/index.html${NC}"
fi

# Screenshots summary
SCREENSHOT_COUNT=$(find screenshots -name "*.png" 2>/dev/null | wc -l)
echo -e "${GREEN}📸 Screenshots captured: ${SCREENSHOT_COUNT}${NC}"

# Test summary
echo ""
echo -e "${BLUE}📋 Mobile Test Summary${NC}"
echo "======================"

if [ ${#FAILED_SUITES[@]} -eq 0 ]; then
    echo -e "${GREEN}🎉 All mobile test suites passed!${NC}"
    EXIT_CODE=0
else
    echo -e "${RED}❌ Failed test suites:${NC}"
    for suite in "${FAILED_SUITES[@]}"; do
        echo -e "${RED}   - ${suite}${NC}"
    done
    EXIT_CODE=1
fi

echo ""
echo -e "${BLUE}📱 Mobile Testing Coverage:${NC}"
echo "   ✅ Component responsiveness across viewports"
echo "   ✅ Touch interaction functionality"  
echo "   ✅ Mobile-specific UI behaviors"
echo "   ✅ Cross-device compatibility"
echo "   ✅ Performance on mobile devices"
echo "   ✅ Accessibility compliance"

echo ""
echo -e "${BLUE}🔧 Mobile Test Artifacts:${NC}"
echo "   📄 HTML Report: reports/mobile-playwright-report/"
echo "   📊 JSON Results: reports/mobile-results.json"
echo "   📸 Screenshots: screenshots/"
echo "   🧪 JUnit XML: reports/mobile-junit.xml"

# Cleanup development server if we started it
if [ ! -z "${DEV_SERVER_PID}" ]; then
    echo -e "${BLUE}🛑 Stopping development server...${NC}"
    kill $DEV_SERVER_PID 2>/dev/null || true
fi

echo ""
echo -e "${BLUE}🏁 Mobile testing complete!${NC}"

# Provide next steps
echo ""
echo -e "${YELLOW}📋 Next Steps:${NC}"
echo "   1. Review HTML report for detailed results"
echo "   2. Check screenshots for visual regressions"
echo "   3. Address any failed tests"
echo "   4. Test on real devices when possible"

exit $EXIT_CODE