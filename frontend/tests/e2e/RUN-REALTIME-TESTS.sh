#!/bin/bash

##############################################################################
# Real-time Comment E2E Tests - Quick Run Script
##############################################################################
#
# This script provides easy commands to run the real-time comment tests
#
# Usage:
#   ./RUN-REALTIME-TESTS.sh          # Run all tests
#   ./RUN-REALTIME-TESTS.sh ui       # Run in UI mode
#   ./RUN-REALTIME-TESTS.sh debug    # Run in debug mode
#   ./RUN-REALTIME-TESTS.sh specific "test name"  # Run specific test
#
##############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
FRONTEND_DIR="$( cd "$SCRIPT_DIR/../.." && pwd )"

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║      Real-time Comment E2E Tests - Playwright            ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if we're in the right directory
if [ ! -f "$FRONTEND_DIR/package.json" ]; then
    echo -e "${RED}❌ Error: Could not find package.json${NC}"
    echo -e "${RED}   Please run this script from the frontend directory${NC}"
    exit 1
fi

# Check if servers are running
check_servers() {
    echo -e "${YELLOW}🔍 Checking if servers are running...${NC}"

    # Check backend (port 3001)
    if ! curl -s http://localhost:3001/health > /dev/null 2>&1; then
        echo -e "${RED}❌ Backend server is not running on port 3001${NC}"
        echo -e "${YELLOW}   Please start backend:${NC}"
        echo -e "   cd /workspaces/agent-feed/api-server && npm run dev"
        exit 1
    else
        echo -e "${GREEN}✅ Backend server is running on port 3001${NC}"
    fi

    # Check frontend (port 5173)
    if ! curl -s http://localhost:5173 > /dev/null 2>&1; then
        echo -e "${RED}❌ Frontend server is not running on port 5173${NC}"
        echo -e "${YELLOW}   Please start frontend:${NC}"
        echo -e "   cd /workspaces/agent-feed/frontend && npm run dev"
        exit 1
    else
        echo -e "${GREEN}✅ Frontend server is running on port 5173${NC}"
    fi

    echo ""
}

# Check Playwright installation
check_playwright() {
    echo -e "${YELLOW}🔍 Checking Playwright installation...${NC}"

    if [ ! -d "$HOME/.cache/ms-playwright/chromium-1193" ]; then
        echo -e "${RED}❌ Playwright Chromium not installed${NC}"
        echo -e "${YELLOW}   Installing Chromium...${NC}"
        cd "$FRONTEND_DIR" && npx playwright install chromium
    else
        echo -e "${GREEN}✅ Playwright Chromium is installed${NC}"
    fi

    echo ""
}

# Create screenshots directory
create_dirs() {
    mkdir -p "$FRONTEND_DIR/tests/screenshots"
    mkdir -p "$FRONTEND_DIR/tests/test-results/realtime-report"
}

# Run tests
run_tests() {
    MODE=${1:-"standard"}
    FILTER=${2:-""}

    cd "$FRONTEND_DIR"

    case $MODE in
        "ui")
            echo -e "${BLUE}🚀 Running tests in UI mode...${NC}"
            echo -e "${YELLOW}   (Playwright Test UI will open)${NC}"
            echo ""
            npx playwright test --config=playwright.realtime.config.js --ui
            ;;

        "debug")
            echo -e "${BLUE}🐛 Running tests in debug mode...${NC}"
            echo -e "${YELLOW}   (Browser will open with step-by-step debugger)${NC}"
            echo ""
            npx playwright test --config=playwright.realtime.config.js --debug
            ;;

        "headed")
            echo -e "${BLUE}👁️  Running tests in headed mode...${NC}"
            echo -e "${YELLOW}   (You will see the browser)${NC}"
            echo ""
            npx playwright test --config=playwright.realtime.config.js --headed --timeout=30000
            ;;

        "specific")
            if [ -z "$FILTER" ]; then
                echo -e "${RED}❌ Error: Please provide test name${NC}"
                echo -e "${YELLOW}   Example: ./RUN-REALTIME-TESTS.sh specific \"WebSocket connection\"${NC}"
                exit 1
            fi
            echo -e "${BLUE}🎯 Running specific test: ${FILTER}${NC}"
            echo ""
            npx playwright test --config=playwright.realtime.config.js -g "$FILTER" --reporter=list --timeout=30000
            ;;

        "websocket-only")
            echo -e "${BLUE}🔌 Running WebSocket connection test only...${NC}"
            echo ""
            npx playwright test --config=playwright.realtime.config.js -g "WebSocket connection status" --reporter=list --timeout=30000
            ;;

        *)
            echo -e "${BLUE}🧪 Running all real-time comment tests...${NC}"
            echo ""
            npx playwright test --config=playwright.realtime.config.js --reporter=list --timeout=30000
            ;;
    esac
}

