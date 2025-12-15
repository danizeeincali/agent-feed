#!/bin/bash

###############################################################################
# Page Verification Agent - Test Runner Script
###############################################################################
#
# This script provides convenient commands to run the Page Verification
# test suite with various configurations.
#
# Usage:
#   ./run-tests.sh [command] [options]
#
# Commands:
#   all              - Run all tests
#   sidebar          - Run sidebar navigation tests only
#   rendering        - Run component rendering tests only
#   interactive      - Run interactive elements tests only
#   visual           - Run visual regression tests only
#   update-baselines - Update visual regression baselines
#   report           - Generate and open HTML report
#   debug            - Run in debug mode
#   ui               - Run in UI mode
#   ci               - Run in CI mode (headless, retries, parallel)
#
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TEST_FILE="page-verification.spec.ts"
SCREENSHOT_DIR="../screenshots/page-verification"
REPORT_DIR="../../../../playwright-report"

# Print banner
print_banner() {
    echo -e "${BLUE}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                                                               ║"
    echo "║         Layer 2: Page Verification Agent Test Suite          ║"
    echo "║                                                               ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Print usage
print_usage() {
    echo -e "${YELLOW}Usage:${NC}"
    echo "  ./run-tests.sh [command] [options]"
    echo ""
    echo -e "${YELLOW}Commands:${NC}"
    echo "  all              - Run all tests (default)"
    echo "  sidebar          - Run sidebar navigation tests only"
    echo "  rendering        - Run component rendering tests only"
    echo "  interactive      - Run interactive elements tests only"
    echo "  visual           - Run visual regression tests only"
    echo "  update-baselines - Update visual regression baselines"
    echo "  report           - Generate and open HTML report"
    echo "  debug            - Run in debug mode"
    echo "  ui               - Run in UI mode"
    echo "  ci               - Run in CI mode"
    echo "  clean            - Clean screenshots and reports"
    echo ""
    echo -e "${YELLOW}Examples:${NC}"
    echo "  ./run-tests.sh all"
    echo "  ./run-tests.sh sidebar --headed"
    echo "  ./run-tests.sh visual --update-snapshots"
    echo ""
}

# Create screenshot directory
setup_directories() {
    mkdir -p "$SCREENSHOT_DIR"
    echo -e "${GREEN}✓${NC} Screenshot directory ready: $SCREENSHOT_DIR"
}

# Run all tests
run_all_tests() {
    echo -e "${BLUE}Running all Page Verification tests...${NC}"
    npx playwright test "$TEST_FILE" "$@"
}

# Run sidebar tests
run_sidebar_tests() {
    echo -e "${BLUE}Running Sidebar Navigation tests...${NC}"
    npx playwright test "$TEST_FILE" --grep "Sidebar Navigation" "$@"
}

# Run rendering tests
run_rendering_tests() {
    echo -e "${BLUE}Running Component Rendering tests...${NC}"
    npx playwright test "$TEST_FILE" --grep "Component Rendering" "$@"
}

# Run interactive tests
run_interactive_tests() {
    echo -e "${BLUE}Running Interactive Elements tests...${NC}"
    npx playwright test "$TEST_FILE" --grep "Interactive Elements" "$@"
}

# Run visual regression tests
run_visual_tests() {
    echo -e "${BLUE}Running Visual Regression tests...${NC}"
    npx playwright test "$TEST_FILE" --grep "Visual Regression" "$@"
}

# Update visual baselines
update_baselines() {
    echo -e "${YELLOW}Updating visual regression baselines...${NC}"
    npx playwright test "$TEST_FILE" --grep "Visual Regression" --update-snapshots "$@"
    echo -e "${GREEN}✓${NC} Baselines updated"
}

# Run in debug mode
run_debug() {
    echo -e "${BLUE}Running in debug mode...${NC}"
    npx playwright test "$TEST_FILE" --debug "$@"
}

# Run in UI mode
run_ui() {
    echo -e "${BLUE}Running in UI mode...${NC}"
    npx playwright test "$TEST_FILE" --ui "$@"
}

# Run in CI mode
run_ci() {
    echo -e "${BLUE}Running in CI mode...${NC}"
    npx playwright test "$TEST_FILE" \
        --reporter=html \
        --reporter=json \
        --reporter=junit \
        --workers=2 \
        --retries=3 \
        --output=test-results \
        "$@"
}

# Generate and open report
generate_report() {
    echo -e "${BLUE}Generating HTML report...${NC}"

    if [ -d "$REPORT_DIR" ]; then
        npx playwright show-report
    else
        echo -e "${YELLOW}⚠${NC} No report found. Run tests first."
        echo "Run: ./run-tests.sh all"
    fi
}

# Clean screenshots and reports
clean() {
    echo -e "${YELLOW}Cleaning screenshots and reports...${NC}"

    if [ -d "$SCREENSHOT_DIR" ]; then
        rm -rf "$SCREENSHOT_DIR"
        echo -e "${GREEN}✓${NC} Deleted screenshots"
    fi

    if [ -d "$REPORT_DIR" ]; then
        rm -rf "$REPORT_DIR"
        echo -e "${GREEN}✓${NC} Deleted reports"
    fi

    if [ -d "test-results" ]; then
        rm -rf test-results
        echo -e "${GREEN}✓${NC} Deleted test results"
    fi

    echo -e "${GREEN}✓${NC} Cleanup complete"
}

# Show test summary
show_summary() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}Test Execution Complete${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo ""
    echo "Screenshots: $SCREENSHOT_DIR"
    echo "HTML Report: Run './run-tests.sh report' to view"
    echo ""
}

# Main execution
main() {
    print_banner
    setup_directories

    # Get command (default to 'all')
    COMMAND="${1:-all}"
    shift || true  # Remove first argument, ignore error if no args

    # Execute command
    case "$COMMAND" in
        all)
            run_all_tests "$@"
            show_summary
            ;;
        sidebar)
            run_sidebar_tests "$@"
            show_summary
            ;;
        rendering)
            run_rendering_tests "$@"
            show_summary
            ;;
        interactive)
            run_interactive_tests "$@"
            show_summary
            ;;
        visual)
            run_visual_tests "$@"
            show_summary
            ;;
        update-baselines)
            update_baselines "$@"
            ;;
        debug)
            run_debug "$@"
            ;;
        ui)
            run_ui "$@"
            ;;
        ci)
            run_ci "$@"
            show_summary
            ;;
        report)
            generate_report
            ;;
        clean)
            clean
            ;;
        help|--help|-h)
            print_usage
            ;;
        *)
            echo -e "${RED}Error: Unknown command '$COMMAND'${NC}"
            echo ""
            print_usage
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
