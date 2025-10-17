#!/bin/bash
################################################################################
# Meta-Agents Protected Config Test Runner
#
# Executes comprehensive test suite for meta-agent and meta-update-agent
# protected configuration capabilities.
#
# Usage:
#   ./run-meta-agents-tests.sh [--watch] [--coverage] [--verbose]
#
# Options:
#   --watch      Run tests in watch mode
#   --coverage   Generate coverage report
#   --verbose    Enable verbose output
#   --help       Show this help message
################################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

# Configuration
TEST_FILE="$SCRIPT_DIR/meta-agents-protected-config.test.ts"
JEST_CONFIG="$PROJECT_ROOT/jest.config.cjs"
RESULTS_DIR="$SCRIPT_DIR/results"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RESULTS_FILE="$RESULTS_DIR/test-results-$TIMESTAMP.txt"

# Test options
WATCH_MODE=false
COVERAGE_MODE=false
VERBOSE_MODE=false

################################################################################
# Functions
################################################################################

print_header() {
  echo ""
  echo -e "${BLUE}═══════════════════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}  Meta-Agents Protected Config Test Suite${NC}"
  echo -e "${BLUE}═══════════════════════════════════════════════════════════════════${NC}"
  echo ""
}

print_section() {
  echo ""
  echo -e "${YELLOW}▶ $1${NC}"
  echo ""
}

print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
  echo -e "${RED}✗ $1${NC}"
}

print_info() {
  echo -e "${BLUE}ℹ $1${NC}"
}

show_help() {
  cat << EOF
Meta-Agents Protected Config Test Runner

Usage: $0 [OPTIONS]

Options:
  --watch      Run tests in watch mode
  --coverage   Generate coverage report
  --verbose    Enable verbose output
  --help       Show this help message

Examples:
  $0                    # Run tests once
  $0 --watch            # Run tests in watch mode
  $0 --coverage         # Run tests with coverage
  $0 --verbose --coverage  # Verbose with coverage

Test Categories:
  1. Meta-Agent Protected Config Creation
  2. Meta-Update-Agent Protected Config Updates
  3. Field Classification
  4. SHA-256 Checksum Computation
  5. IntegrityChecker Integration
  6. Template Validation

EOF
  exit 0
}

parse_arguments() {
  while [[ $# -gt 0 ]]; do
    case $1 in
      --watch)
        WATCH_MODE=true
        shift
        ;;
      --coverage)
        COVERAGE_MODE=true
        shift
        ;;
      --verbose)
        VERBOSE_MODE=true
        shift
        ;;
      --help)
        show_help
        ;;
      *)
        print_error "Unknown option: $1"
        echo "Use --help for usage information"
        exit 1
        ;;
    esac
  done
}

check_dependencies() {
  print_section "Checking Dependencies"

  # Check Node.js
  if ! command -v node &> /dev/null; then
    print_error "Node.js not found. Please install Node.js."
    exit 1
  fi
  print_success "Node.js: $(node --version)"

  # Check npm
  if ! command -v npm &> /dev/null; then
    print_error "npm not found. Please install npm."
    exit 1
  fi
  print_success "npm: $(npm --version)"

  # Check Jest
  if [ ! -f "$PROJECT_ROOT/node_modules/.bin/jest" ]; then
    print_error "Jest not found. Running npm install..."
    cd "$PROJECT_ROOT" && npm install
  fi
  print_success "Jest: installed"

  # Check test file exists
  if [ ! -f "$TEST_FILE" ]; then
    print_error "Test file not found: $TEST_FILE"
    exit 1
  fi
  print_success "Test file: found"

  # Check utilities file exists
  if [ ! -f "$SCRIPT_DIR/meta-agents-test-utils.ts" ]; then
    print_error "Test utilities not found: meta-agents-test-utils.ts"
    exit 1
  fi
  print_success "Test utilities: found"
}

setup_test_environment() {
  print_section "Setting Up Test Environment"

  # Create results directory
  mkdir -p "$RESULTS_DIR"
  print_success "Results directory: $RESULTS_DIR"

  # Create test workspace directories
  mkdir -p "/workspaces/agent-feed/prod/agent_workspace/test-agents"
  mkdir -p "/workspaces/agent-feed/prod/agent_workspace/test-agents/backups"
  print_success "Test workspace directories created"

  # Ensure .system directory exists
  mkdir -p "/workspaces/agent-feed/prod/.claude/agents/.system"
  print_success ".system directory verified"
}

