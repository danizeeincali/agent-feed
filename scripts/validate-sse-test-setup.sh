#!/bin/bash

###############################################################################
# SSE Stability Test Suite - Setup Validation Script
#
# Validates that all test files, dependencies, and documentation are in place
# Run this before executing tests to ensure everything is properly configured
#
# Usage: ./scripts/validate-sse-test-setup.sh
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
WARNINGS=0

print_header() {
  echo -e "\n${BLUE}========================================${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}========================================${NC}\n"
}

check_pass() {
  echo -e "${GREEN}✓ $1${NC}"
  ((PASSED++))
}

check_fail() {
  echo -e "${RED}✗ $1${NC}"
  ((FAILED++))
}

check_warn() {
  echo -e "${YELLOW}⚠ $1${NC}"
  ((WARNINGS++))
}

print_header "SSE Stability Test Suite - Setup Validation"

# Check test files exist
print_header "Test Files"

if [ -f "tests/integration/sse-stability-quick.js" ]; then
  check_pass "Quick validation test exists (tests/integration/sse-stability-quick.js)"
else
  check_fail "Quick validation test missing (tests/integration/sse-stability-quick.js)"
fi

if [ -f "tests/integration/sse-stability-full.js" ]; then
  check_pass "Full stability test exists (tests/integration/sse-stability-full.js)"
else
  check_fail "Full stability test missing (tests/integration/sse-stability-full.js)"
fi

if [ -f "tests/e2e/sse-stability-validation.spec.ts" ]; then
  check_pass "E2E test exists (tests/e2e/sse-stability-validation.spec.ts)"
else
  check_fail "E2E test missing (tests/e2e/sse-stability-validation.spec.ts)"
fi

# Check test runner script
print_header "Test Runner Script"

if [ -f "scripts/run-sse-stability-tests.sh" ]; then
  check_pass "Test runner exists (scripts/run-sse-stability-tests.sh)"

  if [ -x "scripts/run-sse-stability-tests.sh" ]; then
    check_pass "Test runner is executable"
  else
    check_fail "Test runner is not executable (run: chmod +x scripts/run-sse-stability-tests.sh)"
  fi
else
  check_fail "Test runner missing (scripts/run-sse-stability-tests.sh)"
fi

# Check documentation
print_header "Documentation"

if [ -f "tests/README-SSE-STABILITY.md" ]; then
  check_pass "Technical README exists (tests/README-SSE-STABILITY.md)"
else
  check_warn "Technical README missing (tests/README-SSE-STABILITY.md)"
fi

if [ -f "docs/SSE-STABILITY-TEST-GUIDE.md" ]; then
  check_pass "Execution guide exists (docs/SSE-STABILITY-TEST-GUIDE.md)"
else
  check_warn "Execution guide missing (docs/SSE-STABILITY-TEST-GUIDE.md)"
fi

if [ -f "tests/SSE-STABILITY-QUICK-REF.md" ]; then
  check_pass "Quick reference exists (tests/SSE-STABILITY-QUICK-REF.md)"
else
  check_warn "Quick reference missing (tests/SSE-STABILITY-QUICK-REF.md)"
fi

if [ -f "SSE-STABILITY-TEST-SUITE-DELIVERABLE.md" ]; then
  check_pass "Deliverable summary exists (SSE-STABILITY-TEST-SUITE-DELIVERABLE.md)"
else
  check_warn "Deliverable summary missing (SSE-STABILITY-TEST-SUITE-DELIVERABLE.md)"
fi

# Check package.json files
print_header "Package Configuration"

if [ -f "tests/integration/package.json" ]; then
  check_pass "Integration tests package.json exists"

  # Check for required dependencies
  if grep -q '"socket.io-client"' tests/integration/package.json; then
    check_pass "socket.io-client dependency configured"
  else
    check_fail "socket.io-client dependency missing"
  fi

  if grep -q '"eventsource"' tests/integration/package.json; then
    check_pass "eventsource dependency configured"
  else
    check_fail "eventsource dependency missing"
  fi
