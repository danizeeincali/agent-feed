#!/bin/bash

###############################################################################
# Page Rendering Test Setup Validation Script
#
# This script validates that all prerequisites are met for running the
# page rendering E2E tests.
###############################################################################

set -e

echo "=========================================="
echo "Page Rendering Test Setup Validation"
echo "=========================================="
echo ""

ERRORS=0
WARNINGS=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
check_pass() {
    echo -e "${GREEN}✓${NC} $1"
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
    ((ERRORS++))
}

check_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARNINGS++))
}

echo "1. Checking Test Files..."
echo "----------------------------------------"

# Check test file exists
if [ -f "page-rendering-fix.spec.ts" ]; then
    check_pass "Test file exists: page-rendering-fix.spec.ts"
    LINES=$(wc -l < page-rendering-fix.spec.ts)
    echo "   File size: $LINES lines"
else
    check_fail "Test file NOT found: page-rendering-fix.spec.ts"
fi

# Check TypeScript config
if [ -f "tsconfig.json" ]; then
    check_pass "TypeScript config exists: tsconfig.json"
else
    check_warn "TypeScript config NOT found: tsconfig.json"
fi

# Check Playwright config
if [ -f "playwright.config.js" ]; then
    check_pass "Playwright config exists: playwright.config.js"
else
    check_fail "Playwright config NOT found: playwright.config.js"
fi

echo ""
echo "2. Checking Dependencies..."
echo "----------------------------------------"

# Check package.json
if [ -f "package.json" ]; then
    check_pass "package.json exists"

    # Check for Playwright
    if grep -q "@playwright/test" package.json; then
        check_pass "@playwright/test dependency found"
    else
        check_fail "@playwright/test dependency NOT found"
    fi
else
    check_fail "package.json NOT found"
fi

# Check node_modules
if [ -d "node_modules" ]; then
    check_pass "node_modules directory exists"
else
    check_warn "node_modules NOT found - run 'npm install'"
fi

# Check Playwright browsers
if [ -d "$HOME/.cache/ms-playwright" ] || [ -d "$HOME/Library/Caches/ms-playwright" ]; then
    check_pass "Playwright browsers installed"
else
    check_warn "Playwright browsers may not be installed - run 'npx playwright install'"
fi

echo ""
echo "3. Checking Directory Structure..."
echo "----------------------------------------"

# Check screenshots directory
if [ -d "screenshots/page-rendering-fix" ]; then
    check_pass "Screenshots directory exists: screenshots/page-rendering-fix"
else
    echo "   Creating screenshots directory..."
    mkdir -p screenshots/page-rendering-fix
    check_pass "Created screenshots directory: screenshots/page-rendering-fix"
fi

# Check results directory
if [ -d "results" ]; then
    check_pass "Results directory exists"
else
    check_warn "Results directory NOT found - will be created on first run"
fi

echo ""
echo "4. Checking Test Data..."
echo "----------------------------------------"

# Check for test page data
TEST_DATA_FILE="../data/agent-pages/personal-todos-agent-comprehensive-dashboard.json"
if [ -f "$TEST_DATA_FILE" ]; then
    check_pass "Test data file exists: $TEST_DATA_FILE"
    FILE_SIZE=$(stat -f%z "$TEST_DATA_FILE" 2>/dev/null || stat -c%s "$TEST_DATA_FILE" 2>/dev/null)
    echo "   File size: $FILE_SIZE bytes"
else
    check_fail "Test data file NOT found: $TEST_DATA_FILE"
fi

echo ""
echo "5. Checking Services..."
echo "----------------------------------------"

# Check if frontend is running
if curl -s -o /dev/null -w "%{http_code}" http://localhost:5173 | grep -q "200\|301\|302"; then
    check_pass "Frontend server is running on http://localhost:5173"
else
    check_warn "Frontend server NOT running on http://localhost:5173"
    echo "   Start with: cd ../../frontend && npm run dev"
fi

# Check if API is running
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001 | grep -q "200\|301\|302\|404"; then
    check_pass "API server is running on http://localhost:3001"
else
    check_warn "API server NOT running on http://localhost:3001"
    echo "   Start with: cd ../../api-server && npm run dev"
fi

# Check specific API endpoint
if curl -s "http://localhost:3001/api/agent-pages/agents/personal-todos-agent/pages/comprehensive-dashboard" | grep -q "success\|id\|title"; then
    check_pass "Test API endpoint is accessible"
else
    check_warn "Test API endpoint NOT accessible or returns error"
fi

echo ""
echo "6. Checking Database..."
echo "----------------------------------------"

# Check database file
DB_FILE="../data/agent-pages.db"
if [ -f "$DB_FILE" ]; then
    check_pass "Agent pages database exists: $DB_FILE"
    DB_SIZE=$(stat -f%z "$DB_FILE" 2>/dev/null || stat -c%s "$DB_FILE" 2>/dev/null)
    echo "   Database size: $DB_SIZE bytes"
else
    check_warn "Agent pages database NOT found: $DB_FILE"
fi

echo ""
echo "7. Test Scripts Available..."
echo "----------------------------------------"

echo "Available test commands:"
echo "  npm run test:rendering          - Run all rendering tests"
echo "  npm run test:rendering:headed   - Run with visible browser"
echo "  npm run test:rendering:debug    - Run with debugger"
echo "  npm run test:ui                 - Run with Playwright UI"
echo "  npm run test:report             - View HTML report"

echo ""
echo "=========================================="
echo "Validation Summary"
echo "=========================================="

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo ""
    echo "You can now run the tests:"
    echo "  npm run test:rendering"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ Validation completed with $WARNINGS warning(s)${NC}"
    echo ""
    echo "Tests may still run, but some features might not work optimally."
    echo "Review warnings above and fix if necessary."
    exit 0
else
    echo -e "${RED}✗ Validation failed with $ERRORS error(s) and $WARNINGS warning(s)${NC}"
    echo ""
    echo "Please fix the errors above before running tests."
    exit 1
fi
