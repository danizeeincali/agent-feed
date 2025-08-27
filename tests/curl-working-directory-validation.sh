#!/bin/bash

# Curl-based Working Directory Validation Script
# Tests the Claude instance creation API to validate working directories

echo "🧪 Testing Claude Instance Working Directory Bug Fix"
echo "=================================================="

API_BASE="http://localhost:3000"
CLEANUP_INSTANCES=()

cleanup() {
    echo -e "\n🧹 Cleaning up test instances..."
    for instance_id in "${CLEANUP_INSTANCES[@]}"; do
        if [ -n "$instance_id" ]; then
            echo "   Deleting $instance_id..."
            curl -s -X DELETE "$API_BASE/api/claude/instances/$instance_id" > /dev/null
        fi
    done
}

trap cleanup EXIT

test_button_config() {
    local button_name="$1"
    local command_array="$2"
    local expected_working_dir="$3"
    
    echo -e "\n🔘 Testing: $button_name"
    echo "   Command: $command_array"
    echo "   Expected Working Dir: $expected_working_dir"
    
    # Make API request
    response=$(curl -s -X POST "$API_BASE/api/claude/instances" \
        -H "Content-Type: application/json" \
        -d "$command_array")
    
    echo "   Response: $response"
    
    # Extract instance ID for cleanup
    instance_id=$(echo "$response" | grep -o '"instanceId":"[^"]*"' | cut -d'"' -f4)
    if [ -n "$instance_id" ]; then
        CLEANUP_INSTANCES+=("$instance_id")
        echo "   ✅ Instance created: $instance_id"
    else
        echo "   ❌ No instance ID found"
    fi
    
    # Check if success
    if echo "$response" | grep -q '"success":true'; then
        echo "   ✅ API call successful"
    else
        echo "   ❌ API call failed"
    fi
}

echo -e "\n📋 Testing Button 1: prod/claude (should use /workspaces/agent-feed/prod)"
test_button_config "prod/claude" '{"command":["claude"],"workingDirectory":"/workspaces/agent-feed/prod"}' "/workspaces/agent-feed/prod"

echo -e "\n📋 Testing Button 2: skip-permissions (should use /workspaces/agent-feed)"
test_button_config "skip-permissions" '{"command":["claude","--dangerously-skip-permissions"],"workingDirectory":"/workspaces/agent-feed"}' "/workspaces/agent-feed"

echo -e "\n📋 Testing Button 3: skip-permissions -c (should use /workspaces/agent-feed)"
test_button_config "skip-permissions-c" '{"command":["claude","--dangerously-skip-permissions","-c"],"workingDirectory":"/workspaces/agent-feed"}' "/workspaces/agent-feed"

echo -e "\n📋 Testing Button 4: skip-permissions --resume (should use /workspaces/agent-feed)"
test_button_config "skip-permissions-resume" '{"command":["claude","--dangerously-skip-permissions","--resume"],"workingDirectory":"/workspaces/agent-feed"}' "/workspaces/agent-feed"

echo -e "\n🎯 CONCLUSION:"
echo "Based on the backend logs visible during these tests, check if:"
echo "1. Button 1 shows 'Working Directory: /workspaces/agent-feed/prod'"
echo "2. Other buttons show 'Working Directory: /workspaces/agent-feed'"
echo -e "\nIf the logs show the correct working directories, the bug is FIXED! ✅"
echo "If all show '/workspaces/agent-feed', the bug still exists. ❌"