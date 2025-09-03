#!/bin/bash

# Comprehensive E2E Testing Suite for Sharing Removal Validation
# This script executes all test categories until 100% pass rate is achieved

set -e

echo "🚀 Starting Comprehensive Sharing Removal E2E Test Suite"
echo "======================================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
MAX_RETRIES=3
RETRY_COUNT=0
TEST_PASSED=false
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
REPORT_DIR="./e2e-sharing-removal/reports"

# Create reports directory
mkdir -p "$REPORT_DIR"

echo -e "${BLUE}📋 Test Suite Configuration:${NC}"
echo "   - Max Retries: $MAX_RETRIES"
echo "   - Report Directory: $REPORT_DIR"
echo "   - Timestamp: $TIMESTAMP"
echo ""

# Function to run tests with retry logic
run_test_category() {
    local category=$1
    local test_file=$2
    local retry_count=0
    local max_retries=2
    
    echo -e "${BLUE}🧪 Running $category Tests${NC}"
    echo "----------------------------------------"
    
    while [ $retry_count -lt $max_retries ]; do
        if npx playwright test "$test_file" --reporter=html --output="$REPORT_DIR/${category,,}-report"; then
            echo -e "${GREEN}✅ $category Tests PASSED${NC}"
            return 0
        else
            retry_count=$((retry_count + 1))
            echo -e "${YELLOW}⚠️  $category Tests FAILED - Attempt $retry_count/$max_retries${NC}"
            
            if [ $retry_count -lt $max_retries ]; then
                echo "   Waiting 5 seconds before retry..."
                sleep 5
            fi
        fi
    done
    
    echo -e "${RED}❌ $category Tests FAILED after $max_retries attempts${NC}"
    return 1
}

# Function to check server health
check_server_health() {
    local server_name=$1
    local server_url=$2
    local max_attempts=10
    local attempt=1
    
    echo -e "${BLUE}🔍 Checking $server_name server health...${NC}"
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s --head "$server_url" >/dev/null 2>&1; then
            echo -e "${GREEN}✅ $server_name server is ready${NC}"
            return 0
        else
            echo "   Attempt $attempt/$max_attempts: $server_name server not ready..."
            sleep 3
            attempt=$((attempt + 1))
        fi
    done
    
    echo -e "${RED}❌ $server_name server failed health check${NC}"
    return 1
}

