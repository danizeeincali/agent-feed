#!/bin/bash

# SSE Connection Tests Runner
# Comprehensive script to run SSE connection functionality tests

set -e

echo "🚀 SSE Connection Tests Runner"
echo "=============================="

# Color codes for output
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

# Check if required services are running
check_services() {
    print_status $BLUE "🔍 Checking required services..."
    
    # Check backend
    if curl -s http://localhost:3000/api/health > /dev/null; then
        print_status $GREEN "✅ Backend service (port 3000) is running"
    else
        print_status $RED "❌ Backend service not accessible on port 3000"
        print_status $YELLOW "💡 Start backend with: cd /workspaces/agent-feed && node simple-backend.js"
        exit 1
    fi
    
    # Check frontend
    if curl -s http://localhost:5173 > /dev/null; then
        print_status $GREEN "✅ Frontend service (port 5173) is running"
    else
        print_status $RED "❌ Frontend service not accessible on port 5173"
        print_status $YELLOW "💡 Start frontend with: cd /workspaces/agent-feed/frontend && npm run dev"
        exit 1
    fi
}

# Install dependencies
install_deps() {
    print_status $BLUE "📦 Installing test dependencies..."
    npm install
    npx playwright install --with-deps
    print_status $GREEN "✅ Dependencies installed"
}

# Run test validation
validate_test_structure() {
    print_status $BLUE "🔍 Validating test structure..."
    
    local test_files=(
        "01-connection-establishment.spec.ts"
        "02-real-time-streaming.spec.ts"
        "03-connection-retry-recovery.spec.ts"
        "04-multiple-concurrent-connections.spec.ts"
        "05-resource-cleanup-management.spec.ts"
    )
    
    local utils_files=(
        "utils/global-setup.ts"
        "utils/global-teardown.ts"
        "utils/sse-test-utils.ts"
    )
    
    for file in "${test_files[@]}"; do
        if [[ -f "$file" ]]; then
            print_status $GREEN "✅ $file exists"
        else
            print_status $RED "❌ $file missing"
            exit 1
        fi
    done
    
    for file in "${utils_files[@]}"; do
        if [[ -f "$file" ]]; then
            print_status $GREEN "✅ $file exists"
        else
            print_status $RED "❌ $file missing"
            exit 1
        fi
    done
    
    print_status $GREEN "✅ Test structure validated"
}

# Run specific test suite
run_test_suite() {
    local suite_name=$1
    local suite_file=$2
    
    print_status $BLUE "🧪 Running $suite_name tests..."
    
    if npx playwright test "$suite_file" --reporter=line; then
        print_status $GREEN "✅ $suite_name tests passed"
        return 0
    else
        print_status $RED "❌ $suite_name tests failed"
        return 1
    fi
}

# Run all test suites
run_all_tests() {
    print_status $BLUE "🚀 Running comprehensive SSE connection test suite..."
    
    local test_suites=(
        "Connection Establishment:01-connection-establishment.spec.ts"
        "Real-Time Streaming:02-real-time-streaming.spec.ts"
        "Connection Retry & Recovery:03-connection-retry-recovery.spec.ts"
        "Multiple Concurrent Connections:04-multiple-concurrent-connections.spec.ts"
        "Resource Cleanup & Management:05-resource-cleanup-management.spec.ts"
    )
    
    local passed_suites=0
    local total_suites=${#test_suites[@]}
    local failed_suites=()
    
    for suite in "${test_suites[@]}"; do
        IFS=':' read -r suite_name suite_file <<< "$suite"
        
        print_status $YELLOW "▶️  Starting: $suite_name"
        
        if run_test_suite "$suite_name" "$suite_file"; then
            ((passed_suites++))
        else
            failed_suites+=("$suite_name")
        fi
        
        print_status $BLUE "⏸️  Pausing between test suites..."
        sleep 3
    done
    
    # Summary
    print_status $BLUE "📊 Test Suite Summary"
    print_status $BLUE "===================="
    print_status $GREEN "✅ Passed: $passed_suites/$total_suites test suites"
    
    if [[ ${#failed_suites[@]} -gt 0 ]]; then
        print_status $RED "❌ Failed test suites:"
        for failed_suite in "${failed_suites[@]}"; do
            print_status $RED "   - $failed_suite"
        done
        return 1
    else
        print_status $GREEN "🎉 All SSE connection tests passed!"
        return 0
    fi
}

# Generate comprehensive report
generate_report() {
    print_status $BLUE "📋 Generating comprehensive test report..."
    
    # Run tests with HTML reporter
    npx playwright test --reporter=html --output-dir=sse-connection-report
    
    print_status $GREEN "✅ Report generated: sse-connection-report/index.html"
}

# Main execution
main() {
    local command=${1:-"all"}
    
    case $command in
        "check")
            check_services
            ;;
        "install")
            install_deps
            ;;
        "validate")
            validate_test_structure
            ;;
        "connection-establishment")
            check_services
            run_test_suite "Connection Establishment" "01-connection-establishment.spec.ts"
            ;;
        "real-time-streaming")
            check_services
            run_test_suite "Real-Time Streaming" "02-real-time-streaming.spec.ts"
            ;;
        "retry-recovery")
            check_services
            run_test_suite "Connection Retry & Recovery" "03-connection-retry-recovery.spec.ts"
            ;;
        "concurrent-connections")
            check_services
            run_test_suite "Multiple Concurrent Connections" "04-multiple-concurrent-connections.spec.ts"
            ;;
        "resource-cleanup")
            check_services
            run_test_suite "Resource Cleanup & Management" "05-resource-cleanup-management.spec.ts"
            ;;
        "report")
            check_services
            generate_report
            ;;
        "all")
            check_services
            validate_test_structure
            run_all_tests
            ;;
        "help")
            echo "Usage: $0 [command]"
            echo ""
            echo "Commands:"
            echo "  all                    Run all SSE connection tests (default)"
            echo "  check                  Check if required services are running"
            echo "  install               Install test dependencies"
            echo "  validate              Validate test structure"
            echo "  connection-establishment    Run connection establishment tests"
            echo "  real-time-streaming    Run real-time streaming tests"
            echo "  retry-recovery         Run connection retry & recovery tests"
            echo "  concurrent-connections Run multiple concurrent connection tests"
            echo "  resource-cleanup       Run resource cleanup & management tests"
            echo "  report                Generate comprehensive HTML report"
            echo "  help                  Show this help message"
            ;;
        *)
            print_status $RED "❌ Unknown command: $command"
            print_status $YELLOW "💡 Use '$0 help' for usage information"
            exit 1
            ;;
    esac
}

# Execute main function
main "$@"