else
  check_fail "Integration tests package.json missing"
fi

if [ -f "tests/e2e/package.json" ]; then
  check_pass "E2E tests package.json exists"

  # Check for Playwright
  if grep -q '"@playwright/test"' tests/e2e/package.json; then
    check_pass "Playwright dependency configured"
  else
    check_fail "Playwright dependency missing"
  fi

  # Check for SSE test scripts
  if grep -q '"test:sse-stability"' tests/e2e/package.json; then
    check_pass "SSE stability test scripts configured"
  else
    check_warn "SSE stability test scripts not configured in package.json"
  fi
else
  check_fail "E2E tests package.json missing"
fi

# Check if dependencies are installed
print_header "Dependencies"

if [ -d "tests/integration/node_modules" ]; then
  check_pass "Integration test dependencies installed"
else
  check_warn "Integration test dependencies not installed (run: cd tests/integration && npm install)"
fi

if [ -d "tests/e2e/node_modules" ]; then
  check_pass "E2E test dependencies installed"
else
  check_warn "E2E test dependencies not installed (run: cd tests/e2e && npm install)"
fi

# Check for Playwright browsers
if [ -d "$HOME/.cache/ms-playwright" ] || [ -d "$HOME/Library/Caches/ms-playwright" ]; then
  check_pass "Playwright browsers installed"
else
  check_warn "Playwright browsers not installed (run: cd tests/e2e && npx playwright install chromium)"
fi

# Check directories
print_header "Directory Structure"

if [ -d "tests/results/sse-stability" ]; then
  check_pass "Results directory exists (tests/results/sse-stability)"
else
  check_warn "Results directory missing (will be created automatically)"
  mkdir -p tests/results/sse-stability
  check_pass "Created results directory"
fi

if [ -d "tests/screenshots/sse-stability" ]; then
  check_pass "Screenshots directory exists (tests/screenshots/sse-stability)"
else
  check_warn "Screenshots directory missing (will be created automatically)"
  mkdir -p tests/screenshots/sse-stability
  check_pass "Created screenshots directory"
fi

# Check server availability
print_header "Server Status"

SERVER_URL="${SERVER_URL:-http://localhost:3001}"

if curl -f -s "$SERVER_URL/health" > /dev/null 2>&1; then
  check_pass "Server is running and healthy at $SERVER_URL"
else
  check_warn "Server is not running at $SERVER_URL (start with: npm run server)"
fi

# Check frontend availability (for E2E tests)
print_header "Frontend Status"

FRONTEND_URL="${FRONTEND_URL:-http://localhost:5173}"

if curl -f -s "$FRONTEND_URL" > /dev/null 2>&1; then
  check_pass "Frontend is running at $FRONTEND_URL"
else
  check_warn "Frontend is not running at $FRONTEND_URL (start with: npm run dev)"
fi

# Check Node.js version
print_header "Environment"

NODE_VERSION=$(node --version)
check_pass "Node.js version: $NODE_VERSION"

if command -v npm &> /dev/null; then
  NPM_VERSION=$(npm --version)
  check_pass "npm version: $NPM_VERSION"
else
  check_fail "npm is not installed"
fi

if command -v npx &> /dev/null; then
  check_pass "npx is available"
else
  check_fail "npx is not available"
fi

# Summary
print_header "Validation Summary"

echo -e "Passed:   ${GREEN}$PASSED${NC}"
echo -e "Failed:   ${RED}$FAILED${NC}"
echo -e "Warnings: ${YELLOW}$WARNINGS${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ Setup validation passed!${NC}"
  echo ""
  echo "Next steps:"
  echo "1. Start server (if not running): npm run server"
  echo "2. Start frontend (if not running): npm run dev"
  echo "3. Run tests: ./scripts/run-sse-stability-tests.sh all"
  echo ""
  exit 0
else
  echo -e "${RED}✗ Setup validation failed with $FAILED error(s)${NC}"
  echo ""
  echo "Please fix the errors above before running tests."
  echo ""
  exit 1
fi
