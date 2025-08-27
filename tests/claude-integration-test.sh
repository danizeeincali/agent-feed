#!/bin/bash

# Claude CLI Integration Test Script
# Tests various aspects of Claude CLI integration

set -e

echo "=== Claude CLI Integration Test ==="
echo "Testing Claude CLI behavior and integration requirements"
echo

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_test() {
    echo -e "${YELLOW}[TEST]${NC} $1"
}

log_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

log_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
}

log_info() {
    echo -e "${YELLOW}[INFO]${NC} $1"
}

# Test 1: Check if Claude CLI exists
log_test "Checking if Claude CLI is installed"
if command -v claude &> /dev/null; then
    CLAUDE_PATH=$(which claude)
    log_pass "Claude CLI found at: $CLAUDE_PATH"
else
    log_fail "Claude CLI not found in PATH"
    echo "Attempting to find claude executable..."
    find /usr -name "claude" 2>/dev/null || echo "No claude executable found in /usr"
    find /opt -name "claude" 2>/dev/null || echo "No claude executable found in /opt"
    find $HOME -name "claude" 2>/dev/null || echo "No claude executable found in home directory"
fi

# Test 2: Check Claude CLI version/help
log_test "Testing Claude CLI help command"
timeout 10s claude --help 2>&1 || {
    log_fail "Claude --help failed or timed out"
}

log_test "Testing Claude CLI version command"
timeout 10s claude --version 2>&1 || {
    log_fail "Claude --version failed or timed out"
}

# Test 3: Test non-interactive input
log_test "Testing non-interactive input (echo)"
echo "Hello Claude!" | timeout 5s claude 2>&1 && {
    log_pass "Claude accepts piped input"
} || {
    log_fail "Claude does not accept piped input or requires interactive mode"
}

# Test 4: Test with empty input
log_test "Testing with empty input"
echo "" | timeout 3s claude 2>&1 && {
    log_pass "Claude handles empty input"
} || {
    log_fail "Claude fails with empty input"
}

# Test 5: Test working directory behavior
log_test "Testing working directory behavior"
cd /workspaces/agent-feed/prod && timeout 5s claude --help >/dev/null 2>&1 && {
    log_pass "Claude works in prod directory"
} || {
    log_fail "Claude fails in prod directory"
}

cd /workspaces/agent-feed && timeout 5s claude --help >/dev/null 2>&1 && {
    log_pass "Claude works in project root"
} || {
    log_fail "Claude fails in project root"
}

# Test 6: Check environment variables
log_test "Checking relevant environment variables"
env | grep -i claude || log_info "No CLAUDE environment variables found"
env | grep -i anthropic || log_info "No ANTHROPIC environment variables found"

# Test 7: Test authentication status
log_test "Testing authentication status"
claude auth status 2>&1 && {
    log_pass "Claude auth status command works"
} || {
    log_fail "Claude auth status command failed (may need login)"
}

# Test 8: Check file permissions on claude executable
if command -v claude &> /dev/null; then
    log_test "Checking Claude CLI permissions"
    CLAUDE_PATH=$(which claude)
    ls -la "$CLAUDE_PATH"
    file "$CLAUDE_PATH"
fi

# Test 9: Test with different input methods
log_test "Testing with printf input"
printf "Test message\n" | timeout 3s claude 2>&1 && {
    log_pass "Claude works with printf input"
} || {
    log_fail "Claude fails with printf input"
}

# Test 10: Test TTY requirements
log_test "Testing TTY requirements"
if command -v script &> /dev/null; then
    script -qec "timeout 3s claude --help" /dev/null && {
        log_pass "Claude works with pseudo-TTY"
    } || {
        log_fail "Claude fails with pseudo-TTY"
    }
else
    log_info "script command not available, skipping TTY test"
fi

# Test 11: Test session behavior
log_test "Testing session behavior"
echo "session test" | timeout 3s claude 2>&1 | head -n 5

echo
echo "=== Integration Test Complete ==="
echo "Review the output above for any failures or issues."
echo "If Claude CLI is not found, it may need to be installed or added to PATH."
echo "If authentication fails, run: claude auth login"
echo