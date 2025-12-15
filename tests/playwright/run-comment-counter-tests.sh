#!/bin/bash
# Comment Counter E2E Test Runner

echo "🧪 Comment Counter Display - E2E Test Suite"
echo "============================================"
echo ""

# Check if frontend is running
if ! curl -s http://localhost:5173 > /dev/null; then
  echo "❌ Frontend not running on http://localhost:5173"
  echo "   Please start it with: npm run dev"
  exit 1
fi

echo "✅ Frontend detected on http://localhost:5173"
echo ""

# Run Playwright tests
echo "🎭 Running Playwright E2E tests..."
echo ""

npx playwright test tests/playwright/comment-counter-display.spec.ts \
  --reporter=list \
  --reporter=json \
  --reporter=html

EXIT_CODE=$?

echo ""
if [ $EXIT_CODE -eq 0 ]; then
  echo "✅ All E2E tests passed!"
  echo ""
  echo "📸 Screenshots saved to: tests/playwright/screenshots/"
  echo "📊 HTML report: npx playwright show-report"
else
  echo "❌ Some tests failed (expected before fix is applied)"
  echo ""
  echo "This is normal in TDD RED phase!"
  echo "Apply the fix and re-run tests."
fi

exit $EXIT_CODE
