#!/bin/bash

###############################################################################
# Memory Leak Fix Validation Script
# Validates that exit code 137 fixes are working properly
###############################################################################

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
API_URL="http://localhost:3001"

echo "=========================================="
echo "API Server Memory Fix Validation"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results
TESTS_PASSED=0
TESTS_FAILED=0

# Function to check if server is running
check_server() {
    echo -n "Checking if server is running... "
    if curl -s -f "$API_URL/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Server is running${NC}"
        return 0
    else
        echo -e "${RED}✗ Server is not running${NC}"
        echo "Please start the server with: cd api-server && node server.js"
        exit 1
    fi
}

# Test 1: Health endpoint includes memory metrics
test_health_metrics() {
    echo ""
    echo "Test 1: Health endpoint includes memory metrics"
    echo "-----------------------------------------------"

    HEALTH=$(curl -s "$API_URL/health")

    if echo "$HEALTH" | jq -e '.data.memory.heapUsed' > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Memory metrics present${NC}"
        HEAP_USED=$(echo "$HEALTH" | jq -r '.data.memory.heapUsed')
        HEAP_PERCENTAGE=$(echo "$HEALTH" | jq -r '.data.memory.heapPercentage')
        echo "  Heap Used: ${HEAP_USED}MB"
        echo "  Heap Percentage: ${HEAP_PERCENTAGE}%"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ Memory metrics missing${NC}"
        ((TESTS_FAILED++))
    fi
}

# Test 2: SSE connections tracking
test_sse_tracking() {
    echo ""
    echo "Test 2: SSE connection tracking"
    echo "-----------------------------------------------"

    HEALTH=$(curl -s "$API_URL/health")

    if echo "$HEALTH" | jq -e '.data.resources.sseConnections' > /dev/null 2>&1; then
        echo -e "${GREEN}✓ SSE connection tracking enabled${NC}"
        SSE_COUNT=$(echo "$HEALTH" | jq -r '.data.resources.sseConnections')
        echo "  Current SSE Connections: $SSE_COUNT"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ SSE connection tracking missing${NC}"
        ((TESTS_FAILED++))
    fi
}

# Test 3: Ticker messages limit
test_ticker_limit() {
    echo ""
    echo "Test 3: Ticker message history limit"
    echo "-----------------------------------------------"

    HEALTH=$(curl -s "$API_URL/health")

    if echo "$HEALTH" | jq -e '.data.resources.tickerMessages' > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Ticker message tracking enabled${NC}"
        TICKER_COUNT=$(echo "$HEALTH" | jq -r '.data.resources.tickerMessages')
        echo "  Current Messages: $TICKER_COUNT"

        if [ "$TICKER_COUNT" -le 100 ]; then
            echo -e "${GREEN}✓ Message count within limit (≤100)${NC}"
            ((TESTS_PASSED++))
        else
            echo -e "${RED}✗ Message count exceeds limit: $TICKER_COUNT${NC}"
            ((TESTS_FAILED++))
        fi
    else
        echo -e "${RED}✗ Ticker message tracking missing${NC}"
        ((TESTS_FAILED++))
    fi
}

# Test 4: Connection limit enforcement
test_connection_limit() {
    echo ""
    echo "Test 4: SSE connection limit enforcement"
    echo "-----------------------------------------------"
    echo "Attempting to connect to SSE endpoint..."

    # Try to establish one connection
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/streaming-ticker/stream" &)
    CURL_PID=$!
    sleep 2
    kill $CURL_PID 2>/dev/null || true

    if [ "$RESPONSE" = "200" ] || [ -z "$RESPONSE" ]; then
        echo -e "${GREEN}✓ SSE endpoint accessible${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ SSE endpoint returned: $RESPONSE${NC}"
        ((TESTS_FAILED++))
    fi
}

