#!/bin/bash

# White Screen Fix Validation Script
# 
# Comprehensive validation script for SimpleLauncher component
# after fixing duplicate import issues that caused white screen.
#
# This script:
# 1. Checks server requirements
# 2. Installs dependencies if needed
# 3. Runs comprehensive Playwright validation suite
# 4. Generates detailed reports
# 5. Provides actionable feedback

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 WHITE SCREEN FIX VALIDATION SUITE${NC}"
echo -e "${BLUE}====================================${NC}"
echo ""

# Function to print status messages
print_status() {
    echo -e "${BLUE}📋 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if we're in the right directory
if [[ ! -f "package.json" ]]; then
    print_error "Please run this script from the frontend directory"
    exit 1
fi

print_status "Checking prerequisites..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi

print_success "Node.js found: $(node --version)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

print_success "npm found: $(npm --version)"

# Install dependencies if node_modules doesn't exist
if [[ ! -d "node_modules" ]]; then
    print_status "Installing dependencies..."
    npm install
    print_success "Dependencies installed"
else
    print_success "Dependencies already installed"
fi

# Check if Playwright browsers are installed
if ! npx playwright --version &> /dev/null; then
    print_status "Installing Playwright..."
    npx playwright install
    print_success "Playwright installed"
fi

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -i:$port &> /dev/null; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to start server if not running
start_server_if_needed() {
    local port=$1
    local command=$2
    local name=$3
    
    if check_port $port; then
        print_success "$name server already running on port $port"
        return 0
    else
        print_warning "$name server not running on port $port"
        print_status "Attempting to start $name server..."
        
        # Start server in background
        if [[ "$port" == "3000" ]]; then
            npm run dev -- --port $port &
            FRONTEND_PID=$!
        elif [[ "$port" == "3001" ]]; then
            (cd ../.. && npm run dev -- --port $port) &
            BACKEND_PID=$!
        fi
        
        # Wait for server to start
        local attempts=0
        local max_attempts=30
        
        while [[ $attempts -lt $max_attempts ]]; do
            if check_port $port; then
                print_success "$name server started successfully on port $port"
                return 0
            fi
            
            sleep 2
            ((attempts++))
            echo -n "."
        done
        
        print_error "Failed to start $name server on port $port after $((max_attempts * 2)) seconds"
        return 1
    fi
}

# Cleanup function
cleanup() {
    print_status "Cleaning up background processes..."
    if [[ -n "${FRONTEND_PID:-}" ]]; then
        kill $FRONTEND_PID 2>/dev/null || true
        print_success "Frontend server stopped"
    fi
    if [[ -n "${BACKEND_PID:-}" ]]; then
        kill $BACKEND_PID 2>/dev/null || true
        print_success "Backend server stopped"
    fi
}

# Set trap to cleanup on script exit
trap cleanup EXIT

print_status "Checking server requirements..."

# Check if servers are running or start them
print_status "Ensuring frontend server (port 3000) is available..."
if ! start_server_if_needed 3000 "npm run dev -- --port 3000" "Frontend"; then
    print_error "Cannot proceed without frontend server"
    exit 1
fi

print_status "Ensuring backend server (port 3001) is available..."
if ! start_server_if_needed 3001 "cd ../.. && npm run dev -- --port 3001" "Backend"; then
    print_warning "Backend server not available - some tests may fail"
fi

# Wait a bit for servers to fully initialize
print_status "Waiting for servers to initialize..."
sleep 5

print_status "Starting comprehensive validation suite..."
echo ""

# Parse command line arguments
HEADED="false"
DEBUG="false"
QUICK="false"

for arg in "$@"; do
    case $arg in
        --headed)
            HEADED="true"
            ;;
        --debug)
            DEBUG="true"
            ;;
        --quick)
            QUICK="true"
            ;;
    esac
done

# Run validation based on arguments
if [[ "$QUICK" == "true" ]]; then
    print_status "Running quick validation..."
    if [[ "$HEADED" == "true" ]]; then
        npm run validate:quick:headed
    else
        npm run validate:quick
    fi
elif [[ "$DEBUG" == "true" ]]; then
    print_status "Running validation in debug mode..."
    npm run validate:white-screen:debug
elif [[ "$HEADED" == "true" ]]; then
    print_status "Running validation with browser visible..."
    npm run validate:white-screen:headed
else
    print_status "Running full validation suite..."
    npm run validate:white-screen
fi

VALIDATION_EXIT_CODE=$?

echo ""
echo -e "${BLUE}======================================${NC}"

if [[ $VALIDATION_EXIT_CODE -eq 0 ]]; then
    print_success "🎉 ALL VALIDATIONS PASSED! 🎉"
    print_success "SimpleLauncher white screen fix is working correctly!"
    echo ""
    print_status "✅ Key validations completed:"
    echo "   • Main app loads without white screen"
    echo "   • SimpleLauncher navigation works"
    echo "   • Component renders with all UI elements"
    echo "   • API connectivity to backend functions"
    echo "   • Process launch/stop workflow operates"
    echo "   • Error handling displays appropriately"
    echo "   • Browser console is clean of critical errors"
    echo "   • Responsive design works across viewports"
    echo ""
    print_success "🚀 SimpleLauncher is ready for production!"
else
    print_error "⚠️  SOME VALIDATIONS FAILED"
    echo ""
    print_status "📋 Next steps:"
    echo "   1. Review the test output above for specific failures"
    echo "   2. Check browser console for errors"
    echo "   3. Verify both servers are running correctly"
    echo "   4. Fix any identified issues"
    echo "   5. Re-run validation: ./scripts/run-white-screen-validation.sh"
    echo ""
    print_warning "🛠️  Run with --headed to see browser interaction"
    print_warning "🐛 Run with --debug for step-by-step debugging"
fi

echo -e "${BLUE}======================================${NC}"

# Generate report location info
if [[ -d "playwright-report/white-screen-validation" ]]; then
    print_status "📊 Detailed HTML report available:"
    echo "   file://$(pwd)/playwright-report/white-screen-validation/index.html"
fi

if [[ -d "test-results/white-screen-validation" ]]; then
    print_status "📁 Test artifacts saved:"
    echo "   $(pwd)/test-results/white-screen-validation/"
fi

echo ""
print_status "Usage examples:"
echo "   ./scripts/run-white-screen-validation.sh           # Full validation suite"
echo "   ./scripts/run-white-screen-validation.sh --headed  # Show browser"
echo "   ./scripts/run-white-screen-validation.sh --debug   # Debug mode"
echo "   ./scripts/run-white-screen-validation.sh --quick   # Quick validation"

exit $VALIDATION_EXIT_CODE