#!/bin/bash

# Terminal Echo Duplication Test Runner
# Comprehensive test execution script

set -e

echo "🧪 Starting Terminal Echo Duplication Prevention Tests"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Check if servers are running
check_servers() {
    print_status $BLUE "🔍 Checking server status..."
    
    # Check frontend server
    if curl -s http://localhost:5173 > /dev/null 2>&1; then
        print_status $GREEN "✅ Frontend server running on port 5173"
    else
        print_status $RED "❌ Frontend server not running on port 5173"
        print_status $YELLOW "Please run: cd frontend && npm run dev"
        exit 1
    fi
    
    # Check backend server
    if curl -s http://localhost:8080 > /dev/null 2>&1; then
        print_status $GREEN "✅ Backend server running on port 8080"
    else
        print_status $RED "❌ Backend server not running on port 8080"
        print_status $YELLOW "Please run: node backend-terminal-server.js"
        exit 1
    fi
}

# Run specific test suite
run_test_suite() {
    local test_name=$1
    local test_file=$2
    local description=$3
    
    print_status $BLUE "🚀 Running ${test_name}..."
    echo "Description: ${description}"
    
    if npx playwright test "$test_file" --config=test-runner.config.ts --reporter=list; then
        print_status $GREEN "✅ ${test_name} PASSED"
        return 0
    else
        print_status $RED "❌ ${test_name} FAILED"
        return 1
    fi
}

# Main test execution
main() {
    local failed_tests=0
    
    # Check prerequisites
    check_servers
    
    print_status $BLUE "📋 Test Suite Overview:"
    echo "1. Echo Duplication Prevention (Regression)"
    echo "2. WebSocket Message Flow (Integration)" 
    echo "3. Terminal Interaction E2E (End-to-End)"
    echo "4. Claude CLI Interaction (Regression)"
    echo "5. Performance Validation (Performance)"
    echo ""
    
    # Test 1: Echo Duplication Prevention
    if ! run_test_suite \
        "Echo Duplication Prevention" \
        "regression/echo-duplication-prevention.test.ts" \
        "Validates single character echo without duplication"; then
        ((failed_tests++))
    fi
    echo ""
    
    # Test 2: WebSocket Message Flow  
    if ! run_test_suite \
        "WebSocket Message Flow" \
        "integration/websocket-message-flow.test.ts" \
        "Tests WebSocket communication for echo loops"; then
        ((failed_tests++))
    fi
    echo ""
    
    # Test 3: Terminal Interaction E2E
    if ! run_test_suite \
        "Terminal Interaction E2E" \
        "e2e/terminal-interaction.spec.ts" \
        "Complete user workflow validation"; then
        ((failed_tests++))
    fi
    echo ""
    
    # Test 4: Claude CLI Interaction
    if ! run_test_suite \
        "Claude CLI Interaction" \
        "regression/claude-cli-interaction.test.ts" \
        "Claude CLI commands without echo issues"; then
        ((failed_tests++))
    fi
    echo ""
    
    # Test 5: Performance Validation
    if ! run_test_suite \
        "Performance Validation" \
        "performance/terminal-performance.test.ts" \
        "Terminal responsiveness and performance"; then
        ((failed_tests++))
    fi
    echo ""
    
    # Summary
    print_status $BLUE "📊 Test Results Summary"
    echo "========================="
    
    local total_tests=5
    local passed_tests=$((total_tests - failed_tests))
    
    print_status $GREEN "✅ Passed: ${passed_tests}/${total_tests}"
    
    if [ $failed_tests -gt 0 ]; then
        print_status $RED "❌ Failed: ${failed_tests}/${total_tests}"
        print_status $YELLOW "⚠️  Check test reports for detailed failure analysis"
        
        # Generate test report
        print_status $BLUE "📄 Generating test report..."
        npx playwright show-report --quiet
        
        exit 1
    else
        print_status $GREEN "🎉 All tests passed! Terminal echo duplication is prevented."
        exit 0
    fi
}

# Help function
show_help() {
    echo "Terminal Echo Duplication Test Runner"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "OPTIONS:"
    echo "  --help, -h     Show this help message"
    echo "  --echo         Run only echo duplication prevention tests"
    echo "  --websocket    Run only WebSocket message flow tests"
    echo "  --e2e          Run only end-to-end terminal interaction tests"
    echo "  --claude       Run only Claude CLI interaction tests"
    echo "  --performance  Run only performance tests"
    echo "  --all          Run all test suites (default)"
    echo ""
    echo "Examples:"
    echo "  $0                    # Run all tests"
    echo "  $0 --echo            # Run only echo tests"
    echo "  $0 --websocket       # Run only WebSocket tests"
}

# Parse command line arguments
case "${1:-}" in
    --help|-h)
        show_help
        exit 0
        ;;
    --echo)
        check_servers
        run_test_suite "Echo Duplication Prevention" "regression/echo-duplication-prevention.test.ts" "Single character echo validation"
        ;;
    --websocket)
        check_servers
        run_test_suite "WebSocket Message Flow" "integration/websocket-message-flow.test.ts" "WebSocket communication validation"
        ;;
    --e2e)
        check_servers
        run_test_suite "Terminal Interaction E2E" "e2e/terminal-interaction.spec.ts" "End-to-end user workflow"
        ;;
    --claude)
        check_servers
        run_test_suite "Claude CLI Interaction" "regression/claude-cli-interaction.test.ts" "Claude CLI command validation"
        ;;
    --performance)
        check_servers
        run_test_suite "Performance Validation" "performance/terminal-performance.test.ts" "Performance and responsiveness"
        ;;
    --all|"")
        main
        ;;
    *)
        print_status $RED "❌ Unknown option: $1"
        show_help
        exit 1
        ;;
esac