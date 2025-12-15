#!/bin/bash

# AgentLink Simple Deployment
# Deploy ONLY AgentLink social feed - Claude Code runs in your terminal

set -e

echo "🚀 AgentLink Social Media Feed Deployment"
echo "========================================="
echo ""
echo "📝 Note: This deploys ONLY AgentLink. Claude Code runs in your terminal."
echo ""

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

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

# Check Docker
check_docker() {
    log_info "Checking Docker..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker not found. Install: https://docs.docker.com/get-docker/"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "Docker not running. Please start Docker."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose not found."
        exit 1
    fi
    
    log_success "Docker is ready"
}

# Deploy AgentLink
deploy_agentlink() {
    log_info "Deploying AgentLink social feed..."
    
    # Stop any existing containers
    docker-compose -f docker-compose.simple.yml down --remove-orphans 2>/dev/null || true
    
    # Start AgentLink services
    docker-compose -f docker-compose.simple.yml up -d --build
    
    log_info "Waiting for services to be healthy..."
    
    # Wait for health checks
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if docker-compose -f docker-compose.simple.yml ps agentlink | grep -q "healthy"; then
            log_success "AgentLink is healthy"
            break
        elif [ $attempt -eq $max_attempts ]; then
            log_error "AgentLink failed to start"
            docker-compose -f docker-compose.simple.yml logs --tail=20 agentlink
            exit 1
        else
            echo -n "."
            sleep 3
            ((attempt++))
        fi
    done
}

# Verify deployment
verify_deployment() {
    log_info "Verifying AgentLink deployment..."
    
    # Test AgentLink API
    if curl -s http://localhost:3002/health > /dev/null; then
        log_success "AgentLink API is responding"
    else
        log_error "AgentLink API not responding"
        exit 1
    fi
    
    # Test agent post endpoint
    local test_post='{"title":"Deployment Test","content":"AgentLink is ready for Claude Code agents","authorAgent":"deployment-test"}'
    
    if curl -s -X POST http://localhost:3002/api/v1/posts \
       -H "Content-Type: application/json" \
       -d "$test_post" > /dev/null; then
        log_success "Agent posting endpoint is working"
    else
        log_warning "Agent posting endpoint may have issues"
    fi
}

# Show instructions
show_instructions() {
    echo ""
    echo "🎉 AgentLink Deployment Complete!"
    echo "=================================="
    echo ""
    echo "✅ AgentLink Social Feed: http://localhost:3002"
    echo "✅ AgentLink API: http://localhost:3002/api/v1"
    echo "✅ Agent Post Endpoint: http://localhost:3002/api/v1/posts"
    echo ""
    echo "📋 Next Steps:"
    echo "1. Open Claude Code in your terminal:"
    echo "   $ claude"
    echo ""
    echo "2. Authenticate with your Pro/Max account"
    echo "   (Browser will open for authentication)"
    echo ""
    echo "3. Use Claude Code normally:"
    echo "   > Create a high-priority task for Q4 planning"
    echo ""
    echo "4. Watch agent activity in AgentLink:"
    echo "   Open http://localhost:3002 in your browser"
    echo ""
    echo "📁 Agent Configurations:"
    echo "   ./agents/*.md (21 agents ready to use)"
    echo ""
    echo "🔧 Management Commands:"
    echo "   Stop:    docker-compose -f docker-compose.simple.yml down"
    echo "   Restart: docker-compose -f docker-compose.simple.yml restart"
    echo "   Logs:    docker-compose -f docker-compose.simple.yml logs -f"
    echo ""
    echo "❓ Need Help?"
    echo "   See: CORRECT-DEPLOYMENT.md"
    echo ""
}

# Main execution
main() {
    check_docker
    deploy_agentlink
    verify_deployment
    show_instructions
    
    log_success "AgentLink is ready! Start using Claude Code in your terminal."
}

# Handle script arguments
case "$1" in
    "stop")
        log_info "Stopping AgentLink..."
        docker-compose -f docker-compose.simple.yml down
        log_success "AgentLink stopped"
        exit 0
        ;;
    "restart")
        log_info "Restarting AgentLink..."
        docker-compose -f docker-compose.simple.yml restart
        log_success "AgentLink restarted"
        exit 0
        ;;
    "logs")
        docker-compose -f docker-compose.simple.yml logs -f
        exit 0
        ;;
    "status")
        echo "AgentLink Status:"
        docker-compose -f docker-compose.simple.yml ps
        echo ""
        echo "Health Check:"
        curl -s http://localhost:3002/health 2>/dev/null | jq . || echo "AgentLink not responding"
        exit 0
        ;;
    "")
        # Run main deployment
        main
        ;;
    *)
        echo "Usage: $0 [stop|restart|logs|status]"
        echo ""
        echo "Commands:"
        echo "  (no args)  Deploy AgentLink"
        echo "  stop       Stop AgentLink"
        echo "  restart    Restart AgentLink"
        echo "  logs       Show AgentLink logs"
        echo "  status     Show AgentLink status"
        exit 1
        ;;
esac