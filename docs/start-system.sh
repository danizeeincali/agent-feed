#!/bin/bash
# System Startup Orchestration Script
# Claude Code + AgentLink Development Environment

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

# Trap signals for graceful shutdown
cleanup() {
    log "Received shutdown signal, cleaning up..."
    
    # Stop Claude Code if running
    if [ ! -z "$CLAUDE_PID" ]; then
        log "Stopping Claude Code (PID: $CLAUDE_PID)"
        kill -TERM $CLAUDE_PID 2>/dev/null || true
        wait $CLAUDE_PID 2>/dev/null || true
    fi
    
    # Stop Node.js app if running
    if [ ! -z "$NODE_PID" ]; then
        log "Stopping Node.js application (PID: $NODE_PID)"
        kill -TERM $NODE_PID 2>/dev/null || true
        wait $NODE_PID 2>/dev/null || true
    fi
    
    # Stop PostgreSQL
    log "Stopping PostgreSQL"
    su postgres -c "pg_ctl stop -D /var/lib/postgresql/data -m smart" || true
    
    success "Cleanup completed"
    exit 0
}

trap cleanup SIGTERM SIGINT SIGQUIT

# Check memory and adjust settings
check_memory() {
    local available_mem=$(free -m | awk 'NR==2{printf "%.0f", $7}')
    log "Available memory: ${available_mem}MB"
    
    if [ $available_mem -lt 1024 ]; then
        warn "Low memory detected, adjusting PostgreSQL settings"
        export PG_SHARED_BUFFERS="32MB"
        export PG_EFFECTIVE_CACHE="128MB"
    else
        export PG_SHARED_BUFFERS="64MB"
        export PG_EFFECTIVE_CACHE="256MB"
    fi
}

# Start PostgreSQL
start_postgresql() {
    log "Starting PostgreSQL..."
    
    # Check if data directory is initialized
    if [ ! -f /var/lib/postgresql/data/PG_VERSION ]; then
        log "Initializing PostgreSQL data directory"
        su postgres -c "initdb -D /var/lib/postgresql/data"
    fi
    
    # Update PostgreSQL configuration
    su postgres -c "echo \"shared_buffers = $PG_SHARED_BUFFERS\" >> /var/lib/postgresql/data/postgresql.conf"
    su postgres -c "echo \"effective_cache_size = $PG_EFFECTIVE_CACHE\" >> /var/lib/postgresql/data/postgresql.conf"
    
    # Start PostgreSQL
    su postgres -c "pg_ctl start -D /var/lib/postgresql/data -l /var/log/postgresql/postgresql.log"
    
    # Wait for PostgreSQL to be ready
    local retries=30
    while [ $retries -gt 0 ]; do
        if su postgres -c "pg_isready -h localhost -p 5432"; then
            success "PostgreSQL started successfully"
            break
        fi
        retries=$((retries - 1))
        sleep 1
    done
    
    if [ $retries -eq 0 ]; then
        error "PostgreSQL failed to start"
        exit 1
    fi
    
    # Create database if it doesn't exist
    su postgres -c "createdb agentfeed" 2>/dev/null || log "Database 'agentfeed' already exists"
    
    # Run migrations if schema file exists
    if [ -f /app/database/schema.sql ]; then
        log "Running database migrations"
        su postgres -c "psql -d agentfeed -f /app/database/schema.sql" || warn "Schema migration failed"
    fi
}

# Setup Claude Code configuration
setup_claude_code() {
    log "Setting up Claude Code configuration..."
    
    # Create Claude config directory
    mkdir -p /app/.claude
    
    # Check if Claude is authenticated
    if claude auth check 2>/dev/null; then
        success "Claude Code authentication verified"
    else
        warn "Claude Code not authenticated. Please run 'claude auth' to authenticate."
        log "Starting without Claude Code integration"
        return 1
    fi
    
    # Install Claude Flow MCP server if not present
    if ! claude mcp list | grep -q "claude-flow"; then
        log "Installing Claude Flow MCP server"
        claude mcp add claude-flow npx claude-flow@alpha mcp start || warn "Failed to install Claude Flow MCP"
    fi
    
    return 0
}

