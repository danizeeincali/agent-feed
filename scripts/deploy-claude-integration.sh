#!/bin/bash

# Claude Code Integration Deployment Script
# Comprehensive deployment for containerized Claude Code integration

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
COMPOSE_FILE="docker-compose.claude.yml"
PROJECT_NAME="agent-feed-claude"
DEPLOYMENT_ENV="${DEPLOYMENT_ENV:-production}"

# Function to check prerequisites
check_prerequisites() {
    echo_info "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        echo_error "Docker is not installed"
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        echo_error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check if compose file exists
    if [ ! -f "$COMPOSE_FILE" ]; then
        echo_error "Docker Compose file not found: $COMPOSE_FILE"
        exit 1
    fi
    
    echo_success "Prerequisites check passed"
}

# Function to setup environment
setup_environment() {
    echo_info "Setting up environment..."
    
    # Create .env file if it doesn't exist
    if [ ! -f ".env" ]; then
        echo_info "Creating .env file..."
        cat > .env << EOF
# Environment Configuration
NODE_ENV=${DEPLOYMENT_ENV}
PORT=3000

# Database Configuration
DATABASE_URL=postgresql://agent_feed_user:agent_feed_password@postgres:5432/agent_feed

# Redis Configuration
REDIS_URL=redis://redis:6379

# Claude Code Configuration
CLAUDE_CONFIG_DIR=/home/claude-user/.claude
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
JWT_SECRET=your-super-secret-jwt-key-change-in-production-$(openssl rand -hex 32)

# Logging Configuration
LOG_LEVEL=info
EOF
        echo_success ".env file created"
    else
        echo_info ".env file already exists"
    fi
    
    # Create required directories
    mkdir -p logs memory config
    
    echo_success "Environment setup completed"
}

# Function to build containers
build_containers() {
    echo_info "Building containers..."
    
    if docker compose version &> /dev/null; then
        docker compose -f "$COMPOSE_FILE" build --no-cache
    else
        docker-compose -f "$COMPOSE_FILE" build --no-cache
    fi
    
    echo_success "Containers built successfully"
}

# Function to start services
start_services() {
    echo_info "Starting services..."
    
    if docker compose version &> /dev/null; then
        docker compose -f "$COMPOSE_FILE" up -d
    else
        docker-compose -f "$COMPOSE_FILE" up -d
    fi
    
    echo_success "Services started successfully"
}

# Function to wait for services
wait_for_services() {
    echo_info "Waiting for services to be ready..."
    
    local max_wait=300  # 5 minutes
    local wait_time=0
    
    while [ $wait_time -lt $max_wait ]; do
        if check_service_health; then
            echo_success "All services are healthy"
            return 0
        fi
        
        echo_info "Services not ready yet. Waiting..."
        sleep 10
        wait_time=$((wait_time + 10))
    done
    
    echo_error "Services failed to become healthy within $max_wait seconds"
    return 1
}

# Function to check service health
check_service_health() {
    local all_healthy=true
    
    # Check main application
    if ! curl -sf http://localhost:3000/health > /dev/null 2>&1; then
        echo_warning "Main application not ready"
        all_healthy=false
    fi
    
    # Check Claude integration
    if ! curl -sf http://localhost:3000/api/v1/claude/health > /dev/null 2>&1; then
        echo_warning "Claude integration not ready"
        all_healthy=false
    fi
    
    # Check frontend
    if ! curl -sf http://localhost:3001 > /dev/null 2>&1; then
        echo_warning "Frontend not ready"
        all_healthy=false
    fi
    
    $all_healthy
}

# Function to run database migrations
run_migrations() {
    echo_info "Running database migrations..."
    
    if docker compose version &> /dev/null; then
        docker compose -f "$COMPOSE_FILE" exec agent-feed-claude npm run migrate
    else
        docker-compose -f "$COMPOSE_FILE" exec agent-feed-claude npm run migrate
    fi
    
    echo_success "Database migrations completed"
}

# Function to run tests
run_tests() {
    echo_info "Running integration tests..."
    
    # Run the Claude integration test script
    if [ -f "scripts/test-claude-integration.sh" ]; then
        ./scripts/test-claude-integration.sh
    else
        echo_warning "Test script not found. Skipping tests."
    fi
}

