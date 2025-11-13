#!/bin/bash

# Playwright Schema Fix Validation Test Runner
# Runs comprehensive UI tests to verify schema fix

echo "🚀 Starting Playwright Schema Fix Validation Tests..."
echo ""

# Pre-flight checks
echo "🔍 Pre-flight checks:"
echo "   Backend should be running on http://localhost:3001"
echo "   Frontend should be running on http://localhost:5173"
echo ""

# Check if servers are running
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
  echo "✅ Backend is running"
else
  echo "❌ Backend is NOT running on http://localhost:3001"
  echo "   Start with: npm run server"
  exit 1
fi

if curl -s http://localhost:5173 > /dev/null 2>&1; then
  echo "✅ Frontend is running"
else
  echo "❌ Frontend is NOT running on http://localhost:5173"
  echo "   Start with: npm run dev (in frontend directory)"
  exit 1
fi

echo ""
echo "🧪 Running Playwright tests..."
echo ""

# Run tests
npx playwright test tests/playwright/ui-validation/schema-fix-verification.spec.js \
  --project=chromium \
  --reporter=list,html \
  --output=/workspaces/agent-feed/docs/validation/test-artifacts

TEST_EXIT_CODE=$?

echo ""
echo "📊 Test Results:"
if [ $TEST_EXIT_CODE -eq 0 ]; then
  echo "✅ All tests PASSED"
else
  echo "❌ Some tests FAILED (exit code: $TEST_EXIT_CODE)"
fi

echo ""
echo "📸 Screenshots saved to: /workspaces/agent-feed/docs/validation/screenshots/"
echo "📄 HTML report: playwright-report/index.html"
echo ""

# Open HTML report (optional)
if [ "$1" = "--open-report" ]; then
  echo "🌐 Opening HTML report..."
  npx playwright show-report
fi

exit $TEST_EXIT_CODE
