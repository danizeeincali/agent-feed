#!/bin/bash

# Claude Code Integration Test Script
# Tests all aspects of the Claude Code integration

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

echo_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

echo_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

echo_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Configuration
BASE_URL="http://localhost:3000"
API_BASE="${BASE_URL}/api/v1"

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0
TOTAL_TESTS=0

# Function to run a test
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    echo_info "Running test: $test_name"
    ((TOTAL_TESTS++))
    
    if eval "$test_command"; then
        echo_success "✓ $test_name"
        ((TESTS_PASSED++))
        return 0
    else
        echo_error "✗ $test_name"
        ((TESTS_FAILED++))
        return 1
    fi
}

# Function to test API endpoint
test_api() {
    local endpoint="$1"
    local method="${2:-GET}"
    local expected_status="${3:-200}"
    local data="${4:-}"
    
    local curl_args=("-s" "-w" "%{http_code}" "-o" "/dev/null")
    
    if [ "$method" = "POST" ]; then
        curl_args+=("-X" "POST" "-H" "Content-Type: application/json")
        if [ -n "$data" ]; then
            curl_args+=("-d" "$data")
        fi
    fi
    
    local status_code
    status_code=$(curl "${curl_args[@]}" "${API_BASE}${endpoint}")
    
    if [ "$status_code" = "$expected_status" ]; then
        return 0
    else
        echo_error "Expected status $expected_status, got $status_code"
        return 1
    fi
}

# Function to test WebSocket connection
test_websocket() {
    echo_info "Testing WebSocket connection..."
    
    # Use Node.js to test WebSocket
    node -e "
    const io = require('socket.io-client');
    const socket = io('${BASE_URL}/claude', {
        auth: {
            userId: 'test-user'
        }
    });
    
    socket.on('connect', () => {
        console.log('WebSocket connected successfully');
        socket.disconnect();
        process.exit(0);
    });
    
    socket.on('connect_error', (error) => {
        console.error('WebSocket connection failed:', error.message);
        process.exit(1);
    });
    
    setTimeout(() => {
        console.error('WebSocket connection timeout');
        process.exit(1);
    }, 5000);
    " 2>/dev/null
}

# Function to test file operations
test_file_operations() {
    echo_info "Testing file operations..."
    
    # Test agent config file exists
    if [ -f "/workspaces/agent-feed/config/agents-config.json" ]; then
        echo_success "Agent configuration file exists"
    else
        echo_error "Agent configuration file missing"
        return 1
    fi
    
    # Test scripts exist and are executable
    local scripts=(
        "/workspaces/agent-feed/scripts/claude-setup.sh"
        "/workspaces/agent-feed/scripts/claude-auth.sh"
    )
    
    for script in "${scripts[@]}"; do
        if [ -x "$script" ]; then
            echo_success "Script $script exists and is executable"
        else
            echo_error "Script $script missing or not executable"
            return 1
        fi
    done
    
    return 0
}

# Function to test environment configuration
test_environment() {
    echo_info "Testing environment configuration..."
    
    # Check required environment variables
    local required_vars=(
        "NODE_ENV"
        "PORT"
    )
    
    for var in "${required_vars[@]}"; do
        if [ -n "${!var:-}" ]; then
            echo_success "Environment variable $var is set"
        else
            echo_warning "Environment variable $var is not set"
        fi
    done
    
    return 0
}

# Function to test Claude CLI availability
test_claude_cli() {
    echo_info "Testing Claude CLI availability..."
    
    if command -v claude &> /dev/null; then
        echo_success "Claude CLI is available"
        claude --version 2>/dev/null || echo_warning "Claude CLI version check failed"
        return 0
    else
        echo_warning "Claude CLI not found (expected in container)"
        return 0  # Not failing since it might not be installed yet
    fi
}

# Main test function
main() {
    echo_info "Starting Claude Code Integration Tests"
    echo_info "====================================="
    echo ""
    
    # Test 1: Environment configuration
    run_test "Environment Configuration" "test_environment"
    
    # Test 2: File operations
    run_test "File Operations" "test_file_operations"
    
    # Test 3: Claude CLI availability
    run_test "Claude CLI Availability" "test_claude_cli"
    
    # Test 4: API Health endpoint
    run_test "API Health Endpoint" "test_api '/health' 'GET' '200'"
    
    # Test 5: Claude health endpoint
    run_test "Claude Health Endpoint" "test_api '/claude/health' 'GET' '200'"
    
    # Test 6: Agent types endpoint
    run_test "Agent Types Endpoint" "test_api '/claude/agent-types' 'GET' '200'"
    
    # Test 7: Sessions endpoint
    run_test "Sessions Endpoint" "test_api '/claude/sessions' 'GET' '200'"
    
    # Test 8: Metrics endpoint
    run_test "Metrics Endpoint" "test_api '/claude/metrics' 'GET' '200'"
    
    # Test 9: WebSocket connection
    if command -v node &> /dev/null; then
        run_test "WebSocket Connection" "test_websocket"
    else
        echo_warning "Skipping WebSocket test (Node.js not available)"
    fi
    
    # Test 10: Create session API
    run_test "Create Session API" "test_api '/claude/sessions' 'POST' '201' '{\"topology\":\"mesh\",\"maxAgents\":3}'"
    
    echo ""
    echo_info "Test Results"
    echo_info "============"
    echo_info "Total tests: $TOTAL_TESTS"
    echo_success "Passed: $TESTS_PASSED"
    
    if [ $TESTS_FAILED -gt 0 ]; then
        echo_error "Failed: $TESTS_FAILED"
        echo ""
        echo_error "Some tests failed. Please check the implementation."
        exit 1
    else
        echo_success "All tests passed!"
        echo ""
        echo_success "Claude Code integration is working correctly!"
        exit 0
    fi
}

# Handle command line arguments
case "${1:-test}" in
    "test")
        main
        ;;
    "api")
        echo_info "Testing API endpoints only..."
        run_test "API Health" "test_api '/health' 'GET' '200'"
        run_test "Claude Health" "test_api '/claude/health' 'GET' '200'"
        run_test "Agent Types" "test_api '/claude/agent-types' 'GET' '200'"
        ;;
    "websocket")
        echo_info "Testing WebSocket connection only..."
        run_test "WebSocket" "test_websocket"
        ;;
    "files")
        echo_info "Testing file operations only..."
        run_test "File Operations" "test_file_operations"
        ;;
    "help")
        echo "Usage: $0 [test|api|websocket|files|help]"
        echo ""
        echo "Commands:"
        echo "  test      - Run all tests (default)"
        echo "  api       - Test API endpoints only"
        echo "  websocket - Test WebSocket connection only"
        echo "  files     - Test file operations only"
        echo "  help      - Show this help message"
        ;;
    *)
        echo_error "Unknown command: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac