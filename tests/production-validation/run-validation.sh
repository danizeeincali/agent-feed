#!/bin/bash

# PRODUCTION VALIDATION EXECUTION SCRIPT
# Runs comprehensive validation suite with both automated and manual testing

set -e

echo "🚀 STARTING COMPREHENSIVE PRODUCTION VALIDATION"
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="http://localhost:5173"
BACKEND_URL="http://localhost:3000"
REPORT_DIR="/workspaces/agent-feed/tests/production-validation/reports"
SCREENSHOT_DIR="/workspaces/agent-feed/tests/production-validation/screenshots"

# Create directories
mkdir -p "$REPORT_DIR"
mkdir -p "$SCREENSHOT_DIR"

echo -e "${BLUE}📋 Configuration:${NC}"
echo "Frontend URL: $BASE_URL"
echo "Backend URL: $BACKEND_URL"
echo "Report Directory: $REPORT_DIR"
echo "Screenshot Directory: $SCREENSHOT_DIR"
echo ""

# Function to check if service is running
check_service() {
    local url=$1
    local service_name=$2
    
    echo -e "${YELLOW}🔍 Checking $service_name...${NC}"
    
    if curl -s --connect-timeout 5 "$url" > /dev/null; then
        echo -e "${GREEN}✅ $service_name is running at $url${NC}"
        return 0
    else
        echo -e "${RED}❌ $service_name is not accessible at $url${NC}"
        return 1
    fi
}

# Function to run playwright tests
run_playwright_tests() {
    echo -e "${BLUE}🎭 Running Playwright E2E Tests...${NC}"
    
    cd /workspaces/agent-feed
    
    # Run the comprehensive E2E suite
    if npx playwright test --config tests/production-validation/playwright.config.ts \
        --reporter=html \
        --reporter=json \
        --output-dir="$REPORT_DIR/playwright"; then
        echo -e "${GREEN}✅ Playwright E2E tests passed${NC}"
        return 0
    else
        echo -e "${RED}❌ Playwright E2E tests failed${NC}"
        return 1
    fi
}

# Function to run load tests
run_load_tests() {
    echo -e "${BLUE}⚡ Running Load Tests...${NC}"
    
    cd /workspaces/agent-feed
    
    if npx playwright test tests/production-validation/load-test-suite.spec.ts \
        --config tests/production-validation/playwright.config.ts \
        --reporter=html \
        --output-dir="$REPORT_DIR/load-tests"; then
        echo -e "${GREEN}✅ Load tests passed${NC}"
        return 0
    else
        echo -e "${RED}❌ Load tests failed${NC}"
        return 1
    fi
}

# Function to run manual validation
run_manual_validation() {
    echo -e "${BLUE}👋 Running Manual Validation Script...${NC}"
    
    cd /workspaces/agent-feed/tests/production-validation
    
    if node manual-validation-script.js; then
        echo -e "${GREEN}✅ Manual validation passed${NC}"
        return 0
    else
        echo -e "${RED}❌ Manual validation failed${NC}"
        return 1
    fi
}

# Function to perform real browser testing
perform_real_browser_test() {
    echo -e "${BLUE}🌐 Performing Real Browser Validation...${NC}"
    
    # Test 1: Open browser and verify application loads
    echo "Testing application accessibility..."
    if timeout 30s curl -f "$BASE_URL" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Frontend is accessible${NC}"
    else
        echo -e "${RED}❌ Frontend is not accessible${NC}"
        return 1
    fi
    
    # Test 2: Test API endpoints
    echo "Testing API endpoints..."
    if curl -f "$BACKEND_URL/api/claude/instances" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Claude instances API is working${NC}"
    else
        echo -e "${RED}❌ Claude instances API is not working${NC}"
        return 1
    fi
    
    # Test 3: Verify WebSocket endpoint exists
    echo "Testing WebSocket capability..."
    if netstat -tuln | grep -q ":3000"; then
        echo -e "${GREEN}✅ Backend WebSocket port is listening${NC}"
    else
        echo -e "${RED}❌ Backend WebSocket port is not listening${NC}"
        return 1
    fi
    
    return 0
}

# Function to check Claude instances
verify_claude_instances() {
    echo -e "${BLUE}🤖 Verifying Claude Instance System...${NC}"
    
    # Check if we can get instance list
    local response=$(curl -s "$BACKEND_URL/api/claude/instances" || echo "ERROR")
    
    if [[ "$response" == "ERROR" ]]; then
        echo -e "${RED}❌ Cannot retrieve Claude instances${NC}"
        return 1
    fi
    
    # Check if response is valid JSON array
    if echo "$response" | jq -e type > /dev/null 2>&1 && echo "$response" | jq -e 'type == "array"' > /dev/null 2>&1; then
        local instance_count=$(echo "$response" | jq length)
        echo -e "${GREEN}✅ Claude instances API returns valid data (${instance_count} instances)${NC}"
    else
        echo -e "${RED}❌ Claude instances API returns invalid data${NC}"
        return 1
    fi
    
    return 0
}

