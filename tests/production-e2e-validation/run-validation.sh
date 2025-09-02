#!/bin/bash

# Production E2E WebSocket Validation Script
echo "🚀 Starting Production E2E WebSocket Validation"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Create necessary directories
print_status "Creating directories..."
mkdir -p reports/html reports/json screenshots

# Check if backend is running
print_status "Checking backend status..."
if curl -sf http://localhost:3000/health > /dev/null 2>&1; then
    print_success "Backend is running on port 3000"
else
    print_warning "Backend not detected, starting sparc-fixed-backend.js..."
    # Kill any existing backend processes
    pkill -f "node.*backend" || true
    
    # Start backend in background
    cd ../..
    node sparc-fixed-backend.js &
    BACKEND_PID=$!
    echo $BACKEND_PID > tests/production-e2e-validation/backend.pid
    
    # Wait for backend to be ready
    sleep 5
    
    if curl -sf http://localhost:3000/health > /dev/null 2>&1; then
        print_success "Backend started successfully (PID: $BACKEND_PID)"
    else
        print_error "Failed to start backend"
        exit 1
    fi
    
    cd tests/production-e2e-validation
fi

# Check if frontend is running
print_status "Checking frontend status..."
if curl -sf http://localhost:5173 > /dev/null 2>&1; then
    print_success "Frontend is running on port 5173"
else
    print_warning "Frontend not detected, please run 'npm run dev' in the main directory"
    print_error "Cannot proceed without frontend server"
    exit 1
fi

# Install Playwright if not already installed
print_status "Installing Playwright dependencies..."
npm install --silent
npx playwright install --with-deps

# Run the validation tests
print_status "Running WebSocket validation tests..."
echo ""

# Run tests with detailed reporting
npx playwright test --reporter=html --reporter=json --reporter=list

TEST_RESULT=$?

# Generate comprehensive report
print_status "Generating comprehensive validation report..."

# Create validation summary
cat > reports/validation-summary.json << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "testResult": $TEST_RESULT,
  "environment": {
    "frontend": "http://localhost:5173",
    "backend": "http://localhost:3000",
    "nodeVersion": "$(node --version)",
    "playwrightVersion": "$(npx playwright --version)"
  },
  "validationCriteria": {
    "noConnectionErrors": "REQUIRED",
    "allButtonsFunctional": "REQUIRED",
    "realCommandExecution": "REQUIRED",
    "websocketMonitoring": "REQUIRED",
    "loadTesting": "REQUIRED",
    "visualValidation": "REQUIRED",
    "performanceMetrics": "REQUIRED"
  }
}
EOF

# Check if screenshots were generated
SCREENSHOT_COUNT=$(find screenshots -name "*.png" 2>/dev/null | wc -l)
print_status "Generated $SCREENSHOT_COUNT screenshots for visual validation"

# Display test results
echo ""
echo "=========================================="
echo "         VALIDATION RESULTS"
echo "=========================================="

if [ $TEST_RESULT -eq 0 ]; then
    print_success "ALL TESTS PASSED - WebSocket implementation validated!"
    echo ""
    print_success "✅ No 'Connection Error' messages detected"
    print_success "✅ All 4 instance creation buttons functional"
    print_success "✅ Real command execution validated"
    print_success "✅ WebSocket connections monitored successfully"
    print_success "✅ Load testing completed"
    print_success "✅ Visual validation with screenshots captured"
    echo ""
    print_status "Reports generated:"
    print_status "  - HTML Report: reports/html/index.html"
    print_status "  - JSON Report: reports/results.json"
    print_status "  - Screenshots: screenshots/"
    echo ""
    print_success "🎉 PRODUCTION VALIDATION COMPLETE - READY FOR DEPLOYMENT"
else
    print_error "TESTS FAILED - Issues detected in WebSocket implementation"
    echo ""
    print_error "❌ Production validation failed"
    print_error "❌ Manual review required before deployment"
    echo ""
    print_status "Check detailed reports:"
    print_status "  - HTML Report: reports/html/index.html"
    print_status "  - Screenshots: screenshots/"
fi

# Show report locations
echo ""
print_status "Open validation reports:"
echo "  HTML Report: file://$(pwd)/reports/html/index.html"
echo "  Screenshots: $(pwd)/screenshots/"

# Cleanup if we started the backend
if [ -f backend.pid ]; then
    BACKEND_PID=$(cat backend.pid)
    print_status "Cleaning up backend process (PID: $BACKEND_PID)..."
    kill $BACKEND_PID 2>/dev/null || true
    rm -f backend.pid
fi

echo ""
echo "=========================================="

exit $TEST_RESULT