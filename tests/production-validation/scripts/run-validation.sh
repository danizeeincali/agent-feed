#!/bin/bash

# Production Validation Runner Script
# Executes comprehensive Settings removal validation

set -e

echo "🚀 Starting Production Validation for Settings Removal"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
VALIDATION_DIR="/workspaces/agent-feed/tests/production-validation"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
REPORT_DIR="${VALIDATION_DIR}/reports/${TIMESTAMP}"

# Create report directory
mkdir -p "${REPORT_DIR}"

echo -e "${BLUE}📁 Created report directory: ${REPORT_DIR}${NC}"

# Function to log with timestamp
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

# Pre-validation checks
log "🔍 Running pre-validation checks..."

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    error "Node.js is not installed or not in PATH"
    exit 1
fi

# Check if npm is available
if ! command -v npm &> /dev/null; then
    error "npm is not installed or not in PATH"
    exit 1
fi

# Navigate to project root
cd /workspaces/agent-feed

# Install dependencies if needed
log "📦 Checking dependencies..."
if [ ! -d "node_modules" ] || [ ! -d "frontend/node_modules" ]; then
    log "Installing dependencies..."
    npm install
    cd frontend && npm install && cd ..
fi

# Start services
log "🚀 Starting services..."

# Kill any existing processes
pkill -f "next dev" || true
pkill -f "simple-backend" || true
sleep 2

# Start backend
log "Starting backend service..."
nohup node simple-backend.js > "${VALIDATION_DIR}/logs/backend-${TIMESTAMP}.log" 2>&1 &
BACKEND_PID=$!
sleep 3

# Start frontend
log "Starting frontend service..."
cd frontend
nohup npm run dev > "${VALIDATION_DIR}/logs/frontend-${TIMESTAMP}.log" 2>&1 &
FRONTEND_PID=$!
cd ..

# Wait for services to be ready
log "⏳ Waiting for services to be ready..."
sleep 10

# Health check
check_service() {
    local url=$1
    local name=$2
    local max_attempts=30
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if curl -s -f "$url" > /dev/null 2>&1; then
            log "✅ $name is ready"
            return 0
        fi

        if [ $attempt -eq $max_attempts ]; then
            error "$name failed to start after $max_attempts attempts"
            return 1
        fi

        log "⏳ Waiting for $name... (attempt $attempt/$max_attempts)"
        sleep 2
        ((attempt++))
    done
}

# Check services
mkdir -p "${VALIDATION_DIR}/logs"
check_service "http://localhost:3000" "Frontend"
check_service "http://localhost:5001" "Backend" || warning "Backend may not be available, continuing..."

# Run Playwright tests
log "🎭 Running Playwright validation tests..."
cd "${VALIDATION_DIR}"

# Install Playwright browsers if needed
if [ ! -d "${HOME}/.cache/ms-playwright" ]; then
    log "Installing Playwright browsers..."
    npx playwright install
fi

# Run tests with comprehensive reporting
log "🧪 Executing test suite..."
npx playwright test \
    --config=playwright.config.ts \
    --reporter=html,json,junit \
    --output-dir="${REPORT_DIR}/artifacts" \
    --video=retain-on-failure \
    --screenshot=only-on-failure \
    --trace=on-first-retry \
    settings-removal-validation.spec.ts

TEST_EXIT_CODE=$?

# Capture additional metrics
log "📊 Collecting additional metrics..."

# Bundle size analysis
cd /workspaces/agent-feed/frontend
if npm run build > "${REPORT_DIR}/build-output.txt" 2>&1; then
    log "✅ Bundle analysis completed"
else
    warning "Bundle analysis failed, continuing..."
fi

# Memory usage
ps aux | grep -E "(node|npm)" > "${REPORT_DIR}/process-memory.txt" || true

# Network analysis
curl -s "http://localhost:3000" -w "@${VALIDATION_DIR}/scripts/curl-format.txt" > "${REPORT_DIR}/network-metrics.txt" 2>&1 || true

# Generate comprehensive report
log "📋 Generating comprehensive validation report..."

cat << EOF > "${REPORT_DIR}/validation-summary.md"
# Production Validation Summary
**Generated**: $(date)
**Test Suite**: Settings Removal Validation
**Exit Code**: ${TEST_EXIT_CODE}

## Test Results
$([ $TEST_EXIT_CODE -eq 0 ] && echo "✅ **PASSED**" || echo "❌ **FAILED**")

## Services Status
- Frontend (localhost:3000): $(curl -s -f "http://localhost:3000" && echo "✅ Active" || echo "❌ Failed")
- Backend (localhost:5001): $(curl -s -f "http://localhost:5001" && echo "✅ Active" || echo "⚠️ Unavailable")

## Artifacts Generated
- Test Results: \`${REPORT_DIR}/\`
- Screenshots: Available in artifacts directory
- Videos: Available for failed tests
- Performance Metrics: Collected and saved

## Next Steps
$([ $TEST_EXIT_CODE -eq 0 ] && echo "- Review detailed test results\n- Proceed with deployment preparation" || echo "- Review failed test details\n- Address identified issues\n- Re-run validation")

---
**Validation ID**: ${TIMESTAMP}
EOF

# Create curl format file for network metrics
cat << 'EOF' > "${VALIDATION_DIR}/scripts/curl-format.txt"
     time_namelookup:  %{time_namelookup}s\n
        time_connect:  %{time_connect}s\n
     time_appconnect:  %{time_appconnect}s\n
    time_pretransfer:  %{time_pretransfer}s\n
       time_redirect:  %{time_redirect}s\n
  time_starttransfer:  %{time_starttransfer}s\n
                     ----------\n
          time_total:  %{time_total}s\n
EOF

# Cleanup processes
cleanup() {
    log "🧹 Cleaning up processes..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    pkill -f "next dev" || true
    pkill -f "simple-backend" || true
}

# Set up cleanup trap
trap cleanup EXIT

# Final reporting
if [ $TEST_EXIT_CODE -eq 0 ]; then
    log "🎉 Production validation completed successfully!"
    log "📊 Report available at: ${REPORT_DIR}/validation-summary.md"
    log "🎭 Playwright HTML report: ${REPORT_DIR}/artifacts/playwright-report/index.html"
else
    error "Production validation failed with exit code: ${TEST_EXIT_CODE}"
    log "📊 Report available at: ${REPORT_DIR}/validation-summary.md"
    log "🎭 Playwright HTML report: ${REPORT_DIR}/artifacts/playwright-report/index.html"
fi

echo "=================================================="
echo -e "${BLUE}🏁 Production Validation Complete${NC}"
echo -e "${BLUE}Report Directory: ${REPORT_DIR}${NC}"
echo "=================================================="

exit $TEST_EXIT_CODE