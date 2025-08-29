#!/bin/bash

# Escape Sequence Storm TDD Test Runner
# 
# This script runs the comprehensive TDD test suite that demonstrates
# the escape sequence storm root causes. These tests SHOULD FAIL initially.

set -e

echo "🚀 Running Escape Sequence Storm TDD Test Suite"
echo "=================================================="
echo ""
echo "⚠️  IMPORTANT: These tests SHOULD FAIL initially!"
echo "📋 They demonstrate the current broken behavior that causes escape sequence storms"
echo "🔧 After implementing fixes, run again to verify solutions work"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create necessary directories
echo -e "${BLUE}📁 Setting up test environment...${NC}"
mkdir -p tests/escape-sequence-storm/coverage
mkdir -p tests/escape-sequence-storm/reports
mkdir -p tests/escape-sequence-storm/artifacts

# Check if required dependencies are installed
echo -e "${BLUE}🔍 Checking dependencies...${NC}"

if ! command -v npx &> /dev/null; then
    echo -e "${RED}❌ npx not found. Please install Node.js and npm${NC}"
    exit 1
fi

# Install test dependencies if needed
if [ ! -d "tests/escape-sequence-storm/node_modules" ]; then
    echo -e "${YELLOW}📦 Installing test dependencies...${NC}"
    cd tests/escape-sequence-storm
    
    # Create package.json if it doesn't exist
    if [ ! -f "package.json" ]; then
        cat > package.json << EOF
{
  "name": "escape-sequence-storm-tdd",
  "version": "1.0.0",
  "description": "TDD test suite for escape sequence storm prevention",
  "main": "jest.config.js",
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:debug": "node --inspect-brk node_modules/.bin/jest --runInBand"
  },
  "devDependencies": {
    "@babel/core": "^7.22.0",
    "@babel/preset-env": "^7.22.0",
    "@babel/preset-react": "^7.22.0",
    "@testing-library/jest-dom": "^5.16.5",
    "@testing-library/react": "^13.4.0",
    "@testing-library/user-event": "^14.4.3",
    "@types/jest": "^29.5.0",
    "babel-jest": "^29.5.0",
    "jest": "^29.5.0",
    "jest-environment-jsdom": "^29.5.0",
    "jest-html-reporters": "^3.1.4",
    "jest-watch-typeahead": "^2.2.2",
    "ts-jest": "^29.1.0",
    "typescript": "^5.0.0"
  },
  "peerDependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  }
}
EOF
    fi
    
    npm install --no-fund --no-audit
    cd ../..
fi

# Run the test suites
echo -e "${BLUE}🧪 Running TDD Test Suites...${NC}"
echo ""

# Set test environment
export NODE_ENV=test
export JEST_CONFIG_PATH=tests/escape-sequence-storm/jest.config.js

# Run specific test categories with detailed reporting
echo -e "${YELLOW}🎯 1. Button Click Debouncing Tests (SHOULD FAIL)${NC}"
npx jest --config=tests/escape-sequence-storm/jest.config.js --testNamePattern="Button Click Debouncing" --verbose --no-cache || true

echo ""
echo -e "${YELLOW}🎯 2. PTY Process Management Tests (SHOULD FAIL)${NC}"
npx jest --config=tests/escape-sequence-storm/jest.config.js --testNamePattern="PTY Process Management" --verbose --no-cache || true

echo ""
echo -e "${YELLOW}🎯 3. SSE Connection Management Tests (SHOULD FAIL)${NC}"
npx jest --config=tests/escape-sequence-storm/jest.config.js --testNamePattern="SSE Connection Management" --verbose --no-cache || true

echo ""
echo -e "${YELLOW}🎯 4. Output Buffer Management Tests (SHOULD FAIL)${NC}"
npx jest --config=tests/escape-sequence-storm/jest.config.js --testNamePattern="Output Buffer Management" --verbose --no-cache || true

echo ""
echo -e "${YELLOW}🎯 5. End-to-End Integration Tests (SHOULD FAIL)${NC}"
npx jest --config=tests/escape-sequence-storm/jest.config.js --testNamePattern="End-to-End" --verbose --no-cache || true