# Start Claude Code server
start_claude_code() {
    if setup_claude_code; then
        log "Starting Claude Code server on port $CLAUDE_CODE_PORT"
        
        # Start Claude Code in background
        claude server --port $CLAUDE_CODE_PORT &
        CLAUDE_PID=$!
        
        # Wait for Claude Code to be ready
        local retries=20
        while [ $retries -gt 0 ]; do
            if curl -s http://localhost:$CLAUDE_CODE_PORT/health >/dev/null 2>&1; then
                success "Claude Code server started successfully (PID: $CLAUDE_PID)"
                break
            fi
            retries=$((retries - 1))
            sleep 1
        done
        
        if [ $retries -eq 0 ]; then
            warn "Claude Code server health check failed, continuing without it"
        fi
    else
        warn "Skipping Claude Code server startup"
    fi
}

# Start Node.js application
start_nodejs_app() {
    log "Starting Node.js application on port $PORT"
    
    # Check if we're in development mode
    if [ "$NODE_ENV" = "development" ] && [ "$HOT_RELOAD" = "true" ]; then
        log "Development mode detected, enabling hot reload"
        npm run dev &
    else
        log "Production mode, starting built application"
        node dist/api/server.js &
    fi
    
    NODE_PID=$!
    
    # Wait for Node.js app to be ready
    local retries=30
    while [ $retries -gt 0 ]; do
        if curl -s http://localhost:$PORT/health >/dev/null 2>&1; then
            success "Node.js application started successfully (PID: $NODE_PID)"
            break
        fi
        retries=$((retries - 1))
        sleep 1
    done
    
    if [ $retries -eq 0 ]; then
        error "Node.js application failed to start"
        exit 1
    fi
}

# Initialize agent swarm
initialize_swarm() {
    log "Initializing Claude Flow agent swarm"
    
    # Check if Claude Flow is available
    if command -v npx >/dev/null 2>&1; then
        # Initialize swarm with mesh topology for development
        npx claude-flow@alpha swarm init mesh --max-agents 17 || warn "Failed to initialize swarm"
        
        # Spawn essential agents
        npx claude-flow@alpha agent spawn researcher --name "requirement-analyzer" || warn "Failed to spawn researcher agent"
        npx claude-flow@alpha agent spawn coder --name "implementation-agent" || warn "Failed to spawn coder agent"
        npx claude-flow@alpha agent spawn tester --name "validation-agent" || warn "Failed to spawn tester agent"
        npx claude-flow@alpha agent spawn reviewer --name "quality-agent" || warn "Failed to spawn reviewer agent"
        npx claude-flow@alpha agent spawn coordinator --name "orchestration-agent" || warn "Failed to spawn coordinator agent"
        
        success "Agent swarm initialized"
    else
        warn "Claude Flow not available, skipping swarm initialization"
    fi
}

# Health monitoring
start_health_monitor() {
    log "Starting health monitoring"
    
    (
        while true; do
            sleep 60
            
            # Check PostgreSQL
            if ! su postgres -c "pg_isready -h localhost -p 5432" >/dev/null 2>&1; then
                error "PostgreSQL health check failed"
            fi
            
            # Check Node.js app
            if ! curl -s http://localhost:$PORT/health >/dev/null 2>&1; then
                error "Node.js application health check failed"
            fi
            
            # Check memory usage
            local mem_usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
            if [ $mem_usage -gt 90 ]; then
                warn "High memory usage: ${mem_usage}%"
            fi
        done
    ) &
}

# Main execution
main() {
    log "Starting Claude Code + AgentLink Development Environment"
    log "Environment: $NODE_ENV"
    log "Port: $PORT"
    log "Claude Code Port: $CLAUDE_CODE_PORT"
    log "PostgreSQL Port: $POSTGRES_PORT"
    
    # Check memory and adjust settings
    check_memory
    
    # Start services in order
    start_postgresql
    start_claude_code
    start_nodejs_app
    initialize_swarm
    start_health_monitor
    
    success "All services started successfully"
    log "System ready for development"
    
    # Keep the script running
    while true; do
        sleep 10
        
        # Check if main processes are still running
        if [ ! -z "$NODE_PID" ] && ! kill -0 $NODE_PID 2>/dev/null; then
            error "Node.js application died, exiting"
            exit 1
        fi
        
        if ! su postgres -c "pg_isready -h localhost -p 5432" >/dev/null 2>&1; then
            error "PostgreSQL died, exiting"
            exit 1
        fi
    done
}

# Run main function
main "$@"