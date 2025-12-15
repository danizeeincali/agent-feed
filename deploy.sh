#!/bin/bash

# AgentLink + Claude Code VPS Deployment Script
# Self-contained Docker deployment

set -e  # Exit on any error

echo "🚀 AgentLink + Claude Code VPS Deployment"
echo "========================================"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
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

# Check if Docker is installed and running
check_docker() {
    log_info "Checking Docker installation..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "Docker is not running. Please start Docker."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose."
        exit 1
    fi
    
    log_success "Docker and Docker Compose are available"
}

# Create environment file if it doesn't exist
setup_environment() {
    log_info "Setting up environment configuration..."
    
    if [ ! -f .env ]; then
        if [ -f .env.example ]; then
            cp .env.example .env
            log_warning "Created .env file from .env.example"
            log_warning "Please edit .env file and add your CLAUDE_API_KEY"
            echo ""
            echo "IMPORTANT: You must set your Claude API key in the .env file:"
            echo "CLAUDE_API_KEY=your_actual_api_key_here"
            echo ""
            read -p "Press Enter after you've updated the .env file..."
        else
            log_error ".env.example file not found"
            exit 1
        fi
    fi
    
    # Check if Claude API key is set
    if grep -q "your_claude_api_key_here" .env; then
        log_error "Please set your actual Claude API key in the .env file"
        exit 1
    fi
    
    log_success "Environment configuration ready"
}

# Build and start services
deploy_services() {
    log_info "Building and starting AgentLink services..."
    
    # Stop any existing containers
    docker-compose -f docker-compose.production.yml down --remove-orphans
    
    # Build and start services
    docker-compose -f docker-compose.production.yml up -d --build
    
    log_success "Services deployment initiated"
}

# Wait for services to be healthy
wait_for_services() {
    log_info "Waiting for services to become healthy..."
    
    local services=("postgres" "redis" "agentlink-app" "claude-code-orchestrator")
    local max_attempts=30
    local attempt=1
    
    for service in "${services[@]}"; do
        log_info "Checking $service health..."
        
        while [ $attempt -le $max_attempts ]; do
            if docker-compose -f docker-compose.production.yml ps $service | grep -q "healthy"; then
                log_success "$service is healthy"
                break
            elif [ $attempt -eq $max_attempts ]; then
                log_error "$service failed to become healthy"
                log_info "Checking logs for $service:"
                docker-compose -f docker-compose.production.yml logs --tail=20 $service
                exit 1
            else
                echo -n "."
                sleep 5
                ((attempt++))
            fi
        done
        attempt=1
    done
    
    log_success "All services are healthy"
}

# Verify deployment
verify_deployment() {
    log_info "Verifying deployment..."
    
    # Check main application
    if curl -s http://localhost:3002/health > /dev/null; then
        log_success "AgentLink application is responding"
    else
        log_error "AgentLink application is not responding"
        exit 1
    fi
    
    # Check orchestrator
    if curl -s http://localhost:8000/health > /dev/null; then
        log_success "Claude Code orchestrator is responding"
    else
        log_error "Claude Code orchestrator is not responding"
        exit 1
    fi
    
    log_success "Deployment verification completed"
}

# Show service URLs
show_service_info() {
    echo ""
    echo "🎉 Deployment Complete!"
    echo "====================="
    echo ""
    echo "Service URLs:"
    echo "• AgentLink Application: http://localhost:3002"
    echo "• AgentLink API: http://localhost:3002/api/v1"
    echo "• Claude Code Orchestrator: http://localhost:8000"
    echo "• Health Check: http://localhost:3002/health"
    echo ""
    echo "Agent Configuration:"
    echo "• Agent MD files: ./agents/"
    echo "• Memory storage: ./memory/"
    echo "• Logs: ./logs/"
    echo ""
    echo "Management Commands:"
    echo "• View logs: docker-compose -f docker-compose.production.yml logs -f"
    echo "• Stop services: docker-compose -f docker-compose.production.yml down"
    echo "• Restart services: docker-compose -f docker-compose.production.yml restart"
    echo ""
    echo "Optional Monitoring (add --profile monitoring):"
    echo "• Prometheus: http://localhost:9090"
    echo "• Grafana: http://localhost:3001 (admin/agentlink_grafana_2025)"
    echo ""
}

# Main execution
main() {
    echo "Starting deployment process..."
    echo ""
    
    # Run deployment steps
    check_docker
    setup_environment
    deploy_services
    wait_for_services
    verify_deployment
    show_service_info
    
    log_success "AgentLink + Claude Code VPS deployment completed successfully!"
}

# Parse command line arguments
case "$1" in
    "monitoring")
        log_info "Deploying with monitoring stack..."
        export COMPOSE_PROFILES=monitoring
        ;;
    "production") 
        log_info "Deploying with production stack..."
        export COMPOSE_PROFILES=production
        ;;
    "full")
        log_info "Deploying with full stack (monitoring + production)..."
        export COMPOSE_PROFILES=monitoring,production
        ;;
    "")
        log_info "Deploying basic stack..."
        ;;
    *)
        echo "Usage: $0 [monitoring|production|full]"
        echo ""
        echo "Options:"
        echo "  monitoring  - Deploy with Prometheus and Grafana"
        echo "  production  - Deploy with Nginx reverse proxy"
        echo "  full        - Deploy with all optional services"
        echo "  (no option) - Deploy basic AgentLink + Claude Code stack"
        exit 1
        ;;
esac

# Run main deployment
main