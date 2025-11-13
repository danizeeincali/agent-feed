#!/bin/bash

###############################################################################
# Toast UI Feedback Validation Test Runner
#
# Executes TDD tests for toast notifications and "Analyzed by" badges
# with comprehensive health checks and reporting.
###############################################################################

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test configuration
BACKEND_URL="http://localhost:3001"
FRONTEND_URL="http://localhost:5173"
SCREENSHOT_DIR="docs/validation/screenshots/toast-ui-validation"
TEST_SPEC="tests/playwright/toast-ui-feedback-validation.spec.ts"

###############################################################################
# Helper Functions
###############################################################################

print_header() {
    echo -e "\n${BLUE}═══════════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════════${NC}\n"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

check_service() {
    local url=$1
    local name=$2

    if curl -s -o /dev/null -w "%{http_code}" "$url" | grep -q "200\|404"; then
        print_success "$name is running on $url"
        return 0
    else
        print_error "$name NOT running on $url"
        return 1
    fi
}

###############################################################################
# Pre-Flight Checks
###############################################################################

print_header "PRE-FLIGHT CHECKS"

print_info "Checking backend service..."
if check_service "$BACKEND_URL/api/health" "Backend"; then
    BACKEND_RUNNING=true
else
    BACKEND_RUNNING=false
    print_warning "Attempting to start backend..."
    # Note: Start command depends on your setup
fi

print_info "Checking frontend service..."
if check_service "$FRONTEND_URL" "Frontend"; then
    FRONTEND_RUNNING=true
else
    FRONTEND_RUNNING=false
    print_warning "Attempting to start frontend..."
    # Note: Start command depends on your setup
fi

if [[ "$BACKEND_RUNNING" == false ]] || [[ "$FRONTEND_RUNNING" == false ]]; then
    print_error "Required services not running. Please start backend and frontend manually."
    echo ""
    echo "Backend: cd /workspaces/agent-feed && npm run start:backend"
    echo "Frontend: cd /workspaces/agent-feed/frontend && npm run dev"
    exit 1
fi

###############################################################################
# Screenshot Directory Setup
###############################################################################

print_header "SCREENSHOT DIRECTORY SETUP"

if [ ! -d "$SCREENSHOT_DIR" ]; then
    mkdir -p "$SCREENSHOT_DIR"
    print_success "Created screenshot directory: $SCREENSHOT_DIR"
else
    print_info "Screenshot directory exists: $SCREENSHOT_DIR"
fi

###############################################################################
# Test Execution
###############################################################################

print_header "TEST EXECUTION"

print_info "Running Playwright tests..."
print_info "Test spec: $TEST_SPEC"
echo ""

# Run Playwright with custom config
if npx playwright test "$TEST_SPEC" \
    --config=playwright.config.toast-validation.cjs \
    --reporter=html \
    --reporter=list; then

    print_success "All tests passed!"
    TEST_RESULT="PASS"
else
    print_warning "Some tests failed (expected in TDD Red phase)"
    TEST_RESULT="FAIL"
fi

###############################################################################
# Test Summary
###############################################################################

print_header "TEST SUMMARY"

echo -e "${BLUE}Test Cases:${NC}"
echo "  TDD-1: Toast notification appears when agent responds"
echo "  TDD-2: Toast shows correct message format"
echo "  TDD-3: Toast auto-dismisses after 5 seconds"
echo "  TDD-4: \"Analyzed by Avi\" badge visible on agent comments"
echo "  TDD-5: Badge has correct styling"
echo "  TDD-6: No toast for user's own comments"
echo "  TDD-7: Multiple agent responses show multiple toasts"
echo ""

echo -e "${BLUE}Screenshots saved to:${NC} $SCREENSHOT_DIR"
echo ""

if [ -d "playwright-report" ]; then
    echo -e "${BLUE}HTML Report:${NC} playwright-report/index.html"
    echo ""
    print_info "To view report: npx playwright show-report"
fi

###############################################################################
# Result Badge
###############################################################################

if [[ "$TEST_RESULT" == "PASS" ]]; then
    echo -e "\n${GREEN}╔═══════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                           ║${NC}"
    echo -e "${GREEN}║     ✅  ALL TESTS PASSED  ✅              ║${NC}"
    echo -e "${GREEN}║                                           ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════╝${NC}\n"
    exit 0
else
    echo -e "\n${YELLOW}╔═══════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║                                           ║${NC}"
    echo -e "${YELLOW}║   ⚠️  TESTS FAILED (TDD Red Phase)  ⚠️   ║${NC}"
    echo -e "${YELLOW}║                                           ║${NC}"
    echo -e "${YELLOW}╚═══════════════════════════════════════════╝${NC}\n"

    print_info "This is expected in TDD approach - implementation needed"
    print_info "Next: Implement fixes to make tests pass (TDD Green phase)"
    exit 1
fi