# Main test execution loop
while [ $RETRY_COUNT -lt $MAX_RETRIES ] && [ "$TEST_PASSED" = false ]; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo ""
    echo -e "${YELLOW}🔄 Test Execution Attempt: $RETRY_COUNT/$MAX_RETRIES${NC}"
    echo "=================================================="
    
    # Check server health
    echo -e "${BLUE}🏥 Server Health Checks${NC}"
    if ! check_server_health "Frontend" "http://localhost:5173" || \
       ! check_server_health "Backend" "http://localhost:3001"; then
        echo -e "${RED}❌ Server health check failed${NC}"
        if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
            echo "   Waiting 10 seconds before retry..."
            sleep 10
            continue
        else
            exit 1
        fi
    fi
    
    echo ""
    
    # Test Categories with individual pass/fail tracking
    TEST_CATEGORIES=(
        "Share Removal Validation:sharing-removal-validation.spec.js"
        "Core Functionality Regression:core-functionality-regression.spec.js"
        "Search Functionality:search-functionality.spec.js"
        "User Engagement Tracking:user-engagement-tracking.spec.js"
        "API Integration:api-tests/api-integration.spec.js"
        "WebSocket Integration:api-tests/websocket-integration.spec.js"
        "Mobile Responsiveness:mobile-tests/mobile-responsiveness.spec.js"
        "Accessibility Compliance:accessibility-tests/accessibility-compliance.spec.js"
        "Performance Regression:performance-tests/performance-regression.spec.js"
        "Cross Browser:browser-tests/cross-browser.spec.js"
    )
    
    FAILED_CATEGORIES=()
    PASSED_CATEGORIES=()
    
    # Execute each test category
    for category_info in "${TEST_CATEGORIES[@]}"; do
        IFS=':' read -r category_name test_file <<< "$category_info"
        
        if run_test_category "$category_name" "$test_file"; then
            PASSED_CATEGORIES+=("$category_name")
        else
            FAILED_CATEGORIES+=("$category_name")
        fi
        
        echo ""
    done
    
    # Calculate results
    TOTAL_CATEGORIES=${#TEST_CATEGORIES[@]}
    PASSED_COUNT=${#PASSED_CATEGORIES[@]}
    FAILED_COUNT=${#FAILED_CATEGORIES[@]}
    PASS_RATE=$((PASSED_COUNT * 100 / TOTAL_CATEGORIES))
    
    echo ""
    echo -e "${BLUE}📊 Test Execution Summary - Attempt $RETRY_COUNT${NC}"
    echo "=============================================="
    echo "   Total Categories: $TOTAL_CATEGORIES"
    echo "   Passed: $PASSED_COUNT"
    echo "   Failed: $FAILED_COUNT"
    echo "   Pass Rate: $PASS_RATE%"
    echo ""
    
    # Display passed categories
    if [ ${#PASSED_CATEGORIES[@]} -gt 0 ]; then
        echo -e "${GREEN}✅ Passed Categories:${NC}"
        for category in "${PASSED_CATEGORIES[@]}"; do
            echo "   ✅ $category"
        done
        echo ""
    fi
    
    # Display failed categories
    if [ ${#FAILED_CATEGORIES[@]} -gt 0 ]; then
        echo -e "${RED}❌ Failed Categories:${NC}"
        for category in "${FAILED_CATEGORIES[@]}"; do
            echo "   ❌ $category"
        done
        echo ""
    fi
    
    # Check if 100% pass rate achieved
    if [ $PASS_RATE -eq 100 ]; then
        TEST_PASSED=true
        echo -e "${GREEN}🎉 100% PASS RATE ACHIEVED!${NC}"
        echo ""
        break
    else
        echo -e "${YELLOW}⚠️  Pass rate ($PASS_RATE%) below 100% target${NC}"
        
        if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
            echo "   Preparing for retry attempt..."
            echo "   Waiting 15 seconds for system stabilization..."
            sleep 15
        fi
    fi
done

# Final Results
echo ""
echo "🏁 FINAL RESULTS"
echo "================"

if [ "$TEST_PASSED" = true ]; then
    echo -e "${GREEN}🎉 SUCCESS: 100% PASS RATE ACHIEVED!${NC}"
    echo ""
    echo -e "${GREEN}✅ SHARING REMOVAL VALIDATION COMPLETE${NC}"
    echo "   - All sharing functionality successfully removed"
    echo "   - Core features remain fully functional"
    echo "   - Cross-browser compatibility maintained"
    echo "   - Mobile responsiveness verified"
    echo "   - Accessibility standards upheld"
    echo "   - Performance targets met"
    echo "   - API endpoints properly secured"
    echo "   - WebSocket connections stable"
    echo "   - User engagement tracking functional"
    echo ""
    echo -e "${GREEN}🚀 APPLICATION READY FOR PRODUCTION${NC}"
    
    # Generate success report
    cat > "$REPORT_DIR/final-report-$TIMESTAMP.txt" << EOF
E2E Sharing Removal Test Suite - FINAL REPORT
=============================================
Execution Date: $(date)
Total Attempts: $RETRY_COUNT
Final Pass Rate: 100%

VALIDATION RESULTS:
✅ Share buttons completely removed from UI
✅ Share API endpoints return 404/405 status
✅ Like functionality working correctly
✅ Comment functionality working correctly
✅ Feed loading and display functional
✅ Search functionality unaffected
✅ User engagement tracking working
✅ Cross-browser compatibility verified
✅ Mobile responsiveness confirmed
✅ Accessibility compliance (WCAG 2.1 AA)
✅ Performance regression tests passed
✅ API integration tests passed
✅ WebSocket connection tests passed

STATUS: READY FOR PRODUCTION DEPLOYMENT
EOF
    
    exit 0
else
    echo -e "${RED}❌ FAILURE: Unable to achieve 100% pass rate after $MAX_RETRIES attempts${NC}"
    echo ""
    echo "   Final Pass Rate: $PASS_RATE%"
    echo "   Failed Categories: ${#FAILED_CATEGORIES[@]}"
    echo ""
    echo -e "${RED}🚫 DEPLOYMENT BLOCKED${NC}"
    echo "   Please review failed test categories and fix issues before deployment"
    echo ""
    
    # Generate failure report
    cat > "$REPORT_DIR/failure-report-$TIMESTAMP.txt" << EOF
E2E Sharing Removal Test Suite - FAILURE REPORT
===============================================
Execution Date: $(date)
Total Attempts: $MAX_RETRIES
Final Pass Rate: $PASS_RATE%

FAILED CATEGORIES:
$(printf '%s\n' "${FAILED_CATEGORIES[@]}")

STATUS: DEPLOYMENT BLOCKED - ISSUES REQUIRE RESOLUTION
EOF
    
    exit 1
fi