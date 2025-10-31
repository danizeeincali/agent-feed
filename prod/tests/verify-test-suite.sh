#!/bin/bash

echo "╔══════════════════════════════════════════════════════════════════════╗"
echo "║         SKILL DETECTION BUG FIX - TEST SUITE VERIFICATION            ║"
echo "╚══════════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track results
ALL_PASS=true

# Function to check file
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} Found: $1"
    else
        echo -e "${RED}✗${NC} Missing: $1"
        ALL_PASS=false
    fi
}

echo "Checking test files..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
check_file "/workspaces/agent-feed/prod/tests/unit/skill-detection-fix.test.js"
check_file "/workspaces/agent-feed/prod/tests/integration/simple-query-fix.test.js"
check_file "/workspaces/agent-feed/prod/tests/e2e/skill-detection-ui.spec.js"
check_file "/workspaces/agent-feed/prod/tests/e2e/playwright.config.js"

echo ""
echo "Checking documentation..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
check_file "/workspaces/agent-feed/prod/tests/TEST_SUITE_README.md"
check_file "/workspaces/agent-feed/prod/tests/QUICK_START.md"
check_file "/workspaces/agent-feed/prod/tests/TEST_EXECUTION_SUMMARY.txt"

echo ""
echo "Checking directories..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -d "/workspaces/agent-feed/prod/tests/screenshots" ]; then
    echo -e "${GREEN}✓${NC} Found: screenshots directory"
else
    echo -e "${RED}✗${NC} Missing: screenshots directory"
    ALL_PASS=false
fi

echo ""
echo "File statistics..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -f "/workspaces/agent-feed/prod/tests/unit/skill-detection-fix.test.js" ]; then
    UNIT_LINES=$(wc -l < /workspaces/agent-feed/prod/tests/unit/skill-detection-fix.test.js)
    echo "Unit tests:        $UNIT_LINES lines"
fi
if [ -f "/workspaces/agent-feed/prod/tests/integration/simple-query-fix.test.js" ]; then
    INTEGRATION_LINES=$(wc -l < /workspaces/agent-feed/prod/tests/integration/simple-query-fix.test.js)
    echo "Integration tests: $INTEGRATION_LINES lines"
fi
if [ -f "/workspaces/agent-feed/prod/tests/e2e/skill-detection-ui.spec.js" ]; then
    E2E_LINES=$(wc -l < /workspaces/agent-feed/prod/tests/e2e/skill-detection-ui.spec.js)
    echo "E2E tests:         $E2E_LINES lines"
fi

echo ""
echo "Quick execution commands..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${YELLOW}Unit Tests:${NC}"
echo "  npm test tests/unit/skill-detection-fix.test.js"
echo ""
echo -e "${YELLOW}Integration Tests:${NC}"
echo "  npm test tests/integration/simple-query-fix.test.js"
echo ""
echo -e "${YELLOW}E2E Tests:${NC}"
echo "  npx playwright test tests/e2e/skill-detection-ui.spec.js"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ "$ALL_PASS" = true ]; then
    echo -e "${GREEN}✅ TEST SUITE VERIFICATION PASSED${NC}"
    echo "All test files are present and ready to execute."
else
    echo -e "${RED}❌ TEST SUITE VERIFICATION FAILED${NC}"
    echo "Some test files are missing. Please check the errors above."
    exit 1
fi
