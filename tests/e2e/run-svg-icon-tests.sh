#!/bin/bash

# SVG Icon Validation E2E Test Runner
# Executes comprehensive SVG icon validation tests with screenshot capture

set -e

echo "=================================="
echo "SVG Icon Validation E2E Test Suite"
echo "=================================="
echo ""

# Check if screenshot directory exists
if [ ! -d "../../screenshots/svg-icons" ]; then
  echo "Creating screenshot directory..."
  mkdir -p ../../screenshots/svg-icons
fi

# Check if servers are running
echo "Checking server status..."
if ! curl -s http://localhost:5173 > /dev/null; then
  echo "ERROR: Frontend not running at http://localhost:5173"
  echo "Please start: npm run dev"
  exit 1
fi

if ! curl -s http://localhost:3001/health > /dev/null 2>&1; then
  echo "WARNING: Backend may not be running at http://localhost:3001"
fi

echo "Servers are running..."
echo ""

# Run the SVG icon validation tests
echo "Running SVG Icon Validation Tests..."
echo "===================================="
npx playwright test svg-icon-validation.spec.ts \
  --reporter=html,json,list \
  --timeout=60000 \
  --retries=1

# Check test results
if [ $? -eq 0 ]; then
  echo ""
  echo "=================================="
  echo "ALL TESTS PASSED ✓"
  echo "=================================="
  echo ""
  echo "Screenshots saved to:"
  echo "  /workspaces/agent-feed/screenshots/svg-icons/"
  echo ""
  echo "View report:"
  echo "  npx playwright show-report"
else
  echo ""
  echo "=================================="
  echo "TESTS FAILED ✗"
  echo "=================================="
  echo ""
  echo "Review screenshots at:"
  echo "  /workspaces/agent-feed/screenshots/svg-icons/"
  exit 1
fi
