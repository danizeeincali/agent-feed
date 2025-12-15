#!/bin/bash

# Claude Code Setup Script for Containerized Environment
# This script sets up Claude Code integration with authentication and agent spawning

set -euo pipefail

# Configuration
CLAUDE_PORT=${CLAUDE_PORT:-8080}
CLAUDE_HOST=${CLAUDE_HOST:-0.0.0.0}
CLAUDE_CONFIG_DIR="${HOME}/.claude"
CLAUDE_SESSION_DIR="/tmp/claude-sessions"
CLAUDE_MEMORY_DIR="/workspaces/agent-feed/memory"

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

# Function to check if Claude CLI is installed
check_claude_cli() {
    echo_info "Checking Claude CLI installation..."
    
    if command -v claude &> /dev/null; then
        echo_success "Claude CLI is already installed"
        claude --version
        return 0
    else
        echo_warning "Claude CLI not found. Installing..."
        return 1
    fi
}

# Function to install Claude CLI
install_claude_cli() {
    echo_info "Installing Claude CLI..."
    
    # Install via npm (global)
    if command -v npm &> /dev/null; then
        npm install -g @anthropic-ai/claude-cli@latest
        echo_success "Claude CLI installed successfully"
    else
        echo_error "npm not found. Please install Node.js first."
        exit 1
    fi
}

# Function to check if user is authenticated
check_authentication() {
    echo_info "Checking Claude authentication status..."
    
    if claude auth status &> /dev/null; then
        echo_success "Claude authentication is valid"
        return 0
    else
        echo_warning "Claude authentication required"
        return 1
    fi
}

# Function to authenticate with Claude
authenticate_claude() {
    echo_info "Starting Claude authentication process..."
    echo_warning "This will open a browser window for authentication"
    echo_warning "Please follow the authentication flow and return here"
    
    # Start authentication
    claude auth login
    
    # Verify authentication
    if claude auth status &> /dev/null; then
        echo_success "Authentication successful!"
        return 0
    else
        echo_error "Authentication failed. Please try again."
        return 1
    fi
}

# Function to setup Claude configuration
setup_claude_config() {
    echo_info "Setting up Claude configuration..."
    
    # Create configuration directories
    mkdir -p "${CLAUDE_CONFIG_DIR}"
    mkdir -p "${CLAUDE_SESSION_DIR}"
    mkdir -p "${CLAUDE_MEMORY_DIR}/sessions"
    mkdir -p "${CLAUDE_MEMORY_DIR}/agents"
    
    # Create Claude configuration file
    cat > "${CLAUDE_CONFIG_DIR}/config.json" << EOF
{
  "host": "${CLAUDE_HOST}",
  "port": ${CLAUDE_PORT},
  "session_directory": "${CLAUDE_SESSION_DIR}",
  "memory_directory": "${CLAUDE_MEMORY_DIR}",
  "agent_config_directory": "/workspaces/agent-feed/config",
  "max_concurrent_agents": 17,
  "session_timeout": 3600,
  "auto_save_sessions": true,
  "enable_memory_persistence": true,
  "enable_real_time_communication": true,
  "websocket_enabled": true,
  "security": {
    "enable_sandbox": true,
    "allowed_file_operations": ["read", "write", "edit"],
    "restricted_paths": ["/etc", "/usr", "/var"],
    "enable_network_access": true
  },
  "logging": {
    "level": "info",
    "file": "/workspaces/agent-feed/logs/claude-code.log",
    "max_size": "100MB",
    "max_files": 5
  }
}
EOF

    echo_success "Claude configuration created"
}

# Function to test Claude Code server
test_claude_server() {
    echo_info "Testing Claude Code server..."
    
    # Start Claude Code server in background
    claude server start --port "${CLAUDE_PORT}" --host "${CLAUDE_HOST}" &
    CLAUDE_PID=$!
    
    # Wait for server to start
    sleep 5
    
    # Test connection
    if curl -s "http://localhost:${CLAUDE_PORT}/health" > /dev/null; then
        echo_success "Claude Code server is running on port ${CLAUDE_PORT}"
        
        # Stop test server
        kill "${CLAUDE_PID}" 2>/dev/null || true
        return 0
    else
        echo_error "Failed to start Claude Code server"
        kill "${CLAUDE_PID}" 2>/dev/null || true
        return 1
    fi
}

# Function to setup agent configurations
setup_agent_configs() {
    echo_info "Setting up agent configurations..."
    
    # This will be handled by the agent configuration script
    if [ -f "/workspaces/agent-feed/config/agents-config.json" ]; then
        echo_success "Agent configurations already exist"
    else
        echo_warning "Agent configurations will be created by the main setup process"
    fi
}

# Function to setup systemd service (if running on system with systemd)
setup_service() {
    echo_info "Setting up Claude Code service..."
    
    if command -v systemctl &> /dev/null; then
        echo_info "Systemd detected. Creating service file..."
        
        # Create systemd service file
        sudo tee /etc/systemd/system/claude-code-agent-feed.service > /dev/null << EOF
[Unit]
Description=Claude Code Agent Feed Integration
After=network.target

[Service]
Type=simple
User=codespace
WorkingDirectory=/workspaces/agent-feed
Environment=NODE_ENV=production
Environment=CLAUDE_PORT=${CLAUDE_PORT}
Environment=CLAUDE_HOST=${CLAUDE_HOST}
ExecStart=/usr/local/bin/claude server start --port ${CLAUDE_PORT} --host ${CLAUDE_HOST} --config ${CLAUDE_CONFIG_DIR}/config.json
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
        
        # Reload systemd and enable service
        sudo systemctl daemon-reload
        sudo systemctl enable claude-code-agent-feed.service
        
        echo_success "Systemd service created and enabled"
    else
        echo_warning "Systemd not available. Manual startup required."
    fi
}

