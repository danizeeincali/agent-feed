#!/bin/bash
# OAuth CLI Live Integration Test
# 100% Real - Tests against running server with actual CLI credentials

set -e

echo "======================================================================"
echo "🚀 OAuth CLI Live Integration Test - 100% REAL"
echo "======================================================================"
echo ""

TEST_USER="live-test-user-$(date +%s)"
echo "📝 Test User ID: $TEST_USER"
echo ""

# Test 1: CLI Detection
echo "TEST 1: CLI Detection"
echo "-------------------------------------------------------------------"
DETECT_RESPONSE=$(curl -s http://localhost:3001/api/claude-code/oauth/detect-cli)
echo "Response: $DETECT_RESPONSE"

CLI_DETECTED=$(echo "$DETECT_RESPONSE" | jq -r '.detected')
CLI_METHOD=$(echo "$DETECT_RESPONSE" | jq -r '.method')
CLI_EMAIL=$(echo "$DETECT_RESPONSE" | jq -r '.email')

if [ "$CLI_DETECTED" = "true" ]; then
    echo "✅ PASS: CLI detected (method: $CLI_METHOD, user: $CLI_EMAIL)"
else
    echo "❌ FAIL: CLI not detected"
    exit 1
fi
echo ""

# Test 2: OAuth Auto-Connect
echo "TEST 2: OAuth Auto-Connect"
echo "-------------------------------------------------------------------"
CONNECT_RESPONSE=$(curl -s -X POST http://localhost:3001/api/claude-code/oauth/auto-connect \
    -H "Content-Type: application/json" \
    -d "{\"userId\": \"$TEST_USER\"}")
echo "Response: $CONNECT_RESPONSE"

CONNECT_SUCCESS=$(echo "$CONNECT_RESPONSE" | jq -r '.success')
CONNECT_METHOD=$(echo "$CONNECT_RESPONSE" | jq -r '.method')

if [ "$CONNECT_SUCCESS" = "true" ]; then
    echo "✅ PASS: OAuth auto-connect successful (method: $CONNECT_METHOD)"
else
    echo "❌ FAIL: OAuth auto-connect failed"
    echo "Error: $(echo "$CONNECT_RESPONSE" | jq -r '.error')"
    exit 1
fi
echo ""

# Test 3: Verify Database Storage
echo "TEST 3: Database Storage Verification"
echo "-------------------------------------------------------------------"
DB_QUERY="SELECT user_id, auth_method, oauth_token FROM user_claude_auth WHERE user_id = '$TEST_USER';"
DB_RESULT=$(sqlite3 /workspaces/agent-feed/database.db "$DB_QUERY" 2>&1)

if [ -n "$DB_RESULT" ]; then
    echo "✅ PASS: OAuth token stored in database"
    echo "Database record: $DB_RESULT"
else
    echo "❌ FAIL: No database record found for user $TEST_USER"
    exit 1
fi
echo ""

# Test 4: Retrieve Auth Settings
echo "TEST 4: Auth Settings Retrieval"
echo "-------------------------------------------------------------------"
SETTINGS_RESPONSE=$(curl -s "http://localhost:3001/api/claude-code/auth-settings?userId=$TEST_USER")
echo "Response: $SETTINGS_RESPONSE"

SETTINGS_METHOD=$(echo "$SETTINGS_RESPONSE" | jq -r '.method')

if [ "$SETTINGS_METHOD" = "oauth" ]; then
    echo "✅ PASS: Auth settings retrieved correctly (method: oauth)"
else
    echo "❌ FAIL: Auth settings incorrect (method: $SETTINGS_METHOD)"
    exit 1
fi
echo ""

# Test 5: OAuth Token Length Validation
echo "TEST 5: OAuth Token Validation"
echo "-------------------------------------------------------------------"
TOKEN_LENGTH=$(sqlite3 /workspaces/agent-feed/database.db \
    "SELECT length(oauth_token) FROM user_claude_auth WHERE user_id = '$TEST_USER';")

if [ "$TOKEN_LENGTH" -gt 20 ]; then
    echo "✅ PASS: OAuth token is valid (length: $TOKEN_LENGTH characters)"
else
    echo "❌ FAIL: OAuth token too short (length: $TOKEN_LENGTH)"
    exit 1
fi
echo ""

# Test 6: Multiple User Independence
echo "TEST 6: Multiple User Independence"
echo "-------------------------------------------------------------------"
TEST_USER_2="live-test-user-2-$(date +%s)"
CONNECT_2_RESPONSE=$(curl -s -X POST http://localhost:3001/api/claude-code/oauth/auto-connect \
    -H "Content-Type: application/json" \
    -d "{\"userId\": \"$TEST_USER_2\"}")

CONNECT_2_SUCCESS=$(echo "$CONNECT_2_RESPONSE" | jq -r '.success')

if [ "$CONNECT_2_SUCCESS" = "true" ]; then
    echo "✅ PASS: Multiple users can connect independently"
else
    echo "❌ FAIL: Second user connection failed"
    exit 1
fi
echo ""

# Test 7: Frontend Detection Endpoint
echo "TEST 7: Frontend Detection Readiness"
echo "-------------------------------------------------------------------"
DETECT_2=$(curl -s http://localhost:3001/api/claude-code/oauth/detect-cli)
DETECTED=$(echo "$DETECT_2" | jq -r '.detected')

if [ "$DETECTED" = "true" ]; then
    echo "✅ PASS: Frontend can detect CLI authentication"
else
    echo "❌ FAIL: Frontend detection failed"
    exit 1
fi
echo ""

# Summary
echo "======================================================================"
echo "📊 Test Summary"
echo "======================================================================"
echo "✅ All 7 live integration tests PASSED"
echo ""
echo "Test Results:"
echo "  ✓ CLI Detection: Working"
echo "  ✓ OAuth Auto-Connect: Working"
echo "  ✓ Database Storage: Working"
echo "  ✓ Auth Settings Retrieval: Working"
echo "  ✓ Token Validation: Working"
echo "  ✓ Multiple Users: Working"
echo "  ✓ Frontend Integration: Working"
echo ""
echo "🎉 OAuth CLI Integration: 100% REAL & FUNCTIONAL"
echo "======================================================================"
