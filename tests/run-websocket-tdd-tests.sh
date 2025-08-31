#!/bin/bash

echo "🚀 TDD WebSocket Connection Testing Suite"
echo "========================================="

# Check if required dependencies are available
echo "🔍 Checking dependencies..."

if ! command -v npx &> /dev/null; then
    echo "❌ npx not found. Please install Node.js"
    exit 1
fi

if ! npx playwright --version &> /dev/null; then
    echo "❌ Playwright not found. Installing..."
    npm install @playwright/test
fi

echo "✅ Dependencies verified"

# Create test results directory
mkdir -p test-results
mkdir -p test-results/screenshots
mkdir -p test-results/videos

echo "📁 Test results directory prepared"

# Check backend status
echo "🔍 Checking backend status..."
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ Backend is running"
else
    echo "⚠️ Backend not responding - tests may fail"
fi

# Check frontend status
echo "🔍 Checking frontend status..."
if curl -f http://localhost:5173 > /dev/null 2>&1; then
    echo "✅ Frontend is running"
else
    echo "⚠️ Frontend not responding - tests may fail"
fi

echo ""
echo "🧪 Running TDD WebSocket Tests..."
echo "================================="

# Run the comprehensive test suite
echo "1️⃣ Running Connection Establishment Tests..."
npx playwright test ./tdd-websocket-connection-suite.spec.js \
    --reporter=html \
    --output=test-results/connection-tests \
    --headed

echo ""
echo "2️⃣ Running Message Flow Analysis Tests..."
npx playwright test ./tdd-websocket-message-flow.spec.js \
    --reporter=html \
    --output=test-results/message-flow-tests \
    --headed

echo ""
echo "3️⃣ Running Connection Diagnosis Tests..."
npx playwright test ./tdd-websocket-diagnosis-spec.js \
    --reporter=html \
    --output=test-results/diagnosis-tests \
    --headed

echo ""
echo "📊 Test Execution Complete!"
echo "==========================="

# Generate summary report
echo "📋 Generating summary report..."

TEST_REPORT_FILE="test-results/tdd-websocket-summary.txt"
echo "TDD WebSocket Connection Testing Summary" > $TEST_REPORT_FILE
echo "=======================================" >> $TEST_REPORT_FILE
echo "Execution Date: $(date)" >> $TEST_REPORT_FILE
echo "" >> $TEST_REPORT_FILE

# Check if any test reports exist
if ls test-results/*.json 1> /dev/null 2>&1; then
    echo "✅ Test reports generated:"
    ls -la test-results/*.json
    echo "Test reports found:" >> $TEST_REPORT_FILE
    ls -la test-results/*.json >> $TEST_REPORT_FILE
else
    echo "⚠️ No JSON test reports found"
    echo "No JSON test reports found" >> $TEST_REPORT_FILE
fi

echo "" >> $TEST_REPORT_FILE

# Check backend logs for connection messages
echo "Backend Connection Messages:" >> $TEST_REPORT_FILE
if pgrep -f "simple-backend.js" > /dev/null; then
    echo "Backend process is running (PID: $(pgrep -f "simple-backend.js"))" >> $TEST_REPORT_FILE
else
    echo "Backend process not found" >> $TEST_REPORT_FILE
fi

echo ""
echo "📄 Summary report saved to: $TEST_REPORT_FILE"

# Display key findings
echo ""
echo "🔍 Key Test Results:"
echo "===================="

if grep -r "CRITICAL" test-results/ 2>/dev/null; then
    echo "❌ Critical issues found in test results"
else
    echo "✅ No critical issues reported"
fi

if grep -r "No connections for claude" test-results/ 2>/dev/null; then
    echo "❌ 'No connections' issue reproduced"
else
    echo "✅ 'No connections' issue not reproduced"
fi

echo ""
echo "📂 Full test results available in:"
echo "   - HTML Report: test-results/playwright-report/index.html"
echo "   - Screenshots: test-results/screenshots/"
echo "   - Videos: test-results/videos/"
echo "   - JSON Reports: test-results/*.json"

echo ""
echo "🎯 Next Steps:"
echo "=============="
echo "1. Review HTML reports for detailed test results"
echo "2. Check JSON diagnostic reports for connection analysis"
echo "3. If issues found, implement fixes and re-run tests"
echo "4. Use 'RED → GREEN → REFACTOR' TDD cycle"

echo ""
echo "✅ TDD WebSocket Testing Complete!"