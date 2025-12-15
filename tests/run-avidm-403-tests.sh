#!/bin/bash

###############################################################################
# AVI DM 403 Fix - TDD Test Suite Execution Script
#
# London School TDD - Outside-In Test Execution
# Phase: RED (expect all tests to FAIL initially)
#
# This script runs all test suites in the correct order:
# 1. E2E Tests (Outside)
# 2. Integration Tests (Middle)
# 3. Unit Tests - Component (Inside)
# 4. Unit Tests - Service (Inside)
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project root
PROJECT_ROOT="/workspaces/agent-feed"

echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   AVI DM 403 Fix - TDD London School Test Suite${NC}"
echo -e "${BLUE}   Phase: RED (Expect FAILURES)${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""

###############################################################################
# Pre-flight Checks
###############################################################################

echo -e "${YELLOW}[1/4] Pre-flight Checks${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check backend is running
echo -n "Checking backend (port 3001)... "
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Running${NC}"
else
    echo -e "${RED}✗ NOT RUNNING${NC}"
    echo -e "${RED}ERROR: Backend must be running on port 3001${NC}"
    echo "Start with: cd api-server && npm start"
    exit 1
fi

# Check frontend is running
echo -n "Checking frontend (port 5173)... "
if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Running${NC}"
else
    echo -e "${YELLOW}⚠ NOT RUNNING (E2E tests will fail)${NC}"
    echo "Start with: cd frontend && npm run dev"
fi

# Check Claude CLI
echo -n "Checking Claude CLI... "
if command -v claude &> /dev/null; then
    echo -e "${GREEN}✓ Installed${NC}"
else
    echo -e "${YELLOW}⚠ NOT INSTALLED (Backend may fail)${NC}"
fi

echo ""

###############################################################################
# Test Suite 1: E2E Tests (Outside Layer)
###############################################################################

echo -e "${YELLOW}[2/4] Running E2E Tests (Outside Layer)${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "File: tests/e2e/avidm-403-fix-validation.spec.ts"
echo "Scope: Complete user workflow from browser to backend"
echo "Expected: ALL FAIL (403 Forbidden errors)"
echo ""

cd "$PROJECT_ROOT"

if [ -f "tests/e2e/avidm-403-fix-validation.spec.ts" ]; then
    echo "Running Playwright E2E tests..."
    npx playwright test tests/e2e/avidm-403-fix-validation.spec.ts --reporter=list || {
        echo -e "${RED}✗ E2E Tests FAILED (Expected in RED phase)${NC}"
    }
else
    echo -e "${RED}✗ Test file not found${NC}"
fi

echo ""
echo "Press Enter to continue to Integration Tests..."
read

###############################################################################
# Test Suite 2: Integration Tests (Middle Layer)
###############################################################################

echo -e "${YELLOW}[3/4] Running Integration Tests (Middle Layer)${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "File: tests/integration/avidm-path-protection.test.js"
echo "Scope: Backend path protection middleware"
echo "Expected: Backend tests PASS, coordination tests FAIL"
echo ""

cd "$PROJECT_ROOT"

if [ -f "tests/integration/avidm-path-protection.test.js" ]; then
    echo "Running Jest integration tests..."
    npm test -- tests/integration/avidm-path-protection.test.js || {
        echo -e "${YELLOW}⚠ Some tests FAILED (Expected in RED phase)${NC}"
    }
else
    echo -e "${RED}✗ Test file not found${NC}"
fi

echo ""
echo "Press Enter to continue to Component Unit Tests..."
read

###############################################################################
# Test Suite 3: Component Unit Tests (Inside Layer)
###############################################################################

echo -e "${YELLOW}[4/4] Running Component Unit Tests (Inside Layer)${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "File: frontend/src/tests/unit/EnhancedPostingInterface-cwd-fix.test.tsx"
echo "Scope: EnhancedPostingInterface component behavior"
echo "Expected: ALL FAIL (component uses relative URL)"
echo ""

cd "$PROJECT_ROOT/frontend"

if [ -f "src/tests/unit/EnhancedPostingInterface-cwd-fix.test.tsx" ]; then
    echo "Running Vitest component tests..."
    npm test -- src/tests/unit/EnhancedPostingInterface-cwd-fix.test.tsx || {
        echo -e "${RED}✗ Component Tests FAILED (Expected in RED phase)${NC}"
    }
else
    echo -e "${RED}✗ Test file not found${NC}"
fi

echo ""
echo "Press Enter to continue to Service Unit Tests..."
read

###############################################################################
# Test Suite 4: Service Unit Tests (Inside Layer)
###############################################################################

echo -e "${YELLOW}[5/5] Running Service Unit Tests (Inside Layer)${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "File: frontend/src/tests/unit/AviDMService-cwd-fix.test.ts"
echo "Scope: AviDMService configuration and behavior"
echo "Expected: ALL PASS (service already fixed)"
echo ""

cd "$PROJECT_ROOT/frontend"

if [ -f "src/tests/unit/AviDMService-cwd-fix.test.ts" ]; then
    echo "Running Vitest service tests..."
    npm test -- src/tests/unit/AviDMService-cwd-fix.test.ts || {
        echo -e "${YELLOW}⚠ Service tests should PASS (already fixed)${NC}"
    }
else
    echo -e "${RED}✗ Test file not found${NC}"
fi

echo ""

###############################################################################
# Summary
###############################################################################

echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   Test Execution Complete - RED Phase${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Expected Results (RED Phase):${NC}"
echo ""
echo "✗ E2E Tests           - ALL FAIL (403 errors)"
echo "✗ Integration Tests   - SOME FAIL (frontend coordination)"
echo "✗ Component Tests     - ALL FAIL (wrong URL)"
echo "✓ Service Tests       - ALL PASS (already fixed)"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo ""
echo "1. Review test failures"
echo "2. Implement fix in EnhancedPostingInterface.tsx line 286"
echo "3. Re-run this script to verify GREEN phase"
echo ""
echo -e "${BLUE}Implementation Required:${NC}"
echo ""
echo "File: /workspaces/agent-feed/frontend/src/components/EnhancedPostingInterface.tsx"
echo "Line: 286"
echo ""
echo "Change FROM:"
echo "  const response = await fetch('/api/claude-code/streaming-chat', {"
echo ""
echo "Change TO:"
echo "  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';"
echo "  const response = await fetch(\`\${API_BASE_URL}/api/claude-code/streaming-chat\`, {"
echo ""
echo -e "${GREEN}After implementing fix, run this script again to verify GREEN phase${NC}"
echo ""

###############################################################################
# Quick Re-run Command
###############################################################################

echo -e "${BLUE}Quick Re-run Commands:${NC}"
echo ""
echo "E2E only:"
echo "  npx playwright test tests/e2e/avidm-403-fix-validation.spec.ts"
echo ""
echo "Integration only:"
echo "  npm test -- tests/integration/avidm-path-protection.test.js"
echo ""
echo "Component only:"
echo "  cd frontend && npm test -- src/tests/unit/EnhancedPostingInterface-cwd-fix.test.tsx"
echo ""
echo "Service only:"
echo "  cd frontend && npm test -- src/tests/unit/AviDMService-cwd-fix.test.ts"
echo ""
echo "All tests:"
echo "  ./tests/run-avidm-403-tests.sh"
echo ""
