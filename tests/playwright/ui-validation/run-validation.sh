#!/bin/bash

# Comprehensive UI Validation Runner for Agents Page
# This script runs Playwright MCP validation tests

set -e

echo "🚀 Starting Comprehensive UI Validation for Agents Page"
echo "=================================================="

# Create test results directory
mkdir -p test-results

# Ensure server is running
echo "📡 Checking server status..."
if ! curl -s http://localhost:5173/agents --max-time 5 > /dev/null; then
    echo "❌ Server not accessible. Please ensure the development server is running."
    echo "Run: npm run dev"
    exit 1
fi

echo "✅ Server is accessible"

# Install Playwright browsers if needed
echo "🔧 Ensuring Playwright browsers are installed..."
npx playwright install chromium firefox webkit

# Run the validation tests
echo "🧪 Running comprehensive UI validation tests..."
npx playwright test --config tests/playwright/ui-validation/playwright.config.ts \
    --reporter=html \
    --reporter=json:test-results/validation-results.json \
    --output-dir=test-results/ui-validation-artifacts

# Generate summary report
echo "📊 Generating validation summary..."
node -e "
const fs = require('fs');
const path = require('path');

try {
    const resultsPath = 'test-results/validation-results.json';
    if (fs.existsSync(resultsPath)) {
        const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));

        console.log('\\n📋 VALIDATION SUMMARY');
        console.log('=====================');
        console.log(\`Total Tests: \${results.stats.total}\`);
        console.log(\`Passed: \${results.stats.passed}\`);
        console.log(\`Failed: \${results.stats.failed}\`);
        console.log(\`Skipped: \${results.stats.skipped}\`);
        console.log(\`Duration: \${Math.round(results.stats.duration / 1000)}s\`);

        if (results.stats.failed > 0) {
            console.log('\\n❌ Failed Tests:');
            results.tests.filter(t => t.status === 'failed').forEach(test => {
                console.log(\`  - \${test.title}\`);
            });
        }

        console.log('\\n📁 Generated Files:');
        console.log('  - HTML Report: test-results/ui-validation-report/index.html');
        console.log('  - Screenshots: test-results/*.png');
        console.log('  - JSON Results: test-results/validation-results.json');
    }
} catch (error) {
    console.log('Could not parse test results');
}
"

echo ""
echo "✅ UI Validation Complete!"
echo "📁 View results: test-results/ui-validation-report/index.html"
echo "📸 Screenshots saved in: test-results/"