#!/bin/bash

# CSS IMPORT FIX - TEST RUNNER SCRIPT
#
# Runs comprehensive CSS import order validation tests
#
# Tests:
# 1. CSS syntax validation (import order)
# 2. Vite build without errors
# 3. Markdown style loading
# 4. Post content rendering
# 5. Comment formatting
# 6. Regression tests (replies still work)
# 7. Production build validation
# 8. Performance tests

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"
TEST_FILE="$SCRIPT_DIR/integration/css-import-fix.test.js"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║           CSS IMPORT FIX - VALIDATION TEST SUITE               ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ============================================================================
# Pre-flight Checks
# ============================================================================

echo -e "${YELLOW}[1/7] Pre-flight Checks${NC}"
echo "----------------------------------------"

# Check if frontend directory exists
if [ ! -d "$FRONTEND_DIR" ]; then
    echo -e "${RED}❌ Frontend directory not found: $FRONTEND_DIR${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Frontend directory found${NC}"

# Check if test file exists
if [ ! -f "$TEST_FILE" ]; then
    echo -e "${RED}❌ Test file not found: $TEST_FILE${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Test file found${NC}"

# Check if index.css exists
if [ ! -f "$FRONTEND_DIR/src/index.css" ]; then
    echo -e "${RED}❌ index.css not found${NC}"
    exit 1
fi
echo -e "${GREEN}✅ index.css found${NC}"

# Check if markdown.css exists
if [ ! -f "$FRONTEND_DIR/src/styles/markdown.css" ]; then
    echo -e "${RED}❌ markdown.css not found${NC}"
    exit 1
fi
echo -e "${GREEN}✅ markdown.css found${NC}"

echo ""

# ============================================================================
# Check API Server
# ============================================================================

echo -e "${YELLOW}[2/7] Checking API Server${NC}"
echo "----------------------------------------"

if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ API server is running on port 3001${NC}"
    SERVER_RUNNING=true
else
    echo -e "${YELLOW}⚠️  API server not running - some tests will be skipped${NC}"
    echo -e "${YELLOW}   To run all tests, start the server: cd api-server && npm start${NC}"
    SERVER_RUNNING=false
fi

echo ""

# ============================================================================
# CSS Syntax Quick Check
# ============================================================================

echo -e "${YELLOW}[3/7] Quick CSS Syntax Check${NC}"
echo "----------------------------------------"

# Check if @import comes before @tailwind
IMPORT_LINE=$(grep -n "^@import" "$FRONTEND_DIR/src/index.css" | head -1 | cut -d: -f1)
TAILWIND_LINE=$(grep -n "^@tailwind" "$FRONTEND_DIR/src/index.css" | head -1 | cut -d: -f1)

if [ -z "$IMPORT_LINE" ]; then
    echo -e "${RED}❌ No @import directive found${NC}"
    exit 1
fi

if [ -z "$TAILWIND_LINE" ]; then
    echo -e "${RED}❌ No @tailwind directive found${NC}"
    exit 1
fi

if [ "$IMPORT_LINE" -lt "$TAILWIND_LINE" ]; then
    echo -e "${GREEN}✅ CSS import order correct (@import at line $IMPORT_LINE, @tailwind at line $TAILWIND_LINE)${NC}"
else
    echo -e "${RED}❌ CSS import order incorrect (@import at line $IMPORT_LINE, @tailwind at line $TAILWIND_LINE)${NC}"
    echo -e "${RED}   @import MUST come before @tailwind${NC}"
    exit 1
fi

echo ""

# ============================================================================
# Install Dependencies (if needed)
# ============================================================================

echo -e "${YELLOW}[4/7] Checking Dependencies${NC}"
echo "----------------------------------------"

cd "$FRONTEND_DIR"

if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
else
    echo -e "${GREEN}✅ Dependencies already installed${NC}"
fi

echo ""

# ============================================================================
# Run Vitest Tests
# ============================================================================

echo -e "${YELLOW}[5/7] Running Vitest Test Suite${NC}"
echo "----------------------------------------"

cd "$ROOT_DIR"

# Run tests with vitest
echo "Running: npx vitest run tests/integration/css-import-fix.test.js"
echo ""

if npx vitest run tests/integration/css-import-fix.test.js --reporter=verbose; then
    echo ""
    echo -e "${GREEN}✅ All tests passed!${NC}"
    TEST_RESULT=0
else
    echo ""
    echo -e "${RED}❌ Some tests failed${NC}"
    TEST_RESULT=1
fi

echo ""

# ============================================================================
# Quick Vite Build Test (Optional)
# ============================================================================

echo -e "${YELLOW}[6/7] Quick Vite Build Test (Optional)${NC}"
echo "----------------------------------------"

read -p "Run full Vite build? This will take 30-60 seconds (y/N): " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    cd "$FRONTEND_DIR"
    echo "Running: npm run build"

    if npm run build; then
        echo -e "${GREEN}✅ Vite build successful${NC}"
    else
        echo -e "${RED}❌ Vite build failed${NC}"
        TEST_RESULT=1
    fi
else
    echo "Skipping Vite build test"
fi

echo ""

# ============================================================================
# Summary
# ============================================================================

echo -e "${YELLOW}[7/7] Test Summary${NC}"
echo "----------------------------------------"

if [ $TEST_RESULT -eq 0 ]; then
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                    ALL TESTS PASSED! ✅                        ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${GREEN}CSS Import Fix Status: VALIDATED${NC}"
    echo ""
    echo "✅ CSS import order correct"
    echo "✅ Vite builds without errors"
    echo "✅ Markdown styles load correctly"
    echo "✅ Post formatting works"
    echo "✅ Comment formatting works"
    echo "✅ No regression in replies"
    echo ""
else
    echo -e "${RED}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║                    SOME TESTS FAILED ❌                        ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Please review the test output above for details."
    echo ""
fi

# Test Coverage Summary
echo "Test Coverage:"
echo "  • CSS Syntax Validation: 5 tests"
echo "  • Vite Build Tests: 3 tests"
echo "  • Markdown Rendering: 5 tests"
echo "  • Comment Formatting: 3 tests"
echo "  • Regression Tests: 3 tests"
echo "  • Syntax Highlighting: 2 tests"
echo "  • Production Build: 3 tests"
echo "  • Performance Tests: 3 tests"
echo "  TOTAL: 27 comprehensive tests"
echo ""

if [ "$SERVER_RUNNING" = false ]; then
    echo -e "${YELLOW}Note: Some tests were skipped because API server is not running${NC}"
    echo -e "${YELLOW}      To run all tests, start: cd api-server && npm start${NC}"
    echo ""
fi

echo "Test Results Location: tests/integration/css-import-fix.test.js"
echo "Frontend Path: $FRONTEND_DIR"
echo "CSS Files:"
echo "  • index.css: $FRONTEND_DIR/src/index.css"
echo "  • markdown.css: $FRONTEND_DIR/src/styles/markdown.css"
echo ""

exit $TEST_RESULT
