#!/bin/bash

# TDD London School Debug Test Runner
# Runs the failing test to expose the "No pages yet" root cause

echo "🔍 TDD LONDON SCHOOL DEBUG: Running failing test to expose root cause..."
echo "════════════════════════════════════════════════════════════════════"

cd /workspaces/agent-feed/frontend

# Check if required dependencies are available
echo "📦 Checking test dependencies..."

if ! command -v npx &> /dev/null; then
    echo "❌ npx not found. Please install Node.js"
    exit 1
fi

# Install testing dependencies if not present
if ! npm list --depth=0 @testing-library/react &> /dev/null; then
    echo "📦 Installing missing test dependencies..."
    npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event
fi

echo "🧪 Running TDD London School failing test..."
echo "Expected result: ALL TESTS SHOULD FAIL - this exposes the bug"
echo ""

# Run the specific failing test with verbose output
npx jest \
  --config=tests/tdd-london-school/urgent-debug/jest.config.js \
  --setupFilesAfterEnv=tests/tdd-london-school/urgent-debug/jest.setup.js \
  --testPathPattern=agent-dynamic-page-failure.test.tsx \
  --verbose \
  --no-cache \
  --detectOpenHandles \
  --forceExit \
  || echo ""

echo ""
echo "════════════════════════════════════════════════════════════════════"
echo "🔬 ANALYSIS: If tests failed as expected, they exposed the root cause"
echo "💡 Next step: Fix the useEffect dependency timing issue in AgentDynamicPage"
echo "📍 Bug location: AgentDynamicPage.tsx lines 294-304 (useEffect with initialPageId)"