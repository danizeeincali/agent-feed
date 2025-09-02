#!/bin/bash

# Comprehensive Claude Code Integration Test Validation Script
# This script validates deployment readiness by running all test suites

set -e

echo "🚀 Starting Claude Code Integration Test Validation"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
FRONTEND_URL="http://localhost:5173"
BACKEND_URL="http://localhost:8080"
TEST_DIR="/workspaces/agent-feed/tests/playwright-claude-code"
RESULTS_DIR="$TEST_DIR/test-results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Function to check service availability
check_service() {
    local url=$1
    local name=$2
    
    echo -n "🔍 Checking $name ($url)... "
    
    if curl -s --max-time 10 "$url" > /dev/null; then
        echo -e "${GREEN}✓ Available${NC}"
        return 0
    else
        echo -e "${RED}✗ Not available${NC}"
        return 1
    fi
}

# Function to run test suite
run_test_suite() {
    local suite_name=$1
    local npm_script=$2
    local description=$3
    
    echo -e "\n${BLUE}📋 Running $suite_name${NC}"
    echo "Description: $description"
    echo "----------------------------------------"
    
    cd "$TEST_DIR"
    
    if npm run "$npm_script"; then
        echo -e "${GREEN}✅ $suite_name: PASSED${NC}"
        return 0
    else
        echo -e "${RED}❌ $suite_name: FAILED${NC}"
        return 1
    fi
}

# Function to generate summary report
generate_summary() {
    local total_tests=$1
    local passed_tests=$2
    local failed_tests=$3
    
    echo -e "\n${BLUE}📊 Test Execution Summary${NC}"
    echo "========================================"
    echo "Total Test Suites: $total_tests"
    echo -e "Passed: ${GREEN}$passed_tests${NC}"
    echo -e "Failed: ${RED}$failed_tests${NC}"
    echo "Success Rate: $(( passed_tests * 100 / total_tests ))%"
    echo "Timestamp: $(date)"
    
    # Create results directory
    mkdir -p "$RESULTS_DIR"
    
    # Generate JSON summary
    cat > "$RESULTS_DIR/validation-summary-$TIMESTAMP.json" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "total_suites": $total_tests,
  "passed_suites": $passed_tests,
  "failed_suites": $failed_tests,
  "success_rate": $(( passed_tests * 100 / total_tests )),
  "deployment_ready": $(if [ $failed_tests -eq 0 ]; then echo "true"; else echo "false"; fi),
  "environment": {
    "frontend_url": "$FRONTEND_URL",
    "backend_url": "$BACKEND_URL",
    "node_env": "${NODE_ENV:-test}",
    "ci": "${CI:-false}"
  }
}
EOF
    
    echo "Summary saved to: $RESULTS_DIR/validation-summary-$TIMESTAMP.json"
}

