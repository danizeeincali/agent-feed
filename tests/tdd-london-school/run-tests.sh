#!/bin/bash

# TDD London School Comment System Test Runner
# Follows RED-GREEN-REFACTOR methodology

set -e

echo "🔴 TDD LONDON SCHOOL: Comment System Fixes"
echo "=========================================="
echo

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${RED}PHASE 1: RED (Failing Tests)${NC}"
echo "Running tests that should FAIL to validate they catch the issues..."
echo

echo -e "${BLUE}1. Frontend Component Tests (Mock-driven)${NC}"
echo "Testing comment count display and section labeling..."
npm run test tests/tdd-london-school/comment-count-display.test.tsx --verbose || true
echo

echo -e "${BLUE}2. Backend API Mock Tests${NC}" 
echo "Testing API service contracts and number parsing..."
npm run test tests/tdd-london-school/comment-api-mocks.test.ts --verbose || true
echo

echo -e "${BLUE}3. Integration Tests${NC}"
echo "Testing end-to-end comment flow with database mocks..."
npm run test tests/tdd-london-school/comment-integration.test.ts --verbose || true
echo

echo -e "${BLUE}4. Browser E2E Tests${NC}"
echo "Testing UI behavior in actual browser environment..."
npx playwright test tests/tdd-london-school/comment-browser-e2e.spec.ts --reporter=line || true
echo

echo -e "${YELLOW}======================================${NC}"
echo -e "${YELLOW}RED PHASE COMPLETE${NC}"
echo
echo "If tests are failing, this is EXPECTED - it validates our tests catch the bugs!"
echo "Now implement the fixes following the guide in README.md"
echo
echo -e "${GREEN}Next Steps:${NC}"
echo "1. Fix backend database layer (parse integers from COUNT() queries)"
echo "2. Fix frontend components (use 'Comments' label, display integers)"
echo "3. Fix API service layer (parse API response strings to integers)"
echo "4. Run tests again to verify GREEN phase"
echo
echo -e "${PURPLE}London School TDD Principles Applied:${NC}"
echo "✅ Mock-first approach - defined collaborator contracts"
echo "✅ Outside-in development - UI tests drive backend requirements"
echo "✅ Behavior verification - testing HOW objects collaborate"
echo "✅ Interaction testing - mocks verify proper API calls"
echo "✅ Contract definition - clear interfaces through expectations"
echo

echo -e "${BLUE}To run individual test suites:${NC}"
echo "npm run test comment-count-display.test.tsx"
echo "npm run test comment-api-mocks.test.ts"
echo "npm run test comment-integration.test.ts" 
echo "npx playwright test comment-browser-e2e.spec.ts"
echo

echo -e "${GREEN}When implementation is complete, run this script again${NC}"
echo -e "${GREEN}to verify all tests pass (GREEN phase)${NC}"