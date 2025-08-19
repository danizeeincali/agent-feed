#!/bin/bash

# Deployment Validation Script for Claude Code + AgentLink System
# Comprehensive validation of deployed system functionality

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="${DOMAIN:-localhost}"
API_BASE_URL="${API_BASE_URL:-http://$DOMAIN:8080}"
FRONTEND_BASE_URL="${FRONTEND_BASE_URL:-http://$DOMAIN:3000}"
VALIDATION_LOG="/tmp/validation-$(date +%Y%m%d_%H%M%S).log"

# Test results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$VALIDATION_LOG"
}

success() {
    echo -e "${GREEN}✅ $1${NC}" | tee -a "$VALIDATION_LOG"
    ((PASSED_TESTS++))
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}" | tee -a "$VALIDATION_LOG"
}

error() {
    echo -e "${RED}❌ $1${NC}" | tee -a "$VALIDATION_LOG"
    ((FAILED_TESTS++))
}

# Test counter
test_start() {
    ((TOTAL_TESTS++))
    log "Test $TOTAL_TESTS: $1"
}

# Basic connectivity tests
test_basic_connectivity() {
    test_start "Testing basic connectivity"
    
    # Test API health endpoint
    if curl -sf "$API_BASE_URL/health" > /dev/null; then
        success "API health endpoint accessible"
    else
        error "API health endpoint not accessible"
        return 1
    fi
    
    # Test frontend
    if curl -sf "$FRONTEND_BASE_URL" > /dev/null; then
        success "Frontend accessible"
    else
        error "Frontend not accessible"
        return 1
    fi
    
    return 0
}

# Container health tests
test_container_health() {
    test_start "Testing container health"
    
    # Check if containers are running
    local containers=("agent-feed-api" "agent-feed-postgres" "agent-feed-redis")
    
    for container in "${containers[@]}"; do
        if docker ps | grep -q "$container.*Up"; then
            success "Container $container is running"
        else
            error "Container $container is not running"
        fi
    done
    
    return 0
}

# API functionality tests
test_api_functionality() {
    test_start "Testing API functionality"
    
    # Test basic API endpoints
    local endpoints=(
        "/health"
        "/api/health"
        "/api/agent-posts"
    )
    
    for endpoint in "${endpoints[@]}"; do
        local status_code=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE_URL$endpoint")
        
        if [[ "$status_code" =~ ^[23] ]]; then
            success "Endpoint $endpoint returns valid status: $status_code"
        else
            error "Endpoint $endpoint returns error status: $status_code"
        fi
    done
    
    return 0
}

# Performance benchmarks
test_performance_benchmarks() {
    test_start "Testing performance benchmarks"
    
    # Test API response time
    local api_start_time=$(date +%s%N)
    curl -s "$API_BASE_URL/api/health" > /dev/null
    local api_end_time=$(date +%s%N)
    local api_response_time=$(( (api_end_time - api_start_time) / 1000000 )) # Convert to milliseconds
    
    if [[ $api_response_time -lt 5000 ]]; then
        success "API response time within acceptable range: ${api_response_time}ms"
    else
        warning "API response time is slow: ${api_response_time}ms"
    fi
    
    return 0
}

# Main validation function
main() {
    log "Starting deployment validation for Claude Code + AgentLink system"
    
    local start_time=$(date +%s)
    
    log "Validating deployment at:"
    log "  API: $API_BASE_URL"
    log "  Frontend: $FRONTEND_BASE_URL"
    
    # Run validation tests
    test_basic_connectivity
    test_container_health
    test_api_functionality
    test_performance_benchmarks
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    local success_rate=$(( PASSED_TESTS * 100 / TOTAL_TESTS ))
    
    log "Validation completed in ${duration} seconds"
    log "Results: $PASSED_TESTS/$TOTAL_TESTS tests passed ($success_rate% success rate)"
    
    if [[ $success_rate -ge 90 ]]; then
        success "Deployment validation PASSED! 🎉"
        exit 0
    else
        error "Deployment validation FAILED ❌"
        exit 1
    fi
}

# Run main function
main "$@"