# Function to create startup script
create_startup_script() {
    echo_info "Creating startup script..."
    
    cat > "/workspaces/agent-feed/scripts/start-claude-server.sh" << 'EOF'
#!/bin/bash

# Claude Code Server Startup Script

CLAUDE_PORT=${CLAUDE_PORT:-8080}
CLAUDE_HOST=${CLAUDE_HOST:-0.0.0.0}
CLAUDE_CONFIG_DIR="${HOME}/.claude"
LOG_FILE="/workspaces/agent-feed/logs/claude-code.log"

# Create log directory
mkdir -p "$(dirname "$LOG_FILE")"

echo "[$(date)] Starting Claude Code server..." >> "$LOG_FILE"

# Start Claude Code server
claude server start \
    --port "$CLAUDE_PORT" \
    --host "$CLAUDE_HOST" \
    --config "$CLAUDE_CONFIG_DIR/config.json" \
    --log-level info \
    >> "$LOG_FILE" 2>&1 &

CLAUDE_PID=$!
echo $CLAUDE_PID > /tmp/claude-server.pid

echo "[$(date)] Claude Code server started with PID: $CLAUDE_PID" >> "$LOG_FILE"
echo "Claude Code server started on port $CLAUDE_PORT (PID: $CLAUDE_PID)"
EOF

    chmod +x "/workspaces/agent-feed/scripts/start-claude-server.sh"
    
    # Create stop script
    cat > "/workspaces/agent-feed/scripts/stop-claude-server.sh" << 'EOF'
#!/bin/bash

# Claude Code Server Stop Script

PID_FILE="/tmp/claude-server.pid"
LOG_FILE="/workspaces/agent-feed/logs/claude-code.log"

if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
        echo "[$(date)] Stopping Claude Code server (PID: $PID)..." >> "$LOG_FILE"
        kill "$PID"
        rm -f "$PID_FILE"
        echo "Claude Code server stopped"
    else
        echo "Claude Code server not running"
        rm -f "$PID_FILE"
    fi
else
    echo "PID file not found. Claude Code server may not be running."
fi
EOF

    chmod +x "/workspaces/agent-feed/scripts/stop-claude-server.sh"
    
    echo_success "Startup scripts created"
}

# Function to verify installation
verify_installation() {
    echo_info "Verifying Claude Code installation..."
    
    local checks_passed=0
    local total_checks=5
    
    # Check 1: Claude CLI
    if command -v claude &> /dev/null; then
        echo_success "✓ Claude CLI installed"
        ((checks_passed++))
    else
        echo_error "✗ Claude CLI not found"
    fi
    
    # Check 2: Authentication
    if claude auth status &> /dev/null; then
        echo_success "✓ Claude authentication valid"
        ((checks_passed++))
    else
        echo_error "✗ Claude authentication invalid"
    fi
    
    # Check 3: Configuration
    if [ -f "${CLAUDE_CONFIG_DIR}/config.json" ]; then
        echo_success "✓ Claude configuration file exists"
        ((checks_passed++))
    else
        echo_error "✗ Claude configuration file missing"
    fi
    
    # Check 4: Directories
    if [ -d "${CLAUDE_SESSION_DIR}" ] && [ -d "${CLAUDE_MEMORY_DIR}" ]; then
        echo_success "✓ Required directories created"
        ((checks_passed++))
    else
        echo_error "✗ Required directories missing"
    fi
    
    # Check 5: Scripts
    if [ -f "/workspaces/agent-feed/scripts/start-claude-server.sh" ]; then
        echo_success "✓ Startup scripts created"
        ((checks_passed++))
    else
        echo_error "✗ Startup scripts missing"
    fi
    
    echo ""
    echo_info "Installation verification: ${checks_passed}/${total_checks} checks passed"
    
    if [ "$checks_passed" -eq "$total_checks" ]; then
        echo_success "Claude Code setup completed successfully!"
        echo_info "Next steps:"
        echo "  1. Start Claude Code server: ./scripts/start-claude-server.sh"
        echo "  2. Configure agents: npm run setup:agents"
        echo "  3. Test integration: npm run test:claude-integration"
        return 0
    else
        echo_error "Setup incomplete. Please address the failed checks above."
        return 1
    fi
}

# Main setup function
main() {
    echo_info "Starting Claude Code setup for Agent Feed integration..."
    echo ""
    
    # Check and install Claude CLI
    if ! check_claude_cli; then
        install_claude_cli
    fi
    
    # Check authentication
    if ! check_authentication; then
        if ! authenticate_claude; then
            echo_error "Authentication failed. Exiting."
            exit 1
        fi
    fi
    
    # Setup configuration
    setup_claude_config
    
    # Test server
    if ! test_claude_server; then
        echo_error "Server test failed. Please check your configuration."
        exit 1
    fi
    
    # Setup agent configurations
    setup_agent_configs
    
    # Setup service (optional)
    if [ "${SETUP_SERVICE:-false}" = "true" ]; then
        setup_service
    fi
    
    # Create startup scripts
    create_startup_script
    
    # Verify installation
    verify_installation
}

# Handle command line arguments
case "${1:-setup}" in
    "setup")
        main
        ;;
    "verify")
        verify_installation
        ;;
    "test")
        test_claude_server
        ;;
    "auth")
        authenticate_claude
        ;;
    "help")
        echo "Usage: $0 [setup|verify|test|auth|help]"
        echo ""
        echo "Commands:"
        echo "  setup   - Full Claude Code setup (default)"
        echo "  verify  - Verify installation"
        echo "  test    - Test Claude Code server"
        echo "  auth    - Authenticate with Claude"
        echo "  help    - Show this help message"
        ;;
    *)
        echo_error "Unknown command: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac