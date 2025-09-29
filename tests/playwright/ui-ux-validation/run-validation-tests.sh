#!/bin/bash

# UI/UX Validation Test Runner
# Validates simplified architecture after Next.js removal

echo "🚀 Starting UI/UX Validation Tests for Simplified Architecture"
echo "=================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if servers are running
echo -e "${BLUE}📡 Checking server status...${NC}"

# Check API server (port 3001)
if curl -s http://localhost:3001/api/agents > /dev/null; then
    echo -e "${GREEN}✅ API Server (port 3001) is running${NC}"
else
    echo -e "${RED}❌ API Server (port 3001) is not accessible${NC}"
    echo "Please start the API server: cd api-server && npm run dev"
    exit 1
fi

# Check Frontend server (port 5173)
if curl -s http://localhost:5173 > /dev/null; then
    echo -e "${GREEN}✅ Frontend Server (port 5173) is running${NC}"
else
    echo -e "${RED}❌ Frontend Server (port 5173) is not accessible${NC}"
    echo "Please start the frontend: cd frontend && npm run dev"
    exit 1
fi

echo ""
echo -e "${BLUE}🧪 Running UI/UX Validation Tests...${NC}"
echo ""

# Create reports directory
mkdir -p tests/playwright/ui-ux-validation/reports/html

# Run the tests with specific configuration
npx playwright test \
    --config=playwright.config.ui-ux-validation.js \
    --reporter=html \
    --reporter=json \
    --reporter=list \
    tests/playwright/ui-ux-validation/

# Check test results
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ All UI/UX Validation Tests Passed!${NC}"
    echo ""
    echo -e "${BLUE}📊 Test Results Summary:${NC}"
    echo "- Frontend Loading & Navigation: ✅"
    echo "- API Integration Validation: ✅"
    echo "- UUID String Operations: ✅"
    echo "- Error Prevention: ✅"
    echo "- Real Functionality: ✅"
    echo ""
    echo -e "${BLUE}📸 Screenshots captured in:${NC}"
    echo "tests/playwright/ui-ux-validation/reports/"
    echo ""
    echo -e "${BLUE}📋 Full HTML Report:${NC}"
    echo "tests/playwright/ui-ux-validation/reports/html/index.html"
else
    echo ""
    echo -e "${RED}❌ Some tests failed. Check the report for details.${NC}"
    echo ""
    echo -e "${YELLOW}📋 View full report:${NC}"
    echo "tests/playwright/ui-ux-validation/reports/html/index.html"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 UI/UX Validation Complete!${NC}"
echo "=================================================="