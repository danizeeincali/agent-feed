#!/bin/bash

# Validation script for Anchor Navigation E2E Tests
# This script checks prerequisites before running tests

echo "🔍 Validating Anchor Navigation E2E Test Setup..."
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Check 1: Test file exists
echo -n "Checking test file exists... "
if [ -f "/workspaces/agent-feed/frontend/tests/e2e/anchor-navigation.spec.js" ]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
    echo "  Error: Test file not found"
    ERRORS=$((ERRORS + 1))
fi

# Check 2: Screenshot directory exists
echo -n "Checking screenshot directory... "
if [ -d "/workspaces/agent-feed/frontend/tests/screenshots/anchor-navigation" ]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${YELLOW}⚠${NC}"
    echo "  Warning: Screenshot directory doesn't exist (will be created)"
    mkdir -p /workspaces/agent-feed/frontend/tests/screenshots/anchor-navigation
    WARNINGS=$((WARNINGS + 1))
fi

# Check 3: Frontend server is running
echo -n "Checking frontend server (port 5173)... "
if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
    echo "  Error: Frontend server not running"
    echo "  Run: cd /workspaces/agent-feed/frontend && npm run dev"
    ERRORS=$((ERRORS + 1))
fi

# Check 4: Backend server is running
echo -n "Checking backend server (port 3001)... "
if curl -s http://localhost:3001/api/health > /dev/null 2>&1 || curl -s http://localhost:3001 > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${YELLOW}⚠${NC}"
    echo "  Warning: Backend server may not be running"
    echo "  Run: cd /workspaces/agent-feed/api-server && npm run dev"
    WARNINGS=$((WARNINGS + 1))
fi

# Check 5: Playwright is installed
echo -n "Checking Playwright installation... "
if npx playwright --version > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
    echo "  $(npx playwright --version)"
else
    echo -e "${RED}✗${NC}"
    echo "  Error: Playwright not installed"
    echo "  Run: npm install @playwright/test"
    ERRORS=$((ERRORS + 1))
fi

# Check 6: Chromium browser installed
echo -n "Checking Chromium browser... "
if [ -d "$HOME/.cache/ms-playwright/chromium"* ] 2>/dev/null || [ -d "/root/.cache/ms-playwright/chromium"* ] 2>/dev/null; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${YELLOW}⚠${NC}"
    echo "  Warning: Chromium may not be installed"
    echo "  Run: npx playwright install chromium"
    WARNINGS=$((WARNINGS + 1))
fi

# Check 7: Test page is accessible
echo -n "Checking test page URL... "
if curl -s http://localhost:5173/agents/page-builder-agent/pages/component-showcase-and-examples > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${YELLOW}⚠${NC}"
    echo "  Warning: Test page may not exist yet"
    echo "  URL: http://localhost:5173/agents/page-builder-agent/pages/component-showcase-and-examples"
    WARNINGS=$((WARNINGS + 1))
fi

# Check 8: Node modules installed
echo -n "Checking node_modules... "
if [ -d "/workspaces/agent-feed/frontend/node_modules" ]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
    echo "  Error: node_modules not found"
    echo "  Run: cd /workspaces/agent-feed/frontend && npm install"
    ERRORS=$((ERRORS + 1))
fi

# Check 9: Test file syntax
echo -n "Checking test file syntax... "
if node -c /workspaces/agent-feed/frontend/tests/e2e/anchor-navigation.spec.js > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
    echo "  Error: Test file has syntax errors"
    ERRORS=$((ERRORS + 1))
fi

# Check 10: Playwright config
echo -n "Checking Playwright config... "
if [ -f "/workspaces/agent-feed/frontend/playwright.config.js" ]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${YELLOW}⚠${NC}"
    echo "  Warning: playwright.config.js not found"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Summary
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed!${NC}"
    echo ""
    echo "You can now run the tests:"
    echo "  cd /workspaces/agent-feed/frontend"
    echo "  npx playwright test tests/e2e/anchor-navigation.spec.js"
    echo ""
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Validation completed with $WARNINGS warning(s)${NC}"
    echo ""
    echo "Tests may still run, but please review warnings above."
    echo ""
    exit 0
else
    echo -e "${RED}❌ Validation failed with $ERRORS error(s) and $WARNINGS warning(s)${NC}"
    echo ""
    echo "Please fix the errors above before running tests."
    echo ""
    exit 1
fi
