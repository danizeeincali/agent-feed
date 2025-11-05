#!/bin/bash

# Author Display Validation E2E Tests Runner
# This script runs comprehensive E2E tests for author display name validation

set -e

echo "🎭 Author Display Name Validation E2E Tests"
echo "============================================"
echo ""

# Color codes for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if frontend server is running
echo -e "${BLUE}📡 Checking if frontend server is running...${NC}"
if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend server is running at http://localhost:5173${NC}"
else
    echo -e "${RED}❌ Frontend server is not running!${NC}"
    echo -e "${YELLOW}Please start the server first:${NC}"
    echo "  cd frontend && npm run dev"
    exit 1
fi

# Create screenshots directory
echo -e "${BLUE}📁 Creating screenshots directory...${NC}"
mkdir -p /workspaces/agent-feed/docs/screenshots/author-fix
echo -e "${GREEN}✅ Screenshots directory ready${NC}"

# Check Playwright installation
echo -e "${BLUE}🎭 Checking Playwright installation...${NC}"
if ! npx playwright --version > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Playwright not installed. Installing...${NC}"
    npm install --save-dev @playwright/test
    npx playwright install
    echo -e "${GREEN}✅ Playwright installed${NC}"
else
    echo -e "${GREEN}✅ Playwright is installed${NC}"
fi

# Run mode selection
echo ""
echo "Select run mode:"
echo "1) Run all tests (headless)"
echo "2) Run all tests (headed - visible browser)"
echo "3) Run with debug mode"
echo "4) Run specific test suite"
echo "5) Generate report only"

read -p "Enter choice [1-5]: " choice

case $choice in
    1)
        echo -e "${BLUE}🚀 Running all tests in headless mode...${NC}"
        npx playwright test author-display-validation.spec.ts
        ;;
    2)
        echo -e "${BLUE}🚀 Running all tests in headed mode...${NC}"
        npx playwright test author-display-validation.spec.ts --headed
        ;;
    3)
        echo -e "${BLUE}🐛 Running tests in debug mode...${NC}"
        npx playwright test author-display-validation.spec.ts --debug
        ;;
    4)
        echo ""
        echo "Select test suite:"
        echo "1) User Posts Display"
        echo "2) Agent Posts Display"
        echo "3) Comment Author Names"
        echo "4) No Fallback Text"
        echo "5) Visual Consistency"
        read -p "Enter choice [1-5]: " suite_choice

        case $suite_choice in
            1) suite="User Posts Display" ;;
            2) suite="Agent Posts Display" ;;
            3) suite="Comment Author Names" ;;
            4) suite="No Fallback Text" ;;
            5) suite="Visual Consistency" ;;
            *) echo -e "${RED}Invalid choice${NC}"; exit 1 ;;
        esac

        echo -e "${BLUE}🚀 Running '$suite' tests...${NC}"
        npx playwright test author-display-validation.spec.ts -g "$suite"
        ;;
    5)
        echo -e "${BLUE}📊 Generating test report...${NC}"
        npx playwright show-report
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

# Check test results
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ All tests passed!${NC}"
    echo ""
    echo -e "${BLUE}📸 Screenshots saved to:${NC}"
    echo "  /workspaces/agent-feed/docs/screenshots/author-fix/"
    echo ""
    echo -e "${BLUE}📊 View test report:${NC}"
    echo "  npx playwright show-report"
    echo ""
    echo -e "${BLUE}📝 View screenshots:${NC}"
    ls -1 /workspaces/agent-feed/docs/screenshots/author-fix/ 2>/dev/null | sed 's/^/  /'
else
    echo ""
    echo -e "${RED}❌ Some tests failed${NC}"
    echo ""
    echo -e "${YELLOW}View detailed report:${NC}"
    echo "  npx playwright show-report"
    exit 1
fi
