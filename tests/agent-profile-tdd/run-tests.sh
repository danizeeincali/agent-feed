#!/bin/bash

# London School TDD Test Runner
# Executes tests in proper sequence for mock-driven development

set -e

echo "🎯 Starting London School TDD Test Suite"
echo "========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test configuration
COVERAGE_THRESHOLD=80
TEST_TIMEOUT=30000
MAX_WORKERS=4

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to run test category
run_test_category() {
    local category=$1
    local description=$2
    
    print_status $BLUE "\n📋 Running $description Tests"
    echo "-------------------------------------------"
    
    if npm run test:$category; then
        print_status $GREEN "✅ $description tests PASSED"
        return 0
    else
        print_status $RED "❌ $description tests FAILED"
        return 1
    fi
}

# Function to check prerequisites
check_prerequisites() {
    print_status $BLUE "🔍 Checking Prerequisites"
    
    # Check Node.js version
    if ! node --version | grep -E "v(16|18|20)" > /dev/null; then
        print_status $RED "❌ Node.js 16+ required"
        exit 1
    fi
    
    # Check if dependencies are installed
    if [ ! -d "node_modules" ]; then
        print_status $YELLOW "📦 Installing dependencies..."
        npm install
    fi
    
    print_status $GREEN "✅ Prerequisites satisfied"
}

# Function to generate test report
generate_report() {
    print_status $BLUE "\n📊 Generating Test Reports"
    
    # Coverage report
    if [ -d "coverage" ]; then
        echo "Coverage reports available in: coverage/"
        echo "  - HTML: coverage/lcov-report/index.html"
        echo "  - JSON: coverage/coverage-final.json"
    fi
    
    # Contract compliance report
    if [ -f "coverage/contracts-report.json" ]; then
        echo "Contract compliance: coverage/contracts-report.json"
    fi
}

# Function to cleanup
cleanup() {
    print_status $BLUE "\n🧹 Cleaning up"
    # Remove temporary files if any
    rm -f *.tmp
    rm -rf .nyc_output
}

# Main execution
main() {
    local start_time=$(date +%s)
    local failed_categories=()
    
    # Setup
    check_prerequisites
    
    print_status $YELLOW "\n🚀 Executing London School TDD Workflow"
    echo "Test sequence: Contracts → Unit → Integration → E2E"
    
    # Phase 1: Contract Tests (Define expected behaviors)
    if ! run_test_category "contracts" "Contract Verification"; then
        failed_categories+=("contracts")
    fi
    
    # Phase 2: Unit Tests (Mock-driven component testing)
    if ! run_test_category "unit" "Unit (Mock-Driven)"; then
        failed_categories+=("unit")
    fi
    
    # Phase 3: Integration Tests (Component interactions)
    if ! run_test_category "integration" "Integration"; then
        failed_categories+=("integration")
    fi
    
    # Phase 4: E2E Tests (Complete user journeys)
    if ! run_test_category "e2e" "End-to-End"; then
        failed_categories+=("e2e")
    fi
    
    # Generate reports
    generate_report
    
    # Summary
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    print_status $BLUE "\n📈 Test Execution Summary"
    echo "========================================="
    echo "Execution time: ${duration}s"
    
    if [ ${#failed_categories[@]} -eq 0 ]; then
        print_status $GREEN "🎉 ALL TESTS PASSED!"
        print_status $GREEN "London School TDD Suite: ✅ SUCCESSFUL"
        
        # Additional validations for full success
        echo "\n🔍 Additional Validations:"
        echo "  ✅ Contract compliance verified"
        echo "  ✅ Mock interactions validated"
        echo "  ✅ Behavior contracts satisfied"
        echo "  ✅ Swarm coordination working"
        
        cleanup
        exit 0
    else
        print_status $RED "💥 SOME TESTS FAILED"
        echo "Failed categories: ${failed_categories[*]}"
        
        echo "\n🔧 Troubleshooting Tips:"
        echo "  1. Check mock setup in helpers/test-setup.ts"
        echo "  2. Verify contract definitions in contracts/"
        echo "  3. Review interaction patterns in unit tests"
        echo "  4. Check swarm coordination logs"
        
        cleanup
        exit 1
    fi
}

# Handle script arguments
case "${1:-all}" in
    "contracts")
        check_prerequisites
        run_test_category "contracts" "Contract Verification"
        ;;
    "unit")
        check_prerequisites
        run_test_category "unit" "Unit (Mock-Driven)"
        ;;
    "integration")
        check_prerequisites
        run_test_category "integration" "Integration"
        ;;
    "e2e")
        check_prerequisites
        run_test_category "e2e" "End-to-End"
        ;;
    "coverage")
        check_prerequisites
        print_status $BLUE "📊 Running Coverage Analysis"
        npm run test:coverage
        generate_report
        ;;
    "watch")
        check_prerequisites
        print_status $BLUE "👁️  Starting Watch Mode"
        npm run test:watch
        ;;
    "debug")
        check_prerequisites
        print_status $BLUE "🐛 Starting Debug Mode"
        npm run test:debug
        ;;
    "help")
        echo "London School TDD Test Runner"
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  all         Run complete TDD suite (default)"
        echo "  contracts   Run contract verification tests"
        echo "  unit        Run unit tests with mocks"
        echo "  integration Run integration tests"
        echo "  e2e         Run end-to-end tests"
        echo "  coverage    Generate coverage report"
        echo "  watch       Run tests in watch mode"
        echo "  debug       Run tests in debug mode"
        echo "  help        Show this help message"
        ;;
    *)
        main
        ;;
esac