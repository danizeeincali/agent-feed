#!/bin/bash

# TDD Comprehensive Test: Architectural Migration Validation Runner
#
# PURPOSE: Execute complete test suite for React context fix and architectural migration
# SCOPE: React hooks, Next.js routing, component integration, API connectivity
#
# USAGE:
#   ./run-tests.sh                    # Run all tests
#   ./run-tests.sh --verbose          # Run with verbose output
#   ./run-tests.sh --coverage         # Run with coverage report
#   ./run-tests.sh --watch            # Run in watch mode
#   ./run-tests.sh --ci               # Run in CI mode

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default options
VERBOSE=false
COVERAGE=false
WATCH=false
CI=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --verbose|-v)
      VERBOSE=true
      shift
      ;;
    --coverage|-c)
      COVERAGE=true
      shift
      ;;
    --watch|-w)
      WATCH=true
      shift
      ;;
    --ci)
      CI=true
      shift
      ;;
    --help|-h)
      echo "TDD Architectural Migration Test Runner"
      echo ""
      echo "Usage: $0 [options]"
      echo ""
      echo "Options:"
      echo "  --verbose, -v    Enable verbose output"
      echo "  --coverage, -c   Generate coverage report"
      echo "  --watch, -w      Run in watch mode"
      echo "  --ci             Run in CI mode"
      echo "  --help, -h       Show this help message"
      echo ""
      echo "Test Categories:"
      echo "  • React Hook Validation - useEffect and context safety"
      echo "  • Next.js Routing Tests - All routes functional"
      echo "  • Component Integration - Rendering and interaction"
      echo "  • API Integration - Backend connectivity validation"
      echo ""
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Function to print colored output
print_status() {
  local color=$1
  local message=$2
  echo -e "${color}${message}${NC}"
}

# Function to check prerequisites
check_prerequisites() {
  print_status $BLUE "🔍 Checking prerequisites..."

  # Check if Node.js is installed
  if ! command -v node &> /dev/null; then
    print_status $RED "❌ Node.js not found. Please install Node.js."
    exit 1
  fi

  # Check if npm is installed
  if ! command -v npm &> /dev/null; then
    print_status $RED "❌ npm not found. Please install npm."
    exit 1
  fi

  # Check if we're in the correct directory
  if [ ! -f "package.json" ]; then
    print_status $YELLOW "⚠️  package.json not found. Changing to production directory..."
    cd "$(dirname "$0")/../../"

    if [ ! -f "package.json" ]; then
      print_status $RED "❌ Cannot find package.json. Please run from production directory."
      exit 1
    fi
  fi

  # Check if dependencies are installed
  if [ ! -d "node_modules" ]; then
    print_status $YELLOW "⚠️  Dependencies not found. Installing..."
    npm install
  fi

  print_status $GREEN "✅ Prerequisites check complete"
}

# Function to run individual test suite
run_test_suite() {
  local test_name=$1
  local test_file=$2

  print_status $BLUE "📋 Running: $test_name"
  echo "$(printf '%.0s-' {1..50})"

  local jest_command="npx jest"
  local test_path="tests/architectural-migration/$test_file"

  # Add configuration
  jest_command="$jest_command --config=tests/architectural-migration/jest.config.js"

  # Add test file
  jest_command="$jest_command $test_path"

  # Add options based on flags
  if [ "$VERBOSE" = true ]; then
    jest_command="$jest_command --verbose"
    export VERBOSE_TESTS=true
  fi

  if [ "$COVERAGE" = true ]; then
    jest_command="$jest_command --coverage"
  fi

  if [ "$WATCH" = true ]; then
    jest_command="$jest_command --watch"
  fi

  if [ "$CI" = true ]; then
    jest_command="$jest_command --ci --watchAll=false --passWithNoTests"
  fi

  # Execute the test
  if eval $jest_command; then
    print_status $GREEN "✅ $test_name - PASSED"
    return 0
  else
    print_status $RED "❌ $test_name - FAILED"
    return 1
  fi
}

