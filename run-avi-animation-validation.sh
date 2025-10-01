#!/bin/bash

# Avi Typing Animation - Production Validation Runner
# Validates all critical fixes applied to AviTypingIndicator component

set -e

echo "🚀 AVI TYPING ANIMATION - PRODUCTION VALIDATION"
echo "=================================================="
echo ""
echo "✅ Fixes Applied:"
echo "   1. Removed CSS transition - shows pure ROYGBIV colors"
echo "   2. Added frame/color reset when isVisible becomes true"
echo "   3. Animation starts at frame 0 'A v i' RED every time"
echo ""
echo "🎯 Validation Tests:"
echo "   ✓ First Frame Test (IMMEDIATE RED verification)"
echo "   ✓ Pure ROYGBIV Color Test (exact hex codes)"
echo "   ✓ Frame Sequence Test (10-frame loop)"
echo "   ✓ Multiple Message Test (consistency)"
echo "   ✓ Visual Artifacts Test (no glitches)"
echo "   ✓ Animation Reset Test (hide/show)"
echo "   ✓ Performance Timing Test (200ms frames)"
echo ""
echo "=================================================="
echo ""

# Create screenshots directory
mkdir -p /workspaces/agent-feed/validation-screenshots

# Check if servers are running
echo "🔍 Checking servers..."

if ! lsof -ti:5173 > /dev/null 2>&1; then
    echo "❌ Vite dev server not running on port 5173"
    echo "   Start with: cd frontend && npm run dev"
    exit 1
fi

if ! lsof -ti:3001 > /dev/null 2>&1; then
    echo "⚠️  API server not running on port 3001"
    echo "   Start with: cd api-server && node server.js"
    echo "   (Continuing anyway, may have limited functionality)"
fi

echo "✅ Servers are running"
echo ""

# Install Playwright browsers if needed
echo "🔧 Ensuring Playwright browsers are installed..."
cd /workspaces/agent-feed/frontend
npx playwright install chromium --with-deps > /dev/null 2>&1 || true

echo ""
echo "🧪 Running Avi Typing Animation Validation Tests..."
echo "=================================================="
echo ""

# Run the validation tests with custom config
npx playwright test tests/e2e/avi-typing-animation-production-validation.spec.ts \
    --config=playwright.config.avi-validation.ts \
    --reporter=list

RESULT=$?

echo ""
echo "=================================================="
if [ $RESULT -eq 0 ]; then
    echo "✅ ALL VALIDATION TESTS PASSED"
    echo ""
    echo "📸 Screenshots saved to: /workspaces/agent-feed/validation-screenshots/"
    echo ""
    echo "🎉 Avi typing animation is production-ready!"
    echo "   • First frame: 'A v i' RED #FF0000 ✓"
    echo "   • Pure ROYGBIV colors ✓"
    echo "   • Correct frame sequence ✓"
    echo "   • Consistent behavior ✓"
    echo "   • No visual artifacts ✓"
else
    echo "❌ VALIDATION TESTS FAILED"
    echo ""
    echo "Please review test output above for details."
    echo "Screenshots may be in: /workspaces/agent-feed/validation-screenshots/"
fi

echo "=================================================="
exit $RESULT