# Function to show deployment status
show_status() {
    echo_info "Deployment Status:"
    echo "=================="
    
    if docker compose version &> /dev/null; then
        docker compose -f "$COMPOSE_FILE" ps
    else
        docker-compose -f "$COMPOSE_FILE" ps
    fi
    
    echo ""
    echo_info "Service URLs:"
    echo "Main Application: http://localhost:3000"
    echo "Frontend: http://localhost:3001"
    echo "Claude Server: http://localhost:8080"
    echo "API Documentation: http://localhost:3000/api/v1/docs"
    echo "Claude Health: http://localhost:3000/api/v1/claude/health"
}

# Function to cleanup on failure
cleanup_on_failure() {
    echo_error "Deployment failed. Cleaning up..."
    
    if docker compose version &> /dev/null; then
        docker compose -f "$COMPOSE_FILE" down --volumes --remove-orphans
    else
        docker-compose -f "$COMPOSE_FILE" down --volumes --remove-orphans
    fi
}

# Function to stop services
stop_services() {
    echo_info "Stopping services..."
    
    if docker compose version &> /dev/null; then
        docker compose -f "$COMPOSE_FILE" down
    else
        docker-compose -f "$COMPOSE_FILE" down
    fi
    
    echo_success "Services stopped"
}

# Function to destroy deployment
destroy_deployment() {
    echo_warning "This will destroy all containers, volumes, and data!"
    read -p "Are you sure? (yes/no): " confirm
    
    if [ "$confirm" = "yes" ]; then
        echo_info "Destroying deployment..."
        
        if docker compose version &> /dev/null; then
            docker compose -f "$COMPOSE_FILE" down --volumes --remove-orphans --rmi all
        else
            docker-compose -f "$COMPOSE_FILE" down --volumes --remove-orphans --rmi all
        fi
        
        echo_success "Deployment destroyed"
    else
        echo_info "Destruction cancelled"
    fi
}

# Function to show logs
show_logs() {
    local service="${1:-}"
    
    if [ -n "$service" ]; then
        echo_info "Showing logs for service: $service"
        if docker compose version &> /dev/null; then
            docker compose -f "$COMPOSE_FILE" logs -f "$service"
        else
            docker-compose -f "$COMPOSE_FILE" logs -f "$service"
        fi
    else
        echo_info "Showing logs for all services"
        if docker compose version &> /dev/null; then
            docker compose -f "$COMPOSE_FILE" logs -f
        else
            docker-compose -f "$COMPOSE_FILE" logs -f
        fi
    fi
}

# Main deployment function
deploy() {
    echo_info "Starting Claude Code Integration Deployment"
    echo_info "=========================================="
    
    # Set trap for cleanup on failure
    trap cleanup_on_failure ERR
    
    check_prerequisites
    setup_environment
    build_containers
    start_services
    wait_for_services
    run_migrations
    run_tests
    show_status
    
    echo_success "Claude Code Integration deployed successfully!"
    echo_info "You can now access the application at http://localhost:3000"
}

# Handle command line arguments
case "${1:-deploy}" in
    "deploy")
        deploy
        ;;
    "start")
        start_services
        wait_for_services
        show_status
        ;;
    "stop")
        stop_services
        ;;
    "restart")
        stop_services
        start_services
        wait_for_services
        show_status
        ;;
    "status")
        show_status
        ;;
    "logs")
        show_logs "${2:-}"
        ;;
    "test")
        run_tests
        ;;
    "migrate")
        run_migrations
        ;;
    "destroy")
        destroy_deployment
        ;;
    "health")
        check_service_health && echo_success "All services healthy" || echo_error "Some services unhealthy"
        ;;
    "help")
        echo "Usage: $0 [command] [options]"
        echo ""
        echo "Commands:"
        echo "  deploy   - Full deployment (default)"
        echo "  start    - Start services"
        echo "  stop     - Stop services"
        echo "  restart  - Restart services"
        echo "  status   - Show deployment status"
        echo "  logs     - Show logs [service]"
        echo "  test     - Run integration tests"
        echo "  migrate  - Run database migrations"
        echo "  destroy  - Destroy deployment (with confirmation)"
        echo "  health   - Check service health"
        echo "  help     - Show this help message"
        ;;
    *)
        echo_error "Unknown command: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac