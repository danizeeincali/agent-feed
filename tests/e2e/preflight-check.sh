#!/bin/bash

##############################################################################
# Pre-flight Check for Agent Tabs Validation
# Verifies environment is ready for validation tests
##############################################################################

set +e  # Don't exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

echo ""
echo "========================================"
echo "Pre-flight Check"
echo "========================================"
echo ""

# Check 1: Backend server
echo -n "1. Checking backend server (localhost:3001)... "
if curl -s http://localhost:3001/health > /dev/null 2>&1 || curl -s http://localhost:3001/api/agents > /dev/null 2>&1; then
  echo -e "${GREEN}✓${NC}"
else
  echo -e "${RED}✗${NC}"
  echo "   Backend server not running. Start with: cd api-server && node server.js"
  ((ERRORS++))
fi

# Check 2: Frontend server
echo -n "2. Checking frontend server (localhost:5173)... "
if curl -s http://localhost:5173 > /dev/null 2>&1; then
  echo -e "${GREEN}✓${NC}"
else
  echo -e "${RED}✗${NC}"
  echo "   Frontend server not running. Start with: cd frontend && npm run dev"
  ((ERRORS++))
fi

# Check 3: Node.js version
echo -n "3. Checking Node.js version... "
NODE_VERSION=$(node -v 2>/dev/null)
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓${NC} $NODE_VERSION"
else
  echo -e "${RED}✗${NC}"
  echo "   Node.js not found"
  ((ERRORS++))
fi

# Check 4: Playwright installed
echo -n "4. Checking Playwright installation... "
if npx playwright --version > /dev/null 2>&1; then
  PLAYWRIGHT_VERSION=$(npx playwright --version)
  echo -e "${GREEN}✓${NC} $PLAYWRIGHT_VERSION"
else
  echo -e "${RED}✗${NC}"
  echo "   Playwright not installed. Install with: npx playwright install"
  ((ERRORS++))
fi

# Check 5: jq installed (for API validation)
echo -n "5. Checking jq installation... "
if command -v jq > /dev/null 2>&1; then
  JQ_VERSION=$(jq --version)
  echo -e "${GREEN}✓${NC} $JQ_VERSION"
else
  echo -e "${YELLOW}⚠${NC}"
  echo "   jq not found. Install with: sudo apt-get install jq"
  ((WARNINGS++))
fi

# Check 6: Screenshot directory
echo -n "6. Checking screenshot directory... "
SCREENSHOT_DIR="/workspaces/agent-feed/tests/e2e/reports/screenshots"
if [ -d "$SCREENSHOT_DIR" ]; then
  echo -e "${GREEN}✓${NC}"
else
  echo -e "${YELLOW}⚠${NC}"
  echo "   Creating screenshot directory..."
  mkdir -p "$SCREENSHOT_DIR"
  if [ $? -eq 0 ]; then
    echo "   Directory created"
  else
    echo -e "${RED}✗${NC}"
    echo "   Failed to create directory"
    ((ERRORS++))
  fi
fi

# Check 7: Test backend API accessibility
echo -n "7. Testing backend API endpoint... "
RESPONSE=$(curl -s http://localhost:3001/api/agents/meta-agent)
if echo "$RESPONSE" | jq empty 2>/dev/null; then
  echo -e "${GREEN}✓${NC}"
else
  echo -e "${RED}✗${NC}"
  echo "   API not returning valid JSON"
  ((ERRORS++))
fi

# Check 8: Backend has tools field (expected to fail before implementation)
echo -n "8. Checking if backend includes tools field... "
if echo "$RESPONSE" | jq -e '.data.tools' > /dev/null 2>&1; then
  echo -e "${GREEN}✓${NC} (Implementation complete)"
else
  echo -e "${YELLOW}⚠${NC} (Not implemented yet - expected)"
  echo "   This is EXPECTED if coder agents haven't finished"
  ((WARNINGS++))
fi

# Check 9: Frontend accessibility
echo -n "9. Testing frontend accessibility... "
if curl -s http://localhost:5173/agents > /dev/null 2>&1; then
  echo -e "${GREEN}✓${NC}"
else
  echo -e "${RED}✗${NC}"
  echo "   Frontend agents page not accessible"
  ((ERRORS++))
fi

# Check 10: Playwright browsers installed
echo -n "10. Checking Playwright browsers... "
if [ -d "$HOME/.cache/ms-playwright" ] || [ -d "$HOME/Library/Caches/ms-playwright" ]; then
  echo -e "${GREEN}✓${NC}"
else
  echo -e "${YELLOW}⚠${NC}"
  echo "   Playwright browsers not installed. Install with: npx playwright install"
  ((WARNINGS++))
fi

echo ""
echo "========================================"
echo "Summary"
echo "========================================"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  echo -e "${GREEN}✅ All checks passed - Ready for validation${NC}"
  echo ""
  echo "Run validation with:"
  echo "  cd /workspaces/agent-feed/tests/e2e"
  echo "  ./validate-backend-api-v2.sh"
  echo ""
  exit 0
elif [ $ERRORS -eq 0 ]; then
  echo -e "${YELLOW}⚠ Pre-flight passed with ${WARNINGS} warning(s)${NC}"
  echo ""
  echo "You can proceed, but some features may not work correctly."
  echo ""
  exit 0
else
  echo -e "${RED}❌ Pre-flight failed with ${ERRORS} error(s) and ${WARNINGS} warning(s)${NC}"
  echo ""
  echo "Fix the errors above before running validation."
  echo ""
  exit 1
fi