run_tests() {
  print_section "Running Tests"

  # Build Jest command
  JEST_CMD="$PROJECT_ROOT/node_modules/.bin/jest"
  JEST_ARGS=(
    "--config=$JEST_CONFIG"
    "--testPathPattern=$TEST_FILE"
    "--runInBand"  # Run tests serially for file system operations
    "--detectOpenHandles"
  )

  if [ "$WATCH_MODE" = true ]; then
    JEST_ARGS+=("--watch")
  fi

  if [ "$COVERAGE_MODE" = true ]; then
    JEST_ARGS+=("--coverage")
    JEST_ARGS+=("--coverageDirectory=$RESULTS_DIR/coverage")
  fi

  if [ "$VERBOSE_MODE" = true ]; then
    JEST_ARGS+=("--verbose")
  fi

  # Run tests
  print_info "Executing: $JEST_CMD ${JEST_ARGS[*]}"
  echo ""

  if "$JEST_CMD" "${JEST_ARGS[@]}" 2>&1 | tee "$RESULTS_FILE"; then
    print_success "Tests passed!"
    return 0
  else
    print_error "Tests failed!"
    return 1
  fi
}

generate_summary() {
  print_section "Test Summary"

  # Parse results
  if [ -f "$RESULTS_FILE" ]; then
    echo "Results saved to: $RESULTS_FILE"
    echo ""

    # Extract key metrics
    if grep -q "Test Suites:" "$RESULTS_FILE"; then
      grep "Test Suites:" "$RESULTS_FILE"
      grep "Tests:" "$RESULTS_FILE"
      grep "Time:" "$RESULTS_FILE" || true
    fi

    echo ""
    echo "Test Categories Covered:"
    echo "  ✓ Meta-Agent Protected Config Creation (8 tests)"
    echo "  ✓ Meta-Update-Agent Protected Config Updates (7 tests)"
    echo "  ✓ Field Classification (4 tests)"
    echo "  ✓ SHA-256 Checksum Computation (7 tests)"
    echo "  ✓ IntegrityChecker Integration (2 tests)"
    echo "  ✓ Template Validation (4 tests)"
    echo ""
    echo "Total: 32+ comprehensive integration tests"
  fi

  if [ "$COVERAGE_MODE" = true ]; then
    echo ""
    print_info "Coverage report: $RESULTS_DIR/coverage/lcov-report/index.html"
  fi
}

cleanup_test_artifacts() {
  print_section "Cleaning Up Test Artifacts"

  # Note: Test suite handles cleanup via TestCleanup.cleanupAll()
  # This just removes any leftover test directories

  if [ -d "/workspaces/agent-feed/prod/agent_workspace/test-agents" ]; then
    # Don't delete the directory, just clean test files
    find "/workspaces/agent-feed/prod/agent_workspace/test-agents" -name "test-*" -type f -delete 2>/dev/null || true
    find "/workspaces/agent-feed/prod/agent_workspace/test-agents" -name "test-*" -type d -exec rm -rf {} + 2>/dev/null || true
    print_success "Test workspace cleaned"
  fi

  # Clean test agent files
  find "/workspaces/agent-feed/prod/.claude/agents" -name "test-*.md" -delete 2>/dev/null || true
  print_success "Test agent files cleaned"

  # Clean test protected configs (carefully!)
  find "/workspaces/agent-feed/prod/.claude/agents/.system" -name "test-*.protected.yaml" -exec chmod 644 {} \; 2>/dev/null || true
  find "/workspaces/agent-feed/prod/.claude/agents/.system" -name "test-*.protected.yaml" -delete 2>/dev/null || true
  print_success "Test protected configs cleaned"
}

################################################################################
# Main Execution
################################################################################

main() {
  print_header

  # Parse command line arguments
  parse_arguments "$@"

  # Setup
  check_dependencies
  setup_test_environment

  # Run tests
  if run_tests; then
    TEST_STATUS=0
  else
    TEST_STATUS=1
  fi

  # Generate summary (skip in watch mode)
  if [ "$WATCH_MODE" = false ]; then
    generate_summary
    cleanup_test_artifacts
  fi

  # Exit with test status
  if [ $TEST_STATUS -eq 0 ]; then
    echo ""
    print_success "All tests completed successfully!"
    echo ""
    exit 0
  else
    echo ""
    print_error "Some tests failed. Check results for details."
    echo ""
    exit 1
  fi
}

# Run main function
main "$@"
