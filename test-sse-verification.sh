#!/bin/bash

# Terminal SSE Broadcast Verification Test
# Tests that input processing correctly broadcasts to SSE connections

set -e

BASE_URL="http://localhost:3000"
INSTANCE_ID="claude-test-verify"
TEST_INPUT="Hello SSE Test"

echo "🚀 Terminal SSE Broadcast Verification Test"
echo "============================================="

echo "📡 Step 1: Starting SSE connection in background..."

# Start SSE connection and capture output
curl -s -N "${BASE_URL}/api/claude/instances/${INSTANCE_ID}/terminal/stream" > sse_output.tmp &
SSE_PID=$!

echo "✅ SSE connection started (PID: $SSE_PID)"

# Give SSE connection time to establish
echo "⏳ Waiting 2 seconds for SSE connection to establish..."
sleep 2

echo "⌨️ Step 2: Sending terminal input..."

# Send input via API
curl -s -X POST "${BASE_URL}/api/claude/instances/${INSTANCE_ID}/terminal/input" \
  -H "Content-Type: application/json" \
  -d "{\"input\":\"${TEST_INPUT}\"}" | jq '.'

echo "⏳ Waiting 2 seconds for SSE broadcast..."
sleep 2

# Stop SSE connection
echo "🛑 Step 3: Stopping SSE connection..."
kill $SSE_PID 2>/dev/null || true
wait $SSE_PID 2>/dev/null || true

echo "📊 Step 4: Analyzing SSE output..."

if [ -f "sse_output.tmp" ]; then
    echo "📨 SSE Events Received:"
    echo "----------------------"
    
    # Count different event types
    CONNECTED_EVENTS=$(grep -c '"type":"connected"' sse_output.tmp || echo "0")
    INPUT_ECHO_EVENTS=$(grep -c '"type":"input_echo"' sse_output.tmp || echo "0")
    OUTPUT_EVENTS=$(grep -c '"type":"output"' sse_output.tmp || echo "0")
    
    echo "✅ Connected events: $CONNECTED_EVENTS"
    echo "📝 Input echo events: $INPUT_ECHO_EVENTS"
    echo "📤 Output events: $OUTPUT_EVENTS"
    
    # Check if our test input appears in input_echo
    if grep -q "input_echo" sse_output.tmp && grep -q "$TEST_INPUT" sse_output.tmp; then
        echo "✅ SUCCESS: Input echo found in SSE stream"
        ECHO_SUCCESS=true
    else
        echo "❌ FAILURE: Input echo not found in SSE stream"
        ECHO_SUCCESS=false
    fi
    
    # Check if output event was generated
    if [ "$OUTPUT_EVENTS" -gt 0 ]; then
        echo "✅ SUCCESS: Output events generated"
        OUTPUT_SUCCESS=true
    else
        echo "❌ FAILURE: No output events generated"
        OUTPUT_SUCCESS=false
    fi
    
    echo ""
    echo "📋 Raw SSE Output (last 10 lines):"
    echo "-----------------------------------"
    tail -10 sse_output.tmp | head -10
    
    # Overall result
    echo ""
    echo "🎯 Test Results Summary:"
    echo "========================"
    
    if [ "$ECHO_SUCCESS" = true ] && [ "$OUTPUT_SUCCESS" = true ]; then
        echo "🎉 SUCCESS: Terminal input echo via SSE is working correctly!"
        echo "✅ Input processing: Working"
        echo "✅ SSE broadcasting: Working"
        echo "✅ Input echo: Working"
        echo "✅ Output generation: Working"
        EXIT_CODE=0
    else
        echo "❌ FAILURE: Terminal input echo via SSE has issues!"
        [ "$ECHO_SUCCESS" = false ] && echo "❌ Input echo: Failed"
        [ "$OUTPUT_SUCCESS" = false ] && echo "❌ Output generation: Failed"
        EXIT_CODE=1
    fi
    
else
    echo "❌ FAILURE: No SSE output captured"
    EXIT_CODE=1
fi

# Cleanup
rm -f sse_output.tmp

echo ""
echo "🏁 Test completed with exit code: $EXIT_CODE"
exit $EXIT_CODE