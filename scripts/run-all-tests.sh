#!/bin/bash

# Comprehensive Test Runner for Claude Code + AgentLink System
# Runs all test suites with proper reporting and cleanup

set -e  # Exit on first error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEST_RESULTS_DIR="$PROJECT_ROOT/test-results"
REPORTS_DIR="$PROJECT_ROOT/reports"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Create directories
mkdir -p "$TEST_RESULTS_DIR" "$REPORTS_DIR"

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

# Cleanup function
cleanup() {
    log "Cleaning up test environment..."
    
    # Stop containers if running
    if docker-compose ps | grep -q "Up"; then
        docker-compose down -v --remove-orphans || true
    fi
    
    # Kill any remaining test processes
    pkill -f "jest\|playwright\|npm.*test" || true
    
    # Clean up temporary files
    rm -rf "$PROJECT_ROOT/tmp/test*" || true
}

# Trap cleanup on exit
trap cleanup EXIT

# Pre-flight checks
preflight_checks() {
    log "Running pre-flight checks..."
    
    # Check required tools
    local tools=("node" "npm" "docker" "docker-compose")
    for tool in "${tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            error "Required tool '$tool' is not installed"
            exit 1
        fi
    done
    
    # Check Node.js version
    local node_version=$(node --version | cut -d'v' -f2)
    local required_version="18.0.0"
    if ! npx semver "$node_version" -r ">=$required_version" &> /dev/null; then
        error "Node.js version $node_version is too old. Required: >= $required_version"
        exit 1
    fi
    
    success "Pre-flight checks completed"
}

# Install dependencies
install_dependencies() {
    log "Installing dependencies..."
    
    cd "$PROJECT_ROOT"
    
    # Install root dependencies
    npm ci --prefer-offline --no-audit
    
    # Install frontend dependencies
    if [ -d "frontend" ]; then
        cd frontend
        npm ci --prefer-offline --no-audit
        cd ..
    fi
    
    success "Dependencies installed"
}

# Build project
build_project() {
    log "Building project..."
    
    cd "$PROJECT_ROOT"
    
    # Build backend
    npm run build
    
    # Build frontend
    if [ -d "frontend" ]; then
        cd frontend
        npm run build
        cd ..
    fi
    
    success "Project built successfully"
}

# Run unit tests
run_unit_tests() {
    log "Running unit tests..."
    
    cd "$PROJECT_ROOT"
    
    # Run Jest unit tests
    npx jest tests/unit \
        --config=tests/jest.config.js \
        --coverage \
        --coverageDirectory="$TEST_RESULTS_DIR/coverage" \
        --reporters=default \
        --maxWorkers=4 \
        --verbose \
        2>&1 | tee "$TEST_RESULTS_DIR/unit-tests.log"
    
    local exit_code=${PIPESTATUS[0]}
    
    if [ $exit_code -eq 0 ]; then
        success "Unit tests passed"
        return 0
    else
        error "Unit tests failed"
        return 1
    fi
}

# Run integration tests
run_integration_tests() {
    log "Running integration tests..."
    
    cd "$PROJECT_ROOT"
    
    # Start services for integration tests
    log "Starting services..."
    docker-compose up -d --build
    
    # Wait for services to be ready
    log "Waiting for services to be ready..."
    local max_attempts=60
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -sf http://localhost:8080/health > /dev/null 2>&1; then
            break
        fi
        sleep 2
        ((attempt++))
    done
    
    if [ $attempt -eq $max_attempts ]; then
        error "Services failed to start within timeout"
        return 1
    fi
    
    success "Services are ready"
    
    # Run integration tests
    npx jest tests/integration \
        --config=tests/jest.config.js \
        --maxWorkers=2 \
        --runInBand \
        --verbose \
        2>&1 | tee "$TEST_RESULTS_DIR/integration-tests.log"
    
    local exit_code=${PIPESTATUS[0]}
    
    if [ $exit_code -eq 0 ]; then
        success "Integration tests passed"
        return 0
    else
        error "Integration tests failed"
        return 1
    fi
}

# Run end-to-end tests
run_e2e_tests() {
    log "Running end-to-end tests..."
    
    cd "$PROJECT_ROOT"
    
    # Install Playwright browsers
    npx playwright install
    
    # Run Playwright tests
    npx playwright test \
        --config=tests/playwright.config.ts \
        --reporter=html \
        --output-dir="$TEST_RESULTS_DIR/e2e-output" \
        2>&1 | tee "$TEST_RESULTS_DIR/e2e-tests.log"
    
    local exit_code=${PIPESTATUS[0]}
    
    if [ $exit_code -eq 0 ]; then
        success "End-to-end tests passed"
        return 0
    else
        error "End-to-end tests failed"
        return 1
    fi
}

# Main execution
main() {
    log "Starting comprehensive test suite for Claude Code + AgentLink"
    
    local start_time=$(date +%s)
    local failed_tests=()
    
    # Run pre-flight checks
    preflight_checks
    
    # Install dependencies
    install_dependencies
    
    # Build project
    if ! build_project; then
        failed_tests+=("build")
    fi
    
    # Run test suites
    if ! run_unit_tests; then
        failed_tests+=("unit")
    fi
    
    if ! run_integration_tests; then
        failed_tests+=("integration")
    fi
    
    if ! run_e2e_tests; then
        failed_tests+=("e2e")
    fi
    
    # Summary
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    log "Test suite completed in ${duration} seconds"
    
    if [ ${#failed_tests[@]} -eq 0 ]; then
        success "All tests passed! 🎉"
        exit 0
    else
        error "Failed test suites: ${failed_tests[*]}"
        exit 1
    fi
}

# Run main function
main "$@"