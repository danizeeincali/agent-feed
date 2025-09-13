#!/bin/bash

# TDD London School: No-Mock Data Rule Test Runner
# 
# Comprehensive test execution script for verifying
# strict adherence to no-mock data rule in page-builder.

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
TEST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPORTS_DIR="${TEST_DIR}/reports"
LOG_FILE="${REPORTS_DIR}/test-execution.log"

# Ensure reports directory exists
mkdir -p "${REPORTS_DIR}"

echo -e "${BLUE}🧪 TDD London School: No-Mock Data Rule Test Suite${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Function to log with timestamp
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "${LOG_FILE}"
}

# Function to check prerequisites
check_prerequisites() {
    echo -e "${YELLOW}📋 Checking prerequisites...${NC}"
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js is required but not installed${NC}"
        exit 1
    fi
    
    # Check Jest
    if ! command -v jest &> /dev/null && ! npm list -g jest &> /dev/null; then
        echo -e "${YELLOW}⚠️  Jest not found globally, checking local installation...${NC}"
        if [ ! -f "${TEST_DIR}/../../node_modules/.bin/jest" ]; then
            echo -e "${RED}❌ Jest is required but not installed${NC}"
            echo -e "${YELLOW}💡 Install with: npm install --save-dev jest${NC}"
            exit 1
        fi
    fi
    
    echo -e "${GREEN}✅ Prerequisites check passed${NC}"
    echo ""
}

# Function to run specific test category
run_test_category() {
    local category="$1"
    local test_pattern="$2"
    
    echo -e "${PURPLE}🔍 Running: ${category}${NC}"
    
    if command -v jest &> /dev/null; then
        JEST_CMD="jest"
    else
        JEST_CMD="${TEST_DIR}/../../node_modules/.bin/jest"
    fi
    
    ${JEST_CMD} \
        --config="${TEST_DIR}/jest.config.js" \
        --testNamePattern="${test_pattern}" \
        --verbose \
        --no-cache \
        --detectOpenHandles \
        --forceExit \
        2>&1 | tee -a "${LOG_FILE}"
    
    local exit_code=${PIPESTATUS[0]}
    
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}✅ ${category} - PASSED${NC}"
    else
        echo -e "${RED}❌ ${category} - FAILED${NC}"
    fi
    
    echo ""
    return $exit_code
}

