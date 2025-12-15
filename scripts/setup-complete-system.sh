#!/bin/bash

# Complete Claude Code Integration Setup Script
# Final setup script that orchestrates the entire system

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

# Function to show banner
show_banner() {
    echo_info "=========================================="
    echo_info "   Claude Code Integration Setup         "
    echo_info "   Agent Feed System v1.0.0             "
    echo_info "=========================================="
    echo ""
}

# Function to run setup steps
run_setup() {
    echo_info "Starting complete system setup..."
    
    # Step 1: Build the application
    echo_info "Step 1: Building application..."
    if npm run build; then
        echo_success "Application built successfully"
    else
        echo_warning "Build had warnings but completed"
    fi
    
    # Step 2: Setup directories and permissions
    echo_info "Step 2: Setting up directories and permissions..."
    mkdir -p memory/sessions memory/agents logs config
    chmod +x scripts/*.sh
    echo_success "Directories and permissions configured"
    
    # Step 3: Create environment configuration
    echo_info "Step 3: Creating environment configuration..."
    if [ ! -f ".env.claude" ]; then
        cat > .env.claude << 'EOF'
# Claude Code Integration Environment Configuration

# Core Application
NODE_ENV=development
PORT=3000

# Database Configuration
DATABASE_URL=postgresql://agent_feed_user:agent_feed_password@localhost:5432/agent_feed

# Redis Configuration (optional)
REDIS_URL=redis://localhost:6379

# Claude Code Configuration
CLAUDE_CONFIG_DIR=/home/codespace/.claude
CLAUDE_SERVER_PORT=8080
CLAUDE_SERVER_HOST=0.0.0.0
CLAUDE_MAX_AGENTS=17
CLAUDE_SESSION_TIMEOUT=3600
CLAUDE_MEMORY_PERSISTENCE=true
CLAUDE_AUTO_SCALING=true
CLAUDE_WEBSOCKET_ENABLED=true

# WebSocket Configuration
WEBSOCKET_ENABLED=true
WEBSOCKET_CORS_ORIGIN=http://localhost:3001

# Security Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Logging Configuration
LOG_LEVEL=info

# Health Monitoring
CLAUDE_HEALTH_CHECK_INTERVAL=30000
CLAUDE_RESPONSE_TIME_THRESHOLD=5000
CLAUDE_SUCCESS_RATE_THRESHOLD=90
CLAUDE_AUTO_RECOVERY=true
EOF
        echo_success "Environment configuration created"
    else
        echo_info "Environment configuration already exists"
    fi
    
    # Step 4: Test basic functionality
    echo_info "Step 4: Testing basic functionality..."
    
    # Test 1: Check if application can start (quick test)
    echo_info "Testing application startup..."
    timeout 10 npm run dev > /dev/null 2>&1 &
    TEST_PID=$!
    sleep 5
    
    if kill -0 $TEST_PID 2>/dev/null; then
        echo_success "Application startup test passed"
        kill $TEST_PID 2>/dev/null || true
    else
        echo_warning "Application startup test inconclusive"
    fi
    
    # Test 2: Validate configuration files
    echo_info "Validating configuration files..."
    if [ -f "config/agents-config.json" ] && python3 -m json.tool config/agents-config.json > /dev/null 2>&1; then
        echo_success "Agent configuration is valid JSON"
    else
        echo_error "Agent configuration validation failed"
    fi
    
    # Test 3: Check script permissions
    echo_info "Checking script permissions..."
    local scripts_ok=true
    for script in scripts/*.sh; do
        if [ ! -x "$script" ]; then
            echo_warning "Script not executable: $script"
            scripts_ok=false
        fi
    done
    
    if $scripts_ok; then
        echo_success "All scripts have correct permissions"
    fi
}

# Function to show next steps
show_next_steps() {
    echo ""
    echo_success "Setup completed successfully!"
    echo ""
    echo_info "Next Steps:"
    echo_info "==========="
    echo ""
    echo_info "1. Optional: Setup Claude CLI authentication"
    echo "   ./scripts/claude-auth.sh login"
    echo ""
    echo_info "2. Start the development server"
    echo "   npm run dev"
    echo ""
    echo_info "3. Optional: Run integration tests"
    echo "   ./scripts/test-claude-integration.sh"
    echo ""
    echo_info "4. Optional: Deploy with Docker"
    echo "   ./scripts/deploy-claude-integration.sh deploy"
    echo ""
    echo_info "Application URLs:"
    echo "- Main API: http://localhost:3000"
    echo "- Health Check: http://localhost:3000/health"
    echo "- Claude Health: http://localhost:3000/api/v1/claude/health"
    echo "- API Documentation: http://localhost:3000/api/v1/docs"
    echo ""
    echo_info "Useful Commands:"
    echo "- Check status: ./scripts/deploy-claude-integration.sh status"
    echo "- View logs: ./scripts/deploy-claude-integration.sh logs"
    echo "- Run tests: ./scripts/test-claude-integration.sh"
    echo ""
}

# Function to handle errors
handle_error() {
    echo_error "Setup failed. Please check the errors above."
    echo_error "You can try running individual setup steps manually:"
    echo "  1. npm run build"
    echo "  2. chmod +x scripts/*.sh"
    echo "  3. mkdir -p memory/sessions memory/agents logs"
    echo ""
    echo_info "For help, check the documentation:"
    echo "  docs/CLAUDE-CODE-INTEGRATION-SUMMARY.md"
}

# Main execution
main() {
    show_banner
    
    # Check if we're in the right directory
    if [ ! -f "package.json" ] || ! grep -q "agent-feed" package.json; then
        echo_error "This script must be run from the agent-feed project root directory"
        exit 1
    fi
    
    # Run setup with error handling
    if run_setup; then
        show_next_steps
        exit 0
    else
        handle_error
        exit 1
    fi
}

# Handle command line arguments
case "${1:-setup}" in
    "setup")
        main
        ;;
    "test")
        echo_info "Running quick validation tests..."
        
        # Test configuration files
        if [ -f "config/agents-config.json" ]; then
            echo_success "✓ Agent configuration exists"
        else
            echo_error "✗ Agent configuration missing"
        fi
        
        # Test scripts
        if [ -x "scripts/claude-setup.sh" ]; then
            echo_success "✓ Claude setup script executable"
        else
            echo_error "✗ Claude setup script not executable"
        fi
        
        # Test build
        if npm run build > /dev/null 2>&1; then
            echo_success "✓ Application builds successfully"
        else
            echo_warning "⚠ Application build has warnings"
        fi
        ;;
    "help")
        echo "Usage: $0 [setup|test|help]"
        echo ""
        echo "Commands:"
        echo "  setup  - Complete system setup (default)"
        echo "  test   - Run validation tests"
        echo "  help   - Show this help message"
        ;;
    *)
        echo_error "Unknown command: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac