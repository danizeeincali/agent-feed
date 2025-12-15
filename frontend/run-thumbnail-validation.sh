#!/bin/bash

# Comprehensive Thumbnail-Summary Browser Validation Test Runner
# This script runs the complete browser validation test suite for thumbnail-summary preview functionality

set -e

echo "🚀 Starting Comprehensive Thumbnail-Summary Browser Validation"
echo "============================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if servers are running
echo -e "${BLUE}📋 Pre-flight checks...${NC}"

# Check backend
if curl -s http://localhost:3000/api/health > /dev/null; then
    echo -e "${GREEN}✅ Backend server running (port 3000)${NC}"
else
    echo -e "${RED}❌ Backend server not running on port 3000${NC}"
    echo "Please start the backend with: node simple-backend.js"
    exit 1
fi

# Check frontend
if curl -s http://localhost:5173 > /dev/null; then
    echo -e "${GREEN}✅ Frontend server running (port 5173)${NC}"
else
    echo -e "${RED}❌ Frontend server not running on port 5173${NC}"
    echo "Please start the frontend with: npm run dev"
    exit 1
fi

# Check Playwright browsers
echo -e "${BLUE}🎭 Checking Playwright browser installations...${NC}"
if npx playwright --version > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Playwright installed${NC}"
    
    # Install browsers if needed
    echo -e "${YELLOW}📦 Ensuring browsers are installed...${NC}"
    npx playwright install --with-deps
else
    echo -e "${RED}❌ Playwright not found${NC}"
    echo "Please install Playwright: npm install -D @playwright/test"
    exit 1
fi

# Create test reports directory
mkdir -p test-results
mkdir -p playwright-report-thumbnail-validation

echo ""
echo -e "${BLUE}🎯 Running Thumbnail-Summary Browser Validation Tests${NC}"
echo "============================================================="

# Test execution phases
PHASES=(
    "setup:Setup test data with real URLs"
    "chromium-desktop:Chrome Desktop Browser Testing"
    "firefox-desktop:Firefox Desktop Browser Testing" 
    "webkit-desktop:Safari Desktop Browser Testing"
    "ipad:iPad Tablet Testing"
    "mobile-chrome:Mobile Chrome Testing"
    "mobile-safari:Mobile Safari Testing"
    "accessibility-chrome:Accessibility Testing"
    "performance-chrome:Performance Testing"
)

TOTAL_PHASES=${#PHASES[@]}
CURRENT_PHASE=0

# Function to run a specific test phase
run_phase() {
    local phase_config="$1"
    local phase_name="$2"
    
    CURRENT_PHASE=$((CURRENT_PHASE + 1))
    
    echo ""
    echo -e "${BLUE}📱 Phase ${CURRENT_PHASE}/${TOTAL_PHASES}: ${phase_name}${NC}"
    echo "-----------------------------------------------------------"
    
    if npx playwright test --config=playwright-thumbnail-browser-validation.config.ts --project="$phase_config" --reporter=line; then
        echo -e "${GREEN}✅ ${phase_name} - PASSED${NC}"
        return 0
    else
        echo -e "${RED}❌ ${phase_name} - FAILED${NC}"
        return 1
    fi
}

# Track results
PASSED_PHASES=()
FAILED_PHASES=()

# Run all test phases
for phase_info in "${PHASES[@]}"; do
    IFS=':' read -r phase_config phase_name <<< "$phase_info"
    
    if run_phase "$phase_config" "$phase_name"; then
        PASSED_PHASES+=("$phase_name")
    else
        FAILED_PHASES+=("$phase_name")
        
        # Ask user if they want to continue on failure
        echo ""
        echo -e "${YELLOW}⚠️ Test phase failed. Continue with remaining tests? (y/n)${NC}"
        read -r continue_choice
        if [[ $continue_choice != "y" && $continue_choice != "Y" ]]; then
            echo -e "${YELLOW}🛑 Test execution stopped by user${NC}"
            break
        fi
    fi
done

echo ""
echo "============================================================="
echo -e "${BLUE}📊 THUMBNAIL-SUMMARY BROWSER VALIDATION RESULTS${NC}"
echo "============================================================="

# Summary
echo -e "${GREEN}✅ PASSED (${#PASSED_PHASES[@]}):${NC}"
for phase in "${PASSED_PHASES[@]}"; do
    echo "   - $phase"
done

if [ ${#FAILED_PHASES[@]} -gt 0 ]; then
    echo ""
    echo -e "${RED}❌ FAILED (${#FAILED_PHASES[@]}):${NC}"
    for phase in "${FAILED_PHASES[@]}"; do
        echo "   - $phase"
    done
fi

# Generate comprehensive report
echo ""
echo -e "${BLUE}📋 Generating comprehensive test report...${NC}"

# Run full report generation
npx playwright test --config=playwright-thumbnail-browser-validation.config.ts --reporter=html || true

echo ""
echo -e "${BLUE}📁 Test artifacts generated:${NC}"
echo "   - HTML Report: playwright-report-thumbnail-validation/index.html"
echo "   - JSON Results: test-results/thumbnail-validation-results.json"
echo "   - JUnit XML: test-results/thumbnail-validation-junit.xml"
echo "   - Screenshots: test-results/ (for failed tests)"
echo "   - Videos: test-results/ (for failed tests)"

# Open report if available
if command -v xdg-open > /dev/null; then
    echo ""
    echo -e "${YELLOW}🌐 Opening test report in browser...${NC}"
    xdg-open playwright-report-thumbnail-validation/index.html 2>/dev/null || true
fi

# Final status
echo ""
if [ ${#FAILED_PHASES[@]} -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL THUMBNAIL-SUMMARY BROWSER VALIDATION TESTS PASSED!${NC}"
    echo ""
    echo -e "${GREEN}✅ VALIDATION SUMMARY:${NC}"
    echo "   ✓ Real YouTube URLs display correctly with thumbnail-summary layout"
    echo "   ✓ Video auto-loop functionality works in expanded mode"
    echo "   ✓ Article URLs show proper thumbnail-left, content-right layout"
    echo "   ✓ No www. truncation occurs in site names"
    echo "   ✓ Responsive layout works across all viewport sizes"
    echo "   ✓ All preview data loads without truncation"
    echo "   ✓ Accessibility compliance verified"
    echo "   ✓ Cross-browser compatibility confirmed"
    echo "   ✓ Performance meets established budgets"
    echo "   ✓ Real-time functionality validated with live data"
    echo ""
    echo -e "${BLUE}🎯 The thumbnail-summary preview functionality is production-ready!${NC}"
    exit 0
else
    echo -e "${RED}⚠️ Some tests failed. Please review the reports and fix issues.${NC}"
    echo ""
    echo -e "${YELLOW}🔧 Common troubleshooting steps:${NC}"
    echo "   1. Ensure both backend (port 3000) and frontend (port 5173) are running"
    echo "   2. Check that test posts with real URLs exist (run setup phase separately)"
    echo "   3. Verify link preview API is working: curl 'http://localhost:3000/api/v1/link-preview?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DdQw4w9WgXcQ'"
    echo "   4. Check browser compatibility and update if needed"
    echo "   5. Review test logs in playwright-report-thumbnail-validation/"
    exit 1
fi