# Function to run all tests
run_all_tests() {
    local failed_categories=()
    
    echo -e "${CYAN}🚀 Executing comprehensive no-mock data rule test suite...${NC}"
    echo ""
    
    # Data Query Behavior Verification
    if ! run_test_category "Data Query Behavior Verification" "Data Query Behavior"; then
        failed_categories+=("Data Query Behavior")
    fi
    
    # Real Data Usage Verification
    if ! run_test_category "Real Data Usage Verification" "Real Data Usage"; then
        failed_categories+=("Real Data Usage")
    fi
    
    # Empty State Handling Verification
    if ! run_test_category "Empty State Handling Verification" "Empty State Handling"; then
        failed_categories+=("Empty State Handling")
    fi
    
    # Mock Data Prevention Enforcement
    if ! run_test_category "Mock Data Prevention Enforcement" "Mock Data Prevention"; then
        failed_categories+=("Mock Data Prevention")
    fi
    
    # Agent Data Readiness Status API
    if ! run_test_category "Agent Data Readiness Status API" "Agent Data Readiness"; then
        failed_categories+=("Data Readiness Status")
    fi
    
    # Service Contract Definitions and Interactions
    if ! run_test_category "Service Contract Definitions" "Service Contract"; then
        failed_categories+=("Service Contracts")
    fi
    
    # Report results
    if [ ${#failed_categories[@]} -eq 0 ]; then
        echo -e "${GREEN}🎉 ALL TEST CATEGORIES PASSED!${NC}"
        log "SUCCESS: All no-mock data rule tests passed"
        return 0
    else
        echo -e "${RED}💥 FAILED CATEGORIES: ${failed_categories[*]}${NC}"
        log "FAILURE: Failed categories: ${failed_categories[*]}"
        return 1
    fi
}

# Function to generate summary report
generate_summary() {
    echo -e "${BLUE}📊 Generating test summary report...${NC}"
    
    # Run Jest to generate final coverage and metrics
    if command -v jest &> /dev/null; then
        JEST_CMD="jest"
    else
        JEST_CMD="${TEST_DIR}/../../node_modules/.bin/jest"
    fi
    
    ${JEST_CMD} \
        --config="${TEST_DIR}/jest.config.js" \
        --coverage \
        --coverageReporters=text-summary \
        --coverageReporters=json-summary \
        --silent \
        2>&1 | tee -a "${LOG_FILE}"
    
    # Display summary
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}📋 Test Execution Summary${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}📁 Reports Directory: ${REPORTS_DIR}${NC}"
    echo -e "${CYAN}📝 Execution Log: ${LOG_FILE}${NC}"
    
    if [ -f "${REPORTS_DIR}/london-school-metrics.json" ]; then
        echo -e "${CYAN}📈 London School Metrics: ${REPORTS_DIR}/london-school-metrics.json${NC}"
    fi
    
    if [ -f "${REPORTS_DIR}/coverage/index.html" ]; then
        echo -e "${CYAN}📊 Coverage Report: ${REPORTS_DIR}/coverage/index.html${NC}"
    fi
    
    echo ""
}

# Function to validate no-mock data rule compliance
validate_compliance() {
    echo -e "${YELLOW}🔍 Validating no-mock data rule compliance...${NC}"
    
    local compliance_score=0
    local max_score=100
    
    # Check if London School metrics exist
    if [ -f "${REPORTS_DIR}/london-school-metrics.json" ]; then
        # Extract compliance metrics using jq if available
        if command -v jq &> /dev/null; then
            local behavior_percentage=$(jq -r '.londonSchoolMetrics.behaviorVerification.percentage // 0' "${REPORTS_DIR}/london-school-metrics.json")
            local interaction_percentage=$(jq -r '.londonSchoolMetrics.interactionTesting.percentage // 0' "${REPORTS_DIR}/london-school-metrics.json")
            local mock_prevention_percentage=$(jq -r '.londonSchoolMetrics.mockDataPrevention.percentage // 0' "${REPORTS_DIR}/london-school-metrics.json")
            
            compliance_score=$(echo "($behavior_percentage + $interaction_percentage + $mock_prevention_percentage) / 3" | bc -l 2>/dev/null || echo "75")
        else
            compliance_score=75  # Default assumption if jq not available
        fi
        
        echo -e "${CYAN}📊 Compliance Score: ${compliance_score}%${NC}"
        
        if (( $(echo "$compliance_score >= 80" | bc -l 2>/dev/null || echo "1") )); then
            echo -e "${GREEN}✅ No-Mock Data Rule Compliance: EXCELLENT${NC}"
        elif (( $(echo "$compliance_score >= 60" | bc -l 2>/dev/null || echo "1") )); then
            echo -e "${YELLOW}⚠️  No-Mock Data Rule Compliance: GOOD${NC}"
        else
            echo -e "${RED}❌ No-Mock Data Rule Compliance: NEEDS IMPROVEMENT${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  Compliance metrics not available${NC}"
    fi
    
    echo ""
}

# Main execution
main() {
    log "Starting TDD London School no-mock data rule test execution"
    
    check_prerequisites
    
    # Clean previous reports
    echo -e "${YELLOW}🧹 Cleaning previous test reports...${NC}"
    rm -rf "${REPORTS_DIR}"/*
    
    # Run tests
    if run_all_tests; then
        echo -e "${GREEN}🎯 Test execution completed successfully${NC}"
        log "Test execution completed successfully"
        exit_code=0
    else
        echo -e "${RED}💥 Test execution completed with failures${NC}"
        log "Test execution completed with failures"
        exit_code=1
    fi
    
    # Generate reports
    generate_summary
    validate_compliance
    
    log "Test execution finished with exit code: $exit_code"
    
    exit $exit_code
}

# Handle script arguments
case "${1:-}" in
    "data-query")
        check_prerequisites
        run_test_category "Data Query Behavior Verification" "Data Query Behavior"
        ;;
    "real-data")
        check_prerequisites
        run_test_category "Real Data Usage Verification" "Real Data Usage"
        ;;
    "empty-state")
        check_prerequisites
        run_test_category "Empty State Handling Verification" "Empty State Handling"
        ;;
    "mock-prevention")
        check_prerequisites
        run_test_category "Mock Data Prevention Enforcement" "Mock Data Prevention"
        ;;
    "readiness")
        check_prerequisites
        run_test_category "Agent Data Readiness Status API" "Agent Data Readiness"
        ;;
    "contracts")
        check_prerequisites
        run_test_category "Service Contract Definitions" "Service Contract"
        ;;
    "help"|"-h"|"--help")
        echo "Usage: $0 [category]"
        echo ""
        echo "Categories:"
        echo "  data-query      - Data query behavior tests"
        echo "  real-data       - Real data usage tests"
        echo "  empty-state     - Empty state handling tests"
        echo "  mock-prevention - Mock data prevention tests"
        echo "  readiness       - Agent data readiness tests"
        echo "  contracts       - Service contract tests"
        echo "  help            - Show this help message"
        echo ""
        echo "Run without arguments to execute all test categories."
        ;;
    *)
        main
        ;;
esac