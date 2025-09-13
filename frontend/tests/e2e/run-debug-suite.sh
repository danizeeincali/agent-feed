#!/bin/bash

# Agent Pages E2E Debug Test Runner
# This script runs the comprehensive debug test suite for agent pages

set -e

echo "🚀 Starting Agent Pages E2E Debug Suite"
echo "======================================"

# Check if the development server is running
if ! curl -s http://127.0.0.1:5173 > /dev/null; then
    echo "❌ Development server not running at http://127.0.0.1:5173"
    echo "Please start the server with: npm run dev"
    exit 1
fi

# Create output directories
mkdir -p /workspaces/agent-feed/frontend/tests/screenshots
mkdir -p /workspaces/agent-feed/frontend/tests/reports

# Set environment variables for test run
export PWDEBUG=0
export DEBUG=pw:api
export PLAYWRIGHT_BROWSER=chromium
export PLAYWRIGHT_HEADLESS=false

echo "📋 Test Configuration:"
echo "  - Base URL: http://127.0.0.1:5173"
echo "  - Browser: chromium"
echo "  - Headless: false"
echo "  - Debug mode: enabled"
echo ""

# Run the main debug test
echo "🔍 Running main agent pages debug test..."
npx playwright test frontend/tests/e2e/agent-pages-debug.spec.ts \
  --headed \
  --project=chromium \
  --reporter=html,line \
  --output=/workspaces/agent-feed/frontend/tests/screenshots \
  --video=on \
  --trace=on

echo ""
echo "🔍 Running API-focused debug test..."
npx playwright test frontend/tests/e2e/agent-pages-api-debug.spec.ts \
  --headed \
  --project=chromium \
  --reporter=html,line \
  --output=/workspaces/agent-feed/frontend/tests/screenshots

echo ""
echo "📊 Generating test report..."

# Create a summary report
REPORT_FILE="/workspaces/agent-feed/frontend/tests/reports/debug-summary-$(date +%Y%m%d-%H%M%S).md"

cat > "$REPORT_FILE" << EOF
# Agent Pages Debug Test Report
Generated: $(date)

## Test Execution Summary

### Tests Run:
- Main Navigation Debug Test
- API Response Validation Test  
- Component State Transition Test
- Backend Availability Check
- Request/Response Timing Analysis
- Error Response Analysis

### Output Locations:
- Screenshots: /workspaces/agent-feed/frontend/tests/screenshots
- Videos: /workspaces/agent-feed/frontend/tests/test-results
- HTML Report: /workspaces/agent-feed/frontend/tests/playwright-report

### Key Investigation Points:
1. **URL Navigation**: http://127.0.0.1:5173/agents/personal-todos-agent/pages/b2935f20-b8a2-4be4-bed4-f6f467a8df9d
2. **Expected Behavior**: Page content displays
3. **Actual Behavior**: "No pages yet" message
4. **Root Cause Analysis**: See detailed logs in test output

### Next Steps:
1. Review captured screenshots for visual comparison
2. Analyze network logs for missing API calls
3. Check console errors for JavaScript issues
4. Verify backend API responses
5. Validate React Router navigation state

EOF

echo "📝 Debug report saved to: $REPORT_FILE"

# Show HTML report location
echo ""
echo "🌐 View detailed HTML report:"
echo "  npx playwright show-report"
echo ""

# Show screenshots location
SCREENSHOT_COUNT=$(find /workspaces/agent-feed/frontend/tests/screenshots -name "*.png" 2>/dev/null | wc -l)
echo "📸 Screenshots captured: $SCREENSHOT_COUNT"
echo "  Location: /workspaces/agent-feed/frontend/tests/screenshots"

echo ""
echo "✅ Debug suite completed!"
echo "📋 Check the HTML report for detailed results and captured evidence"