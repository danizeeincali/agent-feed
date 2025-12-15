#!/bin/bash

###############################################################################
# MermaidDiagram removeChild Fix - Test Runner
#
# Quick test execution script for validation
###############################################################################

set -e  # Exit on error

echo "=========================================="
echo "MermaidDiagram removeChild Fix - Tests"
echo "=========================================="
echo ""

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Track results
FAILED=0

# Function to run tests
run_test() {
  local test_name=$1
  local test_command=$2

  echo -e "${BLUE}Running: $test_name${NC}"
  if eval "$test_command"; then
    echo -e "${GREEN}✅ PASSED: $test_name${NC}"
    echo ""
  else
    echo -e "${RED}❌ FAILED: $test_name${NC}"
    echo ""
    FAILED=$((FAILED + 1))
  fi
}

# Change to frontend directory
cd "$(dirname "$0")/../.."

echo "📦 Installing dependencies (if needed)..."
npm ci --silent || npm install --silent
echo ""

# Run unit tests
run_test "Unit Tests" \
  "npm test -- tests/mermaid-removechild-fix/MermaidDiagram.removechild.test.tsx --run"

# Run integration tests
run_test "Integration Tests" \
  "npm test -- tests/mermaid-removechild-fix/MermaidDiagram.integration.test.tsx --run"

# Run existing Mermaid tests (regression)
run_test "Regression Tests (Existing)" \
  "npm test -- src/components/markdown/__tests__/MermaidDiagram.test.tsx --run"

# Run E2E tests (optional - requires running dev server)
if [ "$1" = "--e2e" ]; then
  echo -e "${YELLOW}🌐 E2E Tests require a running dev server at http://localhost:5173${NC}"
  echo "   Start server: npm run dev"
  echo "   Then run: npx playwright test tests/mermaid-removechild-fix/mermaid-removechild.e2e.spec.ts"
  echo ""
fi

# Coverage report (optional)
if [ "$1" = "--coverage" ]; then
  echo -e "${BLUE}📊 Generating coverage report...${NC}"
  npm test -- --coverage tests/mermaid-removechild-fix/ --run
  echo ""
fi

# Summary
echo "=========================================="
echo "Test Summary"
echo "=========================================="

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ All tests passed!${NC}"
  echo ""
  echo "Next steps:"
  echo "  1. Run E2E tests: ./run-tests.sh --e2e"
  echo "  2. Check coverage: ./run-tests.sh --coverage"
  echo "  3. Review: TESTING_SUMMARY.md"
  echo ""
  exit 0
else
  echo -e "${RED}❌ $FAILED test suite(s) failed${NC}"
  echo ""
  echo "See logs above for details."
  echo ""
  exit 1
fi
