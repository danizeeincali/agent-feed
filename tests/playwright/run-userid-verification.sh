#!/bin/bash

# Run UserId Fix Verification Tests
# This script runs Playwright tests to verify the userId fix works correctly

set -e

echo "🚀 Starting UserId Fix Verification Tests"
echo "=========================================="
echo ""

# Ensure screenshots directory exists
mkdir -p docs/validation/screenshots

# Check if server is running
if ! curl -s http://localhost:5173 > /dev/null; then
  echo "❌ Error: Development server is not running on port 5173"
  echo "Please start the server with: npm run dev"
  exit 1
fi

echo "✅ Server is running on port 5173"
echo ""

# Check if API server is running
if ! curl -s http://localhost:3001/health > /dev/null 2>&1; then
  echo "⚠️  Warning: API server may not be running on port 3001"
  echo "Tests may fail if backend is not available"
fi

echo "🧪 Running Playwright tests..."
echo ""

# Run the tests with detailed output
npx playwright test tests/playwright/ui-validation/userid-fix-verification.spec.js \
  --project=chromium \
  --reporter=list,html \
  --output=docs/validation/test-artifacts

TEST_RESULT=$?

echo ""
echo "=========================================="

if [ $TEST_RESULT -eq 0 ]; then
  echo "✅✅✅ ALL USERID FIX TESTS PASSED"
  echo ""
  echo "📸 Screenshots saved to: docs/validation/screenshots/"
  echo "📊 Test report: playwright-report/index.html"
  echo ""
  echo "Screenshot files generated:"
  ls -1 docs/validation/screenshots/userid-fix-* 2>/dev/null || echo "No screenshots found"
else
  echo "❌ SOME TESTS FAILED"
  echo ""
  echo "Check the test output above for details"
  echo "Screenshots may still be in: docs/validation/screenshots/"
fi

echo ""
echo "To view the HTML report, run: npx playwright show-report"

exit $TEST_RESULT
