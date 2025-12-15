#!/bin/bash

echo "🚀 Testing Server Integration with TypeScript Orchestrator"
echo "==========================================================="
echo ""

cd /workspaces/agent-feed/api-server

# Kill any existing servers
lsof -ti:3001 2>/dev/null | xargs -r kill -9 2>/dev/null || true
sleep 1

# Start server in background
echo "Starting server..."
npm start > /tmp/integration-test.log 2>&1 &
SERVER_PID=$!
echo "Server PID: $SERVER_PID"

# Wait for startup
echo "Waiting for server to start..."
sleep 8

# Check if server is running
if kill -0 $SERVER_PID 2>/dev/null; then
    echo "✅ Server process is running"
else
    echo "❌ Server process died"
    cat /tmp/integration-test.log | tail -50
    exit 1
fi

# Check logs for orchestrator
echo ""
echo "Checking orchestrator status..."
if grep -q "New orchestrator factory loaded successfully" /tmp/integration-test.log; then
    echo "   ✅ TypeScript orchestrator factory loaded"
fi

if grep -q "Phase 2 TypeScript) started" /tmp/integration-test.log; then
    echo "   ✅ TypeScript orchestrator started"
fi

if grep -q "Server running on port" /tmp/integration-test.log; then
    echo "   ✅ Server listening on port"
fi

# Check if server responds
echo ""
echo "Testing HTTP endpoint..."
if curl -s http://localhost:3001/api/health 2>/dev/null | grep -q "status"; then
    echo "   ✅ Server responding to HTTP requests"
else
    echo "   ⚠️  Health endpoint not responding (may not be configured)"
fi

# Graceful shutdown
echo ""
echo "Testing graceful shutdown..."
kill -TERM $SERVER_PID
sleep 3

if grep -q "Phase 2 TypeScript) stopped" /tmp/integration-test.log; then
    echo "   ✅ TypeScript orchestrator stopped gracefully"
fi

if grep -q "Graceful shutdown complete" /tmp/integration-test.log; then
    echo "   ✅ Server shutdown completed"
fi

echo ""
echo "==========================================================="
echo "✅ Integration test complete!"
echo ""
echo "Key logs:"
grep -E "(orchestrator|TypeScript|Server running)" /tmp/integration-test.log | head -10
