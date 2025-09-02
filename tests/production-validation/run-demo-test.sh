#!/bin/bash

# Quick Demo Test for Tool Call Visualization E2E Suite
# This runs a subset of tests to demonstrate the functionality

set -e

echo "🚀 Tool Call Visualization E2E Demo Test"
echo "========================================="
echo ""

# Configuration
TEST_DIR="/workspaces/agent-feed/tests/production-validation"
cd "$TEST_DIR"

# Check services
echo "🔍 Checking service health..."
if ! curl -s http://localhost:3000/health | grep -q "healthy"; then
    echo "❌ Backend service not healthy on port 3000"
    exit 1
fi

if ! curl -s http://localhost:5173 | head -1 | grep -q "html"; then
    echo "❌ Frontend service not running on port 5173"
    exit 1
fi

echo "✅ Services are running and healthy"
echo ""

# Install Playwright if needed
if [ ! -d "node_modules/@playwright" ]; then
    echo "📦 Installing Playwright..."
    npm install @playwright/test
    npx playwright install chromium
fi

# Run demo test - just the main tool call visualization
echo "🧪 Running Tool Call Visualization Demo Test..."
echo "-----------------------------------------------"

npx playwright test tool-call-visualization-e2e.spec.ts \
    --project=production-validation-chromium \
    --reporter=line \
    --timeout=120000 \
    --grep="should display tool call visualization for basic commands" \
    --headed || {
    echo "❌ Demo test failed"
    exit 1
}

echo ""
echo "🎉 Demo Test Completed Successfully!"
echo ""
echo "📋 What was tested:"
echo "  ✅ Application loads with tool call support"
echo "  ✅ Claude instance creation works"
echo "  ✅ Terminal interface opens properly"
echo "  ✅ Tool call visualization renders correctly"
echo "  ✅ WebSocket connection remains stable"
echo "  ✅ Real command execution and output display"
echo ""
echo "🚀 Full test suite ready! Run ./run-tool-call-validation.sh for complete validation"