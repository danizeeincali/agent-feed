#!/bin/bash

# Verify Test Setup Script
# Checks if all prerequisites are met before running E2E tests

set -e

echo "================================================"
echo "Test Setup Verification"
echo "================================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

ERRORS=0

# Check Node.js
echo -e "${YELLOW}Checking Node.js...${NC}"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓ Node.js is installed: ${NODE_VERSION}${NC}"
else
    echo -e "${RED}✗ Node.js is not installed${NC}"
    ((ERRORS++))
fi
echo ""

# Check npm
echo -e "${YELLOW}Checking npm...${NC}"
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✓ npm is installed: ${NPM_VERSION}${NC}"
else
    echo -e "${RED}✗ npm is not installed${NC}"
    ((ERRORS++))
fi
echo ""

# Check Playwright installation
echo -e "${YELLOW}Checking Playwright...${NC}"
if npm list @playwright/test &> /dev/null; then
    PW_VERSION=$(npm list @playwright/test --depth=0 2>/dev/null | grep @playwright/test | awk '{print $2}')
    echo -e "${GREEN}✓ Playwright is installed: ${PW_VERSION}${NC}"
else
    echo -e "${RED}✗ Playwright is not installed${NC}"
    echo "  Install with: npm install -D @playwright/test"
    ((ERRORS++))
fi
echo ""

# Check if test file exists
echo -e "${YELLOW}Checking test file...${NC}"
if [ -f "src/tests/e2e/onboarding-post-order-validation.spec.ts" ]; then
    echo -e "${GREEN}✓ Test file exists${NC}"
    FILE_SIZE=$(wc -c < src/tests/e2e/onboarding-post-order-validation.spec.ts)
    echo "  Size: ${FILE_SIZE} bytes"
else
    echo -e "${RED}✗ Test file not found${NC}"
    ((ERRORS++))
fi
echo ""

# Check if config file exists
echo -e "${YELLOW}Checking Playwright config...${NC}"
if [ -f "playwright.config.onboarding-post-order.ts" ]; then
    echo -e "${GREEN}✓ Custom config exists${NC}"
else
    echo -e "${RED}✗ Custom config not found${NC}"
    ((ERRORS++))
fi
echo ""

# Check if screenshots directory exists
echo -e "${YELLOW}Checking screenshots directory...${NC}"
if [ -d "../docs/screenshots/post-order-fix" ]; then
    echo -e "${GREEN}✓ Screenshots directory exists${NC}"
else
    echo -e "${YELLOW}⚠ Creating screenshots directory...${NC}"
    mkdir -p ../docs/screenshots/post-order-fix
    echo -e "${GREEN}✓ Directory created${NC}"
fi
echo ""

# Check backend server
echo -e "${YELLOW}Checking backend server (port 3001)...${NC}"
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend server is running${NC}"
else
    echo -e "${RED}✗ Backend server is NOT running${NC}"
    echo "  Start with: cd ../api-server && node server.js"
    ((ERRORS++))
fi
echo ""

# Check frontend server
echo -e "${YELLOW}Checking frontend server (port 5173)...${NC}"
if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Frontend server is running${NC}"
else
    echo -e "${RED}✗ Frontend server is NOT running${NC}"
    echo "  Start with: npm run dev"
    ((ERRORS++))
fi
echo ""

# Check database
echo -e "${YELLOW}Checking database...${NC}"
if [ -f "../database.db" ]; then
    echo -e "${GREEN}✓ Database file exists${NC}"
    DB_SIZE=$(wc -c < ../database.db)
    echo "  Size: ${DB_SIZE} bytes"
else
    echo -e "${RED}✗ Database file not found${NC}"
    echo "  Run database reset script"
    ((ERRORS++))
fi
echo ""

# Summary
echo "================================================"
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed! Ready to run tests.${NC}"
    echo ""
    echo "Run tests with:"
    echo "  ./run-onboarding-post-order-tests.sh"
    echo ""
    echo "Or directly with:"
    echo "  npx playwright test --config=playwright.config.onboarding-post-order.ts"
else
    echo -e "${RED}❌ Found ${ERRORS} error(s). Please fix them before running tests.${NC}"
fi
echo "================================================"

exit $ERRORS
