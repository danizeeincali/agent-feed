#!/bin/bash

# Claude Instance Frontend Playwright Test Runner
# Comprehensive test execution script with environment validation

set -e

echo "🚀 Starting Claude Instance Frontend Playwright Tests..."
echo "=================================================="

# Check if we're in the right directory
if [ ! -f "playwright.config.ts" ]; then
    echo "❌ Error: Must be run from the playwright test directory"
    echo "   Please run: cd /workspaces/agent-feed/tests/playwright"
    exit 1
fi

# Function to check service availability
check_service() {
    local url=$1
    local name=$2
    local timeout=${3:-30}
    
    echo "🔍 Checking $name at $url..."
    
    local count=0
    while [ $count -lt $timeout ]; do
        if curl -s "$url" > /dev/null 2>&1; then
            echo "✅ $name is ready"
            return 0
        fi
        count=$((count + 1))
        sleep 1
        echo -n "."
    done
    
    echo "❌ $name is not available after ${timeout}s"
    return 1
}

# Validate environment
echo "📋 Validating test environment..."

# Check backend
if ! check_service "http://localhost:3000/api/health" "Backend"; then
    echo "⚠️  Backend not ready. Starting backend..."
    cd /workspaces/agent-feed
    node simple-backend.js &
    BACKEND_PID=$!
    sleep 5
    cd tests/playwright
    
    if ! check_service "http://localhost:3000/api/health" "Backend" 20; then
        echo "❌ Could not start backend"
        kill $BACKEND_PID 2>/dev/null || true
        exit 1
    fi
fi

# Check frontend  
if ! check_service "http://localhost:3001" "Frontend"; then
    echo "⚠️  Frontend not ready. Please start frontend manually:"
    echo "   cd /workspaces/agent-feed/frontend && npm run dev"
    exit 1
fi

# Check Claude CLI availability
echo "🤖 Checking Claude CLI availability..."
if ! command -v claude &> /dev/null; then
    echo "⚠️  Claude CLI not found in PATH"
    echo "   Tests may fail if Claude is not available"
fi

# Install Playwright if needed
if [ ! -d "node_modules/@playwright" ]; then
    echo "📦 Installing Playwright dependencies..."
    npm install @playwright/test
    npx playwright install
fi

# Run tests based on argument
case "${1:-all}" in
    "all")
        echo "🧪 Running all Playwright tests..."
        npx playwright test
        ;;
    "buttons")
        echo "🔘 Running button validation tests..."
        npx playwright test claude-instance-button-validation.spec.ts
        ;;
    "sse")
        echo "📡 Running SSE streaming tests..."
        npx playwright test sse-terminal-stream-validation.spec.ts
        ;;
    "status")
        echo "📊 Running status update tests..."
        npx playwright test instance-status-updates.spec.ts
        ;;
    "errors")
        echo "🚨 Running error handling tests..."
        npx playwright test error-handling-recovery.spec.ts
        ;;
    "io")
        echo "⌨️ Running bidirectional I/O tests..."
        npx playwright test bidirectional-io-validation.spec.ts
        ;;
    "integration")
        echo "🔗 Running comprehensive integration tests..."
        npx playwright test comprehensive-integration.spec.ts
        ;;
    "ui")
        echo "🎨 Running tests with UI mode..."
        npx playwright test --ui
        ;;
    "debug")
        echo "🐛 Running tests in debug mode..."
        npx playwright test --debug
        ;;
    "headed")
        echo "👁️ Running tests with visible browser..."
        npx playwright test --headed
        ;;
    *)
        echo "Usage: $0 [all|buttons|sse|status|errors|io|integration|ui|debug|headed]"
        echo ""
        echo "Test Categories:"
        echo "  all         - Run complete test suite (default)"
        echo "  buttons     - Button click validation"
        echo "  sse         - SSE terminal streaming"
        echo "  status      - Instance status updates"
        echo "  errors      - Error handling & recovery"
        echo "  io          - Bidirectional I/O validation"
        echo "  integration - Comprehensive integration tests"
        echo ""
        echo "Debug Options:"
        echo "  ui          - Interactive UI mode"
        echo "  debug       - Step-through debugging"
        echo "  headed      - Visible browser mode"
        exit 1
        ;;
esac

echo "=================================================="
echo "✅ Playwright test execution completed!"
echo ""
echo "📊 Test results available in:"
echo "   • HTML Report: playwright-report/index.html"
echo "   • JSON Results: test-results/results.json"
echo "   • JUnit XML: test-results/results.xml"
echo ""
echo "📸 Screenshots and videos (if any failures) in: test-results/"

# Clean up background processes if we started them
if [ ! -z "$BACKEND_PID" ]; then
    echo "🧹 Cleaning up background processes..."
    kill $BACKEND_PID 2>/dev/null || true
fi