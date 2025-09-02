#!/bin/bash

# WebSocket Stability Regression Test Runner
# Ensures the system remains stable after any changes

echo "🧪 WebSocket Stability Regression Test Suite"
echo "============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results
TESTS_PASSED=0
TESTS_FAILED=0

# Function to run a test
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    echo -e "\n🔍 Running: $test_name"
    echo "Command: $test_command"
    
    if eval "$test_command"; then
        echo -e "${GREEN}✅ PASSED: $test_name${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}❌ FAILED: $test_name${NC}"
        ((TESTS_FAILED++))
    fi
}

# Start backend for testing
echo "🚀 Starting backend for testing..."
node simple-backend.js &
BACKEND_PID=$!
sleep 5

# Check if backend started
if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${RED}❌ CRITICAL: Backend failed to start${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Backend started successfully${NC}"

# Test 1: Check for dual manager conflicts
run_test "Dual WebSocket Manager Detection" \
    "! grep -q 'WebSocketConnectionManager' simple-backend.js"

# Test 2: Frontend service conflicts
run_test "Frontend WebSocket Service Conflicts" \
    "[ ! -f 'frontend/src/services/WebSocketService.ts' ]"

# Test 3: Basic WebSocket connection
run_test "Basic WebSocket Connection" \
    "timeout 10s node -e '
    const WebSocket = require(\"ws\");
    const ws = new WebSocket(\"ws://localhost:3000/terminal\");
    ws.on(\"open\", () => { console.log(\"Connected\"); process.exit(0); });
    ws.on(\"error\", () => process.exit(1));
    '"

# Test 4: WebSocket stability (30-second test)
run_test "WebSocket 30-Second Stability" \
    "timeout 35s node -e '
    const WebSocket = require(\"ws\");
    const ws = new WebSocket(\"ws://localhost:3000/terminal\");
    let stable = true;
    ws.on(\"open\", () => {
        setTimeout(() => {
            if (ws.readyState === WebSocket.OPEN) {
                console.log(\"Connection stable after 30s\");
                process.exit(0);
            } else {
                console.log(\"Connection dropped\");
                process.exit(1);
            }
        }, 30000);
    });
    ws.on(\"close\", () => { stable = false; process.exit(1); });
    ws.on(\"error\", () => process.exit(1));
    '"

# Test 5: Instance creation and connection
run_test "Instance Creation and WebSocket Connection" \
    "timeout 15s node -e '
    const WebSocket = require(\"ws\");
    
    // Create instance
    fetch(\"http://localhost:3000/api/claude/instances\", {
        method: \"POST\",
        headers: { \"Content-Type\": \"application/json\" },
        body: JSON.stringify({ type: \"test\" })
    }).then(response => response.json())
    .then(data => {
        const instanceId = data.instance.id;
        
        // Connect WebSocket
        const ws = new WebSocket(\"ws://localhost:3000/terminal\");
        ws.on(\"open\", () => {
            ws.send(JSON.stringify({
                type: \"connect\",
                terminalId: instanceId
            }));
            setTimeout(() => {
                console.log(\"Instance connection successful\");
                process.exit(0);
            }, 3000);
        });
        ws.on(\"error\", () => process.exit(1));
    }).catch(() => process.exit(1));
    '"

# Test 6: Check for error patterns in logs
if [ -f "logs/combined.log" ]; then
    run_test "Log Error Pattern Check" \
        "! grep -q 'Connection lost: Unknown error' logs/combined.log"
        
    run_test "Ping Timeout Check" \
        "! grep -q 'ping timeout' logs/combined.log"
else
    echo -e "${YELLOW}ℹ️ No log file found - skipping log tests${NC}"
fi

# Test 7: Health endpoint validation
run_test "Health Endpoint Validation" \
    "curl -s http://localhost:3000/health | grep -q 'healthy'"

# Test 8: Package.json consistency
run_test "Package Dependencies Check" \
    "grep -q '\"ws\"' package.json"

# Clean up backend
echo -e "\n🧹 Cleaning up..."
kill $BACKEND_PID 2>/dev/null || true

# Results summary
echo -e "\n📊 REGRESSION TEST RESULTS"
echo "=========================="
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}🎉 ALL REGRESSION TESTS PASSED!${NC}"
    echo "WebSocket stability is maintained"
    exit 0
else
    echo -e "\n${RED}💥 REGRESSION DETECTED!${NC}"
    echo "WebSocket stability has been compromised"
    echo "Please check the failed tests above"
    exit 1
fi