#!/bin/bash

# Agent Feed Development Environment Setup Script
# This script sets up the complete development environment

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    local missing_deps=()
    
    if ! command_exists node; then
        missing_deps+=("node")
    fi
    
    if ! command_exists npm; then
        missing_deps+=("npm")
    fi
    
    if ! command_exists docker; then
        missing_deps+=("docker")
    fi
    
    if ! command_exists docker-compose; then
        missing_deps+=("docker-compose")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        log_error "Missing required dependencies: ${missing_deps[*]}"
        log_info "Please install the missing dependencies and run this script again."
        exit 1
    fi
    
    # Check Node.js version
    local node_version
    node_version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$node_version" -lt 18 ]; then
        log_error "Node.js version 18 or higher is required. Current version: $(node --version)"
        exit 1
    fi
    
    log_success "All prerequisites satisfied"
}

# Install Node.js dependencies
install_dependencies() {
    log_info "Installing Node.js dependencies..."
    
    if [ -f "package-lock.json" ]; then
        npm ci
    else
        npm install
    fi
    
    log_success "Dependencies installed successfully"
}

# Setup environment variables
setup_environment() {
    log_info "Setting up environment variables..."
    
    if [ ! -f ".env" ]; then
        log_info "Creating .env file from template..."
        cat > .env << EOF
# Development Environment Configuration
NODE_ENV=development

# Database Configuration
POSTGRES_URL=postgresql://agent_feed_user:agent_feed_pass@localhost:5432/agent_feed
POSTGRES_PASSWORD=agent_feed_pass

# Redis Configuration
REDIS_URL=redis://:redis_pass@localhost:6379
REDIS_PASSWORD=redis_pass

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# API Configuration
API_GATEWAY_PORT=3000
AGENT_MANAGEMENT_PORT=3001
FEED_PROCESSING_PORT=3002
USER_MANAGEMENT_PORT=3003
WEBSOCKET_PORT=3004

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Security
BCRYPT_ROUNDS=12
CORS_ORIGIN=http://localhost:3000

# Queue Configuration
QUEUE_CONCURRENCY=5
QUEUE_DELAY=1000

# Monitoring
LOG_LEVEL=debug
GRAFANA_PASSWORD=admin

# Development
DEV_HOT_RELOAD=true
DEV_MOCK_EXTERNAL_APIS=true
EOF
        log_success ".env file created"
    else
        log_warning ".env file already exists, skipping creation"
    fi
}

# Setup Docker environment
setup_docker() {
    log_info "Setting up Docker environment..."
    
    # Check if Docker is running
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    
    # Create necessary directories
    mkdir -p infrastructure/docker/init-scripts
    mkdir -p infrastructure/docker/monitoring
    mkdir -p infrastructure/nginx/ssl
    
    # Generate self-signed SSL certificates for development
    if [ ! -f "infrastructure/nginx/ssl/cert.pem" ]; then
        log_info "Generating self-signed SSL certificates for development..."
        openssl req -x509 -newkey rsa:4096 -keyout infrastructure/nginx/ssl/key.pem \
            -out infrastructure/nginx/ssl/cert.pem -days 365 -nodes \
            -subj "/C=US/ST=Development/L=Local/O=AgentFeed/CN=localhost"
        log_success "SSL certificates generated"
    fi
    
    # Create database initialization script
    cat > infrastructure/docker/init-scripts/01-init.sql << 'EOF'
-- Agent Feed Database Initialization Script

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create schemas
CREATE SCHEMA IF NOT EXISTS agents;
CREATE SCHEMA IF NOT EXISTS feeds;
CREATE SCHEMA IF NOT EXISTS users;
CREATE SCHEMA IF NOT EXISTS monitoring;

-- Set search path
ALTER DATABASE agent_feed SET search_path TO public, agents, feeds, users, monitoring;

-- Create roles
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'agent_feed_read') THEN
        CREATE ROLE agent_feed_read;
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'agent_feed_write') THEN
        CREATE ROLE agent_feed_write;
    END IF;
END
$$;

