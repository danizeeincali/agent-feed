#!/bin/bash

# Page Registration Test Suite Runner
# Runs all tests for automated page registration

set -e

echo "🧪 Page Registration Test Suite"
echo "================================"
echo ""

# Check if API server is running
if ! curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo "⚠️  Warning: API server not running on port 3001"
    echo "   Start it with: cd api-server && npm start"
    echo ""
fi

# Check if frontend is running
if ! curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo "⚠️  Warning: Frontend not running on port 5173"
    echo "   Start it with: cd frontend && npm run dev"
    echo ""
fi

# Run Integration Tests
echo "📦 Running Integration Tests..."
echo "--------------------------------"
cd /workspaces/agent-feed/api-server
npm test -- --run tests/integration/page-registration-automation.test.js || true
echo ""

# Run Middleware Tests
echo "🔧 Running Middleware Tests..."
echo "--------------------------------"
npm test -- --run tests/middleware/auto-register-pages.test.js || true
echo ""

# Run E2E Tests
echo "🌐 Running E2E Tests..."
echo "--------------------------------"
cd /workspaces/agent-feed/frontend
npx playwright test tests/e2e/page-builder/auto-registration.spec.ts || true
echo ""

echo "✅ Test Suite Complete!"
echo ""
echo "📊 View Results:"
echo "   - Integration: /workspaces/agent-feed/api-server/test-results/"
echo "   - E2E Reports: /workspaces/agent-feed/frontend/test-results/"
echo "   - Screenshots: /workspaces/agent-feed/frontend/test-results/screenshots/"