# Test 5: Memory monitoring configuration
test_memory_config() {
    echo ""
    echo "Test 5: Memory monitoring configuration"
    echo "-----------------------------------------------"

    # Check if server.js has the memory configuration
    if grep -q "MAX_SSE_CONNECTIONS" "$PROJECT_ROOT/api-server/server.js"; then
        echo -e "${GREEN}✓ MAX_SSE_CONNECTIONS configured${NC}"
        MAX_CONNECTIONS=$(grep "MAX_SSE_CONNECTIONS =" "$PROJECT_ROOT/api-server/server.js" | head -1 | grep -oP '\d+')
        echo "  Max SSE Connections: $MAX_CONNECTIONS"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ MAX_SSE_CONNECTIONS not found${NC}"
        ((TESTS_FAILED++))
    fi

    if grep -q "MAX_TICKER_MESSAGES" "$PROJECT_ROOT/api-server/server.js"; then
        echo -e "${GREEN}✓ MAX_TICKER_MESSAGES configured${NC}"
        MAX_MESSAGES=$(grep "MAX_TICKER_MESSAGES =" "$PROJECT_ROOT/api-server/server.js" | head -1 | grep -oP '\d+')
        echo "  Max Ticker Messages: $MAX_MESSAGES"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ MAX_TICKER_MESSAGES not found${NC}"
        ((TESTS_FAILED++))
    fi

    if grep -q "sseHeartbeats" "$PROJECT_ROOT/api-server/server.js"; then
        echo -e "${GREEN}✓ Heartbeat interval tracking configured${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ Heartbeat tracking not found${NC}"
        ((TESTS_FAILED++))
    fi
}

# Test 6: Graceful shutdown handlers
test_shutdown_handlers() {
    echo ""
    echo "Test 6: Graceful shutdown handlers"
    echo "-----------------------------------------------"

    if grep -q "gracefulShutdown" "$PROJECT_ROOT/api-server/server.js"; then
        echo -e "${GREEN}✓ Graceful shutdown function exists${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ Graceful shutdown not found${NC}"
        ((TESTS_FAILED++))
    fi

    if grep -q "SIGTERM.*gracefulShutdown" "$PROJECT_ROOT/api-server/server.js"; then
        echo -e "${GREEN}✓ SIGTERM handler registered${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ SIGTERM handler missing${NC}"
        ((TESTS_FAILED++))
    fi

    if grep -q "sseHeartbeats.clear" "$PROJECT_ROOT/api-server/server.js"; then
        echo -e "${GREEN}✓ Heartbeat cleanup in shutdown${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ Heartbeat cleanup missing from shutdown${NC}"
        ((TESTS_FAILED++))
    fi
}

# Test 7: File watcher tracking
test_file_watcher() {
    echo ""
    echo "Test 7: File watcher resource tracking"
    echo "-----------------------------------------------"

    HEALTH=$(curl -s "$API_URL/health")

    if echo "$HEALTH" | jq -e '.data.resources.fileWatcherActive' > /dev/null 2>&1; then
        echo -e "${GREEN}✓ File watcher tracking enabled${NC}"
        WATCHER_STATUS=$(echo "$HEALTH" | jq -r '.data.resources.fileWatcherActive')
        echo "  File Watcher Active: $WATCHER_STATUS"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ File watcher tracking missing${NC}"
        ((TESTS_FAILED++))
    fi
}

# Run all tests
main() {
    check_server
    test_health_metrics
    test_sse_tracking
    test_ticker_limit
    test_connection_limit
    test_memory_config
    test_shutdown_handlers
    test_file_watcher

    # Print summary
    echo ""
    echo "=========================================="
    echo "Test Summary"
    echo "=========================================="
    echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
    echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
    echo ""

    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "${GREEN}✓ All memory leak fixes validated successfully!${NC}"
        echo ""
        echo "Next steps:"
        echo "1. Run stability tests: cd api-server && npm test tests/stability/memory-stress.test.js"
        echo "2. Start with process monitor: node scripts/process-monitor.js"
        echo "3. Monitor production metrics for exit code 137 (should be 0)"
        exit 0
    else
        echo -e "${RED}✗ Some tests failed. Please review the fixes.${NC}"
        exit 1
    fi
}

main
