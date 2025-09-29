#!/bin/bash

# Agents UI Validation Test Runner
# Comprehensive UI/UX validation with screenshot evidence collection

echo "🚀 Starting Agents UI Validation..."
echo "=================================="
echo ""

# Check if frontend is running
if ! curl -s http://localhost:5173 > /dev/null; then
    echo "❌ Frontend not running on port 5173"
    echo "💡 Please run: cd frontend && npm run dev"
    exit 1
fi

echo "✅ Frontend detected on localhost:5173"
echo ""

# Check if required directories exist
mkdir -p /workspaces/agent-feed/tests/screenshots/agents-fix

# Run the UI validation test
echo "🔍 Running comprehensive UI validation..."
echo "📸 Capturing before/after screenshots..."
echo "📱 Testing responsive design..."
echo "🔍 Monitoring console errors..."
echo "🌐 Validating API connectivity..."
echo ""

# Execute Playwright test with custom config
npx playwright test \
  --config=playwright.config.ui-validation.js \
  --reporter=line \
  --headed=false

# Check if test completed
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ UI Validation Complete!"
    echo "========================="
    echo ""
    echo "📸 Screenshots captured:"
    echo "  - before-fix.png"
    echo "  - after-fix.png"
    echo "  - mobile-view.png"
    echo "  - console-clean.png"
    echo ""
    echo "📊 Evidence location:"
    echo "  /workspaces/agent-feed/tests/screenshots/agents-fix/"
    echo ""
    echo "📄 Validation report:"
    echo "  validation-report.json"
    echo ""
    echo "🎯 Mission accomplished! ✨"
else
    echo ""
    echo "❌ UI Validation had issues"
    echo "========================="
    echo ""
    echo "📸 Check screenshots for evidence:"
    echo "  /workspaces/agent-feed/tests/screenshots/agents-fix/"
    echo ""
    echo "💡 Review validation report for details"
    exit 1
fi