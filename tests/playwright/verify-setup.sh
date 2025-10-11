#!/bin/bash

################################################################################
# Phase 2C Test Setup Verification Script
################################################################################

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Phase 2C Test Setup Verification                           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

ERRORS=0
WARNINGS=0

# Check 1: Test files exist
echo -e "${YELLOW}📁 Checking test files...${NC}"

if [ -f "tests/playwright/phase2-ui-validation.spec.js" ]; then
    echo -e "${GREEN}✅ Test suite exists${NC}"
else
    echo -e "${RED}❌ Test suite not found${NC}"
    ((ERRORS++))
fi

if [ -f "tests/playwright/playwright.config.phase2.js" ]; then
    echo -e "${GREEN}✅ Playwright config exists${NC}"
else
    echo -e "${RED}❌ Playwright config not found${NC}"
    ((ERRORS++))
fi

if [ -d "tests/playwright/screenshots/phase2" ]; then
    echo -e "${GREEN}✅ Screenshot directory exists${NC}"
else
    echo -e "${YELLOW}⚠️  Screenshot directory not found (will be created automatically)${NC}"
    mkdir -p tests/playwright/screenshots/phase2
    ((WARNINGS++))
fi

echo ""

# Check 2: API Server
echo -e "${YELLOW}🔌 Checking API server...${NC}"

if curl -s http://localhost:3001/api/posts > /dev/null 2>&1; then
    echo -e "${GREEN}✅ API server is running on port 3001${NC}"

    # Check PostgreSQL mode
    API_RESPONSE=$(curl -s http://localhost:3001/api/posts)
    if echo "$API_RESPONSE" | grep -q "PostgreSQL"; then
        echo -e "${GREEN}✅ API server is in PostgreSQL mode${NC}"
        echo -e "   Source: $(echo "$API_RESPONSE" | grep -o '"source":"[^"]*"' | cut -d'"' -f4)"
    else
        echo -e "${RED}❌ API server is NOT in PostgreSQL mode${NC}"
        echo -e "   Current source: $(echo "$API_RESPONSE" | grep -o '"source":"[^"]*"' | cut -d'"' -f4)"
        echo -e "${YELLOW}   To fix: export USE_POSTGRES=true && restart API server${NC}"
        ((ERRORS++))
    fi

    # Check for test data
    POST_COUNT=$(echo "$API_RESPONSE" | grep -o '"posts":\[[^]]*\]' | grep -o '{' | wc -l)
    if [ "$POST_COUNT" -gt 0 ]; then
        echo -e "${GREEN}✅ API has test data ($POST_COUNT posts)${NC}"
    else
        echo -e "${YELLOW}⚠️  API has no posts${NC}"
        echo -e "   Consider seeding the database"
        ((WARNINGS++))
    fi
else
    echo -e "${RED}❌ API server is NOT running on port 3001${NC}"
    echo -e "${YELLOW}   To fix: cd api-server && npm start${NC}"
    ((ERRORS++))
fi

echo ""

# Check 3: Frontend
echo -e "${YELLOW}🌐 Checking frontend...${NC}"

FRONTEND_PORT=${FRONTEND_PORT:-5173}

if curl -s http://localhost:$FRONTEND_PORT > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend is running on port $FRONTEND_PORT${NC}"
else
    # Try alternate port
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Frontend is running on port 3000${NC}"
        echo -e "${YELLOW}   Note: Update FRONTEND_PORT=3000 if needed${NC}"
    else
        echo -e "${RED}❌ Frontend is NOT running${NC}"
        echo -e "${YELLOW}   To fix: cd frontend && npm run dev${NC}"
        ((ERRORS++))
    fi
fi

echo ""

# Check 4: Node modules and Playwright
echo -e "${YELLOW}📦 Checking dependencies...${NC}"

if [ -d "node_modules/@playwright" ]; then
    echo -e "${GREEN}✅ Playwright is installed${NC}"
else
    echo -e "${YELLOW}⚠️  Playwright not found in root node_modules${NC}"
    echo -e "   Run: npm install --save-dev @playwright/test"
    ((WARNINGS++))
fi

# Check Playwright browsers
if npx playwright --version > /dev/null 2>&1; then
    PLAYWRIGHT_VERSION=$(npx playwright --version)
    echo -e "${GREEN}✅ Playwright CLI available: $PLAYWRIGHT_VERSION${NC}"
else
    echo -e "${RED}❌ Playwright CLI not available${NC}"
    ((ERRORS++))
fi

echo ""

# Check 5: Environment variables
echo -e "${YELLOW}🔧 Checking environment...${NC}"

if [ ! -z "$USE_POSTGRES" ]; then
    echo -e "${GREEN}✅ USE_POSTGRES is set: $USE_POSTGRES${NC}"
else
    echo -e "${YELLOW}⚠️  USE_POSTGRES not set${NC}"
    echo -e "   API server may default to SQLite"
    ((WARNINGS++))
fi

if [ ! -z "$DATABASE_URL" ]; then
    echo -e "${GREEN}✅ DATABASE_URL is set${NC}"
else
    echo -e "${YELLOW}⚠️  DATABASE_URL not set${NC}"
    echo -e "   API server may not connect to PostgreSQL"
    ((WARNINGS++))
fi

echo ""

# Summary
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Verification Summary                                        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}🎉 All checks passed! Ready to run tests.${NC}"
    echo ""
    echo -e "${BLUE}Run tests with:${NC}"
    echo -e "  ./tests/playwright/run-phase2-tests.sh"
    echo ""
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  $WARNINGS warning(s) found, but tests may still work.${NC}"
    echo ""
    echo -e "${BLUE}You can try running tests with:${NC}"
    echo -e "  ./tests/playwright/run-phase2-tests.sh"
    echo ""
    exit 0
else
    echo -e "${RED}❌ $ERRORS error(s) and $WARNINGS warning(s) found.${NC}"
    echo -e "${YELLOW}Please fix the errors before running tests.${NC}"
    echo ""
    exit 1
fi
