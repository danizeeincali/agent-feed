#!/bin/bash

# Avi DM Test Suite Runner - London School TDD
# Comprehensive test execution with coverage reporting

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TEST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$TEST_DIR/../.." && pwd)"
COVERAGE_THRESHOLD=85
TEST_TIMEOUT=30000

# Print banner
echo -e "${BLUE}"
echo "=================================================="
echo "     Avi DM Test Suite - London School TDD      "
echo "=================================================="
echo -e "${NC}"

# Check dependencies
echo -e "${YELLOW}🔍 Checking dependencies...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi

# Navigate to project root
cd "$PROJECT_ROOT"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    npm install
fi

# Create test results directory
mkdir -p test-results

# Function to run specific test suite
run_test_suite() {
    local suite_name=$1
    local test_pattern=$2
    local description=$3

    echo -e "\n${BLUE}🧪 Running $description...${NC}"

    npx jest \
        --config="$PROJECT_ROOT/src/tests/jest.config.js" \
        --testPathPattern="$test_pattern" \
        --coverage \
        --coverageDirectory="$PROJECT_ROOT/coverage/$suite_name" \
        --testTimeout="$TEST_TIMEOUT" \
        --verbose \
        --runInBand \
        --detectOpenHandles \
        --forceExit

    local exit_code=$?

    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}✅ $description completed successfully${NC}"
    else
        echo -e "${RED}❌ $description failed with exit code $exit_code${NC}"
        return $exit_code
    fi
}

# Function to run all tests
run_all_tests() {
    echo -e "\n${BLUE}🚀 Running complete Avi DM test suite...${NC}"

    npx jest \
        --config="$PROJECT_ROOT/src/tests/jest.config.js" \
        --coverage \
        --coverageDirectory="$PROJECT_ROOT/coverage" \
        --testTimeout="$TEST_TIMEOUT" \
        --verbose \
        --detectOpenHandles \
        --forceExit

    return $?
}

# Function to generate coverage report
generate_coverage_report() {
    echo -e "\n${YELLOW}📊 Generating coverage report...${NC}"

    # Check if coverage directory exists
    if [ ! -d "$PROJECT_ROOT/coverage" ]; then
        echo -e "${RED}❌ Coverage data not found${NC}"
        return 1
    fi

    # Generate HTML report
    if [ -f "$PROJECT_ROOT/coverage/lcov.info" ]; then
        echo -e "${GREEN}✅ Coverage report generated at: coverage/lcov-report/index.html${NC}"
    fi

    # Check coverage thresholds
    if [ -f "$PROJECT_ROOT/coverage/coverage-summary.json" ]; then
        local coverage_pct=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$PROJECT_ROOT/coverage/coverage-summary.json')).total.lines.pct)")

        if (( $(echo "$coverage_pct >= $COVERAGE_THRESHOLD" | bc -l) )); then
            echo -e "${GREEN}✅ Coverage threshold met: $coverage_pct% >= $COVERAGE_THRESHOLD%${NC}"
        else
            echo -e "${RED}❌ Coverage threshold not met: $coverage_pct% < $COVERAGE_THRESHOLD%${NC}"
            return 1
        fi
    fi
}

# Function to run specific test types
run_unit_tests() {
    run_test_suite "unit" "tests/avi-dm/(AviDirectChat|AviPersonality|StateManagement)\.test\.tsx" "Unit Tests (Component Behavior)"
}

run_integration_tests() {
    run_test_suite "integration" "tests/avi-dm/(AviChatInterface\.integration|UserWorkflowIntegration)\.test\.tsx" "Integration Tests"
}

run_service_tests() {
    run_test_suite "service" "tests/avi-dm/(WebSocketCommunication|ErrorHandling)\.test\.tsx" "Service Tests"
}

run_mock_tests() {
    run_test_suite "mocks" "tests/mocks/.*\.test\.(ts|js)" "Mock Validation Tests"
}