# Show test results
show_results() {
    echo ""
    echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║                    Test Results                          ║${NC}"
    echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
    echo ""

    # Check for screenshots
    if [ -d "$FRONTEND_DIR/tests/screenshots" ] && [ "$(ls -A $FRONTEND_DIR/tests/screenshots 2>/dev/null)" ]; then
        echo -e "${GREEN}📸 Screenshots saved:${NC}"
        ls -lh "$FRONTEND_DIR/tests/screenshots/"
        echo ""
    fi

    # Check for HTML report
    if [ -d "$FRONTEND_DIR/tests/test-results/realtime-report" ]; then
        echo -e "${GREEN}📊 HTML Report available:${NC}"
        echo -e "   npx playwright show-report $FRONTEND_DIR/tests/test-results/realtime-report"
        echo ""
    fi

    # Check for JSON results
    if [ -f "$FRONTEND_DIR/tests/test-results/realtime-results.json" ]; then
        echo -e "${GREEN}📋 JSON Results:${NC}"
        echo -e "   cat $FRONTEND_DIR/tests/test-results/realtime-results.json | jq"
        echo ""
    fi
}

# Main execution
main() {
    check_servers
    check_playwright
    create_dirs

    # Parse command line arguments
    MODE=${1:-"standard"}
    FILTER=${2:-""}

    run_tests "$MODE" "$FILTER"

    show_results

    echo -e "${GREEN}✨ Test execution complete!${NC}"
    echo ""
}

# Help message
show_help() {
    echo ""
    echo -e "${BLUE}Usage:${NC}"
    echo "  $0                                  # Run all tests"
    echo "  $0 ui                               # Open UI mode (interactive)"
    echo "  $0 debug                            # Run in debug mode (step-by-step)"
    echo "  $0 headed                           # Show browser while testing"
    echo "  $0 websocket-only                   # Run only WebSocket connection test"
    echo "  $0 specific \"test name\"             # Run specific test by name"
    echo ""
    echo -e "${BLUE}Examples:${NC}"
    echo "  $0 specific \"comment appears immediately\""
    echo "  $0 specific \"multi-client sync\""
    echo "  $0 specific \"AVI reply\""
    echo "  $0 specific \"WebSocket connection status\""
    echo "  $0 specific \"comment counter\""
    echo ""
    echo -e "${BLUE}Test Files:${NC}"
    echo "  Test Suite:     $FRONTEND_DIR/tests/e2e/realtime-comments.spec.ts"
    echo "  Configuration:  $FRONTEND_DIR/playwright.realtime.config.js"
    echo "  Documentation:  $FRONTEND_DIR/tests/e2e/README-REALTIME-COMMENTS-TESTS.md"
    echo ""
    echo -e "${BLUE}Prerequisites:${NC}"
    echo "  - Backend server running on http://localhost:3001"
    echo "  - Frontend server running on http://localhost:5173"
    echo "  - Playwright Chromium installed (auto-installed if missing)"
    echo ""
}

# Check for help flag
if [ "$1" == "--help" ] || [ "$1" == "-h" ]; then
    show_help
    exit 0
fi

# Run main
main "$@"