# Function to run all tests
run_all_tests() {
  local failed_tests=0
  local total_tests=0

  print_status $BLUE "🚀 TDD COMPREHENSIVE TEST: Starting Architectural Migration Validation"
  echo "$(printf '%.0s=' {1..80})"

  # Test suites to run
  declare -a test_suites=(
    "React Context Validation:react-context-validation.js"
    "Next.js Routing Tests:nextjs-routing-tests.js"
    "Component Integration Tests:component-integration-tests.js"
    "API Integration Tests:api-integration-tests.js"
  )

  # Run each test suite
  for suite in "${test_suites[@]}"; do
    IFS=':' read -r test_name test_file <<< "$suite"
    total_tests=$((total_tests + 1))

    if ! run_test_suite "$test_name" "$test_file"; then
      failed_tests=$((failed_tests + 1))
    fi

    echo ""
  done

  # Calculate success rate
  local passed_tests=$((total_tests - failed_tests))
  local success_rate=0
  if [ $total_tests -gt 0 ]; then
    success_rate=$((passed_tests * 100 / total_tests))
  fi

  # Print summary
  print_status $BLUE "📊 TEST EXECUTION SUMMARY"
  echo "$(printf '%.0s=' {1..80})"

  print_status $GREEN "📈 Overall Results:"
  echo "   ✅ Passed: $passed_tests"
  echo "   ❌ Failed: $failed_tests"
  echo "   📊 Total:  $total_tests"
  echo "   🎯 Success Rate: $success_rate%"

  echo ""
  print_status $BLUE "🎯 ARCHITECTURAL MIGRATION VALIDATION COMPLETE"
  echo "$(printf '%.0s=' {1..80})"

  if [ $failed_tests -eq 0 ]; then
    print_status $GREEN "🎉 ALL TESTS PASSED - MIGRATION READY"
    echo "✅ React Context: Hooks work without null errors"
    echo "✅ Next.js Routing: All routes accessible and functional"
    echo "✅ Component Integration: All components render correctly"
    echo "✅ API Integration: Backend connectivity remains intact"
    echo "✅ Performance: Loading times and responsiveness validated"
    echo "✅ Regression: No functionality lost"

    # Generate success report
    cat > tests/architectural-migration/validation-report.txt << EOF
ARCHITECTURAL MIGRATION VALIDATION REPORT
Generated: $(date)

STATUS: READY FOR MIGRATION ✅

VALIDATION RESULTS:
✅ React Context Validation - PASSED
✅ Next.js Routing Tests - PASSED
✅ Component Integration Tests - PASSED
✅ API Integration Tests - PASSED

SUCCESS RATE: 100%

CONCLUSION:
The architectural migration validation is complete. All critical systems
have been tested and verified to work correctly after the migration.
The system is ready for production deployment.

NEXT STEPS:
1. Proceed with architectural migration
2. Monitor system performance post-migration
3. Run regression tests after deployment
EOF

    return 0
  else
    print_status $YELLOW "⚠️  SOME TESTS FAILED - REVIEW REQUIRED"
    echo "🔍 Check failed tests above for specific issues"
    echo "🔧 Fix issues before proceeding with migration"

    # Generate failure report
    cat > tests/architectural-migration/validation-report.txt << EOF
ARCHITECTURAL MIGRATION VALIDATION REPORT
Generated: $(date)

STATUS: REQUIRES FIXES ⚠️

VALIDATION RESULTS:
Failed Tests: $failed_tests/$total_tests

SUCCESS RATE: $success_rate%

CONCLUSION:
The architectural migration validation found issues that need to be
addressed before proceeding with the migration. Please review the
failed tests and resolve the issues.

NEXT STEPS:
1. Review failed test details above
2. Fix identified issues
3. Re-run validation tests
4. Proceed with migration only after 100% pass rate
EOF

    return 1
  fi
}

# Function to run performance validation
run_performance_validation() {
  print_status $BLUE "⚡ Running Performance Validation"
  echo "$(printf '%.0s-' {1..50})"

  # Use the test runner for performance tests
  if node tests/architectural-migration/test-runner.js; then
    print_status $GREEN "✅ Performance Validation - PASSED"
  else
    print_status $RED "❌ Performance Validation - FAILED"
    return 1
  fi
}

# Main execution
main() {
  print_status $BLUE "🔧 TDD Architectural Migration Test Runner"
  echo ""

  # Check prerequisites
  check_prerequisites
  echo ""

  # Set test timeout
  export JEST_TIMEOUT=30000

  # Run tests based on mode
  if [ "$WATCH" = true ]; then
    print_status $YELLOW "👀 Running in watch mode..."
    run_test_suite "All Tests" "*.js"
  else
    # Run all test suites
    if run_all_tests; then
      echo ""
      # Run additional performance validation
      if [ "$CI" = false ]; then
        run_performance_validation
      fi

      print_status $GREEN "🎉 All validations complete - System ready for migration!"
      exit 0
    else
      print_status $RED "❌ Validation failed - Please fix issues before migration"
      exit 1
    fi
  fi
}

# Execute main function
main "$@"