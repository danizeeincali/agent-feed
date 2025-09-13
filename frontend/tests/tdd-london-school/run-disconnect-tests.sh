#!/bin/bash

# TDD London School: API Data Loading Disconnect Test Runner
# 
# This script runs the comprehensive test suite to expose the exact point
# where successful API responses fail to reach component state.

set -e

echo "🚀 TDD London School: API Data Loading Disconnect Investigation"
echo "================================================================="

# Check if backend is running
echo "🔍 Checking backend availability..."
if ! curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "❌ Backend not running at localhost:3000"
    echo "Starting backend..."
    cd /workspaces/agent-feed
    node simple-backend.js &
    BACKEND_PID=$!
    
    # Wait for backend to start
    echo "⏳ Waiting for backend to start..."
    for i in {1..30}; do
        if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
            echo "✅ Backend is ready"
            break
        fi
        sleep 1
        if [ $i -eq 30 ]; then
            echo "❌ Backend failed to start within 30 seconds"
            exit 1
        fi
    done
else
    echo "✅ Backend is running"
fi

# Verify test data exists
echo "🔍 Verifying test data..."
AGENT_ID="personal-todos-agent"
PAGE_ID="015b7296-a144-4096-9c60-ee5d7f900723"

API_RESPONSE=$(curl -s "http://localhost:3000/api/agents/${AGENT_ID}/pages")
if echo "$API_RESPONSE" | grep -q '"success":true'; then
    echo "✅ Test data available"
    PAGE_COUNT=$(echo "$API_RESPONSE" | grep -o '"id"' | wc -l)
    echo "   Pages found: $PAGE_COUNT"
    
    if echo "$API_RESPONSE" | grep -q "$PAGE_ID"; then
        echo "   ✅ Target page exists: $PAGE_ID"
    else
        echo "   ⚠️  Target page not found, but test can still run"
    fi
else
    echo "⚠️  API not returning success, but test will still reveal issues"
fi

# Change to frontend directory
cd /workspaces/agent-feed/frontend

echo ""
echo "🧪 Running TDD London School Test Suite"
echo "======================================="

# Run the specific test file with detailed output
echo "📝 Test: API Data Loading Disconnect Analysis"

# Run with Jest directly for better control
npx jest \
    --testPathPattern="api-data-loading-disconnect.test.ts" \
    --verbose \
    --detectOpenHandles \
    --forceExit \
    --runInBand \
    --no-cache \
    --testTimeout=30000 \
    --reporters=default \
    --reporters=jest-junit \
    --outputFile=./tests/reports/disconnect-results.xml

TEST_EXIT_CODE=$?

echo ""
echo "📊 Test Results Summary"
echo "======================"

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "🎉 All tests PASSED - This indicates the disconnect issue may be resolved"
    echo "   or the test conditions don't match the production scenario."
else
    echo "💥 Tests FAILED - Disconnect issue successfully reproduced!"
    echo "   Check the test output above for specific failure points."
fi

# Analyze test results
echo ""
echo "🔍 Test Analysis"
echo "==============="

if [ -f "./tests/reports/disconnect-results.xml" ]; then
    FAILED_TESTS=$(grep -c 'failure\|error' ./tests/reports/disconnect-results.xml || echo "0")
    echo "Failed test count: $FAILED_TESTS"
fi

# Show which layer failed
echo ""
echo "📋 Layer-by-Layer Analysis:"
echo "  Layer 1 (API Contract): Check if direct API calls succeeded"
echo "  Layer 2 (Data Transform): Check if transformation logic worked"
echo "  Layer 3 (Component Integration): Check if React components displayed content"
echo "  Layer 4 (State Management): Check if React state was updated correctly"
echo "  Layer 5 (Race Conditions): Check for timing issues"

echo ""
echo "🎯 Next Steps:"
echo "============="
echo "1. Review test output above to identify which layer failed"
echo "2. Focus debugging efforts on the first failing layer"
echo "3. Use the console logs to trace data flow"
echo "4. Check network requests captured by the interceptor"

# Cleanup background processes if we started them
if [ ! -z "$BACKEND_PID" ]; then
    echo ""
    echo "🧹 Cleaning up..."
    kill $BACKEND_PID 2>/dev/null || true
fi

echo ""
echo "✅ TDD London School test investigation complete!"
echo "Exit code: $TEST_EXIT_CODE"

exit $TEST_EXIT_CODE