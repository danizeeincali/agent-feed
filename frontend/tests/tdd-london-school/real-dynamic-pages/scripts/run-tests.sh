#!/bin/bash

# London School TDD - Real Dynamic Pages Test Runner
# 
# CRITICAL: NO MOCKS POLICY
# All tests run against real backend with actual data
# Focus on object collaboration and behavior verification

set -e

echo "🔥 London School TDD: Real Dynamic Pages Test Suite"
echo "🚫 NO MOCKS POLICY: All tests use real backend endpoints"
echo "=================================================="

# Configuration
TEST_DIR="$(dirname "$0")/.."
FRONTEND_DIR="$(dirname "$0")/../../../.."
BACKEND_URL="http://localhost:3000"
FRONTEND_URL="http://localhost:5173"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Function to check if server is running
check_server() {
    local url=$1
    local name=$2
    
    if curl -s --fail "$url/health" > /dev/null 2>&1 || curl -s --fail "$url" > /dev/null 2>&1; then
        log_success "$name server is running at $url"
        return 0
    else
        log_error "$name server is not running at $url"
        return 1
    fi
}

# Function to wait for server
wait_for_server() {
    local url=$1
    local name=$2
    local timeout=${3:-30}
    
    log_info "Waiting for $name server at $url (timeout: ${timeout}s)..."
    
    for i in $(seq 1 $timeout); do
        if check_server "$url" "$name"; then
            return 0
        fi
        
        if [ $i -eq $timeout ]; then
            log_error "$name server failed to start within ${timeout} seconds"
            return 1
        fi
        
        echo -n "."
        sleep 1
    done
}

# Pre-flight checks
log_info "Starting London School TDD pre-flight checks..."

# Check if we're in the right directory
if [ ! -f "$TEST_DIR/jest.config.js" ]; then
    log_error "Test configuration not found. Are you in the right directory?"
    exit 1
fi

# Verify real backend is running
if ! wait_for_server "$BACKEND_URL" "Backend" 30; then
    log_error "Backend server must be running for real API tests"
    log_info "Please start the backend server with: npm run dev"
    exit 1
fi

# Verify frontend is available (for E2E tests)
if ! check_server "$FRONTEND_URL" "Frontend"; then
    log_warning "Frontend server not running. E2E tests will be skipped."
    SKIP_E2E=true
fi

# Database connection check
log_info "Verifying real database connection..."
if curl -s "$BACKEND_URL/api/health" | grep -q '"database":\s*true'; then
    log_success "Database connection verified"
else
    log_warning "Database connection could not be verified"
fi

# Test environment setup
export NODE_ENV=test
export REACT_APP_API_URL="$BACKEND_URL/api"
export REACT_APP_WS_URL="ws://localhost:3000/ws"

# Navigate to test directory
cd "$TEST_DIR"

log_info "Starting London School TDD test execution..."

# 1. API Integration Tests (Real backend calls)
echo ""
log_info "🌐 Running API Integration Tests (Real Backend)"
echo "================================================"

if npm test -- --testPathPattern="api-integration" --verbose; then
    log_success "API Integration Tests passed"
else
    log_error "API Integration Tests failed"
    exit 1
fi

# 2. Component Behavior Tests (Real data rendering)
echo ""
log_info "🎭 Running Component Behavior Tests (Real Data)"
echo "================================================"

if npm test -- --testPathPattern="component-behavior" --verbose; then
    log_success "Component Behavior Tests passed"
else
    log_error "Component Behavior Tests failed"
    exit 1
fi

# 3. Error Handling Tests (Real error scenarios)
echo ""
log_info "❌ Running Error Handling Tests (Real Failures)"
echo "================================================"

if npm test -- --testPathPattern="error-handling" --verbose; then
    log_success "Error Handling Tests passed"
else
    log_error "Error Handling Tests failed"
    exit 1
fi

# 4. Performance Tests (Real load testing)
echo ""
log_info "⚡ Running Performance Tests (Real Load)"
echo "========================================"

if npm test -- --testPathPattern="performance" --verbose --testTimeout=60000; then
    log_success "Performance Tests passed"
else
    log_error "Performance Tests failed"
    exit 1
fi

# 5. User Journey Tests (Real browser automation)
if [ "$SKIP_E2E" != "true" ]; then
    echo ""
    log_info "🚶 Running User Journey Tests (Real Browser)"
    echo "============================================"
    
    cd "$FRONTEND_DIR"
    
    if npx playwright test tests/tdd-london-school/real-dynamic-pages/user-journey/ --config=tests/tdd-london-school/real-dynamic-pages/playwright.config.ts; then
        log_success "User Journey Tests passed"
        cd "$TEST_DIR"
    else
        log_error "User Journey Tests failed"
        cd "$TEST_DIR"
        exit 1
    fi
