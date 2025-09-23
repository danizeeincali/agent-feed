#!/bin/bash

# UI Test Runner Script
# Comprehensive UI testing with Playwright

set -e

echo "🚀 Starting Comprehensive UI Testing"
echo "======================================"

# Check if server is running
SERVER_URL="http://localhost:3000"
if ! curl -s "$SERVER_URL" > /dev/null; then
    echo "❌ Server not running on $SERVER_URL"
    echo "Please start the development server with: npm run dev"
    exit 1
fi

echo "✅ Server is running on $SERVER_URL"

# Create directories
mkdir -p /workspaces/agent-feed/tests/screenshots
mkdir -p /workspaces/agent-feed/tests/test-results

# Install Playwright browsers if not already installed
echo "🔧 Ensuring Playwright browsers are installed..."
npx playwright install --with-deps

# Run Playwright tests with custom config
echo "📱 Running UI verification tests..."
npx playwright test --config=/workspaces/agent-feed/tests/playwright-config/ui-verification.config.ts

# Run custom UI test runner
echo "🎨 Running comprehensive screenshot capture..."
cd /workspaces/agent-feed
npx ts-node tests/screenshots-tests/ui-test-runner.ts

echo ""
echo "✅ UI Testing Complete!"
echo "📊 Check the reports:"
echo "   - HTML Report: tests/screenshots/ui-test-report.html"
echo "   - JSON Report: tests/screenshots/ui-test-report.json"
echo "   - Screenshots: tests/screenshots/"
echo ""
echo "🔍 Open the HTML report in a browser to view detailed results."