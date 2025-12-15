#!/bin/bash

# Claude Authentication Management Script
# Handles Claude account login, token management, and session persistence

set -euo pipefail

# Configuration
CLAUDE_CONFIG_DIR="${HOME}/.claude"
CLAUDE_TOKEN_FILE="${CLAUDE_CONFIG_DIR}/token"
CLAUDE_SESSION_FILE="${CLAUDE_CONFIG_DIR}/session"
AGENT_FEED_CONFIG="/workspaces/agent-feed/.env"

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

# Function to check if Claude CLI is available
check_claude_cli() {
    if ! command -v claude &> /dev/null; then
        echo_error "Claude CLI not found. Please run claude-setup.sh first."
        exit 1
    fi
}

# Function to check current authentication status
check_auth_status() {
    echo_info "Checking Claude authentication status..."
    
    if claude auth status &> /dev/null; then
        echo_success "✓ Claude authentication is valid"
        
        # Get user info if available
        if claude auth whoami &> /dev/null; then
            local user_info=$(claude auth whoami 2>/dev/null || echo "User info unavailable")
            echo_info "Authenticated as: $user_info"
        fi
        
        return 0
    else
        echo_warning "✗ Claude authentication required"
        return 1
    fi
}

# Function to perform interactive login
interactive_login() {
    echo_info "Starting Claude authentication process..."
    echo_warning "This will open a browser window for authentication"
    echo_warning "Please complete the authentication flow and return here"
    echo ""
    
    # Start interactive authentication
    if claude auth login; then
        echo_success "Authentication completed successfully!"
        
        # Save authentication state
        save_auth_state
        
        # Update environment configuration
        update_env_config
        
        return 0
    else
        echo_error "Authentication failed. Please try again."
        return 1
    fi
}

# Function to save authentication state
save_auth_state() {
    echo_info "Saving authentication state..."
    
    # Create config directory if it doesn't exist
    mkdir -p "${CLAUDE_CONFIG_DIR}"
    
    # Save authentication timestamp
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "${CLAUDE_SESSION_FILE}"
    
    # Save configuration for agent feed
    cat > "${CLAUDE_CONFIG_DIR}/agent-feed-config.json" << EOF
{
  "authenticated": true,
  "authentication_date": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "project_path": "/workspaces/agent-feed",
  "agent_config_path": "/workspaces/agent-feed/config",
  "memory_path": "/workspaces/agent-feed/memory",
  "session_persistence": true,
  "max_agents": 17,
  "default_timeout": 300,
  "auto_save_interval": 60
}
EOF
    
    echo_success "Authentication state saved"
}

# Function to update environment configuration
update_env_config() {
    echo_info "Updating environment configuration..."
    
    # Check if .env file exists
    if [ ! -f "$AGENT_FEED_CONFIG" ]; then
        echo_warning ".env file not found. Creating..."
        touch "$AGENT_FEED_CONFIG"
    fi
    
    # Remove existing Claude-related entries
    grep -v "^CLAUDE_" "$AGENT_FEED_CONFIG" > "${AGENT_FEED_CONFIG}.tmp" || true
    mv "${AGENT_FEED_CONFIG}.tmp" "$AGENT_FEED_CONFIG"
    
    # Add Claude configuration
    cat >> "$AGENT_FEED_CONFIG" << EOF

# Claude Code Integration
CLAUDE_AUTHENTICATED=true
CLAUDE_CONFIG_DIR=${CLAUDE_CONFIG_DIR}
CLAUDE_SERVER_PORT=8080
CLAUDE_SERVER_HOST=0.0.0.0
CLAUDE_MAX_AGENTS=17
CLAUDE_SESSION_TIMEOUT=3600
CLAUDE_MEMORY_PERSISTENCE=true
CLAUDE_AUTO_SAVE=true
CLAUDE_WEBSOCKET_ENABLED=true
EOF
    
    echo_success "Environment configuration updated"
}

# Function to verify authentication and permissions
verify_authentication() {
    echo_info "Verifying Claude authentication and permissions..."
    
    local checks_passed=0
    local total_checks=4
    
    # Check 1: Basic authentication
    if claude auth status &> /dev/null; then
        echo_success "✓ Basic authentication valid"
        ((checks_passed++))
    else
        echo_error "✗ Authentication invalid"
    fi
    
    # Check 2: User information access
    if claude auth whoami &> /dev/null; then
        echo_success "✓ User information accessible"
        ((checks_passed++))
    else
        echo_warning "✗ User information not accessible"
    fi
    
    # Check 3: Project access (test with a simple command)
    if timeout 10 claude --help &> /dev/null; then
        echo_success "✓ Claude CLI functional"
        ((checks_passed++))
    else
        echo_error "✗ Claude CLI not functional"
    fi
    
    # Check 4: File system permissions
    if [ -w "${CLAUDE_CONFIG_DIR}" ]; then
        echo_success "✓ Configuration directory writable"
        ((checks_passed++))
    else
        echo_error "✗ Configuration directory not writable"
    fi
    
    echo ""
    echo_info "Authentication verification: ${checks_passed}/${total_checks} checks passed"
    
    if [ "$checks_passed" -eq "$total_checks" ]; then
        echo_success "Claude authentication fully verified!"
        return 0
    else
        echo_warning "Some verification checks failed. Claude may have limited functionality."
        return 1
    fi
}