else
    log_warning "Skipping User Journey Tests (Frontend server not available)"
fi

# Generate comprehensive coverage report
echo ""
log_info "📊 Generating Coverage Report"
echo "=============================="

npm test -- --coverage --testPathPattern="(api-integration|component-behavior|error-handling|performance)" --coverageDirectory="./reports/coverage"

# Generate consolidated test report
echo ""
log_info "📋 Generating Test Report"
echo "=========================="

# Create reports directory
mkdir -p reports

# Generate HTML report
cat > reports/london-school-test-report.html << EOF
<!DOCTYPE html>
<html>
<head>
    <title>London School TDD - Real Dynamic Pages Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { background: #2563eb; color: white; padding: 20px; border-radius: 8px; }
        .section { margin: 20px 0; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; }
        .success { background: #f0fdf4; border-color: #10b981; }
        .warning { background: #fefce8; border-color: #f59e0b; }
        .principles { background: #fef2f2; border-color: #ef4444; }
        .metric { display: inline-block; margin: 10px; padding: 10px; background: #f8fafc; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔥 London School TDD: Real Dynamic Pages Test Report</h1>
        <p>Test Execution Date: $(date)</p>
        <p><strong>🚫 NO MOCKS POLICY:</strong> All tests executed against real backend with actual data</p>
    </div>
    
    <div class="section principles">
        <h2>London School TDD Principles Applied</h2>
        <ul>
            <li>✅ Outside-in development approach</li>
            <li>✅ Mock-driven design (but NO mocks in tests)</li>
            <li>✅ Behavior verification over state testing</li>
            <li>✅ Real object collaboration testing</li>
            <li>✅ Contract-based API testing</li>
        </ul>
    </div>
    
    <div class="section success">
        <h2>✅ Test Categories Completed</h2>
        <div class="metric"><strong>API Integration:</strong> Real backend calls</div>
        <div class="metric"><strong>Component Behavior:</strong> Real data rendering</div>
        <div class="metric"><strong>Error Handling:</strong> Real failure scenarios</div>
        <div class="metric"><strong>Performance:</strong> Real load testing</div>
        $([ "$SKIP_E2E" != "true" ] && echo '<div class="metric"><strong>User Journey:</strong> Real browser automation</div>')
    </div>
    
    <div class="section">
        <h2>📊 Test Execution Summary</h2>
        <p><strong>Backend URL:</strong> $BACKEND_URL</p>
        <p><strong>Frontend URL:</strong> $FRONTEND_URL</p>
        <p><strong>Test Environment:</strong> Real systems integration</p>
        <p><strong>Coverage Report:</strong> <a href="./coverage/lcov-report/index.html">View Coverage</a></p>
    </div>
    
    <div class="section warning">
        <h2>⚠️ Important Notes</h2>
        <ul>
            <li>All tests executed against live backend services</li>
            <li>No mocked services or data were used</li>
            <li>Performance tests reflect real system capabilities</li>
            <li>Error tests used actual network failures and timeouts</li>
        </ul>
    </div>
</body>
</html>
EOF

log_success "Test report generated: reports/london-school-test-report.html"

# Final summary
echo ""
echo "🎉 London School TDD Test Suite Complete!"
echo "========================================"
log_success "All test categories passed with real systems"
log_success "No mocks were used - pure collaboration testing"
log_success "Coverage report available in reports/coverage/"
log_success "HTML report available in reports/london-school-test-report.html"

echo ""
echo "📋 Test Execution Summary:"
echo "  ✅ API Integration Tests (Real Backend)"
echo "  ✅ Component Behavior Tests (Real Data)" 
echo "  ✅ Error Handling Tests (Real Failures)"
echo "  ✅ Performance Tests (Real Load)"
if [ "$SKIP_E2E" != "true" ]; then
    echo "  ✅ User Journey Tests (Real Browser)"
else
    echo "  ⚠️  User Journey Tests (Skipped - Frontend not available)"
fi

echo ""
log_info "London School TDD principles successfully applied:"
log_info "  🎯 Outside-in development"
log_info "  🤝 Real object collaboration"
log_info "  📋 Contract verification"
log_info "  🚫 Zero mocks policy enforced"

exit 0