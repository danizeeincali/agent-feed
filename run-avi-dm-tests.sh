#!/bin/bash

# Avi DM Real Claude Code Integration - Test Runner
# This script runs all TDD tests for Avi DM integration

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}================================================${NC}"
echo -e "${YELLOW}  Avi DM Real Claude Code Integration Tests${NC}"
echo -e "${YELLOW}================================================${NC}"
echo ""

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

if [ ! -f "prod/CLAUDE.md" ]; then
    echo -e "${RED}❌ CLAUDE.md not found in /prod directory${NC}"
    exit 1
fi
echo -e "${GREEN}✓ CLAUDE.md found${NC}"

if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo -e "${YELLOW}⚠️  ANTHROPIC_API_KEY not set (required for real integration)${NC}"
else
    echo -e "${GREEN}✓ ANTHROPIC_API_KEY configured${NC}"
fi

echo ""
echo -e "${YELLOW}================================================${NC}"
echo -e "${YELLOW}  Phase 1: Backend Validation Tests${NC}"
echo -e "${YELLOW}================================================${NC}"
echo ""

cd api-server

echo "Running real validation tests..."
npm run test tests/avi-dm-real-validation.test.js || {
    echo -e "${RED}❌ Backend validation tests failed${NC}"
    echo -e "${YELLOW}This is expected if mock implementation is still active${NC}"
}

echo ""
echo -e "${YELLOW}================================================${NC}"
echo -e "${YELLOW}  Phase 2: NLD (No-Lies Detection) Tests${NC}"
echo -e "${YELLOW}================================================${NC}"
echo ""

echo "Running mock detection tests..."
npm run test tests/avi-dm-nld-verification.test.js || {
    echo -e "${RED}❌ NLD tests failed - Mock patterns detected!${NC}"
    echo -e "${YELLOW}These tests MUST fail with mock implementation${NC}"
    echo -e "${YELLOW}They will pass when real Claude Code SDK is integrated${NC}"
}

cd ..

echo ""
echo -e "${YELLOW}================================================${NC}"
echo -e "${YELLOW}  Phase 3: Frontend Unit Tests${NC}"
echo -e "${YELLOW}================================================${NC}"
echo ""

cd frontend

echo "Running frontend unit tests..."
npm run test src/tests/unit/AviDMRealIntegration.test.tsx || {
    echo -e "${RED}❌ Frontend unit tests failed${NC}"
}

echo ""
echo -e "${YELLOW}================================================${NC}"
echo -e "${YELLOW}  Phase 4: Frontend Integration Tests${NC}"
echo -e "${YELLOW}================================================${NC}"
echo ""

# Check if API server is running
if ! curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  API server not running on localhost:3001${NC}"
    echo -e "${YELLOW}Starting API server...${NC}"
    cd ../api-server
    npm start &
    API_PID=$!
    sleep 5
    cd ../frontend
else
    echo -e "${GREEN}✓ API server is running${NC}"
    API_PID=""
fi

echo "Running frontend integration tests..."
npm run test src/tests/integration/AviDMClaudeCode.test.tsx || {
    echo -e "${RED}❌ Frontend integration tests failed${NC}"
}

# Kill API server if we started it
if [ ! -z "$API_PID" ]; then
    kill $API_PID 2>/dev/null || true
fi

cd ..

echo ""
echo -e "${YELLOW}================================================${NC}"
echo -e "${YELLOW}  Test Summary${NC}"
echo -e "${YELLOW}================================================${NC}"
echo ""

echo "Test files created:"
echo "  ✓ frontend/src/tests/unit/AviDMRealIntegration.test.tsx"
echo "  ✓ frontend/src/tests/integration/AviDMClaudeCode.test.tsx"
echo "  ✓ api-server/tests/avi-dm-real-validation.test.js"
echo "  ✓ api-server/tests/avi-dm-nld-verification.test.js"
echo ""

echo -e "${YELLOW}Expected Behavior:${NC}"
echo -e "${RED}  RED Phase (Current):${NC} Tests should FAIL with mock implementation"
echo -e "${GREEN}  GREEN Phase (Target):${NC} Tests should PASS with real Claude Code SDK"
echo ""

echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Review failing tests to understand gaps"
echo "  2. Implement real Claude Code SDK integration"
echo "  3. Remove mock implementations (setTimeout, templates)"
echo "  4. Re-run tests until all pass"
echo "  5. Verify Λvi identity in responses"
echo ""

echo -e "${YELLOW}See AVI_DM_TDD_TEST_PLAN.md for detailed instructions${NC}"
echo ""