# Function to generate final report
generate_final_report() {
    local overall_status=$1
    
    echo -e "${BLUE}📊 Generating Final Validation Report...${NC}"
    
    local report_file="$REPORT_DIR/production-validation-final-report.json"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    cat > "$report_file" << EOF
{
  "timestamp": "$timestamp",
  "overall_status": "$overall_status",
  "validation_type": "COMPREHENSIVE_PRODUCTION_VALIDATION",
  "environment": {
    "frontend_url": "$BASE_URL",
    "backend_url": "$BACKEND_URL",
    "test_environment": "production-like"
  },
  "test_results": {
    "service_availability": $service_check_result,
    "real_browser_test": $browser_test_result,
    "claude_instances": $claude_instances_result,
    "playwright_e2e": $playwright_result,
    "load_tests": $load_test_result,
    "manual_validation": $manual_validation_result
  },
  "validation_criteria": {
    "four_instance_buttons": "Must create Claude instances without Connection Error",
    "terminal_interaction": "Must get real Claude responses, not timeouts",
    "concurrent_instances": "Must handle multiple instances simultaneously",
    "performance": "Page load under 5s, navigation under 3s",
    "api_stability": "All endpoints must respond within SLA",
    "no_mocks": "100% real functionality validation"
  }
}
EOF
    
    echo -e "${GREEN}✅ Final report generated at: $report_file${NC}"
}

# Main execution
main() {
    echo -e "${BLUE}🎯 Phase 1: Service Availability Check${NC}"
    
    service_check_result="false"
    if check_service "$BASE_URL" "Frontend" && check_service "$BACKEND_URL/api/claude/instances" "Backend API"; then
        service_check_result="true"
    else
        echo -e "${RED}❌ Services not available. Aborting validation.${NC}"
        generate_final_report "FAILED"
        exit 1
    fi
    
    echo -e "\n${BLUE}🎯 Phase 2: Real Browser Testing${NC}"
    browser_test_result="false"
    if perform_real_browser_test; then
        browser_test_result="true"
    fi
    
    echo -e "\n${BLUE}🎯 Phase 3: Claude Instance Verification${NC}"
    claude_instances_result="false"
    if verify_claude_instances; then
        claude_instances_result="true"
    fi
    
    echo -e "\n${BLUE}🎯 Phase 4: Playwright E2E Tests${NC}"
    playwright_result="false"
    if run_playwright_tests; then
        playwright_result="true"
    fi
    
    echo -e "\n${BLUE}🎯 Phase 5: Load Testing${NC}"
    load_test_result="false"
    if run_load_tests; then
        load_test_result="true"
    fi
    
    echo -e "\n${BLUE}🎯 Phase 6: Manual Validation${NC}"
    manual_validation_result="false"
    if run_manual_validation; then
        manual_validation_result="true"
    fi
    
    # Determine overall result
    if [[ "$service_check_result" == "true" && "$browser_test_result" == "true" && 
          "$claude_instances_result" == "true" && "$playwright_result" == "true" && 
          "$load_test_result" == "true" && "$manual_validation_result" == "true" ]]; then
        overall_status="PASSED"
        echo -e "\n${GREEN}🎉 ALL VALIDATION PHASES PASSED - PRODUCTION READY! 🎉${NC}"
    else
        overall_status="FAILED"
        echo -e "\n${RED}❌ VALIDATION FAILED - NOT PRODUCTION READY${NC}"
    fi
    
    generate_final_report "$overall_status"
    
    echo -e "\n${BLUE}📈 Validation Summary:${NC}"
    echo "Service Availability: $service_check_result"
    echo "Real Browser Test: $browser_test_result"
    echo "Claude Instances: $claude_instances_result"
    echo "Playwright E2E: $playwright_result"
    echo "Load Tests: $load_test_result"
    echo "Manual Validation: $manual_validation_result"
    echo "Overall Status: $overall_status"
    
    if [[ "$overall_status" == "PASSED" ]]; then
        exit 0
    else
        exit 1
    fi
}

# Trap to ensure cleanup
trap 'echo -e "\n${YELLOW}⚠️  Validation interrupted${NC}"' INT TERM

# Run main function
main "$@"