echo ""
echo -e "${BLUE}📊 Generating comprehensive test report...${NC}"

# Run all tests with coverage and detailed reporting
npx jest --config=tests/escape-sequence-storm/jest.config.js \
  --coverage \
  --coverageReporters=text,html,lcov \
  --verbose \
  --no-cache \
  --testResultsProcessor=tests/escape-sequence-storm/test-results-processor.js \
  2>&1 | tee tests/escape-sequence-storm/test-output.log || true

# Generate summary report
echo ""
echo -e "${BLUE}📋 Generating Summary Report...${NC}"

TOTAL_TESTS=$(grep -o "Tests:.*" tests/escape-sequence-storm/test-output.log | tail -1 || echo "Tests: Unknown")
FAILED_TESTS=$(grep -o "failed.*" tests/escape-sequence-storm/test-output.log | tail -1 || echo "failed: Unknown")

cat > tests/escape-sequence-storm/SUMMARY_REPORT.md << EOF
# Escape Sequence Storm TDD Test Summary

**Date:** $(date)
**Environment:** Test Environment (jsdom)

## Test Results Overview

$TOTAL_TESTS
$FAILED_TESTS

## Test Categories

1. **Button Click Debouncing** - Prevents multiple rapid Claude instance spawns
2. **PTY Process Management** - Proper terminal escape sequence handling and process lifecycle  
3. **SSE Connection Management** - Prevents event listener multiplication and connection conflicts
4. **Output Buffer Management** - Rate limiting and intelligent buffering
5. **End-to-End Integration** - Complete escape sequence storm prevention workflow

## Expected Behavior

⚠️ **These tests SHOULD FAIL initially!**

These tests demonstrate the exact failure scenarios that cause escape sequence storms:
- Multiple instance spawning from rapid button clicks
- PTY process conflicts and improper cleanup
- SSE connection multiplication and event handler leaks
- Unbounded output buffering causing memory issues
- Complete system breakdown under storm conditions

## Next Steps

1. Analyze failing test patterns to understand root causes
2. Implement fixes for each identified failure scenario
3. Re-run tests to verify fixes resolve the issues
4. Add additional tests for edge cases discovered during fixes

## Files Generated

- Coverage Report: \`tests/escape-sequence-storm/coverage/index.html\`
- Test Report: \`tests/escape-sequence-storm/reports/escape-sequence-storm-test-report.html\`
- Raw Output: \`tests/escape-sequence-storm/test-output.log\`
- This Summary: \`tests/escape-sequence-storm/SUMMARY_REPORT.md\`

---

*Generated by Escape Sequence Storm TDD Test Suite*
EOF

echo ""
echo -e "${GREEN}✅ Test suite execution completed!${NC}"
echo ""
echo -e "${BLUE}📊 Reports generated:${NC}"
echo -e "   📈 Coverage: tests/escape-sequence-storm/coverage/index.html"
echo -e "   📋 Test Report: tests/escape-sequence-storm/reports/escape-sequence-storm-test-report.html" 
echo -e "   📝 Summary: tests/escape-sequence-storm/SUMMARY_REPORT.md"
echo -e "   🗒️  Raw Output: tests/escape-sequence-storm/test-output.log"
echo ""
echo -e "${YELLOW}⚠️  REMINDER: These tests should FAIL initially!${NC}"
echo -e "${GREEN}🔧 After implementing fixes, run this script again to verify solutions${NC}"
echo ""

# Open reports if running in interactive mode
if [ -t 0 ]; then
    echo -e "${BLUE}🌐 Would you like to open the HTML reports? (y/n)${NC}"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        if command -v open &> /dev/null; then
            open tests/escape-sequence-storm/coverage/index.html
            open tests/escape-sequence-storm/reports/escape-sequence-storm-test-report.html
        elif command -v xdg-open &> /dev/null; then
            xdg-open tests/escape-sequence-storm/coverage/index.html
            xdg-open tests/escape-sequence-storm/reports/escape-sequence-storm-test-report.html
        else
            echo -e "${YELLOW}Please open the HTML files manually in your browser${NC}"
        fi
    fi
fi

echo -e "${GREEN}🚀 Test execution complete!${NC}"