# Function to run performance tests
run_performance_tests() {
    echo -e "\n${BLUE}⚡ Running performance tests...${NC}"

    # Set performance-specific timeout
    npx jest \
        --config="$PROJECT_ROOT/src/tests/jest.config.js" \
        --testNamePattern="Performance|performance|timing" \
        --testTimeout=60000 \
        --verbose
}

# Function to validate test setup
validate_test_setup() {
    echo -e "\n${YELLOW}🔧 Validating test setup...${NC}"

    local required_files=(
        "$PROJECT_ROOT/src/tests/jest.config.js"
        "$PROJECT_ROOT/src/tests/setup/jest-setup.ts"
        "$PROJECT_ROOT/src/tests/mocks/server.ts"
        "$PROJECT_ROOT/src/tests/mocks/avi-dm-service.mock.ts"
    )

    for file in "${required_files[@]}"; do
        if [ ! -f "$file" ]; then
            echo -e "${RED}❌ Required test file missing: $file${NC}"
            return 1
        fi
    done

    echo -e "${GREEN}✅ Test setup validation passed${NC}"
}

# Function to clean test artifacts
clean_test_artifacts() {
    echo -e "\n${YELLOW}🧹 Cleaning test artifacts...${NC}"

    rm -rf "$PROJECT_ROOT/coverage"
    rm -rf "$PROJECT_ROOT/test-results"
    rm -rf "$PROJECT_ROOT/.jest-cache"

    echo -e "${GREEN}✅ Test artifacts cleaned${NC}"
}

# Main execution logic
main() {
    local command=${1:-"all"}

    case $command in
        "validate")
            validate_test_setup
            ;;
        "clean")
            clean_test_artifacts
            ;;
        "unit")
            validate_test_setup && run_unit_tests
            ;;
        "integration")
            validate_test_setup && run_integration_tests
            ;;
        "service")
            validate_test_setup && run_service_tests
            ;;
        "mocks")
            validate_test_setup && run_mock_tests
            ;;
        "performance")
            validate_test_setup && run_performance_tests
            ;;
        "coverage")
            generate_coverage_report
            ;;
        "all")
            validate_test_setup && \
            run_all_tests && \
            generate_coverage_report
            ;;
        "watch")
            echo -e "${BLUE}👀 Running tests in watch mode...${NC}"
            npx jest \
                --config="$PROJECT_ROOT/src/tests/jest.config.js" \
                --watch \
                --verbose
            ;;
        "ci")
            echo -e "${BLUE}🤖 Running CI test suite...${NC}"
            validate_test_setup && \
            run_all_tests && \
            generate_coverage_report

            # Generate additional CI reports
            if [ -f "$PROJECT_ROOT/test-results/junit.xml" ]; then
                echo -e "${GREEN}✅ JUnit report generated${NC}"
            fi
            ;;
        "help")
            echo "Usage: $0 [command]"
            echo ""
            echo "Commands:"
            echo "  all          Run all tests (default)"
            echo "  unit         Run unit tests only"
            echo "  integration  Run integration tests only"
            echo "  service      Run service tests only"
            echo "  mocks        Run mock validation tests"
            echo "  performance  Run performance tests"
            echo "  coverage     Generate coverage report"
            echo "  watch        Run tests in watch mode"
            echo "  ci           Run CI test suite"
            echo "  validate     Validate test setup"
            echo "  clean        Clean test artifacts"
            echo "  help         Show this help message"
            ;;
        *)
            echo -e "${RED}❌ Unknown command: $command${NC}"
            echo "Use '$0 help' for usage information"
            exit 1
            ;;
    esac
}

# Error handling
trap 'echo -e "\n${RED}❌ Test execution interrupted${NC}"; exit 1' INT TERM

# Execute main function
main "$@"
exit_code=$?

# Final status
if [ $exit_code -eq 0 ]; then
    echo -e "\n${GREEN}🎉 Test execution completed successfully!${NC}"
else
    echo -e "\n${RED}💥 Test execution failed with exit code $exit_code${NC}"
fi

exit $exit_code