#!/bin/bash

echo "🧪 Running Enhanced Live Activity E2E Tests"
echo "============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create screenshots directory
echo "📁 Creating screenshots directory..."
mkdir -p tests/screenshots/live-activity

# Check if servers are running
echo ""
echo "🔍 Checking server status..."

# Check API server
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
  echo -e "${GREEN}✅ API server is running on port 3001${NC}"
else
  echo -e "${RED}❌ API server not running on port 3001${NC}"
  echo -e "${YELLOW}⚠️  Please start the API server: cd api-server && npm run dev${NC}"
  exit 1
fi

# Check frontend server
if curl -s http://localhost:5173 > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Frontend server is running on port 5173${NC}"
else
  echo -e "${RED}❌ Frontend server not running on port 5173${NC}"
  echo -e "${YELLOW}⚠️  Please start the frontend: cd frontend && npm run dev${NC}"
  exit 1
fi

# Check database
if [ -f "database.db" ]; then
  echo -e "${GREEN}✅ Database file found${NC}"
else
  echo -e "${RED}❌ Database file not found${NC}"
  exit 1
fi

echo ""
echo "🚀 Starting E2E test execution..."
echo ""

# Run Playwright tests
npx playwright test tests/e2e/live-activity-enhancement.spec.ts \
  --reporter=list \
  --reporter=html \
  --reporter=json \
  --workers=1 \
  --timeout=120000

# Capture exit code
TEST_EXIT_CODE=$?

echo ""
echo "============================================="

# Check results
if [ $TEST_EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}✅ All E2E tests passed!${NC}"
  echo ""
  echo "📸 Screenshots saved to: tests/screenshots/live-activity/"
  echo ""
  echo "📊 Test artifacts:"
  ls -lh tests/screenshots/live-activity/ | tail -n +2 | awk '{print "  - " $9 " (" $5 ")"}'
  echo ""
  echo -e "${BLUE}📋 View HTML report: npx playwright show-report${NC}"
else
  echo -e "${RED}❌ Some tests failed. Check output above.${NC}"
  echo ""
  echo "📸 Screenshots still saved to: tests/screenshots/live-activity/"
  echo ""
  echo -e "${YELLOW}💡 Troubleshooting tips:${NC}"
  echo "  1. Ensure both servers are running"
  echo "  2. Check database.db exists and is readable"
  echo "  3. Verify API endpoints are accessible"
  echo "  4. Review test output for specific failures"
  echo ""
  echo -e "${BLUE}📋 View HTML report: npx playwright show-report${NC}"
  exit 1
fi

echo ""
echo "🎉 Test run complete!"
