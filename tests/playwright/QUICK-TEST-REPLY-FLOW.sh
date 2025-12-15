#!/bin/bash

# Quick Smoke Test for Reply Flow
# Runs single test for rapid validation

set -e

echo "🚀 Reply Flow Quick Test"
echo "========================"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check servers
echo -e "${YELLOW}[CHECK]${NC} Verifying servers..."

if ! curl -s http://localhost:5173 > /dev/null; then
    echo -e "${RED}[ERROR]${NC} Frontend not running"
    exit 1
fi

if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${YELLOW}[WARNING]${NC} Backend not responding"
fi

echo -e "${GREEN}[OK]${NC} Servers running"
echo ""

# Run single test
echo -e "${BLUE}[RUN]${NC} Test 1: Processing Pill Visibility..."
npx playwright test \
  --config=playwright.config.reply-flow.ts \
  --grep "Test 1: Reply Processing Pill" \
  --reporter=list

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}[SUCCESS]${NC} Quick test passed!"
    echo ""
    echo "Next steps:"
    echo "  1. Run full suite: ./tests/playwright/run-reply-flow-validation.sh"
    echo "  2. Check screenshot: tests/playwright/screenshots/reply-flow/"
else
    echo ""
    echo -e "${RED}[FAILURE]${NC} Quick test failed"
fi
