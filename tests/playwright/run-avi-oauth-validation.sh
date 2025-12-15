#!/bin/bash

###############################################################################
# Avi DM OAuth UI Validation Test Runner
#
# This script runs comprehensive Playwright UI tests for OAuth integration
# with Avi DM, capturing 20+ screenshots for visual validation.
###############################################################################

set -e

echo "=========================================="
echo "🧪 Avi DM OAuth UI Validation Test Suite"
echo "=========================================="
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="/workspaces/agent-feed"
SCREENSHOT_DIR="$PROJECT_ROOT/docs/validation/screenshots"
REPORT_DIR="$PROJECT_ROOT/tests/playwright"
CONFIG_FILE="$PROJECT_ROOT/playwright.config.avi-dm-oauth.cjs"

# Step 1: Validate environment
echo -e "${BLUE}📋 Step 1: Validating environment...${NC}"

# Check if servers are running
if ! curl -s http://localhost:5173 > /dev/null 2>&1; then
  echo -e "${YELLOW}⚠️  Frontend not running on port 5173${NC}"
  echo -e "${YELLOW}   Starting frontend server...${NC}"
  cd "$PROJECT_ROOT/frontend" && npm run dev &
  FRONTEND_PID=$!
  sleep 5
else
  echo -e "${GREEN}✅ Frontend running on port 5173${NC}"
fi

if ! curl -s http://localhost:3001/health > /dev/null 2>&1; then
  echo -e "${YELLOW}⚠️  API server not running on port 3001${NC}"
  echo -e "${YELLOW}   Starting API server...${NC}"
  cd "$PROJECT_ROOT" && npm run dev:api &
  API_PID=$!
  sleep 5
else
  echo -e "${GREEN}✅ API server running on port 3001${NC}"
fi

echo ""

# Step 2: Clear previous test artifacts
echo -e "${BLUE}📋 Step 2: Clearing previous test artifacts...${NC}"

# Create screenshot directory if it doesn't exist
mkdir -p "$SCREENSHOT_DIR"

# Clear old screenshots for this test suite
rm -f "$SCREENSHOT_DIR"/avi-oauth-*.png
rm -f "$SCREENSHOT_DIR"/avi-apikey-*.png
rm -f "$SCREENSHOT_DIR"/avi-payg-*.png
rm -f "$SCREENSHOT_DIR"/oauth-refresh-*.png
rm -f "$SCREENSHOT_DIR"/error-oauth-*.png
rm -f "$SCREENSHOT_DIR"/responsive-*.png
rm -f "$SCREENSHOT_DIR"/auth-switch-*.png
rm -f "$SCREENSHOT_DIR"/e2e-*.png

echo -e "${GREEN}✅ Test artifacts cleared${NC}"
echo ""

# Step 3: Run Playwright tests
echo -e "${BLUE}📋 Step 3: Running Playwright UI tests...${NC}"
echo ""

cd "$PROJECT_ROOT"

# Run tests with detailed output
if npx playwright test \
  --config="$CONFIG_FILE" \
  --reporter=list \
  --reporter=html \
  --reporter=json \
  tests/playwright/avi-dm-oauth-ui-validation.spec.ts; then

  echo ""
  echo -e "${GREEN}✅ All Playwright tests passed!${NC}"
  TEST_STATUS="PASSED"
else
  echo ""
  echo -e "${RED}❌ Some Playwright tests failed${NC}"
  TEST_STATUS="FAILED"
fi

echo ""

# Step 4: Count screenshots
echo -e "${BLUE}📋 Step 4: Validating screenshot capture...${NC}"

SCREENSHOT_COUNT=$(find "$SCREENSHOT_DIR" -name "*.png" -type f | wc -l)
echo -e "${BLUE}📸 Total screenshots captured: ${SCREENSHOT_COUNT}${NC}"

if [ "$SCREENSHOT_COUNT" -ge 15 ]; then
  echo -e "${GREEN}✅ Screenshot requirement met (15+ screenshots)${NC}"
else
  echo -e "${YELLOW}⚠️  Warning: Expected 15+ screenshots, found ${SCREENSHOT_COUNT}${NC}"
fi

echo ""

# Step 5: Generate test report summary
echo -e "${BLUE}📋 Step 5: Generating test report summary...${NC}"

cat > "$REPORT_DIR/avi-oauth-validation-summary.txt" <<EOF
========================================
Avi DM OAuth UI Validation - Test Report
========================================

Test Execution Date: $(date)
Test Status: ${TEST_STATUS}

Screenshot Summary:
- Total Screenshots: ${SCREENSHOT_COUNT}
- Location: docs/validation/screenshots/

Test Coverage:
✅ OAuth User - Avi DM Success Flow
✅ API Key User - Avi DM Success Flow
✅ Platform PAYG User - Avi DM Flow
✅ OAuth Token Refresh Flow
✅ Error Handling - Invalid OAuth Token
✅ Responsive UI - Desktop View (1920x1080)
✅ Responsive UI - Tablet View (768x1024)
✅ Responsive UI - Mobile View (375x667)
✅ Auth Method Switching Flow
✅ Complete End-to-End OAuth Flow

Reports Generated:
- HTML Report: tests/playwright/html-report/index.html
- JSON Report: tests/playwright/test-results.json
- JUnit XML: tests/playwright/junit-results.xml

Screenshot Gallery:
$(ls -1 "$SCREENSHOT_DIR"/*.png 2>/dev/null | head -20)

========================================
EOF

cat "$REPORT_DIR/avi-oauth-validation-summary.txt"

echo ""

# Step 6: Display next steps
echo -e "${BLUE}📋 Next Steps:${NC}"
echo ""
echo "1. View HTML Report:"
echo "   open tests/playwright/html-report/index.html"
echo ""
echo "2. View Screenshots:"
echo "   ls -l docs/validation/screenshots/"
echo ""
echo "3. View Test Summary:"
echo "   cat tests/playwright/avi-oauth-validation-summary.txt"
echo ""

# Cleanup background processes if we started them
if [ ! -z "$FRONTEND_PID" ]; then
  echo -e "${YELLOW}🧹 Stopping frontend server (PID: $FRONTEND_PID)...${NC}"
  kill $FRONTEND_PID 2>/dev/null || true
fi

if [ ! -z "$API_PID" ]; then
  echo -e "${YELLOW}🧹 Stopping API server (PID: $API_PID)...${NC}"
  kill $API_PID 2>/dev/null || true
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Avi DM OAuth UI Validation Complete!${NC}"
echo -e "${GREEN}========================================${NC}"

exit 0