# Function to refresh authentication
refresh_auth() {
    echo_info "Refreshing Claude authentication..."
    
    # Try to refresh using existing credentials
    if claude auth refresh &> /dev/null; then
        echo_success "Authentication refreshed successfully"
        save_auth_state
        return 0
    else
        echo_warning "Unable to refresh automatically. Interactive login required."
        interactive_login
    fi
}

# Function to logout
logout() {
    echo_info "Logging out of Claude..."
    
    # Logout from Claude
    if claude auth logout &> /dev/null; then
        echo_success "Logged out successfully"
    else
        echo_warning "Logout command failed, but continuing cleanup"
    fi
    
    # Clean up local files
    rm -f "${CLAUDE_TOKEN_FILE}" "${CLAUDE_SESSION_FILE}"
    rm -f "${CLAUDE_CONFIG_DIR}/agent-feed-config.json"
    
    # Update environment configuration
    if [ -f "$AGENT_FEED_CONFIG" ]; then
        grep -v "^CLAUDE_" "$AGENT_FEED_CONFIG" > "${AGENT_FEED_CONFIG}.tmp" || true
        mv "${AGENT_FEED_CONFIG}.tmp" "$AGENT_FEED_CONFIG"
        echo "CLAUDE_AUTHENTICATED=false" >> "$AGENT_FEED_CONFIG"
    fi
    
    echo_success "Local authentication data cleaned up"
}

# Function to show authentication info
show_info() {
    echo_info "Claude Authentication Information"
    echo "=================================="
    
    # Authentication status
    if claude auth status &> /dev/null; then
        echo "Status: ✓ Authenticated"
        
        # User info
        local user_info=$(claude auth whoami 2>/dev/null || echo "Not available")
        echo "User: $user_info"
        
        # Session info
        if [ -f "${CLAUDE_SESSION_FILE}" ]; then
            local auth_date=$(cat "${CLAUDE_SESSION_FILE}")
            echo "Authenticated: $auth_date"
        fi
        
        # Configuration
        echo "Config Directory: ${CLAUDE_CONFIG_DIR}"
        echo "Agent Feed Config: ${AGENT_FEED_CONFIG}"
        
        # Permissions check
        echo ""
        echo "Permissions:"
        if [ -r "${CLAUDE_CONFIG_DIR}" ]; then
            echo "  ✓ Config directory readable"
        else
            echo "  ✗ Config directory not readable"
        fi
        
        if [ -w "${CLAUDE_CONFIG_DIR}" ]; then
            echo "  ✓ Config directory writable"
        else
            echo "  ✗ Config directory not writable"
        fi
        
    else
        echo "Status: ✗ Not authenticated"
        echo "Use 'claude-auth.sh login' to authenticate"
    fi
}

# Function to test Claude Code integration
test_integration() {
    echo_info "Testing Claude Code integration..."
    
    if ! check_auth_status; then
        echo_error "Authentication required. Please login first."
        return 1
    fi
    
    # Test basic Claude CLI functionality
    echo_info "Testing Claude CLI..."
    if timeout 10 claude --version &> /dev/null; then
        echo_success "✓ Claude CLI working"
    else
        echo_error "✗ Claude CLI test failed"
        return 1
    fi
    
    # Test file access
    echo_info "Testing file system access..."
    local test_file="${CLAUDE_CONFIG_DIR}/test-$(date +%s).tmp"
    if echo "test" > "$test_file" 2>/dev/null && [ -f "$test_file" ]; then
        rm -f "$test_file"
        echo_success "✓ File system access working"
    else
        echo_error "✗ File system access failed"
        return 1
    fi
    
    # Test environment configuration
    echo_info "Testing environment configuration..."
    if [ -f "$AGENT_FEED_CONFIG" ] && grep -q "CLAUDE_AUTHENTICATED=true" "$AGENT_FEED_CONFIG"; then
        echo_success "✓ Environment configuration valid"
    else
        echo_warning "✗ Environment configuration may need updating"
    fi
    
    echo_success "Claude Code integration test completed"
}

# Main function
main() {
    case "${1:-status}" in
        "login")
            check_claude_cli
            interactive_login
            verify_authentication
            ;;
        "logout")
            check_claude_cli
            logout
            ;;
        "status")
            check_claude_cli
            check_auth_status
            ;;
        "verify")
            check_claude_cli
            verify_authentication
            ;;
        "refresh")
            check_claude_cli
            refresh_auth
            ;;
        "info")
            check_claude_cli
            show_info
            ;;
        "test")
            check_claude_cli
            test_integration
            ;;
        "help")
            echo "Usage: $0 [login|logout|status|verify|refresh|info|test|help]"
            echo ""
            echo "Commands:"
            echo "  login   - Authenticate with Claude account"
            echo "  logout  - Logout and clean up authentication"
            echo "  status  - Check authentication status (default)"
            echo "  verify  - Verify authentication and permissions"
            echo "  refresh - Refresh authentication tokens"
            echo "  info    - Show detailed authentication information"
            echo "  test    - Test Claude Code integration"
            echo "  help    - Show this help message"
            ;;
        *)
            echo_error "Unknown command: $1"
            echo "Use '$0 help' for usage information"
            exit 1
            ;;
    esac
}

# Execute main function with all arguments
main "$@"