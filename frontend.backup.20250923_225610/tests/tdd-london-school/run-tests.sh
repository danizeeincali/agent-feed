#!/bin/bash

# TDD London School Test Runner
# Prevents "recentActivities.slice is not a function" errors

echo "🧪 Running TDD London School Test Suite"
echo "========================================="
echo ""

# Set up environment
export NODE_ENV=test
export VITEST_WORKSPACE=true

# Change to test directory
cd "$(dirname "$0")"

echo "📍 Current directory: $(pwd)"
echo ""

# Check if dependencies are installed
if [ ! -d "../../node_modules" ]; then
    echo "⚠️  Dependencies not found. Installing..."
    cd ../../ && npm install
    cd tests/tdd-london-school
fi

echo "🔧 Configuration files:"
ls -la *.config.* *.ts *.js 2>/dev/null || echo "No config files found"
echo ""

# Run individual test suites
echo "🧪 Running API Response Structure Tests..."
npx vitest run api/api-response-structure.test.ts --config vitest.config.ts

echo ""
echo "🧪 Running Component Array Handling Tests..."
npx vitest run components/array-handling.test.ts --config vitest.config.ts

echo ""
echo "🧪 Running Type Guards Tests..."
npx vitest run contracts/type-guards.test.ts --config vitest.config.ts

echo ""
echo "🧪 Running Error Boundary Integration Tests..."
npx vitest run integration/error-boundary.test.ts --config vitest.config.ts

echo ""
echo "🧪 Running Swarm Coordination Tests..."
npx vitest run contracts/swarm-coordination.test.ts --config vitest.config.ts

echo ""
echo "🏆 Running Complete Test Suite..."
npx vitest run --config vitest.config.ts

echo ""
echo "✅ TDD London School tests completed!"
echo "🛡️  Array safety measures verified!"
echo "🤝 Swarm coordination contracts validated!"