# Main execution
main() {
    echo "Environment: ${NODE_ENV:-development}"
    echo "CI Mode: ${CI:-false}"
    echo "Test Directory: $TEST_DIR"
    
    # Pre-flight checks
    echo -e "\n${YELLOW}🔧 Pre-flight Service Checks${NC}"
    
    if ! check_service "$FRONTEND_URL" "Frontend"; then
        echo -e "${RED}❌ Frontend service not available. Please start with: cd frontend && npm run dev${NC}"
        exit 1
    fi
    
    if ! check_service "$BACKEND_URL/health" "Backend API"; then
        echo -e "${RED}❌ Backend service not available. Please start with: node simple-backend.js${NC}"
        exit 1
    fi
    
    if ! check_service "$BACKEND_URL/api/claude/instances" "Claude API"; then
        echo -e "${RED}❌ Claude API not available. Check backend configuration.${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ All services are running${NC}"
    
    # Install dependencies if needed
    if [ ! -d "$TEST_DIR/node_modules" ]; then
        echo -e "\n${YELLOW}📦 Installing test dependencies...${NC}"
        cd "$TEST_DIR"
        npm install
    fi
    
    # Install Playwright browsers if needed
    if [ ! -d "$HOME/.cache/ms-playwright" ] && [ "${CI:-false}" != "true" ]; then
        echo -e "\n${YELLOW}🌐 Installing Playwright browsers...${NC}"
        cd "$TEST_DIR"
        npx playwright install --with-deps
    fi
    
    # Test execution tracking
    total_tests=0
    passed_tests=0
    failed_tests=0
    
    echo -e "\n${BLUE}🎯 Starting Test Suite Execution${NC}"
    echo "=================================================="
    
    # Test Suite 1: Complete Workflow Tests
    total_tests=$((total_tests + 1))
    if run_test_suite "Complete Workflow Tests" "test:workflow" "End-to-end workflow validation: button clicks, instance creation, message handling"; then
        passed_tests=$((passed_tests + 1))
    else
        failed_tests=$((failed_tests + 1))
    fi
    
    # Test Suite 2: Message Handling Tests
    total_tests=$((total_tests + 1))
    if run_test_suite "Message Handling Tests" "test:messages" "Message processing, WebSocket resilience, rapid message sending"; then
        passed_tests=$((passed_tests + 1))
    else
        failed_tests=$((failed_tests + 1))
    fi
    
    # Test Suite 3: Tool Usage Display Tests
    total_tests=$((total_tests + 1))
    if run_test_suite "Tool Usage Display Tests" "test:tools" "Tool execution display in terminal, chat/terminal separation"; then
        passed_tests=$((passed_tests + 1))
    else
        failed_tests=$((failed_tests + 1))
    fi
    
    # Test Suite 4: Regression Tests
    total_tests=$((total_tests + 1))
    if run_test_suite "Regression Tests" "test:regression" "Existing functionality stability, API compatibility, UI components"; then
        passed_tests=$((passed_tests + 1))
    else
        failed_tests=$((failed_tests + 1))
    fi
    
    # Test Suite 5: Performance Benchmarks (if not CI)
    if [ "${CI:-false}" != "true" ]; then
        total_tests=$((total_tests + 1))
        if run_test_suite "Performance Benchmarks" "test:performance" "Load testing, memory usage, response times, concurrent users"; then
            passed_tests=$((passed_tests + 1))
        else
            failed_tests=$((failed_tests + 1))
        fi
    else
        echo -e "${YELLOW}⏭️  Skipping Performance Benchmarks in CI environment${NC}"
    fi
    
    # Test Suite 6: CI Integration Tests
    total_tests=$((total_tests + 1))
    if run_test_suite "CI Integration Tests" "test:ci" "Cross-browser compatibility, headless operation, production readiness"; then
        passed_tests=$((passed_tests + 1))
    else
        failed_tests=$((failed_tests + 1))
    fi
    
    # Generate summary
    generate_summary $total_tests $passed_tests $failed_tests
    
    # Final verdict
    echo -e "\n${BLUE}🏁 Final Deployment Readiness Assessment${NC}"
    echo "=================================================="
    
    if [ $failed_tests -eq 0 ]; then
        echo -e "${GREEN}🎉 DEPLOYMENT READY${NC}"
        echo "All test suites passed successfully!"
        echo "The Claude Code integration is ready for production deployment."
        
        # Generate deployment certificate
        cat > "$RESULTS_DIR/deployment-certificate-$TIMESTAMP.txt" << EOF
CLAUDE CODE INTEGRATION - DEPLOYMENT READINESS CERTIFICATE

Test Execution Date: $(date)
Environment: ${NODE_ENV:-development}
Frontend: $FRONTEND_URL
Backend: $BACKEND_URL

TEST RESULTS:
✅ Complete Workflow Tests: PASSED
✅ Message Handling Tests: PASSED  
✅ Tool Usage Display Tests: PASSED
✅ Regression Tests: PASSED
✅ Performance Benchmarks: $(if [ "${CI:-false}" != "true" ]; then echo "PASSED"; else echo "SKIPPED (CI)"; fi)
✅ CI Integration Tests: PASSED

VALIDATION STATUS: ✅ APPROVED FOR PRODUCTION DEPLOYMENT

This certificate confirms that the Claude Code integration has passed
all required validation tests and meets production deployment standards.

Test Suite Coverage:
- End-to-end workflow functionality
- Message handling and WebSocket resilience
- Tool usage display validation
- Regression testing for existing functionality
- Performance benchmarking (when applicable)
- Cross-browser compatibility
- Production environment readiness

Certified by: Playwright Test Automation Suite
Signature: $(echo "Claude-Code-$(date +%s)" | sha256sum | cut -d' ' -f1)
EOF
        
        echo "Deployment certificate saved to: $RESULTS_DIR/deployment-certificate-$TIMESTAMP.txt"
        exit 0
        
    else
        echo -e "${RED}❌ NOT READY FOR DEPLOYMENT${NC}"
        echo "$failed_tests test suite(s) failed."
        echo "Please review the test results and fix failing tests before deployment."
        
        echo -e "\n${YELLOW}📋 Recommended Actions:${NC}"
        echo "1. Review test output above for specific failure details"
        echo "2. Check browser console for JavaScript errors"
        echo "3. Verify WebSocket connectivity"
        echo "4. Test manually in affected browsers"
        echo "5. Re-run tests after fixes: ./run-validation.sh"
        
        exit 1
    fi
}

# Trap to ensure cleanup
cleanup() {
    echo -e "\n${YELLOW}🧹 Cleaning up...${NC}"
    # Add any cleanup operations here
}

trap cleanup EXIT

# Run main function
main "$@"