#!/bin/bash

# ============================================================================
# AviDM Port Configuration Fix - Test Runner
# ============================================================================

set -e

echo "=================================================="
echo "AviDM Port Configuration Fix - TDD Test Suite"
echo "=================================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test directories
UNIT_TEST="frontend/src/tests/unit/AviDMService-port-fix.test.ts"
INTEGRATION_TEST="frontend/src/tests/integration/AviDM-backend-connection.test.ts"

# ============================================================================
# PHASE 1: UNIT TESTS
# ============================================================================

echo "📦 Running UNIT tests (London School TDD)..."
echo "   Testing port configuration and URL construction"
echo ""

if npx jest "$UNIT_TEST" --verbose --no-coverage; then
    echo -e "${GREEN}✅ Unit tests PASSED${NC}"
    UNIT_RESULT="PASS"
else
    echo -e "${RED}❌ Unit tests FAILED${NC}"
    UNIT_RESULT="FAIL"
fi

echo ""
echo "=================================================="
echo ""

# ============================================================================
# PHASE 2: INTEGRATION TESTS
# ============================================================================

echo "🔌 Running INTEGRATION tests..."
echo "   Testing real backend connection at localhost:3001"
echo ""

# Check if backend is running
if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend is running at localhost:3001${NC}"
    BACKEND_STATUS="RUNNING"
else
    echo -e "${YELLOW}⚠️  Backend not running at localhost:3001${NC}"
    echo "   Some integration tests will be skipped"
    BACKEND_STATUS="NOT_RUNNING"
fi

echo ""

if npx jest "$INTEGRATION_TEST" --verbose --no-coverage --testTimeout=30000; then
    echo -e "${GREEN}✅ Integration tests PASSED${NC}"
    INTEGRATION_RESULT="PASS"
else
    echo -e "${RED}❌ Integration tests FAILED${NC}"
    INTEGRATION_RESULT="FAIL"
fi

echo ""
echo "=================================================="
echo ""

# ============================================================================
# SUMMARY
# ============================================================================

echo "📊 TEST EXECUTION SUMMARY"
echo "=================================================="
echo ""
echo "Unit Tests:        $UNIT_RESULT"
echo "Integration Tests: $INTEGRATION_RESULT"
echo "Backend Status:    $BACKEND_STATUS"
echo ""

if [ "$UNIT_RESULT" = "PASS" ] && [ "$INTEGRATION_RESULT" = "PASS" ]; then
    echo -e "${GREEN}✅ ALL TESTS PASSED${NC}"
    exit 0
else
    echo -e "${RED}❌ SOME TESTS FAILED${NC}"
    exit 1
fi
