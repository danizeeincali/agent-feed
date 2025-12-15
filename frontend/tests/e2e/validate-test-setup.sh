#!/bin/bash

################################################################################
# Test Setup Validation Script
#
# This script validates that all test files and prerequisites are in place
################################################################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  Avi DM Timeout Test Setup Validation${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

ERRORS=0
WARNINGS=0

# Check test files
echo -e "${YELLOW}Checking test files...${NC}"

FILES=(
    "/workspaces/agent-feed/frontend/src/tests/unit/AviDMTimeoutUnit.test.tsx"
    "/workspaces/agent-feed/frontend/src/tests/integration/AviDMTimeout.test.tsx"
    "/workspaces/agent-feed/frontend/tests/e2e/avi-dm-timeout.spec.ts"
    "/workspaces/agent-feed/frontend/tests/e2e/playwright.config.avi-timeout.ts"
    "/workspaces/agent-feed/frontend/tests/e2e/run-avi-timeout-tests.sh"
    "/workspaces/agent-feed/frontend/tests/e2e/AVI_DM_TIMEOUT_TESTS_README.md"
)

for FILE in "${FILES[@]}"; do
    if [ -f "$FILE" ]; then
        echo -e "${GREEN}✓ $FILE${NC}"
    else
        echo -e "${RED}✗ $FILE (missing)${NC}"
        ERRORS=$((ERRORS + 1))
    fi
done

echo ""

# Check component file
echo -e "${YELLOW}Checking component file...${NC}"
COMPONENT="/workspaces/agent-feed/frontend/src/components/EnhancedPostingInterface.tsx"
if [ -f "$COMPONENT" ]; then
    echo -e "${GREEN}✓ EnhancedPostingInterface.tsx exists${NC}"

    # Check if it contains callAviClaudeCode function
    if grep -q "callAviClaudeCode" "$COMPONENT"; then
        echo -e "${GREEN}✓ callAviClaudeCode function found${NC}"
    else
        echo -e "${YELLOW}⚠ callAviClaudeCode function not found${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi

    # Check if it contains AviChatSection
    if grep -q "AviChatSection" "$COMPONENT"; then
        echo -e "${GREEN}✓ AviChatSection component found${NC}"
    else
        echo -e "${YELLOW}⚠ AviChatSection component not found${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${RED}✗ EnhancedPostingInterface.tsx missing${NC}"
    ERRORS=$((ERRORS + 1))
fi

echo ""

# Check Vite config
echo -e "${YELLOW}Checking Vite configuration...${NC}"
VITE_CONFIG="/workspaces/agent-feed/frontend/vite.config.ts"
if [ -f "$VITE_CONFIG" ]; then
    echo -e "${GREEN}✓ vite.config.ts exists${NC}"

    # Check for timeout configuration
    if grep -q "timeout.*120000" "$VITE_CONFIG" || grep -q "timeout.*120_000" "$VITE_CONFIG"; then
        echo -e "${GREEN}✓ Timeout fix found in vite.config.ts${NC}"
    else
        echo -e "${RED}✗ Timeout fix NOT found in vite.config.ts${NC}"
        echo -e "${YELLOW}  Add: timeout: 120000 to /api/claude-code proxy config${NC}"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo -e "${YELLOW}⚠ vite.config.ts not found${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""

# Check dependencies
echo -e "${YELLOW}Checking dependencies...${NC}"
PACKAGE_JSON="/workspaces/agent-feed/frontend/package.json"
if [ -f "$PACKAGE_JSON" ]; then
    # Check for vitest
    if grep -q "vitest" "$PACKAGE_JSON"; then
        echo -e "${GREEN}✓ vitest dependency found${NC}"
    else
        echo -e "${RED}✗ vitest dependency missing${NC}"
        ERRORS=$((ERRORS + 1))
    fi

    # Check for playwright
    if grep -q "@playwright/test" "$PACKAGE_JSON"; then
        echo -e "${GREEN}✓ @playwright/test dependency found${NC}"
    else
        echo -e "${RED}✗ @playwright/test dependency missing${NC}"
        ERRORS=$((ERRORS + 1))
    fi

    # Check for testing-library
    if grep -q "@testing-library/react" "$PACKAGE_JSON"; then
        echo -e "${GREEN}✓ @testing-library/react dependency found${NC}"
    else
        echo -e "${RED}✗ @testing-library/react dependency missing${NC}"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo -e "${RED}✗ package.json not found${NC}"
    ERRORS=$((ERRORS + 1))
fi

echo ""

# Check servers
echo -e "${YELLOW}Checking servers...${NC}"

# Check frontend dev server
if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Frontend dev server is running (http://localhost:5173)${NC}"
else
    echo -e "${YELLOW}⚠ Frontend dev server is NOT running${NC}"
    echo -e "${YELLOW}  Start with: cd /workspaces/agent-feed/frontend && npm run dev${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# Check backend API server
if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend API server is running (http://localhost:3001)${NC}"
else
    echo -e "${YELLOW}⚠ Backend API server is NOT running${NC}"
    echo -e "${YELLOW}  Start with: cd /workspaces/agent-feed/api-server && npm start${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""

# Summary
echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  Validation Summary${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo -e "${GREEN}  Test suite is ready to run.${NC}"
    echo ""
    echo -e "${YELLOW}Run tests with:${NC}"
    echo -e "  ./run-avi-timeout-tests.sh all"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ $WARNINGS warning(s) found${NC}"
    echo -e "${YELLOW}  Tests may run but some features might not work properly.${NC}"
    exit 0
else
    echo -e "${RED}✗ $ERRORS error(s) found${NC}"
    echo -e "${RED}  Please fix errors before running tests.${NC}"
    exit 1
fi