-- Grant permissions
GRANT CONNECT ON DATABASE agent_feed TO agent_feed_read, agent_feed_write;
GRANT USAGE ON SCHEMA public, agents, feeds, users, monitoring TO agent_feed_read, agent_feed_write;
EOF

    # Create Prometheus configuration
    cat > infrastructure/docker/monitoring/prometheus.yml << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'agent-feed-services'
    static_configs:
      - targets: ['api-gateway:3000', 'agent-management:3001', 'feed-processing:3002', 'user-management:3003', 'websocket-service:3004']
    metrics_path: '/metrics'
    scrape_interval: 30s
EOF
    
    log_success "Docker environment setup complete"
}

# Run linting and formatting
setup_code_quality() {
    log_info "Setting up code quality tools..."
    
    # Run initial linting
    if npm run lint:fix >/dev/null 2>&1; then
        log_success "Code linting passed"
    else
        log_warning "Code linting found issues, please review and fix them"
    fi
    
    # Setup pre-commit hooks
    if command_exists git && [ -d ".git" ]; then
        log_info "Setting up Git pre-commit hooks..."
        cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
# Agent Feed pre-commit hook

set -e

echo "Running pre-commit checks..."

# Run linting
npm run lint

# Run type checking
npm run typecheck

# Run tests
npm run test:phase1

echo "Pre-commit checks passed!"
EOF
        chmod +x .git/hooks/pre-commit
        log_success "Git pre-commit hooks installed"
    fi
}

# Start development services
start_services() {
    log_info "Starting development services..."
    
    # Start Docker services
    docker-compose -f infrastructure/docker/docker-compose.yml up -d postgres redis
    
    # Wait for services to be ready
    log_info "Waiting for services to be ready..."
    sleep 10
    
    # Check if services are healthy
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if docker-compose -f infrastructure/docker/docker-compose.yml ps | grep -q "healthy"; then
            log_success "Services are ready"
            break
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            log_error "Services failed to start within expected time"
            docker-compose -f infrastructure/docker/docker-compose.yml logs
            exit 1
        fi
        
        log_info "Attempt $attempt/$max_attempts: Waiting for services..."
        sleep 5
        ((attempt++))
    done
}

# Run database migrations
run_migrations() {
    log_info "Running database migrations..."
    
    # Check if migration scripts exist
    if [ -d "src/database/migrations" ]; then
        npm run migrate:dev || log_warning "Migration failed or no migrations to run"
    else
        log_info "No migration directory found, skipping migrations"
    fi
}

# Run initial tests
run_tests() {
    log_info "Running initial test suite..."
    
    # Run basic tests to ensure everything is working
    if npm run test:phase1; then
        log_success "Initial tests passed"
    else
        log_warning "Some tests failed, please review the output"
    fi
}

# Main setup function
main() {
    echo -e "${BLUE}"
    echo "========================================="
    echo "  Agent Feed Development Setup Script   "
    echo "========================================="
    echo -e "${NC}"
    
    check_prerequisites
    install_dependencies
    setup_environment
    setup_docker
    setup_code_quality
    start_services
    run_migrations
    run_tests
    
    echo -e "${GREEN}"
    echo "========================================="
    echo "       Setup completed successfully!    "
    echo "========================================="
    echo -e "${NC}"
    
    log_info "Development environment is ready!"
    log_info "Available services:"
    echo "  - API Gateway: http://localhost:3000"
    echo "  - Agent Management: http://localhost:3001"
    echo "  - Feed Processing: http://localhost:3002"
    echo "  - User Management: http://localhost:3003"
    echo "  - WebSocket Service: http://localhost:3004"
    echo "  - Grafana Dashboard: http://localhost:3005 (admin/admin)"
    echo "  - Prometheus Metrics: http://localhost:9090"
    echo ""
    log_info "To start development:"
    echo "  1. npm run dev           # Start all services in development mode"
    echo "  2. npm run test:watch    # Run tests in watch mode"
    echo "  3. npm run build         # Build all services"
    echo ""
    log_info "To stop services:"
    echo "  docker-compose -f infrastructure/docker/docker-compose.yml down"
}

# Handle script interruption
trap 'log_error "Setup interrupted"; exit 1' INT TERM

# Run main function
main "$@"